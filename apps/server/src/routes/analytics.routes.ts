import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt.js";
import { findWorkspaceByApiKey } from "../db/queries.js";

/**
 * GET /api/analytics?range=14 — métricas del workspace.
 * range: 7 | 14 | 30 días. Default 14.
 * Requiere auth (Bearer JWT o X-Workspace-Key).
 */
export async function analyticsRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  app.get("/api/analytics", async (request, reply) => {
    // Resolver workspaceId
    const authHeader = request.headers["authorization"] as string | undefined;
    const workspaceKey = request.headers["x-workspace-key"] as string | undefined;

    let workspaceId: string | null = null;

    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        const payload = verifyToken(token);
        if (payload) workspaceId = payload.workspaceId;
      }
    }

    if (!workspaceId && workspaceKey) {
      const ws = await findWorkspaceByApiKey(db, workspaceKey);
      workspaceId = ws?.id ?? null;
    }

    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const rangeRaw = (request.query as Record<string, string>)["range"];
    const range = [7, 14, 30].includes(Number(rangeRaw)) ? Number(rangeRaw) : 14;

    // Totales por status (all-time)
    const [totals] = await db<{ open: string; closed: string; total: string }[]>`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed,
        COUNT(*) AS total
      FROM conversations
      WHERE workspace_id = ${workspaceId}
    `;

    // Conversaciones por día — últimos N días
    const byDay = await db<{ day: string; count: string }[]>`
      SELECT
        DATE_TRUNC('day', created_at)::DATE AS day,
        COUNT(*) AS count
      FROM conversations
      WHERE workspace_id = ${workspaceId}
        AND created_at > NOW() - (${range} || ' days')::INTERVAL
      GROUP BY day
      ORDER BY day ASC
    `;

    // Mensajes por sender (últimos N días)
    const [msgStats] = await db<{ operator_msgs: string; contact_msgs: string }[]>`
      SELECT
        COUNT(*) FILTER (WHERE m.sender = 'operator') AS operator_msgs,
        COUNT(*) FILTER (WHERE m.sender = 'contact') AS contact_msgs
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.workspace_id = ${workspaceId}
        AND m.created_at > NOW() - (${range} || ' days')::INTERVAL
    `;

    // Tiempo promedio de primera respuesta del operador (minutos)
    const [responseTimeRow] = await db<{ avg_minutes: string | null }[]>`
      WITH first_contact AS (
        SELECT m.conversation_id, MIN(m.created_at) AS first_contact_at
        FROM messages m
        WHERE m.sender = 'contact'
        GROUP BY m.conversation_id
      ),
      first_operator AS (
        SELECT m.conversation_id, MIN(m.created_at) AS first_reply_at
        FROM messages m
        WHERE m.sender = 'operator'
        GROUP BY m.conversation_id
      )
      SELECT
        AVG(EXTRACT(EPOCH FROM (fo.first_reply_at - fc.first_contact_at)) / 60)::NUMERIC(10,1)
        AS avg_minutes
      FROM first_contact fc
      JOIN first_operator fo ON fo.conversation_id = fc.conversation_id
      JOIN conversations c ON c.id = fc.conversation_id
      WHERE c.workspace_id = ${workspaceId}
        AND fo.first_reply_at > fc.first_contact_at
        AND fc.first_contact_at > NOW() - (${range} || ' days')::INTERVAL
    `;

    // Tasa de respuesta: % de conversaciones que tuvieron al menos 1 respuesta del operador
    const [responseRate] = await db<{ responded: string; total: string }[]>`
      SELECT
        COUNT(DISTINCT m.conversation_id) FILTER (WHERE m.sender = 'operator') AS responded,
        COUNT(DISTINCT m.conversation_id) AS total
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.workspace_id = ${workspaceId}
        AND m.created_at > NOW() - (${range} || ' days')::INTERVAL
    `;

    // Top operadores por mensajes enviados (últimos N días)
    const topOperators = await db<{ name: string; email: string; msg_count: string }[]>`
      SELECT
        op.name,
        op.email,
        COUNT(m.id) AS msg_count
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      JOIN operators op ON op.workspace_id = c.workspace_id
      WHERE c.workspace_id = ${workspaceId}
        AND m.sender = 'operator'
        AND m.created_at > NOW() - (${range} || ' days')::INTERVAL
      GROUP BY op.id, op.name, op.email
      ORDER BY msg_count DESC
      LIMIT 5
    `;

    // Pico horario: distribución de mensajes del contacto por hora del día
    const byHour = await db<{ hour: string; count: string }[]>`
      SELECT
        EXTRACT(HOUR FROM m.created_at)::INT AS hour,
        COUNT(*) AS count
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.workspace_id = ${workspaceId}
        AND m.sender = 'contact'
        AND m.created_at > NOW() - (${range} || ' days')::INTERVAL
      GROUP BY hour
      ORDER BY hour ASC
    `;

    const responded = Number(responseRate?.responded ?? 0);
    const totalConvs = Number(responseRate?.total ?? 0);

    return reply.send({
      range,
      totals: {
        open: Number(totals?.open ?? 0),
        closed: Number(totals?.closed ?? 0),
        total: Number(totals?.total ?? 0),
      },
      byDay: byDay.map((r) => ({ day: r.day, count: Number(r.count) })),
      messages: {
        operator: Number(msgStats?.operator_msgs ?? 0),
        contact: Number(msgStats?.contact_msgs ?? 0),
      },
      avgResponseMinutes: responseTimeRow?.avg_minutes
        ? Number(responseTimeRow.avg_minutes)
        : null,
      responseRate: totalConvs > 0
        ? Math.round((responded / totalConvs) * 100)
        : null,
      topOperators: topOperators.map((op) => ({
        name: op.name,
        email: op.email,
        msgCount: Number(op.msg_count),
      })),
      byHour: byHour.map((r) => ({
        hour: Number(r.hour),
        count: Number(r.count),
      })),
    });
  });
}
