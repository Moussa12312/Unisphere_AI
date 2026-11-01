"""
Script de diagnostic SMTP pour UniSphere AI.
Exécutez dans le conteneur backend :
docker compose exec backend python test_smtp.py
"""
import os
import sys
import smtplib
from email.mime.text import MIMEText

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "noreply@unisphere.ai")

print("🔍 Diagnostic SMTP UniSphere AI :")
print(f"   - Hôte     : {SMTP_HOST}")
print(f"   - Port     : {SMTP_PORT}")
print(f"   - Utilisateur : {SMTP_USER if SMTP_USER else '❌ NON CONFIGURÉ'}")
print(f"   - Mot de passe: {'********' if SMTP_PASSWORD else '❌ NON CONFIGURÉ'}")
print(f"   - Expéditeur : {SMTP_FROM}")
print("-" * 50)

if not SMTP_USER or not SMTP_PASSWORD:
    print("❌ Erreur : SMTP_USER ou SMTP_PASSWORD est vide.")
    print("💡 Pour Gmail, utilisez votre adresse et un 'Mot de passe d'application' de 16 caractères.")
    print("   Rendez-vous sur : https://myaccount.google.com/apppasswords")
    sys.exit(1)

try:
    print(f"⏳ Connexion à {SMTP_HOST}:{SMTP_PORT}...")
    if SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=12)
    else:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12)
        server.starttls()

    print("🔑 Authentification en cours...")
    server.login(SMTP_USER, SMTP_PASSWORD)
    print("✅ Authentification SMTP réussie !")

    # Envoi email de test
    msg = MIMEText("Ceci est un email de test pour valider l'envoi SMTP sur UniSphere AI.")
    msg["Subject"] = "UniSphere AI — Test d'envoi SMTP Réussi"
    msg["From"] = f"UniSphere AI <{SMTP_USER}>"
    msg["To"] = SMTP_USER

    server.sendmail(SMTP_USER, [SMTP_USER], msg.as_string())
    server.quit()

    print(f"🎉 Email de test envoyé avec succès à {SMTP_USER} !")
    print("Votre configuration SMTP est 100% opérationnelle.")
except Exception as e:
    print(f"❌ Échec de la connexion SMTP : {e}")
    if "Username and Password not accepted" in str(e):
        print("\n💡 Conseil Gmail :")
        print("   Google refuse votre mot de passe habituel.")
        print("   Vous devez activer la double authentification sur votre compte Google")
        print("   puis créer un 'Mot de passe d'application' (16 lettres) sur :")
        print("   https://myaccount.google.com/apppasswords")

