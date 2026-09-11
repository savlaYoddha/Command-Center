import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In dev (tsx), migrate.js runs from src/database. In production (compiled),
// it runs from dist/database. Migrations are copied to both locations.
const MIGRATIONS_CANDIDATES = [
  path.join(__dirname, "migrations"),
  path.join(__dirname, "../src/database/migrations"),
  path.join(process.cwd(), "src/database/migrations"),
];

function resolveMigrationsDir(): string {
  for (const candidate of MIGRATIONS_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return MIGRATIONS_CANDIDATES[0]!;
}

const MIGRATIONS_DIR = resolveMigrationsDir();

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS _migrations (
  id         TEXT PRIMARY KEY,
  filename   TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function getAppliedMigrations(pool: Awaited<ReturnType<typeof getPool>>): Promise<Set<string>> {
  const result = await pool.query("SELECT id FROM _migrations ORDER BY id");
  return new Set(result.rows.map((row) => row.id as string));
}

async function applyMigration(
  pool: Awaited<ReturnType<typeof getPool>>,
  id: string,
  filename: string,
  sql: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO _migrations (id, filename) VALUES ($1, $2)", [id, filename]);
    await client.query("COMMIT");
    console.log(`  ✓ applied ${filename}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`  ✗ FAILED ${filename}:`, err instanceof Error ? err.message : err);
    throw err;
  } finally {
    client.release();
  }
}

export async function runMigrations(): Promise<void> {
  console.log("Running PostgreSQL migrations...");

  const pool = getPool();

  // Ensure migrations tracking table exists
  await pool.query(MIGRATIONS_TABLE);

  // Read migration files
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("  No migrations directory found, skipping.");
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("  No migration files found.");
    return;
  }

  const applied = await getAppliedMigrations(pool);
  let count = 0;

  for (const file of files) {
    // Extract migration ID from filename (e.g. "0000_init.sql" → "0000_init")
    const id = path.basename(file, ".sql");

    if (applied.has(id)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    await applyMigration(pool, id, file, sql);
    count++;
  }

  console.log(`Migrations complete. ${count} applied, ${files.length - count} already applied.`);
}
