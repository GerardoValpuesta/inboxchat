"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  externalId: string | null;
  lastSeenAt: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: string | null;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "hace un momento";
  if (secs < 3600) return `hace ${Math.floor(secs / 60)} min`;
  if (secs < 86400) return `hace ${Math.floor(secs / 3600)} h`;
  if (secs < 604800) return `hace ${Math.floor(secs / 86400)} días`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function Avatar({ name, email, size = "lg" }: { name: string | null; email: string | null; size?: "sm" | "lg" }) {
  const label = name?.charAt(0) ?? email?.charAt(0) ?? "?";
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ];
  const idx = (name ?? email ?? "").charCodeAt(0) % colors.length;
  const sizeClass = size === "lg" ? "w-14 h-14 text-xl" : "w-8 h-8 text-sm";
  return (
    <div className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${colors[idx]} ${sizeClass}`}>
      {label.toUpperCase()}
    </div>
  );
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/contacts/${id}`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        if (r.status === 404) { router.push("/contacts"); return null; }
        return r.json() as Promise<{ contact: Contact; conversations: Conversation[] }>;
      })
      .then((d) => {
        if (d) {
          setContact(d.contact);
          setConversations(d.conversations);
          setEditForm({ name: d.contact.name ?? "", email: d.contact.email ?? "" });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, router]);

  async function saveEdit() {
    if (!contact) return;
    setSaving(true);
    try {
      await fetch(`${SERVER_URL}/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name || undefined, email: editForm.email || undefined }),
      });
      setContact((c) => c ? { ...c, name: editForm.name || c.name, email: editForm.email || c.email } : c);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-7 h-7 text-slate-300 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs text-slate-400">Cargando contacto...</p>
        </div>
      </div>
    );
  }

  if (!contact) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/contacts")}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-slate-900 truncate">
            {contact.name ?? contact.email ?? "Visitante anónimo"}
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {/* Perfil */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-5">
            <Avatar name={contact.name} email={contact.email} />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {contact.name ?? "Sin nombre"}
              </h2>
              <p className="text-sm text-slate-500 truncate">{contact.email ?? "Sin email"}</p>
              {contact.externalId && (
                <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {contact.externalId}</p>
              )}
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors px-3 py-1.5 rounded-lg border border-violet-200 hover:border-violet-300 flex-shrink-0"
            >
              {editing ? "Cancelar" : "Editar"}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre del contacto"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-violet-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@ejemplo.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-violet-400 transition-colors"
                />
              </div>
              <button
                onClick={() => void saveEdit()}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Primera visita</p>
                <p className="text-sm font-medium text-slate-700">{timeAgo(contact.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Última actividad</p>
                <p className="text-sm font-medium text-slate-700">{timeAgo(contact.lastSeenAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Conversaciones</p>
                <p className="text-sm font-medium text-slate-700">{conversations.length}</p>
              </div>
              {contact.externalId && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">ID externo</p>
                  <p className="text-sm font-mono text-slate-700 truncate">{contact.externalId}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Historial de conversaciones */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Conversaciones</h3>
          </div>
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-400">Sin conversaciones previas</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/inbox?conv=${conv.id}`}
                  className="px-6 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors group"
                >
                  <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${conv.status === "open" ? "bg-emerald-400" : "bg-slate-300"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">
                      {conv.lastMessage ?? "Sin mensajes"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        conv.status === "open"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {conv.status === "open" ? "Abierta" : "Cerrada"}
                      </span>
                      <span className="text-[10px] text-slate-400">{conv.messageCount} mensajes</span>
                      <span className="text-[10px] text-slate-400">{timeAgo(conv.updatedAt)}</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
