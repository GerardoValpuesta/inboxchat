import { describe, it, expect } from "vitest";

/**
 * Tests para la lógica de business hours.
 * La función se extrae aquí para testearla sin dependencias externas.
 */
function isWithinBusinessHours(
  bh: {
    enabled: boolean;
    days: Record<string, { enabled: boolean; open: string; close: string } | undefined>;
  } | null | undefined,
  timezone: string,
  now: Date = new Date()
): boolean {
  if (!bh?.enabled) return true;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const dayMap: Record<string, string> = {
    Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu",
    Fri: "fri", Sat: "sat", Sun: "sun",
  };

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour    = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute  = parts.find((p) => p.type === "minute")?.value ?? "00";
  const dayKey  = dayMap[weekday];
  const nowTime = `${hour}:${minute}`;
  const day = bh.days[dayKey ?? ""];

  if (!day?.enabled) return false;
  return nowTime >= day.open && nowTime < day.close;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BH = {
  enabled: true,
  days: {
    mon: { enabled: true, open: "09:00", close: "18:00" },
    tue: { enabled: true, open: "09:00", close: "18:00" },
    wed: { enabled: true, open: "09:00", close: "18:00" },
    thu: { enabled: true, open: "09:00", close: "18:00" },
    fri: { enabled: true, open: "09:00", close: "14:00" },
    sat: { enabled: false, open: "09:00", close: "13:00" },
    sun: { enabled: false, open: "09:00", close: "13:00" },
  },
};

const TZ = "America/Mexico_City"; // UTC-6

describe("isWithinBusinessHours", () => {
  // Lunes 16-Mar-2026 10:00 Mexico City = 16:00 UTC
  const monday_10am  = new Date("2026-03-16T16:00:00Z");
  // Lunes 16-Mar-2026 20:00 Mexico City = 02:00 UTC Day+1
  const monday_8pm   = new Date("2026-03-17T02:00:00Z");
  // Sábado 21-Mar-2026 09:00 Mexico City = 15:00 UTC
  const saturday_9am = new Date("2026-03-21T15:00:00Z");
  // Viernes 20-Mar-2026 14:30 Mexico City = 20:30 UTC (después de cierre 14:00)
  const friday_2_30pm = new Date("2026-03-20T20:30:00Z");

  it("dentro del horario (lunes 10am) → true", () => {
    expect(isWithinBusinessHours(BH, TZ, monday_10am)).toBe(true);
  });

  it("fuera del horario (lunes 8pm) → false", () => {
    expect(isWithinBusinessHours(BH, TZ, monday_8pm)).toBe(false);
  });

  it("sábado deshabilitado → false", () => {
    expect(isWithinBusinessHours(BH, TZ, saturday_9am)).toBe(false);
  });

  it("viernes pasado el cierre (14:30, cierra a 14:00) → false", () => {
    expect(isWithinBusinessHours(BH, TZ, friday_2_30pm)).toBe(false);
  });

  it("config null → siempre true (no hay restricción)", () => {
    expect(isWithinBusinessHours(null, TZ, monday_8pm)).toBe(true);
  });

  it("enabled: false → siempre true (sin harness horario)", () => {
    expect(isWithinBusinessHours({ enabled: false, days: {} }, TZ, monday_8pm)).toBe(true);
  });

  it("día sin configuración (days vacío, enabled true) → false", () => {
    expect(isWithinBusinessHours({ enabled: true, days: {} }, TZ, monday_10am)).toBe(false);
  });
});
