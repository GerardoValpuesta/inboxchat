import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt.js";

export async function contactsRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  // ─── Auth helper ────────────────────────────────────────────────────────────
  function getWorkspaceId(authHeader: string | undefined): string | null {
    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;
    return verifyToken(token)?.workspaceId ?? null;
  }

  // ─── GET /api/contacts — lista con búsqueda + paginación ───────────────────
  app.get<{
    Querystring: { q?: string; limit?: string; offset?: string }
  }>("/api/contacts", async (request, reply) => {
    const workspaceId = getWorkspaceId(request.headers["authorization"] as string | undefined);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const q = request.query.q?.trim() ?? "";
    const limit = Math.min(Number(request.query.limit ?? 50), 100);
    const offset = Number(request.query.offset ?? 0);

    const contacts = await db<{
      id: string; name: string | null; email: string | null;
      external_id: string | null; last_seen_at: string; created_at: string;
      conversation_count: string;
    }[]>`
      SELECT
        ct.id, ct.name, ct.email, ct.external_id,
        ct.last_seen_at, ct.created_at,
        COUNT(c.id) AS conversation_count
      FROM contacts ct
      LEFT JOIN conversations c ON c.contact_id = ct.id
      WHERE ct.workspace_id = ${workspaceId}
        ${q ? db`AND (ct.name ILIKE ${"%" + q + "%"} OR ct.email ILIKE ${"%" + q + "%"})` : db``}
      GROUP BY ct.id
      ORDER BY ct.last_seen_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;

    return reply.send({
      contacts: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        externalId: c.external_id,
        lastSeenAt: c.last_seen_at,
        createdAt: c.created_at,
        conversationCount: Number(c.conversation_count),
      })),
      meta: { limit, offset, q },
    });
  });

  // ─── GET /api/contacts/export — descarga CSV con todos los contactos ─────────
  // IMPORTANTE: debe ir ANTES del :contactId para no colisionar con el param
  app.get("/api/contacts/export", async (request, reply) => {
    const workspaceId = getWorkspaceId(request.headers["authorization"] as string | undefined);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const contacts = await db<{
      id: string; name: string | null; email: string | null;
      external_id: string | null; last_seen_at: string | null; created_at: string;
      conversation_count: string;
    }[]>`
      SELECT
        ct.id, ct.name, ct.email, ct.external_id,
        ct.last_seen_at, ct.created_at,
        COUNT(c.id) AS conversation_count
      FROM contacts ct
      LEFT JOIN conversations c ON c.contact_id = ct.id
      WHERE ct.workspace_id = ${workspaceId}
      GROUP BY ct.id
      ORDER BY ct.last_seen_at DESC NULLS LAST
    `;

    // Generar CSV — escapar comillas dobles en los campos
    const escape = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const header = "ID,Nombre,Email,ID Externo,Conversaciones,Primera visita,Última visita\n";
    const rows = contacts.map((c) =>
      [
        escape(c.id),
        escape(c.name),
        escape(c.email),
        escape(c.external_id),
        c.conversation_count,
        escape(c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : null),
        escape(c.last_seen_at ? new Date(c.last_seen_at).toISOString().slice(0, 10) : null),
      ].join(",")
    );
    const csv = header + rows.join("\n");

    const date = new Date().toISOString().slice(0, 10);
    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="contacts-${date}.csv"`)
      .send(csv);
  });

  // ─── PATCH /api/contacts/:contactId — actualizar datos del contacto ─────────
  app.patch<{
    Params: { contactId: string };
    Body: { name?: string; email?: string; externalId?: string };
  }>("/api/contacts/:contactId", async (request, reply) => {
    const workspaceId = getWorkspaceId(request.headers["authorization"] as string | undefined);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const { contactId } = request.params;
    const { name, email, externalId } = request.body;

    const result = await db<{ id: string }[]>`
      UPDATE contacts
      SET
        name = COALESCE(${name ?? null}, name),
        email = COALESCE(${email ?? null}, email),
        external_id = COALESCE(${externalId ?? null}, external_id)
      WHERE id = ${contactId} AND workspace_id = ${workspaceId}
      RETURNING id
    `;
    if (!result.length) return reply.status(404).send({ error: "Contacto no encontrado" });

    return reply.send({ ok: true });
  });

  // ─── GET /api/contacts/:contactId — detalle con historial ──────────────────
  app.get("/api/contacts/:contactId", async (request, reply) => {
    const workspaceId = getWorkspaceId(request.headers["authorization"] as string | undefined);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const { contactId } = request.params as { contactId: string };

    // Datos del contacto — validamos que pertenezca al workspace
    const [contact] = await db<{
      id: string;
      name: string | null;
      email: string | null;
      external_id: string | null;
      last_seen_at: string;
      created_at: string;
    }[]>`
      SELECT id, name, email, external_id, last_seen_at, created_at
      FROM contacts
      WHERE id = ${contactId}
        AND workspace_id = ${workspaceId}
      LIMIT 1
    `;

    if (!contact) return reply.status(404).send({ error: "Contacto no encontrado" });

    // Historial de conversaciones del contacto
    const conversations = await db<{
      id: string;
      status: string;
      created_at: string;
      updated_at: string;
      message_count: string;
      last_msg: string | null;
    }[]>`
      SELECT
        c.id,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(m.id) AS message_count,
        (
          SELECT m2.body FROM messages m2
          WHERE m2.conversation_id = c.id
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) AS last_msg
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.contact_id = ${contactId}
        AND c.workspace_id = ${workspaceId}
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 20
    `;

    return reply.send({
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        externalId: contact.external_id,
        lastSeenAt: contact.last_seen_at,
        createdAt: contact.created_at,
      },
      conversations: conversations.map((c) => ({
        id: c.id,
        status: c.status,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        messageCount: Number(c.message_count),
        lastMessage: c.last_msg ?? null,
      })),
    });
  });
}
