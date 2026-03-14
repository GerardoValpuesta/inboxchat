import postgres from "postgres";
import type { Env } from "../config/env.js";

/**
 * Cliente de PostgreSQL usando postgres.js (el más eficiente para Node.js).
 * Se inicializa una sola vez y se reutiliza en toda la app (connection pool).
 */
export function createDatabase(env: Env) {
  return postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    transform: {
      // snake_case en DB -> camelCase en TypeScript automáticamente
      ...postgres.camel,
    },
    onnotice: () => {
      // Silenciar NOTICE de PostgreSQL en tests
    },
  });
}

export type Database = ReturnType<typeof createDatabase>;
