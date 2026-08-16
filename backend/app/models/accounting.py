from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


# ==========================================
# 🏢 FOURNISSEURS
# ==========================================
class Supplier(Base):
    """✅ AJOUTÉ : annuaire des fournisseurs de l'université."""
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)   # Ex: Fournitures, Maintenance, Prestataire
    contact_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# ==========================================
# 💸 DÉPENSES (sorties d'argent)
# ==========================================
class ExpenseCategory(Base):
    """✅ AJOUTÉ : catégories de dépenses (salaires, achats, charges fixes...)."""
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_default = Column(Integer, default=0)  # 1 = catégorie système (non supprimable)

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Expense(Base):
    """✅ AJOUTÉ : une dépense (sortie d'argent) de l'université."""
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, unique=True, nullable=False)

    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    expense_date = Column(Date, nullable=False)

    payment_method = Column(String, default="virement")  # especes, virement, cheque, mobile_money
    status = Column(String, default="paid")  # pending, paid, cancelled
    proof_file = Column(String, nullable=True)  # justificatif scanné

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    category = relationship("ExpenseCategory")
    supplier = relationship("Supplier")


# ==========================================
# 🏦 TRÉSORERIE (banque + caisse)
# ==========================================
class BankAccount(Base):
    """✅ AJOUTÉ : comptes de trésorerie (banque(s) + caisse)."""
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)          # Ex: "Compte principal BOA", "Caisse"
    account_type = Column(String, default="bank")  # bank, cash
    bank_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    initial_balance = Column(Float, default=0.0)

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class CashTransaction(Base):
    """
    ✅ AJOUTÉ : mouvement manuel de trésorerie (transferts entre comptes,
    ajustements). Les encaissements étudiants (Payment) et les dépenses
    (Expense) sont déjà des mouvements en soi ; ceci couvre les mouvements
    qui ne rentrent dans aucune des deux catégories (ex: dépôt en banque
    depuis la caisse).
    """
    __tablename__ = "cash_transactions"

    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    transaction_type = Column(String, nullable=False)  # in, out, transfer
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    transaction_date = Column(Date, nullable=False)

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ==========================================
# 📊 BUDGET
# ==========================================
class Budget(Base):
    """✅ AJOUTÉ : budget alloué par catégorie/département pour une période donnée."""
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    department = Column(String, nullable=True)  # filière ou service concerné (optionnel)
    period = Column(String, nullable=False)     # Ex: "2025-2026"
    allocated_amount = Column(Float, nullable=False)

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    category = relationship("ExpenseCategory")


# ==========================================
# 🏢 IMMOBILISATIONS
# ==========================================
class FixedAsset(Base):
    """✅ AJOUTÉ : registre des biens durables (bâtiments, véhicules, équipements)."""
    __tablename__ = "fixed_assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # batiment, vehicule, informatique, mobilier...
    purchase_date = Column(Date, nullable=False)
    purchase_value = Column(Float, nullable=False)
    depreciation_years = Column(Integer, default=5)  # durée d'amortissement
    location = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# ==========================================
# 👥 SALAIRES (paie)
# ==========================================
class PayrollEntry(Base):
    """✅ AJOUTÉ : bulletin de salaire mensuel pour un membre du personnel."""
    __tablename__ = "payroll_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    period = Column(String, nullable=False)  # Ex: "2026-01"
    gross_salary = Column(Float, nullable=False)
    deductions = Column(Float, default=0.0)   # charges sociales, avances...
    net_salary = Column(Float, nullable=False)

    status = Column(String, default="pending")  # pending, paid
    paid_date = Column(Date, nullable=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)  # lien vers la dépense générée

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
