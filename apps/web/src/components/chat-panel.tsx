"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
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
  typingMapRef: MutableRefObject<Map<string, { contact: boolean; operator: boolean }>>;
  onToggleContact?: () => void;
  showContactPanel?: boolean;
}

/**
 * Panel de chat principal (lado derecho del inbox).
 * Muestra el historial de mensajes de la conversación activa
 * y el input para que el operador responda.
 */
export function ChatPanel({ socketRef, typingMapRef, onToggleContact, showContactPanel }: ChatPanelProps) {
  const activeConversation = useInboxStore(selectActiveConversation);
  const messages = useInboxStore((s) => s.messages);
  const isLoadingMessages = useInboxStore((s) => s.isLoadingMessages);
  const addMessage = useInboxStore((s) => s.addMessage);
  const updateConversation = useInboxStore((s) => s.updateConversation);
  const setActiveConversation = useInboxStore((s) => s.setActiveConversation);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isNoteMode, setIsNoteMode] = useState(false);
  // Búsqueda Ctrl+F dentro de la conversación
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const msgSearchRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Debounce ref para el typing:stop (1.5s sin escribir = stop)
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Canned responses
  const [cannedResponses, setCannedResponses] = useState<{ id: string; shortcut: string; body: string }[]>([]);
  const [cannedFilter, setCannedFilter] = useState<string | null>(null);
  const [cannedSelected, setCannedSelected] = useState(0);
  const [operators, setOperators] = useState<{ id: string; name: string; email: string }[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  // Tags
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [convTags, setConvTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const filteredCanned = cannedFilter !== null
    ? cannedResponses.filter((r) => r.shortcut.includes(cannedFilter))
    : [];
  const showCannedPicker = filteredCanned.length > 0;

  // Cargar canned responses, operadores y tags al montar
  useEffect(() => {
    const headers = getAuthHeaders();
    Promise.all([
      fetch(`${SERVER_URL}/api/canned-responses`, { headers }).then((r) => r.json()),
      fetch(`${SERVER_URL}/api/operators`, { headers }).then((r) => r.json()),
      fetch(`${SERVER_URL}/api/tags`, { headers }).then((r) => r.json()),
    ])
      .then(([cannedData, operatorsData, tagsData]: [
        { cannedResponses: typeof cannedResponses },
        { operators: typeof operators },
        { tags: typeof allTags }
      ]) => {
        setCannedResponses(cannedData.cannedResponses ?? []);
        setOperators(operatorsData.operators ?? []);
        setAllTags(tagsData.tags ?? []);
      })
      .catch(() => {/* silenciar: no crítico */});
  }, []);

  // Cargar tags de la conversación activa
  useEffect(() => {
    if (!activeConversation) { setConvTags([]); return; }
    fetch(`${SERVER_URL}/api/conversations/${activeConversation.id}/tags`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d: { tags: typeof convTags }) => setConvTags(d.tags ?? []))
      .catch(() => setConvTags([]));
  }, [activeConversation?.id]);

  async function toggleTag(tag: { id: string; name: string; color: string }) {
    if (!activeConversation) return;
    const hasTag = convTags.some((t) => t.id === tag.id);
    const method = hasTag ? "DELETE" : "POST";
    await fetch(
      `${SERVER_URL}/api/conversations/${activeConversation.id}/tags/${tag.id}`,
      { method, headers: getAuthHeaders() }
    );
    setConvTags((prev) =>
      hasTag ? prev.filter((t) => t.id !== tag.id) : [...prev, tag]
    );
  }

  // Scroll automático al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ctrl+F / Cmd+F — usar el buscador del chat en vez del del browser
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f" && activeConversation) {
        e.preventDefault();
        setShowMsgSearch((v) => {
          if (!v) {
            setTimeout(() => msgSearchRef.current?.focus(), 50);
            return true;
          }
          return false;
        });
      }
      if (e.key === "Escape") {
        setShowMsgSearch(false);
        setMsgSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeConversation]);

  async function handleCloseConversation() {
    if (!activeConversation || isClosing) return;
    setIsClosing(true);
    const newStatus = activeConversation.status === "open" ? "closed" : "open";
    try {
      await fetch(`${SERVER_URL}/api/conversations/${activeConversation.id}/status`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      updateConversation(activeConversation.id, { status: newStatus });
    } catch (err) {
      console.error("[chat] Error actualizando estado de conversación:", err);
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
      { conversationId: activeConversation.id, body, ...(isNoteMode && { isNote: true }) },
      (result) => {
        setIsSending(false);
        if (result.ok) {
          addMessage(result.message);
          setIsNoteMode(false);
        } else {
          setInputValue(body);
          console.error("[chat] error al enviar:", result.error);
        }
      }
    );
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInputValue(val);
    const socket = socketRef.current;

    // Canned responses: detectar /shortcut
    if (val.startsWith("/")) {
      setCannedFilter(val.slice(1).toLowerCase());
      setCannedSelected(0);
    } else {
      setCannedFilter(null);
    }

    if (!socket || !activeConversation) return;
    socket.emit("typing:start", { conversationId: activeConversation.id });
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId: activeConversation.id });
    }, 1_500);
  }

  function applyCannedResponse(canned: { shortcut: string; body: string }) {
    setInputValue(canned.body);
    setCannedFilter(null);
    setCannedSelected(0);
    // Cancelar el timer de typing — estamos rellenando, no escribiendo
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    const socket = socketRef.current;
    if (socket && activeConversation) {
      socket.emit("typing:stop", { conversationId: activeConversation.id });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Navegación en el canned picker
    if (showCannedPicker) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCannedSelected((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCannedSelected((i) => Math.min(filteredCanned.length - 1, i + 1));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const selected = filteredCanned[cannedSelected];
        if (selected) applyCannedResponse(selected);
        return;
      }
      if (e.key === "Escape") {
        setCannedFilter(null);
        return;
      }
    }
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
      <header className="px-4 md:px-6 py-4 border-b border-slate-200 flex items-center gap-3 flex-shrink-0">
        {/* Botón back — solo en mobile */}
        <button
          onClick={() => setActiveConversation(null)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0"
          aria-label="Volver a conversaciones"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
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
          {/* Botón ver contacto */}
          {onToggleContact && (
            <button
              type="button"
              onClick={onToggleContact}
              title={showContactPanel ? "Ocultar contacto" : "Ver contacto"}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors border",
                showContactPanel
                  ? "bg-violet-50 border-violet-200 text-violet-700"
                  : "border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          )}
          {/* Selector de asignación */}
          {activeConversation.status === "open" && operators.length > 0 && (
            <select
              value={activeConversation.assignedTo ?? ""}
              disabled={isAssigning}
              onChange={async (e) => {
                const operatorId = e.target.value || null;
                setIsAssigning(true);
                try {
                  await fetch(`${SERVER_URL}/api/conversations/${activeConversation.id}/assign`, {
                    method: "POST",
                    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ operatorId }),
                  });
                  updateConversation(activeConversation.id, { assignedTo: operatorId });
                } catch (err) {
                  console.error("[chat] Error asignando:", err);
                } finally {
                  setIsAssigning(false);
                }
              }}
              className="text-xs h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none hover:border-slate-300 focus:border-slate-400 transition-colors disabled:opacity-50"
              aria-label="Asignar operador"
            >
              <option value="">Sin asignar</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          )}
          <button
              type="button"
              onClick={() => void handleCloseConversation()}
              disabled={isClosing}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 font-medium",
                activeConversation.status === "open"
                  ? "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              )}
            >
              {isClosing
                ? activeConversation.status === "open" ? "Cerrando..." : "Reabriendo..."
                : activeConversation.status === "open" ? "✓ Resolver" : "↩ Reabrir"}
            </button>
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

        {/* Tags row — debajo del header */}
        <div className="px-4 pb-2.5 flex items-center gap-1.5 flex-wrap">
          {convTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: tag.color + "22", color: tag.color, border: `1px solid ${tag.color}44` }}
            >
              {tag.name}
              <button
                onClick={() => void toggleTag(tag)}
                className="opacity-60 hover:opacity-100 transition-opacity ml-0.5 leading-none"
                title={`Quitar tag ${tag.name}`}
              >×</button>
            </span>
          ))}
          {/* Botón + para agregar tag */}
          <div className="relative">
            <button
              onClick={() => setShowTagPicker((v) => !v)}
              className="text-[11px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded-full border border-dashed border-slate-200 hover:border-slate-400 transition-colors"
              title="Agregar tag"
            >
              + tag
            </button>
            {showTagPicker && allTags.length > 0 && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl border border-slate-200 shadow-lg min-w-[160px] py-1">
                {allTags.map((tag) => {
                  const assigned = convTags.some((t) => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => { void toggleTag(tag); setShowTagPicker(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </span>
                      {assigned && <span className="text-violet-500 text-[10px]">✓</span>}
                    </button>
                  );
                })}
                {allTags.length === 0 && (
                  <p className="text-xs text-slate-400 px-3 py-2">Sin tags — creá uno en Settings</p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Barra de búsqueda Ctrl+F */}
      {showMsgSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={msgSearchRef}
            type="text"
            value={msgSearchQuery}
            onChange={(e) => setMsgSearchQuery(e.target.value)}
            placeholder="Buscar en la conversación..."
            className="flex-1 text-xs bg-transparent border-none outline-none text-slate-700 placeholder:text-amber-400"
            onKeyDown={(e) => { if (e.key === "Escape") { setShowMsgSearch(false); setMsgSearchQuery(""); } }}
          />
          {msgSearchQuery && (
            <span className="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded-full">
              {messages.filter((m) => !m.body.startsWith("__ic_ctx__") && m.body.toLowerCase().includes(msgSearchQuery.toLowerCase())).length} resultados
            </span>
          )}
          <button
            onClick={() => { setShowMsgSearch(false); setMsgSearchQuery(""); }}
            className="text-amber-400 hover:text-amber-600 transition-colors text-xs font-bold ml-1"
          >✕</button>
        </div>
      )}

      {/* Area de mensajes */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {/* Session Context — páginas visitadas antes del chat */}
        {(() => {
          const ctxMsg = messages.find((m) => m.body.startsWith("__ic_ctx__"));
          if (!ctxMsg) return null;
          try {
            const pages = JSON.parse(ctxMsg.body.slice(10)) as { url: string; title: string; ts: string }[];
            return (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-1">
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Páginas visitadas antes del chat
                </p>
                <div className="flex flex-col gap-1">
                  {pages.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-blue-300 w-4 flex-shrink-0 text-right">{i + 1}</span>
                      <span className="text-xs text-blue-700 font-mono truncate flex-1" title={p.url}>{p.url}</span>
                      {p.title && p.title !== p.url && (
                        <span className="text-[10px] text-blue-400 truncate max-w-[120px]">{p.title}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          } catch { return null; }
        })()}
        {messages.filter((m) => !m.body.startsWith("__ic_ctx__")).length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-400">Sin mensajes aún</p>
          </div>
        ) : (
          messages.filter((m) => !m.body.startsWith("__ic_ctx__")).map((message) => {
            const isOperator = message.sender === "operator";
            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-end gap-2 max-w-[70%]",
                  message.sender === "operator" || message.sender === "note"
                    ? "ml-auto flex-row-reverse"
                    : "mr-auto"
                )}
              >
                {/* Avatar del remitente */}
                {message.sender === "contact" && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs text-slate-600">
                    {getInitials(displayName)}
                  </div>
                )}
                {/* Burbuja del mensaje */}
                <div
                  className={cn(
                    "px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words",
                    message.sender === "note"
                      ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-br-sm"
                      : message.sender === "operator"
                        ? "bg-slate-800 text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  )}
                >
                  {message.sender === "note" && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 mb-1 uppercase tracking-wide">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Nota interna
                    </span>
                  )}
                  <p>{message.body}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      message.sender === "note" ? "text-amber-500" : message.sender === "operator" ? "text-slate-400" : "text-slate-500"
                    )}
                  >
                    {timeAgo(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {/* Indicador de typing — el operador ve "el visitante está escribiendo..." */}
        {activeConversation && typingMapRef.current.get(activeConversation.id)?.contact && (
          <div className="flex items-end gap-2 justify-start px-1">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input del operador — solo si la conversación está abierta */}
      {/* Canned responses picker — aparece al escribir "/" */}
      {showCannedPicker && (
        <div className="mx-6 mb-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
            <kbd className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-mono">/</kbd>
            <span className="text-xs text-slate-500">Respuestas rápidas · ↑↓ navegar · Enter seleccionar · Esc cerrar</span>
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filteredCanned.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => applyCannedResponse(c)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors",
                    i === cannedSelected ? "bg-slate-100" : "hover:bg-slate-50"
                  )}
                >
                  <span className="text-xs font-semibold text-slate-700">/{c.shortcut}</span>
                  <span className="text-xs text-slate-500 truncate">{c.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {activeConversation.status === "closed" ? (
        <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 border border-slate-200">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-slate-500">
              Conversación resuelta — no se pueden enviar más mensajes
            </p>
          </div>
        </div>
      ) : (
        <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0">
          {/* Toggle Nota interna */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setIsNoteMode((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors",
                isNoteMode
                  ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                  : "border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {isNoteMode ? "Nota interna (privada)" : "Nota interna"}
            </button>
            <p className="text-xs text-slate-400">Enter para enviar · Shift+Enter nueva línea</p>
          </div>
          <div className={cn(
            "flex items-end gap-3 rounded-xl border px-4 py-3 focus-within:border-slate-400 transition-colors",
            isNoteMode ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
          )}>
            <textarea
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isNoteMode ? "Escribí una nota interna (solo el equipo la ve)..." : "Escribí un mensaje... (Enter para enviar)"}
              rows={1}
              disabled={isSending}
              className={cn(
                "flex-1 bg-transparent text-sm placeholder:text-slate-400 resize-none outline-none max-h-32 leading-relaxed disabled:opacity-50",
                isNoteMode ? "text-amber-900" : "text-slate-800"
              )}
              style={{ minHeight: "24px" }}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!inputValue.trim() || isSending}
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                inputValue.trim() && !isSending
                  ? isNoteMode
                    ? "bg-amber-500 text-white hover:bg-amber-600 active:scale-95"
                    : "bg-slate-800 text-white hover:bg-slate-700 active:scale-95"
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
        </div>
      )}
    </main>
  );
}
