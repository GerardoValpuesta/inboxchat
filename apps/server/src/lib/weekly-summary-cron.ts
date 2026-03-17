import type { Database } from "../db/client.js";
import { sendWeeklySummaryEmail } from "../lib/email.js";

/**
 * Weekly Summary Cron — se ejecuta cada hora y envía el resumen
 * los lunes entre 9:00–10:00 AM UTC.
 *
 * Stats de la semana anterior (lunes a domingo UTC):
 * - Conversaciones totales / resueltas
 * - Tiempo medio de primera respuesta (minutos)
 * - CSAT promedio (si existe la tabla csat_ratings)
 *
 * Dedup: usa workspace_events para registrar que ya se envió
 * el resumen de esa semana (event = 'weekly_summary_sent', semana ISO).
 */
export async function startWeeklySummaryCron(db: Database): Promise<void> {
  const RESEND_KEY = process.env["RESEND_API_KEY"];
  const WEB_URL    = process.env["WEB_URL"] ?? "https://inboxchat-web.vercel.app";

  if (!RESEND_KEY) {
    console.info("[Weekly Cron] RESEND_API_KEY no configurada — resumen semanal deshabilitado.");
    return;
  }

  // ─── Detectar tabla csat_ratings ──────────────────────────────────────────
  let hasCsat = false;
  try {
    await db`SELECT id FROM csat_ratings LIMIT 0`;
    hasCsat = true;
  } catch {
    // csat_ratings no existe aún
  }

  // ─── Función principal ────────────────────────────────────────────────────
  async function runWeeklySummary() {
    // Solo lunes, entre 9:00 y 10:00 UTC
    const now = new Date();
    if (now.getUTCDay() !== 1 || now.getUTCHours() !== 9) return;

    // Semana ISO: YYYY-WNN para dedup
    const weekLabel = getIsoWeekLabel(now);

    try {
      const workspaces = await db<{ id: string; name: string; owner_email: string }[]>`
        SELECT id, name, owner_email FROM workspaces
        WHERE owner_email IS NOT NULL
      `;

      for (const ws of workspaces) {
        // Dedup: ya enviamos esta semana?
        const [already] = await db<{ total: number }[]>`
          SELECT COUNT(*)::int AS total FROM workspace_events
          WHERE workspace_id   = ${ws.id}
            AND event          = 'weekly_summary_sent'
            AND properties->>'week' = ${weekLabel}
        `;
        if (already && already.total > 0) continue;

        // ─── Stats de la última semana ────────────────────────────────────
        const weekStart = getLastMonday(now);
        const weekEnd   = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [stats] = await db<{
          total: number;
          resolved: number;
          avg_first_response_min: number | null;
        }[]>`
          SELECT
            COUNT(*)::int                                              AS total,
            COUNT(*) FILTER (WHERE status = 'closed')::int            AS resolved,
            AVG(
              EXTRACT(EPOCH FROM (first_reply.replied_at - c.created_at)) / 60
            )::numeric(10,1)                                          AS avg_first_response_min
          FROM conversations c
          LEFT JOIN LATERAL (
            SELECT created_at AS replied_at
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.sender = 'operator'
            ORDER BY m.created_at ASC
            LIMIT 1
          ) first_reply ON TRUE
          WHERE c.workspace_id = ${ws.id}
            AND c.created_at   >= ${weekStart}
            AND c.created_at   <  ${weekEnd}
        `;

        let csatAvg: number | null = null;
        if (hasCsat) {
          try {
            const [csatRow] = await db<{ avg: number | null }[]>`
              SELECT AVG(rating)::numeric(3,1) AS avg
              FROM csat_ratings cr
              JOIN conversations c ON c.id = cr.conversation_id
              WHERE c.workspace_id = ${ws.id}
                AND cr.created_at  >= ${weekStart}
                AND cr.created_at  <  ${weekEnd}
            `;
            csatAvg = csatRow?.avg ?? null;
          } catch { /* no csat */ }
        }

        // Solo enviar si hubo actividad
        if (!stats || stats.total === 0) {
          await markSent(db, ws.id, weekLabel);
          continue;
        }

        await sendWeeklySummaryEmail({
          to:            ws.owner_email,
          workspaceName: ws.name,
          weekLabel,
          total:         stats.total,
          resolved:      stats.resolved,
          avgFirstResponseMin: stats.avg_first_response_min ?? null,
          csatAvg,
          inboxUrl: `${WEB_URL}/inbox`,
        });

        await markSent(db, ws.id, weekLabel);
      }
    } catch (err) {
      console.error("[Weekly Cron] Error:", err);
    }
  }

  // Correr inmediatamente al arrancar (si es lunes 9am) y luego cada hora
  void runWeeklySummary();
  setInterval(() => void runWeeklySummary(), 60 * 60 * 1000);
  console.info("[Weekly Cron] Iniciado — check cada hora, envío lunes 9:00 UTC.");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLastMonday(d: Date): Date {
  const day = d.getUTCDay(); // 0=domingo, 1=lunes
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff - 7); // semana ANTERIOR
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function getIsoWeekLabel(d: Date): string {
  const monday = getLastMonday(d);
  const year   = monday.getUTCFullYear();
  const start  = new Date(Date.UTC(year, 0, 1));
  const week   = Math.ceil(((monday.getTime() - start.getTime()) / 86400000 + start.getUTCDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

async function markSent(db: Database, workspaceId: string, week: string): Promise<void> {
  try {
    await db`
      INSERT INTO workspace_events (workspace_id, event, properties)
      VALUES (${workspaceId}, 'weekly_summary_sent', ${JSON.stringify({ week })}::jsonb)
      ON CONFLICT DO NOTHING
    `;
  } catch { /* non-fatal */ }
}
