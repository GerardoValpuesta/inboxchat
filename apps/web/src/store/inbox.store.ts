import { create } from "zustand";
import type { Conversation, Message } from "@inboxchat/shared";

export type ConversationTab = "open" | "closed";

interface InboxState {
  // Conexión
  isConnected: boolean;

  // Conversaciones
  conversations: Conversation[];
  activeConversationId: string | null;
  conversationTab: ConversationTab;
  hasMoreConversations: boolean;
  nextCursor: string | null;

  // Mensajes (solo los de la conversación activa en memoria)
  messages: Message[];
  isLoadingMessages: boolean;

  // Acciones
  setConnected: (connected: boolean) => void;
  setConversations: (conversations: Conversation[]) => void;
  appendConversations: (conversations: Conversation[], hasMore: boolean, nextCursor: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, update: Partial<Conversation>) => void;
  setActiveConversation: (conversationId: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  markConversationRead: (conversationId: string) => void;
  setLoadingMessages: (loading: boolean) => void;
  setConversationTab: (tab: ConversationTab) => void;
}

export const useInboxStore = create<InboxState>()((set) => ({
  isConnected: false,
  conversations: [],
  activeConversationId: null,
  conversationTab: "open",
  hasMoreConversations: false,
  nextCursor: null,
  messages: [],
  isLoadingMessages: false,

  setConnected: (isConnected) => set({ isConnected }),

  setConversations: (conversations) => set({ conversations, hasMoreConversations: false, nextCursor: null }),

  appendConversations: (conversations, hasMore, nextCursor) =>
    set((state) => ({
      conversations: [...state.conversations, ...conversations.filter((c) => !state.conversations.some((e) => e.id === c.id))],
      hasMoreConversations: hasMore,
      nextCursor,
    })),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: state.conversations.some((c) => c.id === conversation.id)
        ? state.conversations
        : [conversation, ...state.conversations],
    })),

  updateConversation: (conversationId, update) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...update } : c
      ),
    })),

  setActiveConversation: (conversationId) =>
    set({ activeConversationId: conversationId, messages: [] }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: state.messages.some((m) => m.id === message.id)
        ? state.messages
        : [...state.messages, message],
    })),

  markConversationRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),

  setConversationTab: (conversationTab) =>
    set({ conversationTab, conversations: [], hasMoreConversations: false, nextCursor: null }),
}));

// Selectores memoizados para evitar re-renders innecesarios
export const selectActiveConversation = (state: InboxState) =>
  state.conversations.find((c) => c.id === state.activeConversationId) ?? null;

export const selectUnreadTotal = (state: InboxState) =>
  state.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
