import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt.js";
import { findWorkspaceByApiKey } from "../db/queries.js";

interface AiConfigPluginOptions {
  db: Database;
}

async function resolveWorkspaceId(
  db: Database,
  headers: Record<string, string | string[] | undefined>
): Promise<string | null> {
  const authHeader = headers["authorization"] as string | undefined;
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.workspaceId) return payload.workspaceId;
    }
  }
  const workspaceKey = headers["x-workspace-key"] as string | undefined;
  if (workspaceKey) {
    const workspace = await findWorkspaceByApiKey(db, workspaceKey);
    return workspace ? (workspace.id as string) : null;
  }
  return null;
}

const VALID_TONES = ["formal", "friendly", "casual"] as const;

/**
 * GET  /api/ai-config  — obtiene la configuración de auto-reply IA del workspace
 * PATCH /api/ai-config  — actualiza la configuración
 */
export async function aiConfigRoutes(
  app: FastifyInstance,
  { db }: AiConfigPluginOptions
) {
  // GET /api/ai-config
  app.get("/api/ai-config", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const [row] = await db<{
      ai_enabled: boolean;
      ai_context: string;
      ai_trigger_minutes: number;
      ai_tone: string;
      ai_replies_count: number;
      ai_replies_reset_at: string;
      plan: string;
    }[]>`
      SELECT
        ai_enabled, ai_context, ai_trigger_minutes, ai_tone,
        ai_replies_count, ai_replies_reset_at, plan
      FROM workspaces
      WHERE id = ${workspaceId}
      LIMIT 1
    `;

    if (!row) return reply.status(404).send({ error: "Workspace no encontrado" });

    // Límite según plan
    const limits: Record<string, number> = { free: 0, trial: 50, pro: 500, growth: 2000 };
    const monthlyLimit = limits[row.plan] ?? 0;

    return reply.send({
      aiEnabled: row.ai_enabled,
      aiContext: row.ai_context,
      aiTriggerMinutes: row.ai_trigger_minutes,
      aiTone: row.ai_tone,
      repliesThisMonth: row.ai_replies_count,
      monthlyLimit,
      resetAt: row.ai_replies_reset_at,
      planSupportsAi: monthlyLimit > 0,
    });
  });

  // PATCH /api/ai-config
  app.patch<{
    Body: {
      aiEnabled?: boolean;
      aiContext?: string;
      aiTriggerMinutes?: number;
      aiTone?: string;
    };
  }>("/api/ai-config", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(db, request.headers as Record<string, string | undefined>);
    if (!workspaceId) return reply.status(401).send({ error: "No autorizado" });

    const { aiEnabled, aiContext, aiTriggerMinutes, aiTone } = request.body ?? {};

    // Validaciones
    if (aiTriggerMinutes !== undefined) {
      if (!Number.isInteger(aiTriggerMinutes) || aiTriggerMinutes < 1 || aiTriggerMinutes > 60) {
        return reply.status(400).send({ error: "aiTriggerMinutes debe ser entre 1 y 60" });
      }
    }
    if (aiTone !== undefined && !(VALID_TONES as readonly string[]).includes(aiTone)) {
      return reply.status(400).send({ error: `aiTone inválido. Valores aceptados: ${VALID_TONES.join(", ")}` });
    }
    if (aiContext !== undefined && aiContext.length > 2000) {
      return reply.status(400).send({ error: "aiContext no puede superar 2000 caracteres" });
    }

    // Verificar que el plan soporte IA
    if (aiEnabled === true) {
      const [planRow] = await db<{ plan: string }[]>`
        SELECT plan FROM workspaces WHERE id = ${workspaceId} LIMIT 1
      `;
      const limits: Record<string, number> = { free: 0, trial: 50, pro: 500, growth: 2000 };
      if (!planRow || (limits[planRow.plan] ?? 0) === 0) {
        return reply.status(403).send({
          error: "El plan Free no incluye AI auto-replies. Actualizá a Pro.",
        });
      }
    }

    await db`
      UPDATE workspaces
      SET
        ai_enabled         = COALESCE(${aiEnabled ?? null}, ai_enabled),
        ai_context         = COALESCE(${aiContext ?? null}, ai_context),
        ai_trigger_minutes = COALESCE(${aiTriggerMinutes ?? null}, ai_trigger_minutes),
        ai_tone            = COALESCE(${aiTone ?? null}, ai_tone)
      WHERE id = ${workspaceId}
    `;

    return reply.send({ ok: true });
  });
}
