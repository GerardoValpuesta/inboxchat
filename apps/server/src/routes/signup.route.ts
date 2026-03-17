import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { createOperator } from "../db/operators.js";
import { signToken } from "../lib/jwt.js";
import type { Database } from "../db/client.js";
import { sendWelcomeEmail } from "../lib/email.js";

const BCRYPT_ROUNDS = 10;

/**
 * POST /api/auth/signup
 * Crea un workspace nuevo + owner en un solo paso.
 * Usado por el onboarding público de la landing page.
 */
export async function signupRoute(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  app.post<{
    Body: { name: string; email: string; password: string; workspaceName: string };
  }>("/api/auth/signup", async (request, reply) => {
    const { name, email, password, workspaceName } = request.body;

    if (!name || !email || !password || !workspaceName) {
      return reply.status(400).send({ error: "Todos los campos son requeridos" });
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    // Verificar email único globalmente
    const [existingRow] = await db<{ id: string }[]>`
      SELECT id FROM operators WHERE email = ${email} LIMIT 1
    `;
    if (existingRow) {
      return reply.status(409).send({ error: "Ya existe una cuenta con ese email" });
    }

    // Generar API key única para el workspace
    const apiKey = `ic_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

    // Calcular trial (14 días desde el registro)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Crear workspace
    const [workspace] = await db<{ id: string; api_key: string }[]>`
      INSERT INTO workspaces (name, owner_email, api_key, plan, trial_ends_at)
      VALUES (${workspaceName}, ${email}, ${apiKey}, 'trial', ${trialEndsAt})
      RETURNING id, api_key
    `;
    if (!workspace) {
      return reply.status(500).send({ error: "Error al crear el workspace" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Crear operador owner
    const operator = await createOperator(db, {
      workspaceId: workspace.id,
      email,
      passwordHash,
      name,
      role: "owner",
    });

    const token = signToken({
      sub: operator.id,
      workspaceId: workspace.id,
      workspaceKey: workspace.api_key,
      email: operator.email,
      role: operator.role,
    });

    // Email de bienvenida — fire-and-forget, no bloquea el signup
    void (async () => {
      try {
        await sendWelcomeEmail({
          to: email,
          name,
          workspaceName,
          apiKey: workspace.api_key,
          inboxUrl: `${process.env["WEB_URL"] ?? "https://inboxchat-web.vercel.app"}/inbox`,
        });
      } catch (emailErr) {
        console.error("[signup] Welcome email error (non-fatal):", emailErr);
      }
    })();

    return reply.status(201).send({
      token,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: operator.role,
        workspaceId: operator.workspaceId,
      },
      workspace: {
        id: workspace.id,
        apiKey: workspace.api_key,
        name: workspaceName,
        trialEndsAt: trialEndsAt.toISOString(),
      },
    });
  });
}
