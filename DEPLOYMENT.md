# Deployment

How to run Secret Santa on a small rented server (VPS) for one season, at `santa.s11.no`, and take it down again afterwards. The rest of `s11.no` stays where it is: only one DNS record is added.

## How it runs

```
Internet ──HTTPS──▶ Caddy (ports 80/443, automatic certificate) ──▶ app (Node.js, port 8787, not public)
                                                                      └─ /data volume: santa.db + nightly SQL dumps
```

- Two containers, started by `docker compose` from `compose.yaml`: **Caddy** for HTTPS, and **the app**, built from the `Dockerfile`.
- **Settings** are in `.env` on the server; `.env.example` shows what to fill in.
- **Everything is on one server:** the database (SQLite), backups, and certificates are in Docker volumes.
- **The app also:**
  - applies database migrations at start-up,
  - deletes groups the day after their end date (checked hourly),
  - writes a nightly SQL dump.
- **No service from the hosting provider is needed** beyond the server itself. Neither provider below has a simple managed container service (only Kubernetes, which is far too much for this), so it's **SSH plus Docker Compose**, set up with cloud-init.

## Choosing a provider

For two months, a provider that bills **by the hour, with no minimum term** is best: create the server, delete it afterwards, and pay only for the hours in between. The app needs 1 virtual CPU, 1 GB of memory and a public IPv4 address. It runs on x86 or ARM.

