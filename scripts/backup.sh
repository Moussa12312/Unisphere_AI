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

# 1. Backup PostgreSQL from Docker container (Production stack)
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^unisphere_postgres$"; then
    echo "[+] Backing up Docker PostgreSQL database (unisphere_postgres)..."
    docker exec unisphere_postgres pg_dump -U "${POSTGRES_USER:-unisphere_admin}" "${POSTGRES_DB:-unisphere_db}" > "$TEMP_DIR/postgres_dump.sql" 2>/dev/null || {
        echo "[!] Default user dump failed, trying with postgres user..."
        docker exec unisphere_postgres pg_dump -U postgres "${POSTGRES_DB:-unisphere_db}" > "$TEMP_DIR/postgres_dump.sql" || true
    }
    if [ -s "$TEMP_DIR/postgres_dump.sql" ]; then
        echo "[+] PostgreSQL dump successfully generated ($(du -h "$TEMP_DIR/postgres_dump.sql" | cut -f1))."
    fi
elif command -v pg_dump >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
    echo "[+] Backing up host PostgreSQL database..."
    pg_dump "$DATABASE_URL" > "$TEMP_DIR/postgres_dump.sql" || true
fi

# 2. Backup SQLite Database (if active)
if [ -f "$PROJECT_DIR/backend/unisphere.db" ]; then
    echo "[+] Backing up SQLite database..."
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "$PROJECT_DIR/backend/unisphere.db" ".backup '$TEMP_DIR/unisphere.db'"
    else
        cp "$PROJECT_DIR/backend/unisphere.db" "$TEMP_DIR/unisphere.db"
    fi
fi

# 3. Backup Uploaded Files & QR codes (from Docker or Host)
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^unisphere_backend$"; then
    echo "[+] Copying uploads and qr_codes from unisphere_backend container..."
    docker cp unisphere_backend:/app/uploads "$TEMP_DIR/uploads" 2>/dev/null || true
    docker cp unisphere_backend:/app/qr_codes "$TEMP_DIR/qr_codes" 2>/dev/null || true
fi

if [ ! -d "$TEMP_DIR/uploads" ] && [ -d "$PROJECT_DIR/backend/uploads" ]; then
    echo "[+] Backing up host uploads directory..."
    cp -r "$PROJECT_DIR/backend/uploads" "$TEMP_DIR/uploads"
fi

if [ -d "$PROJECT_DIR/backend/qr_codes" ] && [ ! -d "$TEMP_DIR/qr_codes" ]; then
    cp -r "$PROJECT_DIR/backend/qr_codes" "$TEMP_DIR/qr_codes"
fi

# 4. Backup Environment Config
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    echo "[+] Backing up backend .env..."
    cp "$PROJECT_DIR/backend/.env" "$TEMP_DIR/backend.env"
fi
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$TEMP_DIR/root.env"
fi

# 5. Compress
echo "[+] Compressing backup archive to $DEST..."
tar -czf "$DEST" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

# 6. Rotate backups (keep last 7 days)
echo "[+] Purging backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "unisphere_backup_*.tar.gz" -mtime +7 -delete

echo "=== Backup completed successfully: $DEST ($(du -h "$DEST" | cut -f1)) ==="
