"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  range?: number;
  totals: { open: number; closed: number; total: number };
  byDay: { day: string; count: number }[];
  messages: { operator: number; contact: number };
  avgResponseMinutes: number | null;
  responseRate?: number | null;
  topOperators?: { name: string; email: string; msgCount: number }[];
  byHour?: { hour: number; count: number }[];
}

interface WidgetStats {
  summary: { views: number; opens: number; openRate: number };
}

interface CsatStats {
  total: number;
  avg: number | null;
  distribution: Record<string, number>;
}

function MiniBarChart({ data, color = "bg-violet-500" }: { data: { label: string; count: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-20">
      {data.map((d) => {
        const height = Math.max((d.count / max) * 100, 3);
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className={`w-full rounded-t-sm ${color} opacity-80 group-hover:opacity-100 transition-all`}
              style={{ height: `${height}%` }}
            />
            <span className="text-[9px] text-slate-400 hidden group-hover:block absolute -bottom-5 whitespace-nowrap z-10 bg-white border border-slate-200 rounded px-1 py-0.5 shadow-sm">
              {d.label}: {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, sub, color = "text-slate-900" }: { label: string; value: string | number; sub: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [widgetStats, setWidgetStats] = useState<WidgetStats | null>(null);
  const [csatStats, setCsatStats] = useState<CsatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(14);

  const load = useCallback((r: number) => {
    setLoading(true);
    Promise.all([
      fetch(`${SERVER_URL}/api/analytics?range=${r}`, { headers: getAuthHeaders() }),
      fetch(`${SERVER_URL}/api/analytics/widget?days=${r}`, { headers: getAuthHeaders() }),
      fetch(`${SERVER_URL}/api/csat/summary`, { headers: getAuthHeaders() }),
    ])
      .then(async ([analyticsRes, widgetRes, csatRes]) => {
        if (analyticsRes.status === 401) { router.push("/login"); return; }
        if (analyticsRes.ok) {
          const data = await analyticsRes.json() as Analytics;
          setAnalytics(data);
        }
        if (widgetRes.ok) {
          const wdata = await widgetRes.json() as WidgetStats;
          setWidgetStats(wdata);
        }
        if (csatRes.ok) {
          const cdata = await csatRes.json() as CsatStats;
          setCsatStats(cdata);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { load(range); }, [range, load]);

  const totalMessages = (analytics?.messages.operator ?? 0) + (analytics?.messages.contact ?? 0);
  const resolveRate = analytics?.totals.total
    ? Math.round((analytics.totals.closed / analytics.totals.total) * 100)
    : 0;

  // Preparar datos para el gráfico de horas (0-23)
  // byHour es opcional: el backend viejo no lo incluye
  const safeByHour = analytics?.byHour ?? [];
  const hourData = Array.from({ length: 24 }, (_, h) => {
    const found = safeByHour.find((b) => b.hour === h);
    return { label: `${h}h`, count: found?.count ?? 0 };
  });

  const peakHour = safeByHour.length > 0
    ? safeByHour.reduce(
        (max, b) => (b.count > max.count ? b : max),
        { hour: 0, count: 0 }
      )
    : null;

  const safeTopOperators = analytics?.topOperators ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/inbox")}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Inbox
            </button>
            <h1 className="text-base font-semibold text-slate-900">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Range picker */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              {([7, 14, 30] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-md transition-all",
                    range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {r}d
                </button>
              ))}
            </div>
            <Link href="/settings" className="text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors">
              Settings →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 text-slate-300 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs text-slate-400">Cargando métricas...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards — fila 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="Total conversaciones"
                value={analytics?.totals.total ?? 0}
                sub={`${analytics?.totals.open ?? 0} abiertas · ${analytics?.totals.closed ?? 0} resueltas`}
                color="text-violet-600"
              />
              <Stat
                label="Tasa de resolución"
                value={`${resolveRate}%`}
                sub="conversaciones cerradas"
                color={resolveRate >= 70 ? "text-emerald-600" : "text-amber-600"}
              />
              <Stat
                label="Tiempo de respuesta"
                value={analytics?.avgResponseMinutes ? `${analytics.avgResponseMinutes}m` : "—"}
                sub="promedio primera respuesta"
                color={
                  !analytics?.avgResponseMinutes ? "text-slate-400"
                    : analytics.avgResponseMinutes < 5 ? "text-emerald-600"
                    : analytics.avgResponseMinutes < 15 ? "text-amber-600"
                    : "text-red-500"
                }
              />
              <Stat
                label="Tasa de respuesta"
                value={analytics?.responseRate !== null ? `${analytics?.responseRate}%` : "—"}
                sub="chats con respuesta del operador"
                color={
                  analytics?.responseRate == null ? "text-slate-400"
                    : analytics.responseRate >= 80 ? "text-emerald-600"
                    : "text-amber-600"
                }
              />
            </div>

            {/* Widget Analytics — segunda fila */}
            {/* CSAT Summary */}
            {csatStats && csatStats.total > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">CSAT · Satisfacción del cliente</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{csatStats.total} calificacion{csatStats.total !== 1 ? "es" : ""} recibidas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-violet-600">
                      {csatStats.avg !== null ? csatStats.avg.toFixed(1) : "—"}
                    </p>
                    <p className="text-[10px] text-slate-400">promedio / 5</p>
                  </div>
                </div>
                {/* Barra de distribución por estrella */}
                <div className="space-y-1.5">
                  {[5,4,3,2,1].map((n) => {
                    const emojis: Record<number,string> = {5:"🤩",4:"😊",3:"😐",2:"😞",1:"😞"};
                    const cnt = csatStats.distribution[String(n)] ?? 0;
                    const pct = csatStats.total > 0 ? Math.round((cnt / csatStats.total) * 100) : 0;
                    return (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-sm w-5 flex-shrink-0">{emojis[n]}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              n >= 4 ? "bg-emerald-400" : n === 3 ? "bg-amber-400" : "bg-red-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 w-12 text-right flex-shrink-0">{cnt} · {pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Widget Analytics */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <h2 className="text-sm font-semibold text-slate-900">Widget</h2>
                <span className="text-xs text-slate-400 ml-auto">Últimos {range} días</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Vistas del widget",
                    value: widgetStats?.summary.views ?? "—",
                    sub: "páginas con widget cargado",
                    color: "text-blue-600",
                  },
                  {
                    label: "Chat abiertos",
                    value: widgetStats?.summary.opens ?? "—",
                    sub: "visitantes que hicieron click",
                    color: "text-violet-600",
                  },
                  {
                    label: "Tasa de apertura",
                    value: widgetStats?.summary.openRate !== undefined ? `${widgetStats.summary.openRate}%` : "—",
                    sub: "de visitantes que chatean",
                    color: (widgetStats?.summary.openRate ?? 0) >= 5
                      ? "text-emerald-600"
                      : (widgetStats?.summary.openRate ?? 0) >= 2
                      ? "text-amber-600"
                      : "text-slate-400",
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>
              {!widgetStats && (
                <p className="text-xs text-slate-400 text-center mt-2">
                  Los datos aparecerán cuando el widget esté instalado y reciba visitas.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Conversaciones por día */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-0.5">Conversaciones por día</h2>
                <p className="text-xs text-slate-500 mb-4">Últimos {range} días</p>
                {analytics?.byDay && analytics.byDay.length > 0 ? (
                  <>
                    <MiniBarChart
                      data={analytics.byDay.map((d) => ({
                        label: new Date(d.day).toLocaleDateString("es", { weekday: "short", day: "numeric" }),
                        count: d.count,
                      }))}
                    />
                    <div className="flex justify-between mt-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400">
                        {analytics.byDay[0] ? new Date(analytics.byDay[0].day).toLocaleDateString("es", { month: "short", day: "numeric" }) : ""}
                      </span>
                      <span className="text-xs text-slate-400">
                        {analytics.byDay.at(-1) ? new Date(analytics.byDay.at(-1)!.day).toLocaleDateString("es", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="h-20 flex items-center justify-center">
                    <p className="text-sm text-slate-400">Sin datos en este período</p>
                  </div>
                )}
              </div>

              {/* Heatmap de horas */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-0.5">Pico de actividad</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Mensajes de visitantes por hora del día
                  {peakHour && peakHour.count > 0 && (
                    <span className="ml-1 text-violet-600 font-medium">· pico a las {peakHour.hour}h</span>
                  )}
                </p>
                <MiniBarChart data={hourData} color="bg-blue-400" />
                <div className="flex justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">00h</span>
                  <span className="text-xs text-slate-400">12h</span>
                  <span className="text-xs text-slate-400">23h</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Mix de mensajes */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Mix de mensajes</h2>
                {totalMessages > 0 ? (
                  <div className="space-y-4">
                    {[
                      { label: "Visitantes", value: analytics?.messages.contact ?? 0, color: "bg-slate-300" },
                      { label: "Operadores", value: analytics?.messages.operator ?? 0, color: "bg-violet-500" },
                    ].map((bar) => (
                      <div key={bar.label}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-600">{bar.label}</span>
                          <span className="text-xs text-slate-500">{bar.value.toLocaleString()} msgs ({Math.round((bar.value / totalMessages) * 100)}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                            style={{ width: `${(bar.value / totalMessages) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-slate-400 pt-1">{totalMessages.toLocaleString()} mensajes totales en {range} días</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">Sin mensajes en este período</p>
                )}
              </div>

              {/* Top operadores */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Operadores más activos</h2>
                {safeTopOperators.length > 0 ? (
                  <div className="space-y-3">
                    {safeTopOperators.map((op, i) => {
                      const maxMsgs = safeTopOperators[0]?.msgCount ?? 1;
                      return (
                        <div key={op.email} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700 flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-700 truncate">{op.name || op.email}</span>
                              <span className="text-xs text-slate-500 flex-shrink-0 ml-2">{op.msgCount}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-violet-400 rounded-full transition-all duration-500"
                                style={{ width: `${(op.msgCount / maxMsgs) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">Sin actividad de operadores</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
