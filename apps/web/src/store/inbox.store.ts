import { create } from "zustand";
import type { Conversation, Message } from "@inboxchat/shared";

/**
 * Store del inbox.
 *
 * Responsabilidades:
 * - Lista de conversaciones (sidebar izquierdo)
 * - Conversación activa seleccionada
 * - Mensajes de la conversación activa
 * - Estado de conexión del Socket.io
 *
 * Por qué Zustand y no Context:
 * Context re-renderiza todo el árbol cuando cambia.
 * Zustand con selectores re-renderiza solo los componentes suscritos al slice que cambió.
 * En un chat, los mensajes llegan constantemente — necesitamos granularidad.
 */

interface InboxState {
  // Conexión
  isConnected: boolean;

  // Conversaciones
  conversations: Conversation[];
  activeConversationId: string | null;

  // Mensajes (solo los de la conversación activa en memoria)
  messages: Message[];
  isLoadingMessages: boolean;

  // Acciones
  setConnected: (connected: boolean) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, update: Partial<Conversation>) => void;
  setActiveConversation: (conversationId: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  markConversationRead: (conversationId: string) => void;
  setLoadingMessages: (loading: boolean) => void;
}

export const useInboxStore = create<InboxState>()((set) => ({
  isConnected: false,
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoadingMessages: false,

  setConnected: (isConnected) => set({ isConnected }),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      // Evitar duplicados si llega el mismo evento DOS veces
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
}));

// Selectores memoizados para evitar re-renders innecesarios
export const selectActiveConversation = (state: InboxState) =>
  state.conversations.find((c) => c.id === state.activeConversationId) ?? null;

export const selectUnreadTotal = (state: InboxState) =>
  state.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
