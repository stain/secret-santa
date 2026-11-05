// Secrets, constant-time comparison, admin auth and randomness.

const encoder = new TextEncoder();

/** Compare two strings without leaking where they differ through timing. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  // Hash first so both inputs have the same length, as timingSafeEqual requires.
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
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
export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  const challenge = new Response("Admin login required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Secret Santa admin", charset="UTF-8"' },
  });
  if (!env.ADMIN_PASSWORD) {
    return new Response("ADMIN_PASSWORD is not configured", { status: 500 });
  }
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Basic ")) return challenge;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return challenge;
  }
  const password = decoded.slice(decoded.indexOf(":") + 1);
  return (await safeEqual(password, env.ADMIN_PASSWORD)) ? null : challenge;
}

/**
 * Reject cross-site form posts. Browsers send the admin's Basic auth
 * credentials automatically, so another site could otherwise submit forms.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return origin === null || origin === new URL(request.url).origin;
}
