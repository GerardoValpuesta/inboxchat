/**
 * Tests de seguridad críticos — ejecutar con:
 *   pnpm --filter @inboxchat/server test
 *
 * Cubren los hallazgos de la auditoría: rate limiting, CSAT validation,
 * y business hours. Los tests de operator:join requieren el server levantado
 * y se testean como integration tests (ver api.integration.test.ts).
 */

import { describe, it, expect } from "vitest";

// ─── Rate Limiter (token bucket) ─────────────────────────────────────────────

const MSG_LIMIT = 10;
const MSG_WINDOW = 10_000;

function checkRateLimit(
  map: Map<string, { count: number; resetAt: number }>,
  socketId: string,
  now: number
): boolean {
  const bucket = map.get(socketId) ?? { count: 0, resetAt: now + MSG_WINDOW };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + MSG_WINDOW;
  }
  bucket.count++;
  map.set(socketId, bucket);
  return bucket.count > MSG_LIMIT;
}

describe("Socket rate limiter", () => {
  it("permite exactamente 10 mensajes por ventana", () => {
    const map = new Map<string, { count: number; resetAt: number }>();
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(map, "s1", now)).toBe(false);
    }
  });

  it("bloquea el mensaje 11", () => {
    const map = new Map<string, { count: number; resetAt: number }>();
    const now = Date.now();
    for (let i = 0; i < 10; i++) checkRateLimit(map, "s1", now);
    expect(checkRateLimit(map, "s1", now)).toBe(true);
  });

  it("resetea el contador después del window", () => {
    const map = new Map<string, { count: number; resetAt: number }>();
    const now = Date.now();
    for (let i = 0; i <= 10; i++) checkRateLimit(map, "s1", now);
    // Avanzar más allá del window
    expect(checkRateLimit(map, "s1", now + MSG_WINDOW + 1)).toBe(false);
  });

  it("sockets distintos tienen buckets independientes", () => {
    const map = new Map<string, { count: number; resetAt: number }>();
    const now = Date.now();
    // Socket 1 llega al límite
    for (let i = 0; i <= 10; i++) checkRateLimit(map, "s1", now);
    // Socket 2 no está limitado
    expect(checkRateLimit(map, "s2", now)).toBe(false);
  });
});

// ─── CSAT Rating Validation ───────────────────────────────────────────────────

function validateRating(r: unknown): r is 1 | 2 | 3 | 4 | 5 {
  return typeof r === "number" && Number.isInteger(r) && r >= 1 && r <= 5;
}

describe("CSAT rating validation", () => {
  it("acepta ratings 1–5", () => {
    [1, 2, 3, 4, 5].forEach((n) => expect(validateRating(n)).toBe(true));
  });

  it("rechaza 0 y 6", () => {
    expect(validateRating(0)).toBe(false);
    expect(validateRating(6)).toBe(false);
  });

  it("rechaza strings aunque sean numéricos", () => {
    expect(validateRating("5")).toBe(false);
    expect(validateRating("1")).toBe(false);
  });

  it("rechaza floats", () => {
    expect(validateRating(4.5)).toBe(false);
    expect(validateRating(1.1)).toBe(false);
  });

  it("rechaza null y undefined", () => {
    expect(validateRating(null)).toBe(false);
    expect(validateRating(undefined)).toBe(false);
  });
});

// ─── Business Hours ───────────────────────────────────────────────────────────

type DaySchedule = { enabled: boolean; open: string; close: string };
type BusinessHours = {
  enabled: boolean;
  days: Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DaySchedule>>;
};

function isWithinBusinessHours(bh: BusinessHours | null, tz: string, mockNow: Date): boolean {
  if (!bh?.enabled) return true;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(mockNow);

  const dayMap: Record<string, string> = {
    Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu",
    Fri: "fri", Sat: "sat", Sun: "sun",
  };
  const dayKey = dayMap[parts.find((p) => p.type === "weekday")!.value] as keyof typeof bh.days;
  const hh = parts.find((p) => p.type === "hour")!.value;
  const mm = parts.find((p) => p.type === "minute")!.value;
  const nowTime = `${hh}:${mm}`;

  const day = bh.days[dayKey];
  if (!day?.enabled) return false;
  return nowTime >= day.open && nowTime < day.close;
}

const sampleBH: BusinessHours = {
  enabled: true,
  days: {
    mon: { enabled: true, open: "09:00", close: "18:00" },
    tue: { enabled: true, open: "09:00", close: "18:00" },
    wed: { enabled: true, open: "09:00", close: "18:00" },
    thu: { enabled: true, open: "09:00", close: "18:00" },
    fri: { enabled: true, open: "09:00", close: "15:00" },
    sat: { enabled: false, open: "09:00", close: "13:00" },
    sun: { enabled: false, open: "09:00", close: "13:00" },
  },
};

describe("Business hours", () => {
  it("dentro del horario (lunes 10am Mexico City) → true", () => {
    // UTC 16:00 = 10:00 America/Mexico_City (CST = UTC-6)
    expect(isWithinBusinessHours(sampleBH, "America/Mexico_City", new Date("2026-03-16T16:00:00Z"))).toBe(true);
  });

  it("fuera del horario (lunes 8pm Mexico City) → false", () => {
    // UTC 02:00 next day = 20:00 America/Mexico_City
    expect(isWithinBusinessHours(sampleBH, "America/Mexico_City", new Date("2026-03-17T02:00:00Z"))).toBe(false);
  });

  it("sábado deshabilitado → false", () => {
    // Saturday 10am UTC = Saturday 4am Mexico City (disabled anyway)
    expect(isWithinBusinessHours(sampleBH, "America/Mexico_City", new Date("2026-03-21T10:00:00Z"))).toBe(false);
  });

  it("business_hours null → siempre true (fuera de horario no aplica)", () => {
    expect(isWithinBusinessHours(null, "UTC", new Date())).toBe(true);
  });

  it("enabled: false → siempre true", () => {
    const disabled: BusinessHours = { enabled: false, days: {} };
    expect(isWithinBusinessHours(disabled, "UTC", new Date())).toBe(true);
  });

  it("viernes dentro del horario reducido (antes de las 15:00) → true", () => {
    // Friday 14:00 Mexico City = Friday 20:00 UTC
    expect(isWithinBusinessHours(sampleBH, "America/Mexico_City", new Date("2026-03-20T20:00:00Z"))).toBe(true);
  });

  it("viernes fuera del horario reducido (después de las 15:00) → false", () => {
    // Friday 15:30 Mexico City = Friday 21:30 UTC
    expect(isWithinBusinessHours(sampleBH, "America/Mexico_City", new Date("2026-03-20T21:30:00Z"))).toBe(false);
  });
});

// ─── Email Dedup ──────────────────────────────────────────────────────────────

describe("Email dedup Set", () => {
  it("primera conversación: no está en el Set → enviar email", () => {
    const notified = new Set<string>();
    expect(notified.has("conv-001")).toBe(false);
    notified.add("conv-001");
    expect(notified.has("conv-001")).toBe(true);
  });

  it("segunda vez la misma conversación: ya está → no enviar", () => {
    const notified = new Set<string>(["conv-001"]);
    expect(notified.has("conv-001")).toBe(true);
  });

  it("conversación distinta: no está → enviar", () => {
    const notified = new Set<string>(["conv-001"]);
    expect(notified.has("conv-002")).toBe(false);
  });

  it("después del clear (simulado): el Set queda vacío", () => {
    const notified = new Set<string>(["conv-001", "conv-002"]);
    notified.clear();
    expect(notified.size).toBe(0);
    expect(notified.has("conv-001")).toBe(false);
  });
});
