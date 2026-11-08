// Page layout and response headers shared by every HTML page.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { html, type Html } from "./html";
import { languageSwitcher, type Ctx } from "./i18n";
import { currencySwitcher } from "./money";

// Browsers may keep /static/ files for a day (nginx: expires 1d), so pages
// link to the stylesheet and script with a hash of their content: a changed
// file is fetched straight away, an unchanged one stays cached.
const PUBLIC_DIR = new URL("../public/", import.meta.url); // from src/ or dist/
const versions = new Map<string, string>();

/** "/static/style.css" → "/static/style.css?v=<hash of the file>". */
export function asset(path: string): string {
  let versioned = versions.get(path);
  if (!versioned) {
    const hash = createHash("sha256").update(readFileSync(new URL(path.slice(1), PUBLIC_DIR))).digest("hex");
    versioned = `${path}?v=${hash.slice(0, 10)}`;
    versions.set(path, versioned);
  }
  return versioned;
}

const SECURITY_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // Private pages carry ?key= in the URL: never leak it to other sites or
  // cache the page. ("no-referrer" would also blank Origin on our own forms.)
  "Referrer-Policy": "same-origin",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  // Start fetching the heading font straight away, rather than after the
  // stylesheet has arrived (nginx sends the same for the static pages).
  Link: '</static/fonts/mountains-of-christmas-700.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin',
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; connect-src 'self'; " +
    // Fonts and product photos are served from this site (see images.ts), so
    // visitors' browsers never contact other servers.
    "style-src 'self'; font-src 'self'; img-src 'self' data:; " +
    "form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

export function page(ctx: Ctx, title: string, body: Html, status = 200): Response {
  const { t } = ctx;
  const doc = html`<!doctype html>
<html lang="${ctx.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · ${t.siteTitle}</title>
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${asset("/static/style.css")}">
</head>
<body>
<div class="snow" aria-hidden="true"></div>
<header class="site"><a href="/">🎅 ${t.siteTitle} 🎄</a><div class="switchers">${languageSwitcher(ctx)}${!ctx.static && currencySwitcher(ctx)}</div></header>
<main>
${body}
</main>
<footer class="site">${t.footer} · <a href="/privacy">${t.privacy}</a>${(ctx.dataController || ctx.hosting) && html`
<div class="legal">${[
  ctx.dataController && `${t.footerController}: ${ctx.dataController}`,
  ctx.hosting && `${t.footerHosting}: ${ctx.hosting}`,
].filter(Boolean).join(" · ")}</div>`}</footer>
</body>
</html>`;
  return new Response(doc.value, { status, headers: SECURITY_HEADERS });
}

export function errorPage(ctx: Ctx, status: number, message: string): Response {
  return page(
    ctx,
    ctx.t.errorTitle,
    html`<section class="card"><h1>${ctx.t.errorHeading}</h1><p>${message}</p></section>`,
    status,
  );
}
