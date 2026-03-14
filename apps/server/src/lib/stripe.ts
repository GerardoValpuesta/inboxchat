import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Retorna la instancia de Stripe. Lazy init para que el servidor pueda arrancar
 * sin STRIPE_SECRET_KEY en desarrollo local sin funcionalidad de billing.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada");
  _stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  return _stripe;
}
