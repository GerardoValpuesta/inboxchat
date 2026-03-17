import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { createHmac } from "crypto";
import { verifyToken, extractTokenFromHeader } from "../lib/jwt.js";

function resolveWorkspaceId(
  headers: Record<string, string | undefined>,
  token: string | undefined
): string | null {
  const tok = extractTokenFromHeader(token);
  if (tok) {
    const payload = verifyToken(tok);
    if (payload?.workspaceId) return payload.workspaceId;
  }
  return null;
}

/**
 * GET  /api/webhooks             — listar webhooks del workspace
 * POST /api/webhooks             — crear webhook
 * PATCH /api/webhooks/:id        — actualizar webhook
 * DELETE /api/webhooks/:id       — eliminar webhook
 *
 * Internal: sendWebhookEvent() — llamado por socket handlers al recibir un mensaje
 */
export async function webhookRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  // ─── GET /api/webhooks ────────────────────────────────────────────────────
  app.get("/api/webhooks", async (request, reply) => {
    const wsId = resolveWorkspaceId(
      request.headers as Record<string, string | undefined>,
      request.headers.authorization
    );
    if (!wsId) return reply.status(401).send({ error: "No autorizado" });

    const webhooks = await db<{
      id: string; url: string; events: string[];
      enabled: boolean; created_at: string;
    }[]>`
      SELECT id, url, events, enabled, created_at
      FROM outgoing_webhooks
      WHERE workspace_id = ${wsId}
      ORDER BY created_at DESC
    `;
    return reply.send({ webhooks });
  });

  // ─── POST /api/webhooks ───────────────────────────────────────────────────
  app.post<{ Body: { url: string; secret?: string; events?: string[] } }>(
    "/api/webhooks",
    async (request, reply) => {
      const wsId = resolveWorkspaceId(
        request.headers as Record<string, string | undefined>,
        request.headers.authorization
      );
      if (!wsId) return reply.status(401).send({ error: "No autorizado" });

      const { url, secret, events = ["message.created"] } = request.body;
      if (!url || !url.startsWith("http")) {
        return reply.status(400).send({ error: "URL inválida" });
      }

      const [webhook] = await db<{ id: string }[]>`
        INSERT INTO outgoing_webhooks (workspace_id, url, secret, events)
        VALUES (${wsId}, ${url}, ${secret ?? null}, ${events as unknown as string})
        RETURNING id
      `;
      return reply.status(201).send({ webhook: { id: webhook!.id, url, events } });
    }
  );

  // ─── PATCH /api/webhooks/:id ──────────────────────────────────────────────
  app.patch<{
    Params: { id: string };
    Body: { url?: string; secret?: string; events?: string[]; enabled?: boolean };
  }>("/api/webhooks/:id", async (request, reply) => {
    const wsId = resolveWorkspaceId(
      request.headers as Record<string, string | undefined>,
      request.headers.authorization
    );
    if (!wsId) return reply.status(401).send({ error: "No autorizado" });

    const { url, secret, events, enabled } = request.body;
    await db`
      UPDATE outgoing_webhooks
      SET
        url     = COALESCE(${url ?? null}, url),
        secret  = COALESCE(${secret ?? null}, secret),
        events  = COALESCE(${events as unknown as string ?? null}, events),
        enabled = COALESCE(${enabled ?? null}, enabled)
      WHERE id = ${request.params.id}
        AND workspace_id = ${wsId}
    `;
    return reply.send({ ok: true });
  });

  // ─── DELETE /api/webhooks/:id ─────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>("/api/webhooks/:id", async (request, reply) => {
    const wsId = resolveWorkspaceId(
      request.headers as Record<string, string | undefined>,
      request.headers.authorization
    );
    if (!wsId) return reply.status(401).send({ error: "No autorizado" });

    await db`
      DELETE FROM outgoing_webhooks
      WHERE id = ${request.params.id} AND workspace_id = ${wsId}
    `;
    return reply.send({ ok: true });
  });
}

/**
 * Dispara los webhooks registrados para un workspace cuando llega un mensaje.
 * Fire-and-forget: no bloquea el flujo principal.
 */
export async function sendWebhookEvent(
  db: Database,
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await db<{ url: string; secret: string | null }[]>`
      SELECT url, secret FROM outgoing_webhooks
      WHERE workspace_id = ${workspaceId}
        AND enabled = TRUE
        AND ${event} = ANY(events)
    `;
    if (!webhooks.length) return;

    const body = JSON.stringify({
      event,
      workspace_id: workspaceId,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    await Promise.allSettled(
      webhooks.map(async (wh) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-InboxChat-Event": event,
        };
        // HMAC-SHA256 signature si el webhook tiene secret configurado
        if (wh.secret) {
          const sig = createHmac("sha256", wh.secret).update(body).digest("hex");
          headers["X-InboxChat-Signature"] = `sha256=${sig}`;
        }
        const res = await fetch(wh.url, { method: "POST", headers, body });
        if (!res.ok) {
          console.warn(`[webhook] ${wh.url} respondió ${res.status}`);
        }
      })
    );
  } catch (err) {
    console.error("[webhook] Error enviando evento:", err);
  }
}
