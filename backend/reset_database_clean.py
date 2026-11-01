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
    print("🔄 Début du nettoyage complet de la base de données...")
    db = SessionLocal()
    insp = inspect(engine)
    tables = insp.get_table_names()
    
    print(f"📋 Tables détectées ({len(tables)}) : {tables}")
    
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
                print(f"   🗑️ Tables PostgreSQL vidées avec TRUNCATE CASCADE et RESTART IDENTITY.")
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
                print(f"   🗑️ Table vidée : {table}")
            except Exception as e:
                print(f"   ⚠️ Erreur vidage table {table}: {e}")
        if "sqlite" in str(engine.url):
            db.execute(text("PRAGMA foreign_keys = ON;"))
        db.commit()
        
    print("✅ Toutes les tables ont été réinitialisées.")
    
    # 2. Vérifier / insérer les plans d'abonnement SaaS standard si la table existe
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
                print("✅ Plans d'abonnement SaaS standard initialisés.")
            else:
                print(f"ℹ️ {existing_plans} plans d'abonnement présents.")
        except Exception as e:
            db.rollback()
            print(f"⚠️ Erreur vérification subscription_plans: {e}")
        
    # 3. Créer ou mettre à jour le compte SUPER ADMIN unique et propre
    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "chakirunisphereai@gmail.com")
    super_admin_pass = os.getenv("SUPER_ADMIN_PASSWORD", "f7@x4-Dx5K6xe")
    super_admin_phone = "+223 73343493"
    
    try:
        existing_admin = db.query(User).filter(User.email == super_admin_email).first()
        if existing_admin:
            existing_admin.full_name = "Moussa Coulibaly"
            existing_admin.hashed_password = hash_password(super_admin_pass)
            existing_admin.role = "super_admin"
            existing_admin.phone = super_admin_phone
            existing_admin.is_active = True
            existing_admin.is_email_verified = True
            existing_admin.university_id = None
            db.commit()
            db.refresh(existing_admin)
            super_admin = existing_admin
            print(f"👑 Compte Super Admin mis à jour avec succès :")
        else:
            super_admin = User(
                full_name="Moussa Coulibaly",
                email=super_admin_email,
                hashed_password=hash_password(super_admin_pass),
                role="super_admin",
                phone=super_admin_phone,
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
    except Exception as e:
        db.rollback()
        print(f"⚠️ Erreur création Super Admin: {e}")
    
    # 4. Assurer l'existence exclusive de l'Université ECOB (ID: 1)
    try:
        from app.models.university import University
        ecob = db.query(University).filter(
            (University.id == 1) | (University.name.ilike("%ecob%"))
        ).first()
        if not ecob:
            ecob = University(
                id=1,
                name="ECOB",
                email="contact@ecobmali.com",
                phone="+223 70 00 00 00",
                address="Bamako, Mali",
                slogan="Excellence & Innovation Académique",
                website="https://ecobmali.com",
                established_year="2010",
                rector_name="Pr. Moussa Coulibaly",
                academic_year="2026-2027",
                is_active=True,
                status="active",
                country="Mali",
                institution_type="university"
            )
            db.add(ecob)
            db.commit()
            db.refresh(ecob)
            print(f"🏛️ Université ECOB (ID: {ecob.id}) initialisée avec succès.")
        else:
            ecob.name = "ECOB"
            ecob.email = ecob.email or "contact@ecobmali.com"
            ecob.slogan = "Excellence & Innovation Académique"
            ecob.academic_year = "2026-2027"
            ecob.is_active = True
            ecob.status = "active"
            db.commit()
            print(f"🏛️ Université ECOB (ID: {ecob.id}) confirmée.")

        # Supprimer toute autre université de test
        other_unis = db.query(University).filter(University.id != ecob.id).all()
        for u in other_unis:
            db.delete(u)
        if other_unis:
            db.commit()
            print(f"🗑️ {len(other_unis)} universités de test résiduelles supprimées.")
    except Exception as e:
        db.rollback()
        print(f"⚠️ Erreur initialisation ECOB: {e}")
    
    # 5. Nettoyer les fichiers téléversés résiduels dans uploads et qr_codes
    base_dir = backend_dir
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
                    pass
        os.makedirs(target_dir, exist_ok=True)
        gitkeep = os.path.join(target_dir, ".gitkeep")
        if not os.path.exists(gitkeep):
            with open(gitkeep, "w") as f:
                f.write("")
                
    for sub in ["logos", "courses", "documents", "materials", "student_documents", "temp_scans", "dossier_etudiant"]:
        sdir = os.path.join(base_dir, "uploads", sub)
        os.makedirs(sdir, exist_ok=True)
        gkeep = os.path.join(sdir, ".gitkeep")
        if not os.path.exists(gkeep):
            with open(gkeep, "w") as f:
                f.write("")
                
    print("🧹 Répertoires uploads et qr_codes nettoyés et sécurisés.")
    
    # 6. Base de données vierge (Zero Mock Data)
    # Les utilisateurs et enseignants seront créés manuellement ou par inscription
    print("✨ Base de données totalement vierge et prête (Super Admin + Université ECOB prête).")

    db.close()


if __name__ == "__main__":
    reset_database()
