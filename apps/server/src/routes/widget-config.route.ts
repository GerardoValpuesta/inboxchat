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
        widget_gdpr_enabled: boolean;
        name: string;
        plan: string;
        trial_ends_at: string | null;
        business_hours: unknown | null;
        timezone: string | null;
      }[]>`
        SELECT widget_title, widget_color, widget_welcome_message, widget_gdpr_enabled, name, plan, trial_ends_at,
               business_hours, COALESCE(timezone, 'UTC') AS timezone
        FROM workspaces
        WHERE api_key = ${key}
        LIMIT 1
      `;

      if (!workspace) {
        return reply.status(404).send({ error: "Workspace no encontrado" });
      }

      // showBranding = true si el workspace está en free tier o el trial expiró
      const isPro = workspace.plan === "pro";
      const trialActive = workspace.trial_ends_at
        ? new Date(workspace.trial_ends_at) > new Date()
        : false;
      const showBranding = !isPro && !trialActive;

      return reply.send({
        title: workspace.widget_title ?? "Soporte",
        color: workspace.widget_color ?? "#1e293b",
        welcomeMessage: workspace.widget_welcome_message ?? "¡Hola! 👋 ¿En qué podemos ayudarte?",
        gdprEnabled: workspace.widget_gdpr_enabled ?? false,
        workspaceName: workspace.name,
        showBranding,
        businessHours: workspace.business_hours ?? null,
        timezone: workspace.timezone ?? "UTC",
      });
    }
  );

  // ─── PATCH /api/workspace/widget — actualiza config del widget ───────────
  // Requiere Auth (Bearer JWT o X-Workspace-Key)
  app.patch<{
    Body: { title?: string; color?: string; welcomeMessage?: string; gdprEnabled?: boolean };
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

    const { title, color, welcomeMessage, gdprEnabled } = request.body;

    await db`
      UPDATE workspaces
      SET
        widget_title = COALESCE(${title ?? null}, widget_title),
        widget_color = COALESCE(${color ?? null}, widget_color),
        widget_welcome_message = COALESCE(${welcomeMessage ?? null}, widget_welcome_message),
        widget_gdpr_enabled = COALESCE(${gdprEnabled ?? null}, widget_gdpr_enabled)
      WHERE id = ${workspaceId}
    `;

    return reply.send({ ok: true });
  });
}
