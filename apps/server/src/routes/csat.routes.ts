import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";

/**
 * GET /api/csat — visitante hace click en una estrella del email CSAT
 *   ?id=<conversationId>&rating=<1..5>
 *
 * Devuelve una página HTML inline de "gracias" para que el link funcione
 * desde cualquier cliente de email sin necesidad de un frontend dedicado.
 */
export async function csatRoutes(
  app: FastifyInstance,
  { db }: { db: Database }
) {
  app.get<{ Querystring: { id?: string; rating?: string } }>(
    "/api/csat",
    async (request, reply) => {
      const { id: conversationId, rating: ratingStr } = request.query;
      const rating = Number(ratingStr);

      if (!conversationId || !rating || rating < 1 || rating > 5) {
        return reply.status(400).type("text/html").send(thanksPage(0, "Calificación inválida."));
      }

      // Buscar el workspace_id de la conversación
      const [conv] = await db<{ workspace_id: string }[]>`
        SELECT workspace_id FROM conversations WHERE id = ${conversationId} LIMIT 1
      `;

      if (!conv) {
        return reply.status(404).type("text/html").send(thanksPage(0, "Conversación no encontrada."));
      }

      // Upsert — si ya calificó, actualizar (last write wins)
      await db`
        INSERT INTO csat_ratings (conversation_id, workspace_id, rating)
        VALUES (${conversationId}, ${conv.workspace_id}, ${rating})
        ON CONFLICT (conversation_id)
        DO UPDATE SET rating = EXCLUDED.rating, created_at = NOW()
      `;

      return reply.type("text/html").send(thanksPage(rating));
    }
  );

  // GET /api/csat/summary — promedio de calificaciones del workspace (para analytics)
  app.get(
    "/api/csat/summary",
    async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) return reply.status(401).send({ error: "No autorizado" });

      // Extraer workspaceId del token JWT
      const { verifyToken, extractTokenFromHeader } = await import("../lib/jwt.js");
      const tok = extractTokenFromHeader(authHeader);
      if (!tok) return reply.status(401).send({ error: "No autorizado" });
      const payload = verifyToken(tok);
      if (!payload?.workspaceId) return reply.status(401).send({ error: "No autorizado" });

      const [stats] = await db<{
        total: number;
        avg: number;
        dist: Record<string, number>;
      }[]>`
        SELECT
          COUNT(*)::int AS total,
          ROUND(AVG(rating)::numeric, 2)::float AS avg,
          json_object_agg(rating, cnt) AS dist
        FROM (
          SELECT rating, COUNT(*)::int AS cnt
          FROM csat_ratings
          WHERE workspace_id = ${payload.workspaceId}
          GROUP BY rating
        ) t
      `;

      return reply.send({
        total: stats?.total ?? 0,
        avg: stats?.avg ?? null,
        distribution: stats?.dist ?? {},
      });
    }
  );
}

// ── Página de "Gracias" inline ────────────────────────────────────────────────
function thanksPage(rating: number, error?: string): string {
  const emojis: Record<number, string> = { 1: "😞", 2: "😕", 3: "😐", 4: "😊", 5: "😍" };
  const emoji = emojis[rating] ?? "✓";
  const message = error
    ? `<p style="color:#ef4444">${error}</p>`
    : `
      <div style="font-size:48px;margin-bottom:12px">${emoji}</div>
      <h1 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px">¡Gracias por tu calificación!</h1>
      <p style="color:#64748b;font-size:15px;margin:0">Tu feedback nos ayuda a mejorar. Podés cerrar esta pestaña.</p>
    `;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Gracias · InboxChat</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0;padding:16px;text-align:center;">
  <div style="max-width:420px;background:white;border-radius:20px;padding:48px 32px;border:1px solid #e2e8f0;box-shadow:0 8px 32px rgba(0,0,0,.08)">
    <div style="margin-bottom:24px">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#7c3aed" opacity=".12"/>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#7c3aed" opacity=".2"/>
        <text x="12" y="16" text-anchor="middle" font-size="10" fill="#7c3aed" font-family="system-ui" font-weight="700">IC</text>
      </svg>
    </div>
    ${message}
    <p style="color:#94a3b8;font-size:12px;margin-top:32px">
      Powered by <a href="https://inboxchat.app" style="color:#7c3aed;text-decoration:none">InboxChat</a>
    </p>
  </div>
</body>
</html>`;
}
