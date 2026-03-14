import type { Server, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@inboxchat/shared";
import type { Database } from "../db/client.js";
import {
  findWorkspaceByApiKey,
  upsertContact,
  createConversation,
  saveMessage,
  incrementUnreadCount,
  markConversationRead,
  getConversationHistory,
  getConversationWithContact,
} from "../db/queries.js";

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Registra todos los handlers de eventos de Socket.io.
 * Cada handler valida, persiste y emite.
 *
 * Patrón: receive -> validate -> persist -> emit
 */
export function registerSocketHandlers(io: AppServer, db: Database) {
  io.on("connection", (socket: AppSocket) => {
    // ─── conversation:start ───────────────────────────────────────────────
    socket.on("conversation:start", async (payload, callback) => {
      try {
        // 1. Validar que el workspace existe y está activo
        const workspace = await findWorkspaceByApiKey(db, payload.workspaceKey);
        if (!workspace) {
          callback({ ok: false, error: "Workspace no encontrado" });
          return;
        }

        // 2. Trial enforcement
        if (workspace.plan !== "pro") {
          const now = new Date();

          // Si trial_ends_at es null → es su primera conversación, arrancar el trial
          if (!workspace.trial_ends_at) {
            const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            await db`
              UPDATE workspaces SET trial_ends_at = ${trialEndsAt} WHERE id = ${workspace.id}
            `;
            workspace.trial_ends_at = trialEndsAt.toISOString() as unknown as Date;
          }

          // Verificar si el trial expiró
          if (new Date(workspace.trial_ends_at as unknown as string) < now) {
            callback({ ok: false, error: "trial_expired" });
            return;
          }

          // Verificar límite de conversaciones (100)
          const [countRow] = await db<{ total: number }[]>`
            SELECT COUNT(*)::int AS total FROM conversations WHERE workspace_id = ${workspace.id}
          `;
          if ((countRow?.total ?? 0) >= 100) {
            callback({ ok: false, error: "trial_limit_reached" });
            return;
          }
        }

        // Con exactOptionalPropertyTypes, no se puede pasar `string | undefined`
        // donde se espera `string`. Construir el objeto solo con las propiedades definidas.
        const contactData: { externalId?: string; name?: string; email?: string } = {};
        if (payload.contact?.externalId !== undefined) contactData.externalId = payload.contact.externalId;
        if (payload.contact?.name !== undefined) contactData.name = payload.contact.name;
        if (payload.contact?.email !== undefined) contactData.email = payload.contact.email;

        const contact = await upsertContact(db, workspace.id as string, contactData);

        // 3. Crear conversación
        const conversationRow = await createConversation(db, workspace.id as string, contact.id);

        // 4. Unir el socket a la sala de la conversación
        await socket.join(`conversation:${conversationRow.id}`);
        socket.data.workspaceId = workspace.id as string;
        socket.data.contactId = contact.id;
        socket.data.conversationId = conversationRow.id;

        const conversation = {
          ...conversationRow,
          contact,
          lastMessage: null,
        };

        // 5. Notificar al dashboard del operador
        io.to(`workspace:${workspace.id}`).emit("conversation:new", { conversation });

        callback({ ok: true, conversation });
      } catch (err) {
        console.error("[socket] conversation:start error", err);
        callback({ ok: false, error: "Error interno del servidor" });
      }
    });

    // ─── conversation:rejoin ──────────────────────────────────────────────
    // El widget llama esto al reconectar si ya tiene un conversationId.
    // Restaura socket.data en el nuevo socket session para que message:send funcione.
    socket.on("conversation:rejoin", async ({ conversationId }: { conversationId: string }) => {
      try {
        // Restaurar el workspace desde la DB (conversation:start ya no puede setearlo)
        const [row] = await db<{ workspace_id: string }[]>`
          SELECT workspace_id FROM conversations WHERE id = ${conversationId} LIMIT 1
        `;
        await socket.join(`conversation:${conversationId}`);
        socket.data.conversationId = conversationId;
        if (row?.workspace_id) {
          socket.data.workspaceId = row.workspace_id;
        }
      } catch (err) {
        console.error("[socket] conversation:rejoin error", err);
      }
    });

    // ─── message:send ─────────────────────────────────────────────────────
    socket.on("message:send", async (payload, callback) => {
      try {
        // El operador manda conversationId en el payload.
        // El widget no lo manda (usa socket.data setado en conversation:start).
        const conversationId = payload.conversationId || socket.data.conversationId;
        if (!conversationId) {
          callback({ ok: false, error: "No hay conversación activa" });
          return;
        }

        // Al operar, unirse a la sala de la conversación si no está ya
        // (permite recibir mensajes en tiempo real de esa conversación)
        if (socket.data.isOperator) {
          await socket.join(`conversation:${conversationId}`);
          socket.data.conversationId = conversationId;
        }

        // Validación básica del mensaje
        const body = payload.body.trim();
        if (!body || body.length > 5000) {
          callback({ ok: false, error: "Mensaje inválido" });
          return;
        }

        // 1. Determinar quién envía según si es el operador o el contacto
        const isOperator = socket.data.isOperator === true;
        const sender = isOperator ? ("operator" as const) : ("contact" as const);

        // 2. Persistir
        const message = await saveMessage(db, conversationId, body, sender);

        // 3. Si el mensaje es del contacto, incrementar unread del operador
        if (sender === "contact") {
          await incrementUnreadCount(db, conversationId);
        }

        // 4. Emitir al resto de la sala (excluye al sender)
        socket.to(`conversation:${conversationId}`).emit("message:received", { message });

        // 5. Responder al cliente ANTES de la notificación del workspace
        //    (evita que errores en getConversationWithContact lleguen al callback)
        callback({ ok: true, message });

        // 6. Notificación del workspace (best-effort — no afecta el callback)
        try {
          const workspaceId = socket.data.workspaceId;
          if (workspaceId) {
            io.to(`workspace:${workspaceId}`).emit("message:new", {
              conversationId,
              message,
            });
          }
        } catch (notifyErr) {
          console.error("[socket] workspace notify error", notifyErr);
        }
        return;
      } catch (err) {
        console.error("[socket] message:send error", err);
        callback({ ok: false, error: "Error interno del servidor" });
      }
    });

    // ─── operator:join ────────────────────────────────────────────────────
    // El dashboard del operador se une a la sala del workspace para recibir
    // notificaciones de nuevas conversaciones y mensajes.
    socket.on("operator:join", async (workspaceId) => {
      socket.data.workspaceId = workspaceId;
      socket.data.isOperator = true;
      await socket.join(`workspace:${workspaceId}`);

      // Notificar al widget que el operador está online
      io.to(`workspace:${workspaceId}`).emit("operator:status", { online: true });
    });

    // ─── disconnect ───────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (socket.data.isOperator && socket.data.workspaceId) {
        // Notificar al widget que el operador se fue offline
        io.to(`workspace:${socket.data.workspaceId}`).emit("operator:status", { online: false });
      }
    });
  });
}
