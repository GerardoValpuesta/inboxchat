"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@inboxchat/shared";
import { useInboxStore, selectActiveConversation } from "@/store/inbox.store";
import { cn, getInitials, timeAgo } from "@/lib/utils";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token
    ? { Authorization: `Bearer ${token}` }
    : { "X-Workspace-Key": "dev_key_inboxchat_local" };
}

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface ChatPanelProps {
  socketRef: RefObject<AppSocket | null>;
}

/**
 * Panel de chat principal (lado derecho del inbox).
 * Muestra el historial de mensajes de la conversación activa
 * y el input para que el operador responda.
 */
export function ChatPanel({ socketRef }: ChatPanelProps) {
  const activeConversation = useInboxStore(selectActiveConversation);
  const messages = useInboxStore((s) => s.messages);
  const isLoadingMessages = useInboxStore((s) => s.isLoadingMessages);
  const addMessage = useInboxStore((s) => s.addMessage);
  const updateConversation = useInboxStore((s) => s.updateConversation);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleCloseConversation() {
    if (!activeConversation || isClosing) return;
    setIsClosing(true);
    try {
      await fetch(`${SERVER_URL}/api/conversations/${activeConversation.id}/close`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      updateConversation(activeConversation.id, { status: "closed" });
    } catch (err) {
      console.error("[chat] Error cerrando conversación:", err);
    } finally {
      setIsClosing(false);
    }
  }

  async function handleSend() {
    const socket = socketRef.current;
    const body = inputValue.trim();

    if (!body || !socket || !activeConversation || isSending) return;

    setIsSending(true);
    setInputValue("");

    socket.emit(
      "message:send",
      { conversationId: activeConversation.id, body },
      (result) => {
        setIsSending(false);
        if (result.ok) {
          // Agregar el mensaje al store inmediatamente para real-time feedback
          addMessage(result.message);
        } else {
          // Restaurar el texto si falla el envío
          setInputValue(body);
          console.error("[chat] error al enviar:", result.error);
        }
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enviar con Enter, nueva línea con Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // Estado vacío — ninguna conversación seleccionada
  if (!activeConversation) {
    return (
      <main className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">Selecciona una conversación</p>
          <p className="text-xs text-slate-400 mt-1">
            Los mensajes aparecen aquí en tiempo real
          </p>
        </div>
      </main>
    );
  }

  // Spinner de carga — mensajes todavía no llegaron
  if (isLoadingMessages) {
    return (
      <main className="flex-1 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-slate-300 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs text-slate-400">Cargando mensajes...</p>
        </div>
      </main>
    );
  }

  const { contact } = activeConversation;
  const displayName = contact.name ?? contact.email ?? "Visitante anónimo";

  return (
    <main className="flex-1 flex flex-col bg-white min-w-0">
      {/* Header de la conversación */}
      <header className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
          {getInitials(displayName)}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{displayName}</h2>
          {contact.email && (
            <p className="text-xs text-slate-500">{contact.email}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {activeConversation.status === "open" && (
            <button
              type="button"
              onClick={() => void handleCloseConversation()}
              disabled={isClosing}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 font-medium"
            >
              {isClosing ? "Cerrando..." : "✓ Resolver"}
            </button>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              activeConversation.status === "open"
                ? "bg-brand-100 text-brand-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {activeConversation.status === "open" ? "Abierta" : "Cerrada"}
          </span>
        </div>
      </header>

      {/* Area de mensajes */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-400">Sin mensajes aún</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOperator = message.sender === "operator";
            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-end gap-2 max-w-[70%]",
                  isOperator ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {/* Avatar del remitente */}
                {!isOperator && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs text-slate-600">
                    {getInitials(displayName)}
                  </div>
                )}
                {/* Burbuja del mensaje */}
                <div
                  className={cn(
                    "px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words",
                    isOperator
                      ? "bg-slate-800 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  )}
                >
                  <p>{message.body}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      isOperator ? "text-slate-400" : "text-slate-500"
                    )}
                  >
                    {timeAgo(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input del operador */}
      <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-end gap-3 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus-within:border-slate-400 transition-colors">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí un mensaje... (Enter para enviar)"
            rows={1}
            disabled={isSending}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 resize-none outline-none max-h-32 leading-relaxed disabled:opacity-50"
            style={{ minHeight: "24px" }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isSending}
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              inputValue.trim() && !isSending
                ? "bg-slate-800 text-white hover:bg-slate-700 active:scale-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
            aria-label="Enviar mensaje"
          >
            {isSending ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </main>
  );
}
