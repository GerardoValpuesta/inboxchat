"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ExternalLink, Loader2, Gift, XCircle } from "lucide-react";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token
    ? { Authorization: `Bearer ${token}` }
    : { "X-Workspace-Key": "dev_key_inboxchat_local" };
}

interface BillingStatus {
  plan: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  conversationCount: number;
  stripeSubscriptionStatus: string | null;
  isActive: boolean;
}

export default function BillingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [portalError, setPortalError] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState("");
  const [promoError, setPromoError] = useState("");
  const [activePromo, setActivePromo] = useState<{ code: string; proUntil: string } | null>(null);

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const success = searchParams?.get("success") === "1";
  const canceled = searchParams?.get("canceled") === "1";

  useEffect(() => {
    Promise.all([
      fetch(`${SERVER_URL}/api/billing/status`, { headers: getAuthHeaders() as HeadersInit }),
      fetch(`${SERVER_URL}/api/promo/status`, { headers: getAuthHeaders() as HeadersInit }),
    ])
      .then(async ([billingRes, promoRes]) => {
        if (!billingRes.ok) throw new Error("billing");
        const data = await billingRes.json() as BillingStatus;
        setStatus(data);
        if (promoRes.ok) {
          const promoData = await promoRes.json() as { hasPromo: boolean; code: string; proUntil: string; isActive: boolean };
          if (promoData.isActive) setActivePromo({ code: promoData.code, proUntil: promoData.proUntil });
        }
      })
      .catch(() => router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleUpgrade() {
    setActionLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/billing/checkout`, {
        method: "POST",
        headers: getAuthHeaders() as HeadersInit,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePortal() {
    setActionLoading(true);
    setPortalError(false);
    try {
      const res = await fetch(`${SERVER_URL}/api/billing/portal`, {
        method: "POST",
        headers: getAuthHeaders() as HeadersInit,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(true);
      }
    } catch {
      setPortalError(true);
    } finally {
      setActionLoading(false);
    }
  }

  async function redeemPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError(""); setPromoSuccess("");
    try {
      const res = await fetch(`${SERVER_URL}/api/promo/redeem`, {
        method: "POST",
        headers: { ...(getAuthHeaders() as HeadersInit), "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string; proUntil?: string };
      if (res.ok && data.ok) {
        setPromoSuccess(data.message ?? "¡Código canjeado!");
        setPromoCode("");
        if (data.proUntil) setActivePromo({ code: promoCode.trim().toUpperCase(), proUntil: data.proUntil });
        const br = await fetch(`${SERVER_URL}/api/billing/status`, { headers: getAuthHeaders() as HeadersInit });
        if (br.ok) setStatus(await br.json() as BillingStatus);
      } else {
        setPromoError(data.error ?? "Error al canjear el código");
      }
    } catch {
      setPromoError("Error de red. Intentá de nuevo.");
    } finally {
      setPromoLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  const isPro = status?.plan === "pro" && status?.isActive;
  // Solo mostrar cancelar si hay una suscripción activa en Stripe
  const hasStripeSubscription = Boolean(status?.stripeSubscriptionStatus);

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/inbox")}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4 transition-colors"
        >
          ← Volver al inbox
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestioná tu suscripción a InboxChat Pro
        </p>
      </div>

      {/* Alertas */}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ¡Pago exitoso! Tu workspace está en modo Pro.
        </div>
      )}
      {canceled && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          Cancelaste el proceso de pago. Podés intentarlo cuando quieras.
        </div>
      )}

      {/* Plan card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        {/* Plan header */}
        <div className={`p-6 ${isPro ? "bg-gradient-to-r from-violet-600 to-indigo-600" : "bg-slate-800"}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
                Plan actual
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">
                {isPro ? "InboxChat Pro" : "Free Trial"}
              </h2>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isPro ? "bg-white/20 text-white" : "bg-amber-400/20 text-amber-200"
            }`}>
              {isPro ? "Activo" : "Trial"}
            </div>
          </div>
          {isPro && (
            <p className="text-white/80 text-sm mt-2">$29 / mes · Renovación automática</p>
          )}
        </div>

        {/* Stats */}
        <div className="p-6 grid grid-cols-2 gap-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Conversaciones</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {status?.conversationCount ?? 0}
            </p>
          </div>
          {!isPro && status?.trialDaysLeft !== null && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Días restantes</p>
              <p className={`text-2xl font-bold mt-1 ${
                (status?.trialDaysLeft ?? 0) < 3 ? "text-red-600" : "text-slate-900"
              }`}>
                {status?.trialDaysLeft ?? "∞"}
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="p-6 space-y-3">
          {isPro ? (
            <>
              <p className="text-sm text-slate-600">
                Gestioná tu suscripción, cambiá el método de pago o cancelá desde el portal de Stripe.
              </p>
              <button
                onClick={() => void handlePortal()}
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo...</>
                ) : (
                  <><ExternalLink className="w-4 h-4" /> Gestionar suscripción en Stripe</>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <ul className="space-y-2">
                {[
                  "Conversaciones ilimitadas",
                  "5 operadores incluidos",
                  "AI Auto-Reply con Gemini Flash",
                  "SLA alerts + CSAT analytics",
                  "API REST + Webhooks",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => void handleUpgrade()}
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-violet-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a Stripe...</>
                ) : (
                  "Upgrade a Pro — $29/mes"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sección código de acceso */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-violet-500" />
          <p className="text-sm font-semibold text-slate-800">Código de acceso</p>
        </div>
        {activePromo ? (
          <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-sm text-violet-700">
            <span className="font-semibold">Código activo: {activePromo.code}</span>
            <span className="text-violet-500 ml-2">
              · Vence {new Date(activePromo.proUntil).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); setPromoSuccess(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") void redeemPromo(); }}
                placeholder="CODIGO123"
                className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono uppercase"
              />
              <button
                onClick={() => void redeemPromo()}
                disabled={promoLoading || !promoCode.trim()}
                className="text-sm px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors font-medium"
              >
                {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Canjear"}
              </button>
            </div>
            {promoSuccess && <p className="text-xs text-emerald-600 mt-2 font-medium">{promoSuccess}</p>}
            {promoError && <p className="text-xs text-red-500 mt-2">{promoError}</p>}
          </>
        )}
      </div>

      {/* Sección cancelar */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
        <p className="text-sm font-medium text-slate-700">¿Querés cancelar o gestionar tu suscripción?</p>
        <p className="text-xs text-slate-500">
          {hasStripeSubscription
            ? "Podés cancelar en cualquier momento desde el portal de Stripe. Tu acceso Pro se mantiene hasta el fin del período pagado."
            : isPro
            ? "Tu plan Pro fue activado manualmente. Para cancelar o gestionar tu plan, contactános en hola@inboxchat.app."
            : "Estás en el período de prueba gratuita. No hay nada que cancelar — simplemente no hagas el upgrade cuando termine el trial."}
        </p>
        {hasStripeSubscription && (
          <>
            {portalError && (
              <p className="text-xs text-red-500">No se pudo abrir el portal. Escribínos a hola@inboxchat.app si el problema persiste.</p>
            )}
            <button
              onClick={() => void handlePortal()}
              disabled={actionLoading}
              className="text-xs text-red-500 hover:text-red-700 underline transition-colors disabled:opacity-50"
            >
              Cancelar suscripción →
            </button>
          </>
        )}
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        Pagos procesados de forma segura por{" "}
        <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
          Stripe
        </a>
        . Cancelá en cualquier momento.
      </p>
    </div>
  );
}
