import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";
import { verifyToken, extractTokenFromHeader } from "../lib/jwt.js";

/**
 * POST /api/promo/redeem  — canjear un código de acceso Pro
 * GET  /api/promo/status  — estado del promo activo para el workspace
 */
export async function promoRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  async function resolveWorkspaceId(
    headers: Record<string, string | string[] | undefined>
  ): Promise<string | null> {
    const token = extractTokenFromHeader(headers.authorization as string | undefined);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.workspaceId) return payload.workspaceId;
    }
    return null;
  }

  // POST /api/promo/redeem
  app.post<{ Body: { code: string } }>(
    "/api/promo/redeem",
    async (request, reply) => {
      const workspaceId = await resolveWorkspaceId(
        request.headers as Record<string, string | undefined>
      );
      if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

      const { code } = request.body;
      if (!code?.trim()) return reply.status(400).send({ error: "Código requerido" });

      const normalizedCode = code.trim().toUpperCase();

      // Verificar que el código existe y es válido
      const [promo] = await db<{
        code: string;
        duration_days: number;
        max_uses: number;
        used_count: number;
        expires_at: string | null;
      }[]>`
        SELECT code, duration_days, max_uses, used_count, expires_at
        FROM promo_codes
        WHERE code = ${normalizedCode}
        LIMIT 1
      `;

      if (!promo) {
        return reply.status(404).send({ error: "Código inválido o no encontrado" });
      }

      // Verificar que el código no expiró
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return reply.status(400).send({ error: "Este código ya expiró" });
      }

      // Verificar que no se agotó el cupo de usos
      if (promo.used_count >= promo.max_uses) {
        return reply.status(400).send({ error: "Este código ya alcanzó su límite de usos" });
      }

      // Verificar que el workspace no canjeó ya este código
      const [existing] = await db<{ id: string }[]>`
        SELECT id FROM promo_redemptions
        WHERE workspace_id = ${workspaceId} AND code = ${normalizedCode}
        LIMIT 1
      `;
      if (existing) {
        return reply.status(409).send({ error: "Ya canjeaste este código anteriormente" });
      }

      // Calcular hasta cuándo dura el Pro
      const proUntil = new Date();
      proUntil.setDate(proUntil.getDate() + promo.duration_days);

      // Insertar redemption
      await db`
        INSERT INTO promo_redemptions (workspace_id, code, pro_until)
        VALUES (${workspaceId}, ${normalizedCode}, ${proUntil.toISOString()})
      `;
      // Activar Pro en el workspace
      await db`
        UPDATE workspaces
        SET plan = 'pro',
            trial_ends_at = ${proUntil.toISOString()}
        WHERE id = ${workspaceId}
      `;
      // Incrementar contador de usos del código
      await db`
        UPDATE promo_codes SET used_count = used_count + 1
        WHERE code = ${normalizedCode}
      `;

      return reply.send({
        ok: true,
        proUntil: proUntil.toISOString(),
        durationDays: promo.duration_days,
        message: `¡Código canjeado! Tu plan Pro está activo por ${promo.duration_days} días.`,
      });
    }
  );

  // GET /api/promo/status — activo más reciente del workspace
  app.get("/api/promo/status", async (request, reply) => {
    const workspaceId = await resolveWorkspaceId(
      request.headers as Record<string, string | undefined>
    );
    if (!workspaceId) return reply.status(401).send({ error: "No autenticado" });

    const [redemption] = await db<{
      code: string;
      activated_at: string;
      pro_until: string;
    }[]>`
      SELECT code, activated_at, pro_until
      FROM promo_redemptions
      WHERE workspace_id = ${workspaceId}
      ORDER BY activated_at DESC
      LIMIT 1
    `;

    return reply.send({
      hasPromo: !!redemption,
      code: redemption?.code ?? null,
      activatedAt: redemption?.activated_at ?? null,
      proUntil: redemption?.pro_until ?? null,
      isActive: redemption ? new Date(redemption.pro_until) > new Date() : false,
    });
  });
}
