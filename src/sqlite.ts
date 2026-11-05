// A small wrapper over Node's built-in SQLite (node:sqlite) with the same
// shape as the Cloudflare D1 API this app was first written for:
// db.prepare(sql).bind(...).first() / .all() / .run(), and db.batch([...])
// running statements in one transaction.

import { DatabaseSync, type SQLInputValue } from "node:sqlite";

type Value = string | number | null;

export interface RunResult {
  meta: { changes: number };
}

export class Statement {
  constructor(
    private readonly db: DatabaseSync,
    readonly sql: string,
    readonly params: Value[] = [],
  ) {}

  bind(...params: Value[]): Statement {
    return new Statement(this.db, this.sql, params);
  }

  /** The first row, or one column of it; null if there are no rows. */
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.params as SQLInputValue[])) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (column ? (row[column] as T) : (row as T)) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    return { results: this.db.prepare(this.sql).all(...(this.params as SQLInputValue[])) as T[] };
  }

  async run(): Promise<RunResult> {
    return this.runSync();
  }

  runSync(): RunResult {
    const result = this.db.prepare(this.sql).run(...(this.params as SQLInputValue[]));
    return { meta: { changes: Number(result.changes) } };
  }
}

export class Database {
  readonly raw: DatabaseSync;

  constructor(path: string) {
    this.raw = new DatabaseSync(path);
    this.raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  }

  prepare(sql: string): Statement {
    return new Statement(this.raw, sql);
  }

  /** Runs the statements in one transaction: all of them, or none. */
  async batch(statements: Statement[]): Promise<RunResult[]> {
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((s) => s.runSync());
      this.raw.exec("COMMIT");
      return results;
    } catch (e) {
      this.raw.exec("ROLLBACK");
      throw e;
    }
  }
}
