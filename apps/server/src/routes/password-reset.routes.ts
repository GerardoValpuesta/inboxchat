import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Database } from "../db/client.js";
import { sendNewConversationEmail } from "../lib/email.js";

const BCRYPT_ROUNDS = 10;
const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hora

export async function passwordResetRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  // ─── POST /api/auth/forgot-password ──────────────────────────────────────
  app.post<{ Body: { email: string } }>(
    "/api/auth/forgot-password",
    async (request, reply) => {
      const { email } = request.body;
      if (!email) return reply.status(400).send({ error: "Email requerido" });

      // Buscar operador (no revelar si existe o no por seguridad)
      const [op] = await db<{ id: string; name: string }[]>`
        SELECT id, name FROM operators WHERE email = ${email} LIMIT 1
      `;

      if (op) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + RESET_EXPIRY_MS);

        await db`
          UPDATE operators
          SET reset_token = ${token}, reset_token_expires_at = ${expiresAt}
          WHERE id = ${op.id}
        `;

        const webUrl = process.env["WEB_URL"] ?? "https://inboxchat-web.vercel.app";
        const resetUrl = `${webUrl}/reset-password?token=${token}`;

        // Reutilizamos el cliente de email con un template ad-hoc
        if (process.env["RESEND_API_KEY"]) {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env["RESEND_API_KEY"]);
          const FROM = process.env["EMAIL_FROM"] ?? "InboxChat <no-reply@inboxchat.app>";
          await resend.emails.send({
            from: FROM,
            to: email,
            subject: "Resetear contraseña — InboxChat",
            html: `
<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 16px">
  <h2 style="color:#0f172a;font-size:20px;margin-bottom:8px">Resetear tu contraseña</h2>
  <p style="color:#475569;font-size:14px;margin-bottom:24px">
    Hola ${op.name}, hacé click en el botón para resetear tu contraseña. El link expira en 1 hora.
  </p>
  <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
    Resetear contraseña →
  </a>
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">
    Si no pediste esto, ignorá este email.
  </p>
</div>`,
          });
        }
      }

      // Siempre responder 200 para no revelar si el email existe
      return reply.send({ ok: true });
    }
  );

  // ─── POST /api/auth/reset-password ───────────────────────────────────────
  app.post<{ Body: { token: string; password: string } }>(
    "/api/auth/reset-password",
    async (request, reply) => {
      const { token, password } = request.body;
      if (!token || !password)
        return reply.status(400).send({ error: "Token y contraseña requeridos" });
      if (password.length < 8)
        return reply.status(400).send({ error: "La contraseña debe tener al menos 8 caracteres" });

      const [op] = await db<{ id: string }[]>`
        SELECT id FROM operators
        WHERE reset_token = ${token}
          AND reset_token_expires_at > NOW()
        LIMIT 1
      `;

      if (!op) {
        return reply.status(400).send({ error: "Token inválido o expirado" });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await db`
        UPDATE operators
        SET password_hash = ${passwordHash},
            reset_token = NULL,
            reset_token_expires_at = NULL
        WHERE id = ${op.id}
      `;

      return reply.send({ ok: true });
    }
  );
}

// Silenciar el import no usado
void sendNewConversationEmail;
