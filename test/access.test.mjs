// Access-control regression tests, run against a local dev server:
//   npm run dev            (in one terminal)
//   npm test               (in another)
// They create a temporary group, check that participant pages, the product
// lookup and the data download refuse every request without the right key,
// and that admin pages need the password, then delete the group again.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";

const BASE = process.env.BASE_URL ?? "http://localhost:8787";
const password =
  process.env.ADMIN_PASSWORD ?? readFileSync(".dev.vars", "utf8").match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
const admin = { Authorization: `Basic ${btoa(`admin:${password}`)}`, Origin: BASE };
const form = (data) => ({ "Content-Type": "application/x-www-form-urlencoded", ...data });

/**
 * fetch, but when a web server's rate limit (not the app) answers 429, wait
 * and try again: through nginx these tests must still see the app's answer.
 * The app's own 429 (admin login throttling) is returned as it is.
 */
async function fetchPatiently(url, init) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= 40) return res;
    if ((await res.clone().text()).includes("Too many failed logins")) return res;
    await new Promise((resolve) => setTimeout(resolve, 3100));
  }
}

let group; // /admin/chains/<id>
let people; // [{ id, key }]
let organiser; // { id, key }
let join; // { id, key }

async function adminPost(path, body) {
  return fetchPatiently(BASE + path, { method: "POST", headers: form(admin), body, redirect: "manual" });
}

before(async () => {
  const created = await adminPost("/admin", "name=Access+test+(temporary)");
  group = new URL(created.headers.get("Location"), BASE).pathname;
  await adminPost(`${group}/participants`, "people=" + encodeURIComponent("A, a@test.invalid\nB, b@test.invalid\nC, c@test.invalid"));
  await adminPost(`${group}/draw`, "x=1");
  const html = await (await fetchPatiently(BASE + group, { headers: admin })).text();
  people = [...html.matchAll(/\/p\/([0-9a-f-]{36})\?key=([A-Za-z0-9_-]+)/g)]
    .map((m) => ({ id: m[1], key: m[2] }))
    .filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
  assert.equal(people.length, 3, "expected three private links on the admin page");
  const link = (kind) => {
    const m = html.match(new RegExp(`/${kind}/([0-9a-f-]{36})\\?key=([A-Za-z0-9_-]+)`));
    return m && { id: m[1], key: m[2] };
  };
  organiser = link("o");
  join = link("j");
  assert.ok(organiser && join, "expected the organiser and join links on the admin page");
});

after(async () => {
  if (group) await adminPost(`${group}/delete`, "x=1");
});

const status = async (path, init) => (await fetchPatiently(BASE + path, { redirect: "manual", ...init })).status;
const probe = "url=" + encodeURIComponent("https://example.org/access-test");

test("the right key opens the page, the lookup and the data download", async () => {
  const [a] = people;
  assert.equal(await status(`/p/${a.id}?key=${a.key}`), 200);
  assert.equal(await status(`/p/${a.id}/preview?key=${a.key}&url=`), 200); // empty URL: no outgoing fetch
  assert.equal(await status(`/p/${a.id}/data?key=${a.key}`), 200);
});

