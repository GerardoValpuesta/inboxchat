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
  headers: Record<string, string | string[] | undefined>,
  env: { JWT_SECRET: string }
): Promise<string | null> {
  // 1. JWT Bearer token (producción)
  const authHeader = headers["authorization"] as string | undefined;
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const payload = verifyToken(token, env.JWT_SECRET);
      if (payload && payload.workspaceId) {
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
  { db }: { db: Database }
) {
  // Necesitamos acceder a JWT_SECRET — viene del env ya validado en bootstrap
  const env = { JWT_SECRET: process.env["JWT_SECRET"] ?? "dev-secret-change-in-production" };

  // ─── GET /api/conversations ───────────────────────────────────────────────
  app.get("/api/conversations", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>, env);

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
      const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>, env);

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
      const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>, env);

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

      await db`
        UPDATE conversations
        SET status = 'closed', updated_at = NOW()
        WHERE id = ${request.params.id}
          AND workspace_id = ${workspaceId}
      `;

      return { ok: true };
    }
  );
}
