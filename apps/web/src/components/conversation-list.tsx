"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInboxStore, selectActiveConversation } from "@/store/inbox.store";
import { cn, getInitials, timeAgo, truncate } from "@/lib/utils";
import type { Conversation } from "@inboxchat/shared";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const { contact, lastMessage, unreadCount, updatedAt } = conversation;
  const displayName = contact.name ?? contact.email ?? "Visitante anónimo";
  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors",
        "border-b border-slate-100 hover:bg-slate-50",
        isActive && "bg-slate-100 hover:bg-slate-100"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold",
          isActive ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-600"
        )}
      >
        {getInitials(displayName)}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={cn(
              "text-sm truncate",
              hasUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"
            )}
          >
            {displayName}
          </span>
          <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
            {timeAgo(updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 truncate">
            {lastMessage
              ? `${lastMessage.sender === "operator" ? "Vos: " : ""}${truncate(lastMessage.body, 50)}`
              : "Sin mensajes"}
          </span>
          {hasUnread && (
            <span className="ml-2 flex-shrink-0 h-4 min-w-4 px-1 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Panel lateral izquierdo del inbox.
 * Muestra la lista de conversaciones ordenadas por última actividad.
 * Se suscribe al store de Zustand para actualizarse en tiempo real.
 */
export function ConversationList() {
  const conversations = useInboxStore((s) => s.conversations);
  const activeConversation = useInboxStore(selectActiveConversation);
  const setActiveConversation = useInboxStore((s) => s.setActiveConversation);
  const markConversationRead = useInboxStore((s) => s.markConversationRead);
  const isConnected = useInboxStore((s) => s.isConnected);
  const router = useRouter();
  const [filter, setFilter] = useState<"open" | "closed">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Conversation[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SERVER_URL = process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

  function getAuthHeaders(): HeadersInit {
    const token = typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
    return token
      ? { Authorization: `Bearer ${token}` }
      : { "X-Workspace-Key": "dev_key_inboxchat_local" };
  }

  // Debounce search — 300ms
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => {
      fetch(`${SERVER_URL}/api/conversations/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: getAuthHeaders(),
      })
        .then((r) => r.json())
        .then((data: { conversations: Conversation[] }) => {
          setSearchResults(data.conversations ?? []);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
  }, [searchQuery, SERVER_URL]);

  function handleSelectConversation(conversationId: string) {
    setActiveConversation(conversationId);
    markConversationRead(conversationId);
  }

  function handleLogout() {
    localStorage.removeItem("ic_token");
    document.cookie = "ic_token=; path=/; max-age=0; SameSite=Lax";
    router.push("/login");
  }

  const filtered = searchResults !== null
    ? searchResults
    : conversations.filter((c) =>
        filter === "open" ? c.status === "open" || !c.status : c.status === "closed"
      );

  return (
    <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-semibold text-slate-900">Inbox</h1>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-brand-500" : "bg-slate-300")} />
            <span className="text-xs text-slate-500">{isConnected ? "online" : "offline"}</span>
          </div>
        </div>
        {/* Search bar */}
        <div className="relative mb-3">
          <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearchQuery("")}
            placeholder="Buscar..."
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 transition-colors"
          />
          {isSearching && (
            <svg className="w-3 h-3 text-slate-400 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {searchQuery && !isSearching && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {/* Tabs open/closed */}
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setFilter("open")}
            className={cn(
              "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
              filter === "open" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Abiertas
          </button>
          <button
            onClick={() => setFilter("closed")}
            className={cn(
              "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
              filter === "closed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Resueltas
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">
              {filter === "open" ? "Sin conversaciones abiertas" : "Sin conversaciones resueltas"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === "open" ? "Cuando alguien abra el widget, aparecerá aquí" : "Las resueltas aparecerán aquí"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeConversation?.id === conv.id}
              onClick={() => handleSelectConversation(conv.id)}
            />
          ))
        )}
      </div>

      {/* Footer nav */}
      <div className="border-t border-slate-100 px-3 py-2 flex flex-col gap-0.5">
        <Link
          href="/analytics"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analytics
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Link>
        <Link
          href="/settings/billing"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Billing
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
