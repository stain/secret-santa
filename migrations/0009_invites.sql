-- Invitation links per group: one for the group's organiser to manage it
-- without the admin password, and one people can use to join it themselves
-- until the cut-off date (and only before the draw).
ALTER TABLE chains ADD COLUMN organiser_key TEXT NOT NULL DEFAULT '';  -- secret ?key= for /o/<id>
ALTER TABLE chains ADD COLUMN join_key TEXT NOT NULL DEFAULT '';       -- secret ?key= for /j/<id>
ALTER TABLE chains ADD COLUMN joins_close_on TEXT;                     -- YYYY-MM-DD; NULL: joining is off

-- 192 random bits each, URL-safe like the keys the app generates.
UPDATE chains SET organiser_key = lower(hex(randomblob(24))), join_key = lower(hex(randomblob(24)));

ALTER TABLE participants ADD COLUMN self_joined INTEGER NOT NULL DEFAULT 0;  -- 1: joined with the join link
