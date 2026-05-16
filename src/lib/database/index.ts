import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";

// Database connection configuration
const createDatabaseConnection = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({
    connectionString,
    max: 20,
    // Neon / cold Postgres: TCP + TLS + resume often exceeds a few seconds.
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 10_000,
    maxLifetimeSeconds: 300,
    keepAlive: true,
  });

  pool.on("error", (err) => {
    console.error("[db] Pool client error:", err);
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
};

const globalForDb = global as unknown as { db: Kysely<Database> | undefined };

/**
 * Lazy-init so importing DB-backed modules (e.g. Inngest route) does not throw
 * if DATABASE_URL is not hydrated yet during dev env reload / Turbopack churn.
 */
function getDbInstance(): Kysely<Database> {
  if (globalForDb.db) return globalForDb.db;
  globalForDb.db = createDatabaseConnection();
  return globalForDb.db;
}

export const db = new Proxy({} as Kysely<Database>, {
  get(_target, prop) {
    const instance = getDbInstance();
    const value = (instance as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
}) as Kysely<Database>;

// Export the type for use in other files
export type DB = typeof db;

// Export database queries and utilities
export * from "./queries";
export * from "./subscription-queries";
export * from "./types";