for (const sub of ["", "/preview", "/data"]) {
  test(`/p/<id>${sub} refuses requests without the right key`, async () => {
    const [a, b] = people;
    const sep = sub === "/preview" ? `&${probe}` : "";
    const refused = [
      `/p/${a.id}${sub}?${probe}`, // no key
      `/p/${a.id}${sub}?key=${sep}`, // empty key
      `/p/${a.id}${sub}?key=${"A".repeat(32)}${sep}`, // wrong key
      `/p/${a.id}${sub}?key=${b.key}${sep}`, // someone else's key
      `/p/${a.id}${sub}?key=${a.key.slice(0, 16)}${sep}`, // part of the key
      `/p/${a.id}${sub}?key=${a.key}x${sep}`, // key plus junk
      `/p/${a.id}${sub}?key=${a.key.toUpperCase()}${sep}`, // wrong case
      `/p/00000000-0000-4000-8000-000000000000${sub}?key=${a.key}${sep}`, // unknown id
      `/p/not-a-uuid${sub}?key=${a.key}${sep}`,
    ];
    for (const path of refused) assert.equal(await status(path), 404, path);
    // The key only counts in the URL, not in a cookie, header or form body.
    assert.equal(await status(`/p/${a.id}${sub}?${probe}`, { headers: { Cookie: `key=${a.key}`, "X-Key": a.key } }), 404);
    assert.equal(await status(`/p/${a.id}${sub}?${probe}`, { method: "POST", headers: form({}), body: `key=${a.key}` }), 404);
  });
}

test("saving wishes (which triggers lookups) needs the key", async () => {
  const [a] = people;
  const body = "url1=" + encodeURIComponent("https://example.org/access-test");
  assert.equal(await status(`/p/${a.id}`, { method: "POST", headers: form({ Origin: BASE }), body }), 404);
});

test("admin pages need the password", async () => {
  for (const path of ["/admin", group, "/admin/settings"]) assert.equal(await status(path), 401, path);
  for (const action of ["draw", "delete", "participants", "budget", "privacy", "joining", "renew-links"]) {
    assert.equal(await status(`${group}/${action}`, { method: "POST", headers: form({ Origin: BASE }), body: "x=1" }), 401, action);
  }
});

test("the organiser's page needs its key, and can't do admin-only actions", async () => {
  const { id, key } = organiser;
  const post = (path) => status(path, { method: "POST", headers: form({ Origin: BASE }), body: "x=1" });
  assert.equal(await status(`/o/${id}?key=${key}`), 200);
  for (const path of [
    `/o/${id}`,
    `/o/${id}?key=`,
    `/o/${id}?key=${join.key}`, // the join link's key
    `/o/${id}?key=${people[0].key}`, // a participant's key
    `/o/${id}?key=${key.slice(0, 16)}`,
    `/o/00000000-0000-4000-8000-000000000000?key=${key}`,
    `/o/not-a-uuid?key=${key}`,
  ]) {
    assert.equal(await status(path), 404, path);
  }
  for (const action of ["draw", "participants", "remove", "joining"]) {
    assert.equal(await post(`/o/${id}/${action}`), 404, action);
  }
  for (const action of ["delete", "privacy", "renew-links"]) {
    assert.equal(await post(`/o/${id}/${action}?key=${key}`), 404, action);
  }
  assert.equal(
    await status(`/o/${id}/joining?key=${key}`, { method: "POST", headers: form({ Origin: "https://evil.example" }), body: "x=1" }),
    403,
  );
});

