import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { verifyToken, extractTokenFromHeader } from "../lib/jwt.js";

/**
 * GET  /api/workspace/me  — info del workspace del operador autenticado
 * PATCH /api/workspace/me — actualizar configuración (sla_minutes, etc.)
 */
export async function workspaceRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  async function resolveWorkspaceId(
    headers: Record<string, string | string[] | undefined>
  ): Promise<string | null> {
    const token = extractTokenFromHeader(headers.authorization as string | undefined);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.workspaceId) return payload.workspaceId;
    }
    const key = headers["x-workspace-key"] as string | undefined;
    if (key) {
      const [ws] = await db<{ id: string }[]>`
        SELECT id FROM workspaces WHERE api_key = ${key} LIMIT 1
      `;
      return ws?.id ?? null;
    }
    return null;
  }

  app.get("/api/workspace/me", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(
      request.headers as Record<string, string | undefined>
    );
    if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

    const [workspace] = await db<{
      id: string;
      name: string;
      owner_email: string;
      api_key: string;
      plan: string;
      sla_minutes: number | null;
      business_hours: unknown | null;
      timezone: string | null;
    }[]>`
      SELECT id, name, owner_email, api_key, plan,
             COALESCE(sla_minutes, 10) AS sla_minutes,
             business_hours,
             COALESCE(timezone, 'America/Mexico_City') AS timezone
      FROM workspaces
      WHERE id = ${workspaceId}
      LIMIT 1
    `;

    if (!workspace) return reply.status(404).send({ error: "Workspace no encontrado" });

    return reply.send({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerEmail: workspace.owner_email,
        apiKey: workspace.api_key,
        plan: workspace.plan,
        slaMinutes: workspace.sla_minutes ?? 10,
        businessHours: workspace.business_hours ?? null,
        timezone: workspace.timezone ?? 'America/Mexico_City',
      },
    });
  });

  // PATCH /api/workspace/me — actualizar configuración
  app.patch<{ Body: { slaMinutes?: number; businessHours?: unknown; timezone?: string } }>(
    "/api/workspace/me",
    async (request, reply) => {
      const workspaceId = await resolveWorkspaceId(
        request.headers as Record<string, string | undefined>
      );
      if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

      const { slaMinutes, businessHours, timezone } = request.body;
      if (slaMinutes !== undefined) {
        const mins = Math.max(1, Math.min(Number(slaMinutes), 480));
        await db`UPDATE workspaces SET sla_minutes = ${mins} WHERE id = ${workspaceId}`;
      }
      if (businessHours !== undefined) {
        const bh = JSON.stringify(businessHours);
        await db`UPDATE workspaces SET business_hours = ${bh}::jsonb WHERE id = ${workspaceId}`;
      }
      if (timezone !== undefined && typeof timezone === 'string') {
        await db`UPDATE workspaces SET timezone = ${timezone} WHERE id = ${workspaceId}`;
      }

      return reply.send({ ok: true });
    }
  );
}
