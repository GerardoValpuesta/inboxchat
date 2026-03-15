"use client";

import Link from "next/link";

/**
 * Banner de warning de trial — aparece en modo sticky encima del inbox.
 * Se muestra cuando:
 *   - trialDaysLeft <= 3 (urgencia amarilla → roja)
 *   - trialDaysLeft === null && !isActive (expirado)
 */
export function TrialBanner({
  trialDaysLeft,
  isActive,
}: {
  trialDaysLeft: number | null;
  isActive: boolean;
}) {
  // Plan Pro activo → no mostrar nada
  if (isActive) return null;
  // Trial con más de 3 días → no mostrar todavía
  if (trialDaysLeft !== null && trialDaysLeft > 3) return null;

  const expired = trialDaysLeft === null || trialDaysLeft <= 0;
  const urgent = !expired && trialDaysLeft !== null && trialDaysLeft <= 1;

  const bg = expired
    ? "bg-red-50 border-red-200 text-red-700"
    : urgent
      ? "bg-amber-50 border-amber-300 text-amber-800"
      : "bg-amber-50 border-amber-200 text-amber-700";

  const message = expired
    ? "Tu período de prueba expiró. El widget dejó de funcionar."
    : trialDaysLeft === 1
      ? "⚠️ Tu prueba vence mañana."
      : `Tu prueba vence en ${trialDaysLeft} días.`;

  return (
    <div className={`flex-shrink-0 border-b px-4 py-2 flex items-center justify-between gap-4 ${bg}`}>
      <span className="text-xs font-medium">{message}</span>
      <Link
        href="/settings/billing"
        className={`text-xs font-bold whitespace-nowrap px-3 py-1 rounded-lg transition-colors ${
          expired
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-amber-500 text-white hover:bg-amber-600"
        }`}
      >
        Activar Pro →
      </Link>
    </div>
  );
}
