import sys
import os

sys.path.insert(0, r"c:\UniSphere_AI\backend")

from app.database.connection import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password
from dotenv import load_dotenv

load_dotenv()

email = os.getenv("SUPER_ADMIN_EMAIL", "balbychakir@gmail.com")
password = os.getenv("SUPER_ADMIN_PASSWORD", "BalbyChakir73")

db = SessionLocal()
try:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        existing.hashed_password = hash_password(password)
        existing.role = "super_admin"
        existing.is_active = True
        existing.is_email_verified = True
        db.commit()
        print(f"[OK] Compte Super Admin mis a jour: {email}")
    else:
        super_admin = User(
            full_name="Super Admin UniSphere",
            email=email,
            hashed_password=hash_password(password),
            role="super_admin",
            is_active=True,
            is_email_verified=True,
            university_id=None
        )
        db.add(super_admin)
        db.commit()
        print(f"[OK] Compte Super Admin cree avec succes: {email}")
finally:
    db.close()
