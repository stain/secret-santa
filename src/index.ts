// Worker entry point. Static files in public/ are served before this runs.

import { handleAdmin } from "./admin";
import { errorPage, html, page } from "./html";
import { handleParticipant } from "./participant";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.split("/").filter(Boolean);

    if (path.length === 0) {
      return page(
        "Welcome",
        html`<section class="card welcome">
  <h1>Ho ho ho!</h1>
  <p>Your organiser will email you a private link to your Secret Santa page.</p>
  <p class="muted">Lost it? Ask them to send it again.</p>
</section>`,
      );
    }
    if (path[0] === "p" && path.length === 2) return handleParticipant(request, env, path[1]);
    if (path[0] === "admin") return handleAdmin(request, env, path.slice(1));
    return errorPage(404, "Page not found.");
  },
} satisfies ExportedHandler<Env>;
