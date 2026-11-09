// A participant's private page: /p/<uuid>?key=<secret>
// its product lookup for the wish form: /p/<uuid>/preview?key=<secret>&url=<link>
// and their data as JSON (GDPR access and portability): /p/<uuid>/data?key=<secret>

import type { Env } from "./env";
import {
  MAX_WISHES,
  getChain,
  getParticipant,
  getSettings,
  getWishes,
  listParticipants,
  listWishes,
  setWishes,
  type Chain,
  type Participant,
  type Wish,
} from "./db";
import { Html, html, redirect } from "./html";
import { formatDate, type Ctx } from "./i18n";
import { imageSources } from "./images";
import { asset, errorPage, page } from "./layout";
import { budgetText, convert, getRates, isCurrency, priceText, type Rates } from "./money";
import { cachedPreview } from "./preview";
import { isFamilyFriendly } from "./safety";
import { isSameOrigin, safeEqual } from "./security";

const MAX_TEXT_LENGTH = 300;
const MAX_URL_LENGTH = 2000;
const LINK_OUT = new Html('target="_blank" rel="noopener noreferrer nofollow"');

export function participantPath(p: Pick<Participant, "id" | "access_key">): string {
  return `/p/${p.id}?key=${encodeURIComponent(p.access_key)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Looks up the participant only if the URL's key matches theirs. */
async function authorise(env: Env, id: string, url: URL): Promise<Participant | null> {
  const key = url.searchParams.get("key") ?? "";
  if (!UUID.test(id)) return null;
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

/** Everything a wish list needs: prices against the group's budget, and signed photo addresses. */
interface PriceContext {
  ctx: Ctx;
  rates: Rates;
  chain: Chain;
  img: (url: string) => string;
}

function isOverBudget({ rates, chain }: PriceContext, w: Wish): boolean {
  if (chain.price_limit === null || w.price === null) return false;
  const inBudgetCurrency = convert(w.price, w.currency, chain.currency, rates);
  return inBudgetCurrency !== null && inBudgetCurrency > chain.price_limit;
}

/**
 * A list of wish ideas; linked ones show as product cards with photo and
 * price. The person's own description comes first (it may say "something
 * like this"), then the product name looked up from the link.
 */
function renderWishes(pc: PriceContext, wishes: Wish[]): Html {
  const { ctx, rates, img } = pc;
  return html`<ol class="ideas">${wishes.map((w) => {
    if (!w.url) return html`<li>${w.text}</li>`;
    return html`<li class="product">
      ${w.image && html`<a href="${w.url}" ${LINK_OUT} tabindex="-1"><img src="${img(w.image)}" alt="" loading="lazy"></a>`}
      <div>
        <a class="product-title" href="${w.url}" ${LINK_OUT}>${w.text || w.title || hostOf(w.url)}</a>
        ${w.text && w.title && html`<div class="note muted">${w.title}</div>`}
        ${w.price !== null && html`<div class="price">${priceText(ctx, rates, w.price, w.currency)}${
          isOverBudget(pc, w) && html` <span class="over">${ctx.t.overBudget}</span>`
        }</div>`}
        <span class="shop">${hostOf(w.url)} ↗</span>
      </div>
    </li>`;
  })}</ol>`;
}

function budgetLine(pc: PriceContext): Html | false {
  const { ctx, rates, chain } = pc;
  return (
    chain.price_limit !== null &&
    isCurrency(chain.currency) &&
    html`<p class="budget">💰 ${ctx.t.budget}: <strong>${budgetText(ctx, rates, chain.price_limit, chain.currency)}</strong></p>`
  );
}

/** JSON for the wish form's live preview (public/static/wish-form.js). */
async function previewJson(ctx: Ctx, env: Env, me: Participant): Promise<Response> {
  const link = normaliseUrl(ctx.url.searchParams.get("url") ?? "");
  if (link && !(await isFamilyFriendly(new URL(link).hostname))) {
    return new Response(JSON.stringify({ blocked: true }), {
      status: 422,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
  const preview = link ? await cachedPreview(env.DB, link, me.id) : null;
  const limited = Boolean(link) && preview === null;
  const rates = preview?.price != null ? await getRates(env.DB) : null;
  const body = {
    title: preview?.title ?? "",
    image: preview?.image ? (await imageSources(env.DB, [preview.image]))(preview.image) : "",
    price: preview?.price != null && rates ? priceText(ctx, rates, preview.price, preview.currency) : "",
  };
  return new Response(JSON.stringify(body), {
    status: link === null ? 400 : limited ? 429 : 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

/** Everything stored about the participant, as a JSON download. */
async function dataExport(env: Env, me: Participant): Promise<Response> {
  const chain = (await getChain(env.DB, me.chain_id))!;
  const giftee = me.giftee_id ? await getParticipant(env.DB, me.giftee_id) : null;
  const data = {
    dataController: await getSettings(env.DB),
    group: { name: chain.name, organiser: chain.organiser, deletedAfter: chain.ends_on },
    you: { name: me.name, email: me.email, addedAt: me.created_at },
    youGiveTo: giftee?.name ?? null,
    wishes: (await getWishes(env.DB, me.id)).map(({ position, text, url, title, image, price, currency }) => ({
      position,
      text,
      url,
      productName: title,
      productImage: image,
      price,
      currency,
    })),
    note: "Who gives you a present is not included: it is the one thing kept secret from you.",
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="secret-santa-my-data.json"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function handleParticipant(
  ctx: Ctx,
  request: Request,
  env: Env,
  id: string,
  sub?: string,
): Promise<Response> {
  const { t, url } = ctx;
  // Everything below, including the product lookup and the data download,
  // needs the participant's key: keep every sub-route after this check.
  const me = await authorise(env, id, url);
  if (!me) return errorPage(ctx, 404, t.badLink);
  if (sub === "preview") return previewJson(ctx, env, me);
  if (sub === "data") return dataExport(env, me);

  if (request.method === "POST") {
    // The key in the form address already stops other sites posting here;
    // this is a second line of defence.
    if (!isSameOrigin(request)) return errorPage(ctx, 403, t.crossSite);
    const form = await request.formData().catch(() => new FormData());
    const entered: { text: string; url: string }[] = [];
    for (let i = 1; i <= MAX_WISHES; i++) {
      const text = String(form.get(`text${i}`) ?? "").trim().slice(0, MAX_TEXT_LENGTH);
      const rawUrl = String(form.get(`url${i}`) ?? "").trim();
      const link = normaliseUrl(rawUrl);
      if (link === null) return errorPage(ctx, 400, t.badUrl(rawUrl.slice(0, 100)));
      if (link && !(await isFamilyFriendly(new URL(link).hostname))) {
        return errorPage(ctx, 400, t.notFamilyFriendly(new URL(link).hostname));
      }
      if (text || link) entered.push({ text, url: link });
    }
    // Look up product details (cached for a day, so prices stay fairly
    // current); if a lookup fails, keep what an unchanged link had before.
    const previous = await getWishes(env.DB, me.id);
    const wishes = await Promise.all(
      entered.map(async (w) => {
        if (!w.url) return { ...w, title: "", image: "", price: null, currency: "" };
        const found = (await cachedPreview(env.DB, w.url, me.id)) ?? { title: "", image: "", price: null, currency: "" };
        const known = previous.find((p) => p.url === w.url);
        const { title, image, price, currency } = found.title || found.image || !known ? found : known;
        return { ...w, title, image, price, currency };
      }),
    );
    await setWishes(env.DB, me.id, wishes);
    return redirect(participantPath(me) + "&saved=1");
  }
  if (request.method !== "GET") return errorPage(ctx, 405, t.methodNotAllowed);

  const chain = (await getChain(env.DB, me.chain_id))!;
  const settings = await getSettings(env.DB);
  const everyone = await listParticipants(env.DB, me.chain_id);
  const wishes = await listWishes(env.DB, me.chain_id);
  const img = await imageSources(env.DB, [...wishes.values()].flat().map((w) => w.image));
  const pc: PriceContext = { ctx, rates: await getRates(env.DB), chain, img };
  const giftee = everyone.find((p) => p.id === me.giftee_id);
  const gifteeWishes = giftee ? (wishes.get(giftee.id) ?? []) : [];
  const myWishes = wishes.get(me.id) ?? [];

  // Reloading always shows the latest (pages are never cached), but browsers
  // inside apps such as Gmail may have no reload button. Used before the
  // draw, under the giftee's wishes and under everyone's wishes.
  const checkAgain = html`<p><a class="check-again" href="${participantPath(me)}">${t.checkAgain}</a></p>`;
  // The giftee's name and wishes stay closed on every page load, so others
  // looking at the screen (say, at the wish lists below) don't see them.
  const assignment = giftee
    ? html`<section class="card gift">
        <h2>${t.youAreSantaFor}</h2>
        <details class="reveal">
          <summary><span class="show">${t.revealGiftee}</span><span class="hide">${t.hideGiftee}</span></summary>
          <p class="giftee">🎁 ${giftee.name} 🎁</p>
          ${gifteeWishes.length
            ? html`<p>${t.theirWishes(giftee.name)}</p><div class="wishbox">${renderWishes(pc, gifteeWishes)}</div>`
            : html`<p class="muted">${t.noWishYet(giftee.name)}</p>`}
          ${checkAgain}
        </details>
        ${budgetLine(pc)}
      </section>`
    : html`<section class="card gift">
        <h2>${t.notDrawnHeading}</h2>
        <p>${t.notDrawnText}</p>
        ${checkAgain}
        ${budgetLine(pc)}
      </section>`;

  // The link comes first, so people paste a product before describing it.
  const ideaFields = Array.from({ length: MAX_WISHES }, (_, i) => {
    const n = i + 1;
    const w = myWishes[i];
    return html`<fieldset class="idea">
      <legend>${t.idea(n)}</legend>
      <label for="url${n}">${t.ideaLink}</label>
      <input id="url${n}" name="url${n}" type="url" maxlength="${MAX_URL_LENGTH}" placeholder="https://" value="${w?.url ?? ""}" data-preview-for="${n}">
      <div class="preview" id="preview${n}" aria-live="polite">${w?.url && (w.title || w.image) && html`
        ${w.image && html`<img src="${pc.img(w.image)}" alt="">`}
        <div><strong>${w.title}</strong>${w.price !== null && html`<div class="price">${priceText(ctx, pc.rates, w.price, w.currency)}</div>`}</div>`}</div>
      <label for="text${n}">${t.ideaText}</label>
      <input id="text${n}" name="text${n}" maxlength="${MAX_TEXT_LENGTH}" value="${w?.text ?? ""}" placeholder="${w?.title ?? ""}">
    </fieldset>`;
  });

  return page(
    ctx,
    me.name,
    html`<h1>${t.hello(me.name)}</h1>
<p class="lead">${t.lead(chain.name)}</p>
${url.searchParams.has("joined") && html`<section class="card joined">
  <h2>${t.joinedHeading}</h2>
  <p>${t.joinedText}</p>
  <p><a href="${`mailto:${encodeURIComponent(me.email)}?subject=${encodeURIComponent(t.mailSubject(chain.name))}&body=${
    encodeURIComponent(t.mailBody(me.name, chain.name, url.origin + participantPath(me), `${url.origin}/privacy`))}`}">✉️ ${t.joinedEmailMyself}</a></p>
  <input readonly value="${url.origin + participantPath(me)}" aria-label="${t.joinedHeading}">
</section>`}
${assignment}
<section class="card">
  <h2>${t.yourWishes}</h2>
  ${url.searchParams.has("saved") && html`<p class="notice">${t.saved}</p>`}
  <p class="muted">${t.wishesHelp}</p>
  <p class="muted">✏️ ${t.wishesLater}</p>
  <p class="policy">🎄 ${t.familyPolicy}</p>
  ${budgetLine(pc)}
  <form method="post" action="${participantPath(me)}" class="wish-form"
    data-preview="${`/p/${me.id}/preview?key=${encodeURIComponent(me.access_key)}`}"
    data-looking="${t.lookingUp}" data-none="${t.nothingFound}" data-limited="${t.tooManyLookups}"
    data-blocked="${t.blockedLink}">
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
        ${theirs.length ? renderWishes(pc, theirs) : html`<span class="muted">${t.noWishes}</span>`}</li>`;
    })}
  </ul>
  ${checkAgain}
</section>
<section class="card your-data">
  <h2>${t.yourData}</h2>
  ${settings.controllerName
    ? html`<p>${t.controller} <strong>${settings.controllerName}</strong>${settings.controllerContact && ` (${settings.controllerContact})`}</p>`
    : html`<p class="muted">${t.controllerNotSet}</p>`}
  ${chain.organiser && html`<p>${t.groupOrganiser} <strong>${chain.organiser}</strong></p>`}
  ${chain.ends_on && html`<p>${t.deletedOn(formatDate(ctx, chain.ends_on))}</p>`}
  <p>${t.yourDataHelp}</p>
  <p><a href="${`/p/${me.id}/data?key=${encodeURIComponent(me.access_key)}`}" download>⬇️ ${t.downloadData}</a> · <a href="/privacy">${t.privacyLink}</a></p>
</section>
<script src="${asset("/static/wish-form.js")}" defer></script>`,
  );
}
