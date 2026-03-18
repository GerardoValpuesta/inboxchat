"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  created_at?: string;
}

// ─── Templates predefinidos ───────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "slack",
    name: "🟢 Slack",
    description: "Recibe una notificación en Slack cada vez que llega un nuevo mensaje.",
    hint: "Crea un Incoming Webhook en slack.com/apps → Incoming Webhooks y pegá la URL aquí.",
    events: ["message.created"],
    urlPlaceholder: "https://hooks.slack.com/services/T.../B.../...",
    docsUrl: "https://api.slack.com/messaging/webhooks",
  },
  {
    id: "zapier",
    name: "⚡ Zapier",
    description: "Dispara un Zap cuando se crea o cierra una conversación.",
    hint: 'En Zapier: New Zap → Trigger: Webhooks by Zapier → Catch Hook. Pegá la URL de "Custom Webhook URL" aquí.',
    events: ["conversation.created", "conversation.closed"],
    urlPlaceholder: "https://hooks.zapier.com/hooks/catch/...",
    docsUrl: "https://zapier.com/apps/webhook",
  },
  {
    id: "make",
    name: "🔵 Make (ex Integromat)",
    description: "Conecta InboxChat con cualquier app a través de Make.",
    hint: "En Make: New Scenario → Webhooks → Custom webhook. Pegá la URL generada aquí.",
    events: ["message.created", "conversation.created"],
    urlPlaceholder: "https://hook.eu1.make.com/...",
    docsUrl: "https://www.make.com/en/help/tools/webhooks",
  },
  {
    id: "custom",
    name: "🔧 Custom",
    description: "Cualquier endpoint HTTP que acepte POST con JSON.",
    hint: "Tu servidor recibirá un POST con el evento en el body. Verificá la firma HMAC-SHA256 con tu secret.",
    events: ["message.created"],
    urlPlaceholder: "https://tu-servidor.com/webhook",
    docsUrl: null,
  },
];

const ALL_EVENTS = [
  { value: "message.created", label: "message.created — Mensaje nuevo (visitante u operador)" },
  { value: "conversation.created", label: "conversation.created — Nueva conversación iniciada" },
  { value: "conversation.closed", label: "conversation.closed — Conversación cerrada" },
  { value: "csat.submitted", label: "csat.submitted — Rating de satisfacción recibido" },
];

