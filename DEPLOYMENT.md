# Deployment

How to run Secret Santa on a small rented server (VPS) at `santa.s11.no`, keep it updated, and take it down again. The rest of `s11.no` stays where it is: only one DNS record is added.

## How it runs

```
Internet ──HTTPS──▶ nginx (Debian package; ports 80/443; Let's Encrypt certificate via certbot)
                      ├──▶ /var/www/santa-static: front page, privacy notice, styles, script, fonts
                      └──▶ 127.0.0.1:8787 ──▶ app container (Podman, run by systemd)
                                                └─ /var/lib/secret-santa: santa.db + SQL dumps
```

- **The server:** Debian 13 ("trixie"), supported until about 2028. Everything on it comes from Debian's own packages and gets Debian security updates automatically: Podman, nginx, certbot, nftables, fail2ban. (nginx rather than Caddy: Debian's Caddy is a 2022 release, and Debian's security support for Go programs like it is limited.)
- **The app** is a container image (Node.js 24 LTS, supported until April 2028) that **you build elsewhere and upload**. The server needs no source code, git, npm or build tools. systemd runs the container through Podman "Quadlet" (`secret-santa.service`), as an unprivileged uid with a read-only filesystem.
- **Static pages:** the front page and the privacy notice (in English, Spanish and Norwegian) and the styles, script and fonts are plain files, rendered when the image is built. The playbook copies them out of the image, and nginx serves them itself, picking the language from the `lang` cookie (set by the flags) or else the browser's preferences. They keep working even if the app is down.
- **The data** lives in `/var/lib/secret-santa` on the server, **outside the image**. Deploying a new image never touches it, and nothing in the playbook deletes it. Before every restart caused by a deployment, the database is dumped to `backups/pre-deploy-<time>.sql.gz`; if that dump fails, the deployment stops before the restart.
- **The app also:** applies database migrations at start-up (forward-only, each in a transaction), deletes groups within two days after their end date (the end date counts in full in every time zone), and writes a nightly SQL dump.
- **If the app crashes, runs out of memory or hangs, systemd restarts it.** It waits 10 seconds, then longer after each further failure (up to 5 minutes), and never gives up, so it comes back by itself once the cause is gone. A health check every minute kills a hung app after 3 failures. All of this, and a full disk, was tested on the VM (see `SECURITY.md`).
- **Everything is set up by Ansible** (`deploy/site.yml`, the `santa` role), run from your own machine over SSH. Running it again is how you update, and it only changes what differs. It was tested end to end on a Debian 13 VM: first setup, re-deployment with data kept, and an unchanged re-run that changed nothing.

## Choosing a provider

The app needs 1 vCPU, 1 GB of memory and a public IPv4 address; in testing it used 23 MB, and the whole server about 320 MB. **Shared "cPanel" web hosting is not suitable:** it can't run the container, all customers share one operating system, and its access logs would record private links. Use a VPS.

| | **UKNode** (XXS VPS) | **UpCloud** | **Hetzner** |
|---|---|---|---|
| Plan | 1 vCPU, 1 GiB, 15 GiB, IPv4 + IPv6 | 1 GB plans | 1–2 GB plans; ARM ("CAX") available |
| Price (approx.) | £1.99/month (VAT unclear) | €3–3.50/month + VAT | €4–6/month + VAT |
| Billing | Monthly, prepaid, cancel any time | Hourly, prepaid balance | Hourly up to monthly, invoiced |
| Spending cap | Effectively the monthly price | Yes: the prepaid balance | No |
| Location | Manchester, UK | EU (Helsinki etc.), London | Germany, Helsinki |
| Company | UKNode Ltd (2024), UK; network from its sister company Cloud Nord Ltd | UpCloud, Finland (2011) | Hetzner, Germany (1997) |
| Data processing agreement | UK GDPR terms with unfilled placeholders: ask for a completed copy | Standard EU | Standard EU |
| Backups included | Daily, 7 days ("courtesy, no guarantee") | Optional, +10–20% | Optional, +20% |
| Sustainability information | None published | Renewable claims; Helsinki heat reuse | 100% renewable, efficient data centres |
| Support | Weekdays 09–17, critical issues 24/7 | 24/7 | Office hours plus emergencies |

