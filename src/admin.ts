// Admin pages under /admin, protected by Basic auth (see security.ts), and
// the organiser's page for one group, /o/<id>?key=<secret>, which shares the
// group page and most of its actions.

import type { Env } from "./env";
import {
  MAX_WISHES,
  MIN_PARTICIPANTS,
  addParticipants,
  clearWishes,
  createChain,
  deleteChain,
  drawChain,
  getChain,
  getSettings,
  joiningOpen,
  latestCutoff,
  listChains,
  listParticipants,
  listWishes,
  removeParticipant,
  renewInviteKeys,
  setBudget,
  setJoinsCloseOn,
  setPrivacy,
  setSettings,
  updateParticipant,
  type Chain,
  type Participant,
} from "./db";
import { html, redirect } from "./html";
import { formatDate, type Ctx } from "./i18n";
import { errorPage, page } from "./layout";
import { CURRENCIES, budgetText, getRates, isCurrency } from "./money";
import { participantPath } from "./participant";
import { isSameOrigin, requireAdmin, safeEqual } from "./security";

export const EMAIL = /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function organiserPath(chain: Pick<Chain, "id" | "organiser_key">): string {
  return `/o/${chain.id}?key=${encodeURIComponent(chain.organiser_key)}`;
}

export function joinPath(chain: Pick<Chain, "id" | "join_key">): string {
  return `/j/${chain.id}?key=${encodeURIComponent(chain.join_key)}`;
}

/**
 * Who is looking at a group page: the admin (everything) or the group's
 * organiser (people, budget, joining and the draw, but not the data
 * controller's settings, the circle, the organiser link or deleting).
 */
interface Role {
  admin: boolean;
  /** The group page, to return to after an action. */
  home: string;
  /** Where an action's form posts. */
  action(name: string, participantId?: string): string;
}

function adminRole(chain: Chain): Role {
  const base = `/admin/chains/${chain.id}`;
  return { admin: true, home: base, action: (name, pid) => `${base}/${name}${pid ? `/${pid}` : ""}` };
}

function organiserRole(chain: Chain): Role {
  const key = `?key=${encodeURIComponent(chain.organiser_key)}`;
  const base = `/o/${chain.id}`;
  return { admin: false, home: base + key, action: (name, pid) => `${base}/${name}${pid ? `/${pid}` : ""}${key}` };
}

/** `path` with `query` added, whether or not it already has a query string. */
function withQuery(path: string, query: string): string {
  return path + (path.includes("?") ? "&" : "?") + query;
}

/** The latest cut-off date allowed: Christmas Eve, or the group's end date if that is earlier. */
function maxCutoff(chain: Chain): string {
  const christmasEve = latestCutoff();
  return chain.ends_on !== null && chain.ends_on < christmasEve ? chain.ends_on : christmasEve;
}

function isDate(text: string): boolean {
  return DATE.test(text) && !Number.isNaN(Date.parse(text));
}

/** Parses one person per line: "Name, email" or "Name <email>". */
export function parsePeople(text: string) {
  const people: { name: string; email: string }[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Long lines are rejected before matching: the patterns below can be slow on them.
    if (line.length > 300) {
      bad.push(line.slice(0, 60) + "…");
      continue;
    }
    const m = line.match(/^(.+?)\s*<([^>]+)>$/) ?? line.match(/^(.+?)\s*[,;\t]\s*(\S+)$/);
    const name = m?.[1].trim().slice(0, 100);
    const email = m?.[2].trim().toLowerCase();
    if (name && email && EMAIL.test(email)) people.push({ name, email });
    else bad.push(line);
  }
  return { people, bad };
}

/** A mailto: link with the invitation written in the admin's current language. */
function mailto(ctx: Ctx, p: Participant, chainName: string): string {
  const link = ctx.url.origin + participantPath(p);
  return (
    `mailto:${encodeURIComponent(p.email)}` +
    `?subject=${encodeURIComponent(ctx.t.mailSubject(chainName))}` +
    `&body=${encodeURIComponent(ctx.t.mailBody(p.name, chainName, link, `${ctx.url.origin}/privacy`))}`
  );
}

