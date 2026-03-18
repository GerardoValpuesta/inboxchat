import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt.js";
import { findWorkspaceByApiKey } from "../db/queries.js";
import { getStripe } from "../lib/stripe.js";

interface BillingPluginOptions {
  db: Database;
}

/** Misma lógica que dashboard.routes.ts — extrae workspaceId desde JWT o X-Workspace-Key */
async function resolveWorkspaceId(
  db: Database,
  headers: Record<string, string | string[] | undefined>
): Promise<string | null> {
  const authHeader = headers["authorization"] as string | undefined;
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.workspaceId) return payload.workspaceId;
    }
  }
  const workspaceKey = headers["x-workspace-key"] as string | undefined;
  if (workspaceKey) {
    const workspace = await findWorkspaceByApiKey(db, workspaceKey);
    return workspace ? (workspace.id as string) : null;
  }
  return null;
}

async function getWorkspaceBilling(db: Database, workspaceId: string) {
  const [row] = await db<
    {
      plan: string;
      trial_ends_at: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      stripe_subscription_status: string | null;
      conversation_count: number;
    }[]
  >`
    SELECT
      w.plan,
      w.trial_ends_at,
      w.stripe_customer_id,
      w.stripe_subscription_id,
      w.stripe_subscription_status,
      (SELECT COUNT(*)::int FROM conversations c WHERE c.workspace_id = w.id) AS conversation_count
    FROM workspaces w
    WHERE w.id = ${workspaceId}
    LIMIT 1
  `;
  return row ?? null;
}

async function getWorkspaceInfo(db: Database, workspaceId: string) {
  const [row] = await db<{ owner_email: string; name: string }[]>`
    SELECT owner_email, name FROM workspaces WHERE id = ${workspaceId} LIMIT 1
  `;
  return row ?? null;
}

