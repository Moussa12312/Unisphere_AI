#!/usr/bin/env bash
# UniSphere AI - Automated Backup Script
# Usage: ./scripts/backup.sh

set -euo pipefail

BACKUP_DIR="/var/backups/unisphere"
PROJECT_DIR="/opt/unisphere_ai"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEST="$BACKUP_DIR/unisphere_backup_$TIMESTAMP.tar.gz"
TEMP_DIR="/tmp/unisphere_backup_$TIMESTAMP"

mkdir -p "$BACKUP_DIR"
mkdir -p "$TEMP_DIR"

echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] UniSphere AI Backup Start ==="

# 1. Backup SQLite Database
if [ -f "$PROJECT_DIR/backend/unisphere.db" ]; then
    echo "[+] Backing up SQLite database..."
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "$PROJECT_DIR/backend/unisphere.db" ".backup '$TEMP_DIR/unisphere.db'"
    else
        cp "$PROJECT_DIR/backend/unisphere.db" "$TEMP_DIR/unisphere.db"
    fi
fi

# 2. Backup PostgreSQL (if active)
if command -v pg_dump >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
    echo "[+] Backing up PostgreSQL database..."
    pg_dump "$DATABASE_URL" > "$TEMP_DIR/postgres_dump.sql" || true
fi

# 3. Backup Uploaded Files
if [ -d "$PROJECT_DIR/backend/uploads" ]; then
    echo "[+] Backing up uploads directory..."
    cp -r "$PROJECT_DIR/backend/uploads" "$TEMP_DIR/uploads"
fi

# 4. Backup Environment Config
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    echo "[+] Backing up backend .env..."
    cp "$PROJECT_DIR/backend/.env" "$TEMP_DIR/backend.env"
fi

# 5. Compress
echo "[+] Compressing backup archive to $DEST..."
tar -czf "$DEST" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

# 6. Rotate backups (keep last 7 days)
echo "[+] Purging backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "unisphere_backup_*.tar.gz" -mtime +7 -delete

echo "=== Backup completed successfully: $DEST ($(du -h "$DEST" | cut -f1)) ==="
