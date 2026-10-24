from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime

class PaymentTrancheCreate(BaseModel):
    level: str
    domain: Optional[str] = None
    payment_type: str
    academic_year: str
    tranche_number: int
    tranche_name: str
    percentage: float
    amount: float
    due_date: Optional[str] = None  # ✅ String en entrée (ex: "2026-01-15")
    
    @field_validator('due_date', mode='before')
    @classmethod
    def validate_due_date(cls, v):
        if v is None or v == '':
            return None
        # Accepter les strings ISO
        if isinstance(v, str):
            return v
        return v

class ThreeTranchesItem(BaseModel):
    tranche_number: int  # 1, 2, 3
    tranche_name: str    # "1ère tranche (P1)", etc.
    percentage: float    # ex: 40.0
    amount: float        # Montant FCFA calculé
    due_date: Optional[str] = None
    
    @field_validator('due_date', mode='before')
    @classmethod
    def validate_due_date(cls, v):
        if v is None or v == '':
            return None
        if isinstance(v, str):
            return v
        return v

class ConfigureThreeTranchesRequest(BaseModel):
    level: str
    domain: Optional[str] = None
    payment_type: str = "scolarite"
    academic_year: str
    tranches: List[ThreeTranchesItem]
    sync_associated_domains: Optional[bool] = False

class PaymentTrancheResponse(BaseModel):
    id: int
    level: str
    domain: Optional[str] = None
    payment_type: str
    academic_year: str
    tranche_number: int
    tranche_name: str
    percentage: float
    amount: float
    due_date: Optional[str] = None  # ✅ String en sortie
    
    # ✅ CONVERTISSEUR AUTOMATIQUE : datetime → string
    @field_validator('due_date', mode='before')
    @classmethod
    def convert_due_date(cls, v):
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.strftime('%Y-%m-%d')
        return str(v) if v else None
    
    class Config:
        from_attributes = True