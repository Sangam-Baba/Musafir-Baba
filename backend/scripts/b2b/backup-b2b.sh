#!/usr/bin/env bash
# Backup of the B2B + hotel collections only (plan Stage 16 §2.5) — quick enough to run every hour, next to the daily
# full server backup (docs/SERVER_BACKUP_AND_RESTORE.md, which already includes these collections).
# Reads only. Saves server-backups/b2b-<date_time>/b2b.archive.gz on this Mac. Needs the `3mongoose` SSH alias and the
# backup key from docs/SERVER_BACKUP_AND_RESTORE.md §2.
#
#   bash backend/scripts/b2b/backup-b2b.sh            # from the repo root
#
# Restore (drill or real): docs/go-live/runbooks/disaster-recovery.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
OUT="$ROOT/server-backups/b2b-$STAMP"
SSH=(ssh -i "$HOME/.ssh/server_backup_ed25519" -o IdentitiesOnly=yes -o BatchMode=yes 3mongoose)
PREFIXES=(id org acl kyc file aud htl inv prc ord hbk wal pay ntf mtr sub bil api whk doc rpt core rt)

INCLUDES=""
for p in "${PREFIXES[@]}"; do INCLUDES="$INCLUDES --nsInclude 'test.${p}_*'"; done

mkdir -p "$OUT"
echo "Backing up the B2B collections to $OUT …"
"${SSH[@]}" "docker exec musafirbaba-mongo sh -c 'mongodump --username \"\$MONGO_INITDB_ROOT_USERNAME\" --password \"\$MONGO_INITDB_ROOT_PASSWORD\" --authenticationDatabase admin --db test $INCLUDES --archive --gzip'" > "$OUT/b2b.archive.gz"

SIZE="$(du -h "$OUT/b2b.archive.gz" | cut -f1)"
if [ ! -s "$OUT/b2b.archive.gz" ]; then echo "✗ backup is empty — check the server"; exit 1; fi
echo "✓ B2B collections saved ($SIZE). Keep this folder private: it contains customer data."
