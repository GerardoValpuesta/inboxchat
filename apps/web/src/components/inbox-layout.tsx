"use client";

import { useEffect, useRef } from "react";
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
    // Fallback para desarrollo sin auth configurada
    : { "X-Workspace-Key": "dev_key_inboxchat_local" };
}

interface InboxLayoutProps {
  workspaceId: string;
}

export function InboxLayout({ workspaceId }: InboxLayoutProps) {
  const socketRef = useSocket(workspaceId);
  const { setConversations, setMessages, activeConversationId } = useInboxStore();
  const loadedConversations = useRef(false);

  // Cargar conversaciones iniciales via REST al montar
  useEffect(() => {
    if (loadedConversations.current) return;
    loadedConversations.current = true;

    fetch(`${SERVER_URL}/api/conversations`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data: { conversations: Conversation[] }) => {
        setConversations(data.conversations ?? []);
      })
      .catch((err: unknown) => {
        console.error("[inbox] Error cargando conversaciones:", err);
        setConversations([]);
      });
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
