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
    "style-src 'self' https://fonts.googleapis.com; " +
    // Product photos are shown straight from the shops' servers.
    "font-src https://fonts.gstatic.com; img-src 'self' data: https:; " +
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="snow" aria-hidden="true"></div>
<header class="site"><a href="/">🎅 ${t.siteTitle} 🎄</a><div class="switchers">${languageSwitcher(ctx)}${currencySwitcher(ctx)}</div></header>
<main>
${body}
</main>
<footer class="site">${t.footer}</footer>
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
