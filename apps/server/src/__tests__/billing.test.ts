import { describe, it, expect } from "vitest";

/**
 * Tests de lógica de billing.
 * Valida las reglas de negocio de planes y trial sin tocar la DB ni Stripe.
 */

// ─── helpers replicados de billing.routes.ts ──────────────────────────────────

type WorkspaceBilling = {
  plan: string;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
};

function isActive(ws: WorkspaceBilling, now: Date = new Date()): boolean {
  if (ws.plan === "pro") {
    if (ws.stripe_subscription_status === "active" || ws.stripe_subscription_status === "trialing") return true;
    if (!ws.stripe_subscription_id) return true; // Pro activado manualmente o promo
    return false;
  }
  if (ws.plan === "trial") {
    if (!ws.trial_ends_at) return false;
    return new Date(ws.trial_ends_at) > now;
  }
  return false;
}

function trialDaysLeft(ws: WorkspaceBilling, now: Date = new Date()): number | null {
  if (ws.plan !== "trial" || !ws.trial_ends_at) return null;
  const diff = new Date(ws.trial_ends_at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function canCancelManually(ws: WorkspaceBilling): { ok: boolean; reason?: string } {
  if (ws.plan !== "pro") return { ok: false, reason: "No estás en plan Pro" };
  if (ws.stripe_subscription_id) return { ok: false, reason: "Usá el portal de Stripe para cancelar" };
  return { ok: true };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("billing — isActive()", () => {
  it("Pro con Stripe sub activa → true", () => {
    expect(isActive({
      plan: "pro",
      trial_ends_at: null,
      stripe_subscription_id: "sub_abc",
      stripe_subscription_status: "active",
    })).toBe(true);
  });

  it("Pro manual (sin stripe_subscription_id) → true", () => {
    expect(isActive({
      plan: "pro",
      trial_ends_at: null,
      stripe_subscription_id: null,
      stripe_subscription_status: null,
    })).toBe(true);
  });

  it("Pro con suscripción cancelada (Stripe) → false", () => {
    expect(isActive({
      plan: "pro",
      trial_ends_at: null,
      stripe_subscription_id: "sub_xyz",
      stripe_subscription_status: "canceled",
    })).toBe(false);
  });

  it("Trial con fecha futura → true", () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(isActive({
      plan: "trial",
      trial_ends_at: future,
      stripe_subscription_id: null,
      stripe_subscription_status: null,
    })).toBe(true);
  });

  it("Trial expirado → false", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isActive({
      plan: "trial",
      trial_ends_at: past,
      stripe_subscription_id: null,
      stripe_subscription_status: null,
    })).toBe(false);
  });

  it("Trial sin trial_ends_at → false", () => {
    expect(isActive({
      plan: "trial",
      trial_ends_at: null,
      stripe_subscription_id: null,
      stripe_subscription_status: null,
    })).toBe(false);
  });
});

describe("billing — trialDaysLeft()", () => {
  it("retorna null si no es plan trial", () => {
    expect(trialDaysLeft({ plan: "pro", trial_ends_at: null, stripe_subscription_id: null, stripe_subscription_status: null })).toBeNull();
  });

  it("retorna 14 para un trial nuevo (2 semanas)", () => {
    const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(trialDaysLeft({ plan: "trial", trial_ends_at: future, stripe_subscription_id: null, stripe_subscription_status: null })).toBe(14);
  });

  it("retorna 0 para trial expirado (no negativo)", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(trialDaysLeft({ plan: "trial", trial_ends_at: past, stripe_subscription_id: null, stripe_subscription_status: null })).toBe(0);
  });
});

describe("billing — canCancelManually()", () => {
  it("Pro manual → ok: true", () => {
    expect(canCancelManually({
      plan: "pro", trial_ends_at: null,
      stripe_subscription_id: null, stripe_subscription_status: null,
    })).toEqual({ ok: true });
  });

  it("Pro con Stripe sub → ok: false (usar portal)", () => {
    const result = canCancelManually({
      plan: "pro", trial_ends_at: null,
      stripe_subscription_id: "sub_abc", stripe_subscription_status: "active",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("portal");
  });

  it("Trial → ok: false (no está en Pro)", () => {
    const result = canCancelManually({
      plan: "trial", trial_ends_at: "2026-04-01",
      stripe_subscription_id: null, stripe_subscription_status: null,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Pro");
  });
});
