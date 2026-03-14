import { z } from "zod";

/**
 * Variables de entorno del servidor.
 * Zod valida en startup — si falta algo, el proceso falla con un mensaje claro.
 * Nunca usar process.env directamente fuera de este archivo.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  HOST: z.string().default("0.0.0.0"),

  // Base de datos
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL válida de PostgreSQL"),

  // CORS — la URL del dashboard web
  WEB_URL: z.string().url("WEB_URL debe ser una URL válida"),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY es requerido"),
  EMAIL_FROM: z.string().min(1).default("InboxChat <no-reply@inboxchat.app>"),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres").default("dev_secret_change_in_production_min_32_chars"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Error de configuración de entorno:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}
