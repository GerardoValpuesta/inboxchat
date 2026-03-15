import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";

/**
 * Widget Analytics Routes
 *
 * POST /api/widget/track           — public, sin auth, registra un evento del widget
 * GET  /api/analytics/widget       — privado JWT, stats de widget views y chat opens
 */
export async function widgetAnalyticsRoutes(app: FastifyInstance, { db }: { db: Database }) {

  // ─── POST /api/widget/track — público, llamado desde widget.js ──────────────
  app.post<{
    Body: {
      event: "widget_view" | "chat_open";
      workspaceKey: string;
      sessionId?: string;
      url?: string;
    }
  }>("/api/widget/track", async (request, reply) => {
    const { event, workspaceKey, sessionId, url } = request.body;

    if (!workspaceKey || !event) {
      return reply.status(400).send({ error: "workspaceKey y event son requeridos" });
    }

    if (event !== "widget_view" && event !== "chat_open") {
      return reply.status(400).send({ error: "event inválido" });
    }

    // Resolver workspaceId por api_key
    const [ws] = await db<{ id: string }[]>`
      SELECT id FROM workspaces WHERE api_key = ${workspaceKey} LIMIT 1
    `;
    if (!ws) return reply.status(200).send({ ok: true }); // fail silently

    // Dedup: no registrar widget_view si ya lo registramos en esta sesión (últimas 4h)
    if (sessionId && event === "widget_view") {
      const [existing] = await db<{ id: bigint }[]>`
        SELECT id FROM widget_events
        WHERE workspace_id = ${ws.id}
          AND session_id = ${sessionId}
          AND event_type = 'widget_view'
          AND created_at > NOW() - INTERVAL '4 hours'
        LIMIT 1
      `;
      if (existing) return reply.status(200).send({ ok: true });
    }

    await db`
      INSERT INTO widget_events (workspace_id, event_type, session_id, url)
      VALUES (${ws.id}, ${event}, ${sessionId ?? null}, ${url ?? null})
    `;

    return reply.send({ ok: true });
  });

  // ─── GET /api/analytics/widget — privado, stats de los últimos N días ────────
  app.get<{
    Querystring: { days?: string }
  }>("/api/analytics/widget", async (request, reply) => {
    // JWT auth
    const authHeader = request.headers["authorization"] as string | undefined;
    if (!authHeader) return reply.status(401).send({ error: "No autorizado" });
    const { extractTokenFromHeader, verifyToken } = await import("../lib/jwt.js");
    const token = extractTokenFromHeader(authHeader);
    const payload = token ? verifyToken(token) : null;
    if (!payload) return reply.status(401).send({ error: "Token inválido" });

    const days = Math.min(Math.max(Number(request.query.days ?? 30), 1), 90);
    const workspaceId = payload.workspaceId;

    // Totales en el período
    const [totals] = await db<{
      views: string;
      opens: string;
    }[]>`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'widget_view') AS views,
        COUNT(*) FILTER (WHERE event_type = 'chat_open') AS opens
      FROM widget_events
      WHERE workspace_id = ${workspaceId}
        AND created_at > NOW() - (${days} || ' days')::INTERVAL
    `;

    const views = Number(totals?.views ?? 0);
    const opens = Number(totals?.opens ?? 0);
    const openRate = views > 0 ? Math.round((opens / views) * 100 * 10) / 10 : 0;

    // Serie diaria — útil para gráficos futuros
    const dailySeries = await db<{
      day: string;
      views: string;
      opens: string;
    }[]>`
      SELECT
        DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::DATE::TEXT AS day,
        COUNT(*) FILTER (WHERE event_type = 'widget_view') AS views,
        COUNT(*) FILTER (WHERE event_type = 'chat_open') AS opens
      FROM widget_events
      WHERE workspace_id = ${workspaceId}
        AND created_at > NOW() - (${days} || ' days')::INTERVAL
      GROUP BY day
      ORDER BY day ASC
    `;

    return reply.send({
      period: { days },
      summary: { views, opens, openRate },
      daily: dailySeries.map((d) => ({
        day: d.day,
        views: Number(d.views),
        opens: Number(d.opens),
      })),
    });
  });
}
