// Product photos are served through the Worker (/img?u=<url>&s=<signature>),
// so visitors' browsers never contact the shop's or wisher's server: no IP
// addresses or load timings reach them, which could otherwise hint who a
// giftee's Santa is. Addresses are signed with a key the app generates and
// keeps in the settings table, so outsiders can't use /img to test whether
// someone wished for a product.

import type { Env } from "./env";
import type { Database } from "./sqlite";
import type { webcrypto } from "node:crypto";
import { fetchPublic } from "./preview";
import { safeEqual } from "./security";

const MAX_IMAGE_BYTES = 5_000_000;
const CACHE_SECONDS = 24 * 60 * 60;
// Raster formats only: an SVG served from our own origin could carry script.
const IMAGE_TYPES = /^image\/(jpeg|png|gif|webp|avif)$/;

const KEY_SETTING = "image_key";
let keyPromise: Promise<webcrypto.CryptoKey> | undefined;

/** The HMAC key for photo addresses, created on first use. */
function signingKey(db: Database): Promise<webcrypto.CryptoKey> {
  keyPromise ??= (async () => {
    const fresh = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    // If two requests race, the first insert wins and both read it back.
    await db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING").bind(KEY_SETTING, fresh).run();
    const stored = (await db.prepare("SELECT value FROM settings WHERE key = ?").bind(KEY_SETTING).first<string>("value"))!;
    const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  })().catch((e) => {
    keyPromise = undefined; // try again on the next request
    throw e;
  });
  return keyPromise;
}

async function signature(db: Database, url: string): Promise<string> {
  const mac = await crypto.subtle.sign("HMAC", await signingKey(db), new TextEncoder().encode(url));
  return btoa(String.fromCharCode(...new Uint8Array(mac).slice(0, 16)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Signs the given photo addresses up front, so pages can be rendered
 * synchronously; returns a function giving each photo's /img address.
 */
export async function imageSources(db: Database, urls: string[]): Promise<(url: string) => string> {
  const unique = [...new Set(urls.filter(Boolean))];
  const signed = new Map(
    await Promise.all(unique.map(async (u) => [u, `/img?u=${encodeURIComponent(u)}&s=${await signature(db, u)}`] as const)),
  );
  return (url) => signed.get(url) ?? "";
}

/** Only photos the app itself found are served, so this is no open proxy. */
async function isKnownImage(db: Database, url: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM wishes WHERE image = ? UNION SELECT 1 FROM previews WHERE image = ? LIMIT 1")
    .bind(url, url)
    .first();
  return row !== null;
}

/**
 * Photos already fetched, kept in memory for a day. The cache is small and
 * clears on restart; the oldest entries go first when it is full.
 */
const MAX_CACHE_BYTES = 50_000_000;
const photoCache = new Map<string, { body: ArrayBuffer; type: string; at: number }>();
let cachedBytes = 0;

function remember(url: string, body: ArrayBuffer, type: string): void {
  if (body.byteLength > MAX_CACHE_BYTES / 10) return;
  const old = photoCache.get(url);
  if (old) {
    photoCache.delete(url);
    cachedBytes -= old.body.byteLength;
  }
  photoCache.set(url, { body, type, at: Date.now() });
  cachedBytes += body.byteLength;
  for (const [key, entry] of photoCache) {
    if (cachedBytes <= MAX_CACHE_BYTES) break;
    photoCache.delete(key);
    cachedBytes -= entry.body.byteLength;
  }
}

function photoResponse(body: ArrayBuffer, type: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

export async function handleImage(request: Request, env: Env): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const url = params.get("u") ?? "";
  const notFound = () => new Response("Not found", { status: 404 });
  if (!url.startsWith("https://")) return notFound();
  if (!(await safeEqual(params.get("s") ?? "", await signature(env.DB, url)))) return notFound();
  // Also still in a wish or a recent lookup, so deleted wishes' photos stop.
  if (!(await isKnownImage(env.DB, url))) return notFound();

  const cached = photoCache.get(url);
  if (cached && Date.now() - cached.at < CACHE_SECONDS * 1000) return photoResponse(cached.body, cached.type);

  const page = await fetchPublic(url, "image/avif,image/webp,image/png,image/jpeg,image/gif", (t) =>
    IMAGE_TYPES.test(t.split(";")[0].trim().toLowerCase()),
  ).catch(() => null);
  if (!page) return notFound();
  const declared = Number(page.res.headers.get("Content-Length") ?? 0);
  if (declared > MAX_IMAGE_BYTES) {
    await page.res.body?.cancel();
    return notFound();
  }
  const body = await page.res.arrayBuffer();
  if (body.byteLength > MAX_IMAGE_BYTES) return notFound();

  const type = page.res.headers.get("Content-Type")!.split(";")[0].trim().toLowerCase();
  remember(url, body, type);
  return photoResponse(body, type);
}
