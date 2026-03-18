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
  const [widgetGdpr, setWidgetGdpr] = useState(false);

  // Team
  const [operators, setOperators] = useState<{ id: string; name: string; email: string }[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState("");

  // Canned Responses
  const [cannedResponses, setCannedResponses] = useState<{ id: string; shortcut: string; body: string }[]>([]);
  const [newShortcut, setNewShortcut] = useState("");
  const [newBody, setNewBody] = useState("");
  const [addingCanned, setAddingCanned] = useState(false);
  const [cannedError, setCannedError] = useState("");
  const [editingCannedId, setEditingCannedId] = useState<string | null>(null);
  const [editShortcut, setEditShortcut] = useState("");
  const [editBody, setEditBody] = useState("");

  // Business Hours
  type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  type DaySchedule = { open: string; close: string; enabled: boolean };
  const [bhEnabled, setBhEnabled] = useState(false);
  const [bhDays, setBhDays] = useState<Record<DayKey, DaySchedule>>({
    mon: { open: "09:00", close: "18:00", enabled: true },
    tue: { open: "09:00", close: "18:00", enabled: true },
    wed: { open: "09:00", close: "18:00", enabled: true },
    thu: { open: "09:00", close: "18:00", enabled: true },
    fri: { open: "09:00", close: "18:00", enabled: true },
    sat: { open: "10:00", close: "14:00", enabled: false },
    sun: { open: "10:00", close: "14:00", enabled: false },
  });
  const [bhOffMsg, setBhOffMsg] = useState("Estamos fuera de horario. Te responderemos el próximo día hábil.");
  const [bhTimezone, setBhTimezone] = useState("America/Mexico_City");
  const [savingBH, setSavingBH] = useState(false);
  const [bhSaved, setBhSaved] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks] = useState<{ id: string; url: string; events: string[]; enabled: boolean }[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [addingWebhook, setAddingWebhook] = useState(false);
  const [webhookError, setWebhookError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${SERVER_URL}/api/billing/status`, { headers: getAuthHeaders() as HeadersInit }),
      fetch(`${SERVER_URL}/api/workspace/me`, { headers: getAuthHeaders() as HeadersInit }),
    ])
      .then(async ([billingRes, meRes]) => {
        // Solo redirigir a login en 401, no en errores de red / 5xx
        if (billingRes.status === 401 || meRes.status === 401) {
          router.push("/login");
          return;
        }
        if (!billingRes.ok || !meRes.ok) {
          // Error de servicio — no redirigir, mostramos la página vacía
          setLoading(false);
          return;
        }
        const billing = await billingRes.json() as {
          plan: string;
          trialEndsAt: string | null;
          trialDaysLeft: number | null;
          isActive: boolean;
          conversationCount: number;
        };
        // Leer meRes.json() UNA SOLA VEZ — el body se consume y no puede leerse dos veces
        const me = await meRes.json() as {
          workspace: {
            name: string;
            ownerEmail: string;
            apiKey: string;
            businessHours?: Record<string, { open: string; close: string; enabled: boolean }> | null;
            timezone?: string;
          };
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
        if (me.workspace.apiKey) {
          const cfg = await fetch(`${SERVER_URL}/api/widget/config?key=${me.workspace.apiKey}`);
          if (cfg.ok) {
            const d = await cfg.json() as { title?: string; color?: string; welcomeMessage?: string; gdprEnabled?: boolean };
            if (d.title) setWidgetTitle(d.title);
            if (d.color) setWidgetColor(d.color);
            if (d.welcomeMessage) setWidgetWelcome(d.welcomeMessage);
            if (d.gdprEnabled !== undefined) setWidgetGdpr(d.gdprEnabled);
          }
        }
        // Cargar operadores
        const opsRes = await fetch(`${SERVER_URL}/api/operators`, { headers: getAuthHeaders() as HeadersInit });
        if (opsRes.ok) {
          const opsData = await opsRes.json() as { operators: { id: string; name: string; email: string }[] };
          setOperators(opsData.operators ?? []);
        }
        // Cargar canned responses
        const cannedRes = await fetch(`${SERVER_URL}/api/canned-responses`, { headers: getAuthHeaders() as HeadersInit });
        if (cannedRes.ok) {
          const cannedData = await cannedRes.json() as { cannedResponses: typeof cannedResponses };
          setCannedResponses(cannedData.cannedResponses ?? []);
        }
        // Business hours — extraer del me.workspace ya leído (no releer meRes)
        const bhRaw = me.workspace;
        if (bhRaw?.businessHours) {
          const bh = bhRaw.businessHours;
          setBhEnabled((bh as unknown as { enabled?: boolean }).enabled !== false);
          setBhDays((prev) => ({ ...prev, ...bh }));
          if ((bh as unknown as { offHoursMessage?: string }).offHoursMessage) {
            setBhOffMsg((bh as unknown as { offHoursMessage: string }).offHoursMessage);
          }
          if (bhRaw.timezone) setBhTimezone(bhRaw.timezone);
        }
        // Cargar webhooks
        const whRes = await fetch(`${SERVER_URL}/api/webhooks`, { headers: getAuthHeaders() as HeadersInit });
        if (whRes.ok) {
          const whData = await whRes.json() as { webhooks: typeof webhooks };
          setWebhooks(whData.webhooks ?? []);
        }
      })
      .catch((err) => {
        // Solo ir a login si hay un error específico de auth, no por errores de red
        console.error("[Settings] fetch error:", err);
      })
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
        body: JSON.stringify({ title: widgetTitle, color: widgetColor, welcomeMessage: widgetWelcome, gdprEnabled: widgetGdpr }),
      });
      setWidgetSaved(true);
      setTimeout(() => setWidgetSaved(false), 2000);
    } finally {
      setSavingWidget(false);
    }
  }

  async function saveBusinessHours() {
    setSavingBH(true);
    try {
      await fetch(`${SERVER_URL}/api/workspace/me`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          businessHours: { enabled: bhEnabled, days: bhDays, offHoursMessage: bhOffMsg },
          timezone: bhTimezone,
        }),
      });
      setBhSaved(true);
      setTimeout(() => setBhSaved(false), 2000);
    } finally {
      setSavingBH(false);
    }
  }

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault();
    setAddingWebhook(true);
    setWebhookError("");
    try {
      const res = await fetch(`${SERVER_URL}/api/webhooks`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ url: newWebhookUrl, ...(newWebhookSecret ? { secret: newWebhookSecret } : {}) }),
      });
      const d = await res.json() as { webhook?: { id: string; url: string; events: string[]; enabled: boolean }; error?: string };
      if (res.ok && d.webhook) {
        setWebhooks((prev) => [...prev, d.webhook!]);
        setNewWebhookUrl("");
        setNewWebhookSecret("");
      } else {
        setWebhookError(d.error ?? "Error al crear webhook");
      }
    } finally {
      setAddingWebhook(false);
    }
  }

  async function deleteWebhook(id: string) {
    await fetch(`${SERVER_URL}/api/webhooks/${id}`, { method: "DELETE", headers: getAuthHeaders() as HeadersInit });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    await fetch(`${SERVER_URL}/api/webhooks/${id}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, enabled } : w));
  }

  async function inviteOperator(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteSent("");
    try {
      const res = await fetch(`${SERVER_URL}/api/operators/invite`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName, email: inviteEmail }),
      });
      const d = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) {
        setInviteSent(inviteEmail);
        setInviteName("");
        setInviteEmail("");
        const opsRes = await fetch(`${SERVER_URL}/api/operators`, { headers: getAuthHeaders() as HeadersInit });
        if (opsRes.ok) {
          const opsData = await opsRes.json() as { operators: typeof operators };
          setOperators(opsData.operators ?? []);
        }
      } else {
        setInviteSent(`Error: ${d.error ?? "no se pudo invitar"}`);
      }
    } finally {
      setInviting(false);
    }
  }

  async function removeOperator(id: string) {
    await fetch(`${SERVER_URL}/api/operators/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders() as HeadersInit,
    });
    setOperators((prev) => prev.filter((op) => op.id !== id));
  }

  async function addCannedResponse(e: React.FormEvent) {
    e.preventDefault();
    setCannedError("");
    setAddingCanned(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/canned-responses`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ shortcut: newShortcut, body: newBody }),
      });
      const d = await res.json() as { cannedResponse?: { id: string; shortcut: string; body: string }; error?: string };
      if (res.ok && d.cannedResponse) {
        setCannedResponses((prev) => [...prev, d.cannedResponse!].sort((a, b) => a.shortcut.localeCompare(b.shortcut)));
        setNewShortcut("");
        setNewBody("");
      } else {
        setCannedError(d.error ?? "Error al crear");
      }
    } finally {
      setAddingCanned(false);
    }
  }

  async function deleteCannedResponse(id: string) {
    await fetch(`${SERVER_URL}/api/canned-responses/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders() as HeadersInit,
    });
    setCannedResponses((prev) => prev.filter((c) => c.id !== id));
  }

  async function saveCannedEdit(id: string) {
    const res = await fetch(`${SERVER_URL}/api/canned-responses/${id}`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ shortcut: editShortcut, body: editBody }),
    });
    if (res.ok) {
      setCannedResponses((prev) =>
        prev.map((c) => c.id === id ? { ...c, shortcut: editShortcut.replace(/^\//, "").trim().toLowerCase(), body: editBody.trim() } : c)
          .sort((a, b) => a.shortcut.localeCompare(b.shortcut))
      );
      setEditingCannedId(null);
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

          {/* Widget */}
          <Link
            href="/settings/widget"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between hover:border-violet-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                <svg className="w-4.5 h-4.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Widget</p>
                <p className="text-xs text-slate-500">Color, título, mensaje de bienvenida y GDPR</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Tags */}
          <Link
            href="/settings/tags"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between hover:border-violet-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                <svg className="w-4.5 h-4.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Tags</p>
                <p className="text-xs text-slate-500">Crear y gestionar tags para categorizar conversaciones</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Triggers — Mensajes proactivos */}
          <Link
            href="/settings/triggers"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between hover:border-violet-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <svg className="w-4.5 h-4.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Mensajes proactivos</p>
                <p className="text-xs text-slate-500">Enviar mensajes automáticos al visitante según la página y el tiempo</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* API */}
          <Link
            href="/settings/api"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between hover:border-violet-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <svg className="w-4.5 h-4.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">API</p>
                <p className="text-xs text-slate-500">API Key y documentación de la REST API pública</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Notificaciones */}
          <Link
            href="/settings/notifications"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between hover:border-violet-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <svg className="w-4.5 h-4.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
                <p className="text-xs text-slate-500">Alertas SLA y permisos de notificación del browser</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Team */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">Equipo</h2>
            <p className="text-xs text-slate-500 mb-4">Invitá agentes para que respondan chats.</p>
            <div className="space-y-2 mb-4">
              {operators.map((op) => (
                <div key={op.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{op.name}</p>
                    <p className="text-xs text-slate-500">{op.email}</p>
                  </div>
                  <button
                    onClick={() => void removeOperator(op.id)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
              {operators.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Solo vos en el equipo.</p>}
            </div>
            <form onSubmit={(e) => void inviteOperator(e)} className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-600">Invitar nuevo agente</p>
              <div className="flex gap-2">
                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nombre" required
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-violet-400" />
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@agente.com" required
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-violet-400" />
                <button type="submit" disabled={inviting}
                  className="px-3 py-2 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 whitespace-nowrap">
                  {inviting ? "Enviando..." : "Invitar"}
                </button>
              </div>
              {inviteSent && (
                <p className={`text-xs ${inviteSent.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>
                  {inviteSent.startsWith("Error") ? inviteSent : `✓ Invitación enviada a ${inviteSent}`}
                </p>
              )}
            </form>
          </div>

          {/* Canned Responses */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-1">Respuestas rápidas</h2>
            <p className="text-xs text-slate-500 mb-4">Escribí <kbd className="bg-slate-100 px-1 rounded font-mono">/shortcut</kbd> en el chat para insertar estas respuestas al instante.</p>

            {/* Lista */}
            <div className="space-y-2 mb-4">
              {cannedResponses.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">Sin respuestas rápidas. Creá la primera abajo.</p>
              )}
              {cannedResponses.map((c) =>
                editingCannedId === c.id ? (
                  <div key={c.id} className="flex flex-col gap-2 p-3 rounded-xl border border-violet-300 bg-violet-50">
                    <div className="flex gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">/</span>
                        <input
                          value={editShortcut}
                          onChange={(e) => setEditShortcut(e.target.value)}
                          className="pl-5 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-violet-400 w-28 font-mono"
                          placeholder="shortcut"
                        />
                      </div>
                      <input
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-violet-400"
                        placeholder="Texto de la respuesta"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingCannedId(null)} className="text-xs text-slate-500 px-2 py-1 hover:text-slate-700">Cancelar</button>
                      <button
                        onClick={() => void saveCannedEdit(c.id)}
                        className="text-xs font-semibold bg-violet-600 text-white px-3 py-1 rounded-lg hover:bg-violet-700"
                      >Guardar</button>
                    </div>
                  </div>
                ) : (
                  <div key={c.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 group">
                    <kbd className="text-xs font-mono text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded flex-shrink-0">/{c.shortcut}</kbd>
                    <span className="text-xs text-slate-600 flex-1 truncate">{c.body}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingCannedId(c.id); setEditShortcut(c.shortcut); setEditBody(c.body); }}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100"
                      >Editar</button>
                      <button
                        onClick={() => void deleteCannedResponse(c.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                      >Borrar</button>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Formulario nueva respuesta */}
            <form onSubmit={(e) => void addCannedResponse(e)} className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-600 mb-2">Nueva respuesta rápida</p>
              <div className="flex gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">/</span>
                  <input
                    type="text"
                    value={newShortcut}
                    onChange={(e) => setNewShortcut(e.target.value)}
                    placeholder="shortcut"
                    required
                    className="pl-5 pr-2 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-violet-400 w-28 font-mono"
                  />
                </div>
                <input
                  type="text"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Hola! ¿En qué te puedo ayudar?"
                  required
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-violet-400"
                />
                <button
                  type="submit"
                  disabled={addingCanned}
                  className="px-3 py-2 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {addingCanned ? "..." : "+ Agregar"}
                </button>
              </div>
              {cannedError && <p className="text-xs text-red-500 mt-1">{cannedError}</p>}
            </form>
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
                {/* Toggle GDPR */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-medium text-slate-700">Solicitar consentimiento GDPR</p>
                    <p className="text-xs text-slate-400 mt-0.5">Muestra un checkbox en el pre-chat form</p>
                  </div>
                  <button
                    onClick={() => setWidgetGdpr(!widgetGdpr)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${widgetGdpr ? "bg-violet-600" : "bg-slate-200"}`}
                    role="switch"
                    aria-checked={widgetGdpr}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${widgetGdpr ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
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

          {/* Business Hours */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Horarios de Atención</h2>
                <p className="text-xs text-slate-500 mt-0.5">El widget mostrará un mensaje Off-hours fuera del horario configurado</p>
              </div>
              <button
                onClick={() => setBhEnabled((v) => !v)}
                className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${bhEnabled ? "bg-violet-600" : "bg-slate-300"}`}
                style={{ width: 40, height: 22 }}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${bhEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {bhEnabled && (
              <>
                {/* Timezone */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Zona horaria</label>
                  <select
                    value={bhTimezone}
                    onChange={(e) => setBhTimezone(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white"
                  >
                    {["America/Mexico_City","America/Bogota","America/Buenos_Aires","America/Santiago","America/Lima","America/Caracas","America/New_York","America/Los_Angeles","Europe/Madrid","UTC"].map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                {/* Días */}
                <div className="space-y-2 mb-4">
                  {(["mon","tue","wed","thu","fri","sat","sun"] as const).map((day) => {
                    const labels: Record<string, string> = { mon:"Lunes", tue:"Martes", wed:"Miércoles", thu:"Jueves", fri:"Viernes", sat:"Sábado", sun:"Domingo" };
                    const d = bhDays[day];
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <button
                          onClick={() => setBhDays((prev) => ({ ...prev, [day]: { ...prev[day]!, enabled: !prev[day]!.enabled } }))}
                          className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${d.enabled ? "bg-violet-500" : "bg-slate-200"}`}
                          style={{ minWidth: 32, height: 18 }}
                        >
                          <span className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${d.enabled ? "translate-x-3.5" : "translate-x-0.5"}`} />
                        </button>
                        <span className={`text-xs w-20 flex-shrink-0 ${d.enabled ? "text-slate-700 font-medium" : "text-slate-400"}`}>{labels[day]}</span>
                        {d.enabled && (
                          <>
                            <input type="time" value={d.open} onChange={(e) => setBhDays((prev) => ({ ...prev, [day]: { ...prev[day]!, open: e.target.value } }))}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 w-24" />
                            <span className="text-xs text-slate-400">a</span>
                            <input type="time" value={d.close} onChange={(e) => setBhDays((prev) => ({ ...prev, [day]: { ...prev[day]!, close: e.target.value } }))}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 w-24" />
                          </>
                        )}
                        {!d.enabled && <span className="text-xs text-slate-400 italic">Cerrado</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Mensaje off-hours */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Mensaje fuera de horario</label>
                  <textarea
                    value={bhOffMsg}
                    onChange={(e) => setBhOffMsg(e.target.value)}
                    rows={2}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700 resize-none"
                  />
                </div>
              </>
            )}

            <button
              onClick={() => void saveBusinessHours()}
              disabled={savingBH}
              className="mt-1 px-4 py-2 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {bhSaved ? "✓ Guardado" : savingBH ? "Guardando..." : "Guardar horarios"}
            </button>
          </div>

          {/* Webhooks salientes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-1">Webhooks Salientes</h2>
            <p className="text-xs text-slate-500 mb-4">Recibí un POST en tu URL con cada mensaje nuevo. Usá el secret para validar con HMAC-SHA256.</p>

            {/* Lista de webhooks existentes */}
            {webhooks.length > 0 && (
              <div className="space-y-2 mb-4">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${wh.enabled ? "bg-emerald-400" : "bg-slate-300"}`} />
                    <code className="text-xs font-mono text-slate-700 flex-1 truncate">{wh.url}</code>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{wh.events.join(", ")}</span>
                    <button
                      onClick={() => void toggleWebhook(wh.id, !wh.enabled)}
                      className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors flex-shrink-0 ${
                        wh.enabled ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      }`}
                    >
                      {wh.enabled ? "Pausar" : "Activar"}
                    </button>
                    <button
                      onClick={() => void deleteWebhook(wh.id)}
                      className="text-[10px] px-2 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 font-medium transition-colors flex-shrink-0"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar nuevo webhook */}
            <form onSubmit={(e) => { void addWebhook(e); }} className="space-y-2">
              <input
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://tu-servidor.com/webhook"
                required
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              />
              <input
                type="text"
                value={newWebhookSecret}
                onChange={(e) => setNewWebhookSecret(e.target.value)}
                placeholder="Secret opcional (para HMAC-SHA256)"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              />
              {webhookError && <p className="text-xs text-red-500">{webhookError}</p>}
              <button
                type="submit"
                disabled={addingWebhook}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {addingWebhook ? "Agregando..." : "+ Agregar webhook"}
              </button>
            </form>
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
