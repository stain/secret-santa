// A participant's private page: /p/<uuid>?key=<secret>

import {
  MAX_WISHES,
  getChain,
  getParticipant,
  listParticipants,
  listWishes,
  setWishes,
  type Participant,
  type Wish,
} from "./db";
import { html, redirect, type Html } from "./html";
import type { Ctx } from "./i18n";
import { errorPage, page } from "./layout";
import { safeEqual } from "./security";

const MAX_TEXT_LENGTH = 300;
const MAX_URL_LENGTH = 2000;

export function participantPath(p: Pick<Participant, "id" | "access_key">): string {
  return `/p/${p.id}?key=${encodeURIComponent(p.access_key)}`;
}

/** Looks up the participant only if the URL's key matches theirs. */
async function authorise(env: Env, id: string, url: URL): Promise<Participant | null> {
  const key = url.searchParams.get("key") ?? "";
  const p = await getParticipant(env.DB, id);
  // Same answer for an unknown id and a wrong key, so neither can be probed.
  if (!p || !key || !(await safeEqual(key, p.access_key))) return null;
  return p;
}

/** Accepts only http(s) links, so a wish can't carry a javascript: URL. */
function normaliseUrl(raw: string): string | null {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return (url.protocol === "https:" || url.protocol === "http:") && raw.length <= MAX_URL_LENGTH
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

/** A list of wish ideas, each linking out to its shop page if it has one. */
function renderWishes(wishes: Wish[]): Html {
  return html`<ol class="ideas">${wishes.map(
    (w) => html`<li>${w.text}${w.url &&
      html` <a class="shop" href="${w.url}" target="_blank" rel="noopener noreferrer nofollow">${hostOf(w.url)} ↗</a>`}</li>`,
  )}</ol>`;
}

export async function handleParticipant(ctx: Ctx, request: Request, env: Env, id: string): Promise<Response> {
  const { t, url } = ctx;
  const me = await authorise(env, id, url);
  if (!me) return errorPage(ctx, 404, t.badLink);

  if (request.method === "POST") {
    const form = await request.formData().catch(() => new FormData());
    const wishes: Omit<Wish, "position">[] = [];
    for (let i = 1; i <= MAX_WISHES; i++) {
      const text = String(form.get(`text${i}`) ?? "").trim().slice(0, MAX_TEXT_LENGTH);
      const rawUrl = String(form.get(`url${i}`) ?? "").trim();
      const link = normaliseUrl(rawUrl);
      if (link === null) return errorPage(ctx, 400, t.badUrl(rawUrl.slice(0, 100)));
      if (text || link) wishes.push({ text, url: link });
    }
    await setWishes(env.DB, me.id, wishes);
    return redirect(participantPath(me) + "&saved=1");
  }
  if (request.method !== "GET") return errorPage(ctx, 405, t.methodNotAllowed);

  const chain = await getChain(env.DB, me.chain_id);
  const everyone = await listParticipants(env.DB, me.chain_id);
  const wishes = await listWishes(env.DB, me.chain_id);
  const giftee = everyone.find((p) => p.id === me.giftee_id);
  const gifteeWishes = giftee ? (wishes.get(giftee.id) ?? []) : [];
  const myWishes = wishes.get(me.id) ?? [];

  const assignment = giftee
    ? html`<section class="card gift">
        <h2>${t.youAreSantaFor}</h2>
        <p class="giftee">🎁 ${giftee.name} 🎁</p>
        ${gifteeWishes.length
          ? html`<p>${t.theirWishes(giftee.name)}</p><div class="wishbox">${renderWishes(gifteeWishes)}</div>`
          : html`<p class="muted">${t.noWishYet(giftee.name)}</p>`}
      </section>`
    : html`<section class="card gift">
        <h2>${t.notDrawnHeading}</h2>
        <p>${t.notDrawnText}</p>
      </section>`;

  const ideaFields = Array.from({ length: MAX_WISHES }, (_, i) => {
    const n = i + 1;
    const w = myWishes[i];
    return html`<fieldset class="idea">
      <legend>${t.idea(n)}</legend>
      <label for="text${n}">${t.ideaText}</label>
      <input id="text${n}" name="text${n}" maxlength="${MAX_TEXT_LENGTH}" value="${w?.text ?? ""}">
      <label for="url${n}">${t.ideaLink}</label>
      <input id="url${n}" name="url${n}" type="url" maxlength="${MAX_URL_LENGTH}" placeholder="https://" value="${w?.url ?? ""}">
    </fieldset>`;
  });

  return page(
    ctx,
    me.name,
    html`<h1>${t.hello(me.name)}</h1>
<p class="lead">${t.lead(chain?.name ?? "")}</p>
${assignment}
<section class="card">
  <h2>${t.yourWishes}</h2>
  ${url.searchParams.has("saved") && html`<p class="notice">${t.saved}</p>`}
  <p class="muted">${t.wishesHelp}</p>
  <form method="post" action="${participantPath(me)}">
    ${ideaFields}
    <button type="submit">${t.saveWishes}</button>
  </form>
</section>
<section class="card">
  <h2>${t.everyonesWishes}</h2>
  <ul class="wishes">
    ${everyone.map((p) => {
      const theirs = wishes.get(p.id) ?? [];
      return html`<li><span class="who">${p.name}${p.id === me.id && ` ${t.you}`}</span>
        ${theirs.length ? renderWishes(theirs) : html`<span class="muted">${t.noWishes}</span>`}</li>`;
    })}
  </ul>
</section>`,
  );
}
