import os
import sys
import shutil

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from sqlalchemy import text, inspect
from app.database.connection import engine, SessionLocal, Base
from app.core.security import hash_password
from app.models.user import User

def reset_database():
    print("==========================================================")
    print("🔄 Remise à zéro totale de la base de données (Zero Mock)")
    print("==========================================================")
    db = SessionLocal()
    insp = inspect(engine)
    tables = insp.get_table_names()
    
    print(f"📋 Tables détectées ({len(tables)})")
    
    # 1. Vider toutes les tables sauf 'subscription_plans'
    is_postgres = "postgres" in str(engine.url) or "postgresql" in str(engine.url)
    if is_postgres:
        tables_to_truncate = [f'"{t}"' for t in tables if t != "subscription_plans"]
        if tables_to_truncate:
            joined = ", ".join(tables_to_truncate)
            try:
                db.rollback()
                db.execute(text(f"TRUNCATE TABLE {joined} RESTART IDENTITY CASCADE;"))
                db.commit()
                print("   🗑️ Toutes les tables PostgreSQL vidées (TRUNCATE CASCADE).")
            except Exception as e:
                db.rollback()
                print(f"   ⚠️ Erreur TRUNCATE PostgreSQL: {e}")
    else:
        if "sqlite" in str(engine.url):
            db.execute(text("PRAGMA foreign_keys = OFF;"))
        for table in tables:
            if table == "subscription_plans":
                continue
            try:
                db.execute(text(f'DELETE FROM "{table}";'))
            except Exception as e:
                print(f"   ⚠️ Erreur vidage table {table}: {e}")
        try:
            db.execute(text("DELETE FROM sqlite_sequence WHERE name != 'subscription_plans';"))
        except Exception:
            pass
        if "sqlite" in str(engine.url):
            db.execute(text("PRAGMA foreign_keys = ON;"))
        db.commit()
        print("   🗑️ Toutes les tables SQLite vidées.")

    # 2. Vérifier / insérer les plans d'abonnement SaaS standard
    if "subscription_plans" in tables:
        try:
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
                print("   ✅ Plans d'abonnement SaaS initialisés.")
        except Exception as e:
            db.rollback()
            print(f"   ⚠️ Erreur subscription_plans: {e}")
        
    # 3. Créer le compte SUPER ADMIN unique (aucun autre compte)
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "chakirunisphereai@gmail.com")
    super_admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "f7@x4-Dx5K6xe")
    
    try:
        super_admin = User(
            full_name="Super Admin UniSphere",
            email=super_admin_email,
            hashed_password=hash_password(super_admin_pass),
            role="super_admin",
            phone="+223 73343493",
            is_active=True,
            is_email_verified=True,
            university_id=None
        )
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        print(f"   👑 Super Admin unique configuré :")
        print(f"      - Email       : {super_admin.email}")
        print(f"      - Rôle        : {super_admin.role}")
        print(f"      - Mot de passe: {super_admin_pass}")
    except Exception as e:
        db.rollback()
        print(f"   ⚠️ Erreur création Super Admin: {e}")
    
    # 4. Nettoyer les fichiers téléversés de test
    for folder_name in ["uploads", "qr_codes"]:
        target_dir = os.path.join(backend_dir, folder_name)
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
                except Exception:
                    pass
        os.makedirs(target_dir, exist_ok=True)
        gitkeep = os.path.join(target_dir, ".gitkeep")
        if not os.path.exists(gitkeep):
            with open(gitkeep, "w") as f:
                f.write("")

    print("   🧹 Dossiers uploads et qr_codes nettoyés.")
    
    # Synchronisation des fichiers db locaux si SQLite
    if "sqlite" in str(engine.url):
        root_db = os.path.join(os.path.dirname(backend_dir), "unisphere.db")
        backend_db = os.path.join(backend_dir, "unisphere.db")
        try:
            if os.path.exists(backend_db):
                shutil.copy2(backend_db, root_db)
        except Exception:
            pass

    # 5. Rapport de vérification finale
    print("==========================================================")
    print("📊 ÉTAT DE LA BASE APRÈS REMISE À ZÉRO :")
    try:
        users_count = db.execute(text("SELECT COUNT(*) FROM users;")).scalar()
        students_count = db.execute(text("SELECT COUNT(*) FROM students;")).scalar() if "students" in tables else 0
        universities_count = db.execute(text("SELECT COUNT(*) FROM universities;")).scalar() if "universities" in tables else 0
        print(f"   • Universités : {universities_count}")
        print(f"   • Étudiants   : {students_count}")
        print(f"   • Utilisateurs: {users_count} (SuperAdmin unique)")
        print("✅ Base vierge prête à l'emploi.")
    except Exception as e:
        print(f"   ⚠️ Erreur comptage: {e}")
    print("==========================================================")

    db.close()

if __name__ == "__main__":
    reset_database()
