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
    const trialDaysLeft = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null;

    return reply.send({
      plan: billing.plan,
      trialEndsAt: billing.trial_ends_at,
      trialDaysLeft,
      conversationCount: billing.conversation_count,
      stripeSubscriptionStatus: billing.stripe_subscription_status,
      isActive: billing.plan === "pro",
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
    const billing = await getWorkspaceBilling(db, workspaceId);
    if (!billing?.stripe_customer_id) {
      return reply.status(400).send({ error: "No tenés una suscripción activa" });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${webUrl}/settings/billing`,
    });

    return reply.send({ url: session.url });
  });
}
