// Looks up a product's name, photo and price from a wish link. Sources, best
// first: schema.org Product (with its Offer) in JSON-LD, OpenGraph, product
// and Twitter meta tags, microdata, Amazon's product markup (which has none
// of those), then the page's <title> and <link rel="image_src">.

export interface Preview {
  title: string;
  image: string;
  price: number | null;
  currency: string; // ISO 4217; "" when price is null
}

const EMPTY: Preview = { title: "", image: "", price: null, currency: "" };
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Outbound lookups each participant may trigger per hour (cache hits are free). */
export const MAX_LOOKUPS_PER_HOUR = 30;
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

/**
 * Fetches a public URL whose Content-Type passes `accept`, following
 * redirects only to public hosts. Also used by the image proxy (images.ts).
 */
export async function fetchPublic(
  url: string,
  acceptHeader: string,
  accept: (contentType: string) => boolean,
): Promise<{ res: Response; base: string } | null> {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const target = new URL(current);
    if (!/^https?:$/.test(target.protocol) || !isPublicHost(target.hostname)) return null;
    const res = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SecretSantaWishPreview/1.0)",
        Accept: acceptHeader,
      },
    });
    const location = res.headers.get("Location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      current = new URL(location, target).href;
      continue;
    }
    if (!res.ok || !accept(res.headers.get("Content-Type") ?? "")) {
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

/**
 * Reads the first amount in "£1,234.50", "1.234,50 €", "1 234 kr" or
 * "£45.00 with 10 percent savings"; null if there is none.
 */
function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== "string") return null;
  // Digits joined by . or , or by a space before a group of exactly three.
  const token = decodeEntities(raw).match(/\d+(?:(?:[.,]|[\s\u00a0](?=\d{3}(?!\d)))\d+)*/)?.[0];
  if (!token) return null;
  const digits = token.replace(/[\s\u00a0]/g, "");
  const lastSep = Math.max(digits.lastIndexOf("."), digits.lastIndexOf(","));
  // A last separator followed by exactly three digits groups thousands.
  const decimals = lastSep >= 0 && digits.length - lastSep - 1 !== 3;
  const whole = (decimals ? digits.slice(0, lastSep) : digits).replace(/[.,]/g, "");
  const n = Number(decimals ? `${whole}.${digits.slice(lastSep + 1)}` : whole);
  return Number.isFinite(n) ? n : null;
}

/** Guesses the currency of a displayed price such as "£4.99" or "kr 299". */
function currencyOfText(text: string, hostname: string): string {
  const tld = hostname.split(".").pop() ?? "";
  const code = text.match(/\b(MXN|GBP|NOK|EUR|USD|SEK|DKK)\b/)?.[1];
  if (code) return code;
  if (/MX\$/.test(text)) return "MXN";
  if (/US\$/.test(text)) return "USD";
  if (text.includes("£")) return "GBP";
  if (text.includes("€")) return "EUR";
  if (/kr/i.test(text)) return ({ no: "NOK", se: "SEK", dk: "DKK" } as Record<string, string>)[tld] ?? "";
  if (text.includes("$")) return ({ mx: "MXN", ca: "CAD", au: "AUD" } as Record<string, string>)[tld] ?? "USD";
  return "";
}