export async function handleAdmin(ctx: Ctx, request: Request, env: Env, path: string[]): Promise<Response> {
  const { t } = ctx;
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  const post = request.method === "POST";
  if (post && !isSameOrigin(request)) return errorPage(ctx, 403, t.crossSite);
  const form = post ? await request.formData().catch(() => new FormData()) : null;
  const field = (name: string) => String(form?.get(name) ?? "").trim();

  // /admin
  if (path.length === 0) {
    if (post) {
      const name = field("name").slice(0, 100);
      if (!name) return errorPage(ctx, 400, t.needGroupName);
      return redirect(`/admin/chains/${await createChain(env.DB, name, ctx.currency)}`);
    }
    return adminHome(ctx, env);
  }

  // /admin/settings
  if (path[0] === "settings" && path.length === 1 && post) {
    const controllerName = field("controller_name").slice(0, 200);
    const controllerContact = field("controller_contact").slice(0, 300);
    if (!controllerName || !controllerContact) return errorPage(ctx, 400, t.needController);
    await setSettings(env.DB, { controllerName, controllerContact });
    return redirect("/admin");
  }

  // /admin/chains/<id>[/action[/<participant id>]]
  if (path[0] !== "chains" || !path[1]) return errorPage(ctx, 404, t.notFound);
  const chain = await getChain(env.DB, path[1]);
  if (!chain) return errorPage(ctx, 404, t.groupMissing);
  return handleChain(ctx, env, chain, adminRole(chain), path.slice(2), form);
}

/**
 * The organiser's page for one group: /o/<id>[/action[/<participant id>]]?key=<secret>.
 * Every route checks the key first; a wrong key and an unknown group look the same.
 */
export async function handleOrganiser(
  ctx: Ctx,
  request: Request,
  env: Env,
  path: string[],
): Promise<Response> {
  const { t } = ctx;
  const key = ctx.url.searchParams.get("key") ?? "";
  const chain = UUID.test(path[0] ?? "") ? await getChain(env.DB, path[0]) : null;
  if (!chain || !key || !chain.organiser_key || !(await safeEqual(key, chain.organiser_key))) {
    return errorPage(ctx, 404, t.badLink);
  }
  const post = request.method === "POST";
  if (post && !isSameOrigin(request)) return errorPage(ctx, 403, t.crossSite);
  const form = post ? await request.formData().catch(() => new FormData()) : null;
  return handleChain(ctx, env, chain, organiserRole(chain), path.slice(1), form);
}

