// All D1 access lives here so the SQL stays in one place.

import type { Database, Statement } from "./sqlite";
import { newAccessKey, shuffle } from "./security";

export interface Chain {
  id: string;
  name: string;
  created_at: string;
  drawn_at: string | null;
  price_limit: number | null; // suggested budget, not enforced
  currency: string;
  organiser: string; // name and contact of whoever is responsible for the data
  ends_on: string | null; // YYYY-MM-DD; all data is deleted within two days after (UTC)
}

export interface Participant {
  id: string;
  chain_id: string;
  name: string;
  email: string;
  access_key: string;
  giftee_id: string | null;
  created_at: string;
}

export interface Wish {
  position: number;
  text: string;
  url: string;
  title: string; // looked up from url, see preview.ts
  image: string;
  price: number | null;
  currency: string;
}

/** Site-wide settings, set on the admin home page. */
export interface Settings {
  controllerName: string; // data controller named in the privacy notice (GDPR)
  controllerContact: string;
}

export const MIN_PARTICIPANTS = 3;
export const MAX_WISHES = 3;

export async function getSettings(db: Database): Promise<Settings> {
  const { results } = await db.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  const get = (key: string) => results.find((r) => r.key === key)?.value ?? "";
  return { controllerName: get("controller_name"), controllerContact: get("controller_contact") };
}

export async function setSettings(db: Database, s: Settings): Promise<void> {
  const upsert = "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value";
  await db.batch([
    db.prepare(upsert).bind("controller_name", s.controllerName),
    db.prepare(upsert).bind("controller_contact", s.controllerContact),
  ]);
}

export async function listChains(db: Database) {
  const { results } = await db
    .prepare(
      `SELECT c.*, COUNT(p.id) AS participant_count
         FROM chains c LEFT JOIN participants p ON p.chain_id = c.id
        GROUP BY c.id ORDER BY c.created_at DESC`,
    )
    .all<Chain & { participant_count: number }>();
  return results;
}

export function getChain(db: Database, id: string) {
  return db.prepare("SELECT * FROM chains WHERE id = ?").bind(id).first<Chain>();
}

/** The coming 31 January: by default, a group's data is deleted after it. */
export function defaultEndDate(now = new Date()): string {
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() : now.getUTCFullYear() + 1;
  return `${year}-01-31`;
}

export async function createChain(db: Database, name: string, currency: string): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO chains (id, name, currency, ends_on) VALUES (?, ?, ?, ?)")
    .bind(id, name, currency, defaultEndDate())
    .run();
  return id;
}

export async function setPrivacy(db: Database, id: string, organiser: string, endsOn: string): Promise<void> {
  await db.prepare("UPDATE chains SET organiser = ?, ends_on = ? WHERE id = ?").bind(organiser, endsOn, id).run();
}

/**
 * Deletes every group whose end date has passed, with its participants and
 * (by cascade) their wishes and lookup records, plus product lookups and
 * rate-limit records older than a day. Run daily by the cron trigger.
 */
export async function purgeExpired(db: Database, now = new Date()): Promise<number> {
  // Groups go once their end date is over everywhere: on the second day after
  // it in UTC, so the end date still counts in full as far west as UTC-12.
  const today = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const expired = "SELECT id FROM chains WHERE ends_on IS NOT NULL AND ends_on < ?";
  const results = await db.batch([
    db.prepare(`UPDATE participants SET giftee_id = NULL WHERE chain_id IN (${expired})`).bind(today),
    db.prepare(`DELETE FROM participants WHERE chain_id IN (${expired})`).bind(today),
    db.prepare("DELETE FROM chains WHERE ends_on IS NOT NULL AND ends_on < ?").bind(today),
    db.prepare("DELETE FROM previews WHERE fetched_at < ?").bind(dayAgo),
    db.prepare("DELETE FROM lookups WHERE at < ?").bind(dayAgo),
  ]);
  return results[2].meta.changes ?? 0;
}

export async function setBudget(db: Database, id: string, limit: number | null, currency: string): Promise<void> {
  await db.prepare("UPDATE chains SET price_limit = ?, currency = ? WHERE id = ?").bind(limit, currency, id).run();
}

export async function deleteChain(db: Database, id: string): Promise<void> {
  await db.batch([
    db.prepare("UPDATE participants SET giftee_id = NULL WHERE chain_id = ?").bind(id),
    db.prepare("DELETE FROM participants WHERE chain_id = ?").bind(id),
    db.prepare("DELETE FROM chains WHERE id = ?").bind(id),
  ]);
}

export async function listParticipants(db: Database, chainId: string) {
  const { results } = await db
    .prepare("SELECT * FROM participants WHERE chain_id = ? ORDER BY name COLLATE NOCASE")
    .bind(chainId)
    .all<Participant>();
  return results;
}

export function getParticipant(db: Database, id: string) {
  return db.prepare("SELECT * FROM participants WHERE id = ?").bind(id).first<Participant>();
}

