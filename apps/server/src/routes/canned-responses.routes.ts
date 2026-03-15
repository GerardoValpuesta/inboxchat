import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt.js";

/**
 * CRUD de Canned Responses (respuestas predefinidas).
 *
 * GET    /api/canned-responses          → listar todas del workspace
 * POST   /api/canned-responses          → crear nueva
 * PUT    /api/canned-responses/:id      → editar
 * DELETE /api/canned-responses/:id      → eliminar
 */
export async function cannedResponsesRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  async function getWorkspaceId(authHeader: string | undefined) {
    if (!authHeader) return null;
    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.workspaceId ?? null;
  }

  // ─── GET /api/canned-responses ───────────────────────────────────────────
  app.get("/api/canned-responses", async (request, reply) => {
    const workspaceId = await getWorkspaceId(request.headers["authorization"] as string);
    if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

    const responses = await db<{
      id: string;
      shortcut: string;
      body: string;
      created_at: string;
    }[]>`
      SELECT id, shortcut, body, created_at
      FROM canned_responses
      WHERE workspace_id = ${workspaceId}
      ORDER BY shortcut ASC
    `;

    return reply.send({ cannedResponses: responses });
  });

  // ─── POST /api/canned-responses ──────────────────────────────────────────
  app.post<{ Body: { shortcut: string; body: string } }>(
    "/api/canned-responses",
    async (request, reply) => {
      const workspaceId = await getWorkspaceId(request.headers["authorization"] as string);
      if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

      const { shortcut, body } = request.body;
      if (!shortcut?.trim() || !body?.trim()) {
        return reply.status(400).send({ error: "shortcut y body son requeridos" });
      }

      // Normalizar el shortcut: minúsculas, sin espacios ni "/"
      const normalizedShortcut = shortcut.replace(/^\//, "").trim().toLowerCase();

      const [existing] = await db<{ id: string }[]>`
        SELECT id FROM canned_responses
        WHERE workspace_id = ${workspaceId} AND shortcut = ${normalizedShortcut}
        LIMIT 1
      `;
      if (existing) {
        return reply.status(409).send({ error: "Ya existe una respuesta con ese shortcut" });
      }

      const [created] = await db<{ id: string; shortcut: string; body: string }[]>`
        INSERT INTO canned_responses (workspace_id, shortcut, body)
        VALUES (${workspaceId}, ${normalizedShortcut}, ${body.trim()})
        RETURNING id, shortcut, body
      `;

      return reply.status(201).send({ cannedResponse: created });
    }
  );

  // ─── PUT /api/canned-responses/:id ───────────────────────────────────────
  app.put<{ Params: { id: string }; Body: { shortcut?: string; body?: string } }>(
    "/api/canned-responses/:id",
    async (request, reply) => {
      const workspaceId = await getWorkspaceId(request.headers["authorization"] as string);
      if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

      const { id } = request.params;
      const { shortcut, body } = request.body;

      if (!shortcut?.trim() && !body?.trim()) {
        return reply.status(400).send({ error: "Nada que actualizar" });
      }

      const fields: string[] = [];
      const values: unknown[] = [];

      if (shortcut?.trim()) {
        fields.push("shortcut");
        values.push(shortcut.replace(/^\//, "").trim().toLowerCase());
      }
      if (body?.trim()) {
        fields.push("body");
        values.push(body.trim());
      }

      // Usamos un UPDATE directo con los campos opcionales
      const [updated] = await db<{ id: string }[]>`
        UPDATE canned_responses
        SET
          shortcut = COALESCE(${shortcut?.replace(/^\//, "").trim().toLowerCase() ?? null}, shortcut),
          body     = COALESCE(${body?.trim() ?? null}, body),
          updated_at = NOW()
        WHERE id = ${id} AND workspace_id = ${workspaceId}
        RETURNING id
      `;

      if (!updated) {
        return reply.status(404).send({ error: "Respuesta no encontrada" });
      }

      return reply.send({ ok: true });
    }
  );

  // ─── DELETE /api/canned-responses/:id ────────────────────────────────────
  app.delete<{ Params: { id: string } }>(
    "/api/canned-responses/:id",
    async (request, reply) => {
      const workspaceId = await getWorkspaceId(request.headers["authorization"] as string);
      if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

      const result = await db`
        DELETE FROM canned_responses
        WHERE id = ${request.params.id} AND workspace_id = ${workspaceId}
      `;

      if (result.count === 0) {
        return reply.status(404).send({ error: "Respuesta no encontrada" });
      }

      return reply.send({ ok: true });
    }
  );
}
