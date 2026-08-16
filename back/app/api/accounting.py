from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, date
import secrets

from app.database.connection import SessionLocal
from app.models.accounting import (
    Supplier, ExpenseCategory, Expense, BankAccount,
    CashTransaction, Budget, FixedAsset, PayrollEntry
)
from app.models.payment import Payment
from app.models.user import User
from app.core.dependencies import require_role
from app.utils.academic_year import get_current_academic_year

router = APIRouter(prefix="/accounting", tags=["Accounting"])


def _try_create_expense_journal_entry(db: Session, university_id: int, expense):
    """✅ AJOUTÉ : génère automatiquement l'écriture comptable pour cette dépense,
    sans jamais faire échouer la création de la dépense elle-même si ça rate."""
    try:
        from app.api.ledger import create_journal_entry_for_expense
        create_journal_entry_for_expense(db, university_id, expense)
    except Exception as e:
        print(f"⚠️ Génération d'écriture comptable échouée pour la dépense {expense.id}: {str(e)}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DEFAULT_CATEGORIES = [
    "Salaires", "Achats fournitures", "Charges fixes (loyer, eau, électricité)",
    "Maintenance", "Prestataires externes", "Frais de mission", "Impôts et taxes", "Autres"
]


def ensure_default_categories(db: Session, university_id: int):
    """Crée les catégories de dépenses par défaut si elles n'existent pas encore."""
    existing = db.query(ExpenseCategory).filter(ExpenseCategory.university_id == university_id).count()
    if existing == 0:
        for name in DEFAULT_CATEGORIES:
            db.add(ExpenseCategory(name=name, is_default=1, university_id=university_id))
        db.commit()


# ==========================================
# 🏢 FOURNISSEURS
# ==========================================
class SupplierCreate(BaseModel):
    name: str
    category: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


