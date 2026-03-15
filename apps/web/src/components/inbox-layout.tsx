"use client";

import { useEffect } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useInboxStore } from "@/store/inbox.store";
import { ConversationList } from "@/components/conversation-list";
import { ChatPanel } from "@/components/chat-panel";
import type { Conversation, Message } from "@inboxchat/shared";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token
    ? { Authorization: `Bearer ${token}` }
    : { "X-Workspace-Key": "dev_key_inboxchat_local" };
}

interface InboxLayoutProps {
  workspaceId: string;
}

export function InboxLayout({ workspaceId }: InboxLayoutProps) {
  const { socketRef, typingMapRef } = useSocket(workspaceId);
  const { setConversations, setMessages, setLoadingMessages, activeConversationId } = useInboxStore();

  // Polling de conversaciones — carga inicial + refresca cada 5s.
  // No usamos un ref guard para evitar bloquear el re-setup del interval.
  // setConversations es una referencia estable de Zustand, por lo que el effect
  // solo monta una vez y el interval siempre queda activo.
  useEffect(() => {
    const loadConversations = () => {
      console.log("[inbox] polling /api/conversations...");
      fetch(`${SERVER_URL}/api/conversations`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
        .then((r) => {
          console.log("[inbox] poll status:", r.status);
          return r.json();
        })
        .then((data: { conversations: Conversation[] }) => {
          console.log("[inbox] conversations received:", data.conversations?.length ?? 0);
          setConversations(data.conversations ?? []);
        })
        .catch((err: unknown) => {
          console.error("[inbox] poll error:", err);
        });
    };

    loadConversations();
    const interval = setInterval(loadConversations, 5_000);
    return () => clearInterval(interval);
  }, [setConversations]);

  // Cargar mensajes al seleccionar una conversación
  useEffect(() => {
    if (!activeConversationId) return;

    setLoadingMessages(true);
    fetch(
      `${SERVER_URL}/api/conversations/${activeConversationId}/messages`,
      { headers: getAuthHeaders() }
    )
      .then((r) => r.json())
      .then((data: { messages: Message[] }) => {
        setMessages(data.messages ?? []);
      })
      .catch((err: unknown) => {
        console.error("[inbox] Error cargando mensajes:", err);
      })
      .finally(() => {
        setLoadingMessages(false);
      });
  }, [activeConversationId, setMessages, setLoadingMessages]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50">
      {/* Sidebar — full width on mobile when NO active conv, hidden when conv is active */}
      <div className={`
        flex-shrink-0 w-full md:w-72
        ${activeConversationId ? "hidden md:flex" : "flex"}
        flex-col
      `}>
        <ConversationList />
      </div>
      {/* Chat panel — hidden on mobile when no active conv, full width when there is one */}
      <div className={`
        flex-1 min-w-0
        ${activeConversationId ? "flex" : "hidden md:flex"}
        flex-col
      `}>
        <ChatPanel socketRef={socketRef} typingMapRef={typingMapRef} />
      </div>
    </div>
  );
}
