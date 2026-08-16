"""
🧹 Vide toutes les données de la base SANS supprimer les tables
La structure reste intacte, seules les lignes sont supprimées
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text, inspect
from app.database.connection import engine

print("=" * 70)
print("🧹 SUPPRESSION DES DONNÉES (structure conservée)")
print("=" * 70)

# Récupérer toutes les tables
inspector = inspect(engine)
tables = inspector.get_table_names()

print(f"\n📋 {len(tables)} tables trouvées")

# Tables à NE PAS vider (tables système)
SYSTEM_TABLES = {'alembic_version', 'spatial_ref_sys'}
tables_to_clear = [t for t in tables if t not in SYSTEM_TABLES]

print(f"🗑️  {len(tables_to_clear)} tables à vider\n")

# Demander confirmation
confirm = input("❓ Confirmer la suppression de toutes les données ? (tapez 'OUI') : ")
if confirm != "OUI":
    print("\n❌ Opération annulée.")
    sys.exit(0)

# Vider les tables
with engine.connect() as conn:
    # Désactiver les contraintes FK
    try:
        conn.execute(text("SET session_replication_role = 'replica'"))
    except Exception:
        pass
    
    cleared = 0
    for table in sorted(tables_to_clear):
        try:
            # TRUNCATE vide la table et reset l'auto-increment
            conn.execute(text(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE'))
            print(f"   ✅ {table} vidée")
            cleared += 1
        except Exception as e:
            # Fallback : DELETE si TRUNCATE échoue
            try:
                conn.execute(text(f'DELETE FROM "{table}"'))
                print(f"   ✅ {table} vidée (DELETE)")
                cleared += 1
            except Exception as e2:
                print(f"   ⚠️  {table} : {e2}")
    
    # Réactiver les contraintes
    try:
        conn.execute(text("SET session_replication_role = 'origin'"))
    except Exception:
        pass
    
    conn.commit()

print("\n" + "=" * 70)
print(f"✅ TERMINÉ : {cleared} tables vidées")
print("=" * 70)
print("\n📌 La structure des tables est intacte.")
print("   Vous pouvez maintenant recréer vos données.")