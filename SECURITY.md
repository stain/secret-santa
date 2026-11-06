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

### Server and container (`Dockerfile`, `deploy/`)

- **A VPS, not shared hosting:** the app gets its own operating system and kernel, so another customer's compromised website can't reach its database or secrets.
- **The container:**
  - runs as uid 2000, which no login user has;
  - read-only, with no Linux capabilities and `no-new-privileges`;
  - memory and process limits;
  - only `/var/lib/secret-santa` (mounted as `/data`) is writable;
  - never pulls images from a registry: it runs only the image Ansible uploaded.
- **Not published to the internet:** the app listens on `127.0.0.1:8787`, and only nginx reaches it.
- **Requests:** bodies are capped at 100 KB, with timeouts on requests and headers.
- **Logs:** neither the app nor nginx logs individual requests, so private links are never written to logs. The only exception is nginx's limit log: the address and status of requests refused for going over the limits, kept one day, for fail2ban. The journal is capped at 200 MB.
- **The server (Debian 13, set up by `deploy/site.yml`):**
  - all updates on first setup, then automatic security updates with reboots when needed;
  - SSH keys only, root login off once an admin user exists, at most 3 attempts, no forwarding, and fail2ban;
  - a firewall allowing only SSH, HTTP and HTTPS in, with the local-network name services (LLMNR, mDNS) off;
  - kernel network hardening, AppArmor, and time sync.

  Tested end to end on a Debian 13 VM, including a Lynis audit (see `DEPLOYMENT.md`).
- **HTTPS and the web server (nginx):**
  - **Why nginx:** it's Debian's nginx with the system OpenSSL, fully covered by Debian security updates. Caddy was replaced because Debian's Caddy is a 2022 release and Debian's security support for Go programs is limited.
  - **TLS:** TLS 1.2 and 1.3 with forward-secret ciphers only, no session tickets, HSTS, and no HTTP/3. A Let's Encrypt certificate is renewed automatically by certbot. A CAA record (see `DEPLOYMENT.md`) stops other authorities issuing for the name.
  - **Other names refused:** requests for any other name, such as scanners using the bare IP address, get no answer (HTTP) or a refused handshake (HTTPS).
  - **No compression,** because pages contain private links and compressing them over HTTPS invites BREACH-style attacks.
  - **Not crawled:** `X-Robots-Tag: noindex, nofollow` alongside `robots.txt`.
  - **Static files:** the front page, privacy notice and assets are served from disk with the same security headers as the app's pages, so they don't touch the app and keep working if it's down.
- **Floods and bots** (a small server can't withstand a large network flood; only an upstream service could, and that would see private links):
  - **Firewall:** at most about 30 new web connections a second per address, dropped in the kernel.
  - **nginx, per address:** 10 requests a second with bursts, 30 a minute for `/admin`, 20 a minute for product lookups, and 20 connections at once.
  - **nginx, in total:** at most 100 requests in progress at the app at once, from all visitors together.
  - **Request size and timeouts:** short timeouts against slow clients, a 100 KB body limit, and only `GET`, `HEAD` and `POST`.
  - **Repeat offenders:** blocked for an hour by fail2ban after 50 refused requests in a minute.
  - **In the app:** bodies limited while being read (including chunked ones), admin logins throttled after 10 failures per address in 15 minutes, product lookups limited to 30 an hour per participant, and long input lines rejected before parsing.
- **Crashes and failures** (tested on a Debian 13 VM):
  - **Restarts:** systemd restarts the app 10 s after a crash (killed: back in 28 s), waits longer after each further failure up to 5 minutes, and never gives up (crash loop: retries after 34, 52, 90 and 169 s, then recovered by itself once fixed).
  - **Memory:** the container is capped at 256 MB; a memory hog inside it was killed without affecting the server or the app.
  - **Hangs:** a health check kills a hung app after 3 failed checks a minute apart (frozen: back in 197 s).
  - **Full disk:** the server stayed usable and the journal small; the app came back by itself after space was freed.
- **Server audit:** Lynis gives a hardening index of 71. Its two warnings were checked and are false alarms (Debian 13's security repository is configured; the iptables rules belong to Podman). Its suggestions were adopted where proportionate: stricter SSH logging, sessions and keep-alive settings, and blocked kernel modules. Skipped as out of proportion for a short-lived app with key-only logins: auditd, file-integrity and malware scanning, remote logging, login banners, and password ageing.
- **Deployments keep the data:** it lives outside the image, and every deployment restart is preceded by a database dump that must succeed.

### Tests

`npm test` runs the access-control tests (against a running server) and the network-guard unit tests. The access tests were checked to fail when a participant route is moved above the key check.

## Requirements for whoever runs it

- **A long random admin password:** `openssl rand -base64 24`. There's no lockout after failed logins, so the password's length is the protection.
- **HTTPS only:** private links and the admin password must never travel unencrypted. nginx handles this; don't expose port 8787.
- **Settings and secrets stay on the server:** `/etc/secret-santa/secret-santa.env` is readable by root only, and is generated there by the playbook. `deploy/inventory.ini` holds no secrets and isn't committed.
- **Don't turn on request or access logs** in nginx or anything else in front of the app (beyond the address-and-status limit log).
- **Keep it updated:** the server patches itself, but Node.js inside the image is only updated when you rebuild. Run `deploy/build-image.sh` and the playbook every month or two while it's in use (see `DEPLOYMENT.md`).
- **SSH keys:** use your own key for the server, not a key shared with other systems.
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