/** A group page (GET) or one of its actions (POST), for the admin or the organiser. */
async function handleChain(
  ctx: Ctx,
  env: Env,
  chain: Chain,
  role: Role,
  path: string[],
  form: FormData | null,
): Promise<Response> {
  const { t } = ctx;
  const field = (name: string) => String(form?.get(name) ?? "").trim();
  const back = role.home;
  const [action, participantId = ""] = path;

  if (!form) {
    if (action) return errorPage(ctx, 405, t.methodNotAllowed);
    return chainPage(ctx, env, chain.id, role);
  }
  switch (action) {
    case "participants": {
      const { people, bad } = parsePeople(field("people"));
      if (bad.length) return errorPage(ctx, 400, t.badLines(bad.join(" | ")));
      const added = await addParticipants(env.DB, chain.id, people);
      return redirect(withQuery(back, `added=${added}&skipped=${people.length - added}`));
    }
    case "budget": {
      const raw = field("limit").replace(",", ".");
      const limit = raw === "" ? null : Number(raw);
      const currency = field("currency");
      if ((limit !== null && !(limit > 0 && Number.isFinite(limit))) || !isCurrency(currency)) {
        return errorPage(ctx, 400, t.badBudget);
      }
      await setBudget(env.DB, chain.id, limit, currency);
      return redirect(back);
    }
    case "joining": {
      const closesOn = field("joins_close_on");
      if (closesOn && (!isDate(closesOn) || closesOn > maxCutoff(chain))) {
        return errorPage(ctx, 400, t.badCutoff);
      }
      await setJoinsCloseOn(env.DB, chain.id, closesOn || null);
      return redirect(back);
    }
    case "edit": {
      const name = field("name").slice(0, 100);
      const email = field("email").toLowerCase();
      if (!name || !EMAIL.test(email)) return errorPage(ctx, 400, t.badLines(`${name} ${email}`));
      if (!(await updateParticipant(env.DB, chain.id, participantId, name, email))) {
        return errorPage(ctx, 400, t.emailTaken);
      }
      return redirect(back);
    }
    case "clear-wishes":
      await clearWishes(env.DB, chain.id, participantId);
      return redirect(back);
    case "remove":
      await removeParticipant(env.DB, chain.id, participantId);
      return redirect(back);
    case "draw":
      // People who were told they can join until the cut-off must not miss the draw.
      if (joiningOpen(chain)) return errorPage(ctx, 400, t.drawAfterCutoff(formatDate(ctx, chain.joins_close_on!)));
      try {
        await drawChain(env.DB, chain.id);
      } catch {
        return errorPage(ctx, 400, t.needAtLeast(MIN_PARTICIPANTS));
      }
      return redirect(withQuery(back, "drawn=1"));
  }
  // Only the admin may change the data controller's settings, renew the links or delete the group.
  if (role.admin) {
    switch (action) {
      case "privacy": {
        const organiser = field("organiser").slice(0, 200);
        const endsOn = field("ends_on");
        if (!isDate(endsOn)) return errorPage(ctx, 400, t.badDate);
        await setPrivacy(env.DB, chain.id, organiser, endsOn);
        return redirect(back);
      }
      case "renew-links":
        await renewInviteKeys(env.DB, chain.id);
        return redirect(back);
      case "delete":
        await deleteChain(env.DB, chain.id);
        return redirect("/admin");
    }
  }
  return errorPage(ctx, 404, t.notFound);
}

async function adminHome(ctx: Ctx, env: Env): Promise<Response> {
  const { t } = ctx;
  const chains = await listChains(env.DB);
  const settings = await getSettings(env.DB);
  return page(
    ctx,
    t.adminTitle,
    html`<h1>${t.workshop}</h1>
<section class="card">
  <h2>${t.controllerHeading}</h2>
  ${!settings.controllerName && html`<p class="warning">${t.controllerWarning}</p>`}
  <p class="muted">${t.controllerHelp}</p>
  <form method="post" action="/admin/settings" class="inline">
    <div class="grow"><label for="controller_name">${t.controllerName}</label>
      <input id="controller_name" name="controller_name" required maxlength="200" value="${settings.controllerName}"></div>
    <div class="grow"><label for="controller_contact">${t.controllerContact}</label>
      <input id="controller_contact" name="controller_contact" required maxlength="300" value="${settings.controllerContact}"></div>
    <button type="submit">${t.save}</button>
  </form>
  <p><a href="/privacy">${t.privacyTitle}</a></p>
</section>
<section class="card">
  <h2>${t.groups}</h2>
  ${chains.length
    ? html`<ul class="chains">${chains.map(
        (c) => html`<li><a href="/admin/chains/${c.id}">${c.name}</a>
          <span class="muted">${t.groupSummary(c.participant_count, c.drawn_at !== null)}</span></li>`,
      )}</ul>`
    : html`<p class="muted">${t.noGroups}</p>`}
</section>
<section class="card">
  <h2>${t.newGroup}</h2>
  <form method="post" action="/admin">
    <label for="name">${t.groupName}</label>
    <input id="name" name="name" required maxlength="100" placeholder="${t.groupPlaceholder}">
    <button type="submit">${t.createGroup}</button>
  </form>
</section>`,
  );
}

