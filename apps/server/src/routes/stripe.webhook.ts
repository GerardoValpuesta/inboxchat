import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { getStripe } from "../lib/stripe.js";

interface WebhookPluginOptions {
  db: Database;
}

/**
 * POST /api/webhooks/stripe
 *
 * Raw body requerido para verificar la firma de Stripe.
 * IMPORTANTE: este endpoint NO usa el auth middleware de JWT.
 * La autenticación ocurre vía la firma del webhook (STRIPE_WEBHOOK_SECRET).
 */
export async function stripeWebhookRoute(
  app: FastifyInstance,
  { db }: WebhookPluginOptions
) {
  // Fastify parsea el body por default — necesitamos rawBody para Stripe
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
      app.log.warn("[stripe] STRIPE_WEBHOOK_SECRET no configurado, ignorando webhook");
      return reply.status(503).send({ error: "Webhook no configurado" });
    }

    const sig = request.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      return reply.status(400).send({ error: "Falta stripe-signature" });
    }

    let event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        sig,
        webhookSecret
      );
    } catch (err) {
      app.log.error({ err }, "[stripe] Webhook signature inválida");
      return reply.status(400).send({ error: "Firma inválida" });
    }

    app.log.info(`[stripe] Evento recibido: ${event.type}`);

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object;
          const workspaceId = sub.metadata?.workspaceId;
          if (!workspaceId) break;

          await db`
            UPDATE workspaces SET
              plan = CASE WHEN ${sub.status} = 'active' THEN 'pro' ELSE 'trial' END,
              stripe_subscription_id = ${sub.id},
              stripe_subscription_status = ${sub.status}
            WHERE id = ${workspaceId}
          `;
          app.log.info(`[stripe] Workspace ${workspaceId} → plan actualizado: ${sub.status}`);
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const workspaceId = sub.metadata?.workspaceId;
          if (!workspaceId) break;

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
          // Ignorar eventos no manejados
          break;
      }
    } catch (err) {
      app.log.error({ err }, "[stripe] Error procesando webhook");
      return reply.status(500).send({ error: "Error procesando evento" });
    }

    return reply.status(200).send({ received: true });
  });
}
