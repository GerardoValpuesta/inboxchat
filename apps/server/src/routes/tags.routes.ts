import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { verifyToken, extractTokenFromHeader } from "../lib/jwt.js";

async function resolveWorkspaceId(
  db: Database,
  headers: Record<string, string | string[] | undefined>
): Promise<string | null> {
  const authHeader = headers["authorization"] as string | undefined;
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.workspaceId) return payload.workspaceId;
    }
  }
  // Fallback: X-Workspace-Key (dev)
  const key = headers["x-workspace-key"] as string | undefined;
  if (key) {
    const [ws] = await db<{ id: string }[]>`SELECT id FROM workspaces WHERE api_key = ${key} LIMIT 1`;
    return ws?.id ?? null;
  }
  return null;
}


/**
 * Rutas de Tags de conversación.
 *
 * GET    /api/tags                              — listar tags del workspace
 * POST   /api/tags                              — crear tag
 * DELETE /api/tags/:tagId                       — borrar tag
 * GET    /api/conversations/:id/tags            — tags de una conversación
 * POST   /api/conversations/:id/tags/:tagId     — asignar tag
 * DELETE /api/conversations/:id/tags/:tagId     — quitar tag
 */
export async function tagsRoutes(app: FastifyInstance, { db }: { db: Database }) {

  // GET /api/tags
  app.get("/api/tags", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const tags = await db<{ id: string; name: string; color: string }[]>`
      SELECT id, name, color FROM tags WHERE workspace_id = ${workspaceId} ORDER BY name
    `;
    return reply.send({ tags });
  });

  // POST /api/tags
  app.post<{ Body: { name: string; color?: string } }>("/api/tags", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const { name, color = "#6366f1" } = request.body;
    if (!name?.trim()) return reply.status(400).send({ error: "Nombre requerido" });

    try {
      const [tag] = await db<{ id: string; name: string; color: string }[]>`
        INSERT INTO tags (workspace_id, name, color)
        VALUES (${workspaceId}, ${name.trim()}, ${color})
        ON CONFLICT (workspace_id, name) DO UPDATE SET color = EXCLUDED.color
        RETURNING id, name, color
      `;
      return reply.status(201).send({ tag });
    } catch {
      return reply.status(409).send({ error: "Ya existe un tag con ese nombre" });
    }
  });

  // DELETE /api/tags/:tagId
  app.delete<{ Params: { tagId: string } }>("/api/tags/:tagId", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    await db`
      DELETE FROM tags WHERE id = ${request.params.tagId} AND workspace_id = ${workspaceId}
    `;
    return reply.send({ ok: true });
  });

  // GET /api/conversations/:id/tags
  app.get<{ Params: { id: string } }>("/api/conversations/:id/tags", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const tags = await db<{ id: string; name: string; color: string }[]>`
      SELECT t.id, t.name, t.color
      FROM conversation_tags ct
      JOIN tags t ON t.id = ct.tag_id
      WHERE ct.conversation_id = ${request.params.id}
        AND t.workspace_id = ${workspaceId}
      ORDER BY t.name
    `;
    return reply.send({ tags });
  });

  // POST /api/conversations/:id/tags/:tagId  — asignar
  app.post<{ Params: { id: string; tagId: string } }>(
    "/api/conversations/:id/tags/:tagId",
    async (request, reply) => {
      const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
      if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

      await db`
        INSERT INTO conversation_tags (conversation_id, tag_id)
        VALUES (${request.params.id}, ${request.params.tagId})
        ON CONFLICT DO NOTHING
      `;
      return reply.send({ ok: true });
    }
  );

  // DELETE /api/conversations/:id/tags/:tagId  — quitar
  app.delete<{ Params: { id: string; tagId: string } }>(
    "/api/conversations/:id/tags/:tagId",
    async (request, reply) => {
      const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
      if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

      await db`
        DELETE FROM conversation_tags
        WHERE conversation_id = ${request.params.id} AND tag_id = ${request.params.tagId}
      `;
      return reply.send({ ok: true });
    }
  );
}
