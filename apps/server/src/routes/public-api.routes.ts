import type { FastifyInstance, FastifyReply } from "fastify";
import type { Database } from "../db/client.js";

/**
 * Public REST API — autenticada por API Key del workspace.
 *
 * Header requerido: X-Api-Key: <workspace api key>
 *
 * Endpoints:
 *   GET    /api/v1/conversations              — listar conversaciones
 *   GET    /api/v1/conversations/:id/messages — mensajes de una conv
 *   POST   /api/v1/conversations/:id/messages — enviar mensaje (como operador)
 *   PATCH  /api/v1/conversations/:id/status   — cerrar / reabrir conv
 */
export async function publicApiRoutes(app: FastifyInstance, { db }: { db: Database }) {

  // ─── Auth helper ────────────────────────────────────────────────────────────
  async function resolveByApiKey(headers: Record<string, string | string[] | undefined>): Promise<string | null> {
    const key = headers["x-api-key"] as string | undefined;
    if (!key) return null;
    const [ws] = await db<{ id: string }[]>`
      SELECT id FROM workspaces WHERE api_key = ${key} LIMIT 1
    `;
    return ws?.id ?? null;
  }

  function unauthorized(reply: FastifyReply) {
    return reply.status(401).send({
      error: "Unauthorized",
      hint: "Provide 'X-Api-Key: <your workspace api key>' header. Find it in Settings → API.",
    });
  }

  // ─── GET /api/v1/conversations ───────────────────────────────────────────────
  app.get<{
    Querystring: { status?: "open" | "closed"; limit?: string; offset?: string }
  }>("/api/v1/conversations", async (request, reply) => {
    const workspaceId = await resolveByApiKey(request.headers as Record<string, string | undefined>);
    if (!workspaceId) return unauthorized(reply);

    const status = request.query.status;
    const limit = Math.min(Number(request.query.limit ?? 50), 100);
    const offset = Number(request.query.offset ?? 0);

    const rows = await db<{
      id: string; status: string; created_at: string; updated_at: string;
      contact_id: string; assigned_to: string | null;
      contact_name: string | null; contact_email: string | null;
    }[]>`
      SELECT
        c.id, c.status, c.created_at, c.updated_at, c.contact_id, c.assigned_to,
        ct.name AS contact_name, ct.email AS contact_email
      FROM conversations c
      LEFT JOIN contacts ct ON ct.id = c.contact_id
      WHERE c.workspace_id = ${workspaceId}
        ${status ? db`AND c.status = ${status}` : db``}
      ORDER BY c.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return reply.send({
      conversations: rows.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        contact: {
          id: r.contact_id,
          name: r.contact_name,
          email: r.contact_email,
        },
        assignedTo: r.assigned_to,
      })),
      meta: { limit, offset },
    });
  });

  // ─── GET /api/v1/conversations/:id/messages ─────────────────────────────────
  app.get<{ Params: { id: string } }>(
    "/api/v1/conversations/:id/messages",
    async (request, reply) => {
      const workspaceId = await resolveByApiKey(request.headers as Record<string, string | undefined>);
      if (!workspaceId) return unauthorized(reply);

      // Verificar que la conv pertenece al workspace
      const [conv] = await db<{ id: string }[]>`
        SELECT id FROM conversations WHERE id = ${request.params.id} AND workspace_id = ${workspaceId} LIMIT 1
      `;
      if (!conv) return reply.status(404).send({ error: "Conversation not found" });

      const messages = await db<{
        id: string; body: string; sender: string; created_at: string;
      }[]>`
        SELECT id, body, sender, created_at
        FROM messages
        WHERE conversation_id = ${request.params.id}
          AND sender != 'note'
        ORDER BY created_at ASC
      `;

      return reply.send({
        messages: messages.map((m) => ({
          id: m.id,
          body: m.body,
          sender: m.sender,
          createdAt: m.created_at,
        })),
      });
    }
  );

  // ─── POST /api/v1/conversations/:id/messages ─────────────────────────────────
  // Permite enviar un mensaje como operador desde el backend del cliente.
  app.post<{
    Params: { id: string };
    Body: { body: string };
  }>("/api/v1/conversations/:id/messages", async (request, reply) => {
    const workspaceId = await resolveByApiKey(request.headers as Record<string, string | undefined>);
    if (!workspaceId) return unauthorized(reply);

    const { body } = request.body;
    if (!body?.trim()) return reply.status(400).send({ error: "body is required" });

    const [conv] = await db<{ id: string }[]>`
      SELECT id FROM conversations WHERE id = ${request.params.id} AND workspace_id = ${workspaceId} LIMIT 1
    `;
    if (!conv) return reply.status(404).send({ error: "Conversation not found" });

    const [msg] = await db<{ id: string; created_at: string }[]>`
      INSERT INTO messages (conversation_id, body, sender)
      VALUES (${request.params.id}, ${body.trim()}, 'operator')
      RETURNING id, created_at
    `;

    // Actualizar updated_at de la conversación
    await db`UPDATE conversations SET updated_at = NOW() WHERE id = ${request.params.id}`;

    return reply.status(201).send({
      message: {
        id: msg!.id,
        body: body.trim(),
        sender: "operator",
        createdAt: msg!.created_at,
      },
    });
  });

  // ─── PATCH /api/v1/conversations/:id/status ─────────────────────────────────
  app.patch<{
    Params: { id: string };
    Body: { status: "open" | "closed" };
  }>("/api/v1/conversations/:id/status", async (request, reply) => {
    const workspaceId = await resolveByApiKey(request.headers as Record<string, string | undefined>);
    if (!workspaceId) return unauthorized(reply);

    const { status } = request.body;
    if (status !== "open" && status !== "closed") {
      return reply.status(400).send({ error: "status must be 'open' or 'closed'" });
    }

    const result = await db<{ id: string }[]>`
      UPDATE conversations
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${request.params.id} AND workspace_id = ${workspaceId}
      RETURNING id
    `;
    if (!result.length) return reply.status(404).send({ error: "Conversation not found" });

    return reply.send({ ok: true, status });
  });
}
