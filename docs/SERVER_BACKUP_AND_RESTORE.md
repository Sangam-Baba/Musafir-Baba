# Server Backup & Restore

How to back up the production server (`3mongoose`) to your Mac, and how to restore it if something goes wrong.

> This is the **live server** backup. The older [DATABASE_BACKUP_GUIDE.md](../DATABASE_BACKUP_GUIDE.md) (`npm run backup` in `backend/`) backs up whatever database `backend/.env` points to (MongoDB Atlas), which is a different database.

---

## 1. What gets backed up

One command saves four files into `server-backups/<date_time>/` in the repo root:

| File | What it is | Size (Oct 2026) |
|---|---|---|
| `musafirbaba-mongo.archive.gz` | **MusafirBaba MongoDB**, the live database behind musafirbaba.com, the admin, MBGO and MBConnect (database `test`, 96 collections: bookings, rides, partners, riders, wallets, staff, blogs…) | ~37 MB |
| `crm-postgres.sql.gz` | **3mg Sales CRM** PostgreSQL | ~16 KB |
| `algebrians-mysql.sql.gz` | **Algebrians** website MySQL | ~3.5 MB |
| `server-config.tar.gz` | Server setup: docker-compose files, every `.env` (API keys, DB passwords), Cloudflare tunnel config | ~8 KB |

