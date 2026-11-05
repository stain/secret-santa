-- Prices found by the product lookup, a suggested budget per group,
-- exchange rates and a cache of product lookups.
ALTER TABLE wishes ADD COLUMN price REAL;                        -- in wishes.currency
ALTER TABLE wishes ADD COLUMN currency TEXT NOT NULL DEFAULT ''; -- ISO 4217, e.g. GBP

ALTER TABLE chains ADD COLUMN price_limit REAL;                   -- suggested, not enforced
ALTER TABLE chains ADD COLUMN currency TEXT NOT NULL DEFAULT 'GBP';

-- Units of each currency per euro (ECB reference rates), refreshed daily.
CREATE TABLE rates (
  currency   TEXT PRIMARY KEY,
  per_eur    REAL NOT NULL,
  fetched_at TEXT NOT NULL  -- ISO 8601
);

-- Product lookups by URL, so the live preview and saving share one fetch.
CREATE TABLE previews (
  url        TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  image      TEXT NOT NULL,
  price      REAL,
  currency   TEXT NOT NULL,
  fetched_at TEXT NOT NULL  -- ISO 8601
);
