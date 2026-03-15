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
  app.get("/api/conversations", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);

    if (!workspaceId) {
      return reply.status(401).send({ error: "No autorizado" });
    }

    const conversations = await listOpenConversations(db, workspaceId);
    return { conversations };
  });

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
}
