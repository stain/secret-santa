-- Outbound product lookups per participant, for rate limiting.
-- Rows older than a day are deleted as new lookups are made.
CREATE TABLE lookups (
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  at             TEXT NOT NULL  -- ISO 8601
);
CREATE INDEX lookups_by_participant ON lookups(participant_id, at);
