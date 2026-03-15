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
  const key = headers["x-workspace-key"] as string | undefined;
  if (key) {
    const [ws] = await db<{ id: string }[]>`SELECT id FROM workspaces WHERE api_key = ${key} LIMIT 1`;
    return ws?.id ?? null;
  }
  return null;
}

interface Trigger {
  id: string;
  name: string;
  urlPattern: string;
  delaySecs: number;
  message: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Rutas de Triggers (Proactive Messages).
 *
 * GET    /api/triggers                  — listar triggers del workspace
 * POST   /api/triggers                  — crear trigger
 * PATCH  /api/triggers/:id              — activar/desactivar o editar
 * DELETE /api/triggers/:id              — borrar trigger
 *
 * GET    /api/widget/triggers?key=...   — endpoint PÚBLICO, usa workspace API key
 *        Devuelve triggers activos para que el widget los evalúe.
 */
export async function triggersRoutes(app: FastifyInstance, { db }: { db: Database }) {

  // GET /api/triggers — para el dashboard
  app.get("/api/triggers", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const rows = await db<{
      id: string; name: string; url_pattern: string;
      delay_secs: number; message: string; is_active: boolean; created_at: string;
    }[]>`
      SELECT id, name, url_pattern, delay_secs, message, is_active, created_at
      FROM triggers WHERE workspace_id = ${workspaceId}
      ORDER BY created_at DESC
    `;

    return reply.send({
      triggers: rows.map((r) => ({
        id: r.id, name: r.name, urlPattern: r.url_pattern,
        delaySecs: r.delay_secs, message: r.message,
        isActive: r.is_active, createdAt: r.created_at,
      } satisfies Trigger)),
    });
  });

  // POST /api/triggers
  app.post<{ Body: { name: string; urlPattern: string; delaySecs?: number; message: string } }>(
    "/api/triggers",
    async (request, reply) => {
      const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
      if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

      const { name, urlPattern, delaySecs = 10, message } = request.body;
      if (!name?.trim() || !urlPattern?.trim() || !message?.trim()) {
        return reply.status(400).send({ error: "name, urlPattern y message son requeridos" });
      }

      const [row] = await db<{ id: string; created_at: string }[]>`
        INSERT INTO triggers (workspace_id, name, url_pattern, delay_secs, message)
        VALUES (${workspaceId}, ${name.trim()}, ${urlPattern.trim()}, ${delaySecs}, ${message.trim()})
        RETURNING id, created_at
      `;

      return reply.status(201).send({
        trigger: {
          id: row!.id, name: name.trim(), urlPattern: urlPattern.trim(),
          delaySecs, message: message.trim(), isActive: true,
          createdAt: row!.created_at,
        } satisfies Trigger,
      });
    }
  );

  // PATCH /api/triggers/:id
  app.patch<{
    Params: { id: string };
    Body: { name?: string; urlPattern?: string; delaySecs?: number; message?: string; isActive?: boolean };
  }>("/api/triggers/:id", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const { id } = request.params;
    const { name, urlPattern, delaySecs, message, isActive } = request.body;

    await db`
      UPDATE triggers SET
        name         = COALESCE(${name?.trim() ?? null}, name),
        url_pattern  = COALESCE(${urlPattern?.trim() ?? null}, url_pattern),
        delay_secs   = COALESCE(${delaySecs ?? null}, delay_secs),
        message      = COALESCE(${message?.trim() ?? null}, message),
        is_active    = COALESCE(${isActive ?? null}, is_active)
      WHERE id = ${id} AND workspace_id = ${workspaceId}
    `;
    return reply.send({ ok: true });
  });

  // DELETE /api/triggers/:id
  app.delete<{ Params: { id: string } }>("/api/triggers/:id", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    await db`DELETE FROM triggers WHERE id = ${request.params.id} AND workspace_id = ${workspaceId}`;
    return reply.send({ ok: true });
  });

  // ── Endpoint PÚBLICO para el widget ───────────────────────────────────────
  // GET /api/widget/triggers?key=<apiKey>
  // El widget lo llama al cargar para obtener los triggers activos.
  // Devuelve solo los campos que el widget necesita (sin IDs ni datos sensibles).
  app.get<{ Querystring: { key?: string } }>(
    "/api/widget/triggers",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { key } = request.query;
      if (!key) return reply.status(400).send({ error: "key requerida" });

      const [ws] = await db<{ id: string }[]>`
        SELECT id FROM workspaces WHERE api_key = ${key} LIMIT 1
      `;
      if (!ws) return reply.status(404).send({ error: "Workspace no encontrado" });

      const rows = await db<{ url_pattern: string; delay_secs: number; message: string }[]>`
        SELECT url_pattern, delay_secs, message
        FROM triggers
        WHERE workspace_id = ${ws.id} AND is_active = TRUE
        ORDER BY created_at ASC
      `;

      void reply
        .header("Cache-Control", "public, max-age=60")
        .header("Access-Control-Allow-Origin", "*");

      return reply.send({
        triggers: rows.map((r) => ({
          urlPattern: r.url_pattern,
          delaySecs: r.delay_secs,
          message: r.message,
        })),
      });
    }
  );
}
