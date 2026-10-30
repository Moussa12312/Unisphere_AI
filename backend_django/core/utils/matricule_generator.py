import secrets
from datetime import datetime
from sqlalchemy.orm import Session

def generate_employee_id(db: Session, prefix: str = "EMP", university_id: int = 1, model: any = None) -> str:
    """
    Génère un identifiant employé unique au format PREFIX-YYYY-NNNN
    """
    year = datetime.now().year
    
    if model and hasattr(model, "employee_id"):
        count = db.query(model).filter(model.university_id == university_id).count() + 1
        employee_id = f"{prefix}-{year}-{count:04d}"
        
        # S'assurer de l'unicité
        while db.query(model).filter(model.employee_id == employee_id).first():
            count += 1
            employee_id = f"{prefix}-{year}-{count:04d}"
            
        return employee_id
    else:
        random_suffix = secrets.token_hex(2).upper()
        return f"{prefix}-{year}-{random_suffix}"
