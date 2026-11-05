-- A chain is one Secret Santa group, drawn as a single circle.
CREATE TABLE chains (
  id         TEXT PRIMARY KEY,               -- UUID
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  drawn_at   TEXT                            -- NULL until the draw has happened
);

CREATE TABLE participants (
  id         TEXT PRIMARY KEY,               -- UUID, appears in the private link
  chain_id   TEXT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  access_key TEXT NOT NULL,                  -- secret ?key= that must accompany the UUID
  wish       TEXT NOT NULL DEFAULT '',
  giftee_id  TEXT REFERENCES participants(id) ON DELETE SET NULL,  -- whom this person gives to
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (chain_id, email)
);

CREATE INDEX participants_chain ON participants(chain_id);
