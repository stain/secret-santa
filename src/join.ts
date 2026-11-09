// The join link for a group, /j/<id>?key=<secret>: shared in a group chat so
// people can add themselves before the cut-off date, and only before the
// draw. Joining leads straight to the new participant's private page.

import { EMAIL, joinPath } from "./admin";
import type { Env } from "./env";
import { getChain, getSettings, joinChain, joiningOpen, listParticipants, type Chain } from "./db";
import { html, redirect, type Html } from "./html";
import { formatDate, type Ctx } from "./i18n";
import { errorPage, page } from "./layout";
import { participantPath } from "./participant";
import { isSameOrigin, safeEqual } from "./security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Names compared ignoring case and extra spaces. */
function sameName(a: string, b: string): boolean {
  const norm = (s: string) => s.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return norm(a) === norm(b);
}

export async function handleJoin(ctx: Ctx, request: Request, env: Env, id: string): Promise<Response> {
  const { t, url } = ctx;
  // Every request checks the key first; a wrong key and an unknown group look the same.
  const key = url.searchParams.get("key") ?? "";
  const chain = UUID.test(id) ? await getChain(env.DB, id) : null;
  if (!chain || !key || !chain.join_key || !(await safeEqual(key, chain.join_key))) {
    return errorPage(ctx, 404, t.badLink);
  }
  if (!joiningOpen(chain)) {
    return joinPage(ctx, env, chain, html`<p class="warning">${
      chain.drawn_at ? t.joinClosedDrawn : chain.joins_close_on ? t.joinClosed : t.joinNotOpen
    }</p>`);
  }
  if (request.method === "GET") return joinPage(ctx, env, chain);
  if (request.method !== "POST") return errorPage(ctx, 405, t.methodNotAllowed);
  if (!isSameOrigin(request)) return errorPage(ctx, 403, t.crossSite);

  const form = await request.formData().catch(() => new FormData());
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const entered = { name, email };
  if (!name || email.length > 254 || !EMAIL.test(email)) {
    return joinPage(ctx, env, chain, html`<p class="warning">${t.joinNeedNameEmail}</p>`, entered, 400);
  }

  // Someone already listed gets no new link here: the join link is shared
  // with many people, so it must never hand out someone else's page.
  const people = await listParticipants(env.DB, chain.id);
  if (people.some((p) => p.email === email)) {
    return joinPage(ctx, env, chain, html`<p class="warning">${t.joinEmailListed}</p>`, entered, 409);
  }
  const namesake = people.find((p) => sameName(p.name, name));
  if (namesake && form.get("same_name_ok") !== "1") {
    return joinPage(ctx, env, chain, html`<p class="warning">${t.joinNameListed(namesake.name)}</p>`, entered, 409, true);
  }

  const result = await joinChain(env.DB, chain.id, name, email);
  if (result === "taken") {
    return joinPage(ctx, env, chain, html`<p class="warning">${t.joinEmailListed}</p>`, entered, 409);
  }
  if (result === "closed") {
    return joinPage(ctx, env, chain, html`<p class="warning">${t.joinClosedDrawn}</p>`, undefined, 409);
  }
  if (result === "full") return joinPage(ctx, env, chain, html`<p class="warning">${t.joinFull}</p>`, entered, 409);
  return redirect(participantPath(result) + "&joined=1");
}

async function joinPage(
  ctx: Ctx,
  env: Env,
  chain: Chain,
  message?: Html,
  entered = { name: "", email: "" },
  status = 200,
  askSameName = false,
): Promise<Response> {
  const { t } = ctx;
  const settings = await getSettings(env.DB);
  const open = joiningOpen(chain);
  return page(
    ctx,
    t.joinTitle(chain.name),
    html`<h1>${t.joinTitle(chain.name)}</h1>
<section class="card">
  ${message}
  ${open && html`<p>${t.joinLead}</p>
  <p class="muted">${t.joinUntil(formatDate(ctx, chain.joins_close_on!))}</p>
  <form method="post" action="${joinPath(chain)}">
    <label for="name">${t.joinName}</label>
    <input id="name" name="name" required maxlength="100" autocomplete="name" value="${entered.name}">
    <label for="email">${t.joinEmail}</label>
    <input id="email" name="email" type="email" required maxlength="254" autocomplete="email" value="${entered.email}">
    ${askSameName && html`<label class="check"><input type="checkbox" name="same_name_ok" value="1" required> ${t.joinSameNameConfirm}</label>`}
    <button type="submit">${t.joinButton}</button>
  </form>`}
</section>
<section class="card your-data">
  <h2>${t.yourData}</h2>
  <p>${t.joinPrivacy}</p>
  ${settings.controllerName
    ? html`<p>${t.controller} <strong>${settings.controllerName}</strong>${settings.controllerContact && ` (${settings.controllerContact})`}</p>`
    : html`<p class="muted">${t.controllerNotSet}</p>`}
  ${chain.organiser && html`<p>${t.groupOrganiser} <strong>${chain.organiser}</strong></p>`}
  ${chain.ends_on && html`<p>${t.deletedOn(formatDate(ctx, chain.ends_on))}</p>`}
  <p><a href="/privacy">${t.privacyLink}</a></p>
</section>`,
    status,
  );
}
