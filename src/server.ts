// The Node.js server: database and migrations, static files, routing to
// index.ts, and the daily jobs (deleting expired groups, nightly SQL dumps).
// Logs go to stdout/stderr only; no request logging, so private links and
// IP addresses never end up in logs.
//
// Settings (environment variables; locally read from .dev.vars):
//   ADMIN_PASSWORD     required
//   PUBLIC_URL         e.g. https://santa.s11.no: used for links and origin
//                      checks instead of trusting the Host header
//   PORT               default 8787
//   HOST               address to listen on; default all interfaces
//   DATA_DIR           default ./data (database and backups)
//   HOSTING_PROVIDER, HOSTING_LOCATION   named in the privacy notice
//   BACKUP_DAYS        default 7; 0 turns nightly backups off

import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join } from "node:path";
import { backUp } from "./backup";
import { purgeExpired } from "./db";
import type { Env } from "./env";
import { handle } from "./index";
import { Database } from "./sqlite";

if (process.env.NODE_ENV !== "production") {
  try {
    process.loadEnvFile(".dev.vars");
  } catch {
    // No local settings file.
  }
}

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST || undefined;
const DATA_DIR = process.env.DATA_DIR ?? "data";
const PUBLIC_URL = process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL) : null;
const BACKUP_DAYS = Number(process.env.BACKUP_DAYS ?? 7);
const ROOT = new URL("..", import.meta.url).pathname; // project root, or /app in the container

if (!process.env.ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD must be set");
  process.exit(1);
}

// --- Database and migrations ---

mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(join(DATA_DIR, "santa.db"));

function migrate(): void {
  db.raw.exec("CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = new Set(
    (db.raw.prepare("SELECT name FROM migrations").all() as { name: string }[]).map((r) => r.name),
  );
  const dir = join(ROOT, "migrations");
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (applied.has(name)) continue;
    db.raw.exec("BEGIN");
    try {
      db.raw.exec(readFileSync(join(dir, name), "utf8"));
      db.raw.prepare("INSERT INTO migrations (name, applied_at) VALUES (?, ?)").run(name, new Date().toISOString());
      db.raw.exec("COMMIT");
      console.log(`Applied migration ${name}`);
    } catch (e) {
      db.raw.exec("ROLLBACK");
      throw e;
    }
  }
}
migrate();

const env: Env = {
  DB: db,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  HOSTING_PROVIDER: process.env.HOSTING_PROVIDER ?? "",
  HOSTING_LOCATION: process.env.HOSTING_LOCATION ?? "",
};

// --- Daily jobs ---

async function deleteExpired(): Promise<void> {
  const deleted = await purgeExpired(db);
  if (deleted) console.log(`Deleted ${deleted} expired group(s)`);
}

async function dailyJobs(): Promise<void> {
  try {
    await deleteExpired();
    backUp(db, DATA_DIR, BACKUP_DAYS);
  } catch (e) {
    console.error("Daily jobs failed:", e);
  }
}
// Hourly checks: deleting and backing up are idempotent within a day.
void dailyJobs();
setInterval(dailyJobs, 60 * 60 * 1000).unref();

// --- Static files: only those found in public/ at start-up can be served ---

const TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

function listFiles(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
  );
}
const PUBLIC_DIR = join(ROOT, "public");
const staticFiles = new Map(
  listFiles(PUBLIC_DIR).map((f) => [`/${f}`, { body: readFileSync(join(PUBLIC_DIR, f)), type: TYPES[extname(f)] ?? "application/octet-stream" }]),
);

// --- HTTP ---

const MAX_BODY_BYTES = 100_000; // forms are small

class TooLarge extends Error {}

/** Reads a request body, stopping as soon as it exceeds MAX_BODY_BYTES (also for chunked bodies). */
async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new TooLarge(); // stop reading; the connection is closed after the reply
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const base = PUBLIC_URL ?? new URL(`http://${req.headers.host ?? `localhost:${PORT}`}`);
  const url = new URL(req.url ?? "/", base);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || name.startsWith(":")) continue;
    for (const v of [value].flat()) headers.append(name, v);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? await readBody(req) : undefined,
  });
}

async function send(res: ServerResponse, response: Response, method: string | undefined): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") res.setHeader(name, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  if (!response.body || method === "HEAD") {
    res.end();
    return;
  }
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) res.write(chunk);
  res.end();
}

const server = createServer(async (req, res) => {
  try {
    if (Number(req.headers["content-length"] ?? 0) > MAX_BODY_BYTES) {
      res.writeHead(413).end("Too large");
      return;
    }
    const path = new URL(req.url ?? "/", "http://x").pathname;
    const file = staticFiles.get(path);
    if (file && (req.method === "GET" || req.method === "HEAD")) {
      res.writeHead(200, {
        "Content-Type": file.type,
        "Content-Length": file.body.length,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : file.body);
      return;
    }
    await send(res, await handle(await toRequest(req), env), req.method);
  } catch (e) {
    if (e instanceof TooLarge) {
      res.writeHead(413, { "Content-Type": "text/plain", Connection: "close" });
      res.end("Too large", () => req.destroy());
      return;
    }
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Something went wrong");
  }
});

server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.listen(PORT, HOST, () => {
  console.log(`Secret Santa listening on port ${PORT}${PUBLIC_URL ? ` as ${PUBLIC_URL.origin}` : ""}`);
});

function shutDown(): void {
  server.close(() => {
    db.raw.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);