| | **UpCloud** (recommended) | **Hetzner** |
|---|---|---|
| Company | Finland, founded 2011 | Germany, founded 1997 |
| Locations | Helsinki, Stockholm, Frankfurt, Amsterdam, London, … | Germany (Nuremberg, Falkenstein), Helsinki |
| Smallest suitable plan (approx., before VAT) | About €3–3.50 a month (1 GB) | About €4–6 a month including IPv4; ARM ("CAX") plans available |
| Billing | **Prepaid balance**, used up hourly | Invoiced afterwards, hourly up to the monthly price |
| **Spending cap** | **In effect, yes:** top up €10–15 once and leave automatic top-up off, and you can't be charged more | **No:** usage alerts only, which Hetzner says aren't a spending limit |
| If you forget the server | It stops when the balance runs out (check their terms for exactly what happens at zero) | It keeps costing the monthly price until deleted |
| Heavy traffic or abuse | Outgoing traffic free; past fair use, slowed rather than charged | Large allowance included |
| Email sending | None included; outgoing port 25 blocked for new accounts | None included; outgoing ports 25 and 465 blocked for new servers |
| Provider backups | "Simple Backup": daily +10% of server price (may be included on some plans), weekly +20% | 7 daily backups, +20% of server price; deleted with the server (per third-party reports) |
| Energy | Says most of its data centres use renewable energy. It lists its Helsinki data centre (Telia's) as 100% renewable, mainly hydro; an older Telia brochure says that site feeds waste heat into Helsinki's district heating. | 100% renewable electricity (hydropower in Germany; renewables in Finland); reported power usage effectiveness (PUE) of about 1.12–1.14; waste heat used for its own buildings; not certified for energy or environmental management (ISO 50001 or 14001, or EMAS) |
| Jurisdiction | EU-based company, EU data processing agreement | EU-based company, EU data processing agreement |
| Gotchas | Servers are billed even when switched off: delete them. One user reported unused balance wasn't refunded. | Same "switched off still costs" rule. Some new accounts have been restricted since June 2026, and new accounts are sometimes asked for ID. |

Prices, plans and policies change; the figures above come partly from third-party sources. Check the provider's own pages before choosing. Prices usually exclude VAT; for a Norwegian customer, expect 25% Norwegian VAT on top.

**Why UpCloud:** the prepaid balance is a real spending cap, it's the cheapest for 1 GB, and it's an EU company with an EU data processing agreement. Hetzner is just as good technically if a hard cap doesn't matter to you.

**About email:** neither provider includes an email-sending service, and it isn't needed. Invitations go out through the admin page's `mailto:` links, from the organiser's own email account.

## Setting up (about 30 minutes)

### 1. Create the server

1. Create an account at the provider. For UpCloud, add a one-off balance of €10–15 and leave automatic top-up **off**.
2. Create a server:
   - **Image:** Ubuntu 24.04 LTS.
   - **Size:** the smallest plan with 1 GB of memory and a public IPv4 address (IPv6 as well, if offered).
   - **Location:** in the EU, e.g. Helsinki.
   - **SSH key:** add your public key.
   - **Provider backups:** off, unless you want them (see [Backups](#backups)).
   - **User data / cloud-init:** paste the contents of [`deploy/cloud-init.yaml`](deploy/cloud-init.yaml). It installs Docker and git, enables the firewall and automatic security updates, and turns off password logins.
3. Note the server's IPv4 (and IPv6) address.

### 2. Point `santa.s11.no` at it

At the DNS provider for `s11.no`, add an `A` record for `santa` with the IPv4 address, plus an `AAAA` record if the server has IPv6. Use a short time to live (e.g. 300 seconds) so the record can be removed quickly later. Nothing else in `s11.no` changes.

### 3. Install the app

```sh
ssh root@santa.s11.no
cloud-init status --wait          # until setup has finished
git clone https://github.com/stain/secret-santa.git /opt/secret-santa
cd /opt/secret-santa
cp .env.example .env && chmod 600 .env
openssl rand -base64 24           # use this as ADMIN_PASSWORD
nano .env                         # set ADMIN_PASSWORD, check DOMAIN, PUBLIC_URL and HOSTING_*
docker compose up -d --build
docker compose logs -f            # wait for "Secret Santa listening"; Caddy gets the certificate
```

If the repository is private, cloning needs read access: create an SSH key on the server (`ssh-keygen -t ed25519`), add its public key to the GitHub repository as a **read-only deploy key**, and clone `git@github.com:stain/secret-santa.git` instead.

`HOSTING_PROVIDER` and `HOSTING_LOCATION` appear in the privacy notice, e.g. `UpCloud Ltd` and `Helsinki, Finland`.

### 4. Check it, then go live

1. Open `https://santa.s11.no/admin` and log in with any user name and `ADMIN_PASSWORD`.
2. Fill in the **data controller** (name and contact). The privacy notice and every participant page show it.
3. Make a throwaway group with three test addresses, draw, open a private link, add a wish with a product link, and check the photo and price appear. Then delete the group.
4. Optionally, run the access tests against the live site from your own machine: `BASE_URL=https://santa.s11.no ADMIN_PASSWORD=… npm test`. They create and delete a temporary group.
5. Create the real groups, set each group's end date (default 31 January), and send the links.

## Running it

| Task | Command (in `/opt/secret-santa`) |
|---|---|
| See logs | `docker compose logs -f` (add `app` or `caddy` for one) |
| Status | `docker compose ps` |
| Deploy a new version | `git pull && docker compose up -d --build` |
| Also update Node and Caddy images | `docker compose up -d --build --pull always` |
| Restart | `docker compose restart` |
| Stop | `docker compose down` (data stays in the volumes) |

- **Updates:** the server installs security updates every night, and reboots at 04:30 UTC when an update needs it. The containers start again by themselves.
- **Logs:** both containers log to stdout/stderr, which Docker keeps, rotated by size (3 × 10 MB per container), so there's no logrotate to configure. Neither logs individual requests, so private links and IP addresses never end up in logs. Keep it that way.

## Backups

**Built in: nightly SQL dumps.** Every night the app writes `santa-YYYY-MM-DD.sql.gz`, a plain, compressed SQL dump, to the `data` volume. It keeps the last 7 (`BACKUP_DAYS`). This protects against mistakes, such as a group deleted by accident, but not against losing the server, because the dumps are on the same disk.

**Copying the latest one off the server** now and then covers that, and is plenty for two months. Run this on your own machine:

```sh
ssh root@santa.s11.no 'cd /opt/secret-santa && docker compose exec -T app sh -c "cat /data/backups/\$(ls /data/backups | tail -1)"' > santa-latest.sql.gz
```

Treat copies as personal data: keep them private, and delete them when the season's data is deleted.

**Restoring** a dump, on the server in `/opt/secret-santa`:

```sh
gunzip -c santa-2026-12-24.sql.gz | sqlite3 restored.db     # check it: sqlite3 restored.db 'select name from chains'
docker compose stop app
# Write it into the data volume as the app's own user, replacing the old database:
docker compose run --rm -T --no-deps --entrypoint sh app \
  -c 'rm -f /data/santa.db-wal /data/santa.db-shm && cat > /data/santa.db' < restored.db
docker compose start app && rm restored.db
```

To get a dump from the server's backups first: `docker compose exec -T app cat /data/backups/santa-2026-12-24.sql.gz > santa-2026-12-24.sql.gz`.

**Provider backups** (whole-disk copies, optional): UpCloud's daily backup costs about 10% extra, and Hetzner's 7-day backups about 20% extra. They let you restore the whole server after a disaster. They also keep copies of personal data outside the app's control, so if you turn them on, keep them to 7 days or fewer (the privacy notice says backups are kept up to 7 days) and check they're deleted with the server.

## Personal data (GDPR)

The app is built to be run in line with the GDPR; whoever runs it is the **data controller**. Before going live:

- **Name the data controller** (name and contact) on the admin home page; it's shown in the privacy notice at `/privacy` and on every participant's page.
- **Set the hosting provider and location** in `.env` (`HOSTING_PROVIDER`, `HOSTING_LOCATION`); the privacy notice names them as the processor.
- **Accept the provider's data processing agreement:** UpCloud and Hetzner both offer one in their terms or console. Choose an EU location.
- **Keep backups to 7 days or fewer**, as the notice says.
- **Answer participants' requests:**
  - **correcting a name or email:** the admin page's "Edit";
  - **removing someone:** "Remove", which deletes their wishes too;
  - **unsuitable wishes:** "Review" then "Clear all their wishes";
  - **their own data:** participants download it themselves from their page.

What the app does by itself:
- **Deletion:** removes each group, with all its participants and wishes, the day after its end date.
- **Short-lived lookup data:** keeps product lookups and lookup records for one day.
- **Nothing in the browser goes elsewhere:** no IP addresses are stored, and no analytics or third-party content is loaded.
- **Hostnames only:** sends linked websites' names (never the full link) to Cloudflare's family-friendly DNS check, and nothing personal to the exchange-rate service.

## End of season: taking it down

After the last group's end date has passed (31 January by default), the app has already deleted the groups' data. Then:

1. Optionally, keep anonymous statistics (e.g. the number of groups) and nothing else.
2. **Delete the server** at the provider, along with any snapshots or backups. That deletes the volumes, the dumps and the certificates. Check that billing has stopped.
3. **Remove the `santa` DNS records** from `s11.no`.
4. Delete any backup copies you downloaded.
5. With UpCloud, any balance left over stays on the account (it may not be refundable).

## Troubleshooting

- **No certificate / site not reachable:** check the DNS record points at the server (`dig santa.s11.no`), that ports 80 and 443 are open (`ufw status`), and look at `docker compose logs caddy`.
- **"ADMIN_PASSWORD must be set":** fill in `.env`, then `docker compose up -d`.
- **Product lookups find nothing:** some shops (Amazon in particular) sometimes block automated requests; the wish is still saved. Check the server can reach the internet: `docker compose exec app node -e "fetch('https://example.org').then(r=>console.log(r.status))"`.
- **Out of balance (UpCloud):** top up in the console. The data is on the server's disk, so as long as the server wasn't deleted, nothing is lost.
