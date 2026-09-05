import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { getPool } from "./client";

export async function runMigration(): Promise<void> {
  const pool = getPool();

  console.log("[migrate] Running base schema migration...");
  const schemaPath = resolve(process.cwd(), "database", "schema.sql");
  const baseSql = readFileSync(schemaPath, "utf-8");

  try {
    await pool.query(baseSql);
    console.log("[migrate] Base schema applied successfully.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[migrate] Base schema failed:", message);
    throw err;
  }

  // Check for migrations directory
  const migrationsDir = resolve(process.cwd(), "database", "migrations");
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      console.log(`[migrate] Running migration: ${file}...`);
      const migrationSql = readFileSync(join(migrationsDir, file), "utf-8");
      try {
        await pool.query(migrationSql);
        console.log(`[migrate] Migration ${file} applied.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[migrate] Migration ${file} failed:`, message);
        throw err;
      }
    }
  }

  console.log("[migrate] All migrations completed successfully.");
}

// Run directly with: npx tsx database/migrate.ts
if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  runMigration()
    .then(() => {
      console.log("[migrate] Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[migrate] Fatal:", err);
      process.exit(1);
    });
}
