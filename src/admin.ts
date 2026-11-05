// Admin pages under /admin, protected by Basic auth (see security.ts).

import {
  MIN_PARTICIPANTS,
  addParticipants,
  createChain,
  deleteChain,
  drawChain,
  getChain,
  listChains,
  listParticipants,
  removeParticipant,
  type Participant,
} from "./db";
import { errorPage, html, page, redirect } from "./html";
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

function mailto(p: Participant, chainName: string, origin: string): string {
  const link = origin + participantPath(p);
  const subject = `Your Secret Santa link: ${chainName}`;
  const body =
    `Hi ${p.name},\n\nHere is your private Secret Santa page for "${chainName}". ` +
    `Open it to see whom you give a present to and to add your own wish:\n\n${link}\n\n` +
    `Don't share this link: anyone with it can see your page.\n\nHo ho ho!`;
  return `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function handleAdmin(request: Request, env: Env, path: string[]): Promise<Response> {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  const post = request.method === "POST";
  if (post && !isSameOrigin(request)) return errorPage(403, "Cross-site request refused.");
  const form = post ? await request.formData().catch(() => new FormData()) : null;
  const field = (name: string) => String(form?.get(name) ?? "").trim();

  // /admin
  if (path.length === 0) {
    if (post) {
      const name = field("name").slice(0, 100);
      if (!name) return errorPage(400, "Please give the group a name.");
      return redirect(`/admin/chains/${await createChain(env.DB, name)}`);
    }
    return adminHome(env);
  }

  // /admin/chains/<id>[/action[/<participant id>]]
  if (path[0] !== "chains" || !path[1]) return errorPage(404, "Page not found.");
  const chain = await getChain(env.DB, path[1]);
  if (!chain) return errorPage(404, "That group doesn't exist.");
  const back = `/admin/chains/${chain.id}`;
  const action = path[2];

  if (!post) {
    if (action) return errorPage(405, "Method not allowed.");
    return chainPage(request, env, chain.id);
  }
  switch (action) {
    case "participants": {
      const { people, bad } = parsePeople(field("people"));
      if (bad.length) {
        return errorPage(400, `These lines need a name and an email address: ${bad.join(" | ")}`);
      }
      const added = await addParticipants(env.DB, chain.id, people);
      return redirect(`${back}?added=${added}&skipped=${people.length - added}`);
    }
    case "remove":
      await removeParticipant(env.DB, chain.id, path[3] ?? "");
      return redirect(back);
    case "draw":
      try {
        await drawChain(env.DB, chain.id);
      } catch (e) {
        return errorPage(400, (e as Error).message);
      }
      return redirect(`${back}?drawn=1`);
    case "delete":
      await deleteChain(env.DB, chain.id);
      return redirect("/admin");
  }
  return errorPage(404, "Page not found.");
}

async function adminHome(env: Env): Promise<Response> {
  const chains = await listChains(env.DB);
  return page(
    "Admin",
    html`<h1>Santa's workshop</h1>
<section class="card">
  <h2>Groups</h2>
  ${chains.length
    ? html`<ul class="chains">${chains.map(
        (c) => html`<li><a href="/admin/chains/${c.id}">${c.name}</a>
          <span class="muted">${c.participant_count} people · ${c.drawn_at ? "drawn" : "not drawn yet"}</span></li>`,
      )}</ul>`
    : html`<p class="muted">No groups yet.</p>`}
</section>
<section class="card">
  <h2>New group</h2>
  <form method="post" action="/admin">
    <label for="name">Group name</label>
    <input id="name" name="name" required maxlength="100" placeholder="Office party 2026">
    <button type="submit">Create group</button>
  </form>
</section>`,
  );
}

async function chainPage(request: Request, env: Env, chainId: string): Promise<Response> {
  const url = new URL(request.url);
  const chain = (await getChain(env.DB, chainId))!;
  const people = await listParticipants(env.DB, chainId);
  const byId = new Map(people.map((p) => [p.id, p]));
  const base = `/admin/chains/${chain.id}`;
  const added = url.searchParams.get("added");
  const skipped = Number(url.searchParams.get("skipped") ?? 0);

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
    chain.name,
    html`<p><a href="/admin">← All groups</a></p>
<h1>${chain.name}</h1>
${added !== null && html`<p class="notice">Added ${added} ${added === "1" ? "person" : "people"}${skipped > 0 && html`; skipped ${skipped} already in the group`}.</p>`}
${url.searchParams.has("drawn") && html`<p class="notice">🎲 The names have been drawn!</p>`}

<section class="card">
  <h2>Participants (${people.length})</h2>
  ${chain.drawn_at && html`<p class="warning">Drawn on ${chain.drawn_at} UTC. Adding or removing someone cancels the draw, and you will need to draw and send the links again.</p>`}
  ${people.length
    ? html`<table>
      <thead><tr><th>Name</th><th>Email</th><th>Wish</th><th>Private link</th><th></th></tr></thead>
      <tbody>${people.map(
        (p) => html`<tr>
          <td>${p.name}</td>
          <td>${p.email}</td>
          <td>${p.wish ? "✅" : "—"}</td>
          <td><a href="${mailto(p, chain.name, url.origin)}">✉️ Email link</a>
            <details><summary>Copy link</summary><input readonly value="${url.origin + participantPath(p)}"></details></td>
          <td><form method="post" action="${base}/remove/${p.id}"><button class="small secondary" type="submit">Remove</button></form></td>
        </tr>`,
      )}</tbody></table>`
    : html`<p class="muted">Nobody yet. Add people below.</p>`}
</section>

<section class="card">
  <h2>Add people</h2>
  <form method="post" action="${base}/participants">
    <label for="people">One person per line, as <code>Name, email</code> or <code>Name &lt;email&gt;</code></label>
    <textarea id="people" name="people" rows="5" required placeholder="Rudolph, rudolph@example.org&#10;Mrs Claus &lt;mrs.claus@example.org&gt;"></textarea>
    <button type="submit">Add to the list</button>
  </form>
</section>

<section class="card">
  <h2>Draw names</h2>
  ${people.length < MIN_PARTICIPANTS
    ? html`<p class="muted">You need at least ${MIN_PARTICIPANTS} people to draw.</p>`
    : html`<form method="post" action="${base}/draw">
        <p>Shuffles everyone into one circle: each person gives to the next, and the last gives to the first.</p>
        ${chain.drawn_at && html`<label class="check"><input type="checkbox" required> Yes, redraw: everyone's assignment will change</label>`}
        <button type="submit">${chain.drawn_at ? "Redraw names" : "Draw names"}</button>
      </form>`}
  ${circle.length > 0 && html`<details class="spoiler"><summary>Show the circle (spoilers!)</summary>
      <ol>${circle.map((p) => html`<li>${p.name} → ${byId.get(p.giftee_id ?? "")?.name}</li>`)}</ol>
    </details>`}
</section>

<section class="card danger">
  <h2>Delete group</h2>
  <form method="post" action="${base}/delete">
    <label class="check"><input type="checkbox" required> Delete "${chain.name}", its participants and their wishes</label>
    <button class="secondary" type="submit">Delete group</button>
  </form>
</section>`,
  );
}
