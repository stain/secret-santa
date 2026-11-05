// Nightly backups as gzipped plain SQL dumps (data/backups/santa-YYYY-MM-DD.sql.gz),
// kept for BACKUP_DAYS days. Restore into a fresh file with:
//   gunzip -c santa-2026-12-24.sql.gz | sqlite3 santa.db

import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import type { Database } from "./sqlite";

function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString("hex")}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

/** The whole database as SQL statements, read in one consistent snapshot. */
export function dumpSql(db: Database): string {
  const raw = db.raw;
  const out = ["PRAGMA foreign_keys = OFF;", "BEGIN TRANSACTION;"];
  raw.exec("BEGIN");
  try {
    const objects = raw
      .prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type = 'table' DESC, name")
      .all() as { type: string; name: string; sql: string }[];
    for (const { type, name, sql } of objects) {
      out.push(`${sql};`);
      if (type !== "table") continue;
      for (const row of raw.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all() as Record<string, unknown>[]) {
        const columns = Object.keys(row).map((c) => `"${c}"`).join(", ");
        out.push(`INSERT INTO "${name}" (${columns}) VALUES (${Object.values(row).map(literal).join(", ")});`);
      }
    }
  } finally {
    raw.exec("COMMIT");
  }
  out.push("COMMIT;", "");
  return out.join("\n");
}

/** Writes today's dump if there isn't one yet and deletes dumps older than `days`. */
export function backUp(db: Database, dataDir: string, days: number): void {
  if (days <= 0) return;
  const dir = join(dataDir, "backups");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const today = new Date().toISOString().slice(0, 10);
  const file = join(dir, `santa-${today}.sql.gz`);
  try {
    statSync(file);
  } catch {
    writeFileSync(file, gzipSync(dumpSql(db)), { mode: 0o600 });
    console.log(`Backed up the database to ${file}`);
  }
  const oldest = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (const name of readdirSync(dir)) {
    const day = name.match(/^santa-(\d{4}-\d{2}-\d{2})\.(db|sql\.gz)$/)?.[1];
    if (day && day < oldest) rmSync(join(dir, name));
  }
}
