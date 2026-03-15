"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useInboxStore } from "@/store/inbox.store";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface SearchConv {
  id: string;
  status: "open" | "closed";
  contactName: string | null;
  contactEmail: string | null;
  snippet: string | null;
  updatedAt: string;
}

interface SearchContact {
  id: string;
  name: string | null;
  email: string | null;
  conversationCount: number;
}

interface SearchResults {
  conversations: SearchConv[];
  contacts: SearchContact[];
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * GlobalSearch — modal de búsqueda tipo Cmd+K
 * Busca conversaciones y contactos en paralelo con debounce 250ms.
 */
export function GlobalSearch({ open, onClose }: Props) {
  const router = useRouter();
  const { setActiveConversation, conversations } = useInboxStore();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({ conversations: [], contacts: [] });
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setQ("");
      setResults({ conversations: [], contacts: [] });
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!q.trim()) {
      setResults({ conversations: [], contacts: [] });
      return;
    }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const [convRes, contactRes] = await Promise.all([
          fetch(`${SERVER_URL}/api/conversations/search?q=${encodeURIComponent(q)}&limit=5`, { headers: getAuthHeaders() }),
          fetch(`${SERVER_URL}/api/contacts?q=${encodeURIComponent(q)}&limit=4`, { headers: getAuthHeaders() }),
        ]);
        const convData = convRes.ok
          ? (await convRes.json() as { conversations: SearchConv[] })
          : { conversations: [] };
        const contactData = contactRes.ok
          ? (await contactRes.json() as { contacts: SearchContact[] })
          : { contacts: [] };
        setResults({ conversations: convData.conversations ?? [], contacts: contactData.contacts ?? [] });
        setCursor(0);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  const allItems = [
    ...results.conversations.map((c) => ({ type: "conv" as const, data: c })),
    ...results.contacts.map((c) => ({ type: "contact" as const, data: c })),
  ];

  function selectConv(convId: string) {
    // Si la conv está en el store, la activa directamente
    const conv = conversations.find((c) => c.id === convId);
    if (conv) setActiveConversation(convId);
    onClose();
    router.push(`/inbox?conv=${convId}`);
  }

  function selectContact(contactId: string) {
    onClose();
    router.push(`/contacts/${contactId}`);
  }

  // Keyboard navigation
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, allItems.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && allItems[cursor]) {
      const item = allItems[cursor];
      if (item.type === "conv") selectConv(item.data.id);
      else selectContact(item.data.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, cursor]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar conversaciones, contactos..."
            className="flex-1 text-sm outline-none text-slate-900 placeholder:text-slate-400"
          />
          {loading && (
            <svg className="w-4 h-4 text-slate-300 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1 py-0.5 flex-shrink-0">Esc</kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto">
          {!q.trim() ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-slate-400">Escribí para buscar en conversaciones y contactos</p>
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="text-[10px] text-slate-300 flex items-center gap-1">
                  <kbd className="border border-slate-200 rounded px-1 py-0.5">↑↓</kbd> navegar
                </span>
                <span className="text-[10px] text-slate-300 flex items-center gap-1">
                  <kbd className="border border-slate-200 rounded px-1 py-0.5">Enter</kbd> abrir
                </span>
              </div>
            </div>
          ) : allItems.length === 0 && !loading ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-400">Sin resultados para <strong>&quot;{q}&quot;</strong></p>
            </div>
          ) : (
            <div className="py-1">
              {/* Conversaciones */}
              {results.conversations.length > 0 && (
                <>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Conversaciones
                  </p>
                  {results.conversations.map((conv) => {
                    const idx = globalIdx++;
                    const isActive = idx === cursor;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => selectConv(conv.id)}
                        onMouseEnter={() => setCursor(idx)}
                        className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                          isActive ? "bg-violet-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          conv.status === "open" ? "bg-emerald-400" : "bg-slate-300"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {conv.contactName ?? conv.contactEmail ?? "Visitante anónimo"}
                          </p>
                          {conv.snippet && (
                            <p className="text-xs text-slate-500 truncate">{conv.snippet}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(conv.updatedAt)}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Contactos */}
              {results.contacts.length > 0 && (
                <>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-50 mt-1">
                    Contactos
                  </p>
                  {results.contacts.map((contact) => {
                    const idx = globalIdx++;
                    const isActive = idx === cursor;
                    return (
                      <button
                        key={contact.id}
                        onClick={() => selectContact(contact.id)}
                        onMouseEnter={() => setCursor(idx)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                          isActive ? "bg-violet-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700 flex-shrink-0">
                          {(contact.name ?? contact.email ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {contact.name ?? contact.email ?? "Anónimo"}
                          </p>
                          {contact.email && contact.name && (
                            <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {contact.conversationCount} conv{contact.conversationCount !== 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
