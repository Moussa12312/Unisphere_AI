from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


# ==========================================
# 📖 PLAN COMPTABLE
# ==========================================
class Account(Base):
    """
    ✅ AJOUTÉ : compte du plan comptable (inspiré du plan OHADA simplifié).
    Classes : 1 Capitaux, 2 Immobilisations, 4 Tiers, 5 Trésorerie, 6 Charges, 7 Produits.
    """
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False)     # Ex: "512000"
    name = Column(String, nullable=False)     # Ex: "Banque"
    account_class = Column(String, nullable=False)  # capitaux, immobilisation, tiers, tresorerie, charge, produit
    is_default = Column(Integer, default=0)

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# ==========================================
# 📝 ÉCRITURES COMPTABLES (Grand livre)
# ==========================================
class JournalEntry(Base):
    """✅ AJOUTÉ : une écriture comptable (regroupe plusieurs lignes débit/crédit équilibrées)."""
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, unique=True, nullable=False)
    entry_date = Column(Date, nullable=False)
    description = Column(String, nullable=False)

    source = Column(String, default="manual")  # manual, payment, expense, salary
    source_id = Column(Integer, nullable=True)  # id du Payment/Expense/PayrollEntry d'origine

    fiscal_year_id = Column(Integer, ForeignKey("fiscal_years.id"), nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    lines = relationship("JournalEntryLine", back_populates="entry", cascade="all, delete-orphan")


class JournalEntryLine(Base):
    """✅ AJOUTÉ : une ligne débit ou crédit d'une écriture comptable."""
    __tablename__ = "journal_entry_lines"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    description = Column(String, nullable=True)

    entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account")


# ==========================================
# 📅 EXERCICES COMPTABLES
# ==========================================
class FiscalYear(Base):
    """✅ AJOUTÉ : exercice comptable (période clôturable, empêche toute modification après clôture)."""
    __tablename__ = "fiscal_years"

    id = Column(Integer, primary_key=True, index=True)
    period = Column(String, nullable=False)  # Ex: "2025-2026"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, default="open")  # open, closed

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ==========================================
# 🏦 RAPPROCHEMENT BANCAIRE
# ==========================================
class BankReconciliation(Base):
    """✅ AJOUTÉ : rapprochement entre le solde du relevé bancaire et le solde comptable."""
    __tablename__ = "bank_reconciliations"

    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    statement_date = Column(Date, nullable=False)
    statement_balance = Column(Float, nullable=False)   # Solde selon le relevé bancaire
    book_balance = Column(Float, nullable=False)         # Solde selon la comptabilité au même instant
    difference = Column(Float, nullable=False)
    status = Column(String, default="draft")  # draft, reconciled, discrepancy
    notes = Column(Text, nullable=True)

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
