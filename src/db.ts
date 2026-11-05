// All D1 access lives here so the SQL stays in one place.

import { newAccessKey, shuffle } from "./security";

export interface Chain {
  id: string;
  name: string;
  created_at: string;
  drawn_at: string | null;
}

export interface Participant {
  id: string;
  chain_id: string;
  name: string;
  email: string;
  access_key: string;
  wish: string;
  giftee_id: string | null;
}

export const MIN_PARTICIPANTS = 3;

export async function listChains(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT c.*, COUNT(p.id) AS participant_count
         FROM chains c LEFT JOIN participants p ON p.chain_id = c.id
        GROUP BY c.id ORDER BY c.created_at DESC`,
    )
    .all<Chain & { participant_count: number }>();
  return results;
}

export function getChain(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM chains WHERE id = ?").bind(id).first<Chain>();
}

export async function createChain(db: D1Database, name: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.prepare("INSERT INTO chains (id, name) VALUES (?, ?)").bind(id, name).run();
  return id;
}

export async function deleteChain(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare("UPDATE participants SET giftee_id = NULL WHERE chain_id = ?").bind(id),
    db.prepare("DELETE FROM participants WHERE chain_id = ?").bind(id),
    db.prepare("DELETE FROM chains WHERE id = ?").bind(id),
  ]);
}

export async function listParticipants(db: D1Database, chainId: string) {
  const { results } = await db
    .prepare("SELECT * FROM participants WHERE chain_id = ? ORDER BY name COLLATE NOCASE")
    .bind(chainId)
    .all<Participant>();
  return results;
}

export function getParticipant(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM participants WHERE id = ?").bind(id).first<Participant>();
}

function clearDraw(db: D1Database, chainId: string): D1PreparedStatement[] {
  return [
    db.prepare("UPDATE participants SET giftee_id = NULL WHERE chain_id = ?").bind(chainId),
    db.prepare("UPDATE chains SET drawn_at = NULL WHERE id = ?").bind(chainId),
  ];
}

/** Adds people, skipping emails already in the chain. Any existing draw is cleared. */
export async function addParticipants(
  db: D1Database,
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

export async function removeParticipant(db: D1Database, chainId: string, id: string): Promise<void> {
  await db.batch([
    ...clearDraw(db, chainId),
    db.prepare("DELETE FROM participants WHERE id = ? AND chain_id = ?").bind(id, chainId),
  ]);
}

/**
 * Shuffles the chain into one circle: each person gives to the next one,
 * and the last gives to the first, so nobody draws themselves.
 */
export async function drawChain(db: D1Database, chainId: string): Promise<void> {
  const ids = (await listParticipants(db, chainId)).map((p) => p.id);
  if (ids.length < MIN_PARTICIPANTS) {
    throw new Error(`A draw needs at least ${MIN_PARTICIPANTS} people.`);
  }
  const circle = shuffle(ids);
  await db.batch([
    ...circle.map((id, i) =>
      db
        .prepare("UPDATE participants SET giftee_id = ? WHERE id = ?")
        .bind(circle[(i + 1) % circle.length], id),
    ),
    db.prepare("UPDATE chains SET drawn_at = datetime('now') WHERE id = ?").bind(chainId),
  ]);
}

export async function setWish(db: D1Database, id: string, wish: string): Promise<void> {
  await db.prepare("UPDATE participants SET wish = ? WHERE id = ?").bind(wish, id).run();
}
