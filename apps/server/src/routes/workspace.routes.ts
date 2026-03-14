import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { verifyToken, extractTokenFromHeader } from "../lib/jwt.js";

/**
 * GET /api/workspace/me
 * Devuelve info del workspace del operador autenticado (nombre, email, api_key).
 */
export async function workspaceRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  app.get("/api/workspace/me", async (request, reply) => {
    const token = extractTokenFromHeader(request.headers.authorization);

    // Fallback: X-Workspace-Key header
    let workspaceKeyFromHeader = request.headers["x-workspace-key"] as string | undefined;

    let workspaceId: string | null = null;

    if (token) {
      const payload = verifyToken(token);
      if (payload) workspaceId = payload.workspaceId;
    }

    if (!workspaceId && workspaceKeyFromHeader) {
      const [ws] = await db<{ id: string }[]>`
        SELECT id FROM workspaces WHERE api_key = ${workspaceKeyFromHeader} LIMIT 1
      `;
      workspaceId = ws?.id ?? null;
    }

    if (!workspaceId) {
      return reply.status(401).send({ error: "No autenticado" });
    }

    const [workspace] = await db<{
      id: string;
      name: string;
      owner_email: string;
      api_key: string;
      plan: string;
    }[]>`
      SELECT id, name, owner_email, api_key, plan
      FROM workspaces
      WHERE id = ${workspaceId}
      LIMIT 1
    `;

    if (!workspace) {
      return reply.status(404).send({ error: "Workspace no encontrado" });
    }

    return reply.send({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerEmail: workspace.owner_email,
        apiKey: workspace.api_key,
        plan: workspace.plan,
      },
    });
  });
}
