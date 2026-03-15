import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt.js";

/**
 * GET /api/contacts/:contactId
 * Retorna datos del contacto + historial de conversaciones (sin mensajes completos).
 * Requiere auth JWT.
 */
export async function contactsRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  app.get("/api/contacts/:contactId", async (request, reply) => {
    const authHeader = request.headers["authorization"] as string | undefined;
    if (!authHeader) return reply.status(401).send({ error: "No autorizado" });
    const token = extractTokenFromHeader(authHeader);
    if (!token) return reply.status(401).send({ error: "No autorizado" });
    const payload = verifyToken(token);
    if (!payload) return reply.status(401).send({ error: "Token inválido" });
    const workspaceId = payload.workspaceId;

    const { contactId } = request.params as { contactId: string };

    // Datos del contacto — validamos que pertenezca al workspace
    const [contact] = await db<{
      id: string;
      name: string | null;
      email: string | null;
      external_id: string | null;
      last_seen_at: string;
      created_at: string;
    }[]>`
      SELECT id, name, email, external_id, last_seen_at, created_at
      FROM contacts
      WHERE id = ${contactId}
        AND workspace_id = ${workspaceId}
      LIMIT 1
    `;

    if (!contact) return reply.status(404).send({ error: "Contacto no encontrado" });

    // Historial de conversaciones del contacto
    const conversations = await db<{
      id: string;
      status: string;
      created_at: string;
      updated_at: string;
      message_count: string;
      last_msg: string | null;
    }[]>`
      SELECT
        c.id,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(m.id) AS message_count,
        (
          SELECT m2.body FROM messages m2
          WHERE m2.conversation_id = c.id
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) AS last_msg
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.contact_id = ${contactId}
        AND c.workspace_id = ${workspaceId}
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 20
    `;

    return reply.send({
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        externalId: contact.external_id,
        lastSeenAt: contact.last_seen_at,
        createdAt: contact.created_at,
      },
      conversations: conversations.map((c) => ({
        id: c.id,
        status: c.status,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        messageCount: Number(c.message_count),
        lastMessage: c.last_msg ?? null,
      })),
    });
  });
}
