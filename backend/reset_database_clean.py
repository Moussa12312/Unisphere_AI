import os
import sys
import shutil

sys.path.insert(0, r"c:\UniSphere_AI\backend")
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from sqlalchemy import text, inspect
from app.database.connection import engine, SessionLocal, Base
from app.core.security import hash_password
from app.models.user import User

def reset_database():
    print("🔄 Début du nettoyage complet de la base de données...")
    db = SessionLocal()
    insp = inspect(engine)
    tables = insp.get_table_names()
    
    print(f"📋 Tables détectées ({len(tables)}) : {tables}")
    
    # 1. Désactiver temporairement les contraintes de clés étrangères (pour SQLite / Postgres)
    if "sqlite" in str(engine.url):
        db.execute(text("PRAGMA foreign_keys = OFF;"))
    
    # 2. Vider toutes les tables sauf 'subscription_plans'
    for table in tables:
        if table == "subscription_plans":
            continue
        try:
            db.execute(text(f"DELETE FROM {table};"))
            print(f"   🗑️ Table vidée : {table}")
        except Exception as e:
            print(f"   ⚠️ Erreur vidage table {table}: {e}")
            
    # Réactiver les contraintes
    if "sqlite" in str(engine.url):
        db.execute(text("PRAGMA foreign_keys = ON;"))
        
    db.commit()
    print("✅ Toutes les tables ont été réinitialisées.")
    
    # 3. Vérifier / insérer les plans d'abonnement SaaS standard si la table existe
    if "subscription_plans" in tables:
        existing_plans = db.execute(text("SELECT COUNT(*) FROM subscription_plans;")).scalar()
        if existing_plans == 0:
            plans_data = [
                ("trial", "Offre Essai", 0.0, 14, 50, "Offre d'essai gratuit de 14 jours"),
                ("basic", "Formule Starter", 50000.0, 30, 200, "Idéal pour petites écoles"),
                ("pro", "Formule Professionnelle", 150000.0, 30, 1000, "Gestion académique complète LMD"),
                ("enterprise", "Formule Entreprise", 300000.0, 30, 10000, "Grands campus universitaires")
            ]
            for name, dname, price, dur, max_s, desc in plans_data:
                db.execute(text("""
                    INSERT INTO subscription_plans (name, price, duration_days, max_students, description, is_active)
                    VALUES (:name, :price, :duration_days, :max_students, :description, 1);
                """), {
                    "name": name,
                    "price": price,
                    "duration_days": dur,
                    "max_students": max_s,
                    "description": desc
                })
            db.commit()
            print("✅ Plans d'abonnement SaaS standard initialisés.")
        else:
            print(f"ℹ️ {existing_plans} plans d'abonnement présents.")
        
    # 4. Créer le compte SUPER ADMIN unique et propre
    super_admin_email = "superadmin@unisphere.ai"
    super_admin_pass = "SuperAdmin2026!"
    
    super_admin = User(
        full_name="Moussa Coulibaly",
        email=super_admin_email,
        hashed_password=hash_password(super_admin_pass),
        role="super_admin",
        phone="+223 70 00 00 00",
        is_active=True,
        is_email_verified=True,
        university_id=None
    )
    db.add(super_admin)
    db.commit()
    db.refresh(super_admin)
    print(f"👑 Compte Super Admin créé avec succès :")
    print(f"   - ID : {super_admin.id}")
    print(f"   - Nom : {super_admin.full_name}")
    print(f"   - Email : {super_admin.email}")
    print(f"   - Rôle : {super_admin.role}")
    print(f"   - Mot de passe : {super_admin_pass}")
    
    # 5. Nettoyer les fichiers téléversés résiduels dans uploads et qr_codes
    base_dir = r"c:\UniSphere_AI\backend"
    for folder_name in ["uploads", "qr_codes"]:
        target_dir = os.path.join(base_dir, folder_name)
        if os.path.exists(target_dir):
            for item in os.listdir(target_dir):
                item_path = os.path.join(target_dir, item)
                if item == ".gitkeep":
                    continue
                try:
                    if os.path.isfile(item_path):
                        os.remove(item_path)
                    elif os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                except Exception as e:
                    print(f"   ⚠️ Impossible de supprimer {item_path}: {e}")
        os.makedirs(target_dir, exist_ok=True)
        # Assurer qu'il y a un .gitkeep pour éviter tout dossier vide
        gitkeep = os.path.join(target_dir, ".gitkeep")
        if not os.path.exists(gitkeep):
            with open(gitkeep, "w") as f:
                f.write("")
                
    # Créer les sous-dossiers requis avec un .gitkeep dans chacun
    for sub in ["logos", "courses", "documents", "materials", "student_documents", "temp_scans", "dossier_etudiant"]:
        sdir = os.path.join(base_dir, "uploads", sub)
        os.makedirs(sdir, exist_ok=True)
        gkeep = os.path.join(sdir, ".gitkeep")
        if not os.path.exists(gkeep):
            with open(gkeep, "w") as f:
                f.write("")
                
    print("🧹 Répertoires uploads et qr_codes nettoyés et sécurisés (aucun dossier vide).")
    
    db.close()
    print("✨ Base de données totalement propre et prête pour les tests !")

if __name__ == "__main__":
    reset_database()
