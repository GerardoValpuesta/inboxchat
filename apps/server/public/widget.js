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

  // Branding — se actualiza desde el servidor via fetchConfig()
  var widgetTitle = config.title || "Soporte";
  var widgetColor = config.color || "#1e293b";
  var widgetWelcome = config.welcomeMessage || "¡Hola! 👋 ¿En qué podemos ayudarte?";
  var widgetGdprEnabled = config.gdprEnabled || false;
  var showBranding = false;  // se actualiza desde fetchConfig()

  if (!WORKSPACE_KEY) {
    console.error("[InboxChat] workspaceKey es requerido");
    return;
  }

  // ─── Estado ────────────────────────────────────────────────────────────────
  // Clave de localStorage por workspace para no mezclar conversaciones entre sitios
  var LS = "ic_" + WORKSPACE_KEY;

  function lsGet(k) { try { return localStorage.getItem(LS + k); } catch(_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(LS + k, v); } catch(_) {} }

  var state = {
    socket: null,
    conversationId: lsGet("_cid") || null,   // restaurado entre sesiones
    isOpen: false,
    isConnected: false,
    messages: [],
    operatorOnline: false,
    preChatDone: !!lsGet("_pcd"),             // true si el visitante ya pasó el form
    preChatContact: null,
  };

  // ─── Session Context: rastrear últimas 5 páginas visitadas ──────────────────────
  var PAGE_HISTORY_KEY = "ic_ph_" + WORKSPACE_KEY;
  var MAX_PAGES = 5;

  function getPageHistory() {
    try {
      return JSON.parse(sessionStorage.getItem(PAGE_HISTORY_KEY) || "[]");
    } catch(_) { return []; }
  }

  function trackPage() {
    try {
      var history = getPageHistory();
      var entry = {
        url: window.location.pathname + (window.location.search || ""),
        title: document.title || window.location.pathname,
        ts: new Date().toISOString(),
      };
      // Evitar duplicados consecutivos
      if (history.length > 0 && history[history.length - 1].url === entry.url) return;
      history.push(entry);
      if (history.length > MAX_PAGES) history = history.slice(-MAX_PAGES);
      sessionStorage.setItem(PAGE_HISTORY_KEY, JSON.stringify(history));
    } catch(_) {}
  }

  // Rastrear en carga inicial y en cambios de URL (SPA-friendly)
  trackPage();
  var _pushState = history.pushState;
  history.pushState = function() {
    _pushState.apply(history, arguments);
    trackPage();
  };
  window.addEventListener("popstate", trackPage);

  // ─── UI ────────────────────────────────────────────────────────────────────
  function createStyles() {
    var style = document.createElement("style");
    style.textContent = [
      "#ic-widget-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:var(--ic-primary,#1e293b);border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .2s,box-shadow .2s}",
      "#ic-widget-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.3)}",
      "#ic-widget-btn svg{color:white;width:24px;height:24px}",
      "#ic-badge{position:absolute;top:-2px;right:-2px;background:#22c55e;color:white;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;font-family:system-ui}",
      "#ic-panel{position:fixed;bottom:92px;right:24px;width:360px;height:520px;background:white;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);display:none;flex-direction:column;z-index:2147483645;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;transition:opacity .2s,transform .2s}",
      "#ic-panel.open{display:flex}",
      "#ic-header{background:var(--ic-primary,#1e293b);padding:16px;display:flex;align-items:center;gap:10px;flex-shrink:0}",
      "#ic-header-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:white}",
      "#ic-header-info{flex:1}",
      "#ic-header-name{color:white;font-size:14px;font-weight:600;margin:0}",
      "#ic-header-status{color:rgba(255,255,255,0.65);font-size:12px;margin:0}",
      "#ic-close-btn{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.65);padding:4px;border-radius:6px}",
      "#ic-close-btn:hover{color:white}",
      "#ic-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f8fafc}",
      ".ic-msg{max-width:80%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-break:break-word}",
      ".ic-msg.contact{background:white;color:#1e293b;border-radius:16px 16px 16px 4px;align-self:flex-start;box-shadow:0 1px 3px rgba(0,0,0,.08)}",
      ".ic-msg.operator{background:var(--ic-primary,#1e293b);color:white;border-radius:16px 16px 4px 16px;align-self:flex-end}",
      ".ic-msg-time{font-size:10px;margin-top:4px;opacity:.6}",
      "#ic-input-area{padding:12px;border-top:1px solid #e2e8f0;display:flex;gap:8px;background:white;flex-shrink:0}",
      "#ic-input{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;resize:none;font-family:inherit;max-height:80px;color:#1e293b}",
      "#ic-input:focus{border-color:#94a3b8}",
      "#ic-send-btn{width:38px;height:38px;border-radius:10px;background:var(--ic-primary,#1e293b);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s}",
      "#ic-send-btn:disabled{opacity:.4;cursor:not-allowed}",
      "#ic-send-btn svg{color:white;width:16px;height:16px}",
      "#ic-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;text-align:center;padding:24px}",
      "#ic-empty p{font-size:14px;margin:8px 0 0 0}",
      "#ic-prechat{position:absolute;inset:0;top:68px;background:white;display:flex;flex-direction:column;padding:20px;gap:12px;z-index:10}",
      "#ic-prechat h3{font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px}",
      "#ic-prechat p{font-size:12px;color:#64748b;margin:0}",
      ".ic-field{display:flex;flex-direction:column;gap:4px;}",
      ".ic-field label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.04em}",
      ".ic-field input{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;color:#1e293b;outline:none;transition:border-color .15s}",
      ".ic-field input:focus{border-color:var(--ic-primary,#1e293b)}",
      "#ic-prechat-btn{margin-top:4px;padding:11px;border-radius:10px;background:var(--ic-primary,#1e293b);color:white;font-size:14px;font-weight:600;border:none;cursor:pointer;transition:opacity .15s}",
      "#ic-prechat-btn:hover{opacity:.9}",
      "#ic-prechat .ic-skip{font-size:12px;color:#94a3b8;text-align:center;background:none;border:none;cursor:pointer;padding:4px;text-decoration:underline}",
      ".ic-gdpr{display:flex;align-items:flex-start;gap:8px;font-size:11px;color:#64748b;padding:4px 0;cursor:pointer}",
      ".ic-gdpr input[type='checkbox']{margin-top:2px;accent-color:var(--ic-primary,#1e293b);cursor:pointer;flex-shrink:0}",
      "@media(max-width:420px){#ic-panel{width:calc(100vw - 24px);right:12px;bottom:80px;height:480px}}",
      "#ic-branding{display:none;padding:4px 12px 6px;text-align:center;background:white;border-top:1px solid #f1f5f9}",
      "#ic-branding a{font-size:10px;color:#94a3b8;text-decoration:none;display:inline-flex;align-items:center;gap:3px;transition:color .15s}",
      "#ic-branding a:hover{color:#475569}",
      "#ic-branding a svg{width:10px;height:10px;opacity:.7}",
    ].join("");
    document.head.appendChild(style);
    // Inyectar CSS custom property del color primario
    var brandStyle = document.createElement("style");
    brandStyle.id = "ic-brand-color";
    brandStyle.textContent = ":root { --ic-primary: " + widgetColor + "; }";
    document.head.appendChild(brandStyle);
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
      '  <div id="ic-header-avatar">' + widgetTitle.slice(0, 2).toUpperCase() + '</div>',
      '  <div id="ic-header-info">',
      '    <p id="ic-header-name">' + escapeHtml(widgetTitle) + '</p>',
      '    <p id="ic-header-status">Conectando...</p>',
      "  </div>",
      '  <button id="ic-close-btn" aria-label="Cerrar chat">',
      '    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
      "  </button>",
      "</div>",
      // Pre-chat form (visible antes de conectar el socket)
      '<div id="ic-prechat">',
      '  <div>',
      '    <h3>Hablemos 👋</h3>',
      '    <p>Dejá tus datos y te respondemos rápido.</p>',
      '  </div>',
      '  <div class="ic-field">',
      '    <label for="ic-name">Nombre</label>',
      '    <input id="ic-name" type="text" placeholder="Tu nombre" autocomplete="name" />',
      '  </div>',
      '  <div class="ic-field">',
      '    <label for="ic-email">Email</label>',
      '    <input id="ic-email" type="email" placeholder="tu@email.com" autocomplete="email" />',
      '  </div>',
      '  <button id="ic-prechat-btn">Iniciar chat →</button>',
      '  <button class="ic-skip" id="ic-prechat-skip">Continuar sin datos</button>',
      widgetGdprEnabled ? [
        '  <label class="ic-gdpr">',
        '    <input type="checkbox" id="ic-gdpr-check" />',
        '    <span>Acepto que mis datos sean usados para brindarme soporte. <a href="/privacy" target="_blank" style="color:inherit;text-decoration:underline">Política de privacidad</a></span>',
        '  </label>',
      ].join("") : "",
      '</div>',
      '<div id="ic-messages">',
      '  <div id="ic-empty">',
      '    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>',
      '    <p id="ic-welcome-text">' + escapeHtml(widgetWelcome) + '</p>',
      "  </div>",
      "</div>",
      '<div id="ic-input-area">',
      '  <textarea id="ic-input" placeholder="Escribi un mensaje..." rows="1"></textarea>',
      '  <button id="ic-send-btn" aria-label="Enviar" disabled>',
      '    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>',
      "  </button>",
      "</div>",
      // PLG branding badge — solo visible en free tier
      '<div id="ic-branding">',
      '  <a href="https://inboxchat.app" target="_blank" rel="noopener noreferrer">',
      '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/></svg>',
      '    Powered by InboxChat',
      '  </a>',
      '</div>',
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
      // Railway's proxy drops WebSocket upgrades inconsistently from same-origin.
      // Polling is slower but stable — ensures conversationId stays on the same session.
      transports: ["polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1500,
    });

    state.socket = socket;

    socket.on("connect", function () {
      state.isConnected = true;
      updateStatus(state.operatorOnline ? "En linea" : "Disponible");
      document.getElementById("ic-send-btn").disabled = false;

      if (state.conversationId) {
        // Reconexión: restaurar la sesión + pedir historial de mensajes
        socket.emit(
          "conversation:rejoin",
          { conversationId: state.conversationId },
          function (result) {
            if (result && result.ok && Array.isArray(result.messages) && result.messages.length > 0) {
              // Renderizar historial (los mensajes vienen con created_at del DB)
              result.messages.forEach(function (msg, i) {
                // Notas internas: privadas, no mostrar al visitante
                if (msg.sender === "note") return;
                addMessage({
                  body: msg.body,
                  sender: msg.sender,
                  createdAt: msg.createdAt || msg.created_at,
                }, i < result.messages.length - 1 ? false : undefined);
              });
            }
          }
        );
      } else {
        // Primera conexión: crear nueva conversación
        startConversation();
      }
    });

    socket.on("disconnect", function () {
      state.isConnected = false;
      updateStatus("Reconectando...");
      document.getElementById("ic-send-btn").disabled = true;
    });

    socket.on("message:received", function (data) {
      // Las notas internas (sender='note') son privadas del equipo — nunca mostrarlas al visitante
      if (data.message && data.message.sender === "note") return;
      addMessage(data.message);
    });

    socket.on("operator:status", function (data) {
      state.operatorOnline = data.online;
      updateStatus(data.online ? "En linea" : "Disponible");
    });
  }

  function startConversation() {
    if (!state.socket || state.conversationId) return;

    var contact = state.preChatContact || config.contact || {};
    state.socket.emit(
      "conversation:start",
      {
        workspaceKey: WORKSPACE_KEY,
        contact: (contact.name || contact.email || contact.externalId) ? contact : undefined,
        pageHistory: getPageHistory(),  // las últimas páginas visitadas
      },
      function (result) {
        if (result.ok) {
          state.conversationId = result.conversation.id;
          lsSet("_cid", state.conversationId);  // persistir para recargas
        } else if (result.error === "trial_expired" || result.error === "trial_limit_reached") {
          // Mostrar panel de trial expirado al visitante
          showTrialExpiredUI(result.error);
        } else {
          console.error("[InboxChat] Error al iniciar conversación:", result.error);
          updateStatus("Error de conexion");
        }
      }
    );
  }

  function showTrialExpiredUI(reason) {
    var messagesEl = document.getElementById("ic-messages");
    var inputArea = document.getElementById("ic-input-area");
    if (!messagesEl) return;

    var msg = reason === "trial_limit_reached"
      ? "Este chat ha alcanzado el límite de conversaciones de su plan gratuito."
      : "El período de prueba gratuita de este chat ha expirado.";

    messagesEl.innerHTML = [
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:24px;text-align:center;gap:12px">',
      '<div style="font-size:32px">⏰</div>',
      '<p style="margin:0;font-size:14px;color:#475569;font-weight:600">' + msg + '</p>',
      '<p style="margin:0;font-size:12px;color:#94a3b8">El equipo está trabajando para restablecer el servicio pronto.</p>',
      '</div>'
    ].join("");

    if (inputArea) {
      inputArea.style.display = "none";
    }
    updateStatus("No disponible");
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

    // Si el visitante ya pasó el pre-chat (sesión anterior), ocultar el form de entrada
    if (state.preChatDone || state.conversationId) {
      var existingPrechat = document.getElementById("ic-prechat");
      if (existingPrechat) existingPrechat.style.display = "none";
    }

    // Toggle del panel
    ui.btn.addEventListener("click", function () {
      state.isOpen = !state.isOpen;
      document.getElementById("ic-panel").classList.toggle("open", state.isOpen);

      // Solo conectar el socket si ya se completó el pre-chat (o si ya existe conv)
      if (state.isOpen && !state.socket && (state.preChatDone || state.conversationId)) {
        loadSocketIO(connectSocket);
      }
    });

    // Pre-chat: submit del form -> conectar socket con datos del contacto
    function submitPreChat(skip) {
      // Validar GDPR si está habilitado y no es skip
      if (!skip && widgetGdprEnabled) {
        var gdprCheck = document.getElementById("ic-gdpr-check");
        if (gdprCheck && !gdprCheck.checked) {
          gdprCheck.style.outline = "2px solid #ef4444";
          return;
        }
      }
      var name = skip ? "" : (document.getElementById("ic-name").value.trim() || "");
      var email = skip ? "" : (document.getElementById("ic-email").value.trim() || "");
      state.preChatContact = (name || email) ? { name: name, email: email } : null;
      state.preChatDone = true;
      lsSet("_pcd", "1");  // persistir para recargas
      // Ocultar el pre-chat form, mostrar chat normal
      var preChatEl = document.getElementById("ic-prechat");
      if (preChatEl) preChatEl.style.display = "none";
      // Conectar socket
      if (!state.socket) loadSocketIO(connectSocket);
    }

    document.getElementById("ic-prechat-btn").addEventListener("click", function () {
      submitPreChat(false);
    });

    document.getElementById("ic-prechat-skip").addEventListener("click", function () {
      submitPreChat(true);
    });

    // Enter en inputs del prechat
    ["ic-name", "ic-email"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { submitPreChat(false); }
      });
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

  // ─── Fetch config del servidor ───────────────────────────────────────────
  function fetchConfig(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", SERVER_URL + "/api/widget/config?key=" + encodeURIComponent(WORKSPACE_KEY), true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var cfg = JSON.parse(xhr.responseText);
          if (cfg.title) widgetTitle = cfg.title;
          if (cfg.color) {
            widgetColor = cfg.color;
            // Actualizar CSS custom property si ya estaba inyectada
            var brandEl = document.getElementById("ic-brand-color");
            if (brandEl) brandEl.textContent = ":root { --ic-primary: " + cfg.color + "; }";
          }
          if (cfg.welcomeMessage) widgetWelcome = cfg.welcomeMessage;
          if (cfg.gdprEnabled !== undefined) widgetGdprEnabled = cfg.gdprEnabled;
          if (cfg.showBranding) {
            showBranding = true;
            // Mostrar el badge PLG si el DOM ya está creado
            var brandingEl = document.getElementById("ic-branding");
            if (brandingEl) brandingEl.style.display = "block";
          }
        } catch (_) { /* ignorar errores de parseo */ }
      }
      callback();
    };
    xhr.onerror = function () { callback(); };
    xhr.send();
  }

  // Esperar al DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      fetchConfig(init);
    });
  } else {
    fetchConfig(init);
  }

  // Exponer API pública
  window.InboxChat.init = init;
})(window);
