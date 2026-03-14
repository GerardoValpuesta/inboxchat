import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";

/**
 * GET /api/widget/config?key={workspaceKey}
 * Devuelve la configuración pública del widget para un workspace.
 * No requiere auth — es llamado desde el widget embebido en sitios externos.
 */
export async function widgetConfigRoute(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  app.get<{ Querystring: { key?: string } }>(
    "/api/widget/config",
    async (request, reply) => {
      const { key } = request.query;
      if (!key) return reply.status(400).send({ error: "workspaceKey requerido" });

      const [workspace] = await db<{
        widget_title: string;
        widget_color: string;
        widget_welcome_message: string;
        name: string;
        plan: string;
        trial_ends_at: string | null;
      }[]>`
        SELECT widget_title, widget_color, widget_welcome_message, name, plan, trial_ends_at
        FROM workspaces
        WHERE api_key = ${key}
        LIMIT 1
      `;

      if (!workspace) {
        return reply.status(404).send({ error: "Workspace no encontrado" });
      }

      return reply.send({
        title: workspace.widget_title ?? "Soporte",
        color: workspace.widget_color ?? "#1e293b",
        welcomeMessage: workspace.widget_welcome_message ?? "¡Hola! 👋 ¿En qué podemos ayudarte?",
        workspaceName: workspace.name,
      });
    }
  );

  // ─── PATCH /api/workspace/widget — actualiza config del widget ───────────
  // Requiere Auth (Bearer JWT o X-Workspace-Key)
  app.patch<{
    Body: { title?: string; color?: string; welcomeMessage?: string };
  }>("/api/workspace/widget", async (request, reply) => {
    // Resolución de workspaceId por JWT o header
    const authHeader = request.headers["authorization"] as string | undefined;
    const workspaceKey = request.headers["x-workspace-key"] as string | undefined;

    let workspaceId: string | null = null;

    if (authHeader) {
      const { extractTokenFromHeader, verifyToken } = await import("../lib/jwt.js");
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        const payload = verifyToken(token);
        if (payload) workspaceId = payload.workspaceId;
      }
    }

    if (!workspaceId && workspaceKey) {
      const [ws] = await db<{ id: string }[]>`
        SELECT id FROM workspaces WHERE api_key = ${workspaceKey} LIMIT 1
      `;
      workspaceId = ws?.id ?? null;
    }

    if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

    const { title, color, welcomeMessage } = request.body;

    await db`
      UPDATE workspaces
      SET
        widget_title = COALESCE(${title ?? null}, widget_title),
        widget_color = COALESCE(${color ?? null}, widget_color),
        widget_welcome_message = COALESCE(${welcomeMessage ?? null}, widget_welcome_message)
      WHERE id = ${workspaceId}
    `;

    return reply.send({ ok: true });
  });
}
