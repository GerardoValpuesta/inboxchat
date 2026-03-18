import { describe, it, expect } from "vitest";

/**
 * Tests para el rate limiter de mensajes de Socket.io.
 * Replica la lógica de handlers.ts sin dependencias externas.
 */

const MSG_LIMIT  = 10;
const MSG_WINDOW = 10_000; // 10 segundos

type Bucket = { count: number; resetAt: number };

function checkRateLimit(
  map: Map<string, Bucket>,
  socketId: string,
  now: number
): boolean {
  let bucket = map.get(socketId) ?? { count: 0, resetAt: now + MSG_WINDOW };
  if (now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + MSG_WINDOW };
  }
  bucket.count++;
  map.set(socketId, bucket);
  return bucket.count > MSG_LIMIT;
}

describe("Socket rate limiter (token bucket)", () => {
  it("permite exactamente 10 mensajes seguidos → false", () => {
    const map = new Map<string, Bucket>();
    const now = Date.now();
    for (let i = 0; i < MSG_LIMIT; i++) {
      expect(checkRateLimit(map, "s1", now), `mensaje ${i + 1}`).toBe(false);
    }
  });

  it("bloquea el mensaje #11 → true", () => {
    const map = new Map<string, Bucket>();
    const now = Date.now();
    for (let i = 0; i < MSG_LIMIT; i++) checkRateLimit(map, "s1", now);
    expect(checkRateLimit(map, "s1", now)).toBe(true);
  });

  it("reset después de la ventana de tiempo → false", () => {
    const map = new Map<string, Bucket>();
    const now = Date.now();
    for (let i = 0; i < MSG_LIMIT; i++) checkRateLimit(map, "s1", now);
    // Pasan 10s + 1ms
    const later = now + MSG_WINDOW + 1;
    expect(checkRateLimit(map, "s1", later)).toBe(false);
  });

  it("diferentes sockets no se afectan entre sí", () => {
    const map = new Map<string, Bucket>();
    const now = Date.now();
    // s1 agota su quota
    for (let i = 0; i < MSG_LIMIT; i++) checkRateLimit(map, "s1", now);
    expect(checkRateLimit(map, "s1", now)).toBe(true);
    // s2 empieza limpio
    expect(checkRateLimit(map, "s2", now)).toBe(false);
  });

  it("primer mensaje de socket nuevo siempre pasa → false", () => {
    const map = new Map<string, Bucket>();
    expect(checkRateLimit(map, "nuevo-socket", Date.now())).toBe(false);
  });
});
