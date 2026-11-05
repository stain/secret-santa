// A participant's private page: /p/<uuid>?key=<secret>

import {
  MAX_WISHES,
  getChain,
  getParticipant,
  getWishes,
  listParticipants,
  listWishes,
  setWishes,
  type Participant,
  type Wish,
} from "./db";
import { Html, html, redirect } from "./html";
import type { Ctx } from "./i18n";
import { errorPage, page } from "./layout";
import { fetchPreview } from "./preview";
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

/** A list of wish ideas; linked ones show as product cards with name and photo. */
function renderWishes(wishes: Wish[]): Html {
  const out = 'target="_blank" rel="noopener noreferrer nofollow"';
  return html`<ol class="ideas">${wishes.map((w) => {
    if (!w.url) return html`<li>${w.text}</li>`;
    return html`<li class="product">
      ${w.image && html`<a href="${w.url}" ${new Html(out)} tabindex="-1"><img src="${w.image}" alt="" loading="lazy" referrerpolicy="no-referrer"></a>`}
      <div>
        <a class="product-title" href="${w.url}" ${new Html(out)}>${w.title || w.text || hostOf(w.url)}</a>
        ${w.title && w.text && html`<div class="note">${w.text}</div>`}
        <span class="shop">${hostOf(w.url)} ↗</span>
      </div>
    </li>`;
  })}</ol>`;
}

export async function handleParticipant(ctx: Ctx, request: Request, env: Env, id: string): Promise<Response> {
  const { t, url } = ctx;
  const me = await authorise(env, id, url);
  if (!me) return errorPage(ctx, 404, t.badLink);

  if (request.method === "POST") {
    const form = await request.formData().catch(() => new FormData());
    const entered: { text: string; url: string }[] = [];
    for (let i = 1; i <= MAX_WISHES; i++) {
      const text = String(form.get(`text${i}`) ?? "").trim().slice(0, MAX_TEXT_LENGTH);
      const rawUrl = String(form.get(`url${i}`) ?? "").trim();
      const link = normaliseUrl(rawUrl);
      if (link === null) return errorPage(ctx, 400, t.badUrl(rawUrl.slice(0, 100)));
      if (text || link) entered.push({ text, url: link });
    }
    // Look up product details for new or changed links; keep earlier lookups
    // of unchanged links, unless they found nothing last time.
    const previous = await getWishes(env.DB, me.id);
    const wishes = await Promise.all(
      entered.map(async (w) => {
        if (!w.url) return { ...w, title: "", image: "" };
        const known = previous.find((p) => p.url === w.url && (p.title || p.image));
        return { ...w, ...(known ? { title: known.title, image: known.image } : await fetchPreview(w.url)) };
      }),
    );
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
      ${w?.title && html`<p class="found">${t.foundPreview} ${w.title}</p>`}
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
