import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Database } from "../db/client.js";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt.js";

const BCRYPT_ROUNDS = 10;

/**
 * GET  /api/operators          — listar operadores del workspace
 * POST /api/operators/invite   — invitar a un nuevo operador (crea + envía email)
 * DELETE /api/operators/:id    — eliminar operador (owner solo puede eliminarse a sí mismo si es el único)
 */
export async function operatorsRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  // Helper: obtener workspaceId y operatorId del JWT
  async function getOperatorContext(authHeader: string | undefined) {
    if (!authHeader) return null;
    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return { workspaceId: payload.workspaceId, operatorId: payload.sub };
  }

  // ─── GET /api/operators ──────────────────────────────────────────────────
  app.get("/api/operators", async (request, reply) => {
    const ctx = await getOperatorContext(request.headers["authorization"] as string);
    if (!ctx) return reply.status(401).send({ error: "No autenticado" });

    const operators = await db<{
      id: string;
      name: string;
      email: string;
      created_at: string;
    }[]>`
      SELECT id, name, email, created_at
      FROM operators
      WHERE workspace_id = ${ctx.workspaceId}
      ORDER BY created_at ASC
    `;

    return reply.send({ operators });
  });

  // ─── POST /api/operators/invite ──────────────────────────────────────────
  app.post<{ Body: { email: string; name: string } }>(
    "/api/operators/invite",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const ctx = await getOperatorContext(request.headers["authorization"] as string);
      if (!ctx) return reply.status(401).send({ error: "No autenticado" });

      const { email, name } = request.body;
      if (!email || !name) {
        return reply.status(400).send({ error: "Email y nombre son requeridos" });
      }

      // Verificar que el email no exista ya en el workspace
      const [existing] = await db<{ id: string }[]>`
        SELECT id FROM operators
        WHERE email = ${email} AND workspace_id = ${ctx.workspaceId}
        LIMIT 1
      `;
      if (existing) {
        return reply.status(409).send({ error: "Ya existe un operador con ese email" });
      }

      // Crear operador con contraseña temporal bloqueada (el reset la configura)
      const tempPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), BCRYPT_ROUNDS);
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

      const [newOp] = await db<{ id: string }[]>`
        INSERT INTO operators (workspace_id, email, name, password_hash, reset_token, reset_token_expires_at)
        VALUES (${ctx.workspaceId}, ${email}, ${name}, ${tempPasswordHash}, ${resetToken}, ${resetExpiresAt})
        RETURNING id
      `;

      // Enviar email de invitación
      if (process.env["RESEND_API_KEY"]) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env["RESEND_API_KEY"]);
        const FROM = process.env["EMAIL_FROM"] ?? "InboxChat <no-reply@inboxchat.app>";
        const webUrl = process.env["WEB_URL"] ?? "https://inboxchat-web.vercel.app";
        const resetUrl = `${webUrl}/reset-password?token=${resetToken}`;

        await resend.emails.send({
          from: FROM,
          to: email,
          subject: "Te invitaron a InboxChat",
          html: `
<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 16px">
  <h2 style="color:#0f172a;font-size:20px;margin-bottom:8px">Te invitaron a InboxChat 🎉</h2>
  <p style="color:#475569;font-size:14px;margin-bottom:8px">
    Hola ${name}! Fuiste invitado para responder chats en InboxChat.
  </p>
  <p style="color:#475569;font-size:14px;margin-bottom:24px">
    Hacé click en el botón para configurar tu contraseña y empezar.
  </p>
  <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
    Configurar contraseña →
  </a>
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">
    El link vence en 7 días.
  </p>
</div>`,
        });
      }

      return reply.status(201).send({ ok: true, id: newOp?.id });
    }
  );

  // ─── DELETE /api/operators/:id ───────────────────────────────────────────
  app.delete<{ Params: { id: string } }>(
    "/api/operators/:id",
    async (request, reply) => {
      const ctx = await getOperatorContext(request.headers["authorization"] as string);
      if (!ctx) return reply.status(401).send({ error: "No autenticado" });

      const { id } = request.params;

      // No puede eliminarse a sí mismo
      if (id === ctx.operatorId) {
        return reply.status(400).send({ error: "No podés eliminarte a vos mismo" });
      }

      // El operador a eliminar debe pertenecer al mismo workspace
      const result = await db`
        DELETE FROM operators
        WHERE id = ${id} AND workspace_id = ${ctx.workspaceId}
      `;

      if (result.count === 0) {
        return reply.status(404).send({ error: "Operador no encontrado" });
      }

      return reply.send({ ok: true });
    }
  );
}
