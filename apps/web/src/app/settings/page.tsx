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

interface WorkspaceInfo {
  name: string;
  ownerEmail: string;
  apiKey: string;
  plan: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  isActive: boolean;
  conversationCount: number;
}

const SERVER_EMBED_URL = "https://inboxchatserver-production.up.railway.app";

export default function SettingsPage() {
  const router = useRouter();
  const [info, setInfo] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Widget customization
  const [widgetTitle, setWidgetTitle] = useState("Soporte");
  const [widgetColor, setWidgetColor] = useState("#1e293b");
  const [savingWidget, setSavingWidget] = useState(false);
  const [widgetSaved, setWidgetSaved] = useState(false);
  const [widgetWelcome, setWidgetWelcome] = useState("¡Hola! 👋 ¿En qué podemos ayudarte?");

  useEffect(() => {
    Promise.all([
      fetch(`${SERVER_URL}/api/billing/status`, { headers: getAuthHeaders() as HeadersInit }),
      fetch(`${SERVER_URL}/api/workspace/me`, { headers: getAuthHeaders() as HeadersInit }),
    ])
      .then(async ([billingRes, meRes]) => {
        if (!billingRes.ok || !meRes.ok) {
          router.push("/login");
          return;
        }
        const billing = await billingRes.json() as {
          plan: string;
          trialEndsAt: string | null;
          trialDaysLeft: number | null;
          isActive: boolean;
          conversationCount: number;
        };
        const me = await meRes.json() as {
          workspace: { name: string; ownerEmail: string; apiKey: string };
        };
        setInfo({
          name: me.workspace.name,
          ownerEmail: me.workspace.ownerEmail,
          apiKey: me.workspace.apiKey,
          plan: billing.plan,
          trialEndsAt: billing.trialEndsAt,
          trialDaysLeft: billing.trialDaysLeft,
          isActive: billing.isActive,
          conversationCount: billing.conversationCount,
        });
        // Cargar config actual del widget desde el servidor
        const cfg = await fetch(`${SERVER_URL}/api/widget/config?key=${me.workspace.apiKey}`);
        if (cfg.ok) {
          const d = await cfg.json() as { title?: string; color?: string; welcomeMessage?: string };
          if (d.title) setWidgetTitle(d.title);
          if (d.color) setWidgetColor(d.color);
          if (d.welcomeMessage) setWidgetWelcome(d.welcomeMessage);
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function copySnippet() {
    const snippet = `<script>
  window.InboxChat = {
    workspaceKey: "${info?.apiKey ?? ""}",
    serverUrl: "${SERVER_EMBED_URL}"
  };
</script>
<script src="${SERVER_EMBED_URL}/widget.js"></script>`;
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function saveWidgetConfig() {
    setSavingWidget(true);
    try {
      await fetch(`${SERVER_URL}/api/workspace/widget`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ title: widgetTitle, color: widgetColor, welcomeMessage: widgetWelcome }),
      });
      setWidgetSaved(true);
      setTimeout(() => setWidgetSaved(false), 2000);
    } finally {
      setSavingWidget(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Cargando...</div>
      </div>
    );
  }

  const snippet = `<script>
  window.InboxChat = {
    workspaceKey: "${info?.apiKey ?? ""}",
    serverUrl: "${SERVER_EMBED_URL}"
  };
</script>
<script src="${SERVER_EMBED_URL}/widget.js"></script>`;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/inbox")}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4"
          >
            ← Volver al inbox
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configuración de tu workspace</p>
        </div>

        <div className="space-y-4">
          {/* Info del workspace */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Workspace</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Nombre</span>
                <span className="text-sm font-medium text-slate-900">{info?.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Email del dueño</span>
                <span className="text-sm font-medium text-slate-900">{info?.ownerEmail}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Plan</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  info?.isActive ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {info?.isActive ? "Pro" : `Trial${info?.trialDaysLeft ? ` · ${info.trialDaysLeft}d restantes` : ""}`}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/settings/billing" className="text-sm text-violet-600 hover:underline font-medium">
                Gestionar suscripción →
              </Link>
            </div>
          </div>

          {/* Widget personalización */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">Personalización del widget</h2>
            <p className="text-xs text-slate-500 mb-5">Customize el título y color que ven tus visitantes.</p>

            <div className="flex gap-4">
              {/* Formulario */}
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Mensaje de bienvenida</label>
                  <textarea
                    value={widgetWelcome}
                    onChange={(e) => setWidgetWelcome(e.target.value)}
                    maxLength={120}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors resize-none"
                    placeholder="¡Hola! 👋 ¿En qué podemos ayudarte?"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Título del chat</label>
                  <input
                    type="text"
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    maxLength={30}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Color primario</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={widgetColor}
                      onChange={(e) => setWidgetColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={widgetColor}
                      onChange={(e) => setWidgetColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono text-slate-700 outline-none focus:border-violet-400"
                    />
                  </div>
                </div>
                <button
                  onClick={() => void saveWidgetConfig()}
                  disabled={savingWidget}
                  className="w-full py-2 text-sm font-semibold rounded-xl text-white transition-all disabled:opacity-50"
                  style={{ background: widgetColor }}
                >
                  {widgetSaved ? "✓ Guardado" : savingWidget ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>

              {/* Preview del widget */}
              <div className="flex-shrink-0 w-44">
                <p className="text-xs font-medium text-slate-500 mb-2 text-center">Preview</p>
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white text-xs">
                  <div className="p-2 flex items-center gap-1.5" style={{ background: widgetColor }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: "rgba(255,255,255,0.2)" }}>
                      {widgetTitle.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-xs leading-tight">{widgetTitle || "Soporte"}</p>
                      <p className="text-white/60 text-xs leading-tight">En línea</p>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 min-h-[40px] flex items-end">
                    <div className="rounded-xl rounded-br-sm text-white text-xs px-2 py-1 ml-auto"
                      style={{ background: widgetColor }}>
                      Hola! 👋
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Key */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">API Key del Widget</h2>
            <p className="text-xs text-slate-500 mb-4">Usá esta key para instalar el widget en tu web.</p>
            <div className="flex gap-2 mb-4">
              <code className="flex-1 bg-slate-100 rounded-lg px-3 py-2.5 text-xs font-mono text-slate-700 overflow-x-auto">
                {info?.apiKey}
              </code>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(info?.apiKey ?? "").then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="px-3 py-2 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                {copied ? "✓ Copiado" : "Copiar key"}
              </button>
            </div>
          </div>

          {/* Snippet de instalación */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">
              Snippet de instalación
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Pegá esto antes del <code className="bg-slate-100 px-1 rounded">{`</body>`}</code> de tu web.
            </p>
            <div className="bg-slate-900 rounded-xl p-4 mb-3">
              <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                {snippet}
              </pre>
            </div>
            <button
              onClick={copySnippet}
              className="w-full py-2.5 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors"
            >
              {copied ? "✓ Copiado" : "📋 Copiar snippet completo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
