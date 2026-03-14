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
  const socketRef = useSocket(workspaceId);
  const { setConversations, setMessages, activeConversationId } = useInboxStore();

  // Polling de conversaciones — carga inicial + refresca cada 5s.
  // No usamos un ref guard para evitar bloquear el re-setup del interval.
  // setConversations es una referencia estable de Zustand, por lo que el effect
  // solo monta una vez y el interval siempre queda activo.
  useEffect(() => {
    const loadConversations = () => {
      fetch(`${SERVER_URL}/api/conversations`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data: { conversations: Conversation[] }) => {
          setConversations(data.conversations ?? []);
        })
        .catch((err: unknown) => {
          console.error("[inbox] Error cargando conversaciones:", err);
        });
    };

    loadConversations();
    const interval = setInterval(loadConversations, 5_000);
    return () => clearInterval(interval);
  }, [setConversations]);

  // Cargar mensajes al seleccionar una conversación
  useEffect(() => {
    if (!activeConversationId) return;

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
      });
  }, [activeConversationId, setMessages]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ConversationList />
      <ChatPanel socketRef={socketRef} />
    </div>
  );
}
