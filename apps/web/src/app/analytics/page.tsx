"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token
    ? { Authorization: `Bearer ${token}` }
    : { "X-Workspace-Key": "dev_key_inboxchat_local" };
}

interface Analytics {
  totals: { open: number; closed: number; total: number };
  byDay: { day: string; count: number }[];
  messages: { operator: number; contact: number };
  avgResponseMinutes: number | null;
}

function MiniBarChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-20 mt-2">
      {data.map((d) => {
        const height = Math.max((d.count / max) * 100, 4);
        const label = new Date(d.day).toLocaleDateString("es", { weekday: "short", day: "numeric" });
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-sm bg-violet-500 transition-all group-hover:bg-violet-600"
              style={{ height: `${height}%` }}
            />
            <span className="text-xs text-slate-400 hidden group-hover:block absolute -bottom-5 whitespace-nowrap">
              {label}: {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/analytics`, { headers: getAuthHeaders() })
      .then((r) => {
        if (!r.ok) { router.push("/login"); return null; }
        return r.json() as Promise<Analytics>;
      })
      .then((data) => { if (data) setAnalytics(data); })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Cargando analytics...</div>
      </div>
    );
  }

  const totalMessages = (analytics?.messages.operator ?? 0) + (analytics?.messages.contact ?? 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/inbox")}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3"
            >
              ← Volver al inbox
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="text-slate-500 text-sm mt-1">Métricas de los últimos 14 días</p>
          </div>
          <Link
            href="/settings"
            className="text-sm text-violet-600 hover:underline font-medium"
          >
            Settings →
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Total conversaciones",
              value: analytics?.totals.total ?? 0,
              sub: `${analytics?.totals.open ?? 0} abiertas`,
              color: "text-violet-600",
            },
            {
              label: "Resueltas",
              value: analytics?.totals.closed ?? 0,
              sub: analytics?.totals.total
                ? `${Math.round(((analytics.totals.closed) / analytics.totals.total) * 100)}% del total`
                : "—",
              color: "text-emerald-600",
            },
            {
              label: "Mensajes (30d)",
              value: totalMessages,
              sub: `${analytics?.messages.operator ?? 0} del operador`,
              color: "text-blue-600",
            },
            {
              label: "Tiempo de respuesta",
              value: analytics?.avgResponseMinutes
                ? `${analytics.avgResponseMinutes}m`
                : "—",
              sub: "promedio primera respuesta",
              color: analytics?.avgResponseMinutes && analytics.avgResponseMinutes < 5
                ? "text-emerald-600"
                : "text-amber-600",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-1">{kpi.label}</p>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Gráfico por día */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Conversaciones por día</h2>
          <p className="text-xs text-slate-500 mb-4">Últimos 14 días</p>
          {analytics?.byDay && analytics.byDay.length > 0 ? (
            <MiniBarChart data={analytics.byDay} />
          ) : (
            <div className="h-20 flex items-center justify-center">
              <p className="text-sm text-slate-400">Sin datos todavía</p>
            </div>
          )}
          <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              {analytics?.byDay?.[0]
                ? new Date(analytics.byDay[0].day).toLocaleDateString("es", { month: "short", day: "numeric" })
                : "—"}
            </span>
            <span className="text-xs text-slate-400">
              {analytics?.byDay?.at(-1)?.day
                ? new Date(analytics.byDay.at(-1)!.day).toLocaleDateString("es", { month: "short", day: "numeric" })
                : "—"}
            </span>
          </div>
        </div>

        {/* Mix de mensajes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Mix de mensajes (últimos 30d)</h2>
          {totalMessages > 0 ? (
            <div className="space-y-3">
              {[
                { label: "Visitantes", value: analytics?.messages.contact ?? 0, color: "bg-slate-200" },
                { label: "Operador", value: analytics?.messages.operator ?? 0, color: "bg-violet-500" },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">{bar.label}</span>
                    <span className="text-xs text-slate-500">{bar.value} msgs</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bar.color} transition-all`}
                      style={{ width: `${(bar.value / totalMessages) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Sin mensajes todavía</p>
          )}
        </div>
      </div>
    </div>
  );
}