export async function billingRoutes(
  app: FastifyInstance,
  { db }: BillingPluginOptions
) {
  /**
   * GET /api/billing/status
   */
  app.get("/api/billing/status", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const billing = await getWorkspaceBilling(db, workspaceId);
    if (!billing) return reply.status(404).send({ error: "Workspace no encontrado" });

    const trialEndsAt = billing.trial_ends_at ? new Date(billing.trial_ends_at) : null;

    // Si el plan es 'trial' pero trial_ends_at es NULL (migración vieja / bug de datos),
    // asumimos 14 días desde ahora para no bloquear al usuario de inmediato.
    const effectiveTrialEndsAt = trialEndsAt
      ?? (billing.plan === "trial" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null);

    const trialDaysLeft = effectiveTrialEndsAt
      ? Math.max(0, Math.ceil((effectiveTrialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null;

    // isActive = Pro pagado ✅  ó  trial con días restantes ✅
    const isActive =
      billing.plan === "pro" ||
      (billing.plan === "trial" && trialDaysLeft !== null && trialDaysLeft > 0);

    void reply.header("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return reply.send({
      plan: billing.plan,
      trialEndsAt: effectiveTrialEndsAt?.toISOString() ?? null,
      trialDaysLeft,
      conversationCount: billing.conversation_count,
      stripeSubscriptionStatus: billing.stripe_subscription_status,
      hasStripeCustomer: Boolean(billing.stripe_customer_id),
      // true solo si hay una suscripción REAL de Stripe (no Pro manual)
      hasStripeSubscription: Boolean(billing.stripe_subscription_id),
      isActive,
    });
  });

  /**
   * POST /api/billing/checkout — crea Stripe Checkout Session
   */
  app.post("/api/billing/checkout", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const priceId = process.env["STRIPE_PRICE_ID"];
    const webUrl = process.env["WEB_URL"] ?? "http://localhost:3000";

    if (!priceId) {
      return reply.status(503).send({ error: "Billing no configurado" });
    }

    const stripe = getStripe();
    const workspace = await getWorkspaceInfo(db, workspaceId);
    if (!workspace) return reply.status(404).send({ error: "Workspace no encontrado" });

    const billing = await getWorkspaceBilling(db, workspaceId);
    let customerId = billing?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: workspace.owner_email,
        name: workspace.name,
        metadata: { workspaceId },
      });
      customerId = customer.id;
      await db`UPDATE workspaces SET stripe_customer_id = ${customerId} WHERE id = ${workspaceId}`;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${webUrl}/settings/billing?success=1`,
      cancel_url: `${webUrl}/settings/billing?canceled=1`,
      metadata: { workspaceId },
      subscription_data: { metadata: { workspaceId } },
    });

    return reply.send({ url: session.url });
  });

  /**
   * POST /api/billing/portal — Customer Portal de Stripe
   */
  app.post("/api/billing/portal", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const webUrl = process.env["WEB_URL"] ?? "http://localhost:3000";
    const stripe = getStripe();

    // Obtener datos del workspace (email para crear customer si no existe)
    const billing = await getWorkspaceBilling(db, workspaceId);
    let customerId = billing?.stripe_customer_id ?? undefined;

    if (!customerId) {
      // Crear customer en Stripe al vuelo — igual que el checkout
      const workspace = await getWorkspaceInfo(db, workspaceId);
      if (!workspace) return reply.status(404).send({ error: "Workspace no encontrado" });

      const customer = await stripe.customers.create({
        email: workspace.owner_email,
        name: workspace.name,
        metadata: { workspaceId },
      });
      customerId = customer.id;
      await db`UPDATE workspaces SET stripe_customer_id = ${customerId} WHERE id = ${workspaceId}`;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${webUrl}/settings/billing`,
    });

    return reply.send({ url: session.url });
  });

  /**
   * POST /api/billing/cancel
   * Auto-cancelación para usuarios Pro sin suscripción de Stripe (activación manual o promo code).
   * Baja el plan a 'trial' con 14 días de gracia.
   */
  app.post("/api/billing/cancel", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const billing = await getWorkspaceBilling(db, workspaceId);
    if (!billing) return reply.status(404).send({ error: "Workspace no encontrado" });

    // Si tiene suscripción de Stripe, deben cancelar desde el portal (no aquí)
    if (billing.stripe_subscription_id) {
      return reply.status(400).send({ error: "Usá el portal para cancelar tu suscripción de Stripe" });
    }
    if (billing.plan !== 'pro') {
      return reply.status(400).send({ error: "No estás en plan Pro" });
    }

    // Downgrade a trial con 14 días de gracia desde hoy
    const trialUntil = new Date();
    trialUntil.setDate(trialUntil.getDate() + 14);

    await db`
      UPDATE workspaces
      SET plan = 'trial', trial_ends_at = ${trialUntil.toISOString()}
      WHERE id = ${workspaceId}
    `;

    return reply.send({ ok: true, trialUntil: trialUntil.toISOString() });
  });


  /**
   * POST /api/billing/webhook — Stripe Webhook
   *
   * Fastify 4 no tiene rawBody nativo. Usamos un scope isolado con un
   * addContentTypeParser que pasa el Buffer sin parsear a request.body,
   * lo que permite a stripe.webhooks.constructEvent() verificar la firma HMAC.
   *
   * Eventos manejados:
   *   checkout.session.completed → pago exitoso — plan = 'pro'
   *   customer.subscription.updated → actualizar stripe_subscription_status
   *   customer.subscription.deleted → cancelación — plan = 'free'
   */
  await app.register(async (scope) => {
    // Preservar el raw buffer para verificación HMAC de Stripe
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_req, body, done) => { done(null, body); }
    );

    scope.post("/api/billing/webhook", async (request, reply) => {
      const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
      if (!webhookSecret) {
        return reply.status(503).send({ error: "Webhook no configurado" });
      }

      const sig = request.headers["stripe-signature"] as string | undefined;
      if (!sig) return reply.status(400).send({ error: "Falta stripe-signature" });

      const stripe = getStripe();
      let event: import("stripe").Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          request.body as Buffer,
          sig,
          webhookSecret
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Firma inválida";
        return reply.status(400).send({ error: msg });
      }

      // ── checkout.session.completed ────────────────────────────────────────
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const subscriptionId = session.subscription as string | null;
        const customerId = session.customer as string | null;

        if (workspaceId) {
          await db`
            UPDATE workspaces
            SET
              plan = 'pro',
              stripe_subscription_id = COALESCE(${subscriptionId}, stripe_subscription_id),
              stripe_customer_id = COALESCE(${customerId}, stripe_customer_id),
              stripe_subscription_status = 'active',
              trial_ends_at = NULL
            WHERE id = ${workspaceId}
          `;

          // Email de bienvenida al plan Pro
          const RESEND_API_KEY = process.env["RESEND_API_KEY"];
          const EMAIL_FROM = process.env["EMAIL_FROM"] ?? "InboxChat <no-reply@inboxchat.app>";
          if (RESEND_API_KEY) {
            const info = await getWorkspaceInfo(db, workspaceId);
            if (info?.owner_email) {
              const webUrl = process.env["WEB_URL"] ?? "https://inboxchat.app";
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${RESEND_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: EMAIL_FROM,
                  to: [info.owner_email],
                  subject: "🎉 ¡Bienvenido a InboxChat Pro!",
                  html: `
                    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#1e293b">
                      <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">¡Estás en Pro! 🚀</h1>
                      <p style="color:#64748b;margin-bottom:24px">
                        Tu workspace <strong>${info.name}</strong> ya tiene acceso completo a InboxChat Pro.
                        Conversaciones ilimitadas, sin límite de tiempo.
                      </p>
                      <a href="${webUrl}/inbox"
                         style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;border-radius:8px;font-weight:600;text-decoration:none;margin-bottom:24px">
                        Ir al inbox →
                      </a>
                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
                      <p style="font-size:12px;color:#94a3b8">
                        Podés gestionar tu suscripción en cualquier momento desde
                        <a href="${webUrl}/settings/billing" style="color:#7c3aed">Settings → Billing</a>.
                      </p>
                    </div>
                  `,
                }),
              }).catch(() => {/* no bloquear el webhook si el email falla */});
            }
          }
        }
      }

      // ── customer.subscription.updated ────────────────────────────────────
      if (event.type === "customer.subscription.updated") {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (workspaceId) {
          await db`
            UPDATE workspaces
            SET stripe_subscription_status = ${sub.status}
            WHERE id = ${workspaceId}
          `;
        }
      }

      // ── customer.subscription.deleted ─────────────────────────────────────
      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (workspaceId) {
          await db`
            UPDATE workspaces
            SET plan = 'free', stripe_subscription_status = 'canceled'
            WHERE id = ${workspaceId}
          `;
        }
      }

      return reply.send({ received: true });
    });
  });
}
