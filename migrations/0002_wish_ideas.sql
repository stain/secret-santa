-- Up to three wish ideas per participant, each with an optional link.
CREATE TABLE wishes (
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  text           TEXT NOT NULL DEFAULT '',
  url            TEXT NOT NULL DEFAULT '',  -- http(s) only, checked by the app
  PRIMARY KEY (participant_id, position)
);

INSERT INTO wishes (participant_id, position, text)
  SELECT id, 1, wish FROM participants WHERE wish <> '';

ALTER TABLE participants DROP COLUMN wish;
