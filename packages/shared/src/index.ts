// Barrel export — todo lo que necesita importar el resto del monorepo
export type {
  Contact,
  Conversation,
  Message,
  ContactRole,
} from "./types/domain.js";

export type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  ConversationStartPayload,
  MessageSendPayload,
  MessageReceivedPayload,
  ConversationStartedPayload,
  OperatorStatusPayload,
  ConversationNewPayload,
  MessageNewPayload,
  ConversationUpdatedPayload,
} from "./types/socket.js";
