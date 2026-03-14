import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import {
  listOpenConversations,
  getConversationWithContact,
  getConversationHistory,
  markConversationRead,
  findWorkspaceByApiKey,
} from "../db/queries.js";

/**
 * Rutas REST del dashboard del operador.
 *
 * Estas rutas son el complemento de Socket.io:
 * - Socket.io → eventos en tiempo real (nuevos mensajes, conversaciones)
 * - REST → carga inicial de datos al abrir el dashboard
 *
 * Por qué separar REST de Socket.io:
 * El dashboard necesita cargar el historial al montar. Si dependiera solo
 * de Socket.io, el operador solo vería conversaciones que lleguen DESPUÉS
 * de conectarse. Con REST, cargamos el estado actual de la DB primero.
 */
export async function dashboardRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  // ─── GET /api/conversations ───────────────────────────────────────────────
  // Carga las conversaciones abiertas del workspace.
  // El workspaceId viene del header X-Workspace-Key (en el futuro, de la sesión).
  app.get("/api/conversations", async (request, reply) => {
    const workspaceKey = request.headers["x-workspace-key"] as string | undefined;

    if (!workspaceKey) {
      return reply.status(400).send({ error: "Header X-Workspace-Key requerido" });
    }

    const workspace = await findWorkspaceByApiKey(db, workspaceKey);
    if (!workspace) {
      return reply.status(401).send({ error: "Workspace no encontrado" });
    }

    const conversations = await listOpenConversations(db, workspace.id as string);
    return { conversations };
  });

  // ─── GET /api/conversations/:id/messages ─────────────────────────────────
  // Carga el historial de mensajes de una conversación.
  app.get<{ Params: { id: string } }>(
    "/api/conversations/:id/messages",
    async (request, reply) => {
      const workspaceKey = request.headers["x-workspace-key"] as string | undefined;
      if (!workspaceKey) {
        return reply.status(400).send({ error: "Header X-Workspace-Key requerido" });
      }

      const workspace = await findWorkspaceByApiKey(db, workspaceKey);
      if (!workspace) {
        return reply.status(401).send({ error: "Workspace no encontrado" });
      }

      // Verificar que la conversación pertenece al workspace
      const conversation = await getConversationWithContact(
        db,
        request.params.id,
        workspace.id as string
      );
      if (!conversation) {
        return reply.status(404).send({ error: "Conversación no encontrada" });
      }

      // Marcar como leída cuando el operador abre el chat
      await markConversationRead(db, request.params.id);

      const messages = await getConversationHistory(db, request.params.id);
      return { messages, conversation };
    }
  );

  // ─── POST /api/conversations/:id/close ───────────────────────────────────
  // Cierra una conversación.
  app.post<{ Params: { id: string } }>(
    "/api/conversations/:id/close",
    async (request, reply) => {
      const workspaceKey = request.headers["x-workspace-key"] as string | undefined;
      if (!workspaceKey) {
        return reply.status(400).send({ error: "Header X-Workspace-Key requerido" });
      }

      const workspace = await findWorkspaceByApiKey(db, workspaceKey);
      if (!workspace) {
        return reply.status(401).send({ error: "Workspace no encontrado" });
      }

      const conversation = await getConversationWithContact(
        db,
        request.params.id,
        workspace.id as string
      );
      if (!conversation) {
        return reply.status(404).send({ error: "Conversación no encontrada" });
      }

      // Actualizar estado a closed
      await db`
        UPDATE conversations
        SET status = 'closed', updated_at = NOW()
        WHERE id = ${request.params.id}
          AND workspace_id = ${workspace.id as string}
      `;

      return { ok: true };
    }
  );
}
