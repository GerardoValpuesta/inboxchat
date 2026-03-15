// Tipos de entidades del dominio

export type ContactRole = "contact" | "operator" | "note";

export interface Contact {
  id: string;
  workspaceId: string;
  externalId: string | null;
  name: string | null;
  email: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  contact: Contact;
  status: "open" | "closed";
  unreadCount: number;
  assignedTo: string | null;  // operator ID
  lastMessage: Message | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  body: string;
  sender: ContactRole;
  createdAt: string;
}
