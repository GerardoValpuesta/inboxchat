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
  aiReplies?: number;
}

interface WidgetStats {
  summary: { views: number; opens: number; openRate: number };
}

interface CsatStats {
  total: number;
  avg: number | null;
  distribution: Record<string, number>;
}

// ─── Gráfico de línea SVG suavizado ──────────────────────────────────────────
function LineChart({ data, color = "#7c3aed" }: { data: { label: string; count: number }[]; color?: string }) {
  if (!data.length) return null;
  const W = 600; const H = 100; const PAD = 8;
  const max = Math.max(...data.map((d) => d.count), 1);
  const pts = data.map((d, i) => ({
    x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
    y: H - PAD - (d.count / max) * (H - PAD * 2),
    ...d,
  }));

  // Bézier suavizado: control points a 1/3 de distancia entre puntos
  const path = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1]!;
    const cpx = (prev.x + pt.x) / 2;
    return `${acc} C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`;
  }, "");

  const areaPath = `${path} L ${pts.at(-1)!.x} ${H - PAD} L ${PAD} ${H - PAD} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((v) => (
          <line
            key={v}
            x1={PAD} y1={PAD + (1 - v) * (H - PAD * 2)}
            x2={W - PAD} y2={PAD + (1 - v) * (H - PAD * 2)}
            stroke="#e2e8f0" strokeWidth="1"
          />
        ))}
        {/* Area fill */}
        <path d={areaPath} fill="url(#chartGrad)" />
        {/* Line */}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {/* Dots */}
        {pts.map((pt) => (
          <circle key={pt.label} cx={pt.x} cy={pt.y} r="3" fill="white" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      {/* Tooltip labels */}
      <div className="flex justify-between mt-1">
        {data.length <= 10
          ? data.map((d) => (
              <span key={d.label} className="text-[9px] text-slate-400 hidden sm:block">
                {new Date(d.label.includes("-") ? d.label : Date.now()).toLocaleDateString("es", { day: "numeric", month: "short" })}
              </span>
            ))
          : (
            <>
              <span className="text-[9px] text-slate-400">
                {new Date(data[0]!.label).toLocaleDateString("es", { day: "numeric", month: "short" })}
              </span>
              <span className="text-[9px] text-slate-400">
                {new Date(data[Math.floor(data.length / 2)]!.label).toLocaleDateString("es", { day: "numeric", month: "short" })}
              </span>
              <span className="text-[9px] text-slate-400">
                {new Date(data.at(-1)!.label).toLocaleDateString("es", { day: "numeric", month: "short" })}
              </span>
            </>
          )
        }
      </div>
    </div>
  );
}

// ─── Heatmap de horas con intensidad de color ─────────────────────────────────
function HourHeatmap({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="grid grid-cols-12 gap-1">
      {Array.from({ length: 24 }, (_, h) => {
        const found = data.find((d) => d.hour === h);
        const count = found?.count ?? 0;
        const intensity = count / max;
        const alpha = 0.08 + intensity * 0.88;
        return (
          <div key={h} className="group relative">
            <div
              className="h-8 rounded-md transition-all cursor-default"
              style={{ background: `rgba(124,58,237,${alpha})` }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">
                {h}h · {count} msgs
              </div>
            </div>
          </div>
        );
      })}
      <div className="col-span-12 flex justify-between mt-1">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h} className="text-[9px] text-slate-400">{h}h</span>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card con trend delta ─────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color = "text-slate-900", trend,
}: {
  label: string; value: string | number; sub: string; color?: string; trend?: number | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-slate-400 flex-1">{sub}</p>
        {trend !== null && trend !== undefined && (
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
            trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          )}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
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

  const safeByHour = analytics?.byHour ?? [];
  const peakHour = safeByHour.length > 0
    ? safeByHour.reduce((max, b) => (b.count > max.count ? b : max), { hour: 0, count: 0 })
    : null;

  const safeTopOperators = analytics?.topOperators ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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
            <div className="w-px h-4 bg-slate-200" />
            <h1 className="text-base font-semibold text-slate-900">Analytics</h1>
          </div>
          <div className="flex items-center gap-3">
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

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Cargando métricas...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards — fila 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Total conversaciones"
                value={analytics?.totals.total ?? 0}
                sub={`${analytics?.totals.open ?? 0} abiertas · ${analytics?.totals.closed ?? 0} resueltas`}
                color="text-violet-600"
              />
              <KpiCard
                label="Tasa de resolución"
                value={`${resolveRate}%`}
                sub="conversaciones cerradas"
                color={resolveRate >= 70 ? "text-emerald-600" : "text-amber-600"}
              />
              <KpiCard
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
              <KpiCard
                label="Tasa de respuesta"
                value={analytics?.responseRate != null ? `${analytics?.responseRate}%` : "—"}
                sub="chats con respuesta del operador"
                color={
                  analytics?.responseRate == null ? "text-slate-400"
                    : analytics.responseRate >= 80 ? "text-emerald-600"
                    : "text-amber-600"
                }
              />
            </div>

            {/* Segunda fila: Widget + AI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Widget stats */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base">🔌</span>
                  <h2 className="text-sm font-semibold text-slate-900">Widget</h2>
                  <span className="text-xs text-slate-400 ml-auto">Últimos {range} días</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Vistas", value: widgetStats?.summary.views ?? "—", color: "text-blue-600" },
                    { label: "Chats abiertos", value: widgetStats?.summary.opens ?? "—", color: "text-violet-600" },
                    {
                      label: "Tasa apertura",
                      value: widgetStats?.summary.openRate !== undefined ? `${widgetStats.summary.openRate}%` : "—",
                      color: (widgetStats?.summary.openRate ?? 0) >= 5
                        ? "text-emerald-600"
                        : (widgetStats?.summary.openRate ?? 0) >= 2
                        ? "text-amber-600"
                        : "text-slate-400",
                    },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {!widgetStats && (
                  <p className="text-xs text-slate-400 mt-3">
                    Los datos aparecen cuando el widget está instalado y recibe visitas.
                  </p>
                )}
              </div>

              {/* AI replies card */}
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🤖</span>
                  <h2 className="text-sm font-semibold text-slate-900">AI Auto-Reply</h2>
                </div>
                <p className="text-3xl font-bold text-violet-600 mb-1">
                  {analytics?.aiReplies ?? "—"}
                </p>
                <p className="text-xs text-slate-500">respuestas automáticas</p>
                <p className="text-xs text-slate-400 mt-3">
                  {analytics?.aiReplies
                    ? `${Math.round(((analytics.aiReplies ?? 0) / Math.max(analytics.totals.total, 1)) * 100)}% de convs atendidas por IA`
                    : "Activá la IA en Settings → AI"}
                </p>
              </div>
            </div>

            {/* CSAT */}
            {csatStats && csatStats.total > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⭐</span>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">CSAT · Satisfacción del cliente</h2>
                      <p className="text-xs text-slate-500">{csatStats.total} calificacion{csatStats.total !== 1 ? "es" : ""} recibidas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-violet-600">
                      {csatStats.avg !== null ? csatStats.avg.toFixed(1) : "—"}
                    </p>
                    <p className="text-[10px] text-slate-400">promedio / 5</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const emojis: Record<number, string> = { 5: "🤩", 4: "😊", 3: "😐", 2: "😞", 1: "😞" };
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
                        <span className="text-[10px] text-slate-500 w-14 text-right flex-shrink-0">{cnt} · {pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gráfico de tendencia — línea SVG suavizada */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Tendencia de conversaciones</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Últimos {range} días</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-violet-500 rounded-full inline-block" />
                  <span className="text-xs text-slate-500">conversaciones / día</span>
                </div>
              </div>
              {analytics?.byDay && analytics.byDay.length > 0 ? (
                <LineChart
                  data={analytics.byDay.map((d) => ({ label: d.day, count: d.count }))}
                  color="#7c3aed"
                />
              ) : (
                <div className="h-24 flex items-center justify-center">
                  <p className="text-sm text-slate-400">Sin datos en este período</p>
                </div>
              )}
            </div>

            {/* Heatmap de horas + Mix de mensajes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-0.5">Heatmap de actividad</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Mensajes de visitantes por hora del día
                  {peakHour && peakHour.count > 0 && (
                    <span className="ml-1 text-violet-600 font-medium">· pico a las {peakHour.hour}h</span>
                  )}
                </p>
                <HourHeatmap data={safeByHour} />
              </div>

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
                          <span className="text-xs text-slate-500">
                            {bar.value.toLocaleString()} ({Math.round((bar.value / totalMessages) * 100)}%)
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${bar.color} transition-all duration-700`}
                            style={{ width: `${(bar.value / totalMessages) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-slate-400 pt-1">{totalMessages.toLocaleString()} mensajes totales</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">Sin mensajes en este período</p>
                )}
              </div>
            </div>

            {/* Top operadores */}
            {safeTopOperators.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Operadores más activos</h2>
                <div className="space-y-3">
                  {safeTopOperators.map((op, i) => {
                    const maxMsgs = safeTopOperators[0]?.msgCount ?? 1;
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <div key={op.email} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center text-sm flex-shrink-0">
                          {medals[i] ?? <span className="text-[11px] font-bold text-violet-600">{i + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700 truncate">{op.name || op.email}</span>
                            <span className="text-xs text-slate-500 flex-shrink-0 ml-2 font-semibold">{op.msgCount} msgs</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full transition-all duration-700"
                              style={{ width: `${(op.msgCount / maxMsgs) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
