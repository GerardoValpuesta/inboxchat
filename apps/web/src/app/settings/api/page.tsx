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

export default function ApiSettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  useEffect(() => {
    // En prod, SERVER_URL ya es la URL real del Railway server
    setServerUrl(SERVER_URL.startsWith("http://localhost") ? "https://server.inboxchat.app" : SERVER_URL);
    fetch(`${SERVER_URL}/api/workspace/me`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) { router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`); return null; }
        return r.json() as Promise<{ workspace: { apiKey: string; plan: string } }>;
      })
      .then((d) => { if (d) { setApiKey(d.workspace.apiKey); setPlan(d.workspace.plan); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateKey() {
    setRegenerating(true); setConfirmRegen(false);
    try {
      const res = await fetch(`${SERVER_URL}/api/workspace/me/api-key`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json() as { apiKey?: string };
      if (data.apiKey) setApiKey(data.apiKey);
    } catch { /* ignore */ }
    finally { setRegenerating(false); }
  }

  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/conversations",
      desc: "Listar conversaciones del workspace.",
      params: "?status=open|closed  ?limit=50  ?offset=0",
    },
    {
      method: "GET",
      path: "/api/v1/conversations/:id/messages",
      desc: "Mensajes de una conversación.",
      params: "",
    },
    {
      method: "POST",
      path: "/api/v1/conversations/:id/messages",
      desc: "Enviar un mensaje como operador.",
      params: 'Body JSON: { "body": "Texto del mensaje" }',
    },
    {
      method: "PATCH",
      path: "/api/v1/conversations/:id/status",
      desc: "Cerrar o reabrir una conversación.",
      params: 'Body JSON: { "status": "open" | "closed" }',
    },
  ];

  const methodColor: Record<string, string> = {
    GET: "#22c55e",
    POST: "#3b82f6",
    PATCH: "#f59e0b",
    DELETE: "#ef4444",
  };

  const displayServerUrl = serverUrl || SERVER_URL;
  const curlExample = `curl ${displayServerUrl}/api/v1/conversations \\
  -H "X-Api-Key: ${apiKey ?? "TU_API_KEY"}" \\
  -H "Accept: application/json"`;

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
          <h1 className="text-2xl font-bold text-slate-900">API</h1>
          <p className="text-slate-500 text-sm mt-1">
            Usá la API pública REST para integrar InboxChat con tu propio backend, Zapier, n8n, o cualquier herramienta.
          </p>
        </div>

        {/* API Key */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">API Key</h2>
          <p className="text-xs text-slate-500 mb-4">
            Tratá esta key como una contraseña — da acceso completo a las conversaciones de tu workspace.
          </p>
          {loading ? (
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <>
              <div className="flex gap-2">
                <code className="flex-1 bg-slate-900 text-emerald-400 text-xs font-mono rounded-lg px-4 py-3 overflow-x-auto whitespace-nowrap">
                  {apiKey ?? "(sin generar)"}
                </code>
                <button
                  onClick={() => apiKey && void copy(apiKey)}
                  disabled={!apiKey}
                  className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
                >
                  {copied ? "✓ Copiado" : "Copiar"}
                </button>
                <button
                  onClick={() => setConfirmRegen(true)}
                  disabled={regenerating}
                  className="px-3 py-2 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors flex-shrink-0"
                >
                  {regenerating ? "..." : apiKey ? "Regenerar" : "Generar"}
                </button>
              </div>
              {confirmRegen && (
                <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  Al regenerar, la key anterior deja de funcionar.
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => void regenerateKey()} className="px-3 py-1 bg-amber-600 text-white rounded font-semibold">
                      Confirmar
                    </button>
                    <button onClick={() => setConfirmRegen(false)} className="px-3 py-1 border border-amber-300 rounded text-amber-700">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Header requerido: <code className="bg-slate-100 px-1 rounded">X-Api-Key: {"{tu api key}"}</code>
          </p>
        </div>

        {/* Upgrade CTA — solo plan free */}
        {!loading && plan === "free" && (
          <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 mb-4 text-center">
            <p className="text-sm font-semibold text-violet-800 mb-1">🔒 La API REST requiere el plan Pro</p>
            <p className="text-xs text-slate-500 mb-3">
              Integrá InboxChat con Zapier, Make o tu propio backend por $29/mes.
            </p>
            <a
              href="/pricing"
              id="api-upgrade-cta"
              className="inline-block bg-violet-600 text-white text-xs font-semibold px-5 py-2 rounded-xl hover:bg-violet-700 transition-colors"
            >
              Ver planes →
            </a>
          </div>
        )}

        {/* Quickstart curl */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Ejemplo rápido</h2>
            <button
              onClick={() => void copy(curlExample)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Copiar
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-300 text-[12px] font-mono leading-relaxed px-6 py-5 overflow-x-auto">
            <span className="text-slate-500"># Listar conversaciones abiertas{"\n"}</span>
            {curlExample}
          </pre>
        </div>

        {/* Endpoint list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Endpoints disponibles</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {endpoints.map((ep) => (
              <div key={ep.path} className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 flex-shrink-0"
                    style={{
                      background: methodColor[ep.method] + "20",
                      color: methodColor[ep.method],
                    }}
                  >
                    {ep.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono text-slate-700 block">{ep.path}</code>
                    <p className="text-xs text-slate-500 mt-1">{ep.desc}</p>
                    {ep.params && (
                      <code className="text-[11px] text-slate-400 block mt-1">{ep.params}</code>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Base URL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Base URL</h2>
          <code className="block bg-slate-900 text-violet-400 text-xs font-mono rounded-lg px-4 py-3">
            {displayServerUrl}
          </code>
          <p className="text-xs text-slate-400 mt-2">
            Todas las respuestas son JSON. Las respuestas de error incluyen el campo <code className="bg-slate-100 px-1 rounded">error</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
