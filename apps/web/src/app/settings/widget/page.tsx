"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const PRESET_COLORS = [
  { label: "Slate", value: "#1e293b" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Blue", value: "#2563eb" },
  { label: "Emerald", value: "#059669" },
  { label: "Rose", value: "#e11d48" },
  { label: "Orange", value: "#ea580c" },
  { label: "Black", value: "#0a0a0a" },
];

interface WidgetConfig {
  title: string;
  color: string;
  welcomeMessage: string;
  gdprEnabled: boolean;
}

// Mini-preview del widget dentro de la página de settings
function WidgetPreview({ config }: { config: WidgetConfig }) {
  return (
    <div
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      className="relative select-none"
    >
      {/* Panel del chat */}
      <div
        style={{
          width: "300px",
          height: "380px",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: config.color,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 600,
              color: "white",
            }}
          >
            {config.title.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{config.title}</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
              En línea
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ background: "#f8fafc", flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
          <div style={{
            background: "white",
            borderRadius: "10px 10px 10px 3px",
            padding: "8px 12px",
            fontSize: "12px",
            color: "#1e293b",
            maxWidth: "85%",
            alignSelf: "flex-start",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            lineHeight: 1.5,
          }}>
            {config.welcomeMessage}
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "8px", background: "white" }}>
          <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 10px", fontSize: "12px", color: "#94a3b8" }}>
            Escribí tu mensaje...
          </div>
          <div style={{ width: "30px", height: "30px", background: config.color, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Botón flotante */}
      <div style={{ position: "absolute", bottom: "-20px", right: "-10px" }}>
        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: config.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function WidgetSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<WidgetConfig>({
    title: "Soporte",
    color: "#1e293b",
    welcomeMessage: "¡Hola! 👋 ¿En qué podemos ayudarte?",
    gdprEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${SERVER_URL}/api/workspace/me`, { headers: getAuthHeaders() }),
    ]).then(async ([meRes]) => {
      if (meRes.status === 401) { router.push("/login"); return; }
      const meData = await meRes.json() as { workspace: { apiKey: string } };
      const key = meData?.workspace?.apiKey;
      if (key) {
        setApiKey(key);
        // Solo cargamos la config del widget si tenemos un key válido
        const cfgRes = await fetch(`${SERVER_URL}/api/widget/config?key=${key}`);
        if (cfgRes.ok) {
          const cfg = await cfgRes.json() as {
            title?: string; color?: string;
            welcomeMessage?: string; gdprEnabled?: boolean;
          };
          setConfig({
            title: cfg.title ?? "Soporte",
            color: cfg.color ?? "#1e293b",
            welcomeMessage: cfg.welcomeMessage ?? "¡Hola! 👋 ¿En qué podemos ayudarte?",
            gdprEnabled: cfg.gdprEnabled ?? false,
          });
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  const update = useCallback(<K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch(`${SERVER_URL}/api/workspace/widget`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: config.title,
          color: config.color,
          welcomeMessage: config.welcomeMessage,
          gdprEnabled: config.gdprEnabled,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const snippet = `<script>
  window.InboxChat = {
    workspaceKey: '${apiKey || "TU_API_KEY"}'
  }
</script>
<script src="https://server.inboxchat.app/widget.js" async></script>`;

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/settings")}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4 transition-colors"
          >
            ← Settings
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Widget</h1>
          <p className="text-slate-500 text-sm mt-1">
            Personalizá el aspecto del chat que ven tus visitantes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            {/* Título */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Personalización</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Título del widget</label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="Soporte"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-violet-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Color principal</label>
                  {/* Presets */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {PRESET_COLORS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => update("color", p.value)}
                        className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          background: p.value,
                          borderColor: config.color === p.value ? "#7c3aed" : "transparent",
                          outline: config.color === p.value ? "2px solid #7c3aed" : "none",
                          outlineOffset: "2px",
                        }}
                        title={p.label}
                      />
                    ))}
                  </div>
                  {/* Custom color */}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.color}
                      onChange={(e) => update("color", e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.color}
                      onChange={(e) => {
                        if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) update("color", e.target.value);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono outline-none focus:border-violet-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Mensaje de bienvenida</label>
                  <textarea
                    value={config.welcomeMessage}
                    onChange={(e) => update("welcomeMessage", e.target.value)}
                    rows={3}
                    placeholder="¡Hola! 👋 ¿En qué podemos ayudarte?"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-violet-400 transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <button
                    role="switch"
                    aria-checked={config.gdprEnabled}
                    onClick={() => update("gdprEnabled", !config.gdprEnabled)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      config.gdprEnabled ? "bg-violet-600" : "bg-slate-200"
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      config.gdprEnabled ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-slate-700">GDPR checkbox</p>
                    <p className="text-xs text-slate-500">El visitante debe aceptar antes de chatear</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => void save()}
                disabled={saving || loading}
                className="mt-4 w-full py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar cambios"}
              </button>
            </div>

            {/* Snippet */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Código de instalación</h2>
                <button
                  onClick={() => void copySnippet()}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {copiedSnippet ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
              <pre className="bg-slate-950 text-slate-300 text-[11px] font-mono leading-relaxed px-6 py-5 overflow-x-auto">
                {snippet}
              </pre>
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Pegá este snippet en el <code className="bg-slate-100 px-1 rounded">{"<head>"}</code> de tu web.
                  Los cambios de personalización se aplican <strong>automáticamente</strong> sin re-instalar.
                </p>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="flex flex-col items-center justify-start pt-6 lg:pt-0 lg:justify-center">
            <p className="text-xs font-medium text-slate-500 mb-8 uppercase tracking-wider">Preview en tiempo real</p>
            {loading ? (
              <div className="w-72 h-80 bg-slate-100 rounded-2xl animate-pulse" />
            ) : (
              <WidgetPreview config={config} />
            )}
            <p className="text-xs text-slate-400 mt-10 text-center max-w-48">
              Así verán el chat tus visitantes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
