#!/bin/bash
# ==============================================================================
# UniSphere AI - Script Automatisé de Déploiement en Production (Ubuntu 24.04 LTS)
# Serveur VPS : 169.58.101.183
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Début du déploiement automatique de UniSphere AI"
echo "=========================================================="

# 1. Vérification des droits root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté en tant que root."
  exit 1
fi

# 2. Mise à jour du système & Dépendances
echo "📦 Mise à jour des paquets Ubuntu..."
apt-get update -y
apt-get install -y curl git ufw fail2ban htop rsync

# 3. Configuration du Pare-feu UFW
echo "🛡️ Configuration de la sécurité réseau (Pare-feu UFW)..."
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Nginx'
ufw allow 443/tcp comment 'HTTPS SSL'
ufw --force enable

# 4. Installation de Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 Installation du moteur Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm -f get-docker.sh
else
    echo "✅ Docker est déjà installé."
fi

# 5. Répertoire applicatif
APP_DIR="/opt/unisphere_ai"
echo "📂 Préparation du dossier applicatif dans $APP_DIR..."

if [ ! -d "$APP_DIR" ]; then
    git clone https://github.com/Moussa12312/Unisphere_AI.git "$APP_DIR"
else
    cd "$APP_DIR"
    git fetch origin main
    git reset --hard origin/main
fi

cd "$APP_DIR"

# 6. Gestion sécurisée des clés secrètes (.env)
if [ ! -f "$APP_DIR/.env" ]; then
    echo "🔐 Génération automatique des clés secrètes chiffrées pour la production..."
    AUTO_SECRET_KEY=$(openssl rand -hex 32)
    AUTO_DB_PASS=$(openssl rand -hex 24)

    cat << EOF > "$APP_DIR/.env"
# ==========================================================
# UniSphere AI - Fichier de Secrets de Production (VPS)
# ==========================================================

# Base de Données PostgreSQL
POSTGRES_USER=unisphere_admin
POSTGRES_PASSWORD=$AUTO_DB_PASS
POSTGRES_DB=unisphere_db
POSTGRES_PORT=5432

# Clé Maîtresse JWT (Chiffrement des sessions et tokens d'authentification)
SECRET_KEY=$AUTO_SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Réseau & Domaine
FRONTEND_URL=http://169.58.101.183
NEXT_PUBLIC_API_URL=

# Service Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@unisphere.ai

# Assistant IA
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

ENVIRONMENT=production
EOF
    chmod 600 "$APP_DIR/.env"
    echo "✅ Fichier .env créé avec des clés cryptographiques uniques et incassables !"
else
    echo "✅ Le fichier .env existant a été conservé intact."
fi

# 7. Création des dossiers de persistance
mkdir -p uploads qr_codes /var/backups/unisphere

# 8. Lancement des conteneurs via Docker Compose
echo "🏗️ Construction et démarrage des conteneurs (PostgreSQL, Backend, Frontend, Nginx)..."
docker compose down || true
docker compose --env-file "$APP_DIR/.env" up -d --build

# 8. Attente de la disponibilité de la base de données
echo "⏳ Vérification de la disponibilité de PostgreSQL..."
sleep 10
docker exec unisphere_postgres pg_isready -U unisphere_admin -d unisphere_db

# 9. Configuration du script de sauvegarde quotidienne automatique
cat << 'EOF' > /usr/local/bin/backup_unisphere.sh
#!/bin/bash
BACKUP_DIR="/var/backups/unisphere"
DATE=$(date +\%Y\%m\%d_\%H\%M\%S)
mkdir -p "$BACKUP_DIR"

# Dump BDD PostgreSQL
docker exec unisphere_postgres pg_dump -U unisphere_admin unisphere_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Archive uploads et médias
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /opt/unisphere_ai uploads

# Rétention : supprimer les sauvegardes de plus de 14 jours
find "$BACKUP_DIR" -type f -mtime +14 -delete
EOF

chmod +x /usr/local/bin/backup_unisphere.sh

# Ajouter au cron (sauvegarde chaque nuit à 03h00)
(crontab -l 2>/dev/null | grep -v "backup_unisphere.sh" ; echo "0 3 * * * /usr/local/bin/backup_unisphere.sh > /dev/null 2>&1") | crontab -

echo "=========================================================="
echo "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
echo "=========================================================="
echo "🌐 Votre application est accessible sur : http://169.58.101.183"
echo "📚 Documentation API Swagger : http://169.58.101.183/docs"
echo "💾 Sauvegardes automatiques configurées dans /var/backups/unisphere"
echo "=========================================================="
