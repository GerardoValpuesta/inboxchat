import type { Contact, Conversation, Message } from "./domain.js";

// ─── Eventos: Widget -> Server ──────────────────────────────────────────────

export interface ConversationStartPayload {
  workspaceKey: string;
  contact?: {
    externalId?: string;
    name?: string;
    email?: string;
  };
}

export interface MessageSendPayload {
  conversationId: string;
  body: string;
}

// ─── Eventos: Server -> Widget ──────────────────────────────────────────────

export interface MessageReceivedPayload {
  message: Message;
}

export interface ConversationStartedPayload {
  conversation: Conversation;
}

export interface OperatorStatusPayload {
  online: boolean;
}

// ─── Eventos: Server -> Dashboard ───────────────────────────────────────────

export interface ConversationNewPayload {
  conversation: Conversation;
}

export interface MessageNewPayload {
  conversationId: string;
  message: Message;
}

export interface ConversationUpdatedPayload {
  conversation: Pick<Conversation, "id" | "status" | "unreadCount" | "updatedAt">;
}

// ─── Mapa de eventos de Socket.io (tipado end-to-end) ───────────────────────
// Seguimos el patrón oficial de Socket.io para tipado:
// https://socket.io/docs/v4/typescript/

/** Eventos que el SERVER escucha (enviados por clientes: widget o dashboard) */
export interface ServerToClientEvents {
  // Widget recibe estos
  "message:received": (payload: MessageReceivedPayload) => void;
  "conversation:started": (payload: ConversationStartedPayload) => void;
  "operator:status": (payload: OperatorStatusPayload) => void;
  // Dashboard recibe estos
  "conversation:new": (payload: ConversationNewPayload) => void;
  "message:new": (payload: MessageNewPayload) => void;
  "conversation:updated": (payload: ConversationUpdatedPayload) => void;
  // Widget y Dashboard reciben este cuando el operador resuelve la conversación
  "conversation:closed": (payload: { conversationId: string }) => void;
}

/** Eventos que los CLIENTES emiten (escuchados por el server) */
export interface ClientToServerEvents {
  "conversation:start": (
    payload: ConversationStartPayload,
    callback: (result: { ok: true; conversation: Conversation } | { ok: false; error: string }) => void
  ) => void;
  "conversation:rejoin": (payload: { conversationId: string }) => void;
  "message:send": (
    payload: MessageSendPayload,
    callback: (result: { ok: true; message: Message } | { ok: false; error: string }) => void
  ) => void;
  "operator:join": (workspaceId: string) => void;
}

/** Eventos inter-server (si se escala con Redis adapter) */
export interface InterServerEvents {
  ping: () => void;
}

/** Datos adjuntos al socket (disponibles en socket.data) */
export interface SocketData {
  workspaceId?: string;
  contactId?: string;
  conversationId?: string;
  isOperator?: boolean;
}

// Re-export de tipos de dominio para conveniencia
export type { Contact, Conversation, Message };
