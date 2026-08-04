import "server-only";
import { Pool } from "pg";
import type { QueryResultRow } from "pg";

declare global {
  var starshipPool: Pool | undefined;
}

export const pool =
  globalThis.starshipPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.starshipPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return pool.query<T>(text, values);
}
