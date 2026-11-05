// A participant's private page: /p/<uuid>?key=<secret>

import { getChain, getParticipant, listParticipants, setWish, type Participant } from "./db";
import { errorPage, html, page, redirect } from "./html";
import { safeEqual } from "./security";

export const MAX_WISH_LENGTH = 1000;

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

export async function handleParticipant(request: Request, env: Env, id: string): Promise<Response> {
  const url = new URL(request.url);
  const me = await authorise(env, id, url);
  if (!me) return errorPage(404, "This link isn't valid. Check you copied the whole link from your email.");

  if (request.method === "POST") {
    const form = await request.formData().catch(() => new FormData());
    const wish = String(form.get("wish") ?? "").trim().slice(0, MAX_WISH_LENGTH);
    await setWish(env.DB, me.id, wish);
    return redirect(participantPath(me) + "&saved=1");
  }
  if (request.method !== "GET") return errorPage(405, "Method not allowed.");

  const chain = await getChain(env.DB, me.chain_id);
  const everyone = await listParticipants(env.DB, me.chain_id);
  const giftee = everyone.find((p) => p.id === me.giftee_id);

  const assignment = giftee
    ? html`<section class="card gift">
        <h2>You are Secret Santa for…</h2>
        <p class="giftee">🎁 ${giftee.name} 🎁</p>
        ${giftee.wish
          ? html`<p>Their wish:</p><blockquote>${giftee.wish}</blockquote>`
          : html`<p class="muted">${giftee.name} hasn't written a wish yet. Check back later!</p>`}
      </section>`
    : html`<section class="card gift">
        <h2>The draw hasn't happened yet</h2>
        <p>Santa's elves are still shuffling the names. Come back to this page later to find out whom you give a present to.</p>
      </section>`;

  return page(
    me.name,
    html`<h1>Hello, ${me.name}!</h1>
<p class="lead">Welcome to <strong>${chain?.name}</strong>. Keep this page's link to yourself: it is your private key.</p>
${assignment}
<section class="card">
  <h2>Your wish</h2>
  ${url.searchParams.has("saved") && html`<p class="notice">✨ Your wish has been saved.</p>`}
  <form method="post" action="${participantPath(me)}">
    <label for="wish">What would you like to receive?</label>
    <textarea id="wish" name="wish" rows="4" maxlength="${MAX_WISH_LENGTH}">${me.wish}</textarea>
    <button type="submit">Send to the North Pole</button>
  </form>
</section>
<section class="card">
  <h2>Everyone's wishes</h2>
  <ul class="wishes">
    ${everyone.map(
      (p) => html`<li><span class="who">${p.name}${p.id === me.id && " (you)"}</span>
        ${p.wish ? html`<span class="what">${p.wish}</span>` : html`<span class="what muted">No wish yet</span>`}</li>`,
    )}
  </ul>
</section>`,
  );
}
