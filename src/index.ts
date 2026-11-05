// Worker entry point. Static files in public/ are served before this runs.

import { handleAdmin } from "./admin";
import { html } from "./html";
import { resolveContext, switchLanguage } from "./i18n";
import { errorPage, page } from "./layout";
import { handleParticipant } from "./participant";

export default {
  async fetch(request, env): Promise<Response> {
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
    if (path[0] === "lang" && path.length === 2) return switchLanguage(ctx.url, path[1]);
    if (path[0] === "p" && path.length === 2) return handleParticipant(ctx, request, env, path[1]);
    if (path[0] === "admin") return handleAdmin(ctx, request, env, path.slice(1));
    return errorPage(ctx, 404, t.notFound);
  },
} satisfies ExportedHandler<Env>;
