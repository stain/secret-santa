# secret-santa

A small Secret Santa web app running on Cloudflare Workers with a D1 (SQLite) database.

- An admin creates one or more **groups** and adds people (name and email) to each.
- **Drawing names** shuffles a group into one circle: A gives to B, B gives to C, and the last person gives to A.
- Each person gets a **private link**, `/p/<uuid>?key=<secret>`. The secret key means nobody can open someone else's page by changing the UUID. The admin page has a `mailto:` link for each person, with the message already written, so you can email them their link.
- On their page, people see whom they give to and that person's wishes, write up to 3 wish ideas of their own (each with an optional link, for example to a shop), and see everyone's wishes. They never see who gives to them.
- The pages are in English, Spanish and Norwegian (Bokmål). The language follows the browser's preferences, and the flag links in the header switch it (remembered in a `lang` cookie).

The pages are rendered on the server and use plain HTML forms, with no client-side JavaScript.

## Layout

| Path | What |
|---|---|
| `src/index.ts` | Worker entry point and routing |
| `src/admin.ts` | Admin pages (`/admin`, HTTP Basic auth) |
| `src/participant.ts` | Private participant page (`/p/<uuid>?key=…`) |
| `src/db.ts` | All D1 queries, including the draw |
| `src/security.ts` | Key generation, constant-time checks, shuffle, admin auth |
| `src/html.ts` | Escaping HTML template helper |
| `src/layout.ts` | Page layout and security headers |
| `src/i18n.ts` | Translations and language selection |
| `src/privacy.ts` | Privacy notice (`/privacy`) in each language |
| `src/images.ts` | Product photo proxy (`/img?u=…`) |
| `src/preview.ts` | Product name, photo and price lookup |
| `src/money.ts` | Currencies, exchange rates, budget |
| `public/fonts/` | Self-hosted font and its licence |
| `public/style.css` | Festive styling (static asset) |
| `migrations/` | D1 schema migrations |

## Local development

Needs Node.js 22.

```sh
npm install
cp .dev.vars.example .dev.vars        # sets ADMIN_PASSWORD for local use
npm run db:migrate:local
npm run dev                           # http://localhost:8787
```

Go to <http://localhost:8787/admin> and log in with any user name and the `ADMIN_PASSWORD` from `.dev.vars`. To check the code, run `npm run typecheck`. Run `npm run cf-typegen` again after you change `wrangler.jsonc` or `.dev.vars`.

## Deploying to Cloudflare (free plan)

```sh
npx wrangler login
npx wrangler d1 create secret-santa --jurisdiction eu   # keeps the data in the EU; copy the database_id into wrangler.jsonc
npm run db:migrate:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

## Security notes

- Anyone who has a participant's link can see that participant's page. Each key is 192 bits of randomness. Pages are sent with `Cache-Control: no-store` and a `same-origin` referrer policy, so the key isn't passed on to other sites.
- One shared `ADMIN_PASSWORD` protects the admin pages, and admin form posts from other sites are refused. The admin page hides the drawn circle behind a "spoilers" toggle, in case the admin is taking part too.
- Adding or removing people after the draw cancels the draw. Draw again and send the new links.
- The server fetches product links itself. Each participant can trigger at most 30 fetches an hour (looking up a cached link doesn't count). Cached lookups and rate-limit records older than a day are deleted as new lookups are made.

## Personal data and GDPR

Each group's **organiser** is the data controller: they decide to run the event and are responsible for the participants' data. Cloudflare (and an email provider, if invitations are sent from the app) process it on their behalf. The app is built to make that easy to do properly:

- **Data minimisation:** only names, email addresses, wishes and the draw are stored. There are no IP addresses, analytics or tracking. Email addresses are shown only to the admin.
- **Transparency:** the privacy notice at `/privacy` (English, Spanish, Norwegian) is linked from every page and from the invitation email. Each participant's page names the organiser and the deletion date.
- **Storage limitation:** each group has an end date (default 31 January). A daily cron trigger (`scheduled` in `src/index.ts`) deletes groups the day after, with all their participants and wishes. Product lookups and rate-limit records are kept for one day.
- **Rights:** participants can download their data as JSON and change or delete their wishes. The admin can correct names and email addresses without redoing the draw, and removing someone deletes all their data.
- **No third parties in the browser:** the font is served from the app, and product photos are passed through the Worker (`/img`), so visitors' browsers contact no other servers.
- **Location and logs:** create the database with `--jurisdiction eu`. Workers Logs are off, because they would record private links and IP addresses.

**What the organiser still has to do:**
- Fill in their name and contact address on each group's admin page before sending links.
- Answer participants' requests.
- Keep the privacy notice in `src/privacy.ts` accurate if the deployment differs (for example, a database outside the EU).
- Accept Cloudflare's data processing terms, which are part of its self-serve agreement, and, if invitations are sent through Google Workspace, Google's.

To try the deletion job locally, run `npm run dev` and open `http://localhost:8787/__scheduled?cron=17+3+*+*+*`.
