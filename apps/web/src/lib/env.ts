import { z } from "zod";

/**
 * Variables de entorno del lado del cliente (NEXT_PUBLIC_*) y servidor.
 * Validadas en tiempo de importación — si algo falta, Next.js falla en startup.
 */
const envSchema = z.object({
  // URL del servidor Fastify (para server components y API routes)
  SERVER_URL: z.string().url().default("http://localhost:3001"),
  // URL del servidor Fastify accesible desde el browser (para Socket.io client)
  NEXT_PUBLIC_SERVER_URL: z.string().url().default("http://localhost:3001"),
});

const parsed = envSchema.safeParse({
  SERVER_URL: process.env["SERVER_URL"],
  NEXT_PUBLIC_SERVER_URL: process.env["NEXT_PUBLIC_SERVER_URL"],
});

if (!parsed.success) {
  console.error("Error de configuración de entorno (web):");
  console.error(parsed.error.flatten().fieldErrors);
  // En Next.js, throw en lugar de process.exit para que el error se muestre bien
  throw new Error("Variables de entorno inválidas");
}

export const env = parsed.data;
