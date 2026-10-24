import sys
import os
sys.path.insert(0, r"c:\UniSphere_AI\backend")
from sqlalchemy import text
from app.database.connection import engine

def migrate_fees_and_discounts():
    with engine.connect() as conn:
        # 1. AcademicFee table - add domain column if missing
        try:
            conn.execute(text("ALTER TABLE academic_fees ADD COLUMN domain VARCHAR;"))
            print("✅ Added 'domain' to academic_fees")
        except Exception as e:
            print("ℹ️ 'domain' in academic_fees:", e)

        # 2. PaymentTranche table - add domain column if missing
        try:
            conn.execute(text("ALTER TABLE payment_tranches ADD COLUMN domain VARCHAR;"))
            print("✅ Added 'domain' to payment_tranches")
        except Exception as e:
            print("ℹ️ 'domain' in payment_tranches:", e)

        # 3. Student table - add discount columns if missing
        columns_to_add = [
            ("discount_amount", "FLOAT DEFAULT 0.0"),
            ("discount_percentage", "FLOAT DEFAULT 0.0"),
            ("discount_reason", "VARCHAR"),
            ("discount_approved_by", "VARCHAR"),
            ("custom_tuition_fee", "FLOAT")
        ]
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE students ADD COLUMN {col_name} {col_type};"))
                print(f"✅ Added '{col_name}' to students")
            except Exception as e:
                print(f"ℹ️ '{col_name}' in students:", e)

        conn.commit()
    print("Migration completed successfully.")

if __name__ == "__main__":
    migrate_fees_and_discounts()
