// Tiny HTML templating: every interpolated value is escaped unless it is
// itself an Html fragment produced by the `html` tag.

export class Html {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

type Part = Html | string | number | null | undefined | false | Part[];

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function render(part: Part): string {
  if (part === null || part === undefined || part === false) return "";
  if (part instanceof Html) return part.value;
  if (Array.isArray(part)) return part.map(render).join("");
  return escape(String(part));
}

export function html(strings: TemplateStringsArray, ...values: Part[]): Html {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return new Html(out);
}

const SECURITY_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // Private pages carry ?key= in the URL: never leak it to other sites or
  // cache the page. ("no-referrer" would also blank Origin on our own forms.)
  "Referrer-Policy": "same-origin",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; " +
    "form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

export function page(title: string, body: Html, status = 200): Response {
  const doc = html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · Secret Santa</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="snow" aria-hidden="true"></div>
<header class="site"><a href="/">🎅 Secret Santa 🎄</a></header>
<main>
${body}
</main>
<footer class="site">Ho ho ho! ❄️</footer>
</body>
</html>`;
  return new Response(doc.value, { status, headers: SECURITY_HEADERS });
}

export function errorPage(status: number, message: string): Response {
  return page(
    "Oops",
    html`<section class="card"><h1>Oh no, a lump of coal!</h1><p>${message}</p></section>`,
    status,
  );
}

export function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}
