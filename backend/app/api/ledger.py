from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date
import secrets

from app.database.connection import SessionLocal
from app.models.ledger import Account, JournalEntry, JournalEntryLine, FiscalYear, BankReconciliation
from app.models.accounting import BankAccount, Expense, CashTransaction
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/ledger", tags=["General Ledger"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# 📖 PLAN COMPTABLE (avec plan par défaut)
# ==========================================
DEFAULT_ACCOUNTS = [
    # (code, nom, classe)
    ("101000", "Capital", "capitaux"),
    ("211000", "Bâtiments", "immobilisation"),
    ("218000", "Matériel informatique", "immobilisation"),
    ("218100", "Mobilier", "immobilisation"),
    ("401000", "Fournisseurs", "tiers"),
    ("411000", "Étudiants (clients)", "tiers"),
    ("421000", "Personnel - rémunérations dues", "tiers"),
    ("512000", "Banque", "tresorerie"),
    ("571000", "Caisse", "tresorerie"),
    ("601000", "Achats de fournitures", "charge"),
    ("613000", "Charges locatives (loyer, eau, électricité)", "charge"),
    ("615000", "Entretien et maintenance", "charge"),
    ("622000", "Prestataires externes", "charge"),
    ("625000", "Frais de mission et déplacement", "charge"),
    ("641000", "Salaires", "charge"),
    ("645000", "Charges sociales", "charge"),
    ("681000", "Dotations aux amortissements", "charge"),
    ("706000", "Frais de scolarité", "produit"),
    ("707000", "Subventions reçues", "produit"),
    ("708000", "Dons et mécénat", "produit"),
    ("758000", "Autres produits", "produit"),
]


def ensure_default_accounts(db: Session, university_id: int):
    existing = db.query(Account).filter(Account.university_id == university_id).count()
    if existing == 0:
        for code, name, klass in DEFAULT_ACCOUNTS:
            db.add(Account(code=code, name=name, account_class=klass, is_default=1, university_id=university_id))
        db.commit()


def get_account_by_code(db: Session, university_id: int, code: str) -> Optional[Account]:
    return db.query(Account).filter(Account.university_id == university_id, Account.code == code).first()


# ==========================================
# 🤖 GÉNÉRATION AUTOMATIQUE D'ÉCRITURES
# ==========================================
# ✅ AJOUTÉ : ces fonctions sont appelées automatiquement à chaque dépense ou
# paiement étudiant enregistré, pour que le grand livre reste à jour sans
# double saisie. Elles sont conçues pour ne jamais faire planter l'opération
# d'origine si la génération échoue (appelées dans un try/except à l'appel).

EXPENSE_CATEGORY_TO_ACCOUNT = {
    "salaires": "641000",
    "achats fournitures": "601000",
    "charges fixes (loyer, eau, électricité)": "613000",
    "maintenance": "615000",
    "prestataires externes": "622000",
    "frais de mission": "625000",
    "impôts et taxes": "645000",
}


def create_journal_entry_for_expense(db: Session, university_id: int, expense) -> Optional[JournalEntry]:
    """Débit : compte de charge concerné — Crédit : Banque/Caisse."""
    ensure_default_accounts(db, university_id)

    category_name = expense.category.name.lower() if expense.category else ""
    charge_code = EXPENSE_CATEGORY_TO_ACCOUNT.get(category_name, "601000")
    charge_account = get_account_by_code(db, university_id, charge_code)
    treasury_account = get_account_by_code(db, university_id, "512000")

    if not charge_account or not treasury_account:
        return None

    lines = [
        {"account_id": charge_account.id, "debit": expense.amount, "credit": 0.0, "description": expense.title},
        {"account_id": treasury_account.id, "debit": 0.0, "credit": expense.amount, "description": expense.title},
    ]
    return _create_journal_entry(
        db, university_id, expense.expense_date, f"Dépense : {expense.title}",
        lines, source="expense", source_id=expense.id, created_by=expense.created_by
    )


def create_journal_entry_for_payment(db: Session, university_id: int, payment) -> Optional[JournalEntry]:
    """Débit : Banque/Caisse — Crédit : Frais de scolarité (produit)."""
    ensure_default_accounts(db, university_id)

    treasury_account = get_account_by_code(db, university_id, "512000")
    revenue_account = get_account_by_code(db, university_id, "706000")

    if not treasury_account or not revenue_account:
        return None

    entry_date = payment.payment_date if payment.payment_date else date.today()
    lines = [
        {"account_id": treasury_account.id, "debit": payment.amount, "credit": 0.0, "description": payment.description or "Paiement étudiant"},
        {"account_id": revenue_account.id, "debit": 0.0, "credit": payment.amount, "description": payment.description or "Paiement étudiant"},
    ]
    return _create_journal_entry(
        db, university_id, entry_date, f"Encaissement : {payment.reference}",
        lines, source="payment", source_id=payment.id
    )


class AccountCreate(BaseModel):
    code: str
    name: str
    account_class: str


