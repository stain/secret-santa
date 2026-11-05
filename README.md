# secret-santa

A small Secret Santa web app: Node.js with an SQLite database, run in Docker behind Caddy.

- An admin creates one or more **groups** and adds people (name and email) to each.
- **Drawing names** shuffles a group into one circle: A gives to B, B gives to C, and the last person gives to A. A redraw always gives a different circle, and nobody's link changes.
- Each person gets a **private link**, `/p/<uuid>?key=<secret>`. The secret key means nobody can open someone else's page by changing the UUID. The admin page has a `mailto:` link for each person, with the message already written, so the organiser emails each link from their own email program. The app itself sends no email.
- On their page, people see whom they give to and that person's wishes, write up to 3 wish ideas of their own, and see everyone's wishes. They never see who gives to them.
- A wish can link to a product: the server looks up its name, photo and price (schema.org, OpenGraph, Amazon's markup, or the page title). Prices are shown converted between GBP, NOK and MXN, against an optional suggested budget.
- Links must be family-friendly: sites classed as adult content or malware are refused, and the admin can review and clear wishes.
- The pages are in English, Spanish and Norwegian (Bokmål), chosen from the browser's preferences or with the flags in the header.
- Personal data is handled with GDPR in mind: a privacy notice, automatic deletion after each group's end date, and a download of each participant's own data.

Pages are rendered on the server with plain HTML forms. One small script (`public/wish-form.js`) shows product details as a link is pasted; everything works without it.

**See also:** [`DEPLOYMENT.md`](DEPLOYMENT.md) for hosting and running it, and [`SECURITY.md`](SECURITY.md) for its security design, requirements and known limits.

## Layout

| Path | What |
|---|---|
| `src/server.ts` | Node.js HTTP server: static files, migrations, daily deletion job and backups |
| `src/index.ts` | Routing for the dynamic pages |
| `src/admin.ts` | Admin pages (`/admin`, HTTP Basic auth) |
| `src/participant.ts` | Private participant page (`/p/<uuid>?key=…`), product lookup and data download |
| `src/db.ts` | All database queries, including the draw and deletion of expired groups |
| `src/sqlite.ts` | Small wrapper over Node's built-in SQLite |
| `src/backup.ts` | Nightly SQL dumps |
| `src/security.ts` | Key generation, constant-time checks, shuffle, admin auth |
| `src/net.ts` | Outgoing requests for user-supplied links: public addresses only |
| `src/preview.ts`, `src/html-scan.ts` | Product name, photo and price lookup |
| `src/images.ts` | Product photo proxy (`/img`), signed addresses |
| `src/safety.ts` | Family-friendly check for links |
| `src/money.ts` | Currencies, exchange rates, budget |
| `src/i18n.ts`, `src/privacy.ts` | Translations, privacy notice |
| `src/html.ts`, `src/layout.ts` | Escaping HTML templates, page layout and security headers |
| `public/` | Styles, the wish-form script, font, favicon, `robots.txt` |
| `migrations/` | Database schema, applied in order at start-up |
| `test/` | Access-control and network-guard tests |
| `Dockerfile`, `compose.yaml`, `Caddyfile`, `.env.example`, `deploy/` | Production setup (see `DEPLOYMENT.md`) |

## Local development

Needs Node.js 22.19 or newer.

```sh
npm install
cp .dev.vars.example .dev.vars   # sets ADMIN_PASSWORD for local use
npm run dev                      # http://localhost:8787, restarts on changes
```

Go to <http://localhost:8787/admin> and log in with any user name and the `ADMIN_PASSWORD` from `.dev.vars`. The database and backups go in `data/`, which is not committed.

- `npm run typecheck` checks the TypeScript.
- `npm test`, with the dev server running, checks access control: participant pages, the product lookup and the data download must refuse every request without the right key, admin pages must need the password, redirects must stay on the site, and photo addresses must be signed. It creates a temporary group and deletes it afterwards. It also checks that outgoing requests can't reach private addresses. Some tests need network access. To test another server, set `BASE_URL` and `ADMIN_PASSWORD`.
- `npm run build` bundles the server into `dist/server.mjs`, as the Docker image does.
