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
import { sendNewConversationEmail } from "../lib/email.js";
import { sendWebhookEvent } from "../routes/webhooks.routes.js";
import { verifyToken } from "../lib/jwt.js";


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
  // Timers de auto-clear para typing indicators (por conversationId)
  // Si el cliente se cae sin enviar typing:stop, el indicador desaparece igual a los 5s
  const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Rate limit por socket para message:send
  // { socketId → { count, resetAt } }
  const msgRateMap = new Map<string, { count: number; resetAt: number }>();
  const MSG_LIMIT = 10;   // max mensajes
  const MSG_WINDOW = 10_000; // por ventana de 10 segundos

  // Dedup de emails al operador — solo se envía el primero por conversación.
  // Se limpia cada hora para no crecer indefinidamente.
  const emailNotifiedConvs = new Set<string>();
  setInterval(() => emailNotifiedConvs.clear(), 60 * 60 * 1000);

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

        // 4b. Persistir Session Context (últimas páginas visitadas) como nota de sistema
        const pageHistory = (payload as { pageHistory?: { url: string; title: string; ts: string }[] }).pageHistory;
        if (Array.isArray(pageHistory) && pageHistory.length > 0) {
          const ctxBody = `__ic_ctx__${JSON.stringify(pageHistory)}`;
          await saveMessage(db, conversationRow.id, ctxBody, "note");
        }

        const conversation = {
          ...conversationRow,
          contact,
          lastMessage: null,
        };

        // 5. Notificar al dashboard del operador
        io.to(`workspace:${workspace.id}`).emit("conversation:new", { conversation });

        // 6. Tracking de activación — fire-and-forget
        void (async () => {
          try {
            // 'widget_installed' en la primera conversación del workspace
            const [existing] = await db<{ total: number }[]>`
              SELECT COUNT(*)::int AS total FROM workspace_events
              WHERE workspace_id = ${workspace.id} AND event = 'widget_installed'
            `;
            if (!existing || existing.total === 0) {
              await db`
                INSERT INTO workspace_events (workspace_id, event, properties)
                VALUES (${workspace.id}, 'widget_installed', ${JSON.stringify({ conversation_id: conversationRow.id })}::jsonb)
                ON CONFLICT DO NOTHING
              `;
            }
          } catch { /* non-fatal */ }
        })();

        callback({ ok: true, conversation });
      } catch (err) {
        console.error("[socket] conversation:start error", err);
        callback({ ok: false, error: "Error interno del servidor" });
      }
    });

    // ─── conversation:rejoin ──────────────────────────────────────────────
    // El widget llama esto al reconectar si ya tiene un conversationId.
    // Restaura socket.data y devuelve el historial de mensajes.
    socket.on(
      "conversation:rejoin",
      async (
        { conversationId }: { conversationId: string },
        callback?: (result: { ok: boolean; messages?: unknown[]; error?: string }) => void
      ) => {
        try {
          const [row] = await db<{ workspace_id: string }[]>`
            SELECT workspace_id FROM conversations WHERE id = ${conversationId} LIMIT 1
          `;

          if (!row) {
            callback?.({ ok: false, error: "Conversación no encontrada" });
            return;
          }

          await socket.join(`conversation:${conversationId}`);
          socket.data.conversationId = conversationId;
          socket.data.workspaceId = row.workspace_id;


          // Cargar historial de los últimos 50 mensajes
          const messages = await getConversationHistory(db, conversationId, 50);
          callback?.({ ok: true, messages });
        } catch (err) {
          console.error("[socket] conversation:rejoin error", err);
          callback?.({ ok: false, error: "Error interno" });
        }
      }
    );

    // ─── message:send ─────────────────────────────────────────────────────
    socket.on("message:send", async (payload, callback) => {
      try {
        const conversationId = payload.conversationId || socket.data.conversationId;
        if (!conversationId) {
          callback({ ok: false, error: "No hay conversación activa" });
          return;
        }

        if (socket.data.isOperator) {
          await socket.join(`conversation:${conversationId}`);
          socket.data.conversationId = conversationId;
        }

        const body = payload.body.trim();
        if (!body || body.length > 5000) {
          callback({ ok: false, error: "Mensaje inválido" });
          return;
        }

        // Rate limit solo para visitantes (no operadores) — 10 msgs / 10s
        if (!socket.data.isOperator) {
          const now = Date.now();
          const bucket = msgRateMap.get(socket.id) ?? { count: 0, resetAt: now + MSG_WINDOW };
          if (now > bucket.resetAt) {
            bucket.count = 0;
            bucket.resetAt = now + MSG_WINDOW;
          }
          bucket.count++;
          msgRateMap.set(socket.id, bucket);
          if (bucket.count > MSG_LIMIT) {
            callback({ ok: false, error: "Demasiados mensajes. Esperá unos segundos." });
            return;
          }
        }

        // 1. Determinar sender. Las notas internas solo las puede crear el operador.
        const isOperator = socket.data.isOperator === true;
        const isNote = isOperator && (payload as { isNote?: boolean }).isNote === true;
        const sender: import("@inboxchat/shared").ContactRole = isNote
          ? "note"
          : isOperator
            ? "operator"
            : "contact";

        // 2. Persistir
        const message = await saveMessage(db, conversationId, body, sender);

        // 3. Solo mensajes del contacto incrementan unread y disparan email
        if (sender === "contact") {
          await incrementUnreadCount(db, conversationId);

          // Tracking: first_message del workspace
          void (async () => {
            try {
              const wsId = socket.data.workspaceId;
              if (wsId) {
                const [existing] = await db<{ total: number }[]>`
                  SELECT COUNT(*)::int AS total FROM workspace_events
                  WHERE workspace_id = ${wsId} AND event = 'first_message'
                `;
                if (!existing || existing.total === 0) {
                  await db`
                    INSERT INTO workspace_events (workspace_id, event, properties)
                    VALUES (${wsId}, 'first_message', ${JSON.stringify({ conversation_id: conversationId })}::jsonb)
                    ON CONFLICT DO NOTHING
                  `;
                }
              }
            } catch { /* non-fatal */ }
          })();

          try {
            const workspaceId = socket.data.workspaceId;
            if (workspaceId && process.env["RESEND_API_KEY"]) {
              const operatorRoom = io.sockets.adapter.rooms.get(`workspace:${workspaceId}`);
              const operatorOnline = operatorRoom && operatorRoom.size > 0;

              if (!operatorOnline) {
                // Dedup: solo notificar una vez por conversación (Set se limpia cada hora)
                if (!emailNotifiedConvs.has(conversationId)) {
                const [ws] = await db<{ owner_email: string; name: string }[]>`
                  SELECT owner_email, name FROM workspaces WHERE id = ${workspaceId} LIMIT 1
                `;
                if (ws?.owner_email) {
                  const [conv] = await db<{ contact_name: string | null }[]>`
                    SELECT c.name AS contact_name
                    FROM conversations cv
                    JOIN contacts c ON c.id = cv.contact_id
                    WHERE cv.id = ${conversationId}
                    LIMIT 1
                  `;
                  const emailOpts: Parameters<typeof sendNewConversationEmail>[0] = {
                    to: ws.owner_email,
                    workspaceName: ws.name,
                    message: body.slice(0, 200),
                    inboxUrl: `${process.env["WEB_URL"] ?? "https://inboxchat-web.vercel.app"}/inbox`,
                  };
                  if (conv?.contact_name) emailOpts.visitorName = conv.contact_name;
                  void sendNewConversationEmail(emailOpts);
                  emailNotifiedConvs.add(conversationId);
                }
                } // end dedup check
              }
            }
          } catch (emailErr) {
            console.error("[socket] Email error (non-fatal):", emailErr);
          }
        }

        // 4. Emitir al resto de la sala
        //    Notas: solo a operadores — el widget no ve sender="note"
        socket.to(`conversation:${conversationId}`).emit("message:received", { message });

        // 5. Callback al cliente
        callback({ ok: true, message });

        // 6. Webhook saliente — fire-and-forget para message.created (no notas)
        if (sender !== "note" && socket.data.workspaceId) {
          void sendWebhookEvent(db, socket.data.workspaceId, "message.created", {
            message_id: message.id,
            conversation_id: conversationId,
            body: message.body,
            sender,
          });

          // Tracking: first_reply del operador
          if (sender === "operator") {
            void (async () => {
              try {
                const wsId = socket.data.workspaceId!;
                const [existing] = await db<{ total: number }[]>`
                  SELECT COUNT(*)::int AS total FROM workspace_events
                  WHERE workspace_id = ${wsId} AND event = 'first_reply'
                `;
                if (!existing || existing.total === 0) {
                  await db`
                    INSERT INTO workspace_events (workspace_id, event, properties)
                    VALUES (${wsId}, 'first_reply', ${JSON.stringify({ conversation_id: conversationId })}::jsonb)
                    ON CONFLICT DO NOTHING
                  `;
                }
              } catch { /* non-fatal */ }
            })();
          }
        }

        // 7. Notificación del workspace (best-effort)
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
    // SECURITY: requiere JWT válido con workspaceId que coincida
    socket.on("operator:join", async (payload) => {
      try {
        const { workspaceId: wsId, token } = payload;
        if (!token || !wsId) {
          socket.disconnect();
          return;
        }

        const decoded = verifyToken(token);
        if (!decoded || decoded.workspaceId !== wsId) {
          socket.disconnect();
          return;
        }

        socket.data.workspaceId = wsId;
        socket.data.isOperator = true;
        socket.data.operatorId = decoded.sub;
        await socket.join(`workspace:${wsId}`);

        // Notificar al widget que el operador está online
        io.to(`workspace:${wsId}`).emit("operator:status", { online: true });
      } catch {
        socket.disconnect();
      }
    });

    // ─── typing:start / typing:stop ──────────────────────────────────────
    socket.on("typing:start", ({ conversationId }) => {
      const sender = socket.data.isOperator ? ("operator" as const) : ("contact" as const);
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        conversationId,
        isTyping: true,
        sender,
      });

      // Auto-clear: si el cliente no manda typing:stop en 5s, lo limpiamos automáticamente
      const existingTimer = typingTimers.get(conversationId);
      if (existingTimer) clearTimeout(existingTimer);
      typingTimers.set(
        conversationId,
        setTimeout(() => {
          typingTimers.delete(conversationId);
          socket.to(`conversation:${conversationId}`).emit("typing:update", {
            conversationId,
            isTyping: false,
            sender,
          });
        }, 5_000)
      );
    });

    socket.on("typing:stop", ({ conversationId }) => {
      const sender = socket.data.isOperator ? ("operator" as const) : ("contact" as const);
      const timer = typingTimers.get(conversationId);
      if (timer) {
        clearTimeout(timer);
        typingTimers.delete(conversationId);
      }
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        conversationId,
        isTyping: false,
        sender,
      });
    });

    // ─── visitor:typing ────────────────────────────────────────────────────
    // El widget emite esto cada 300ms con el texto parcial (throttled).
    // El servidor lo reemite al workspace para que el operador vea el preview.
    socket.on("visitor:typing", ({ conversationId, text, isTyping }) => {
      const wsId = socket.data.workspaceId;
      if (!wsId) return;
      // Emitir preview al operador (sala del workspace)
      io.to(`workspace:${wsId}`).emit("typing:preview", {
        conversationId,
        text: text ?? "",
      });
      // Mantener también el indicador básico typing:update para retrocompat
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        conversationId,
        isTyping,
        sender: "contact",
      });
    });

    // ─── disconnect ───────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (socket.data.isOperator && socket.data.workspaceId) {
        // Notificar al widget que el operador se fue offline
        io.to(`workspace:${socket.data.workspaceId}`).emit("operator:status", { online: false });
      }
      // Limpiar timer de typing si quedó pendiente
      if (socket.data.conversationId) {
        const timer = typingTimers.get(socket.data.conversationId);
        if (timer) {
          clearTimeout(timer);
          typingTimers.delete(socket.data.conversationId);
        }
      }
    });
  });
}