test("the join link needs its key, is closed after the draw and never hands out an existing link", async () => {
  const { id, key } = join;
  for (const path of [`/j/${id}`, `/j/${id}?key=${organiser.key}`, `/j/${id}?key=${key}x`, `/j/not-a-uuid?key=${key}`]) {
    assert.equal(await status(path), 404, path);
  }
  const tryJoin = (email) =>
    fetchPatiently(`${BASE}/j/${id}?key=${key}`, {
      method: "POST",
      headers: form({ Origin: BASE }),
      body: `name=Z&email=${encodeURIComponent(email)}`,
      redirect: "manual",
    });
  // Today is always an allowed cut-off (at the latest 24 December and the group's end date), and joining stays open all day.
  const today = new Date().toISOString().slice(0, 10);
  // The group has been drawn: joining is closed, even with a cut-off date set.
  assert.equal((await adminPost(`${group}/joining`, `joins_close_on=${today}`)).status, 303);
  assert.equal((await tryJoin("z@test.invalid")).status, 200);
  assert.doesNotMatch(await (await fetchPatiently(BASE + group, { headers: admin })).text(), /z@test\.invalid/);
  // Before a draw, someone already listed gets a warning, not a link.
  const created = await adminPost("/admin", "name=Join+test+(temporary)");
  const other = new URL(created.headers.get("Location"), BASE).pathname;
  try {
    await adminPost(`${other}/participants`, "people=" + encodeURIComponent("A, a@test.invalid"));
    assert.equal((await adminPost(`${other}/joining`, `joins_close_on=${today}`)).status, 303);
    // No cut-off after Christmas Eve, and no draw until joining has closed.
    const christmas = Number(today.slice(0, 4)) + (today.slice(5) > "12-24" ? 1 : 0);
    assert.equal((await adminPost(`${other}/joining`, `joins_close_on=${christmas}-12-25`)).status, 400);
    await adminPost(`${other}/participants`, "people=" + encodeURIComponent("B, b@test.invalid\nC, c@test.invalid"));
    assert.equal((await adminPost(`${other}/draw`, "x=1")).status, 400);
    const page = await (await fetchPatiently(BASE + other, { headers: admin })).text();
    const [, otherId, otherKey] = page.match(/\/j\/([0-9a-f-]{36})\?key=([A-Za-z0-9_-]+)/);
    const res = await fetchPatiently(`${BASE}/j/${otherId}?key=${otherKey}`, {
      method: "POST",
      headers: form({ Origin: BASE }),
      body: "name=Anyone&email=A%40test.invalid",
      redirect: "manual",
    });
    assert.equal(res.status, 409);
    assert.doesNotMatch(await res.text(), /\/p\/[0-9a-f-]{36}\?key=/);
  } finally {
    await adminPost(`${other}/delete`, "x=1");
  }
});

test("links to sites that aren't family-friendly are refused (needs network)", async () => {
  const [a] = people;
  const adult = encodeURIComponent("https://www.pornhub.com/");
  const lookup = await fetchPatiently(`${BASE}/p/${a.id}/preview?key=${a.key}&url=${adult}`);
  assert.equal(lookup.status, 422);
  assert.deepEqual(await lookup.json(), { blocked: true });
  const save = await fetchPatiently(`${BASE}/p/${a.id}?key=${a.key}`, {
    method: "POST",
    headers: form({ Origin: BASE }),
    body: `url1=${adult}`,
    redirect: "manual",
  });
  assert.equal(save.status, 400);
});

test("language and currency links only redirect within the site", async () => {
  const location = async (back) =>
    (await fetch(`${BASE}/lang/en?back=${encodeURIComponent(back)}`, { redirect: "manual" })).headers.get("Location");
  for (const evil of ["//evil.example/x", "/\t/evil.example/x", "/\\evil.example/x", "https://evil.example/x", "/\n/evil.example"]) {
    assert.ok((await location(evil)).startsWith("/") && !(await location(evil)).startsWith("//"), JSON.stringify(evil));
    assert.ok(!new URL(await location(evil), BASE).host.includes("evil"), JSON.stringify(evil));
  }
  assert.equal(await location("/p/x?key=y"), "/p/x?key=y");
});

test("the photo proxy only serves addresses the app signed", async () => {
  const [a] = people;
  const html = await (await fetchPatiently(`${BASE}/p/${a.id}?key=${a.key}`)).text();
  const src = html.match(/\/img\?u=[^"]+/)?.[0]?.replaceAll("&amp;", "&");
  if (src) {
    const unsigned = src.replace(/&s=[^&]+/, "");
    const tampered = src.replace(/&s=(.)/, (_, c) => `&s=${c === "A" ? "B" : "A"}`);
    assert.equal(await status(unsigned), 404);
    assert.equal(await status(tampered), 404);
  }
  assert.equal(await status(`/img?u=${encodeURIComponent("https://example.org/guess.jpg")}&s=AAAAAAAAAAAAAAAAAAAAAA`), 404);
});
