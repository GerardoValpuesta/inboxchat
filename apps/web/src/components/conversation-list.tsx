"use client";

import Link from "next/link";
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

  function handleSelectConversation(conversationId: string) {
    setActiveConversation(conversationId);
    markConversationRead(conversationId);
  }

  return (
    <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Inbox</h1>
          <p className="text-xs text-slate-500">{conversations.length} conversaciones</p>
        </div>
        {/* Indicador de conexión */}
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-brand-500" : "bg-slate-300"
            )}
          />
          <span className="text-xs text-slate-500">
            {isConnected ? "conectado" : "sin conexión"}
          </span>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">Sin conversaciones</p>
            <p className="text-xs text-slate-400 mt-1">
              Cuando alguien abra el widget, aparecerá aquí
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
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
      </div>
    </aside>
  );
}
