// Request routing. In production nginx serves public/ and the pre-rendered
// pages (render-static.ts) itself; in development server.ts serves public/
// and `handle` renders everything else.

import type { Env } from "./env";
import { handleAdmin } from "./admin";
import { getSettings } from "./db";
import { html } from "./html";
import { resolveContext, switchLanguage, type Ctx } from "./i18n";
import { errorPage, page } from "./layout";
import { switchCurrency } from "./money";
import { handleImage } from "./images";
import { handleParticipant } from "./participant";
import { privacyPage } from "./privacy";

/** The front page. Also rendered as a static file per language (render-static.ts). */
export function homePage(ctx: Ctx): Response {
  const { t } = ctx;
  return page(
    ctx,
    t.welcomeTitle,
    html`<section class="card welcome">
  <h1>${t.welcomeHeading}</h1>
  <p>${t.welcomeText}</p>
  <p class="muted">${t.welcomeLost}</p>
</section>`,
  );
}

export async function handle(request: Request, env: Env): Promise<Response> {
  // HEAD (used by some email link scanners) gets the GET response's headers.
  if (request.method === "HEAD") {
    const res = await handle(new Request(request, { method: "GET" }), env);
    return new Response(null, { status: res.status, headers: res.headers });
  }
  const ctx = resolveContext(request);
  const { t } = ctx;
  const path = ctx.url.pathname.split("/").filter(Boolean);

  // The front page and privacy notice are served as static files in
  // production (by nginx); these routes are for local development.
  if (path.length === 0) return homePage(ctx);
  if (path[0] === "privacy" && path.length === 1) return privacyPage(ctx);

  // Interactive pages name the data controller and hosting in their footer.
  const settings = await getSettings(env.DB);
  if (settings.controllerName) {
    ctx.dataController = settings.controllerContact
      ? `${settings.controllerName} (${settings.controllerContact})`
      : settings.controllerName;
  }
  ctx.hosting = [env.HOSTING_PROVIDER, env.HOSTING_LOCATION].filter(Boolean).join(", ");

  if (path[0] === "img" && path.length === 1) return handleImage(request, env);
  if (path[0] === "lang" && path.length === 2) return switchLanguage(ctx.url, path[1]);
  if (path[0] === "cur" && path.length === 2) return switchCurrency(ctx.url, path[1]);
  if (path[0] === "p" && (path.length === 2 || (path.length === 3 && ["preview", "data"].includes(path[2])))) {
    return handleParticipant(ctx, request, env, path[1], path[2]);
  }
  if (path[0] === "admin") return handleAdmin(ctx, request, env, path.slice(1));
  return errorPage(ctx, 404, t.notFound);
}
