import os
from dotenv import load_dotenv

load_dotenv()

# ✅ Variables existantes
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/unisphere_ai")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# ✅ Ajoute ces lignes pour résoudre l'erreur
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")  # URL de ton backend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")  # Déjà dans ton .env

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY manquant : définis-le dans ton fichier .env (voir .env.example). "
        "Ne jamais coder cette valeur en dur dans le code source."
    )