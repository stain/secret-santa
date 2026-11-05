# Security

This document describes what the Secret Santa app protects, how, what the people running it must do, and its known limits. Report security problems privately to the data controller named on the app's privacy page, not in a public issue.

## What must be protected

1. **The draw.** A participant must not be able to find out who gives to them, nor whom anyone else gives to.
2. **Private pages.** Only the holder of a participant's link can see or change that participant's page, wishes and data.
3. **Administration.** Only the admin can create groups, see email addresses and the draw, or change anything.
4. **Personal data.** Names, email addresses and wishes are seen only by those who need them, kept no longer than needed, and not passed to anyone else (see the GDPR section in `DEPLOYMENT.md`).
5. **The server.** Links that participants enter must not let anyone reach the server's internal services, use it as a proxy, or run up costs.

## How it is protected

### Participants (`src/participant.ts`)

- **Private links** are `/p/<uuid>?key=<key>`: a random UUID plus a 192-bit random key (`crypto.getRandomValues`). The key is compared in constant time.
- **No way to probe:** a wrong key, a missing key, someone else's key and an unknown UUID all get the same "not found" page. IDs that aren't UUIDs are rejected before the database is queried. The key only counts in the URL, not in cookies, headers or form bodies.
- **Every participant route** (page, saving wishes, product lookup, data download) checks the key first; a comment in the code says so, and `npm test` checks each route with bad keys.
- **Pages contain only what that participant may see:** their giftee and everyone's names and wishes. They never include another participant's UUID or key, any email address except the group organiser's contact, or who gives to them. The data download leaves out who gives to them.
- **Keys don't leak from pages:** `Referrer-Policy: same-origin`, `rel="noreferrer"` on outgoing links, `Cache-Control: no-store`, and product photos served by the app itself.

### The draw (`src/db.ts`, `src/security.ts`)

- One circle, shuffled with an unbiased Fisher–Yates shuffle using the cryptographic random number generator. A redraw always gives a different circle.
- The admin page hides the circle behind a "spoilers" toggle, in case the admin also takes part.

### Administration (`src/admin.ts`)

- HTTP Basic authentication against `ADMIN_PASSWORD` (any user name), compared in constant time.
- Every change is a POST, and posts from other sites are refused by checking the `Origin` header (cross-site request forgery). The participant wish form has the same check.

### Web page safety (`src/html.ts`, `src/layout.ts`)

- All output goes through an HTML template that escapes every value. Links must be `http(s)`, and product photos must be `https`.
- A strict Content Security Policy: only the app's own scripts, styles, fonts and images; no inline scripts; forms only post to the app; no framing. Also `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
- The language and currency links only redirect to pages on the same site; `back` is resolved the way a browser would (which drops tabs and newlines).
- `robots.txt` and `noindex` keep search engines away.

### Product links and photos (`src/net.ts`, `src/preview.ts`, `src/images.ts`, `src/safety.ts`)

- **No access to internal services (SSRF):** all requests to user-supplied addresses go through `publicFetch`. It allows only ports 80 and 443 and no IP-address hosts. It refuses to connect to private, loopback, link-local (including the cloud metadata service at `169.254.169.254`), shared, multicast and documentation ranges. The check runs on the addresses DNS returns *at connection time*, so names like `127.0.0.1.nip.io`, or DNS answers that change between check and connection, can't get round it. Every redirect is checked again; at most 5 are followed.
- **Limits:** 6-second timeout per request, at most 1.5 MB of each page read, photos up to 5 MB and only JPEG, PNG, GIF, WebP or AVIF (never SVG, which could carry script). Each participant can trigger at most 30 new lookups an hour.
- **Family-friendly:** link and photo hosts are checked with Cloudflare's "1.1.1.1 for Families" resolver; adult and malware domains are refused.
- **Photo proxy:** visitors' browsers never contact shops, so shops and wishers can't see viewers' IP addresses or when they view. Photo addresses are signed (HMAC-SHA-256 with a key the app generates and keeps in the database), and only photos in current wishes or recent lookups are served. So outsiders can't use `/img` as a proxy, or to test whether a product was wished for.
- **Cached lookups** obey the same host and port rules.

### Server and container (`Dockerfile`, `compose.yaml`, `deploy/cloud-init.yaml`)

- The app runs as an unprivileged user, in a read-only container with no Linux capabilities, `no-new-privileges`, and memory and process limits. Only `/data` is writable.
- The app isn't published to the internet; only Caddy reaches it, over the Compose network. Caddy provides HTTPS with automatic certificates, and HSTS.
- Request bodies are capped at 100 KB, with timeouts on requests and headers.
- **Logs:** neither the app nor Caddy logs individual requests, so private links and IP addresses are never written to logs. Docker rotates container logs by size.
- **The server:** SSH keys only, a firewall allowing only SSH, HTTP and HTTPS, and automatic security updates with reboots when needed.

### Tests

`npm test` runs the access-control tests (against a running server) and the network-guard unit tests. The access tests were checked to fail when a participant route is moved above the key check.

## Requirements for whoever runs it

- **A long random admin password:** `openssl rand -base64 24`. There's no lockout after failed logins, so the password's length is the protection.
- **HTTPS only:** private links and the admin password must never travel unencrypted. Caddy handles this; don't expose port 8787.
- **`.env` stays on the server**, readable only by its owner (`chmod 600 .env`), never committed.
- **Don't turn on request or access logs** in Caddy, Docker or anywhere else in front of the app.
- **Keep the server updated:** the cloud-init setup turns on automatic security updates. Rebuild the app (`docker compose up -d --build --pull always`) now and then to pick up new Node and Caddy images.
- **Name the data controller** on the admin home page before sending links.
- **Send links only to the person they belong to**, and delete the server when the season is over (see `DEPLOYMENT.md`).

## Known limits and accepted risks

- **Small groups reveal the Santa.** In a single circle your Santa is never you or your giftee. With 3 people everyone can work out who their Santa is; with 4, it's a coin toss. The minimum is 3; consider requiring 5, or warning the admin.
- **Anyone with a participant's link has their page.** Links can end up in browser history, email archives, and email security scanners that open links (the app answers their `HEAD` requests but changes nothing on `GET`).
- **One shared admin password**, with no lockout after failed attempts and no separate accounts. Anyone with it sees all groups, including email addresses and the draw.
- **The family-friendly check judges whole sites** and lets links through if the DNS service can't be reached. Unsuitable products on general shops (such as Amazon) are left to the admin's review. Wish text isn't filtered.
- **Shops can see the app fetching their pages and photos**, and when, though never who is viewing. The photo cache is in memory and clears on restart.
- **Backups live on the same server.** The nightly SQL dumps protect against mistakes, not against losing the server (see `DEPLOYMENT.md`).
- **Amazon and other shops sometimes block automated lookups.** The wish is still saved, just without product details.
- **SQLite support in Node 22 is still marked experimental.** It's stable in practice, and the app only uses its basic features.
