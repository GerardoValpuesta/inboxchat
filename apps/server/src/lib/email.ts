import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("RESEND_API_KEY no configurada");
  _resend = new Resend(key);
  return _resend;
}

const FROM = process.env["EMAIL_FROM"] ?? "InboxChat <no-reply@inboxchat.app>";

/**
 * Notifica al operador cuando llega la primera conversación nueva
 * desde que estaba desconectado.
 */
export async function sendNewConversationEmail(opts: {
  to: string;
  workspaceName: string;
  visitorName?: string;
  message: string;
  inboxUrl: string;
}): Promise<void> {
  const resend = getResend();
  const visitor = opts.visitorName ?? "Un visitante";

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `💬 Nuevo mensaje en ${opts.workspaceName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 32px;">
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:4px">InboxChat</div>
      <h1 style="color:white;font-size:20px;font-weight:700;margin:0">Nuevo mensaje</h1>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 16px">
        <strong>${visitor}</strong> te enviÃ³ un mensaje en <strong>${opts.workspaceName}</strong>:
      </p>
      <div style="background:#f8fafc;border-left:3px solid #7c3aed;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="color:#1e293b;font-size:14px;margin:0;line-height:1.6;">&ldquo;${opts.message}&rdquo;</p>
      </div>
      <a
        href="${opts.inboxUrl}"
        style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;"
      >
        Responder ahora →
      </a>
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0">
        Recibís este email porque tenés InboxChat instalado en ${opts.workspaceName}
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

/**
 * Alerta SLA — se envía al operador cuando una conversación lleva
 * más de sla_minutes sin respuesta del equipo.
 */
export async function sendSlaAlert(opts: {
  to: string;
  workspaceName: string;
  visitorName?: string;
  conversationId: string;
  waitingMinutes: number;
  slaMinutes: number;
  inboxUrl: string;
}): Promise<void> {
  const resend = getResend();
  const visitor = opts.visitorName ?? "Un visitante";
  const waiting = opts.waitingMinutes >= 60
    ? `${Math.round(opts.waitingMinutes / 60)}h`
    : `${opts.waitingMinutes} min`;

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `⏰ Conversación sin respuesta (${waiting}) — ${opts.workspaceName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:28px 32px;">
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:4px">InboxChat · Alerta SLA</div>
      <h1 style="color:white;font-size:20px;font-weight:700;margin:0">Conversación esperando respuesta</h1>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 16px">
        <strong>${visitor}</strong> está esperando una respuesta hace
        <strong style="color:#dc2626">${waiting}</strong> en <strong>${opts.workspaceName}</strong>.
      </p>
      <div style="background:#fef2f2;border-left:3px solid #dc2626;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="color:#7f1d1d;font-size:13px;margin:0;">
          Tu SLA configurado es de <strong>${opts.slaMinutes} minutos</strong>.
          Esta conversación lo superó hace ${waiting}.
        </p>
      </div>
      <a
        href="${opts.inboxUrl}"
        style="display:inline-block;background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;"
      >
        Responder ahora →
      </a>
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0">
        Podés ajustar el threshold de SLA en InboxChat → Settings → Notificaciones
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
/**
 * CSAT — se envía al visitante/contacto cuando el operador cierra la conversación.
 * Incluye 5 emojis clickeables que llevan a GET /api/csat?id=X&rating=N
 */
export async function sendCsatEmail(opts: {
  to: string;
  workspaceName: string;
  visitorName?: string;
  conversationId: string;
  serverUrl?: string;
}): Promise<void> {
  const resend = getResend();
  const visitor = opts.visitorName ? `, ${opts.visitorName}` : "";
  const base = opts.serverUrl ??
    process.env["SERVER_URL"] ??
    process.env["RAILWAY_PUBLIC_DOMAIN"] ??
    "https://inboxchatserver-production.up.railway.app";
  const stars = [1, 2, 3, 4, 5].map((n) => {
    const emoji = n <= 2 ? "😞" : n === 3 ? "😐" : n === 4 ? "😊" : "🤩";
    const url = `${base}/api/csat?id=${encodeURIComponent(opts.conversationId)}&rating=${n}`;
    return `<a href="${url}" style="text-decoration:none;font-size:32px;margin:0 6px;display:inline-block;transition:transform .15s" title="${n} estrella${n > 1 ? "s" : ""}"
      onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${emoji}</a>`;
  }).join("");

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `¿Cómo fue tu experiencia con ${opts.workspaceName}?`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 32px;">
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:4px">InboxChat · ${opts.workspaceName}</div>
      <h1 style="color:white;font-size:20px;font-weight:700;margin:0">Tu consulta fue resuelta 🎉</h1>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px;text-align:center;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px">
        Hola${visitor}! ¿Cómo calificarías la atención que recibiste?
      </p>
      <div style="margin:0 0 24px;">${stars}</div>
      <p style="color:#94a3b8;font-size:12px;margin:0">
        Tu feedback nos ayuda a mejorar. Gracias por usar ${opts.workspaceName}.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0">
        Powered by <a href="https://inboxchat.app" style="color:#7c3aed;text-decoration:none">InboxChat</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

/**
 * Welcome email — se envía al nuevo usuario al hacer signup.
 * Incluye el snippet de instalación del widget y CTA al inbox.
 */
export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  workspaceName: string;
  apiKey: string;
  inboxUrl: string;
}): Promise<void> {
  const resend = getResend();
  const SERVER_EMBED = "https://inboxchatserver-production.up.railway.app";
  const snippet = `&lt;script&gt;\n  window.InboxChat = { workspaceKey: '${opts.apiKey}' };\n&lt;/script&gt;\n&lt;script src="${SERVER_EMBED}/widget.js" defer&gt;&lt;/script&gt;`;

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `¡Bienvenido a InboxChat, ${opts.name}! 🎉`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 32px;">
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:4px">InboxChat</div>
      <h1 style="color:white;font-size:20px;font-weight:700;margin:0">¡Hola, ${opts.name}! 👋</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 16px">
        Ya tenés tu workspace <strong>${opts.workspaceName}</strong> listo.
      </p>
      <div style="background:#1e293b;border-radius:10px;padding:16px;margin-bottom:20px;">
        <pre style="color:#e2e8f0;font-size:12px;margin:0;white-space:pre-wrap;">${snippet}</pre>
      </div>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">
        Pegalo en el &lt;head&gt; de tu sitio y empezá a recibir chats en tiempo real.
      </p>
      <a href="${opts.inboxUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">
        Ir al inbox →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0">
        14 días de trial · Sin tarjeta ·
        <a href="https://inboxchat.app" style="color:#7c3aed;text-decoration:none">inboxchat.app</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
