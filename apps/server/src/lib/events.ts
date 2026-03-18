import type { Database } from "../db/client.js";

/**
 * Tipos de eventos de activación.
 * Documentan el ciclo de vida de un workspace desde el signup hasta la conversión.
 */
export type WorkspaceEventName =
  | "widget_installed"        // Primera conversación desde el widget
  | "first_message_received"  // Primer mensaje de un visitante
  | "first_operator_reply"    // Primer reply enviado por un operador
  | "conversation_resolved"   // Conversación cerrada
  | "plan_upgraded"           // Pago exitoso de Stripe
  | "plan_canceled"           // Suscripción cancelada
  | "promo_redeemed"          // Código promo canjeado
  | "csat_submitted";         // Rating de satisfacción del cliente

export type WorkspaceEventProperties = Record<string, string | number | boolean | null>;

/**
 * Trackea un evento de activación de forma fire-and-forget.
 * No bloquea el flujo principal — errores se loguean pero no se propagan.
 *
 * @param db        Instancia de la DB
 * @param workspaceId UUID del workspace
 * @param event     Nombre del evento (use WorkspaceEventName)
 * @param properties Datos adicionales opcionales (se almacenan en JSON)
 */
export async function trackEvent(
  db: Database,
  workspaceId: string,
  event: WorkspaceEventName,
  properties?: WorkspaceEventProperties
): Promise<void> {
  try {
    await db`
      INSERT INTO workspace_events (workspace_id, event, properties)
      VALUES (${workspaceId}, ${event}, ${properties ? JSON.stringify(properties) : null}::jsonb)
    `;
  } catch (err) {
    // Log pero no propagar — el tracking nunca debe romper el flujo principal
    console.error(`[events] Error tracking ${event} for ${workspaceId}:`, err);
  }
}

/**
 * Trackea un evento solo si es la PRIMERA VEZ que ocurre para el workspace.
 * Útil para hitos de activación únicos (first_message_received, widget_installed, etc.).
 * Performance: usa INSERT ... ON CONFLICT DO NOTHING con constraint único implícito.
 */
export async function trackFirstEvent(
  db: Database,
  workspaceId: string,
  event: WorkspaceEventName,
  properties?: WorkspaceEventProperties
): Promise<boolean> {
  try {
    const [exists] = await db<{ id: string }[]>`
      SELECT id FROM workspace_events
      WHERE workspace_id = ${workspaceId}
        AND event = ${event}
      LIMIT 1
    `;
    if (exists) return false; // Ya ocurrió antes

    await trackEvent(db, workspaceId, event, properties);
    return true;
  } catch (err) {
    console.error(`[events] Error tracking first ${event} for ${workspaceId}:`, err);
    return false;
  }
}