**Not included:**
- Code (it's on GitHub).
- Uploaded images and files (they're in Cloudflare R2).
- MongoDB Atlas (use the older guide).

> ⚠️ **These files contain customer data and secrets.** `server-backups/` is git-ignored, so it is never pushed. Don't copy it to shared or unencrypted cloud folders.

---

## 2. One-time setup (only on a new Mac)

Already done on Shubham's Mac. On a new machine:

1. **Install cloudflared.** The server is reached through a Cloudflare tunnel.
   ```bash
   brew install cloudflared
   ```
2. **Add the SSH alias** to `~/.ssh/config`:
   ```
   Host 3mongoose
       HostName ssh.3mongoose.online
       User shubham
       ProxyCommand /opt/homebrew/bin/cloudflared access ssh --hostname %h
   ```
3. **Create the backup key and authorize it.** The last step asks for the server password once.
   ```bash
   ssh-keygen -t ed25519 -N "" -C "server-backup@$(hostname -s)" -f ~/.ssh/server_backup_ed25519
   ssh 3mongoose "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys" < ~/.ssh/server_backup_ed25519.pub
   ```
4. **Test it.** This should print `ok` without asking for a password:
   ```bash
   ssh -i ~/.ssh/server_backup_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes 3mongoose 'echo ok'
   ```
5. Optional: install the MongoDB tools (only needed for local restore tests).
   ```bash
   brew tap mongodb/brew && brew install mongodb-database-tools
   ```

---

## 3. Take a backup

From the repo root:

```bash
npm run backup:server
```

- Takes about 25 seconds and doesn't ask for a password.
- You'll see a Mac notification when it finishes or fails.
- Output goes to `server-backups/2026-10-17_1115/` (date and time of the run).
- Log: `server-backups/backup.log`.
- Backups older than **14 days** are deleted automatically. Change `KEEP_DAYS` in `scripts/backup-server.sh` to keep more.
- To save somewhere else: `BACKUP_DIR=/Volumes/MyDrive/backups npm run backup:server`.

A good run looks like this:

```
MusafirBaba MongoDB: OK (37M)
CRM PostgreSQL: OK (16K)
Algebrians MySQL: OK (3.5M)
Server config: OK (8.0K)
=== Backup finished OK (40M)
```

### Only the MusafirBaba database

```bash
npm run backup:db
```

This saves just the live MusafirBaba MongoDB (about 15 seconds, ~37 MB) as `server-backups/musafirbaba-db/<date_time>.archive.gz`, and prints the number of collections as a check (expect ~96). It keeps 14 days of backups, and its log is `server-backups/musafirbaba-db/backup.log`. To restore one of these files, follow section 4.1 or 4.2 with this file in place of `musafirbaba-mongo.archive.gz`.

**When to take one:**
- Daily, by hand.
- Always before a deploy, before running migrations or bulk admin changes, before a server or OS update, and **before any restore**.

**How it works:**
- It logs in with the backup key.
- Each dump runs inside its own container, using that container's own DB login, so no database passwords are stored on your Mac.
- It checks that every file is complete before saying OK.

---

## 4. Restore

> 🛑 **Restoring replaces live data.** Before restoring:
> 1. Take a fresh backup (`npm run backup:server`) so you can undo the restore.
> 2. Double-check which backup folder you're restoring from.
> 3. Tell the team. The site or app may briefly show old data or errors.

All commands below run **from your Mac**, in the repo root. They stream the backup file to the server, so nothing needs copying first. Set the folder once:

```bash
B=server-backups/2026-10-17_1115      # ← the backup you want to restore
SSH="ssh -i $HOME/.ssh/server_backup_ed25519 -o IdentitiesOnly=yes 3mongoose"
```

### 4.1 MusafirBaba MongoDB: full restore

```bash
# 1. Stop the backend so nothing writes during the restore
$SSH 'docker stop musafirbaba-backend'

# 2. Restore (--drop replaces each collection with the backup's copy)
cat $B/musafirbaba-mongo.archive.gz | $SSH 'docker exec -i musafirbaba-mongo sh -c '\''mongorestore --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip --drop'\'''

# 3. Start the backend again
$SSH 'docker start musafirbaba-backend'
```

Check: `curl -s -o /dev/null -w "%{http_code}\n" https://musafirbabaserver.3mongoose.online/api/app-home` should print `200`.

### 4.2 MusafirBaba MongoDB: one collection only

For example, if someone deleted ride bookings by mistake, restore just `ridebookings`. Everything else stays as it is:

```bash
cat $B/musafirbaba-mongo.archive.gz | $SSH 'docker exec -i musafirbaba-mongo sh -c '\''mongorestore --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip --drop --nsInclude "test.ridebookings"'\'''
```

- Replace `ridebookings` with the collection you need.
- Several at once: repeat `--nsInclude "test.<name>"`.
- Without `--drop`, documents that still exist are kept and only the missing ones are added back.

To list the collections in a backup (works offline, no tools needed):

```bash
gzip -dc $B/musafirbaba-mongo.archive.gz | head -c 1000000 | LC_ALL=C tr -c '[:print:]' '\n' | grep -E '^.{3,60}$' | awk 'p=="collection" && $0!="test"{print} {p=$0}' | sort -u
```

### 4.3 CRM PostgreSQL

```bash
gunzip -c $B/crm-postgres.sql.gz | $SSH 'docker exec -i crm-db sh -c '\''psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'\'''
```

The dump uses `--clean --if-exists`, so it drops and recreates each table.

### 4.4 Algebrians MySQL

```bash
gunzip -c $B/algebrians-mysql.sql.gz | $SSH 'docker exec -i algebrians-db sh -c '\''MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'\'''
```

### 4.5 Server config files

These are only needed if the server's files were lost or broken. **Look before you overwrite:**

```bash
mkdir -p /tmp/cfg && tar -xzf $B/server-config.tar.gz -C /tmp/cfg && find /tmp/cfg -type f
```

To put one file back (example: the MusafirBaba backend `.env`):

```bash
$SSH 'cat > ~/server/docker/musafirbaba-backend/backend/.env' < /tmp/cfg/server/docker/musafirbaba-backend/backend/.env
$SSH 'cd ~/server/docker/musafirbaba-backend && docker compose up -d'
```

Delete `/tmp/cfg` afterwards: `rm -rf /tmp/cfg`. It contains secrets.

---

## 5. Rebuilding on a brand-new server

If the machine is lost:

1. Install Docker, cloudflared and git on the new server.
2. Extract `server-config.tar.gz` into the user's home. This puts back the compose files, the `.env` files and `~/.cloudflared/config.yml`. The tunnel's credentials file is **not** in the backup; recreate or re-route the tunnel in the Cloudflare dashboard (Zero Trust → Networks → Tunnels).
3. Clone the app repos into the same folders (e.g. `~/server/docker/musafirbaba-backend` from this GitHub repo).
4. Start the database containers first (`docker compose up -d` in each folder), then restore each database as in section 4.
5. Start the apps, then check the sites (section 7).

---

## 6. Test a backup (recommended once a month)

A backup you've never restored might not work. To test safely **on your Mac, without touching the server**:

```bash
docker run -d --name restore-test -p 27999:27017 mongo:8.0
mongorestore --uri "mongodb://localhost:27999" --archive=server-backups/<folder>/musafirbaba-mongo.archive.gz --gzip
mongosh "mongodb://localhost:27999/test" --eval 'db.getCollectionNames().length'   # expect ~96
docker rm -f restore-test
```

> Never test-restore into the live server or into MongoDB Atlas.

---

## 7. Troubleshooting

| Problem | Cause / fix |
|---|---|
| `Permission denied (publickey)` | The backup key isn't on the server. Redo setup step 3. |
| Backup hangs or `Connection closed` | The Cloudflare tunnel or the server is down. Check `https://musafirbabaserver.3mongoose.online/api/app-home`: **530 / error 1033** means the tunnel is down (`sudo systemctl restart cloudflared` on the server); **502** means the app or database is down (`docker ps -a` on the server). |
| `MusafirBaba MongoDB: FAILED` and the site shows 502 | The Mongo container isn't running. On the server: `docker logs --tail 20 musafirbaba-mongo`. If it says *"Linux kernel versions 6.19 and newer has a known incompatibility"*, the server booted a new kernel. See below. |
| One database fails, the others are OK | That container is stopped: `ssh 3mongoose 'docker ps -a'`, then `docker start <name>`. |

### Known issue: MongoDB vs. new Linux kernels (Oct 2026)

MongoDB 8.0 won't start on Linux kernel 6.19 or newer ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)). On 17 Oct 2026 an automatic update installed kernel 7.0 and the site went down. The server is now set to **always boot kernel 6.14**:

- `/etc/default/grub` has `GRUB_DEFAULT` pointing at the 6.14 entry.
- The original file is at `/etc/default/grub.bak-20261017`.

New kernels can still be installed by updates, but they won't be used. Once MongoDB ships a fix, restore the backup file, run `sudo update-grub` and reboot. **Take a backup before doing that.**
