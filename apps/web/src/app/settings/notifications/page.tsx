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

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const [slaMinutes, setSlaMinutes] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    // Verificar permisos de notificación del browser
    if (typeof Notification !== "undefined") {
      setNotifEnabled(Notification.permission === "granted");
    }

    // Cargar configuración del workspace
    fetch(`${SERVER_URL}/api/workspace/me`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json() as Promise<{ workspace: { slaMinutes: number } }>;
      })
      .then((d) => { if (d) setSlaMinutes(d.workspace.slaMinutes ?? 10); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function requestNotificationPermission() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === "granted");
  }

  async function save() {
    setSaving(true);
    try {
      await fetch(`${SERVER_URL}/api/workspace/me`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ slaMinutes }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const slaLabels: Record<number, string> = {
    1: "1 minuto (muy agresivo)",
    2: "2 minutos",
    5: "5 minutos",
    10: "10 minutos (recomendado)",
    15: "15 minutos",
    30: "30 minutos",
    60: "1 hora",
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/settings")}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4 transition-colors"
          >
            ← Settings
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Notificaciones</h1>
          <p className="text-slate-500 text-sm mt-1">
            Controlá cuándo y cómo el inbox te avisa sobre conversaciones que necesitan atención.
          </p>
        </div>

        {/* Permiso de browser */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Notificaciones del browser</h2>
          <p className="text-xs text-slate-500 mb-4">
            El inbox te muestra alertas del sistema cuando llega un nuevo mensaje y no tenés el foco en la pestaña.
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${notifEnabled ? "bg-emerald-400" : "bg-slate-300"}`} />
              <span className="text-sm text-slate-700">
                {notifEnabled ? "Activadas" : "Desactivadas"}
              </span>
            </div>
            {!notifEnabled && (
              <button
                onClick={() => void requestNotificationPermission()}
                className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                Activar →
              </button>
            )}
          </div>
        </div>

        {/* SLA Alert threshold */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Alerta de conversación sin respuesta</h2>
          <p className="text-xs text-slate-500 mb-5">
            Si una conversación abierta lleva más de este tiempo sin respuesta del operador,
            el inbox te envía una notificación de alerta.
          </p>

          {loading ? (
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <>
              <label className="text-xs font-medium text-slate-600 mb-2 block">
                Umbral: <strong className="text-violet-600">{slaMinutes} {slaMinutes === 1 ? "minuto" : "minutos"}</strong>
              </label>
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={slaMinutes}
                onChange={(e) => setSlaMinutes(Number(e.target.value))}
                className="w-full accent-violet-600 mb-2"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mb-4">
                <span>1 min</span><span>15 min</span><span>30 min</span><span>60 min</span>
              </div>
              {/* Quick presets */}
              <div className="flex gap-2 flex-wrap mb-5">
                {[2, 5, 10, 15, 30].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSlaMinutes(m)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      slaMinutes === m
                        ? "bg-violet-50 border-violet-200 text-violet-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {m}min
                  </button>
                ))}
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 mb-4">
                💡 <strong>Recomendación:</strong>{" "}
                {slaLabels[slaMinutes] ?? `${slaMinutes} minutos`} —{" "}
                {slaMinutes <= 2
                  ? "puede generar muchas alertas mientras seguís conversaciones."
                  : slaMinutes >= 30
                  ? "útil si atendés en horarios específicos."
                  : "balance ideal para la mayoría de equipos de soporte."}
              </div>
              <button
                onClick={() => void save()}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar"}
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center">
          Las alertas solo se activan cuando tenés el inbox abierto en el browser
          y los permisos de notificación activados.
        </p>
      </div>
    </div>
  );
}
