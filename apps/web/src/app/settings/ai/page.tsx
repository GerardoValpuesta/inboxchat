"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface AiConfig {
  aiEnabled: boolean;
  aiContext: string;
  aiTriggerMinutes: number;
  aiTone: "formal" | "friendly" | "casual";
  repliesThisMonth: number;
  monthlyLimit: number;
  resetAt: string;
  planSupportsAi: boolean;
}

const TONES = [
  { value: "friendly", label: "Amable",   desc: "Cálido y cercano, ideal para la mayoría de los casos." },
  { value: "formal",   label: "Formal",   desc: "Profesional y directo, para servicios B2B serios." },
  { value: "casual",   label: "Casual",   desc: "Relajado y amigable, para productos de consumo." },
];

export default function AiSettingsPage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/ai-config`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data: AiConfig) => setConfig({
        ...data,
        // aiContext puede llegar null si nunca se configuró
        aiContext: data.aiContext ?? "",
      }))
      .catch(() => setError("Error al cargar la configuración"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(patch: Partial<AiConfig>) {
    if (!config) return;
    const updated = { ...config, ...patch };
    setConfig(updated);
    setSaved(false);

    // Debounce 800ms
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch(`${SERVER_URL}/api/ai-config`, {
          method: "PATCH",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            aiEnabled: updated.aiEnabled,
            aiContext: updated.aiContext,
            aiTriggerMinutes: updated.aiTriggerMinutes,
            aiTone: updated.aiTone,
          }),
        });
        if (!res.ok) {
          const e = await res.json() as { error?: string };
          setError(e.error ?? "Error al guardar");
        } else {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } catch {
        setError("Error de conexión al guardar");
      } finally {
        setSaving(false);
      }
    }, 800);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center text-slate-500">
        Error al cargar la configuración de IA.
      </div>
    );
  }

  const usagePercent = config.monthlyLimit > 0
    ? Math.min(100, (config.repliesThisMonth / config.monthlyLimit) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Auto-Reply</h1>
        <p className="mt-1 text-sm text-slate-500">
          Respuestas automáticas cuando tu equipo no está disponible. Powered by Gemini Flash.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none">×</button>
        </div>
      )}

      {/* Plan gate */}
      {!config.planSupportsAi && (
        <div className="rounded-xl bg-violet-50 border border-violet-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-800">Feature exclusiva del plan Pro</p>
            <p className="text-sm text-violet-700 mt-1">
              El AI Auto-Reply está disponible en el plan Pro ($29/mes).
              Incluye hasta 500 respuestas automáticas por mes.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap"
          >
            Activar Pro →
          </Link>
        </div>
      )}

      {/* Toggle principal */}
      <div className={`rounded-xl border p-5 transition-opacity ${!config.planSupportsAi ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Activar auto-reply</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Cuando un visitante escribe y nadie responde, la IA responde en su lugar.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.aiEnabled}
            onClick={() => void handleSave({ aiEnabled: !config.aiEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.aiEnabled ? "bg-violet-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                config.aiEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Contexto del negocio */}
      <div className={`rounded-xl border p-5 space-y-3 transition-opacity ${!config.planSupportsAi ? "opacity-40 pointer-events-none" : ""}`}>
        <div>
          <label className="text-sm font-semibold text-slate-900">
            Contexto de tu negocio
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Describí brevemente qué hace tu producto. La IA usará esto para dar respuestas relevantes.
          </p>
        </div>
        <textarea
          rows={4}
          value={config.aiContext ?? ""}
          onChange={(e) => void handleSave({ aiContext: e.target.value })}
          placeholder="Ej: Somos una plataforma SaaS de facturación para pymes en México. Nuestro precio es $29/mes. El soporte funciona de lunes a viernes de 9am a 6pm."
          maxLength={2000}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 placeholder-slate-400"
        />
        <p className="text-xs text-slate-400 text-right">{(config.aiContext ?? "").length}/2000</p>
      </div>

      {/* Trigger + Tono en grid */}
      <div className={`grid sm:grid-cols-2 gap-4 transition-opacity ${!config.planSupportsAi ? "opacity-40 pointer-events-none" : ""}`}>
        {/* Trigger */}
        <div className="rounded-xl border p-5 space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-900">
              Responder después de…
            </label>
            <p className="text-xs text-slate-500 mt-0.5">Minutos sin respuesta del equipo.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={30}
              value={config.aiTriggerMinutes}
              onChange={(e) => void handleSave({ aiTriggerMinutes: Number(e.target.value) })}
              className="flex-1 accent-violet-600"
            />
            <span className="text-sm font-bold text-slate-800 w-16 text-right">
              {config.aiTriggerMinutes} min
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {config.aiTriggerMinutes === 1 ? "Respuesta casi inmediata" :
             config.aiTriggerMinutes <= 5 ? "Ideal para soporte ágil" :
             "Bueno para dar tiempo al equipo"}
          </p>
        </div>

        {/* Tono */}
        <div className="rounded-xl border p-5 space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-900">Tono de voz</label>
            <p className="text-xs text-slate-500 mt-0.5">¿Cómo habla tu marca?</p>
          </div>
          <div className="space-y-2">
            {TONES.map((tone) => (
              <label
                key={tone.value}
                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                  config.aiTone === tone.value
                    ? "bg-violet-50 border border-violet-200"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="tone"
                  value={tone.value}
                  checked={config.aiTone === tone.value}
                  onChange={() => void handleSave({ aiTone: tone.value as AiConfig["aiTone"] })}
                  className="mt-0.5 accent-violet-600"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{tone.label}</p>
                  <p className="text-xs text-slate-500">{tone.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Usage meter */}
      {config.planSupportsAi && (
        <div className="rounded-xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Uso este mes</p>
            <p className="text-sm font-bold text-slate-700">
              {config.repliesThisMonth} / {config.monthlyLimit}
            </p>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 90 ? "bg-red-500" :
                usagePercent >= 70 ? "bg-amber-500" :
                "bg-violet-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            Reseta el {new Date(config.resetAt).toLocaleDateString("es", { day: "numeric", month: "long" })} ·{" "}
            ¿Necesitás más?{" "}
            <Link href="/pricing" className="text-violet-600 hover:underline">Ver plan Growth</Link>
          </p>
        </div>
      )}

      {/* Save status */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saving && <p className="text-xs text-slate-400">Guardando...</p>}
        {saved && <p className="text-xs text-green-600 font-medium">Guardado</p>}
      </div>
    </div>
  );
}
