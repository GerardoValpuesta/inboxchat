import type { Database } from "../db/client.js";
import { sendSlaAlert } from "../lib/email.js";

/**
 * SLA Cron Job
 *
 * Se ejecuta cada 2 minutos. Busca conversaciones abiertas donde:
 * - El último mensaje es de un visitante (contact)
 * - La espera supera el sla_minutes del workspace
 * - No se ha enviado alerta SLA en las últimas 2h (dedup)
 *
 * Envía un email a todos los operadores del workspace.
 */
export async function startSlaCron(db: Database): Promise<void> {
  const WEB_URL = process.env["WEB_URL"] ?? "https://app.inboxchat.app";
  const RESEND_KEY = process.env["RESEND_API_KEY"];

  if (!RESEND_KEY) {
    console.info("[SLA Cron] RESEND_API_KEY no configurada — alertas por email deshabilitadas.");
    return;
  }

  // Verificar que la columna sla_alert_sent_at existe (requiere migración 014).
  // Si no existe, logear una sola vez y salir en vez de romperse cada 2 minutos.
  try {
    await db`SELECT sla_alert_sent_at FROM conversations LIMIT 0`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("sla_alert_sent_at") || msg.includes("column") || msg.includes("UNDEFINED_VALUE")) {
      console.warn(
        "[SLA Cron] Columna sla_alert_sent_at no encontrada. " +
        "Corrí la migración 014_sla_alert.sql en Supabase SQL Editor para activar las alertas SLA."
      );
      return;
    }
  }

  async function checkSla() {
    try {
      // Conversaciones abiertas donde el último mensaje es del visitante
      // y la espera supera el sla_minutes del workspace.
      // sla_alert_sent_at: columna opcional para dedup (puede ser null)
      const unattended = await db<{
        conv_id: string;
        workspace_id: string;
        workspace_name: string;
        sla_minutes: number;
        contact_name: string | null;
        contact_email: string | null;
        last_visitor_msg_at: string;
        waiting_minutes: number;
        sla_alert_sent_at: string | null;
      }[]>`
        SELECT
          c.id AS conv_id,
          w.id AS workspace_id,
          w.name AS workspace_name,
          COALESCE(w.sla_minutes, 10) AS sla_minutes,
          co.name AS contact_name,
          co.email AS contact_email,
          last_msg.created_at AS last_visitor_msg_at,
          EXTRACT(EPOCH FROM (NOW() - last_msg.created_at)) / 60 AS waiting_minutes,
          c.sla_alert_sent_at
        FROM conversations c
        JOIN workspaces w ON w.id = c.workspace_id
        JOIN contacts co ON co.id = c.contact_id
        JOIN LATERAL (
          SELECT created_at FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender = 'contact'
          ORDER BY created_at DESC
          LIMIT 1
        ) last_msg ON TRUE
        LEFT JOIN LATERAL (
          SELECT 1 FROM messages m2
          WHERE m2.conversation_id = c.id
            AND m2.sender IN ('operator', 'note')
            AND m2.created_at > last_msg.created_at
          LIMIT 1
        ) replied ON TRUE
        WHERE c.status = 'open'
          AND replied IS NULL
          AND EXTRACT(EPOCH FROM (NOW() - last_msg.created_at)) / 60 > COALESCE(w.sla_minutes, 10)
          AND (
            c.sla_alert_sent_at IS NULL
            OR c.sla_alert_sent_at < NOW() - INTERVAL '2 hours'
          )
        LIMIT 50
      `;

      for (const conv of unattended) {
        // Operadores del workspace para notificar
        const operators = await db<{ email: string }[]>`
          SELECT o.email FROM operators o
          WHERE o.workspace_id = ${conv.workspace_id}
            AND o.email IS NOT NULL
          LIMIT 10
        `;

        if (!operators.length) continue;

        const waitingMins = Math.round(Number(conv.waiting_minutes));
        const inboxUrl = `${WEB_URL}/inbox`;
        const visitorName = conv.contact_name ?? conv.contact_email ?? undefined;

        // Manda un email a cada operador del workspace
        await Promise.allSettled(
          operators.map((op) =>
            sendSlaAlert({
              to: op.email,
              workspaceName: conv.workspace_name,
              ...(visitorName ? { visitorName } : {}),
              conversationId: conv.conv_id,
              waitingMinutes: waitingMins,
              slaMinutes: conv.sla_minutes,
              inboxUrl,
            })
          )
        );

        // Marcar alerta enviada para dedup
        await db`
          UPDATE conversations
          SET sla_alert_sent_at = NOW()
          WHERE id = ${conv.conv_id}
        `;

        console.info(
          `[SLA Cron] Alerta enviada para conv ${conv.conv_id} (${waitingMins}min sin respuesta, SLA=${conv.sla_minutes}min)`
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
