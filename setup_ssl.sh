#!/bin/bash
set -e

DOMAIN="unisphere-ai.com"
EMAIL="chakirunisphereai@gmail.com"

echo "=========================================================="
echo "🔒 Configuration SSL & HTTPS pour $DOMAIN"
echo "=========================================================="

# 1. Créer les répertoires nécessaires sur l'hôte
mkdir -p /etc/letsencrypt /var/lib/letsencrypt /var/www/certbot

# 2. Libérer temporairement le port 80
echo "🛑 Arrêt temporaire du conteneur Nginx pour la certification Let's Encrypt..."
docker compose stop nginx

# 3. Génération du certificat officiel Let's Encrypt
echo "🔑 Obtention du certificat SSL pour $DOMAIN et www.$DOMAIN..."
docker run --rm \
    -p 80:80 \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/lib/letsencrypt:/var/lib/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive

# 4. Activer la configuration Nginx avec SSL
echo "📋 Activation de la configuration Nginx sécurisée (HTTPS 443)..."
cp ./nginx/nginx.ssl.conf ./nginx/nginx.conf

# 5. Redémarrer Nginx
echo "🚀 Démarrage du conteneur Nginx avec HTTPS actif..."
docker compose up -d nginx

echo "=========================================================="
echo "✅ Félicitations ! Votre site UniSphere AI est maintenant 100% sécurisé :"
echo "👉 https://$DOMAIN"
echo "👉 https://www.unisphere-ai.com"
echo "=========================================================="