Prices, plans and terms change, and some figures come from third-party sources: check the provider's own pages. Neither provider includes email sending, and none is needed (invitations go out through the admin page's `mailto:` links).

**Before choosing UKNode, ask them:** whether prices include VAT; which company you contract with (their terms say the IP addresses belong to Cloud Nord Ltd); for a completed, signed data processing agreement and an up-to-date subprocessor list; that Docker/Podman containers are allowed; and whether their automatic backups can be limited to 7 days (the privacy notice says so).

**Order the server with:** Debian 13 (not CentOS, Astra or FreeBSD), the smallest plan, an SSH key rather than a root password if offered, and in the EU or UK.

## What you need on your own machine

- **Ansible** (`ansible-core` 2.16 or newer: `sudo apt install ansible-core` on Ubuntu 24.04 or later), and your SSH key for the server. Only built-in Ansible modules are used.
- **Podman or Docker**, to build the image (`deploy/build-image.sh`). This can be a different machine from the one running Ansible: the playbook only needs the two files the script writes to `dist/`.

## First deployment

1. **Point DNS at the server.** At the DNS provider for `s11.no`, add an `A` record for `santa` with the server's IPv4 address, and an `AAAA` record for its IPv6 address. A short time to live (300 s) makes it easy to remove later. certbot needs this to get the certificate. Also add a **CAA record**, so that only Let's Encrypt may issue certificates for the name: `santa CAA 0 issue "letsencrypt.org"`.
2. **Check you can log in:** `ssh root@santa.s11.no`. If the provider only gave you a password, add your key first with `ssh-copy-id root@santa.s11.no`; the playbook turns password logins off.
3. **Build the image:** `deploy/build-image.sh` (from the repository root). It writes `dist/secret-santa-image.tar.gz` and its ID.
4. **Write the inventory:** `cp deploy/inventory.example.ini deploy/inventory.ini` and fill it in. It isn't committed. For example:

   ```ini
   [santa]
   santa.s11.no ansible_user=root

   [santa:vars]
   santa_domain=santa.s11.no
   santa_hosting_provider=UKNode Ltd
   santa_hosting_location=Manchester, United Kingdom
   santa_admin_user=santa-admin
   ```

   With `santa_admin_user` set, the first run creates that user with `sudo` and root's SSH keys, then turns root logins off. **Afterwards, change `ansible_user=root` to `ansible_user=santa-admin`.**