/** The first priced Offer (or AggregateOffer) in a schema.org offers value. */
function offerPrice(offers: unknown, depth = 0): { price: number; currency: string } | null {
  if (depth > 3 || !offers || typeof offers !== "object") return null;
  if (Array.isArray(offers)) {
    for (const o of offers) {
      const found = offerPrice(o, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const o = offers as Record<string, unknown>;
  const price = parseAmount(o.price ?? o.lowPrice);
  const currency = o.priceCurrency;
  if (price !== null && typeof currency === "string") return { price, currency };
  return offerPrice(o.priceSpecification, depth + 1);
}

function validPrice(price: number | null, currency: string | undefined): Pick<Preview, "price" | "currency"> {
  const code = (currency ?? "").trim().toUpperCase();
  return price !== null && price > 0 && /^[A-Z]{3}$/.test(code) ? { price, currency: code } : { price: null, currency: "" };
}

export async function fetchPreview(url: string): Promise<Preview> {
  try {
    const page = await fetchPublic(url, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", (t) => t.includes("html"));
    return page?.res.body ? await extractPreview(page.res, page.base) : EMPTY;
  } catch {
    // Timeouts, network errors and shops that block robots: no preview.
    return EMPTY;
  }
}

/** Reads the preview out of a fetched HTML page; base resolves relative URLs. */
export async function extractPreview(res: Response, base: string): Promise<Preview> {
  const jsonLd: string[] = [];
  const meta = new Map<string, string>();
  let titles = 0;
  let pageTitle = "";
  let amazonTitle = "";
  let amazonImage = "";
  let amazonPrice = "";
  let amazonPrices = 0;
  let amazonWhole = "";
  let amazonFraction = "";
  let amazonSymbol = "";
  let amazonWholes = 0;
  let amazonSymbols = 0;
  let variantPrice = "";
  let variantUnit = "";
  let robotCheck = false;
  let linkImage = "";
  let itemPrice = "";
  let itemCurrency = "";

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
    // Amazon's robot check, served instead of the product page.
    .on('form[action*="validateCaptcha"]', { element: () => void (robotCheck = true) })
    // Pages with sizes or colours carry the selected variant's price here.
    .on("input#twister-plus-price-data-price", {
      element(el) {
        variantPrice ||= el.getAttribute("value") ?? "";
      },
    })
    .on("input#twister-plus-price-data-price-unit", {
      element(el) {
        variantUnit ||= el.getAttribute("value") ?? "";
      },
    })
    // The first displayed price as plain text (older and newer class names).
    .on(".a-price .a-offscreen, .a-price .aok-offscreen, #corePriceDisplay_desktop_feature_div .aok-offscreen", {
      element: () => void amazonPrices++,
      text: (t) => void (amazonPrices === 1 && (amazonPrice += t.text)),
    })
    // ...and the same price as shown, split into symbol, whole and fraction.
    .on(".a-price .a-price-whole", {
      element: () => void amazonWholes++,
      text: (t) => void (amazonWholes === 1 && (amazonWhole += t.text)),
    })
    .on(".a-price .a-price-fraction", { text: (t) => void (amazonWholes === 1 && (amazonFraction += t.text)) })
    .on(".a-price .a-price-symbol", {
      element: () => void amazonSymbols++,
      text: (t) => void (amazonSymbols === 1 && (amazonSymbol += t.text)),
    })
    .on('[itemprop="price"]', {
      element(el) {
        itemPrice ||= el.getAttribute("content") ?? "";
      },
    })
    .on('[itemprop="priceCurrency"]', {
      element(el) {
        itemCurrency ||= el.getAttribute("content") ?? "";
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

  if (robotCheck) return EMPTY;

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
  const host = new URL(base).hostname;
  const offer = offerPrice(product?.offers);
  const priced = [
    validPrice(offer?.price ?? null, offer?.currency),
    validPrice(parseAmount(meta.get("product:price:amount")), meta.get("product:price:currency")),
    validPrice(parseAmount(meta.get("og:price:amount")), meta.get("og:price:currency")),
    validPrice(parseAmount(itemPrice), itemCurrency),
    validPrice(parseAmount(variantPrice), currencyOfText(variantUnit, host)),
    validPrice(parseAmount(amazonPrice), currencyOfText(amazonPrice, host)),
    validPrice(
      parseAmount(`${amazonWhole.replace(/[^\d]/g, "")}.${amazonFraction.replace(/[^\d]/g, "") || "00"}`),
      currencyOfText(amazonSymbol, host),
    ),
  ].find((p) => p.price !== null);
  return { title, image, ...(priced ?? { price: null, currency: "" }) };
}

/**
 * fetchPreview, remembering successful lookups in D1 for a day. Returns null
 * when the participant has used up their lookups for the hour. Each lookup
 * also deletes cache and rate-limit rows older than a day, so neither grows.
 */
export async function cachedPreview(db: D1Database, url: string, participantId: string): Promise<Preview | null> {
  const hit = await db
    .prepare("SELECT title, image, price, currency, fetched_at FROM previews WHERE url = ?")
    .bind(url)
    .first<Preview & { fetched_at: string }>();
  if (hit && Date.now() - Date.parse(hit.fetched_at) < CACHE_MAX_AGE_MS) {
    const { fetched_at: _, ...preview } = hit;
    return preview;
  }
  const now = Date.now();
  const used = await db
    .prepare("SELECT COUNT(*) AS n FROM lookups WHERE participant_id = ? AND at > ?")
    .bind(participantId, new Date(now - 60 * 60 * 1000).toISOString())
    .first<number>("n");
  if ((used ?? 0) >= MAX_LOOKUPS_PER_HOUR) return null;
  const dayAgo = new Date(now - CACHE_MAX_AGE_MS).toISOString();
  await db.batch([
    db.prepare("INSERT INTO lookups (participant_id, at) VALUES (?, ?)").bind(participantId, new Date(now).toISOString()),
    db.prepare("DELETE FROM lookups WHERE at < ?").bind(dayAgo),
    db.prepare("DELETE FROM previews WHERE fetched_at < ?").bind(dayAgo),
  ]);

  const preview = await fetchPreview(url);
  if (preview.title || preview.image) {
    await db
      .prepare(
        `INSERT INTO previews (url, title, image, price, currency, fetched_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (url) DO UPDATE SET title = excluded.title, image = excluded.image,
           price = excluded.price, currency = excluded.currency, fetched_at = excluded.fetched_at`,
      )
      .bind(url, preview.title, preview.image, preview.price, preview.currency, new Date().toISOString())
      .run();
  }
  return preview;
}
