/**
 * InboxChat Widget
 *
 * Este archivo se sirve como /widget.js desde el servidor Fastify.
 * Es el script que los clientes incrustan en sus webs con:
 *
 *   <script src="https://tu-servidor.com/widget.js"></script>
 *
 * Requisitos:
 * - Zero dependencias externas en el HTML del cliente (socket.io se carga aquí)
 * - Funciona en cualquier web moderna
 * - No bloquea el render de la página (async)
 * - UI completa auto-contenida (shadow DOM en v2 — por ahora estilos inline)
 */

(function (window) {
  "use strict";

  var config = window.InboxChat || {};
  var WORKSPACE_KEY = config.workspaceKey;
  var SERVER_URL = config.serverUrl || "http://localhost:3001";

  if (!WORKSPACE_KEY) {
    console.error("[InboxChat] workspaceKey es requerido");
    return;
  }

  // ─── Estado ────────────────────────────────────────────────────────────────
  var state = {
    socket: null,
    conversationId: null,
    isOpen: false,
    isConnected: false,
    messages: [],
    operatorOnline: false,
  };

  // ─── UI ────────────────────────────────────────────────────────────────────
  function createStyles() {
    var style = document.createElement("style");
    style.textContent = [
      "#ic-widget-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#1e293b;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .2s,box-shadow .2s}",
      "#ic-widget-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.3)}",
      "#ic-widget-btn svg{color:white;width:24px;height:24px}",
      "#ic-badge{position:absolute;top:-2px;right:-2px;background:#22c55e;color:white;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;font-family:system-ui}",
      "#ic-panel{position:fixed;bottom:92px;right:24px;width:360px;height:520px;background:white;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);display:none;flex-direction:column;z-index:2147483645;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;transition:opacity .2s,transform .2s}",
      "#ic-panel.open{display:flex}",
      "#ic-header{background:#1e293b;padding:16px;display:flex;align-items:center;gap:10px;flex-shrink:0}",
      "#ic-header-avatar{width:36px;height:36px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:white}",
      "#ic-header-info{flex:1}",
      "#ic-header-name{color:white;font-size:14px;font-weight:600;margin:0}",
      "#ic-header-status{color:#94a3b8;font-size:12px;margin:0}",
      "#ic-close-btn{background:none;border:none;cursor:pointer;color:#94a3b8;padding:4px;border-radius:6px}",
      "#ic-close-btn:hover{color:white}",
      "#ic-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f8fafc}",
      ".ic-msg{max-width:80%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-break:break-word}",
      ".ic-msg.contact{background:white;color:#1e293b;border-radius:16px 16px 16px 4px;align-self:flex-start;box-shadow:0 1px 3px rgba(0,0,0,.08)}",
      ".ic-msg.operator{background:#1e293b;color:white;border-radius:16px 16px 4px 16px;align-self:flex-end}",
      ".ic-msg-time{font-size:10px;margin-top:4px;opacity:.6}",
      "#ic-input-area{padding:12px;border-top:1px solid #e2e8f0;display:flex;gap:8px;background:white;flex-shrink:0}",
      "#ic-input{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;resize:none;font-family:inherit;max-height:80px;color:#1e293b}",
      "#ic-input:focus{border-color:#94a3b8}",
      "#ic-send-btn{width:38px;height:38px;border-radius:10px;background:#1e293b;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s}",
      "#ic-send-btn:disabled{opacity:.4;cursor:not-allowed}",
      "#ic-send-btn svg{color:white;width:16px;height:16px}",
      "#ic-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;text-align:center;padding:24px}",
      "#ic-empty p{font-size:14px;margin:8px 0 0 0}",
      "@media(max-width:420px){#ic-panel{width:calc(100vw - 24px);right:12px;bottom:80px;height:480px}}",
    ].join("");
    document.head.appendChild(style);
  }

  function createWidget() {
    // Botón flotante
    var btn = document.createElement("button");
    btn.id = "ic-widget-btn";
    btn.setAttribute("aria-label", "Abrir chat");
    btn.innerHTML = [
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">',
      '<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />',
      "</svg>",
      '<span id="ic-badge">1</span>',
    ].join("");

    // Panel de chat
    var panel = document.createElement("div");
    panel.id = "ic-panel";
    panel.setAttribute("aria-label", "Chat de soporte");
    panel.innerHTML = [
      '<div id="ic-header">',
      '  <div id="ic-header-avatar">IC</div>',
      '  <div id="ic-header-info">',
      '    <p id="ic-header-name">Soporte</p>',
      '    <p id="ic-header-status">Conectando...</p>',
      "  </div>",
      '  <button id="ic-close-btn" aria-label="Cerrar chat">',
      '    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
      "  </button>",
      "</div>",
      '<div id="ic-messages">',
      '  <div id="ic-empty">',
      '    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>',
      "    <p>Hola! Como podemos ayudarte?</p>",
      "  </div>",
      "</div>",
      '<div id="ic-input-area">',
      '  <textarea id="ic-input" placeholder="Escribi un mensaje..." rows="1"></textarea>',
      '  <button id="ic-send-btn" aria-label="Enviar" disabled>',
      '    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>',
      "  </button>",
      "</div>",
    ].join("");

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    return { btn: btn, panel: panel };
  }

  // ─── Helpers de UI ─────────────────────────────────────────────────────────
  function updateStatus(text) {
    var el = document.getElementById("ic-header-status");
    if (el) el.textContent = text;
  }

  function addMessage(message, scroll) {
    var container = document.getElementById("ic-messages");
    var empty = document.getElementById("ic-empty");
    if (empty) empty.style.display = "none";

    var div = document.createElement("div");
    div.className = "ic-msg " + message.sender;
    div.innerHTML =
      "<div>" +
      escapeHtml(message.body) +
      '</div><div class="ic-msg-time">' +
      formatTime(message.createdAt) +
      "</div>";
    container.appendChild(div);

    if (scroll !== false) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // ─── Socket.io ─────────────────────────────────────────────────────────────
  function loadSocketIO(callback) {
    if (window.io) { callback(); return; }
    var s = document.createElement("script");
    s.src = SERVER_URL + "/socket.io/socket.io.js";
    s.onload = callback;
    s.onerror = function() {
      console.error("[InboxChat] No se pudo cargar socket.io desde el servidor");
    };
    document.head.appendChild(s);
  }

  function connectSocket() {
    var socket = window.io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1500,
    });

    state.socket = socket;

    socket.on("connect", function () {
      state.isConnected = true;
      updateStatus(state.operatorOnline ? "En linea" : "Disponible");
      document.getElementById("ic-send-btn").disabled = false;

      // Si no hay conversación activa, iniciarla al conectar
      if (!state.conversationId) {
        startConversation();
      }
    });

    socket.on("disconnect", function () {
      state.isConnected = false;
      updateStatus("Reconectando...");
      document.getElementById("ic-send-btn").disabled = true;
    });

    socket.on("message:received", function (data) {
      addMessage(data.message);
    });

    socket.on("operator:status", function (data) {
      state.operatorOnline = data.online;
      updateStatus(data.online ? "En linea" : "Disponible");
    });
  }

  function startConversation() {
    if (!state.socket || state.conversationId) return;

    var contact = config.contact || {};
    state.socket.emit(
      "conversation:start",
      {
        workspaceKey: WORKSPACE_KEY,
        contact: contact.externalId ? contact : undefined,
      },
      function (result) {
        if (result.ok) {
          state.conversationId = result.conversation.id;
        } else {
          console.error("[InboxChat] Error al iniciar conversación:", result.error);
          updateStatus("Error de conexion");
        }
      }
    );
  }

  function sendMessage(body) {
    if (!state.socket || !state.conversationId || !body.trim()) return;

    // Mostrar el mensaje inmediatamente (optimistic UI)
    addMessage({ body: body, sender: "contact", createdAt: new Date().toISOString() });

    state.socket.emit(
      "message:send",
      { conversationId: state.conversationId, body: body },
      function (result) {
        if (!result.ok) {
          console.error("[InboxChat] Error al enviar:", result.error);
        }
      }
    );
  }

  // ─── Inicialización ────────────────────────────────────────────────────────
  function init() {
    createStyles();
    var ui = createWidget();

    // Toggle del panel
    ui.btn.addEventListener("click", function () {
      state.isOpen = !state.isOpen;
      document.getElementById("ic-panel").classList.toggle("open", state.isOpen);

      if (state.isOpen && !state.socket) {
        loadSocketIO(connectSocket);
      }
    });

    document.getElementById("ic-close-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      state.isOpen = false;
      document.getElementById("ic-panel").classList.remove("open");
    });

    // Enviar mensaje
    var input = document.getElementById("ic-input");
    var sendBtn = document.getElementById("ic-send-btn");

    sendBtn.addEventListener("click", function () {
      var body = input.value.trim();
      if (!body) return;
      sendMessage(body);
      input.value = "";
      input.style.height = "auto";
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    // Auto-resize del textarea
    input.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 80) + "px";
      sendBtn.disabled = !this.value.trim();
    });
  }

  // Esperar al DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Exponer API pública
  window.InboxChat.init = init;
})(window);
