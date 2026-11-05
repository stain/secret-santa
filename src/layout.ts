// Page layout and response headers shared by every HTML page.

import { html, type Html } from "./html";
import { languageSwitcher, type Ctx } from "./i18n";
import { currencySwitcher } from "./money";

const SECURITY_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // Private pages carry ?key= in the URL: never leak it to other sites or
  // cache the page. ("no-referrer" would also blank Origin on our own forms.)
  "Referrer-Policy": "same-origin",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
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
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="snow" aria-hidden="true"></div>
<header class="site"><a href="/">🎅 ${t.siteTitle} 🎄</a><div class="switchers">${languageSwitcher(ctx)}${currencySwitcher(ctx)}</div></header>
<main>
${body}
</main>
<footer class="site">${t.footer} · <a href="/privacy">${t.privacy}</a></footer>
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