function clearDraw(db: Database, chainId: string): Statement[] {
  return [
    db.prepare("UPDATE participants SET giftee_id = NULL WHERE chain_id = ?").bind(chainId),
    db.prepare("UPDATE chains SET drawn_at = NULL WHERE id = ?").bind(chainId),
  ];
}

/** Adds people, skipping emails already in the chain. Any existing draw is cleared. */
export async function addParticipants(
  db: Database,
  chainId: string,
  people: { name: string; email: string }[],
): Promise<number> {
  const inserts = people.map((p) =>
    db
      .prepare(
        `INSERT INTO participants (id, chain_id, name, email, access_key)
         VALUES (?, ?, ?, ?, ?) ON CONFLICT (chain_id, email) DO NOTHING`,
      )
      .bind(crypto.randomUUID(), chainId, p.name, p.email, newAccessKey()),
  );
  const results = await db.batch([...clearDraw(db, chainId), ...inserts]);
  return results.slice(2).reduce((n, r) => n + (r.meta.changes ?? 0), 0);
}

/** Corrects a participant's name or email (GDPR rectification); the draw is kept. */
export async function updateParticipant(
  db: Database,
  chainId: string,
  id: string,
  name: string,
  email: string,
): Promise<boolean> {
  const clash = await db
    .prepare("SELECT 1 FROM participants WHERE chain_id = ? AND email = ? AND id <> ?")
    .bind(chainId, email, id)
    .first();
  if (clash) return false;
  await db
    .prepare("UPDATE participants SET name = ?, email = ? WHERE id = ? AND chain_id = ?")
    .bind(name, email, id, chainId)
    .run();
  return true;
}

export async function removeParticipant(db: Database, chainId: string, id: string): Promise<void> {
  await db.batch([
    ...clearDraw(db, chainId),
    db.prepare("DELETE FROM participants WHERE id = ? AND chain_id = ?").bind(id, chainId),
  ]);
}

/**
 * Shuffles the chain into one circle: each person gives to the next one,
 * and the last gives to the first, so nobody draws themselves. A redraw
 * always gives a different circle (with 3 people there are only two).
 * Private links are not touched, so nobody needs a new one.
 */
export async function drawChain(db: Database, chainId: string): Promise<void> {
  const people = await listParticipants(db, chainId);
  if (people.length < MIN_PARTICIPANTS) {
    throw new Error(`A draw needs at least ${MIN_PARTICIPANTS} people.`);
  }
  const current = new Map(people.map((p) => [p.id, p.giftee_id]));
  const ids = people.map((p) => p.id);
  const unchanged = (c: string[]) => c.every((id, i) => current.get(id) === c[(i + 1) % c.length]);
  // Each try repeats the current circle with a chance of at most 1 in 2.
  let circle = shuffle(ids);
  for (let tries = 0; tries < 50 && unchanged(circle); tries++) circle = shuffle(ids);
  await db.batch([
    ...circle.map((id, i) =>
      db
        .prepare("UPDATE participants SET giftee_id = ? WHERE id = ?")
        .bind(circle[(i + 1) % circle.length], id),
    ),
    db.prepare("UPDATE chains SET drawn_at = datetime('now') WHERE id = ?").bind(chainId),
  ]);
}

/** Everyone's wish ideas in a chain, keyed by participant id, in position order. */
export async function listWishes(db: Database, chainId: string): Promise<Map<string, Wish[]>> {
  const { results } = await db
    .prepare(
      `SELECT w.participant_id, w.position, w.text, w.url, w.title, w.image, w.price, w.currency
         FROM wishes w JOIN participants p ON p.id = w.participant_id
        WHERE p.chain_id = ? ORDER BY w.position`,
    )
    .bind(chainId)
    .all<Wish & { participant_id: string }>();
  const byPerson = new Map<string, Wish[]>();
  for (const { participant_id, ...wish } of results) {
    byPerson.set(participant_id, [...(byPerson.get(participant_id) ?? []), wish]);
  }
  return byPerson;
}

export async function getWishes(db: Database, participantId: string): Promise<Wish[]> {
  const { results } = await db
    .prepare("SELECT position, text, url, title, image, price, currency FROM wishes WHERE participant_id = ? ORDER BY position")
    .bind(participantId)
    .all<Wish>();
  return results;
}

/** Replaces a participant's wish ideas; positions are renumbered from 1. */
/** Removes all of a participant's wishes (admin moderation). */
export async function clearWishes(db: Database, chainId: string, id: string): Promise<void> {
  await db
    .prepare("DELETE FROM wishes WHERE participant_id = (SELECT id FROM participants WHERE id = ? AND chain_id = ?)")
    .bind(id, chainId)
    .run();
}

export async function setWishes(db: Database, id: string, wishes: Omit<Wish, "position">[]): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM wishes WHERE participant_id = ?").bind(id),
    ...wishes
      .slice(0, MAX_WISHES)
      .map((w, i) =>
        db
          .prepare(
            `INSERT INTO wishes (participant_id, position, text, url, title, image, price, currency)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(id, i + 1, w.text, w.url, w.title, w.image, w.price, w.currency),
      ),
  ]);
}
