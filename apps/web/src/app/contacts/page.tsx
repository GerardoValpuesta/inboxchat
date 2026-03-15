"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  conversationCount: number;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "hace un momento";
  if (secs < 3600) return `hace ${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `hace ${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `hace ${Math.floor(secs / 86400)}d`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function Avatar({ name, email }: { name: string | null; email: string | null }) {
  const label = name?.charAt(0) ?? email?.charAt(0) ?? "?";
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ];
  const idx = (name ?? email ?? "").charCodeAt(0) % colors.length;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colors[idx]}`}>
      {label.toUpperCase()}
    </div>
  );
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (query: string, off: number, replace = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (query) params.set("q", query);
      const res = await fetch(`${SERVER_URL}/api/contacts?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json() as { contacts: Contact[] };
      const rows = data.contacts ?? [];
      setContacts((prev) => replace ? rows : [...prev, ...rows]);
      setHasMore(rows.length === LIMIT);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Carga inicial
  useEffect(() => {
    void load("", 0, true);
  }, [load]);

  // Búsqueda con debounce 300ms
  useEffect(() => {
    const id = setTimeout(() => {
      setOffset(0);
      void load(q, 0, true);
    }, 300);
    return () => clearTimeout(id);
  }, [q, load]);

  function loadMore() {
    const next = offset + LIMIT;
    setOffset(next);
    void load(q, next);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/inbox")}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-slate-900">Contactos</h1>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {contacts.length}{hasMore ? "+" : ""} registros
            </span>
          </div>
          <div className="relative max-w-xs w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-violet-400 transition-colors bg-slate-50"
            />
          </div>
          <button
            onClick={async () => {
              const token = typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
              const res = await fetch(`${SERVER_URL}/api/contacts/export`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!res.ok) return;
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {loading && contacts.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-32" />
                    <div className="h-2.5 bg-slate-100 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-slate-500 font-medium">
              {q ? `Sin resultados para "${q}"` : "Todavía no hay contactos"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Los contactos se crean automáticamente cuando alguien inicia un chat.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {contacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 hover:border-violet-200 hover:shadow-sm transition-all group"
                >
                  <Avatar name={contact.name} email={contact.email} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {contact.name ?? contact.email ?? "Visitante anónimo"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {contact.email && contact.name ? contact.email : contact.externalId ? `ID: ${contact.externalId}` : "Sin email"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{contact.conversationCount}</p>
                      <p className="text-[10px] text-slate-400">conv{contact.conversationCount !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-slate-500">{timeAgo(contact.lastSeenAt)}</p>
                      <p className="text-[10px] text-slate-400">última vez</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Cargando..." : "Cargar más"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
