"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token
    ? { Authorization: `Bearer ${token}` }
    : { "X-Workspace-Key": "dev_key_inboxchat_local" };
}

interface Trigger {
  id: string;
  name: string;
  urlPattern: string;
  delaySecs: number;
  message: string;
  isActive: boolean;
  createdAt: string;
}

const PATTERN_EXAMPLES = [
  { label: "Página de precios", value: "/pricing" },
  { label: "Checkout", value: "/checkout" },
  { label: "Registro", value: "/signup" },
  { label: "Cualquier página", value: "/" },
];

export default function TriggersSettingsPage() {
  const router = useRouter();
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);

  // Form nuevo trigger
  const [name, setName] = useState("");
  const [urlPattern, setUrlPattern] = useState("/pricing");
  const [delaySecs, setDelaySecs] = useState(10);
  const [message, setMessage] = useState("👋 ¡Hola! ¿Tenés alguna pregunta sobre nuestros planes?");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/triggers`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json() as Promise<{ triggers: Trigger[] }>;
      })
      .then((d) => { if (d) setTriggers(d.triggers ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function addTrigger(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !urlPattern.trim() || !message.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`${SERVER_URL}/api/triggers`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), urlPattern: urlPattern.trim(), delaySecs, message: message.trim() }),
      });
      const d = await res.json() as { trigger?: Trigger; error?: string };
      if (res.ok && d.trigger) {
        setTriggers((prev) => [d.trigger!, ...prev]);
        setName("");
        setMessage("👋 ¡Hola! ¿Tenés alguna pregunta sobre nuestros planes?");
        setUrlPattern("/pricing");
        setDelaySecs(10);
      } else {
        setError(d.error ?? "Error al crear trigger");
      }
    } finally {
      setAdding(false);
    }
  }

  async function deleteTrigger(id: string) {
    setDeletingId(id);
    try {
      await fetch(`${SERVER_URL}/api/triggers/${id}`, {
        method: "DELETE", headers: getAuthHeaders(),
      });
      setTriggers((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleTrigger(trigger: Trigger) {
    setTogglingId(trigger.id);
    try {
      await fetch(`${SERVER_URL}/api/triggers/${trigger.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !trigger.isActive }),
      });
      setTriggers((prev) =>
        prev.map((t) => t.id === trigger.id ? { ...t, isActive: !t.isActive } : t)
      );
    } finally {
      setTogglingId(null);
    }
  }

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
          <h1 className="text-2xl font-bold text-slate-900">Mensajes proactivos</h1>
          <p className="text-slate-500 text-sm mt-1">
            El widget enviará un mensaje automático al visitante si pasa cierto tiempo en una página sin chatear.
            Ideal para páginas de precios y checkout.
          </p>
        </div>

        {/* Form nuevo trigger */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Nuevo trigger</h2>
          <form onSubmit={(e) => void addTrigger(e)} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre interno</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pop-up en pricing, Ayuda en checkout..."
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-violet-400 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">URL donde se activa</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {PATTERN_EXAMPLES.map((ex) => (
                  <button
                    key={ex.value}
                    type="button"
                    onClick={() => setUrlPattern(ex.value)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                      urlPattern === ex.value
                        ? "bg-violet-50 border-violet-200 text-violet-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {ex.label} ({ex.value})
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={urlPattern}
                onChange={(e) => setUrlPattern(e.target.value)}
                placeholder="/pricing, /checkout, /"
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono outline-none focus:border-violet-400 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Usa <code className="bg-slate-100 px-1 rounded">/pricing*</code> para prefijo,{" "}
                <code className="bg-slate-100 px-1 rounded">*/checkout*</code> para cualquier posición.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Esperar <strong className="text-violet-600">{delaySecs}s</strong> antes de enviar
              </label>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={delaySecs}
                onChange={(e) => setDelaySecs(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>5s</span><span>30s</span><span>60s</span><span>2min</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Mensaje del widget</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                required
                placeholder="👋 ¡Hola! ¿Necesitás ayuda para elegir un plan?"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-violet-400 transition-colors resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={adding || !name.trim() || !message.trim()}
              className="px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {adding ? "Creando..." : "Crear trigger"}
            </button>
          </form>
        </div>

        {/* Lista de triggers */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              Triggers activos
              <span className="ml-2 text-xs font-medium text-slate-400">{triggers.filter((t) => t.isActive).length}</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="w-5 h-5 text-slate-300 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : triggers.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-sm text-slate-400">Sin triggers todavía</p>
              <p className="text-xs text-slate-300 mt-1">Creá el primero arriba</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {triggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className={`px-6 py-4 transition-colors ${trigger.isActive ? "" : "opacity-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800 truncate">{trigger.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          trigger.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {trigger.isActive ? "Activo" : "Pausado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <code className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[11px]">
                          {trigger.urlPattern}
                        </code>
                        <span>⏱ {trigger.delaySecs}s</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 truncate">&ldquo;{trigger.message}&rdquo;</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => void toggleTrigger(trigger)}
                        disabled={togglingId === trigger.id}
                        className="text-xs text-slate-500 hover:text-violet-600 transition-colors disabled:opacity-40"
                      >
                        {trigger.isActive ? "Pausar" : "Activar"}
                      </button>
                      <button
                        onClick={() => void deleteTrigger(trigger.id)}
                        disabled={deletingId === trigger.id}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {deletingId === trigger.id ? "..." : "Borrar"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">
          Los triggers se cargan en el widget en tiempo real (cache 60s).
          Un visitante solo ve cada trigger una vez por sesión.
        </p>
      </div>
    </div>
  );
}
