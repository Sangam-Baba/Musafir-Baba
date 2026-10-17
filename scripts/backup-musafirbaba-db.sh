#!/bin/bash
# Backup of ONLY the MusafirBaba live database (production MongoDB on the
# 3mongoose server, container "musafirbaba-mongo") to this Mac.
#
#   Run:        npm run backup:db        (from the repo root)
#   Saved as:   ./server-backups/musafirbaba-db/<date_time>.archive.gz   (git-ignored)
#   Log:        ./server-backups/musafirbaba-db/backup.log
#   Restore:    see docs/SERVER_BACKUP_AND_RESTORE.md, section 4.1 / 4.2
#               (use this file in place of musafirbaba-mongo.archive.gz)
#
# Read-only on the server: it only runs mongodump. The DB password is never
# stored here; mongodump runs inside the container with the container's own
# login. Logs in with the key ~/.ssh/server_backup_ed25519.

set -uo pipefail

HOST="3mongoose"
KEY="$HOME/.ssh/server_backup_ed25519"
ROOT="${BACKUP_DIR:-$PWD/server-backups}/musafirbaba-db"
KEEP_DAYS=14
STAMP="$(date +%Y-%m-%d_%H%M)"
FILE="$ROOT/$STAMP.archive.gz"
LOG="$ROOT/backup.log"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }
notify() { osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true; }

mkdir -p "$ROOT"
log "MusafirBaba DB backup started -> $FILE"

if ssh -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=30 -o ServerAliveInterval=30 "$HOST" \
     'docker exec musafirbaba-mongo sh -c '\''mongodump --quiet --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip'\''' \
     > "$FILE" 2>>"$LOG" \
   && [ -s "$FILE" ] && gzip -t "$FILE" 2>/dev/null; then
  # Count collections from the archive header (offline check that it's a real dump).
  COLLS=$(gzip -dc "$FILE" | head -c 1000000 | LC_ALL=C tr -c '[:print:]' '\n' | grep -E '^.{3,60}$' | awk 'p=="collection" && $0!="test"{print} {p=$0}' | sort -u | wc -l | tr -d ' ')
  log "OK: $(du -h "$FILE" | cut -f1 | tr -d ' '), $COLLS collections"
  find "$ROOT" -maxdepth 1 -name '20*.archive.gz' -mtime +"$KEEP_DAYS" -print -delete | while read -r f; do log "Removed old backup $f"; done
  notify "MusafirBaba DB backup done" "$COLLS collections saved ($STAMP)"
  exit 0
else
  rm -f "$FILE"
  log "FAILED (see messages above). Is the server/tunnel up? Try: ssh 3mongoose 'docker ps'"
  notify "MusafirBaba DB backup FAILED" "See server-backups/musafirbaba-db/backup.log"
  exit 1
fi
