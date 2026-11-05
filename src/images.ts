// Product photos are served through the Worker (/img?u=<url>), so visitors'
// browsers never contact the shop's or wisher's server: no IP addresses or
// load timings reach them, which could otherwise hint who a giftee's Santa is.

import { fetchPublic } from "./preview";

const MAX_IMAGE_BYTES = 5_000_000;
const CACHE_SECONDS = 24 * 60 * 60;
// Raster formats only: an SVG served from our own origin could carry script.
const IMAGE_TYPES = /^image\/(jpeg|png|gif|webp|avif)$/;

/** The address pages use for a product photo. */
export function imageSrc(url: string): string {
  return `/img?u=${encodeURIComponent(url)}`;
}

/** Only photos the app itself found are served, so this is no open proxy. */
async function isKnownImage(db: D1Database, url: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM wishes WHERE image = ? UNION SELECT 1 FROM previews WHERE image = ? LIMIT 1")
    .bind(url, url)
    .first();
  return row !== null;
}

export async function handleImage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url).searchParams.get("u") ?? "";
  const notFound = () => new Response("Not found", { status: 404 });
  if (!url.startsWith("https://") || !(await isKnownImage(env.DB, url))) return notFound();

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

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

  const response = new Response(body, {
    headers: {
      "Content-Type": page.res.headers.get("Content-Type")!.split(";")[0].trim().toLowerCase(),
      "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
  ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}