5. **Run it:** `cd deploy && ansible-playbook site.yml`. On a fresh server it takes a few minutes. At the end it prints the generated **admin password** (only on the first run; it's also in `/etc/secret-santa/secret-santa.env` on the server) and what's listening on the network: `sshd`, nginx on 80/443, and the app on `127.0.0.1:8787` only.
6. **Check it, then go live:**
   1. Open `https://santa.s11.no/admin` and log in with any user name and the admin password.
   2. Fill in the **data controller** (name and contact). The privacy notice and every participant's page show it.
   3. Make a throwaway group, draw, open a private link, add a wish with a product link, check the photo and price, then delete the group.
   4. Optionally, from your machine: `BASE_URL=https://santa.s11.no ADMIN_PASSWORD=… npm test`. It creates and deletes a temporary group.
   5. Create the real groups, set each group's end date (default 31 January), and send the links.

**What the playbook sets up on the server:**
- **Updates:** all updates installed first (rebooting if the kernel was updated), then daily automatic security updates, with a reboot at 04:30 UTC when one needs it. `needrestart` restarts services after library updates.
- **SSH:** keys only, root login off (once an admin user exists), at most 3 attempts, a 20-second login window, and no forwarding. Fail2ban bans repeated failures for an hour.
- **Network:**
  - a firewall (nftables) allowing only SSH, HTTP and HTTPS in;
  - kernel network hardening (no ICMP redirects or source routing, loose reverse-path filtering);
  - the local-network name services LLMNR and mDNS turned off.
- **Also:**
  - time zone UTC and locale `C.UTF-8`, like the app (dates are shown in UTC);
  - AppArmor and time sync running;
  - kernel modules for unused network protocols (DCCP, SCTP, RDS, TIPC) and for USB and FireWire storage blocked;
  - the journal limited to 200 MB, and 1 GB of swap as a safety margin.
- **nginx:**
  - **HTTPS:** TLS 1.2 and 1.3 only, forward-secret ciphers, no session tickets, HSTS, and no HTTP/3. HTTP redirects to HTTPS.
  - **Certificate:** obtained by certbot on the first run, renewed automatically by Debian's `certbot.timer`, which reloads nginx.
  - **Limits per address:** 10 requests a second (more for short bursts), 30 a minute for `/admin`, 20 a minute for product lookups, and 20 connections at once. At most 100 requests from all visitors together reach the app at once.
  - **Request size and timeouts:** short timeouts, a 100 KB body limit, and only `GET`, `HEAD` and `POST`.
  - **Other names refused:** requests for any name other than `santa_domain` (such as scanners using the bare IP address) get no answer.
  - **No compression** (pages contain private links: BREACH), and an `X-Robots-Tag: noindex` header besides `robots.txt`.
  - **Logs:** **no access log** and only critical errors, so private links are never written to disk. The one exception is `/var/log/nginx/santa-limits.log`, which records just the address and status of requests refused for going over the limits or using the wrong name. It's kept for one day, and lets fail2ban block an address for an hour after 50 such requests in a minute.
- **Firewall:** at most about 30 new web connections a second per address; anything beyond that is dropped before nginx sees it.
- **The app container:** read-only, no Linux capabilities, `no-new-privileges`, 256 MB memory and 100 process limits, running as uid 2000, which no login user has. It's reachable only from the server itself, and never pulls images from a registry.

## Updating

**Everything is the same two commands**, now or in a year's time:

```sh
deploy/build-image.sh                        # new app version and/or latest Node.js 24 patch
cd deploy && ansible-playbook site.yml       # uploads the image only if it changed
```

The playbook installs pending Debian updates, re-applies the configuration, and restarts the app only if the image or settings changed, after dumping the database. If nothing changed, it changes nothing.

**When to rebuild:** Debian keeps the server itself patched automatically, but **Node.js inside the image is only updated when you rebuild.** Rebuild and redeploy every month or two while the app is in use, and before reusing it next season.

**In a year's time, also check:**
- Debian 13 is still supported (until about mid-2028).
- Node.js 24 is still supported (until April 2028). After that, change `node:24-slim` in the `Dockerfile` to the next even-numbered LTS release, then run `npm test`.
- The dependencies: `npm outdated`, `npm audit`.

**Settings:** change them in `inventory.ini` and run the playbook again. The admin password is kept between runs. To change it, edit `/etc/secret-santa/secret-santa.env` on the server and run `systemctl restart secret-santa`.

## Running it

On the server (as root, or with `sudo`):

| Task | Command |
|---|---|
| App status / restart | `systemctl status secret-santa` / `systemctl restart secret-santa` |
| App logs | `journalctl -u secret-santa -f` |
| nginx status, errors | `systemctl status nginx`, `/var/log/nginx/santa-error.log` |
| Certificate | `certbot certificates`; test renewal: `certbot renew --dry-run` |
| Running containers, memory | `podman ps`, `podman stats --no-stream` |
| Firewall, bans | `nft list ruleset`, `fail2ban-client status sshd`, `fail2ban-client status santa-nginx` |
| What's listening | `ss -tulpn` |

**Logs:** the app's go to the systemd journal, which is limited to 200 MB. Neither the app nor nginx logs individual requests, apart from the one-day limit log described above.

## Backups

- **Nightly:** the app writes a gzipped SQL dump, `santa-YYYY-MM-DD.sql.gz`, to `/var/lib/secret-santa/backups` and keeps 7 (`santa_backup_days`).
- **Before each deployment restart:** `pre-deploy-<time>.sql.gz`, also kept 7 days.
- **Off the server:** both of the above sit on the server's own disk. Copy the latest off now and then, from your machine:

  ```sh
  ssh santa-admin@santa.s11.no 'sudo sh -c "cat \$(ls -t /var/lib/secret-santa/backups/*.sql.gz | head -1)"' > santa-latest.sql.gz
  ```

  Treat copies as personal data and delete them at the end of the season.
- **Provider backups** (UKNode's daily backups, or optional ones elsewhere): check how long they're kept. The privacy notice says up to 7 days.

**Restoring** a dump, on the server:

```sh
gunzip -c /var/lib/secret-santa/backups/santa-2026-12-24.sql.gz | sqlite3 /tmp/restored.db
sqlite3 /tmp/restored.db 'select name from chains'           # check it looks right
systemctl stop secret-santa
rm -f /var/lib/secret-santa/santa.db-wal /var/lib/secret-santa/santa.db-shm
install -o 2000 -g 2000 -m 0644 /tmp/restored.db /var/lib/secret-santa/santa.db
systemctl start secret-santa && rm /tmp/restored.db
```

## Trying the playbook first (optional)

The `Vagrantfile` creates a throwaway Debian 13 VM and runs the same playbook against it, with a self-signed certificate at `https://localhost:8443`. It needs Vagrant, VirtualBox or libvirt, and Ansible on the same machine:

```sh
deploy/build-image.sh && vagrant up      # vagrant provision to run it again; vagrant destroy afterwards
```

## Personal data (GDPR)

Whoever runs the app is the **data controller**. Before going live:
- **Name the data controller** (name and contact) on the admin home page. It's shown at the bottom of every interactive page (participants' pages and the admin pages). The privacy notice at `/privacy` is a static page, so it can't name them itself, and it points there.
- **Set `santa_hosting_provider` and `santa_hosting_location`** in the inventory; they're shown at the bottom of interactive pages as the processor.
- **Get the provider's data processing agreement.** For UKNode, a completed one (see above).
- **Keep any provider backups to 7 days or fewer**, as the notice says.
- **Answer participants' requests** on the admin page: "Edit" corrects a name or email, "Remove" deletes a person and their wishes, and "Review" then "Clear all their wishes" removes unsuitable wishes. Participants can download their own data from their page.

What the app does by itself:
- **Deletion:** removes each group, with all its participants and wishes, within two days after its end date; keeps product lookups for one day.
- **Nothing sent from the browser to others:** stores no IP addresses (except nginx's one-day record of visitors over the limits, which the privacy notice mentions) and loads no third-party content.
- **Hostnames only:** sends only linked websites' names to Cloudflare's family-friendly DNS check.

## End of season: taking it down

After the last group's end date, the app has already deleted the groups' data. Then:
1. **Cancel or delete the server** at the provider, with any provider backups or snapshots, and check billing has stopped. Deleting the server deletes the database and the dumps.
2. **Remove the `santa` DNS records** from `s11.no`.
3. **Delete any backup copies** you downloaded, and `deploy/inventory.ini` if it's no longer needed.

To run it again next season: order a server, re-point DNS, rebuild the image, run the playbook.

## Troubleshooting

- **No certificate or site not reachable:**
  - DNS must point at the server: `dig santa.s11.no`.
  - Ports 80/443 must be open in any provider firewall.
  - Read the certbot output in the playbook run, and `/var/log/letsencrypt/letsencrypt.log`. Don't keep retrying blindly: Let's Encrypt rate-limits failed attempts. To experiment, set `santa_acme_staging=true` (Let's Encrypt's test service), then delete `/etc/letsencrypt/live/<domain>` and run again with it off.
- **"Check the image has been built" fails:** run `deploy/build-image.sh` first.
- **SSH refused after the first run:** root logins are off once `santa_admin_user` exists. Use `ansible_user=santa-admin` (and `ssh santa-admin@…`).
- **App not starting:** `journalctl -u secret-santa` and `systemctl status secret-santa`. The settings are in `/etc/secret-santa/secret-santa.env`.
- **Product lookups find nothing:** some shops (Amazon in particular) sometimes block automated requests; the wish is still saved.
