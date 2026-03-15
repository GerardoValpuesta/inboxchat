"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@inboxchat/shared";
import { useInboxStore } from "@/store/inbox.store";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Hook que gestiona la conexión Socket.io del operador con el servidor.
 *
 * Responsabilidades:
 * 1. Conectar al servidor y unirse al workspace del operador
 * 2. Suscribirse a eventos de nuevas conversaciones y mensajes
 * 3. Limpiar la conexión al desmontar
 * 4. Exponer el socket para que los componentes puedan emitir eventos
 *
 * Por qué un hook y no un provider:
 * Un hook se usa una sola vez en el InboxLayout (componente padre del inbox).
 * No necesitamos Context porque el store Zustand ya actúa como fuente de verdad
 * compartida. El socket en sí vive en un ref — no en el estado de React.
 */
export function useSocket(workspaceId: string) {
  const socketRef = useRef<AppSocket | null>(null);
  // Map de conversationId → { contact: bool, operator: bool }
  // Usamos useRef+forceUpdate para no re-renderizar todo el inbox en cada keystroke
  const typingMapRef = useRef<Map<string, { contact: boolean; operator: boolean }>>(new Map());
  const [, forceUpdate] = useState(0);
  const { setConnected, addConversation, addMessage, updateConversation } =
    useInboxStore();

  // Pedir permiso de notifications al montar el hook
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Crear la conexión una sola vez (strict mode monta dos veces en dev — el cleanup lo maneja)
    const socket: AppSocket = io(
      process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001",
      {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      }
    );

    socketRef.current = socket;

    // ─── Eventos de conexión ──────────────────────────────────────────────

    socket.on("connect", () => {
      setConnected(true);
      // Unirse a la sala del workspace para recibir nuevas conversaciones
      socket.emit("operator:join", workspaceId);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // ─── Eventos del inbox ────────────────────────────────────────────────

    socket.on("conversation:new", ({ conversation }) => {
      addConversation(conversation);
    });

    socket.on("message:new", ({ conversationId, message }) => {
      // Agregar al historial de mensajes (si es la conversación activa)
      addMessage(message);
      // Actualizar el sidebar con el último mensaje y timestamp (real-time)
      updateConversation(conversationId, {
        updatedAt: message.createdAt,
        lastMessage: message,
      });

      // Browser notification cuando el operador tiene el inbox en background
      if (
        message.sender === "contact" &&
        typeof window !== "undefined" &&
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const body = message.body.length > 80 ? message.body.slice(0, 80) + "..." : message.body;
        new Notification("Nuevo mensaje en InboxChat", {
          body,
          icon: "/favicon.ico",
          tag: conversationId, // agrupa notificaciones de la misma conv
        });
      }
    });

    socket.on("message:received", ({ message }) => {
      addMessage(message);
      // También actualizar el sidebar — message:received solo llega para la conversación activa,
      // así que usamos activeConversationId del store para identificarla
      const activeId = useInboxStore.getState().activeConversationId;
      if (activeId) {
        updateConversation(activeId, {
          lastMessage: message,
          updatedAt: message.createdAt,
        });
      }
      // Notificación browser — solo para mensajes del visitante cuando el operador no tiene foco
      if (
        message.sender === "contact" &&
        typeof window !== "undefined" &&
        !document.hasFocus() &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const conv = useInboxStore.getState().conversations.find(
          (c) => c.id === activeId
        );
        const contactName =
          conv?.contact.name ?? conv?.contact.email ?? "Visitante";
        const notif = new Notification(`Mensaje de ${contactName}`, {
          body: message.body.length > 80
            ? message.body.slice(0, 77) + "..."
            : message.body,
          icon: "/favicon.ico",
          tag: `msg-${activeId}`, // colapsa múltiples notifs de la misma conv
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    });

    // Otro operador resolvió una conversación — actualizar el store en tiempo real
    socket.on("conversation:updated", ({ conversation }) => {
      updateConversation(conversation.id, {
        status: conversation.status,
        unreadCount: conversation.unreadCount,
        updatedAt: conversation.updatedAt,
      });
    });

    // El widget recibe este evento, pero el dashboard también puede escucharlo
    // para desactivar el input si el operador tiene la conversación abierta en otra pestaña
    socket.on("conversation:closed", ({ conversationId }) => {
      updateConversation(conversationId, { status: "closed" });
    });

    // Asignación de conversación — actualizar assignedTo en el store
    socket.on("conversation:assigned", ({ conversationId, operatorId }) => {
      updateConversation(conversationId, { assignedTo: operatorId });
    });

    // Typing indicators — actualizar el Map y forzar re-render solo del chat panel
    socket.on("typing:update", ({ conversationId, isTyping, sender }) => {
      const current = typingMapRef.current.get(conversationId) ?? { contact: false, operator: false };
      typingMapRef.current.set(conversationId, { ...current, [sender]: isTyping });
      forceUpdate((n: number) => n + 1);
    });

    // ─── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("conversation:new");
      socket.off("message:new");
      socket.off("message:received");
      socket.off("conversation:updated");
      socket.off("conversation:closed");
      socket.off("conversation:assigned");
      socket.off("typing:update");
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [workspaceId, setConnected, addConversation, addMessage, updateConversation]);

  return { socketRef, typingMapRef };
}
