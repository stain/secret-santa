// Secrets, constant-time comparison, admin auth and randomness.

import { timingSafeEqual } from "node:crypto";
import type { Env } from "./env";

const encoder = new TextEncoder();

/** Compare two strings without leaking where they differ through timing. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  // Hash first so both inputs have the same length, as timingSafeEqual requires.
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return timingSafeEqual(new Uint8Array(ha), new Uint8Array(hb));
}

/** A random URL-safe secret, used as a participant's ?key=. */
export function newAccessKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Unbiased random integer in [0, n). */
function randomBelow(n: number): number {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % n;
}

/** Fisher-Yates shuffle using the cryptographic RNG; returns a new array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Admin pages use HTTP Basic auth against the ADMIN_PASSWORD secret (any
 * user name). Returns a 401 response to send, or null when authorised.
 */
/**
 * Failed admin logins per client address, kept in memory only (never logged).
 * After MAX_FAILURES within FAILURE_WINDOW_MS, that address gets 429 until the
 * window has passed.
 */
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED = 10_000;
const failures = new Map<string, { count: number; since: number }>();

/**
 * The visitor's address. The app is only reachable through the web server on
 * the same machine, which sets X-Forwarded-For to the connecting address
 * (replacing anything the client sent).
 */
function clientAddress(request: Request): string {
  return request.headers.get("X-Forwarded-For")?.split(",")[0].trim() || "local";
}

function recentFailures(address: string): number {
  const entry = failures.get(address);
  if (!entry) return 0;
  if (Date.now() - entry.since > FAILURE_WINDOW_MS) {
    failures.delete(address);
    return 0;
  }
  return entry.count;
}

function recordFailure(address: string): void {
  if (!failures.has(address) && failures.size >= MAX_TRACKED) {
    failures.delete(failures.keys().next().value!); // forget the oldest
  }
  const entry = failures.get(address);
  if (entry && Date.now() - entry.since <= FAILURE_WINDOW_MS) entry.count++;
  else failures.set(address, { count: 1, since: Date.now() });
}

export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  const challenge = new Response("Admin login required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Secret Santa admin", charset="UTF-8"' },
  });
  if (!env.ADMIN_PASSWORD) {
    return new Response("ADMIN_PASSWORD is not configured", { status: 500 });
  }
  const address = clientAddress(request);
  if (recentFailures(address) >= MAX_FAILURES) {
    return new Response("Too many failed logins. Try again later.", {
      status: 429,
      headers: { "Retry-After": String(FAILURE_WINDOW_MS / 1000) },
    });
  }
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Basic ")) return challenge; // the browser's first request: not a failure
  let password = "";
  try {
    const decoded = atob(header.slice(6));
    password = decoded.slice(decoded.indexOf(":") + 1);
  } catch {
    // Treated as a wrong password below.
  }
  if (password && (await safeEqual(password, env.ADMIN_PASSWORD))) return null;
  recordFailure(address);
  return challenge;
}

/**
 * Reject cross-site form posts. Browsers send the admin's Basic auth
 * credentials automatically, so another site could otherwise submit forms.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return origin === null || origin === new URL(request.url).origin;
}
