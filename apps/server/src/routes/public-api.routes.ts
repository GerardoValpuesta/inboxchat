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

  // ─── Auth helper (por API Key) ───────────────────────────────────────────────
  async function resolveByApiKey(headers: Record<string, string | string[] | undefined>): Promise<{ id: string; plan: string } | null> {
    const key = headers["x-api-key"] as string | undefined;
    if (!key) return null;
    const [ws] = await db<{ id: string; plan: string }[]>`
      SELECT id, plan FROM workspaces WHERE api_key = ${key} LIMIT 1
    `;
    return ws ?? null;
  }

  function unauthorized(reply: FastifyReply) {
    return reply.status(401).send({
      error: "Unauthorized",
      hint: "Provide 'X-Api-Key: <your workspace api key>' header. Find it in Settings → API.",
    });
  }

  function planRequired(reply: FastifyReply) {
    return reply.status(403).send({
      error: "Plan upgrade required",
      hint: "The Public REST API is available on the Pro plan. Upgrade at https://inboxchat-web.vercel.app/pricing",
      upgrade_url: "https://inboxchat-web.vercel.app/pricing",
    });
  }

  /** Resuelve workspace y verifica que sea plan Pro o superior. Retorna null + 403 si no pasa. */
  async function requirePro(
    request: { headers: Record<string, string | string[] | undefined> },
    reply: FastifyReply
  ): Promise<string | null> {
    const ws = await resolveByApiKey(request.headers);
    if (!ws) { void unauthorized(reply); return null; }
    if (ws.plan === "free") { void planRequired(reply); return null; }
    return ws.id;
  }

  // ─── GET /api/v1 — API Reference ────────────────────────────────────────────
  app.get("/api/v1", async (_request, reply) => {
    return reply.send({
      name: "InboxChat Public API",
      version: "1",
      baseUrl: "/api/v1",
      auth: "Header: X-Api-Key: <workspace api key>  (find it in Settings → API)",
      endpoints: [
        { method: "GET",   path: "/api/v1/conversations",                  description: "List conversations. ?status=open|closed &limit=50 &offset=0" },
        { method: "POST",  path: "/api/v1/conversations",                  description: "Create a conversation + contact" },
        { method: "PATCH", path: "/api/v1/conversations/:id/status",       description: "Close or reopen a conversation" },
        { method: "GET",   path: "/api/v1/conversations/:id/messages",     description: "Get messages for a conversation" },
        { method: "POST",  path: "/api/v1/conversations/:id/messages",     description: "Send a message as operator" },
        { method: "GET",   path: "/api/v1/contacts",                       description: "List contacts. ?search=email|name &limit=50 &offset=0" },
      ],
    });
  });

  // ─── GET /api/v1/conversations ───────────────────────────────────────────────
  app.get<{
    Querystring: { status?: "open" | "closed"; limit?: string; offset?: string }
  }>("/api/v1/conversations", async (request, reply) => {
    const workspaceId = await requirePro(request, reply);
    if (!workspaceId) return;

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
      const workspaceId = await requirePro(request, reply);
      if (!workspaceId) return;

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
    const workspaceId = await requirePro(request, reply);
    if (!workspaceId) return;

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
    const workspaceId = await requirePro(request, reply);
    if (!workspaceId) return;

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

  // ─── GET /api/v1/contacts ─────────────────────────────────────────────────
  app.get<{
    Querystring: { search?: string; limit?: string; offset?: string }
  }>("/api/v1/contacts", async (request, reply) => {
    const workspaceId = await requirePro(request, reply);
    if (!workspaceId) return;

    const { search } = request.query;
    const limit = Math.min(Number(request.query.limit ?? 50), 100);
    const offset = Number(request.query.offset ?? 0);

    const rows = await db<{
      id: string; name: string | null; email: string | null;
      created_at: string; conversation_count: number;
    }[]>`
      SELECT
        ct.id, ct.name, ct.email, ct.created_at,
        COUNT(cv.id)::int AS conversation_count
      FROM contacts ct
      LEFT JOIN conversations cv ON cv.contact_id = ct.id
      WHERE ct.workspace_id = ${workspaceId}
        ${search ? db`AND (ct.name ILIKE ${'%' + search + '%'} OR ct.email ILIKE ${'%' + search + '%'})` : db``}
      GROUP BY ct.id
      ORDER BY ct.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return reply.send({
      contacts: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        createdAt: r.created_at,
        conversationCount: r.conversation_count,
      })),
      meta: { limit, offset },
    });
  });

  // ─── POST /api/v1/conversations ──────────────────────────────────────────
  // Crea una conversación (+ upsert contact). Útil para integraciones Zapier/Make.
  app.post<{
    Body: {
      contact: { name?: string; email?: string; externalId?: string };
      message?: string;
    };
  }>("/api/v1/conversations", async (request, reply) => {
    const workspaceId = await requirePro(request, reply);
    if (!workspaceId) return;

    const { contact, message } = request.body ?? {};
    if (!contact) return reply.status(400).send({ error: "contact is required" });

    // Upsert contact
    const [upsertedContact] = await db<{ id: string; name: string | null; email: string | null }[]>`
      INSERT INTO contacts (workspace_id, name, email, external_id)
      VALUES (
        ${workspaceId},
        ${contact.name ?? null},
        ${contact.email ?? null},
        ${contact.externalId ?? null}
      )
      ON CONFLICT (workspace_id, external_id) WHERE external_id IS NOT NULL
        DO UPDATE SET
          name  = COALESCE(EXCLUDED.name,  contacts.name),
          email = COALESCE(EXCLUDED.email, contacts.email)
      RETURNING id, name, email
    `;
    if (!upsertedContact) return reply.status(500).send({ error: "Failed to create contact" });

    // Crear conversación
    const [conv] = await db<{ id: string; created_at: string }[]>`
      INSERT INTO conversations (workspace_id, contact_id, status)
      VALUES (${workspaceId}, ${upsertedContact.id}, 'open')
      RETURNING id, created_at
    `;
    if (!conv) return reply.status(500).send({ error: "Failed to create conversation" });

    // Mensaje inicial opcional (como operador)
    let firstMessage: { id: string; body: string } | null = null;
    if (message?.trim()) {
      const [msg] = await db<{ id: string }[]>`
        INSERT INTO messages (conversation_id, body, sender)
        VALUES (${conv.id}, ${message.trim()}, 'operator')
        RETURNING id
      `;
      if (msg) firstMessage = { id: msg.id, body: message.trim() };
    }

    return reply.status(201).send({
      conversation: {
        id: conv.id,
        status: "open",
        createdAt: conv.created_at,
        contact: {
          id: upsertedContact.id,
          name: upsertedContact.name,
          email: upsertedContact.email,
        },
      },
      ...(firstMessage ? { message: firstMessage } : {}),
    });
  });
}
