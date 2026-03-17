import type { Database } from "../db/client.js";
import { sendSlaAlert } from "../lib/email.js";

/**
 * SLA Cron Job — 100% resiliente ante columnas opcionales
 *
 * Detecta en runtime si sla_minutes (migración 012) y sla_alert_sent_at (014)
 * existen en el schema. Ajusta la query y el comportamiento en consecuencia.
 * Nunca rompe por migraciones no aplicadas.
 */
export async function startSlaCron(db: Database): Promise<void> {
  const WEB_URL = process.env["WEB_URL"] ?? "https://app.inboxchat.app";
  const RESEND_KEY = process.env["RESEND_API_KEY"];

  if (!RESEND_KEY) {
    console.info("[SLA Cron] RESEND_API_KEY no configurada — alertas por email deshabilitadas.");
    return;
  }

  // ─── Detectar columnas opcionales ──────────────────────────────────────────
  let hasSlaMinutes = false;
  let hasSlaAlertSentAt = false;

  try {
    await db`SELECT sla_minutes FROM workspaces LIMIT 0`;
    hasSlaMinutes = true;
  } catch {
    console.warn("[SLA Cron] workspaces.sla_minutes no existe — usando 10 min como default. Corrí migración 012.");
  }

  try {
    await db`SELECT sla_alert_sent_at FROM conversations LIMIT 0`;
    hasSlaAlertSentAt = true;
  } catch {
    console.warn("[SLA Cron] conversations.sla_alert_sent_at no existe — dedup deshabilitado. Corrí migración 014.");
  }

  // ─── Check principal ────────────────────────────────────────────────────────
  async function checkSla() {
    try {
      const unattended = await db<{
        conv_id: string;
        workspace_id: string;
        workspace_name: string | null;
        sla_minutes: number;
        contact_name: string | null;
        contact_email: string | null;
        waiting_minutes: number;
      }[]>`
        SELECT
          c.id                                                       AS conv_id,
          w.id                                                       AS workspace_id,
          w.name                                                     AS workspace_name,
          ${hasSlaMinutes ? db`COALESCE(w.sla_minutes, 10)` : db`10`} AS sla_minutes,
          co.name                                                    AS contact_name,
          co.email                                                   AS contact_email,
          EXTRACT(EPOCH FROM (NOW() - last_msg.created_at)) / 60    AS waiting_minutes
        FROM conversations c
        JOIN workspaces w  ON w.id = c.workspace_id
        JOIN contacts   co ON co.id = c.contact_id
        JOIN LATERAL (
          SELECT created_at FROM messages m
          WHERE  m.conversation_id = c.id
            AND  m.sender = 'contact'
          ORDER BY created_at DESC
          LIMIT 1
        ) last_msg ON TRUE
        LEFT JOIN LATERAL (
          SELECT 1 FROM messages m2
          WHERE  m2.conversation_id = c.id
            AND  m2.sender IN ('operator', 'note')
            AND  m2.created_at > last_msg.created_at
          LIMIT 1
        ) replied ON TRUE
        WHERE c.status = 'open'
          AND replied IS NULL
          AND EXTRACT(EPOCH FROM (NOW() - last_msg.created_at)) / 60
              > ${hasSlaMinutes ? db`COALESCE(w.sla_minutes, 10)` : db`10`}
          ${hasSlaAlertSentAt
            ? db`AND (c.sla_alert_sent_at IS NULL OR c.sla_alert_sent_at < NOW() - INTERVAL '2 hours')`
            : db``}
        LIMIT 50
      `;

      for (const conv of unattended) {
        // Guard definitivo: si por algún motivo el campo es undefined, saltar
        if (!conv.conv_id || !conv.workspace_id) continue;

        const operators = await db<{ email: string | null }[]>`
          SELECT o.email FROM operators o
          WHERE  o.workspace_id = ${conv.workspace_id}
            AND  o.email IS NOT NULL
          LIMIT 10
        `;

        if (!operators.length) continue;

        const waitingMins = Math.round(Number(conv.waiting_minutes) || 0);
        const slaMinutes  = Number(conv.sla_minutes) || 10;
        const inboxUrl    = `${WEB_URL}/inbox`;
        const visitorName = conv.contact_name ?? conv.contact_email ?? undefined;

        await Promise.allSettled(
          operators
            .filter((op) => typeof op.email === "string" && op.email.length > 0)
            .map((op) =>
              sendSlaAlert({
                to: op.email as string,
                workspaceName: conv.workspace_name ?? "InboxChat",
                ...(visitorName ? { visitorName } : {}),
                conversationId: conv.conv_id,
                waitingMinutes: waitingMins,
                slaMinutes,
                inboxUrl,
              })
            )
        );

        // Marcar alerta enviada para dedup (solo si la columna existe)
        if (hasSlaAlertSentAt) {
          await db`
            UPDATE conversations
            SET    sla_alert_sent_at = NOW()
            WHERE  id = ${conv.conv_id}
          `;
        }

        console.info(
          `[SLA Cron] Alerta enviada conv ${conv.conv_id} (${waitingMins}min sin respuesta, SLA=${slaMinutes}min)`
        );
      }
    } catch (err) {
      console.error("[SLA Cron] Error:", err);
    }
  }

  // Primera ejecución a los 30s del arranque, luego cada 2 minutos
  setTimeout(() => {
    void checkSla();
    setInterval(() => void checkSla(), 2 * 60 * 1000);
  }, 30_000);

  console.info("[SLA Cron] Iniciado — check cada 2 minutos.");
}