@router.get("/suppliers")
def get_suppliers(search: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    query = db.query(Supplier).filter(Supplier.university_id == current_user.university_id)
    if search:
        query = query.filter(Supplier.name.ilike(f"%{search}%"))
    return query.order_by(Supplier.name).all()


@router.post("/suppliers")
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    supplier = Supplier(**data.dict(), university_id=current_user.university_id)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/suppliers/{supplier_id}")
def update_supplier(supplier_id: int, data: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.university_id == current_user.university_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    for field, value in data.dict().items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id, Supplier.university_id == current_user.university_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    db.delete(supplier)
    db.commit()
    return {"message": "Fournisseur supprimé"}


# ==========================================
# 💸 CATÉGORIES DE DÉPENSES
# ==========================================
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


@router.get("/expense-categories")
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    ensure_default_categories(db, current_user.university_id)
    return db.query(ExpenseCategory).filter(ExpenseCategory.university_id == current_user.university_id).order_by(ExpenseCategory.name).all()


@router.post("/expense-categories")
def create_category(data: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    category = ExpenseCategory(**data.dict(), university_id=current_user.university_id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/expense-categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id, ExpenseCategory.university_id == current_user.university_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    if category.is_default:
        raise HTTPException(status_code=400, detail="Impossible de supprimer une catégorie système")
    db.delete(category)
    db.commit()
    return {"message": "Catégorie supprimée"}


# ==========================================
# 💸 DÉPENSES
# ==========================================
class ExpenseCreate(BaseModel):
    category_id: int
    supplier_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    amount: float
    expense_date: str
    payment_method: str = "virement"
    status: str = "paid"


@router.get("/expenses")
def get_expenses(
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    query = db.query(Expense).filter(Expense.university_id == current_user.university_id)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if supplier_id:
        query = query.filter(Expense.supplier_id == supplier_id)
    if status:
        query = query.filter(Expense.status == status)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)

    expenses = query.order_by(Expense.expense_date.desc()).all()
    return [{
        "id": e.id,
        "reference": e.reference,
        "title": e.title,
        "description": e.description,
        "amount": e.amount,
        "expense_date": e.expense_date.isoformat() if e.expense_date else None,
        "payment_method": e.payment_method,
        "status": e.status,
        "category": {"id": e.category.id, "name": e.category.name} if e.category else None,
        "supplier": {"id": e.supplier.id, "name": e.supplier.name} if e.supplier else None,
    } for e in expenses]


@router.post("/expenses")
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    try:
        expense_date = datetime.strptime(data.expense_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (attendu AAAA-MM-JJ)")

    reference = f"EXP-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"

    expense = Expense(
        reference=reference,
        category_id=data.category_id,
        supplier_id=data.supplier_id,
        bank_account_id=data.bank_account_id,
        title=data.title,
        description=data.description,
        amount=data.amount,
        expense_date=expense_date,
        payment_method=data.payment_method,
        status=data.status,
        university_id=current_user.university_id,
        created_by=current_user.id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    _try_create_expense_journal_entry(db, current_user.university_id, expense)
    return expense


@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.university_id == current_user.university_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Dépense non trouvée")
    db.delete(expense)
    db.commit()
    return {"message": "Dépense supprimée"}


# ==========================================
# 🏦 TRÉSORERIE (comptes)
# ==========================================
class BankAccountCreate(BaseModel):
    name: str
    account_type: str = "bank"
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    initial_balance: float = 0.0


@router.get("/bank-accounts")
def get_bank_accounts(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    accounts = db.query(BankAccount).filter(BankAccount.university_id == current_user.university_id).all()
    result = []
    for acc in accounts:
        income = db.query(Payment).filter(Payment.university_id == current_user.university_id).with_entities(Payment.amount).all()
        total_income = sum(p[0] for p in income) if acc.account_type == "bank" else 0
        expenses = db.query(Expense).filter(Expense.bank_account_id == acc.id, Expense.status == "paid").with_entities(Expense.amount).all()
        total_expenses = sum(e[0] for e in expenses)
        cash_in = db.query(CashTransaction).filter(CashTransaction.bank_account_id == acc.id, CashTransaction.transaction_type == "in").with_entities(CashTransaction.amount).all()
        cash_out = db.query(CashTransaction).filter(CashTransaction.bank_account_id == acc.id, CashTransaction.transaction_type == "out").with_entities(CashTransaction.amount).all()

        balance = acc.initial_balance - total_expenses + sum(c[0] for c in cash_in) - sum(c[0] for c in cash_out)
        result.append({
            "id": acc.id, "name": acc.name, "account_type": acc.account_type,
            "bank_name": acc.bank_name, "account_number": acc.account_number,
            "initial_balance": acc.initial_balance, "balance": round(balance, 2)
        })
    return result


@router.post("/bank-accounts")
def create_bank_account(data: BankAccountCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    account = BankAccount(**data.dict(), university_id=current_user.university_id)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/bank-accounts/{account_id}")
def delete_bank_account(account_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    account = db.query(BankAccount).filter(BankAccount.id == account_id, BankAccount.university_id == current_user.university_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    db.delete(account)
    db.commit()
    return {"message": "Compte supprimé"}


class CashTransactionCreate(BaseModel):
    bank_account_id: int
    transaction_type: str  # in, out, transfer
    amount: float
    description: Optional[str] = None
    transaction_date: str


@router.get("/cash-transactions")
def get_cash_transactions(bank_account_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    query = db.query(CashTransaction).filter(CashTransaction.university_id == current_user.university_id)
    if bank_account_id:
        query = query.filter(CashTransaction.bank_account_id == bank_account_id)
    transactions = query.order_by(CashTransaction.transaction_date.desc()).all()
    return [{
        "id": t.id, "bank_account_id": t.bank_account_id, "transaction_type": t.transaction_type,
        "amount": t.amount, "description": t.description,
        "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None
    } for t in transactions]


@router.post("/cash-transactions")
def create_cash_transaction(data: CashTransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    if data.transaction_type not in ("in", "out", "transfer"):
        raise HTTPException(status_code=400, detail="Type de transaction invalide")
    try:
        t_date = datetime.strptime(data.transaction_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide")

    transaction = CashTransaction(
        bank_account_id=data.bank_account_id,
        transaction_type=data.transaction_type,
        amount=data.amount,
        description=data.description,
        transaction_date=t_date,
        university_id=current_user.university_id,
        created_by=current_user.id
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


# ==========================================
# 📊 BUDGET
# ==========================================
class BudgetCreate(BaseModel):
    category_id: int
    department: Optional[str] = None
    period: str
    allocated_amount: float


@router.get("/budgets")
def get_budgets(period: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    query = db.query(Budget).filter(Budget.university_id == current_user.university_id)
    if period:
        query = query.filter(Budget.period == period)
    budgets = query.all()

    result = []
    for b in budgets:
        spent = db.query(Expense).filter(
            Expense.category_id == b.category_id,
            Expense.university_id == current_user.university_id,
            Expense.status == "paid"
        ).with_entities(Expense.amount).all()
        total_spent = sum(s[0] for s in spent)
        result.append({
            "id": b.id,
            "category": {"id": b.category.id, "name": b.category.name} if b.category else None,
            "department": b.department,
            "period": b.period,
            "allocated_amount": b.allocated_amount,
            "spent_amount": round(total_spent, 2),
            "remaining": round(b.allocated_amount - total_spent, 2),
            "usage_percent": round((total_spent / b.allocated_amount * 100), 1) if b.allocated_amount > 0 else 0
        })
    return result


@router.post("/budgets")
def create_budget(data: BudgetCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    budget = Budget(**data.dict(), university_id=current_user.university_id)
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/budgets/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.university_id == current_user.university_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget non trouvé")
    db.delete(budget)
    db.commit()
    return {"message": "Budget supprimé"}


# ==========================================
# 🏢 IMMOBILISATIONS
# ==========================================
class AssetCreate(BaseModel):
    name: str
    category: str
    purchase_date: str
    purchase_value: float
    depreciation_years: int = 5
    location: Optional[str] = None
    notes: Optional[str] = None


@router.get("/fixed-assets")
def get_assets(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    assets = db.query(FixedAsset).filter(FixedAsset.university_id == current_user.university_id).all()
    result = []
    today = date.today()
    for a in assets:
        years_elapsed = (today - a.purchase_date).days / 365.25
        depreciation_rate = min(years_elapsed / a.depreciation_years, 1.0) if a.depreciation_years > 0 else 1.0
        current_value = round(a.purchase_value * (1 - depreciation_rate), 2)
        result.append({
            "id": a.id, "name": a.name, "category": a.category,
            "purchase_date": a.purchase_date.isoformat(),
            "purchase_value": a.purchase_value,
            "depreciation_years": a.depreciation_years,
            "current_value": max(current_value, 0),
            "location": a.location
        })
    return result


@router.post("/fixed-assets")
def create_asset(data: AssetCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    try:
        p_date = datetime.strptime(data.purchase_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide")

    asset = FixedAsset(
        name=data.name, category=data.category, purchase_date=p_date,
        purchase_value=data.purchase_value, depreciation_years=data.depreciation_years,
        location=data.location, notes=data.notes,
        university_id=current_user.university_id
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/fixed-assets/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    asset = db.query(FixedAsset).filter(FixedAsset.id == asset_id, FixedAsset.university_id == current_user.university_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Bien non trouvé")
    db.delete(asset)
    db.commit()
    return {"message": "Bien supprimé"}


# ==========================================
# 👥 SALAIRES (PAIE)
# ==========================================
class PayrollCreate(BaseModel):
    user_id: int
    period: str
    gross_salary: float
    deductions: float = 0.0


@router.get("/payroll/eligible-staff")
def get_eligible_staff(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    """✅ AJOUTÉ : liste tout le personnel (staff + enseignants) pouvant recevoir un salaire."""
    users = db.query(User).filter(
        User.university_id == current_user.university_id,
        User.role != "student"
    ).all()
    return [{"id": u.id, "full_name": u.full_name, "role": u.role} for u in users]


@router.get("/payroll")
def get_payroll(period: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    query = db.query(PayrollEntry).filter(PayrollEntry.university_id == current_user.university_id)
    if period:
        query = query.filter(PayrollEntry.period == period)
    entries = query.order_by(PayrollEntry.period.desc()).all()
    return [{
        "id": p.id,
        "user": {"id": p.user.id, "full_name": p.user.full_name, "role": p.user.role} if p.user else None,
        "period": p.period, "gross_salary": p.gross_salary, "deductions": p.deductions,
        "net_salary": p.net_salary, "status": p.status,
        "paid_date": p.paid_date.isoformat() if p.paid_date else None
    } for p in entries]


@router.post("/payroll")
def create_payroll_entry(data: PayrollCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    net_salary = data.gross_salary - data.deductions
    entry = PayrollEntry(
        user_id=data.user_id, period=data.period,
        gross_salary=data.gross_salary, deductions=data.deductions,
        net_salary=net_salary, university_id=current_user.university_id
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/payroll/{entry_id}/pay")
def pay_salary(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    """Marque un bulletin comme payé et génère automatiquement la dépense correspondante."""
    entry = db.query(PayrollEntry).filter(PayrollEntry.id == entry_id, PayrollEntry.university_id == current_user.university_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Bulletin non trouvé")
    if entry.status == "paid":
        raise HTTPException(status_code=400, detail="Ce salaire a déjà été payé")

    ensure_default_categories(db, current_user.university_id)
    salary_category = db.query(ExpenseCategory).filter(
        ExpenseCategory.university_id == current_user.university_id,
        ExpenseCategory.name == "Salaires"
    ).first()

    expense = Expense(
        reference=f"SAL-{entry.period}-{entry.user_id}",
        category_id=salary_category.id if salary_category else None,
        title=f"Salaire {entry.period} - {entry.user.full_name if entry.user else ''}",
        amount=entry.net_salary,
        expense_date=date.today(),
        payment_method="virement",
        status="paid",
        university_id=current_user.university_id,
        created_by=current_user.id
    )
    db.add(expense)
    db.flush()

    entry.status = "paid"
    entry.paid_date = date.today()
    entry.expense_id = expense.id
    db.commit()
    db.refresh(expense)
    _try_create_expense_journal_entry(db, current_user.university_id, expense)
    return {"message": "Salaire payé avec succès", "expense_id": expense.id}


# ==========================================
# 📈 ÉTATS FINANCIERS
# ==========================================
@router.get("/income-statement")
def get_income_statement(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    """Compte de résultat simplifié : recettes (paiements étudiants) - dépenses."""
    income_query = db.query(Payment).filter(Payment.university_id == current_user.university_id, Payment.status == "completed")
    expense_query = db.query(Expense).filter(Expense.university_id == current_user.university_id, Expense.status == "paid")

    if start_date:
        income_query = income_query.filter(Payment.payment_date >= start_date)
        expense_query = expense_query.filter(Expense.expense_date >= start_date)
    if end_date:
        income_query = income_query.filter(Payment.payment_date <= end_date)
        expense_query = expense_query.filter(Expense.expense_date <= end_date)

    payments = income_query.all()
    expenses = expense_query.all()

    total_income = sum(p.amount for p in payments)
    total_expenses = sum(e.amount for e in expenses)

    # Répartition des dépenses par catégorie
    by_category: dict = {}
    for e in expenses:
        cat_name = e.category.name if e.category else "Non catégorisé"
        by_category[cat_name] = by_category.get(cat_name, 0) + e.amount

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net_result": round(total_income - total_expenses, 2),
        "expenses_by_category": by_category,
        "income_count": len(payments),
        "expense_count": len(expenses)
    }


@router.get("/dashboard")
def get_accounting_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "accountant"))):
    """Vue d'ensemble pour le tableau de bord comptable."""
    current_year = get_current_academic_year(db, current_user.university_id)

    total_income = sum(p.amount for p in db.query(Payment).filter(Payment.university_id == current_user.university_id, Payment.status == "completed").all())
    total_expenses = sum(e.amount for e in db.query(Expense).filter(Expense.university_id == current_user.university_id, Expense.status == "paid").all())

    accounts = db.query(BankAccount).filter(BankAccount.university_id == current_user.university_id).all()
    treasury_balance = sum(acc.initial_balance for acc in accounts) + total_income - total_expenses

    pending_expenses = db.query(Expense).filter(Expense.university_id == current_user.university_id, Expense.status == "pending").count()
    pending_payroll = db.query(PayrollEntry).filter(PayrollEntry.university_id == current_user.university_id, PayrollEntry.status == "pending").count()

    return {
        "academic_year": current_year,
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net_result": round(total_income - total_expenses, 2),
        "treasury_balance": round(treasury_balance, 2),
        "pending_expenses": pending_expenses,
        "pending_payroll": pending_payroll,
        "suppliers_count": db.query(Supplier).filter(Supplier.university_id == current_user.university_id).count(),
        "assets_count": db.query(FixedAsset).filter(FixedAsset.university_id == current_user.university_id).count(),
    }
