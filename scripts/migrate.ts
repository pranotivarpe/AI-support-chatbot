// Applies db/migrations/*.sql in order, tracking applied files in _migrations.
import "./env";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, onnotice: () => {} });

  await sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const applied = new Set((await sql<{ name: string }[]>`SELECT name FROM _migrations`).map((r) => r.name));

  const dir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    console.log(`→ applying ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, file), "utf8"));
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
  }
  console.log("✓ database is up to date");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
