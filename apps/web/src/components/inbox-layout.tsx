"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useSocket } from "@/hooks/use-socket";
import { useInboxStore } from "@/store/inbox.store";
import { TrialBanner } from "@/components/trial-banner";
import { useInboxKeyboard } from "@/hooks/use-inbox-keyboard";
import type { Conversation, Message } from "@inboxchat/shared";

// ─── Lazy-loaded (heavy components) ─────────────────────────────────────────
const ConversationList = dynamic(
  () => import("@/components/conversation-list").then((m) => m.ConversationList),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    ),
  }
);

const ChatPanel = dynamic(
  () => import("@/components/chat-panel").then((m) => m.ChatPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="w-6 h-6 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
      </div>
    ),
  }
);

const ContactPanel = dynamic(
  () => import("@/components/contact-panel").then((m) => m.ContactPanel),
  { ssr: false, loading: () => null }
);

const GlobalSearch = dynamic(
  () => import("@/components/global-search").then((m) => m.GlobalSearch),
  { ssr: false, loading: () => null }
);

const OnboardingChecklist = dynamic(
  () => import("@/components/onboarding-checklist").then((m) => m.OnboardingChecklist),
  { ssr: false, loading: () => null }
);

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
  const { socketRef, typingMapRef, previewMapRef } = useSocket(workspaceId);
  const {
    setConversations,
    appendConversations,
    setMessages,
    setLoadingMessages,
    setActiveConversation,
    setConversationTab,
    activeConversationId,
    conversationTab,
    conversations,
    hasMoreConversations,
    nextCursor,
  } = useInboxStore();

  const [showContactPanel, setShowContactPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const slaNotifiedRef = useRef<Set<string>>(new Set()); // convIds ya notificadas en esta sesión

  // Cmd+K / Ctrl+K — abrir búsqueda global
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Billing + workspace status para el TrialBanner y OnboardingChecklist
  const [billingInfo, setBillingInfo] = useState<{
    trialDaysLeft: number | null;
    isActive: boolean;
    conversationCount: number;
    apiKey: string;
    hasOperators: boolean;
    slaMinutes: number;
    plan: string;
    // Activación real desde workspace_events
    widgetInstalled: boolean;
    firstChatReceived: boolean;
    agentInvited: boolean;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${SERVER_URL}/api/billing/status`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${SERVER_URL}/api/workspace/me`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${SERVER_URL}/api/operators`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${SERVER_URL}/api/workspace/activation`, { headers: getAuthHeaders() }).then((r) => r.json()).catch(() => null),
    ]).then(([billing, me, ops, activation]: [
      { trialDaysLeft: number | null; isActive: boolean; conversationCount: number },
      { workspace: { apiKey: string; slaMinutes?: number; plan?: string } },
      { operators: unknown[] },
      { activation?: { widgetInstalled: boolean; firstMessageAt: string | null; agentInvited: boolean } } | null,
    ]) => {
      setBillingInfo({
        trialDaysLeft: billing.trialDaysLeft,
        isActive: billing.isActive,
        conversationCount: billing.conversationCount,
        apiKey: me.workspace.apiKey,
        hasOperators: (ops.operators ?? []).length > 1,
        slaMinutes: me.workspace.slaMinutes ?? 10,
        plan: me.workspace.plan ?? "free",
        // Preferir datos reales de workspace_events; fallback a conversationCount
        widgetInstalled: activation?.activation?.widgetInstalled ?? billing.conversationCount > 0,
        firstChatReceived: (activation?.activation?.firstMessageAt != null) || billing.conversationCount > 0,
        agentInvited: activation?.activation?.agentInvited ?? (ops.operators ?? []).length > 1,
      });
    }).catch(() => {/* silenciar */});
  }, []);

  // Polling de conversaciones — carga inicial + refresca cada 5s.
  useEffect(() => {
    const loadConversations = () => {
      fetch(`${SERVER_URL}/api/conversations?status=${conversationTab}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data: { conversations: Conversation[]; hasMore: boolean; nextCursor: string | null }) => {
          setConversations(data.conversations ?? []);
          if (data.hasMore !== undefined) {
            // Actualizar hasMore y nextCursor via appendConversations reset
            appendConversations([], data.hasMore, data.nextCursor ?? null);
          }
        })
        .catch((err: unknown) => {
          console.error("[inbox] poll error:", err);
        });
    };

    loadConversations();
    // Solo hacer polling en tab de abiertas (las cerradas no cambian constantemente)
    if (conversationTab === "open") {
      const interval = setInterval(loadConversations, 5_000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [setConversations, appendConversations, conversationTab]);

  // ── SLA Alert: notificar si una conv lleva más del threshold sin respuesta ──
  useEffect(() => {
    const SLA_MINUTES = billingInfo?.slaMinutes ?? 10;
    const checkSLA = () => {
      if (Notification.permission !== "granted") return;
      conversations.forEach((conv) => {
        if (conv.status === "closed") return;
        const lm = (conv as unknown as { lastMessage?: { sender: string; createdAt: string } }).lastMessage;
        if (!lm) return;
        if (lm.sender === "operator" || lm.sender === "note") return;
        const ageMs = Date.now() - new Date(lm.createdAt).getTime();
        const ageMins = ageMs / 1000 / 60;
        if (ageMins < SLA_MINUTES) return;
        if (slaNotifiedRef.current.has(conv.id)) return;
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
  }, [conversations, activeConversationId, billingInfo?.slaMinutes]);

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
    <>
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
          {billingInfo && !(billingInfo.widgetInstalled && billingInfo.firstChatReceived && billingInfo.agentInvited) && (
            <OnboardingChecklist
              conversationCount={billingInfo.conversationCount}
              hasOperators={billingInfo.agentInvited}
              apiKey={billingInfo.apiKey}
              widgetInstalled={billingInfo.widgetInstalled}
              firstChatReceived={billingInfo.firstChatReceived}
              agentInvited={billingInfo.agentInvited}
            />
          )}
          {/* Tabs: Abiertas / Resueltas */}
          <div className="flex border-b border-slate-200 bg-white px-3 pt-2 gap-1 flex-shrink-0">
            {(["open", "closed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setConversationTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${
                  conversationTab === tab
                    ? "text-violet-700 border-b-2 border-violet-600 bg-violet-50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "open" ? "Abiertas" : "Resueltas"}
                {tab === "open" && conversations.filter((c) => c.status === "open").length > 0 && (
                  <span className="ml-1.5 bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {conversations.filter((c) => c.status === "open").length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <ConversationList searchInputRef={searchInputRef} />
          {/* Cargar más conversaciones */}
          {hasMoreConversations && nextCursor && (
            <div className="px-3 py-2 flex-shrink-0 border-t border-slate-200 bg-white">
              <button
                onClick={() => {
                  fetch(`${SERVER_URL}/api/conversations?status=${conversationTab}&cursor=${encodeURIComponent(nextCursor)}`, {
                    headers: getAuthHeaders(),
                    cache: "no-store",
                  })
                    .then((r) => r.json())
                    .then((data: { conversations: Conversation[]; hasMore: boolean; nextCursor: string | null }) => {
                      appendConversations(data.conversations ?? [], data.hasMore, data.nextCursor ?? null);
                    })
                    .catch(console.error);
                }}
                className="w-full text-xs text-slate-500 hover:text-violet-600 font-medium py-1 transition-colors"
              >
                Cargar más conversaciones ↓
              </button>
            </div>
          )}
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
            previewMapRef={previewMapRef}
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
            conversationId={activeConversationId!}
            onClose={() => setShowContactPanel(false)}
            onSelectConversation={handleSelectFromHistory}
          />
        )}
      </div>
    </div>

    <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
}
