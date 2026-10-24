# Guide de Déploiement - UniSphere AI

Ce document détaille les étapes pour déployer la plateforme **UniSphere AI** en production.

---

## Architecture de l'application

- **Frontend** : Next.js 16 (React 19) sur le port `3000`
- **Backend** : FastAPI (Python 3.11, Uvicorn, SQLAlchemy) sur le port `8000`
- **Base de données** : PostgreSQL 15+ (port `5432`) ou SQLite locale pour tests
- **Stockage** : Volumes persistants pour les fichiers (`/uploads`) et les QR codes (`/qr_codes`)

---

## Option 1 : Déploiement Docker & Docker Compose (Recommandé)

### 1. Prérequis
- Docker Engine version 24+
- Docker Compose v2+

### 2. Configuration des variables d'environnement
Copiez le fichier d'exemple et renseignez vos secrets :
```bash
cp .env.example .env
```
Modifiez les variables dans `.env` :
- `SECRET_KEY` : Clé secrète robuste pour les tokens JWT
- `POSTGRES_PASSWORD` : Mot de passe sécurisé pour la base de données
- `FRONTEND_URL` : URL de votre domaine public (ex: `https://unisphere.votre-domaine.com`)
- `NEXT_PUBLIC_API_URL` : URL de l'API (ex: `https://api.votre-domaine.com` ou même domaine via proxy)
- `OPENAI_API_KEY` : Clé API OpenAI pour l'assistant IA
- `SMTP_*` : Identifiants pour l'envoi d'e-mails (Gmail, Brevo, Sendgrid, etc.)

### 3. Lancer les conteneurs
```bash
docker compose up -d --build
```

### 4. Vérifier l'état des services
```bash
docker compose ps
docker compose logs -f
```

### 5. Initialiser / Réinitialiser les données (Optionnel)
Pour initialiser l'université et les comptes de démonstration :
```bash
docker compose exec backend python seed_unisphereschool.py
```

---

## Option 2 : Déploiement sur Serveur Dédié / VPS (Ubuntu 22.04 / 24.04)

### 1. Installation des dépendances système
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.11 python3.11-venv python3-pip nodejs npm postgresql nginx certbot python3-certbot-nginx
```

### 2. Configuration PostgreSQL
```bash
sudo -u postgres psql
CREATE DATABASE unisphere_ai;
CREATE USER unisphere WITH PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE unisphere_ai TO unisphere;
\q
```

### 3. Configuration et Démarrage du Backend
```bash
cd /opt/UniSphere_AI/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Configurer .env
cp .env.example .env
# Renseigner DATABASE_URL=postgresql://unisphere:votre_mot_de_passe_securise@localhost:5432/unisphere_ai

# Service systemd pour le backend (/etc/systemd/system/unisphere-backend.service)
```

Exemple d'unité systemd pour le backend :
```ini
[Unit]
Description=UniSphere AI Backend FastAPI
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/opt/UniSphere_AI/backend
EnvironmentFile=/opt/UniSphere_AI/backend/.env
ExecStart=/opt/UniSphere_AI/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

### 4. Configuration et Démarrage du Frontend
```bash
cd /opt/UniSphere_AI/frontend
npm ci
npm run build

# Service systemd pour le frontend (/etc/systemd/system/unisphere-frontend.service)
```

Exemple d'unité systemd pour le frontend :
```ini
[Unit]
Description=UniSphere AI Frontend Next.js
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/UniSphere_AI/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=BACKEND_INTERNAL_URL=http://127.0.0.1:8000
ExecStart=/usr/bin/npm run start
Restart=always

[Install]
WantedBy=multi-user.target
```

### 5. Configuration Nginx (Reverse Proxy & SSL)
Créez `/etc/nginx/sites-available/unisphere.conf` :
```nginx
server {
    server_name unisphere.votre-domaine.com;

    client_max_body_size 20M;

    # Frontend Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API direct
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads & QR Codes
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
    }
    location /qr_codes/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

Activer et sécuriser avec HTTPS (Certbot) :
```bash
sudo ln -s /etc/nginx/sites-available/unisphere.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d unisphere.votre-domaine.com
```

---

## Endpoints de Santé et Surveillance

- Santé générale : `GET /health` -> `{"status": "healthy"}`
- Santé API v1 : `GET /api/v1/health` -> `{"status": "healthy"}`
- Documentation Swagger API : `GET /docs` (Désactivable en production si souhaité)
