"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useInboxStore } from "@/store/inbox.store";
import { ConversationList } from "@/components/conversation-list";
import { ChatPanel } from "@/components/chat-panel";
import { TrialBanner } from "@/components/trial-banner";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { ContactPanel } from "@/components/contact-panel";
import { useInboxKeyboard } from "@/hooks/use-inbox-keyboard";
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
  const {
    setConversations,
    setMessages,
    setLoadingMessages,
    setActiveConversation,
    activeConversationId,
    conversations,
  } = useInboxStore();

  const [showContactPanel, setShowContactPanel] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const slaNotifiedRef = useRef<Set<string>>(new Set()); // convIds ya notificadas en esta sesión

  // Billing + workspace status para el TrialBanner y OnboardingChecklist
  const [billingInfo, setBillingInfo] = useState<{
    trialDaysLeft: number | null;
    isActive: boolean;
    conversationCount: number;
    apiKey: string;
    hasOperators: boolean;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${SERVER_URL}/api/billing/status`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${SERVER_URL}/api/workspace/me`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${SERVER_URL}/api/operators`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ]).then(([billing, me, ops]: [
      { trialDaysLeft: number | null; isActive: boolean; conversationCount: number },
      { workspace: { apiKey: string } },
      { operators: unknown[] },
    ]) => {
      setBillingInfo({
        trialDaysLeft: billing.trialDaysLeft,
        isActive: billing.isActive,
        conversationCount: billing.conversationCount,
        apiKey: me.workspace.apiKey,
        hasOperators: (ops.operators ?? []).length > 1,
      });
    }).catch(() => {/* silenciar */});
  }, []);

  // Polling de conversaciones — carga inicial + refresca cada 5s.
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
          console.error("[inbox] poll error:", err);
        });
    };

    loadConversations();
    const interval = setInterval(loadConversations, 5_000);
    return () => clearInterval(interval);
  }, [setConversations]);

  // ── SLA Alert: notificar si una conv lleva más de 10min sin respuesta ──────
  useEffect(() => {
    const SLA_MINUTES = 10;
    const checkSLA = () => {
      if (Notification.permission !== "granted") return;
      conversations.forEach((conv) => {
        if (conv.status === "closed") return;
        const lm = (conv as unknown as { lastMessage?: { sender: string; createdAt: string } }).lastMessage;
        if (!lm) return;
        // Solo alertar si el último mensaje es del visitante (no del operador)
        if (lm.sender === "operator" || lm.sender === "note") return;
        const ageMs = Date.now() - new Date(lm.createdAt).getTime();
        const ageMins = ageMs / 1000 / 60;
        if (ageMins < SLA_MINUTES) return;
        // Ya notificamos esta conv en esta sesión
        if (slaNotifiedRef.current.has(conv.id)) return;
        // No notificar si el operador ya tiene esta conv activa
        if (conv.id === activeConversationId) return;
        slaNotifiedRef.current.add(conv.id);
        const contact = (conv as unknown as { contact?: { name?: string; email?: string } }).contact;
        const who = contact?.name ?? contact?.email ?? "Visitante";
        void new Notification("⏰ Conversación sin respuesta", {
          body: `${who} lleva +${SLA_MINUTES} min esperando respuesta`,
          icon: "/favicon.ico",
          tag: `sla-${conv.id}`,
        });
      });
    };
    const id = setInterval(checkSLA, 60_000);
    return () => clearInterval(id);
  }, [conversations, activeConversationId]);

  // Cargar mensajes al seleccionar una conversación
  useEffect(() => {
    if (!activeConversationId) {
      setShowContactPanel(false);
      return;
    }

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

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleSelectFromHistory = useCallback((convId: string) => {
    setActiveConversation(convId);
    setShowContactPanel(false);
  }, [setActiveConversation]);

  // Keyboard shortcuts globales del inbox
  useInboxKeyboard({
    onSearch: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    onEscape: () => {
      if (showContactPanel) {
        setShowContactPanel(false);
      } else {
        setActiveConversation(null);
      }
    },
    onResolve: () => {
      if (!activeConversationId) return;
      const token = typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
      if (!token) return;
      void fetch(`${SERVER_URL}/api/conversations/${activeConversationId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      }).then(() => {
        // Actualizar la lista de conversaciones
        const loadConversations = () => fetch(`${SERVER_URL}/api/conversations`, {
          headers: getAuthHeaders(), cache: "no-store",
        }).then((r) => r.json()).then((data: { conversations: Conversation[] }) => {
          setConversations(data.conversations ?? []);
        }).catch(() => {/* silenciar */});
        void loadConversations();
      });
    },
  });

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-50">
      {/* Trial banner — sticky, full width */}
      {billingInfo && (
        <TrialBanner
          trialDaysLeft={billingInfo.trialDaysLeft}
          isActive={billingInfo.isActive}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`
          flex-shrink-0 w-full md:w-72
          ${activeConversationId ? "hidden md:flex" : "flex"}
          flex-col overflow-hidden
        `}>
          {billingInfo && conversations.length <= 3 && (
            <OnboardingChecklist
              conversationCount={billingInfo.conversationCount}
              hasOperators={billingInfo.hasOperators}
              apiKey={billingInfo.apiKey}
            />
          )}
          <ConversationList searchInputRef={searchInputRef} />
        </div>

        {/* Chat panel — columna 2 */}
        <div className={`
          flex-1 min-w-0
          ${activeConversationId ? "flex" : "hidden md:flex"}
          flex-col
        `}>
          <ChatPanel
            socketRef={socketRef}
            typingMapRef={typingMapRef}
            onToggleContact={() => setShowContactPanel((v) => !v)}
            showContactPanel={showContactPanel}
          />
        </div>

        {/* Contact detail panel — columna 3 */}
        {showContactPanel && activeConversation && (
          <ContactPanel
            contactId={activeConversation.contact.id}
            contactName={
              activeConversation.contact.name ??
              activeConversation.contact.email ??
              "Visitante"
            }
            onClose={() => setShowContactPanel(false)}
            onSelectConversation={handleSelectFromHistory}
          />
        )}
      </div>
    </div>
  );
}
