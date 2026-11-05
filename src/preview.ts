// Looks up a product's name and photo from a wish link, when the wish is
// saved. Sources, best first: schema.org Product in JSON-LD, OpenGraph and
// Twitter card meta tags, Amazon's product markup (which has neither), then
// the page's <title> and <link rel="image_src">.

export interface Preview {
  title: string;
  image: string;
}

const EMPTY: Preview = { title: "", image: "" };
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 6000;
const MAX_TITLE_LENGTH = 300;

/**
 * Refuse hosts that point back into a private network (relevant when running
 * locally; on Cloudflare a Worker can't reach private addresses anyway).
 * Shops don't live at bare IP addresses, so all IP literals are refused.
 */
function isPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return !(
    host.startsWith("[") ||
    /^[\d.]+$/.test(host) ||
    !host.includes(".") ||
    /\.(localhost|local|internal|lan|home|arpa)$/.test(host)
  );
}

/** Fetches HTML, following redirects only to public hosts. */
async function fetchPage(url: string): Promise<{ res: Response; base: string } | null> {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const target = new URL(current);
    if (!/^https?:$/.test(target.protocol) || !isPublicHost(target.hostname)) return null;
    const res = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SecretSantaWishPreview/1.0)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
    });
    const location = res.headers.get("Location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      current = new URL(location, target).href;
      continue;
    }
    if (!res.ok || !(res.headers.get("Content-Type") ?? "").includes("html")) {
      await res.body?.cancel();
      return null;
    }
    // The final address is the base for relative image paths.
    return { res, base: current };
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** HTMLRewriter hands over attribute values and text with entities still encoded. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function clean(text: unknown): string {
  return typeof text === "string"
    ? decodeEntities(text).replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH)
    : "";
}

function hasType(node: Record<string, unknown>, type: string): boolean {
  const t = node["@type"];
  return Array.isArray(t) ? t.includes(type) : t === type;
}

/** Depth-first search of JSON-LD for the first Product (or ProductGroup). */
function findProduct(node: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 6 || node === null || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = findProduct(n, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (hasType(obj, "Product") || hasType(obj, "ProductGroup")) return obj;
  for (const value of Object.values(obj)) {
    const found = findProduct(value, depth + 1);
    if (found) return found;
  }
  return undefined;
}

/** schema.org image: a URL, an ImageObject, or a list of either. */
function imageUrl(image: unknown): string {
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return imageUrl(image[0]);
  if (image && typeof image === "object") {
    const o = image as Record<string, unknown>;
    return imageUrl(o.url ?? o.contentUrl);
  }
  return "";
}

/** Only https images, as the page's CSP and mixed-content rules require. */
function absoluteHttps(src: string, base: string): string {
  if (!src) return "";
  try {
    const url = new URL(decodeEntities(src.trim()), base);
    return url.protocol === "https:" && url.href.length <= 2000 ? url.href : "";
  } catch {
    return "";
  }
}

export async function fetchPreview(url: string): Promise<Preview> {
  try {
    const page = await fetchPage(url);
    if (!page?.res.body) return EMPTY;
    const { res, base } = page;

    const jsonLd: string[] = [];
    const meta = new Map<string, string>();
    let titles = 0;
    let pageTitle = "";
    let amazonTitle = "";
    let amazonImage = "";
    let linkImage = "";

    const rewriter = new HTMLRewriter()
      .on('script[type="application/ld+json"]', {
        element: () => void jsonLd.push(""),
        text: (t) => void (jsonLd[jsonLd.length - 1] += t.text),
      })
      .on("meta", {
        element(el) {
          const key = (el.getAttribute("property") ?? el.getAttribute("name") ?? el.getAttribute("itemprop"))?.toLowerCase();
          const content = el.getAttribute("content");
          if (key && content && !meta.has(key)) meta.set(key, content);
        },
      })
      .on("#productTitle", { text: (t) => void (amazonTitle += t.text) })
      .on("img#landingImage", {
        element(el) {
          amazonImage ||= el.getAttribute("data-old-hires") || el.getAttribute("src") || "";
        },
      })
      .on('link[rel="image_src"]', {
        element(el) {
          linkImage ||= el.getAttribute("href") ?? "";
        },
      })
      .on("title", {
        element: () => void titles++,
        text: (t) => void (titles === 1 && (pageTitle += t.text)),
      });

    // Read through the rewritten page, giving up on very large ones.
    const reader = rewriter.transform(res).body!.getReader();
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }

    let product: Record<string, unknown> | undefined;
    for (const block of jsonLd) {
      try {
        product = findProduct(JSON.parse(block));
      } catch {
        // Broken JSON-LD is common; fall through to the meta tags.
      }
      if (product) break;
    }

    const title =
      clean(product?.name) ||
      clean(meta.get("og:title")) ||
      clean(meta.get("twitter:title")) ||
      clean(meta.get("name")) ||
      clean(amazonTitle) ||
      clean(pageTitle);
    const image =
      absoluteHttps(imageUrl(product?.image), base) ||
      absoluteHttps(meta.get("og:image:secure_url") ?? "", base) ||
      absoluteHttps(meta.get("og:image") ?? "", base) ||
      absoluteHttps(meta.get("twitter:image") ?? "", base) ||
      absoluteHttps(meta.get("image") ?? "", base) ||
      absoluteHttps(amazonImage, base) ||
      absoluteHttps(linkImage, base);
    return { title, image };
  } catch {
    // Timeouts, network errors and shops that block robots: no preview.
    return EMPTY;
  }
}
