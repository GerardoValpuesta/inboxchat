import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { getStripe } from "../lib/stripe.js";

interface WebhookPluginOptions {
  db: Database;
}

/** Busca workspaceId por stripe_customer_id — fallback cuando el metadata no llega */
async function findWorkspaceByCustomer(db: Database, customerId: string): Promise<string | null> {
  const [row] = await db<{ id: string }[]>`
    SELECT id FROM workspaces WHERE stripe_customer_id = ${customerId} LIMIT 1
  `;
  return row?.id ?? null;
}

/** Resuelve workspaceId: primero del metadata, fallback por customerId en DB */
async function resolveWorkspaceId(
  db: Database,
  metadata: Record<string, string> | null | undefined,
  customerId: string | null | undefined
): Promise<string | null> {
  if (metadata?.workspaceId) return metadata.workspaceId;
  if (customerId) return findWorkspaceByCustomer(db, customerId);
  return null;
}

/**
 * POST /api/webhooks/stripe
 *
 * Raw body requerido para verificar la firma de Stripe.
 * No usa JWT — la autenticación es la firma del webhook.
 */
export async function stripeWebhookRoute(
  app: FastifyInstance,
  { db }: WebhookPluginOptions
) {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    function (_req, body, done) {
      done(null, body);
    }
  );

  app.post("/api/webhooks/stripe", async (request, reply) => {
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (!webhookSecret) {
      app.log.warn("[stripe] STRIPE_WEBHOOK_SECRET no configurado");
      return reply.status(503).send({ error: "Webhook no configurado" });
    }

    const sig = request.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      return reply.status(400).send({ error: "Falta stripe-signature" });
    }

    let event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(request.body as Buffer, sig, webhookSecret);
    } catch (err) {
      app.log.error({ err }, "[stripe] Webhook signature inválida");
      return reply.status(400).send({ error: "Firma inválida" });
    }

    app.log.info(`[stripe] Evento: ${event.type}`);

    try {
      switch (event.type) {
        /**
         * checkout.session.completed — fuente primaria de verdad.
         * El session.metadata.workspaceId viene directo del checkout que creamos.
         * Esto es más confiable que subscription.metadata.
         */
        case "checkout.session.completed": {
          const session = event.data.object;
          if (session.mode !== "subscription") break;

          const workspaceId = await resolveWorkspaceId(
            db,
            session.metadata as Record<string, string>,
            session.customer as string | null
          );
          if (!workspaceId) {
            app.log.warn("[stripe] checkout.session.completed sin workspaceId — ignorando");
            break;
          }

          const subscriptionId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

          await db`
            UPDATE workspaces SET
              plan = 'pro',
              stripe_subscription_id = ${subscriptionId},
              stripe_subscription_status = 'active'
            WHERE id = ${workspaceId}
          `;
          app.log.info(`[stripe] ✅ Workspace ${workspaceId} activado como Pro (checkout.session.completed)`);
          break;
        }

        /**
         * customer.subscription.updated — handles renewals, cancellations at period end, etc.
         */
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object;
          const workspaceId = await resolveWorkspaceId(
            db,
            sub.metadata as Record<string, string>,
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id
          );
          if (!workspaceId) {
            app.log.warn(`[stripe] ${event.type} sin workspaceId — ignorando`);
            break;
          }

          const plan = sub.status === "active" ? "pro" : "trial";
          await db`
            UPDATE workspaces SET
              plan = ${plan},
              stripe_subscription_id = ${sub.id},
              stripe_subscription_status = ${sub.status}
            WHERE id = ${workspaceId}
          `;
          app.log.info(`[stripe] Workspace ${workspaceId} → ${plan} (${sub.status})`);
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const workspaceId = await resolveWorkspaceId(
            db,
            sub.metadata as Record<string, string>,
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id
          );
          if (!workspaceId) {
            app.log.warn("[stripe] subscription.deleted sin workspaceId — ignorando");
            break;
          }

          await db`
            UPDATE workspaces SET
              plan = 'trial',
              stripe_subscription_status = 'canceled'
            WHERE id = ${workspaceId}
          `;
          app.log.info(`[stripe] Workspace ${workspaceId} → suscripción cancelada`);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      app.log.error({ err }, "[stripe] Error procesando webhook");
      return reply.status(500).send({ error: "Error procesando evento" });
    }

    return reply.status(200).send({ received: true });
  });
}
