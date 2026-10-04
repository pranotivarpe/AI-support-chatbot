import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  // prepare:false keeps us compatible with transaction-mode poolers (Neon, Supabase).
  return postgres(url, { max: 5, prepare: false, onnotice: () => {} });
}

// Reuse one pool across hot reloads in development.
export const pg = globalForDb.pg ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.pg = pg;

export const db = drizzle(pg, { schema });
export { schema };