export default function WebhooksSettingsPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<string>("free");
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<string[]>(["message.created"]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${SERVER_URL}/api/workspace/me`, { headers: getAuthHeaders() }).then((r) => {
        if (r.status === 401) { router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`); throw new Error("unauth"); }
        return r.json() as Promise<{ workspace: { plan: string } }>;
      }),
      fetch(`${SERVER_URL}/api/webhooks`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([me, wh]: [{ workspace: { plan: string } }, { webhooks: Webhook[] }]) => {
        setPlan(me.workspace.plan);
        setWebhooks(wh.webhooks ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function applyTemplate(templateId: string) {
    const t = TEMPLATES.find((t) => t.id === templateId);
    if (!t) return;
    setSelectedTemplate(templateId);
    setUrl("");
    setEvents(t.events);
  }

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) { setAddError("La URL es requerida"); return; }
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch(`${SERVER_URL}/api/webhooks`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), secret: secret.trim() || null, events }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Error al crear webhook");
      }
      const data = await res.json() as { webhook: Webhook };
      setWebhooks((prev) => [...prev, data.webhook]);
      setUrl(""); setSecret(""); setEvents(["message.created"]); setSelectedTemplate(null);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setAdding(false);
    }
  }

  async function deleteWebhook(id: string) {
    await fetch(`${SERVER_URL}/api/webhooks/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    setWebhooks((prev) => prev.filter((wh) => wh.id !== id));
  }

  const template = TEMPLATES.find((t) => t.id === selectedTemplate);

  // ─── Plan gate ──────────────────────────────────────────────────────────────
  if (!loading && plan === "free") {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/settings")}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4 transition-colors"
          >
            ← Settings
          </button>
          {/* Upgrade CTA */}
          <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🔌</div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Webhooks — Plan Pro</h1>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Los webhooks salientes están disponibles en el plan Pro. Conecta InboxChat
              con Slack, Zapier, Make o tu propio backend en minutos.
            </p>
            <Link
              href="/pricing"
              id="webhooks-upgrade-cta"
              className="inline-block bg-violet-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-violet-700 transition-colors shadow-md"
            >
              Ver planes → $29/mes
            </Link>
            <p className="text-xs text-slate-400 mt-3">14 días de prueba gratis, sin tarjeta</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/settings")}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4 transition-colors"
        >
          ← Settings
        </button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-slate-500 text-sm mt-1">
            Recibe notificaciones HTTP cuando ocurren eventos en tu workspace.
          </p>
        </div>

        {/* Lista de webhooks existentes */}
        {webhooks.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Webhooks activos</h2>
              <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                {webhooks.length} activo{webhooks.length !== 1 ? "s" : ""}
              </span>
            </div>
            <ul className="divide-y divide-slate-50">
              {webhooks.map((wh) => (
                <li key={wh.id} className="px-6 py-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono text-slate-700 block truncate">{wh.url}</code>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {wh.events.map((ev) => (
                        <span key={ev} className="text-[10px] bg-violet-50 text-violet-600 font-semibold px-1.5 py-0.5 rounded">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => void deleteWebhook(wh.id)}
                    className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 transition-colors"
                    title="Eliminar webhook"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Templates */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Agregar webhook</h2>
            <p className="text-xs text-slate-500 mt-0.5">Elegí una integración o configurá una URL personalizada.</p>
          </div>

          {/* Template selector */}
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-3">Integraciones rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    selectedTemplate === t.id
                      ? "border-violet-500 bg-violet-50 text-violet-800"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Hint del template seleccionado */}
          {template && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>{template.name}:</strong> {template.hint}
                {template.docsUrl && (
                  <> {" "}
                    <a href={template.docsUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      Ver docs →
                    </a>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={(e) => void addWebhook(e)} className="px-6 py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">URL del endpoint *</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={template?.urlPlaceholder ?? "https://tu-servidor.com/webhook"}
                required
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Secret (opcional)
                <span className="font-normal text-slate-400 ml-1">— para verificar HMAC-SHA256</span>
              </label>
              <input
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="mi_secreto_seguro"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Eventos</label>
              <div className="space-y-2">
                {ALL_EVENTS.map((ev) => (
                  <label key={ev.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={events.includes(ev.value)}
                      onChange={(e) =>
                        setEvents(
                          e.target.checked
                            ? [...events, ev.value]
                            : events.filter((x) => x !== ev.value)
                        )
                      }
                      className="rounded accent-violet-600"
                    />
                    <span className="text-xs text-slate-600">{ev.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {addError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>
            )}
            {addSuccess && (
              <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                ✓ Webhook creado correctamente
              </p>
            )}

            <button
              type="submit"
              disabled={adding || events.length === 0}
              id="webhook-add-btn"
              className="w-full bg-violet-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? "Creando..." : "Crear webhook"}
            </button>
          </form>
        </div>

        {/* Payload example */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Ejemplo de payload</h2>
          </div>
          <pre className="bg-slate-950 text-slate-300 text-[11px] font-mono leading-relaxed px-6 py-5 overflow-x-auto">
{`// POST https://tu-servidor.com/webhook
// Headers:
//   Content-Type: application/json
//   X-InboxChat-Signature: sha256=<hmac-sha256>  (si configuraste secret)

{
  "event": "message.created",
  "timestamp": "2026-03-17T12:00:00.000Z",
  "data": {
    "message_id": "msg_abc123",
    "conversation_id": "conv_xyz456",
    "body": "Hola, ¿me pueden ayudar?",
    "sender": "contact"
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
