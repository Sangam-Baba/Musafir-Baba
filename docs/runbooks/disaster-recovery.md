# Disaster recovery — B2B + hotel system

Target: lose at most **1 hour** of data (RPO) and be back within **1 hour** (RTO).

## 1. What is backed up

| Backup | What | How often | Command |
| --- | --- | --- | --- |
| Full server | The whole MusafirBaba MongoDB (website, apps **and** every B2B collection), CRM, Algebrians, server config | daily | `npm run backup:server` (repo root) — see `docs/SERVER_BACKUP_AND_RESTORE.md` |
| B2B only | Every B2B collection (prefixes `id_ org_ acl_ kyc_ file_ aud_ htl_ inv_ prc_ ord_ hbk_ wal_ pay_ ntf_ mtr_ sub_ bil_ api_ whk_ doc_ rpt_ core_ rt_`) | **hourly** (cron on the Mac or a small server job) | `bash backend/scripts/b2b/backup-b2b.sh` |
| Files | KYC documents and hotel photos | continuous | Cloudflare R2 (versioned bucket) |

Backups contain customer data and secrets: keep `server-backups/` private and encrypted.

## 2. The drill (do it before launch, then every 3 months)

Never restore into the live database for a drill. Use a fresh container.

1. **Start a fresh MongoDB** next to the live one (same version, 8.0, standalone):
   ```bash
   ssh 3mongoose 'docker run -d --name mongo-drill -e MONGO_INITDB_ROOT_USERNAME=drill -e MONGO_INITDB_ROOT_PASSWORD=drill-pass mongo:8.0'
   ```
   Write down the time: **T0**.
2. **Restore** the latest full backup, then the latest B2B backup on top (newer B2B data wins):
   ```bash
   B=server-backups/<latest full>; H=server-backups/<latest b2b-…>
   cat $B/musafirbaba-mongo.archive.gz | ssh 3mongoose 'docker exec -i mongo-drill mongorestore -u drill -p drill-pass --authenticationDatabase admin --archive --gzip --drop'
   cat $H/b2b.archive.gz           | ssh 3mongoose 'docker exec -i mongo-drill mongorestore -u drill -p drill-pass --authenticationDatabase admin --archive --gzip --drop'
   ```
3. **Indexes and new collections** (repeat-safe):
   ```bash
   ssh 3mongoose 'docker run --rm --network container:mongo-drill -e MONGO_URI="mongodb://drill:drill-pass@127.0.0.1:27017/test?authSource=admin" musafirbaba-backend node src/b2b/migrate.js'
   ```
4. **Safety checks** — rooms, ledger, orders, invoice numbers (read-only; exit 0 = clean):
   ```bash
   ssh 3mongoose 'docker run --rm --network container:mongo-drill -e MONGO_URI="mongodb://drill:drill-pass@127.0.0.1:27017/test?authSource=admin" musafirbaba-backend node scripts/b2b/check-invariants.js'
   ```
5. **The gap** between the backup and the failure: start a backend against the drill database with `B2B_BACKGROUND=true` for 15 minutes — the reconciler finishes or undoes anything left half-way (holds, orders, cancellations, payouts), the payment poller asks PayU about every open payment, and the morning PayU settlement file is matched again. Check **Admin → B2B → Finance → Reconciliation** and **System health**.
6. **Smoke test**: `/api/v1/health` answers `ok`; sign in to the business area; open a booking, a voucher, the wallet statement; run a search.
7. Write down the time: **T1**. RTO = T1 − T0. RPO = failure time − time of the B2B backup used. Both must be ≤ 1 hour.
8. **Clean up**: `ssh 3mongoose 'docker rm -f mongo-drill'`.

## 3. A real failure

1. Status page: "Bookings paused — we are restoring service" (website and business area).
2. Switch off new money flows while restoring: `B2B_ORDERS_ENABLED=false`, `B2B_WALLET_ENABLED=false`, `B2B_API_ENABLED=false` (the website's existing parts keep their own switches).
3. Follow the drill steps 1–6, but restore into the live container only after the drill database passes step 4.
4. Turn the switches back on one by one; watch **System health** for 1 hour.
5. Incident report within 24 hours (see `docs/runbooks/incidents.md`).

## 4. Drill log

| Date | Backup used | RPO | RTO | Problems found | By |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
