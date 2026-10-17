#!/bin/bash
# Manual backup of the 3mongoose server (databases + server config) to this Mac.
#
#   Run:          npm run backup:server   (from the repo root)
#   Backups in:   ./server-backups/<date>/   (git-ignored, never pushed)
#   Log:          ./server-backups/backup.log
#
# What it saves (each as one compressed file):
#   musafirbaba-mongo.archive.gz  MusafirBaba MongoDB (all databases)  -> restore with mongorestore --gzip --archive
#   crm-postgres.sql.gz           3mg Sales CRM PostgreSQL             -> restore with psql
#   algebrians-mysql.sql.gz       Algebrians MySQL                     -> restore with mysql
#   server-config.tar.gz          docker-compose files, .env files, cloudflared config
#
# Database passwords are never stored here: each dump runs inside its own
# container and uses that container's own environment variables.
# Logs in with the dedicated key ~/.ssh/server_backup_ed25519.

set -uo pipefail

HOST="3mongoose"
KEY="$HOME/.ssh/server_backup_ed25519"
# Saves into ./server-backups of the folder it is run from (npm runs it from the repo root).
ROOT="${BACKUP_DIR:-$PWD/server-backups}"
KEEP_DAYS=14
STAMP="$(date +%Y-%m-%d_%H%M)"
DEST="$ROOT/$STAMP"
LOG="$ROOT/backup.log"

# launchd starts with a minimal PATH; cloudflared (used by the ssh config) lives here.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=30 -o ServerAliveInterval=30 "$HOST")

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }
notify() { osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true; }

mkdir -p "$DEST"
log "=== Backup started -> $DEST"

FAILED=()

# backup <name> <file> <remote command that writes the backup to stdout>
backup() {
  local name="$1" file="$DEST/$2" cmd="$3"
  log "$name: dumping..."
  if "${SSH[@]}" "$cmd" > "$file" 2>>"$LOG" && [ -s "$file" ] && gzip -t "$file" 2>/dev/null; then
    log "$name: OK ($(du -h "$file" | cut -f1 | tr -d ' '))"
  else
    log "$name: FAILED"
    FAILED+=("$name")
  fi
}

backup "MusafirBaba MongoDB" "musafirbaba-mongo.archive.gz" \
  'docker exec musafirbaba-mongo sh -c '\''mongodump --quiet --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip'\'''

backup "CRM PostgreSQL" "crm-postgres.sql.gz" \
  'docker exec crm-db sh -c '\''pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists'\'' | gzip'

backup "Algebrians MySQL" "algebrians-mysql.sql.gz" \
  'docker exec algebrians-db sh -c '\''MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --all-databases --single-transaction --routines --triggers --events'\'' | gzip'

backup "Server config" "server-config.tar.gz" \
  'cd ~ && tar -czf - --ignore-failed-read $(ls -d server/docker/*/docker-compose.y*ml server/docker/*/.env server/docker/*/*/.env server/apps/*/docker-compose.y*ml server/apps/*/.env server/apps/*/apps/*/.env .cloudflared/config.yml 2>/dev/null)'

# Keep the last $KEEP_DAYS days of backups.
find "$ROOT" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +"$KEEP_DAYS" -print -exec rm -rf {} + 2>/dev/null | while read -r d; do log "Removed old backup $d"; done

if [ ${#FAILED[@]} -eq 0 ]; then
  log "=== Backup finished OK ($(du -sh "$DEST" | cut -f1 | tr -d ' '))"
  notify "Server backup done" "All 4 backups saved ($STAMP)"
  exit 0
else
  log "=== Backup finished WITH ERRORS: ${FAILED[*]}"
  notify "Server backup FAILED" "Failed: ${FAILED[*]} — see server-backups/backup.log"
  exit 1
fi
