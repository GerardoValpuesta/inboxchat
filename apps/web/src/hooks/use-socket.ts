"use client";

import { useEffect, useRef } from "react";
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
  const { setConnected, addConversation, addMessage, updateConversation } =
    useInboxStore();

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
    });

    socket.on("message:received", ({ message }) => {
      addMessage(message);
    });

    // ─── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("conversation:new");
      socket.off("message:new");
      socket.off("message:received");
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [workspaceId, setConnected, addConversation, addMessage, updateConversation]);

  return socketRef;
}
