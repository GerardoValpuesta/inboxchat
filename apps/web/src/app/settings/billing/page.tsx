"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
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

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const success = searchParams?.get("success") === "1";
  const canceled = searchParams?.get("canceled") === "1";

  useEffect(() => {
    fetch(`${SERVER_URL}/api/billing/status`, {
      headers: getAuthHeaders() as HeadersInit,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: BillingStatus) => setStatus(data))
      .catch(() => router.push("/login"))
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
    try {
      const res = await fetch(`${SERVER_URL}/api/billing/portal`, {
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Cargando...</div>
      </div>
    );
  }

  const isPro = status?.plan === "pro" && status?.isActive;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/inbox")}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            ← Volver al inbox
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestioná tu suscripción a InboxChat Pro
          </p>
        </div>

        {/* Alerta success/canceled */}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
            ✅ ¡Pago exitoso! Tu workspace está en modo Pro.
          </div>
        )}
        {canceled && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            Cancelaste el proceso de pago. Podés intentarlo de nuevo cuando quieras.
          </div>
        )}

        {/* Plan card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
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
                isPro
                  ? "bg-white/20 text-white"
                  : "bg-amber-400/20 text-amber-200"
              }`}>
                {isPro ? "Activo" : "Trial"}
              </div>
            </div>
            {isPro && (
              <p className="text-white/80 text-sm mt-2">$15 / mes • Renovación automática</p>
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

          {/* Action */}
          <div className="p-6">
            {isPro ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Gestioná tu suscripción, cambiá el método de pago o cancelá desde el portal de Stripe.
                </p>
                <button
                  onClick={() => void handlePortal()}
                  disabled={actionLoading}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "Redirigiendo..." : "Gestionar suscripción →"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Features Pro */}
                <ul className="space-y-2">
                  {[
                    "Conversaciones ilimitadas",
                    "Sin límite de tiempo",
                    "Soporte prioritario",
                    "Actualizaciones incluidas",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="text-emerald-500 font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => void handleUpgrade()}
                  disabled={actionLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-violet-200 disabled:opacity-50"
                >
                  {actionLoading
                    ? "Redirigiendo a Stripe..."
                    : "Upgrade a Pro — $15/mes →"}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Pagos procesados de forma segura por{" "}
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            Stripe
          </a>
          . Cancelá en cualquier momento.
        </p>
      </div>
    </div>
  );
}
