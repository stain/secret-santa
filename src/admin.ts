// Admin pages under /admin, protected by Basic auth (see security.ts).

import {
  MAX_WISHES,
  MIN_PARTICIPANTS,
  addParticipants,
  createChain,
  deleteChain,
  drawChain,
  getChain,
  listChains,
  listParticipants,
  listWishes,
  removeParticipant,
  setBudget,
  type Participant,
} from "./db";
import { html, redirect } from "./html";
import type { Ctx } from "./i18n";
import { errorPage, page } from "./layout";
import { CURRENCIES, budgetText, getRates, isCurrency } from "./money";
import { participantPath } from "./participant";
import { isSameOrigin, requireAdmin } from "./security";

const EMAIL = /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/;

/** Parses one person per line: "Name, email" or "Name <email>". */
export function parsePeople(text: string) {
  const people: { name: string; email: string }[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
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
    `&body=${encodeURIComponent(ctx.t.mailBody(p.name, chainName, link))}`
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

  // /admin/chains/<id>[/action[/<participant id>]]
  if (path[0] !== "chains" || !path[1]) return errorPage(ctx, 404, t.notFound);
  const chain = await getChain(env.DB, path[1]);
  if (!chain) return errorPage(ctx, 404, t.groupMissing);
  const back = `/admin/chains/${chain.id}`;
  const action = path[2];

  if (!post) {
    if (action) return errorPage(ctx, 405, t.methodNotAllowed);
    return chainPage(ctx, env, chain.id);
  }
  switch (action) {
    case "participants": {
      const { people, bad } = parsePeople(field("people"));
      if (bad.length) return errorPage(ctx, 400, t.badLines(bad.join(" | ")));
      const added = await addParticipants(env.DB, chain.id, people);
      return redirect(`${back}?added=${added}&skipped=${people.length - added}`);
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
    case "remove":
      await removeParticipant(env.DB, chain.id, path[3] ?? "");
      return redirect(back);
    case "draw":
      try {
        await drawChain(env.DB, chain.id);
      } catch {
        return errorPage(ctx, 400, t.needAtLeast(MIN_PARTICIPANTS));
      }
      return redirect(`${back}?drawn=1`);
    case "delete":
      await deleteChain(env.DB, chain.id);
      return redirect("/admin");
  }
  return errorPage(ctx, 404, t.notFound);
}

async function adminHome(ctx: Ctx, env: Env): Promise<Response> {
  const { t } = ctx;
  const chains = await listChains(env.DB);
  return page(
    ctx,
    t.adminTitle,
    html`<h1>${t.workshop}</h1>
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

async function chainPage(ctx: Ctx, env: Env, chainId: string): Promise<Response> {
  const { t, url } = ctx;
  const chain = (await getChain(env.DB, chainId))!;
  const people = await listParticipants(env.DB, chainId);
  const wishes = await listWishes(env.DB, chainId);
  const rates = await getRates(env.DB);
  const byId = new Map(people.map((p) => [p.id, p]));
  const base = `/admin/chains/${chain.id}`;
  const added = url.searchParams.get("added");

  // Walk the circle from the first person so the admin can check it is unbroken.
  const circle: Participant[] = [];
  if (chain.drawn_at && people.length) {
    let p: Participant | undefined = people[0];
    do {
      circle.push(p);
      p = byId.get(p.giftee_id ?? "");
    } while (p && p !== people[0] && circle.length <= people.length);
  }

  return page(
    ctx,
    chain.name,
    html`<p><a href="/admin">${t.allGroups}</a></p>
<h1>${chain.name}</h1>
${added !== null && html`<p class="notice">${t.added(Number(added), Number(url.searchParams.get("skipped") ?? 0))}</p>`}
${url.searchParams.has("drawn") && html`<p class="notice">${t.namesDrawn}</p>`}

<section class="card">
  <h2>${t.participants(people.length)}</h2>
  ${chain.drawn_at && html`<p class="warning">${t.drawnWarning(chain.drawn_at)}</p>`}
  ${people.length
    ? html`<table>
      <thead><tr><th>${t.thName}</th><th>${t.thEmail}</th><th>${t.thWishes}</th><th>${t.thLink}</th><th></th></tr></thead>
      <tbody>${people.map(
        (p) => html`<tr>
          <td>${p.name}</td>
          <td>${p.email}</td>
          <td>${wishes.get(p.id)?.length ?? 0}/${MAX_WISHES}</td>
          <td><a href="${mailto(ctx, p, chain.name)}">${t.emailLink}</a>
            <details><summary>${t.copyLink}</summary><input readonly value="${url.origin + participantPath(p)}"></details></td>
          <td><form method="post" action="${base}/remove/${p.id}"><button class="small secondary" type="submit">${t.remove}</button></form></td>
        </tr>`,
      )}</tbody></table>`
    : html`<p class="muted">${t.nobody}</p>`}
</section>

<section class="card">
  <h2>${t.budget}</h2>
  <p class="muted">${t.budgetHelp}</p>
  <form method="post" action="${base}/budget" class="inline">
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
  <form method="post" action="${base}/participants">
    <label for="people">${t.addPeopleHelp}</label>
    <textarea id="people" name="people" rows="5" required placeholder="Rudolph, rudolph@example.org&#10;Mrs Claus &lt;mrs.claus@example.org&gt;"></textarea>
    <button type="submit">${t.addButton}</button>
  </form>
</section>

<section class="card">
  <h2>${t.drawHeading}</h2>
  ${people.length < MIN_PARTICIPANTS
    ? html`<p class="muted">${t.needAtLeast(MIN_PARTICIPANTS)}</p>`
    : html`<form method="post" action="${base}/draw">
        <p>${t.drawHelp}</p>
        ${chain.drawn_at && html`<label class="check"><input type="checkbox" required> ${t.redrawConfirm}</label>`}
        <button type="submit">${chain.drawn_at ? t.redraw : t.draw}</button>
      </form>`}
  ${circle.length > 0 && html`<details class="spoiler"><summary>${t.showCircle}</summary>
      <ol>${circle.map((p) => html`<li>${p.name} → ${byId.get(p.giftee_id ?? "")?.name}</li>`)}</ol>
    </details>`}
</section>

<section class="card danger">
  <h2>${t.deleteHeading}</h2>
  <form method="post" action="${base}/delete">
    <label class="check"><input type="checkbox" required> ${t.deleteConfirm(chain.name)}</label>
    <button class="secondary" type="submit">${t.deleteButton}</button>
  </form>
</section>`,
  );
}
