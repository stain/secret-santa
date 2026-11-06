-- GDPR: who is responsible for each group's data, and when it is deleted.
ALTER TABLE chains ADD COLUMN organiser TEXT NOT NULL DEFAULT '';  -- name and contact shown to participants
ALTER TABLE chains ADD COLUMN ends_on TEXT;                         -- YYYY-MM-DD; group deleted the day after

-- Existing groups end on the coming 31 January.
UPDATE chains SET ends_on =
  CASE WHEN strftime('%m', 'now') = '01' THEN strftime('%Y', 'now') || '-01-31'
       ELSE (CAST(strftime('%Y', 'now') AS INTEGER) + 1) || '-01-31' END;
