import pg from "pg";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const { Pool } = pg;

let pool: pg.Pool | null = null;

function loadEnvFallback(): void {
  if (process.env.DATABASE_URL) return;
  for (const file of [".env.local", ".env"]) {
    const envPath = resolve(process.cwd(), file);
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      if (process.env.DATABASE_URL) break;
    }
  }
}

export function getPool(): pg.Pool {
  if (pool) return pool;

  loadEnvFallback();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Cannot connect to the database."
    );
  }

  const isSsl =
    connectionString.includes("sslmode=require") ||
    connectionString.includes("ssl=true") ||
    connectionString.includes("neon.tech") ||
    connectionString.includes("supabase.co");

  pool = new Pool({
    connectionString,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on("error", (err) => {
    console.error("[DB] Unexpected pool error:", err.message);
  });

  return pool;
}

export async function query<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const p = getPool();
  return p.query<T>(text, params);
}

export async function queryOne<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

export async function queryMany<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

export type DbStatus = "CONNECTED" | "NOT_CONNECTED" | "ERROR";

export async function checkDbHealth(): Promise<{
  status: DbStatus;
  reason: string;
  latencyMs?: number;
}> {
  if (!process.env.DATABASE_URL) {
    return { status: "NOT_CONNECTED", reason: "DATABASE_URL is not set." };
  }

  try {
    const start = Date.now();
    const p = getPool();
    await p.query("SELECT 1");
    const latencyMs = Date.now() - start;
    return { status: "CONNECTED", reason: "Database is reachable.", latencyMs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "ERROR", reason: `Connection failed: ${message}` };
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}