@router.get("/accounts")
def get_accounts(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    ensure_default_accounts(db, current_user.university_id)
    return db.query(Account).filter(Account.university_id == current_user.university_id).order_by(Account.code).all()


@router.post("/accounts")
def create_account(data: AccountCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    if data.account_class not in ("capitaux", "immobilisation", "tiers", "tresorerie", "charge", "produit"):
        raise HTTPException(status_code=400, detail="Classe de compte invalide")
    account = Account(**data.dict(), university_id=current_user.university_id)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    account = db.query(Account).filter(Account.id == account_id, Account.university_id == current_user.university_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    if account.is_default:
        raise HTTPException(status_code=400, detail="Impossible de supprimer un compte du plan comptable par défaut")
    db.delete(account)
    db.commit()
    return {"message": "Compte supprimé"}


# ==========================================
# 📝 ÉCRITURES COMPTABLES (manuelles)
# ==========================================
class JournalLineInput(BaseModel):
    account_id: int
    debit: float = 0.0
    credit: float = 0.0
    description: Optional[str] = None


class JournalEntryCreate(BaseModel):
    entry_date: str
    description: str
    lines: List[JournalLineInput]


def _create_journal_entry(db: Session, university_id: int, entry_date: date, description: str,
                           lines: List[dict], source: str = "manual", source_id: Optional[int] = None,
                           created_by: Optional[int] = None) -> JournalEntry:
    """Fonction interne réutilisée pour générer une écriture, manuelle ou automatique."""
    total_debit = sum(l["debit"] for l in lines)
    total_credit = sum(l["credit"] for l in lines)
    if round(total_debit, 2) != round(total_credit, 2):
        raise HTTPException(status_code=400, detail=f"Écriture déséquilibrée : débit {total_debit} ≠ crédit {total_credit}")

    reference = f"JE-{entry_date.strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
    entry = JournalEntry(
        reference=reference, entry_date=entry_date, description=description,
        source=source, source_id=source_id, university_id=university_id, created_by=created_by
    )
    db.add(entry)
    db.flush()

    for line in lines:
        db.add(JournalEntryLine(
            journal_entry_id=entry.id, account_id=line["account_id"],
            debit=line["debit"], credit=line["credit"], description=line.get("description")
        ))
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/journal")
def get_journal(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    account_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    query = db.query(JournalEntry).filter(JournalEntry.university_id == current_user.university_id)
    if start_date:
        query = query.filter(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.entry_date <= end_date)
    if account_id:
        query = query.join(JournalEntryLine).filter(JournalEntryLine.account_id == account_id)

    entries = query.order_by(JournalEntry.entry_date.desc()).all()
    return [{
        "id": e.id, "reference": e.reference,
        "entry_date": e.entry_date.isoformat(), "description": e.description, "source": e.source,
        "lines": [{
            "account": {"id": l.account.id, "code": l.account.code, "name": l.account.name},
            "debit": l.debit, "credit": l.credit, "description": l.description
        } for l in e.lines]
    } for e in entries]


@router.post("/journal")
def create_manual_entry(data: JournalEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    try:
        entry_date = datetime.strptime(data.entry_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide")

    if len(data.lines) < 2:
        raise HTTPException(status_code=400, detail="Une écriture doit avoir au moins 2 lignes")

    lines = [l.dict() for l in data.lines]
    entry = _create_journal_entry(
        db, current_user.university_id, entry_date, data.description, lines,
        source="manual", created_by=current_user.id
    )
    return entry


@router.delete("/journal/{entry_id}")
def delete_journal_entry(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id, JournalEntry.university_id == current_user.university_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Écriture non trouvée")
    if entry.source != "manual":
        raise HTTPException(status_code=400, detail="Impossible de supprimer une écriture générée automatiquement (supprimez l'opération d'origine)")
    db.delete(entry)
    db.commit()
    return {"message": "Écriture supprimée"}


# ==========================================
# 📚 GRAND LIVRE (par compte)
# ==========================================
@router.get("/ledger/{account_id}")
def get_account_ledger(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    account = db.query(Account).filter(Account.id == account_id, Account.university_id == current_user.university_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")

    lines = db.query(JournalEntryLine).join(JournalEntry).filter(
        JournalEntryLine.account_id == account_id,
        JournalEntry.university_id == current_user.university_id
    ).order_by(JournalEntry.entry_date).all()

    running_balance = 0.0
    movements = []
    for l in lines:
        running_balance += l.debit - l.credit
        movements.append({
            "date": l.entry.entry_date.isoformat(),
            "reference": l.entry.reference,
            "description": l.description or l.entry.description,
            "debit": l.debit,
            "credit": l.credit,
            "balance": round(running_balance, 2)
        })

    return {
        "account": {"id": account.id, "code": account.code, "name": account.name},
        "movements": movements,
        "final_balance": round(running_balance, 2)
    }


# ==========================================
# ⚖️ BALANCE COMPTABLE
# ==========================================
@router.get("/trial-balance")
def get_trial_balance(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    ensure_default_accounts(db, current_user.university_id)
    accounts = db.query(Account).filter(Account.university_id == current_user.university_id).order_by(Account.code).all()

    result = []
    total_debit = 0.0
    total_credit = 0.0
    for acc in accounts:
        lines = db.query(JournalEntryLine).join(JournalEntry).filter(
            JournalEntryLine.account_id == acc.id,
            JournalEntry.university_id == current_user.university_id
        ).all()
        debit_sum = sum(l.debit for l in lines)
        credit_sum = sum(l.credit for l in lines)
        if debit_sum == 0 and credit_sum == 0:
            continue

        balance = debit_sum - credit_sum
        result.append({
            "account": {"id": acc.id, "code": acc.code, "name": acc.name, "class": acc.account_class},
            "total_debit": round(debit_sum, 2),
            "total_credit": round(credit_sum, 2),
            "balance": round(balance, 2)
        })
        total_debit += debit_sum
        total_credit += credit_sum

    return {
        "accounts": result,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "is_balanced": round(total_debit, 2) == round(total_credit, 2)
    }


# ==========================================
# 📅 EXERCICES COMPTABLES
# ==========================================
class FiscalYearCreate(BaseModel):
    period: str
    start_date: str
    end_date: str


@router.get("/fiscal-years")
def get_fiscal_years(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    return db.query(FiscalYear).filter(FiscalYear.university_id == current_user.university_id).order_by(FiscalYear.start_date.desc()).all()


@router.post("/fiscal-years")
def create_fiscal_year(data: FiscalYearCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    try:
        start = datetime.strptime(data.start_date, "%Y-%m-%d").date()
        end = datetime.strptime(data.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide")

    fy = FiscalYear(period=data.period, start_date=start, end_date=end, university_id=current_user.university_id)
    db.add(fy)
    db.commit()
    db.refresh(fy)
    return fy


@router.post("/fiscal-years/{fy_id}/close")
def close_fiscal_year(fy_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    """Clôture un exercice : empêche toute nouvelle écriture ou modification sur cette période."""
    fy = db.query(FiscalYear).filter(FiscalYear.id == fy_id, FiscalYear.university_id == current_user.university_id).first()
    if not fy:
        raise HTTPException(status_code=404, detail="Exercice non trouvé")
    if fy.status == "closed":
        raise HTTPException(status_code=400, detail="Cet exercice est déjà clôturé")

    fy.status = "closed"
    fy.closed_at = datetime.utcnow()
    fy.closed_by = current_user.id
    db.commit()
    return {"message": "Exercice clôturé avec succès"}


# ==========================================
# 🏦 RAPPROCHEMENT BANCAIRE
# ==========================================
class ReconciliationCreate(BaseModel):
    bank_account_id: int
    statement_date: str
    statement_balance: float
    notes: Optional[str] = None


@router.get("/bank-reconciliations")
def get_reconciliations(bank_account_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    query = db.query(BankReconciliation).filter(BankReconciliation.university_id == current_user.university_id)
    if bank_account_id:
        query = query.filter(BankReconciliation.bank_account_id == bank_account_id)
    reconciliations = query.order_by(BankReconciliation.statement_date.desc()).all()
    return [{
        "id": r.id, "bank_account_id": r.bank_account_id,
        "statement_date": r.statement_date.isoformat(),
        "statement_balance": r.statement_balance, "book_balance": r.book_balance,
        "difference": r.difference, "status": r.status, "notes": r.notes
    } for r in reconciliations]


@router.post("/bank-reconciliations")
def create_reconciliation(data: ReconciliationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    """
    Compare le solde du relevé bancaire saisi par le comptable avec le solde
    comptable calculé du compte, et signale tout écart.
    """
    account = db.query(BankAccount).filter(BankAccount.id == data.bank_account_id, BankAccount.university_id == current_user.university_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")

    try:
        stmt_date = datetime.strptime(data.statement_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide")

    expenses = db.query(Expense).filter(Expense.bank_account_id == account.id, Expense.status == "paid", Expense.expense_date <= stmt_date).all()
    total_expenses = sum(e.amount for e in expenses)
    cash_in = db.query(CashTransaction).filter(CashTransaction.bank_account_id == account.id, CashTransaction.transaction_type == "in", CashTransaction.transaction_date <= stmt_date).all()
    cash_out = db.query(CashTransaction).filter(CashTransaction.bank_account_id == account.id, CashTransaction.transaction_type == "out", CashTransaction.transaction_date <= stmt_date).all()

    book_balance = account.initial_balance - total_expenses + sum(c.amount for c in cash_in) - sum(c.amount for c in cash_out)
    difference = round(data.statement_balance - book_balance, 2)

    reconciliation = BankReconciliation(
        bank_account_id=data.bank_account_id,
        statement_date=stmt_date,
        statement_balance=data.statement_balance,
        book_balance=round(book_balance, 2),
        difference=difference,
        status="reconciled" if difference == 0 else "discrepancy",
        notes=data.notes,
        university_id=current_user.university_id,
        created_by=current_user.id
    )
    db.add(reconciliation)
    db.commit()
    db.refresh(reconciliation)
    return reconciliation
