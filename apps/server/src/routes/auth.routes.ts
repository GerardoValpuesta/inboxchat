import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import type { Database } from "../db/client.js";
import {
  createOperator,
  findOperatorByEmail,
  findOperatorById,
} from "../db/operators.js";
import { findWorkspaceByApiKey } from "../db/queries.js";
import { signToken, verifyToken, extractTokenFromHeader } from "../lib/jwt.js";

const BCRYPT_ROUNDS = 10;

/**
 * Rutas de autenticación del operador.
 *
 * POST /api/auth/register — crea cuenta + workspace (si es owner)
 * POST /api/auth/login    — valida email/password, devuelve JWT
 * GET  /api/auth/me       — devuelve datos del operador autenticado
 */
export async function authRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  // ─── POST /api/auth/register ─────────────────────────────────────────────
  app.post<{
    Body: { name: string; email: string; password: string; workspaceKey: string };
  }>("/api/auth/register",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
    const { name, email, password, workspaceKey } = request.body;

    if (!name || !email || !password || !workspaceKey) {
      return reply.status(400).send({ error: "Todos los campos son requeridos" });
    }

    if (password.length < 8) {
      return reply.status(400).send({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    // Verificar que el workspace existe
    const workspace = await findWorkspaceByApiKey(db, workspaceKey);
    if (!workspace) {
      return reply.status(404).send({ error: "Workspace no encontrado. Verificá el workspaceKey." });
    }

    // Verificar que el email no está registrado en ese workspace
    const existing = await findOperatorByEmail(db, email);
    if (existing && existing.workspaceId === workspace.id) {
      return reply.status(409).send({ error: "Ya existe una cuenta con ese email en este workspace" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const operator = await createOperator(db, {
      workspaceId: workspace.id as string,
      email,
      passwordHash,
      name,
      role: "owner",
    });

    const token = signToken({
      sub: operator.id,
      workspaceId: workspace.id as string,
      workspaceKey,
      email: operator.email,
      role: operator.role,
    });

    return reply.status(201).send({
      token,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: operator.role,
        workspaceId: operator.workspaceId,
      },
    });
  });

  // ─── POST /api/auth/login ─────────────────────────────────────────────────
  app.post<{
    Body: { email: string; password: string };
  }>("/api/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: "Email y contraseña son requeridos" });
    }

    const operator = await findOperatorByEmail(db, email);
    if (!operator) {
      // No revelar si el email existe o no (seguridad)
      return reply.status(401).send({ error: "Credenciales incorrectas" });
    }

    const passwordOk = await bcrypt.compare(password, operator.passwordHash);
    if (!passwordOk) {
      return reply.status(401).send({ error: "Credenciales incorrectas" });
    }

    // Obtener el workspace para incluir el key en el token
    // (necesario para las queries del dashboard)
    const [workspace] = await db`
      SELECT api_key FROM workspaces WHERE id = ${operator.workspaceId} LIMIT 1
    `;

    const token = signToken({
      sub: operator.id,
      workspaceId: operator.workspaceId,
      workspaceKey: workspace?.api_key as string ?? "",
      email: operator.email,
      role: operator.role,
    });

    return {
      token,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: operator.role,
        workspaceId: operator.workspaceId,
      },
    };
  });

  // ─── GET /api/auth/me ─────────────────────────────────────────────────────
  app.get("/api/auth/me", async (request, reply) => {
    const token = extractTokenFromHeader(request.headers.authorization);
    if (!token) {
      return reply.status(401).send({ error: "Token requerido" });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return reply.status(401).send({ error: "Token inválido o expirado" });
    }

    const operator = await findOperatorById(db, payload.sub);
    if (!operator) {
      return reply.status(404).send({ error: "Operador no encontrado" });
    }

    return {
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: operator.role,
        workspaceId: operator.workspaceId,
      },
    };
  });
}
