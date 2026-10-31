import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from sqlalchemy import text
from app.database.connection import SessionLocal
from app.models.university import University

def keep_only_ecob():
    print("🏫 Nettoyage des universités : conservation exclusive de ECOB...")
    db = SessionLocal()
    try:
        # 1. Rechercher si EcoB existe déjà
        ecob = db.query(University).filter(
            (University.name.ilike("%ecob%")) | (University.id == 1)
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
            print(f"✅ Université ECOB créée avec succès (ID: {ecob.id})")
        else:
            ecob.name = "ECOB"
            ecob.email = ecob.email or "contact@ecobmali.com"
            ecob.slogan = "Excellence & Innovation Académique"
            ecob.academic_year = "2026-2027"
            ecob.is_active = True
            ecob.status = "active"
            db.commit()
            print(f"✅ Université ECOB confirmée / mise à jour (ID: {ecob.id}, Nom: {ecob.name})")

        # 2. Identifier les universités de test à supprimer
        other_unis = db.query(University).filter(University.id != ecob.id).all()
        if other_unis:
            deleted_ids = [u.id for u in other_unis]
            print(f"🗑️ {len(other_unis)} universités de test détectées : {[u.name for u in other_unis]} (IDs: {deleted_ids})")
            
            for uid in deleted_ids:
                # Nettoyer les références en cascade si nécessaire
                tables_with_univ = [
                    "students", "teachers", "courses", "filieres", "censors",
                    "class_rooms", "academic_configs", "academic_fees", "announcements",
                    "attendance", "attendances", "exam_sessions", "grades", "schedules",
                    "teaching_units", "reports", "report_cards", "documents"
                ]
                for tbl in tables_with_univ:
                    try:
                        db.execute(text(f'DELETE FROM "{tbl}" WHERE university_id = :uid;'), {"uid": uid})
                    except Exception:
                        pass
                
                # Mettre à jour les utilisateurs rattachés vers ecob ou les détacher
                try:
                    db.execute(text('UPDATE "users" SET university_id = :ecob_id WHERE university_id = :uid;'), {"ecob_id": ecob.id, "uid": uid})
                except Exception:
                    pass
                
                # Supprimer l'université
                try:
                    db.execute(text('DELETE FROM "universities" WHERE id = :uid;'), {"uid": uid})
                    print(f"   ✓ Université #{uid} supprimée.")
                except Exception as e:
                    print(f"   ⚠️ Erreur suppression #{uid}: {e}")
            
            db.commit()
            print("✅ Toutes les universités de test ont été supprimées.")
        else:
            print("ℹ️ Aucune autre université de test trouvée. Seule ECOB est présente.")

        # Afficher la liste finale
        final_unis = db.query(University).all()
        print(f"🏛️ Liste finale des universités actives ({len(final_unis)}) :")
        for u in final_unis:
            print(f"   - [ID {u.id}] {u.name} ({u.email or 'N/A'}) - Statut: {u.status}")

    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors du nettoyage : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    keep_only_ecob()

