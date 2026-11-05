// Worker entry point. Static files in public/ are served before this runs.

import { handleAdmin } from "./admin";
import { purgeExpired } from "./db";
import { html } from "./html";
import { resolveContext, switchLanguage } from "./i18n";
import { errorPage, page } from "./layout";
import { switchCurrency } from "./money";
import { handleImage } from "./images";
import { handleParticipant } from "./participant";
import { privacyPage } from "./privacy";

const worker = {
  async fetch(request, env, execution): Promise<Response> {
    // HEAD (used by some email link scanners) gets the GET response's headers.
    // Static files in public/ handle HEAD themselves.
    if (request.method === "HEAD") {
      const res = await worker.fetch(new Request(request, { method: "GET" }), env, execution);
      return new Response(null, { status: res.status, headers: res.headers });
    }
    const ctx = resolveContext(request);
    const { t } = ctx;
    const path = ctx.url.pathname.split("/").filter(Boolean);

    if (path.length === 0) {
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
    if (path[0] === "privacy" && path.length === 1) return privacyPage(ctx, env);
    if (path[0] === "img" && path.length === 1) return handleImage(request, env, execution);
    if (path[0] === "lang" && path.length === 2) return switchLanguage(ctx.url, path[1]);
    if (path[0] === "cur" && path.length === 2) return switchCurrency(ctx.url, path[1]);
    if (path[0] === "p" && (path.length === 2 || (path.length === 3 && ["preview", "data"].includes(path[2])))) {
      return handleParticipant(ctx, request, env, path[1], path[2]);
    }
    if (path[0] === "admin") return handleAdmin(ctx, request, env, path.slice(1));
    return errorPage(ctx, 404, t.notFound);
  },

  /** Daily (see triggers in wrangler.jsonc): delete groups past their end date. */
  async scheduled(_controller, env): Promise<void> {
    const deleted = await purgeExpired(env.DB);
    console.log(`Deleted ${deleted} expired group(s)`);
  },
} satisfies ExportedHandler<Env>;

export default worker;
