import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.connection import SessionLocal
from app.models.user import User
from app.core.security import hash_password
from seed_demo_accounts import seed_demo_accounts

db = SessionLocal()
try:
    print("🚀 Synchronisation des mots de passe en production...")
    pwd_hash = hash_password("unisphere2026")
    
    # 1. SuperAdmin
    superadmin = db.query(User).filter(User.email == "chakirunisphereai@gmail.com").first()
    if superadmin:
        superadmin.hashed_password = pwd_hash
        superadmin.is_active = True
        superadmin.is_email_verified = True
        print(" -> ✅ Compte SuperAdmin (chakirunisphereai@gmail.com) synchronisé avec unisphere2026")
    else:
        superadmin = User(
            full_name="Chakir SuperAdmin",
            email="chakirunisphereai@gmail.com",
            hashed_password=pwd_hash,
            role="super_admin",
            is_active=True,
            is_email_verified=True,
            university_id=None
        )
        db.add(superadmin)
        print(" -> ✅ Compte SuperAdmin créé avec unisphere2026")
        
    db.commit()

    # 2. Exécution du provisioning des 8 comptes démo ECOB (admin, secrétaire, comptable, etc.)
    seed_demo_accounts(db)
    
    print("\n🎉 Tous les comptes démo et SuperAdmin sont 100% opérationnels avec le mot de passe : unisphere2026 !")
finally:
    db.close()
