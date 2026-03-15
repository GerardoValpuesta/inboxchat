"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, getInitials, timeAgo, truncate } from "@/lib/utils";
import { ConvTagsPanel } from "@/components/conv-tags-panel";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ContactData {
  id: string;
  name: string | null;
  email: string | null;
  externalId: string | null;
  lastSeenAt: string;
  createdAt: string;
}

interface PrevConversation {
  id: string;
  status: "open" | "closed";
  createdAt: string;
  messageCount: number;
  lastMessage: string | null;
}

interface Props {
  contactId: string;
  contactName: string;
  conversationId: string;
  onClose: () => void;
  onSelectConversation: (convId: string) => void;
}

export function ContactPanel({ contactId, contactName, conversationId, onClose, onSelectConversation }: Props) {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [conversations, setConversations] = useState<PrevConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${SERVER_URL}/api/contacts/${contactId}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data: { contact: ContactData; conversations: PrevConversation[] }) => {
        setContact(data.contact);
        setConversations(data.conversations ?? []);
      })
      .catch(() => {/* silenciar */})
      .finally(() => setLoading(false));
  }, [contactId]);

  useEffect(() => { load(); }, [load]);

  const initials = getInitials(contactName);

  return (
    <aside className="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contacto</span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar panel de contacto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <svg className="w-5 h-5 text-slate-300 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <>
            {/* Perfil del contacto */}
            <div className="px-4 py-5 border-b border-slate-100">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-lg font-bold text-violet-700 mb-3">
                  {initials}
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {contact?.name ?? contact?.email ?? "Visitante anónimo"}
                </h2>
                {contact?.email && contact.name && (
                  <p className="text-xs text-slate-500 mt-0.5">{contact.email}</p>
                )}
              </div>

              <div className="space-y-2">
                {contact?.externalId && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">ID externo</span>
                    <code className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono max-w-[140px] truncate">
                      {contact.externalId}
                    </code>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Primer contacto</span>
                  <span className="text-xs text-slate-600">
                    {contact?.createdAt
                      ? new Date(contact.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Última visita</span>
                  <span className="text-xs text-slate-600">
                    {contact?.lastSeenAt ? timeAgo(contact.lastSeenAt) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Conversaciones</span>
                  <span className="text-xs font-medium text-slate-700">{conversations.length}</span>
                </div>
              </div>
            </div>

            {/* Tags de la conversación actual */}
            <ConvTagsPanel conversationId={conversationId} />

            {/* Historial de conversaciones */}
            <div className="px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Historial
              </h3>
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin historial previo</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                          conv.status === "open"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        )}>
                          {conv.status === "open" ? "Abierta" : "Resuelta"}
                        </span>
                        <span className="text-[10px] text-slate-400">{timeAgo(conv.createdAt)}</span>
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-slate-500 truncate">{truncate(conv.lastMessage, 55)}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">{conv.messageCount} mensajes</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