async function chainPage(ctx: Ctx, env: Env, chainId: string, role: Role): Promise<Response> {
  const { t, url } = ctx;
  const chain = (await getChain(env.DB, chainId))!;
  const people = await listParticipants(env.DB, chainId);
  const wishes = await listWishes(env.DB, chainId);
  const rates = await getRates(env.DB);
  const settings = await getSettings(env.DB);
  const byId = new Map(people.map((p) => [p.id, p]));
  const act = role.action;
  const added = url.searchParams.get("added");

  // Walk the circle from the first person so the admin can check it is unbroken.
  const circle: Participant[] = [];
  if (role.admin && chain.drawn_at && people.length) {
    let p: Participant | undefined = people[0];
    do {
      circle.push(p);
      p = byId.get(p.giftee_id ?? "");
    } while (p && p !== people[0] && circle.length <= people.length);
  }

  const joinStatus = joiningOpen(chain)
    ? html`<p class="notice">${t.joiningOpenUntil(formatDate(ctx, chain.joins_close_on!))}</p>`
    : html`<p class="muted">${chain.drawn_at ? t.joiningClosedDrawn : chain.joins_close_on ? t.joiningClosedPast : t.joiningOff}</p>`;

  return page(
    ctx,
    chain.name,
    html`${role.admin ? html`<p><a href="/admin">${t.allGroups}</a></p>` : html`<p class="muted">${t.organiserPageNote}</p>`}
<h1>${chain.name}</h1>
${added !== null && html`<p class="notice">${t.added(Number(added), Number(url.searchParams.get("skipped") ?? 0))}</p>`}
${url.searchParams.has("drawn") && html`<p class="notice">${t.namesDrawn}</p>`}

${role.admin && !settings.controllerName && html`<p class="warning"><a href="/admin">${t.controllerWarning}</a></p>`}

${role.admin && html`<section class="card">
  <h2>${t.organiserHeading}</h2>
  <p class="muted">${t.organiserHelp}</p>
  <form method="post" action="${act("privacy")}" class="inline">
    <div class="grow"><label for="organiser">${t.organiserLabel}</label>
      <input id="organiser" name="organiser" maxlength="200" value="${chain.organiser}" placeholder="Mrs Claus, mrs.claus@example.org"></div>
    <div><label for="ends_on">${t.endsOnLabel}</label>
      <input id="ends_on" name="ends_on" type="date" required value="${chain.ends_on ?? ""}"></div>
    <button type="submit">${t.save}</button>
  </form>
  ${chain.ends_on && html`<p>${t.deletedOn(formatDate(ctx, chain.ends_on))}</p>`}
</section>`}

<section class="card">
  <h2>${t.invitesHeading}</h2>
  ${role.admin && html`<h3>${t.organiserLinkHeading}</h3>
  <p class="muted">${t.organiserLinkHelp}</p>
  <input readonly value="${url.origin + organiserPath(chain)}" aria-label="${t.organiserLinkHeading}">`}
  <h3>${t.joinLinkHeading}</h3>
  <p class="muted">${t.joinLinkHelp}</p>
  <input readonly value="${url.origin + joinPath(chain)}" aria-label="${t.joinLinkHeading}">
  ${joinStatus}
  <form method="post" action="${act("joining")}" class="inline">
    <div><label for="joins_close_on">${t.cutoffLabel}</label>
      <input id="joins_close_on" name="joins_close_on" type="date" value="${chain.joins_close_on ?? ""}" max="${maxCutoff(chain)}"></div>
    <button type="submit">${t.save}</button>
  </form>
  <p class="muted">${t.cutoffHelp}</p>
  ${role.admin && html`<form method="post" action="${act("renew-links")}">
    <p class="muted">${t.renewLinksHelp}</p>
    <label class="check"><input type="checkbox" required> ${t.renewLinksConfirm}</label>
    <button class="secondary" type="submit">${t.renewLinks}</button>
  </form>`}
</section>

<section class="card">
  <h2>${t.participants(people.length)}</h2>
  ${chain.drawn_at && html`<p class="warning">${t.drawnWarning(chain.drawn_at)}</p>`}
  ${people.length
    ? html`<table>
      <thead><tr><th>${t.thName}</th><th>${t.thEmail}</th><th>${t.thWishes}</th><th>${t.thLink}</th><th></th></tr></thead>
      <tbody>${people.map(
        (p) => html`<tr>
          <td>${p.name}${p.self_joined === 1 && html` <span class="muted" title="${t.selfJoined}">🙋</span>`}
            <details class="edit"><summary>${t.edit}</summary>
              <form method="post" action="${act("edit", p.id)}">
                <input name="name" required maxlength="100" value="${p.name}" aria-label="${t.thName}">
                <input name="email" type="email" required value="${p.email}" aria-label="${t.thEmail}">
                <button class="small" type="submit">${t.save}</button>
              </form>
            </details></td>
          <td>${p.email}</td>
          <td>${wishes.get(p.id)?.length ?? 0}/${MAX_WISHES}
            ${(wishes.get(p.id)?.length ?? 0) > 0 && html`<details class="edit"><summary>${t.clearWishes}</summary>
              <ol class="admin-wishes">${(wishes.get(p.id) ?? []).map((w) => html`<li>${w.text || w.title}${w.url && html` <span class="muted">(${new URL(w.url).hostname})</span>`}</li>`)}</ol>
              <form method="post" action="${act("clear-wishes", p.id)}"><button class="small secondary" type="submit">${t.clearWishesConfirm}</button></form>
            </details>`}</td>
          <td><a href="${mailto(ctx, p, chain.name)}" target="_blank" rel="noopener noreferrer">${t.emailLink}</a>
            <details><summary>${t.copyLink}</summary><input readonly value="${url.origin + participantPath(p)}"></details></td>
          <td><form method="post" action="${act("remove", p.id)}"><button class="small secondary" type="submit">${t.remove}</button></form></td>
        </tr>`,
      )}</tbody></table>
      ${people.some((p) => p.self_joined === 1) && html`<p class="muted">🙋 ${t.selfJoinedHelp}</p>`}`
    : html`<p class="muted">${t.nobody}</p>`}
</section>

<section class="card">
  <h2>${t.budget}</h2>
  <p class="muted">${t.budgetHelp}</p>
  <form method="post" action="${act("budget")}" class="inline">
    <div><label for="limit">${t.budgetAmount}</label>
      <input id="limit" name="limit" type="number" min="0" step="any" inputmode="decimal" value="${chain.price_limit ?? ""}"></div>
    <div><label for="currency">${t.currency}</label>
      <select id="currency" name="currency">${CURRENCIES.map(
        (c) => html`<option${c === chain.currency && html` selected`}>${c}</option>`,
      )}</select></div>
    <button type="submit">${t.saveBudget}</button>
  </form>
  ${chain.price_limit !== null && isCurrency(chain.currency) &&
    html`<p class="budget">💰 ${budgetText(ctx, rates, chain.price_limit, chain.currency)}</p>`}
</section>

<section class="card">
  <h2>${t.addPeople}</h2>
  <form method="post" action="${act("participants")}">
    <label for="people">${t.addPeopleHelp}</label>
    <textarea id="people" name="people" rows="5" required placeholder="Rudolph, rudolph@example.org&#10;Mrs Claus &lt;mrs.claus@example.org&gt;"></textarea>
    <button type="submit">${t.addButton}</button>
  </form>
</section>

<section class="card">
  <h2>${t.drawHeading}</h2>
  ${people.length < MIN_PARTICIPANTS
    ? html`<p class="muted">${t.needAtLeast(MIN_PARTICIPANTS)}</p>`
    : joiningOpen(chain)
    ? html`<p class="muted">${t.drawAfterCutoff(formatDate(ctx, chain.joins_close_on!))}</p>`
    : html`<form method="post" action="${act("draw")}">
        <p>${t.drawHelp}</p>
        ${chain.drawn_at && html`<label class="check"><input type="checkbox" required> ${t.redrawConfirm}</label>`}
        <button type="submit">${chain.drawn_at ? t.redraw : t.draw}</button>
      </form>`}
  ${circle.length > 0 && html`<details class="spoiler"><summary>${t.showCircle}</summary>
      <ol>${circle.map((p) => html`<li>${p.name} → ${byId.get(p.giftee_id ?? "")?.name}</li>`)}</ol>
    </details>`}
</section>

${role.admin && html`<section class="card danger">
  <h2>${t.deleteHeading}</h2>
  <form method="post" action="${act("delete")}">
    <label class="check"><input type="checkbox" required> ${t.deleteConfirm(chain.name)}</label>
    <button class="secondary" type="submit">${t.deleteButton}</button>
  </form>
</section>`}`,
  );
}
