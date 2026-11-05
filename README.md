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
npx wrangler d1 create secret-santa   # copy the database_id into wrangler.jsonc
npm run db:migrate:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

## Security notes

- Anyone who has a participant's link can see that participant's page. Each key is 192 bits of randomness. Pages are sent with `Cache-Control: no-store` and a `same-origin` referrer policy, so the key isn't passed on to other sites.
- One shared `ADMIN_PASSWORD` protects the admin pages, and admin form posts from other sites are refused. The admin page hides the drawn circle behind a "spoilers" toggle, in case the admin is taking part too.
- Adding or removing people after the draw cancels the draw. Draw again and send the new links.
