import type { Database } from "./client.js";
import type { Contact, Conversation, Message } from "@inboxchat/shared";

// ─── Workspaces ──────────────────────────────────────────────────────────────

export async function findWorkspaceByApiKey(db: Database, apiKey: string) {
  const [workspace] = await db`
    SELECT id, name, owner_email, plan, trial_ends_at
    FROM workspaces
    WHERE api_key = ${apiKey}
    LIMIT 1
  `;
  return workspace ?? null;
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function upsertContact(
  db: Database,
  workspaceId: string,
  data: { externalId?: string; name?: string; email?: string }
): Promise<Contact> {
  const [contact] = await db`
    INSERT INTO contacts (workspace_id, external_id, name, email)
    VALUES (${workspaceId}, ${data.externalId ?? null}, ${data.name ?? null}, ${data.email ?? null})
    ON CONFLICT (workspace_id, external_id)
    DO UPDATE SET
      name          = COALESCE(EXCLUDED.name, contacts.name),
      email         = COALESCE(EXCLUDED.email, contacts.email),
      last_seen_at  = NOW()
    RETURNING *
  `;
  return contact as Contact;
}

// ─── Conversations ───────────────────────────────────────────────────────────

export async function createConversation(
  db: Database,
  workspaceId: string,
  contactId: string
): Promise<Conversation> {
  const [conversation] = await db`
    INSERT INTO conversations (workspace_id, contact_id)
    VALUES (${workspaceId}, ${contactId})
    RETURNING *
  `;
  return conversation as Conversation;
}

export async function getConversationWithContact(
  db: Database,
  conversationId: string,
  workspaceId: string
): Promise<(Conversation & { contact: Contact }) | null> {
  const [row] = await db`
    SELECT
      c.id, c.workspace_id, c.status, c.unread_count, c.created_at, c.updated_at,
      ct.id AS "contact.id",
      ct.external_id AS "contact.externalId",
      ct.name AS "contact.name",
      ct.email AS "contact.email",
      ct.last_seen_at AS "contact.lastSeenAt",
      ct.created_at AS "contact.createdAt"
    FROM conversations c
    JOIN contacts ct ON c.contact_id = ct.id
    WHERE c.id = ${conversationId}
      AND c.workspace_id = ${workspaceId}
    LIMIT 1
  `;
  return (row ?? null) as (Conversation & { contact: Contact }) | null;
}

export async function listOpenConversations(
  db: Database,
  workspaceId: string,
  limit = 50
): Promise<Array<Conversation & { contact: Contact; lastMessage: Message | null }>> {
  // postgres.js aplana los alias con punto, por eso usamos subqueries json
  const rows = await db<Array<{
    id: string;
    workspaceId: string;
    status: string;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
    contact: Contact;
    lastMessage: Message | null;
  }>>`
    SELECT
      c.id,
      c.workspace_id,
      c.status,
      c.unread_count,
      c.created_at,
      c.updated_at,
      (
        SELECT json_build_object(
          'id', ct.id,
          'workspaceId', ct.workspace_id,
          'externalId', ct.external_id,
          'name', ct.name,
          'email', ct.email,
          'lastSeenAt', ct.last_seen_at,
          'createdAt', ct.created_at
        )
        FROM contacts ct WHERE ct.id = c.contact_id
      ) AS contact,
      (
        SELECT json_build_object(
          'id', m.id,
          'conversationId', m.conversation_id,
          'body', m.body,
          'sender', m.sender,
          'createdAt', m.created_at
        )
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS "lastMessage"
    FROM conversations c
    WHERE c.workspace_id = ${workspaceId}
      AND c.status = 'open'
    ORDER BY c.updated_at DESC
    LIMIT ${limit}
  `;
  return rows as unknown as Array<Conversation & { contact: Contact; lastMessage: Message | null }>;
}

export async function markConversationRead(db: Database, conversationId: string) {
  await db`
    UPDATE conversations
    SET unread_count = 0
    WHERE id = ${conversationId}
  `;
}

export async function incrementUnreadCount(db: Database, conversationId: string) {
  await db`
    UPDATE conversations
    SET unread_count = unread_count + 1
    WHERE id = ${conversationId}
  `;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function saveMessage(
  db: Database,
  conversationId: string,
  body: string,
  sender: "contact" | "operator"
): Promise<Message> {
  const [message] = await db`
    INSERT INTO messages (conversation_id, body, sender)
    VALUES (${conversationId}, ${body}, ${sender})
    RETURNING *
  `;
  return message as Message;
}

export async function getConversationHistory(
  db: Database,
  conversationId: string,
  limit = 50
): Promise<Message[]> {
  const messages = await db`
    SELECT id, conversation_id, body, sender, created_at
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
  return messages as unknown as Message[];
}
