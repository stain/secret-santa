-- Product details looked up from a wish's link when it is saved.
ALTER TABLE wishes ADD COLUMN title TEXT NOT NULL DEFAULT '';  -- product name or page title
ALTER TABLE wishes ADD COLUMN image TEXT NOT NULL DEFAULT '';  -- https image URL
