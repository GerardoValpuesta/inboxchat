import type { Database } from "../db/client.js";
import type { Server as SocketServer } from "socket.io";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/** Límite de replies IA por plan */
const AI_LIMIT: Record<string, number> = {
  free:   0,
  trial:  50,   // prueba
  pro:    500,
  growth: 2000,
};

/** Tone → instrucción para el prompt */
const TONE_INSTRUCTION: Record<string, string> = {
  formal:   "Respondé de forma profesional y formal.",
  friendly: "Respondé de forma amable, cálida y cercana.",
  casual:   "Respondé de forma casual y relajada, como si fuera un chat entre amigos.",
};

/**
 * AI Auto-Reply Cron
 *
 * Corre cada minuto. Busca conversaciones abiertas donde:
 *  - El workspace tiene ai_enabled = true
 *  - El último mensaje es de un visitante
 *  - No hubo reply del operador desde ese mensaje
 *  - Han pasado ai_trigger_minutes sin respuesta
 *  - No se envió un reply IA en esta conversación recientemente (dedup 2h)
 *  - El workspace no excedió el límite mensual de replies
 *
 * Responde usando Gemini Flash con el contexto del workspace.
 */
export async function startAiAutoReplyCron(
  db: Database,
  io: SocketServer
): Promise<void> {
  const GEMINI_KEY = process.env["GEMINI_API_KEY"];

  if (!GEMINI_KEY) {
    console.info("[AI Cron] GEMINI_API_KEY no configurada — auto-replies deshabilitados.");
    return;
  }

  // Verificar migraciones
  try {
    await db`SELECT ai_enabled FROM workspaces LIMIT 0`;
  } catch {
    console.warn("[AI Cron] Columnas ai_* no existen. Corrí migración 018.");
    return;
  }

  async function runAiReplies() {
    try {
      // Conversaciones candidatas
      const candidates = await db<{
        conv_id: string;
        workspace_id: string;
        plan: string;
        ai_context: string;
        ai_trigger_minutes: number;
        ai_tone: string;
        ai_replies_count: number;
        ai_replies_reset_at: string;
        contact_name: string | null;
        last_visitor_msg_at: string;
        last_visitor_msg: string;
      }[]>`
        SELECT
          c.id                        AS conv_id,
          w.id                        AS workspace_id,
          w.plan,
          w.ai_context,
          w.ai_trigger_minutes,
          w.ai_tone,
          w.ai_replies_count,
          w.ai_replies_reset_at,
          co.name                     AS contact_name,
          last_msg.created_at         AS last_visitor_msg_at,
          last_msg.body               AS last_visitor_msg
        FROM conversations c
        JOIN workspaces w  ON w.id = c.workspace_id AND w.ai_enabled = TRUE
        JOIN contacts   co ON co.id = c.contact_id
        JOIN LATERAL (
          SELECT created_at, body FROM messages m
          WHERE  m.conversation_id = c.id AND m.sender = 'contact'
          ORDER  BY created_at DESC
          LIMIT  1
        ) last_msg ON TRUE
        LEFT JOIN LATERAL (
          SELECT 1 FROM messages m2
          WHERE  m2.conversation_id = c.id
            AND  m2.sender IN ('operator', 'bot')
            AND  m2.created_at > last_msg.created_at
          LIMIT  1
        ) replied ON TRUE
        WHERE c.status = 'open'
          AND replied IS NULL
          AND EXTRACT(EPOCH FROM (NOW() - last_msg.created_at)) / 60 >= w.ai_trigger_minutes
          AND (
            c.ai_replied_at IS NULL
            OR c.ai_replied_at < NOW() - INTERVAL '2 hours'
          )
        LIMIT 20
      `;

      for (const conv of candidates) {
        if (!conv.conv_id || !conv.workspace_id) continue;

        // Reset mensual si hace falta
        const resetAt = new Date(conv.ai_replies_reset_at);
        const needsReset =
          resetAt.getMonth() !== new Date().getMonth() ||
          resetAt.getFullYear() !== new Date().getFullYear();

        let repliesCount = needsReset ? 0 : conv.ai_replies_count;

        // Verificar límite por plan
        const limit = AI_LIMIT[conv.plan] ?? 0;
        if (limit === 0 || repliesCount >= limit) continue;

        // Armar prompt con contexto del workspace
        const contextBlock = conv.ai_context?.trim()
          ? `Contexto sobre el negocio:\n${conv.ai_context.trim()}\n\n`
          : "";

        const toneInstruction =
          TONE_INSTRUCTION[conv.ai_tone] ?? TONE_INSTRUCTION["friendly"]!;

        const systemPrompt = `Sos el asistente virtual de soporte al cliente.
${contextBlock}${toneInstruction}
Respondé SOLO el mensaje del cliente de forma concisa (máximo 2 oraciones).
No te presentes, no uses saludos formales. Respondé directamente al punto.
Si la pregunta requiere un humano, decí: "Un agente te va a responder pronto."
`;

        const userMessage = conv.last_visitor_msg?.slice(0, 1000) ?? "";

        // Llamada a Gemini Flash
        let aiText: string;
        try {
          const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Entendido, estoy listo para ayudar." }] },
                { role: "user", parts: [{ text: userMessage }] },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 150,
              },
            }),
          });

          if (!geminiRes.ok) {
            console.error(`[AI Cron] Gemini error ${geminiRes.status}`);
            continue;
          }

          const geminiData = await geminiRes.json() as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };

          aiText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

          if (!aiText) continue;
        } catch (err) {
          console.error("[AI Cron] Fetch Gemini error:", err);
          continue;
        }

        // Insertar el mensaje IA en DB
        const [inserted] = await db<{ id: string; created_at: string }[]>`
          INSERT INTO messages (conversation_id, body, sender)
          VALUES (${conv.conv_id}, ${aiText}, 'bot')
          RETURNING id, created_at
        `;
        if (!inserted) continue;

        // Marcar la conversación con ai_replied_at
        await db`
          UPDATE conversations
          SET ai_replied_at = NOW()
          WHERE id = ${conv.conv_id}
        `;

        // Incrementar contador del workspace (con reset mensual si aplica)
        if (needsReset) {
          await db`
            UPDATE workspaces
            SET ai_replies_count = 1, ai_replies_reset_at = NOW()
            WHERE id = ${conv.workspace_id}
          `;
        } else {
          await db`
            UPDATE workspaces
            SET ai_replies_count = ai_replies_count + 1
            WHERE id = ${conv.workspace_id}
          `;
        }
        repliesCount++;

        // Emitir via Socket.io igual que cualquier mensaje
        const msgPayload = {
          id: inserted.id,
          conversationId: conv.conv_id,
          workspaceId: conv.workspace_id,
          body: aiText,
          sender: "bot",
          createdAt: inserted.created_at,
          isAi: true,
        };

        io.to(`workspace:${conv.workspace_id}`).emit("message:new", msgPayload);
        io.to(`conv:${conv.conv_id}`).emit("message:new", msgPayload);

        console.info(
          `[AI Cron] Reply IA enviado → conv ${conv.conv_id} (${repliesCount}/${limit} este mes)`
        );
      }
    } catch (err) {
      console.error("[AI Cron] Error:", err);
    }
  }

  // Primera ejecución a los 30s, luego cada minuto
  setTimeout(() => {
    void runAiReplies();
    setInterval(() => void runAiReplies(), 60_000);
  }, 30_000);

  console.info("[AI Cron] Iniciado — check cada minuto.");
}
