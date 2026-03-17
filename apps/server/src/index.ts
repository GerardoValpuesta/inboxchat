import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { Server } from "socket.io";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@inboxchat/shared";
import { loadEnv } from "./config/env.js";
import { createDatabase } from "./db/client.js";
import { registerSocketHandlers } from "./socket/handlers.js";

async function bootstrap() {
  // 1. Cargar y validar variables de entorno antes de cualquier otra cosa
  const env = loadEnv();

  // 2. Inicializar DB (connection pool)
  const db = createDatabase(env);

  // 3. Crear app Fastify
  // Fastify internamente usa un http.IncomingMessage server — compatible con Socket.io
  const isDev = env.NODE_ENV === "development";
  const app = Fastify({
    logger: isDev
      ? {
          level: "info",
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }
      : { level: "warn" },
  });

  // 4. Plugins de seguridad
  // CORS: permite el dashboard (WEB_URL) + previews de Vercel/Railway + dev local
  const allowedOrigins = new Set([
    env.WEB_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ]);

  const isAllowedOrigin = (origin: string) =>
    allowedOrigins.has(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".railway.app") ||
    origin.endsWith(".up.railway.app");

  await app.register(cors, {
    origin: (origin, callback) => {
      // Sin origin = request server-to-server o curl → permitir
      if (!origin) return callback(null, true);

      if (env.NODE_ENV === "production") {
        // En producción: SOLO el dashboard oficial
        const allowed = new Set([env.WEB_URL, "http://localhost:3000"]);
        if (allowed.has(origin)) return callback(null, true);
      } else {
        // En dev/staging: también permitir previews de Vercel y Railway
        if (
          allowedOrigins.has(origin) ||
          origin.endsWith(".vercel.app") ||
          origin.endsWith(".railway.app") ||
          origin.endsWith(".up.railway.app")
        ) return callback(null, true);
      }

      callback(new Error(`CORS: origin no permitido: ${origin}`), false);
    },
    credentials: true,
  });

  await app.register(helmet, {
    // Content-Security-Policy: protege el dashboard contra XSS
    // El widget.js se sirve sin CSP (Access-Control-Allow-Origin: *)
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        connectSrc:     ["'self'", "wss:", env.WEB_URL ?? ""],
        imgSrc:         ["'self'", "data:", "https:"],
        styleSrc:       ["'self'", "'unsafe-inline'"], // unsafe-inline necesario para Tailwind/CSS-in-JS
        fontSrc:        ["'self'", "https://fonts.gstatic.com"],
        frameSrc:       ["'none'"],
        objectSrc:      ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // Otros headers de seguridad de helmet (activados por defecto)
    crossOriginEmbedderPolicy: false, // deshabilitada para no romper el widget embed
  });

  // Rate limiting: protege contra brute-force y abuso
  // Global: 200 req / minuto / IP — permisivo para Operações normales del dashboard
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Demasiadas peticiones. Intentá en ${Math.ceil(context.ttl / 1000)} segundos.`,
    }),
  });

  // Servir archivos estáticos del widget sin dependencias extra
  // __dirname en ESM = directorio de src/index.ts => ../public apunta a apps/server/public
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const publicDir = join(__dirname, "../public");

  app.get("/widget.js", async (_req, reply) => {
    const content = await readFile(join(publicDir, "widget.js"), "utf-8");
    void reply
      .header("Content-Type", "application/javascript")
      .header("Access-Control-Allow-Origin", "*")
      .header("Cache-Control", "public, max-age=60")
      .send(content);
  });

  app.get("/demo.html", async (_req, reply) => {
    const content = await readFile(join(publicDir, "demo.html"), "utf-8");
    void reply.header("Content-Type", "text/html").send(content);
  });

  // 5. Health check — requerido por Railway para saber si el proceso está vivo
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // 6. Rutas REST
  // ioRef permite pasar io a dashboardRoutes antes de que exista la instancia.
  // Los handlers se ejecutan en tiempo de request, cuando io ya está inicializado.
  const ioRef: { current: import("socket.io").Server | null } = { current: null };
  const { authRoutes } = await import("./routes/auth.routes.js");
  const { dashboardRoutes } = await import("./routes/dashboard.routes.js");
  const { billingRoutes } = await import("./routes/billing.routes.js");
  const { stripeWebhookRoute } = await import("./routes/stripe.webhook.js");
  const { signupRoute } = await import("./routes/signup.route.js");
  const { workspaceRoutes } = await import("./routes/workspace.routes.js");
  const { passwordResetRoutes } = await import("./routes/password-reset.routes.js");
  const { widgetConfigRoute } = await import("./routes/widget-config.route.js");
  const { analyticsRoutes } = await import("./routes/analytics.routes.js");
  const { operatorsRoutes } = await import("./routes/operators.routes.js");
  const { cannedResponsesRoutes } = await import("./routes/canned-responses.routes.js");
  const { contactsRoutes } = await import("./routes/contacts.routes.js");
  const { tagsRoutes } = await import("./routes/tags.routes.js");
  const { triggersRoutes } = await import("./routes/triggers.routes.js");
  const { publicApiRoutes } = await import("./routes/public-api.routes.js");
  const { widgetAnalyticsRoutes } = await import("./routes/widget-analytics.routes.js");
  const { webhookRoutes } = await import("./routes/webhooks.routes.js");
  const { csatRoutes } = await import("./routes/csat.routes.js");
  const { aiConfigRoutes } = await import("./routes/ai-config.routes.js");
  // El webhook de Stripe necesita raw body — registrarlo ANTES que helmet parsee el body
  await app.register(stripeWebhookRoute, { db });
  await app.register(authRoutes, { db });
  await app.register(signupRoute, { db });
  await app.register(passwordResetRoutes, { db });
  await app.register(dashboardRoutes, { db, ioRef });
  await app.register(billingRoutes, { db });
  await app.register(workspaceRoutes, { db });
  await app.register(widgetConfigRoute, { db });
  await app.register(analyticsRoutes, { db });
  await app.register(operatorsRoutes, { db });
  await app.register(cannedResponsesRoutes, { db });
  await app.register(contactsRoutes, { db });
  await app.register(tagsRoutes, { db });
  await app.register(triggersRoutes, { db });
  await app.register(publicApiRoutes, { db });
  await app.register(widgetAnalyticsRoutes, { db });
  await app.register(webhookRoutes, { db });
  await app.register(csatRoutes, { db });
  await app.register(aiConfigRoutes, { db });

  // 7. Esperar a que Fastify termine de inicializarse antes de adjuntar Socket.io
  // Esto evita el race condition donde Socket.io se adjunta antes de que
  // @fastify/cors esté listo para manejar los OPTIONS de Socket.io
  await app.ready();

  // 8. Adjuntar Socket.io al servidor HTTP de Fastify
  // app.server es el http.Server nativo subyacente — compatible 100% con Socket.io
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(app.server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (isAllowedOrigin(origin)) return callback(null, true);
        callback(new Error(`Socket.io CORS: origin no permitido: ${origin}`), false);
      },
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // 8. Registrar todos los handlers de Socket.io
  registerSocketHandlers(io, db);

  // Completar la referencia lazy para que dashboardRoutes pueda emitir eventos
  ioRef.current = io;

  // 9. Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Señal ${signal} recibida. Cerrando servidor...`);
    io.close();
    await app.close();
    await db.end();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // 10. Iniciar servidor
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Socket.io listo en ws://${env.HOST}:${env.PORT}`);

  // 11. SLA cron — monitorea convs sin respuesta y envía alertas por email
  const { startSlaCron } = await import("./lib/sla-cron.js");
  void startSlaCron(db);

  // 12. AI Auto-Reply cron — respuestas automáticas con Gemini Flash
  const { startAiAutoReplyCron } = await import("./lib/ai-auto-reply.js");
  void startAiAutoReplyCron(db, io);

  // 13. Weekly summary cron — resumen semanal por email cada lunes 9am UTC
  const { startWeeklySummaryCron } = await import("./lib/weekly-summary-cron.js");
  void startWeeklySummaryCron(db);
}

bootstrap().catch((err: unknown) => {
  console.error("Error fatal al iniciar el servidor:", err);
  process.exit(1);
});
