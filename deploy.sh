#!/bin/bash
# ==============================================================================
# 🚀 UniSphere AI - Script de Déploiement Automatisé Production
# ==============================================================================

set -e

echo "=========================================================="
echo "      🚀 Déploiement de UniSphere AI en cours...         "
echo "=========================================================="

# 1. Vérification des prérequis
command -v docker >/dev/null 2>&1 || { echo "❌ Erreur: Docker n'est pas installé."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "❌ Erreur: Docker Compose n'est pas installé."; exit 1; }

# 2. Vérification du fichier d'environnement
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env absent. Création à partir de .env.example..."
    if [ -f backend/.env.example ]; then
        cp backend/.env.example .env
        echo "✅ Fichier .env initialisé. Pensez à ajuster vos mots de passe de production."
    fi
fi

# 3. Récupération des dernières modifications depuis Git
echo "📥 Récupération des dernières modifications (git pull)..."
git pull origin main

# 4. Reconstruction et redémarrage des conteneurs
echo "🔨 Construction et démarrage des conteneurs (Docker Compose)..."
docker compose down --remove-orphans
docker compose up -d --build

# 5. Attente de la disponibilité des services
echo "⏳ Vérification de l'état des conteneurs..."
sleep 10
docker compose ps

# 6. Vérification du statut de santé
echo "🔍 Vérification de la santé du Backend..."
curl -s http://127.0.0.1:8000/health || echo "⚠️ Le backend démarre encore..."

echo "=========================================================="
echo "  ✅ Déploiement terminé avec succès !"
echo "  🌐 Frontend : http://localhost:3000"
echo "  🔌 Backend API : http://localhost:8000 (Swagger: /docs)"
echo "=========================================================="
