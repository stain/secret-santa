-- Wishes looked up while a shop showed a robot check (e.g. Primark's Akamai
-- "Challenge Validation" page) got that page's title as their name. Clear
-- them, and drop such lookups from the cache; preview.ts now skips these pages.
UPDATE wishes SET title = '', image = '', price = NULL, currency = ''
  WHERE LOWER(TRIM(title)) IN ('challenge validation', 'just a moment...', 'attention required! | cloudflare',
    'access denied', 'robot check', 'pardon our interruption');
DELETE FROM previews
  WHERE LOWER(TRIM(title)) IN ('challenge validation', 'just a moment...', 'attention required! | cloudflare',
    'access denied', 'robot check', 'pardon our interruption');
