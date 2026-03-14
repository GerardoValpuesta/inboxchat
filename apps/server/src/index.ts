import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
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
  // CORS: permite el dashboard (WEB_URL) + previews de Vercel + desarrollo local
  const allowedOrigins = new Set([
    env.WEB_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ]);

  await app.register(cors, {
    origin: (origin, callback) => {
      // Sin origin = petición server-to-server o mismo origen
      if (!origin) return callback(null, true);
      // Origin explícitamente permitido
      if (allowedOrigins.has(origin)) return callback(null, true);
      // Preview URLs de Vercel (*.vercel.app)
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      // Bloquear el resto
      callback(new Error(`CORS: origin no permitido: ${origin}`), false);
    },
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
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

  // 6. Rutas REST: auth (login/register) + dashboard (conversaciones)
  const { authRoutes } = await import("./routes/auth.routes.js");
  const { dashboardRoutes } = await import("./routes/dashboard.routes.js");
  await app.register(authRoutes, { db });
  await app.register(dashboardRoutes, { db });

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
      origin: env.WEB_URL,
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // 8. Registrar todos los handlers de Socket.io
  registerSocketHandlers(io, db);

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
}

bootstrap().catch((err: unknown) => {
  console.error("Error fatal al iniciar el servidor:", err);
  process.exit(1);
});
