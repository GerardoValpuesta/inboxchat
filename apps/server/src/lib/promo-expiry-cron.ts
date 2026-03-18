import type { Database } from "../db/client.js";
import { trackEvent } from "./events.js";

/**
 * Cron de expiración de códigos promo.
 *
 * Los códigos promo activan el plan 'pro' hasta una fecha determinada
 * (pro_until en promo_redemptions). Si la fecha venció y el workspace
 * no tiene una suscripción real de Stripe, se degrada a 'trial'.
 *
 * Frecuencia: cada hora (configurable). Seguro para ejecutar múltiples veces
 * porque la query solo afecta workspaces con plan 'pro' y promo vencida.
 */
export function startPromoExpiryCron(db: Database): void {
  const INTERVAL_MS = 60 * 60 * 1000; // cada 1 hora

  async function run(): Promise<void> {
    try {
      // Workspaces que tienen plan Pro activado por promo y cuya promo ya venció,
      // SIN suscripción real de Stripe (no queremos tocar subscribers legítimos)
      const expired = await db<{ id: string; name: string }[]>`
        SELECT DISTINCT w.id, w.name
        FROM workspaces w
        INNER JOIN promo_redemptions pr ON pr.workspace_id = w.id
        WHERE w.plan = 'pro'
          AND w.stripe_subscription_id IS NULL
          AND pr.pro_until < NOW()
      `;

      if (!expired.length) return;

      for (const ws of expired) {
        // Degradar a trial con 0 días restantes
        await db`
          UPDATE workspaces
          SET
            plan       = 'trial',
            trial_ends_at = NOW()
          WHERE id = ${ws.id}
            AND plan = 'pro'
            AND stripe_subscription_id IS NULL
        `;

        // Trackear la cancelación por expiración de promo
        void trackEvent(db, ws.id, "plan_canceled", {
          reason: "promo_expired",
        });

        console.info(`[promo-cron] Workspace '${ws.name}' (${ws.id}) degradado: promo expirada`);
      }

      if (expired.length > 0) {
        console.info(`[promo-cron] ${expired.length} workspace(s) degradados por promo expirada`);
      }
    } catch (err) {
      console.error("[promo-cron] Error en ciclo de expiración:", err);
    }
  }

  // Ejecutar inmediatamente al iniciar y luego cada hora
  void run();
  setInterval(() => void run(), INTERVAL_MS);

  console.info("[promo-cron] Cron de expiración de promos activo (cada 1h)");
}
