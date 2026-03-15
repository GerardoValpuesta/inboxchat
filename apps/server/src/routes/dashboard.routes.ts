import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import {
  listOpenConversations,
  getConversationWithContact,
  getConversationHistory,
  markConversationRead,
  findWorkspaceByApiKey,
} from "../db/queries.js";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt.js";

/**
 * Rutas REST del dashboard del operador.
 *
 * Auth: acepta Bearer JWT (producción) o X-Workspace-Key (dev).
 * El JWT contiene el workspaceId directamente — no necesitamos buscar en DB.
 */

/** Extrae el workspaceId del request — JWT o header legacy */
async function resolveWorkspaceId(
  db: Database,
  headers: Record<string, string | string[] | undefined>
): Promise<string | null> {
  // 1. JWT Bearer token (producción)
  const authHeader = headers["authorization"] as string | undefined;
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.workspaceId) {
        return payload.workspaceId;
      }
    }
  }

  // 2. Fallback: X-Workspace-Key (dev / embedding directo)
  const workspaceKey = headers["x-workspace-key"] as string | undefined;
  if (workspaceKey) {
    const workspace = await findWorkspaceByApiKey(db, workspaceKey);
    return workspace ? (workspace.id as string) : null;
  }

  return null;
}

export async function dashboardRoutes(
  app: FastifyInstance,
  { db, ioRef }: { db: Database; ioRef: { current: import("socket.io").Server | null } }
) {
  // ─── GET /api/conversations ───────────────────────────────────────────────
  app.get<{ Querystring: { tag?: string } }>("/api/conversations", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);

    if (!workspaceId) {
      return reply.status(401).send({ error: "No autorizado" });
    }

    const tagId = request.query.tag;

    if (tagId) {
      // Filtrar conversaciones que tienen este tag asignado
      const taggedIds = await db<{ conversation_id: string }[]>`
        SELECT ct.conversation_id
        FROM conversation_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.tag_id = ${tagId}
          AND t.workspace_id = ${workspaceId}
      `;
      if (taggedIds.length === 0) return reply.send({ conversations: [] });
      const ids = taggedIds.map((r) => r.conversation_id);
      const conversations = await listOpenConversations(db, workspaceId);
      return reply.send({ conversations: conversations.filter((c) => ids.includes(c.id)) });
    }

    const conversations = await listOpenConversations(db, workspaceId);
    return { conversations };
  });

  // ─── GET /api/conversations/search?q= ────────────────────────────────────
  app.get<{ Querystring: { q?: string } }>(
    "/api/conversations/search",
    async (request, reply) => {
      const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
      if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

      const q = (request.query.q ?? "").trim();
      if (!q) return reply.send({ conversations: [] });

      // Buscar por nombre/email del contacto (ILIKE) o por contenido de mensajes (FTS)
      const results = await db<{
        id: string;
        status: string;
        updated_at: string;
        unread_count: number;
        assigned_to: string | null;
        contact_id: string;
        contact_name: string | null;
        contact_email: string | null;
        snippet: string | null;
      }[]>`
        SELECT DISTINCT ON (c.id)
          c.id, c.status, c.updated_at, c.unread_count, c.assigned_to,
          co.id AS contact_id, co.name AS contact_name, co.email AS contact_email,
          (
            SELECT m.body FROM messages m
            WHERE m.conversation_id = c.id AND m.sender != 'note'
            ORDER BY m.created_at DESC LIMIT 1
          ) AS snippet
        FROM conversations c
        JOIN contacts co ON co.id = c.contact_id
        WHERE c.workspace_id = ${workspaceId}
          AND (
            co.name  ILIKE ${'%' + q + '%'}
            OR co.email ILIKE ${'%' + q + '%'}
            OR EXISTS (
              SELECT 1 FROM messages m
              WHERE m.conversation_id = c.id
                AND to_tsvector('spanish', m.body) @@ plainto_tsquery('spanish', ${q})
            )
          )
        ORDER BY c.id, c.updated_at DESC
        LIMIT 20
      `;

      const conversations = results.map((r) => ({
        id: r.id,
        status: r.status,
        updatedAt: r.updated_at,
        contactName: r.contact_name,
        contactEmail: r.contact_email,
        snippet: r.snippet ? r.snippet.slice(0, 80) : null,
      }));

      return reply.send({ conversations });
    }
  );

  // ─── GET /api/conversations/:id/messages ─────────────────────────────────
  app.get<{ Params: { id: string } }>(
    "/api/conversations/:id/messages",
    async (request, reply) => {
      const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);

      if (!workspaceId) {
        return reply.status(401).send({ error: "No autorizado" });
      }

      const conversation = await getConversationWithContact(
        db,
        request.params.id,
        workspaceId
      );
      if (!conversation) {
        return reply.status(404).send({ error: "Conversación no encontrada" });
      }

      await markConversationRead(db, request.params.id);
      const messages = await getConversationHistory(db, request.params.id);
      return { messages, conversation };
    }
  );

  // ─── POST /api/conversations/:id/close ───────────────────────────────────
  app.post<{ Params: { id: string } }>(
    "/api/conversations/:id/close",
    async (request, reply) => {
      const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);

      if (!workspaceId) {
        return reply.status(401).send({ error: "No autorizado" });
      }

      const conversation = await getConversationWithContact(
        db,
        request.params.id,
        workspaceId
      );
      if (!conversation) {
        return reply.status(404).send({ error: "Conversación no encontrada" });
      }

      if (conversation.status === "closed") {
        return reply.status(400).send({ error: "La conversación ya está cerrada" });
      }

      await db`
        UPDATE conversations
        SET status = 'closed', updated_at = NOW()
        WHERE id = ${request.params.id}
          AND workspace_id = ${workspaceId}
      `;

      const conversationId = request.params.id;
      const now = new Date().toISOString();

      // Notificar a todos los operadores del workspace (sidebar se actualiza en tiempo real)
      ioRef.current?.to(`workspace:${workspaceId}`).emit("conversation:updated", {
        conversation: {
          id: conversationId,
          status: "closed",
          unreadCount: conversation.unreadCount,
          updatedAt: now as unknown as Date,
        },
      });

      // Notificar al widget (sala de la conversación) que fue cerrada
      ioRef.current?.to(`conversation:${conversationId}`).emit("conversation:closed", {
        conversationId,
      });

      return { ok: true };
    }
  );

  // ─── POST /api/conversations/:id/assign ──────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: { operatorId: string | null };
  }>("/api/conversations/:id/assign", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

    const conversationId = request.params.id;
    const { operatorId } = request.body;

    // Verificar que la conversación pertenece al workspace
    const [conv] = await db<{ id: string }[]>`
      SELECT id FROM conversations
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId}
      LIMIT 1
    `;
    if (!conv) return reply.status(404).send({ error: "Conversación no encontrada" });

    // Si se asigna a un operador, verificar que pertenece al workspace
    if (operatorId) {
      const [op] = await db<{ id: string }[]>`
        SELECT id FROM operators
        WHERE id = ${operatorId} AND workspace_id = ${workspaceId}
        LIMIT 1
      `;
      if (!op) return reply.status(400).send({ error: "Operador no válido" });
    }

    await db`
      UPDATE conversations
      SET assigned_to = ${operatorId ?? null}, updated_at = NOW()
      WHERE id = ${conversationId} AND workspace_id = ${workspaceId}
    `;

    // Notificar a todos los operadores del workspace en tiempo real
    ioRef.current?.to(`workspace:${workspaceId}`).emit("conversation:assigned", {
      conversationId,
      operatorId,
    });

    return { ok: true };
  });
}
