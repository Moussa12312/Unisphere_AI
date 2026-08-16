from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class PaymentCreate(BaseModel):
    student_id: int
    amount: float = Field(..., gt=0)
    currency: str = "XOF"
    payment_type: str = "tuition"
    payment_method: str = "cash"
    description: Optional[str] = None
    payment_date: Optional[date] = None


class PaymentUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    status: Optional[str] = None
    description: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    amount: float
    currency: str
    payment_type: str
    payment_method: str
    reference: Optional[str] = None
    status: str
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    payment_date: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentStats(BaseModel):
    total_revenue: float
    total_pending: float
    total_payments: int
    by_type: dict
    by_month: dict
    recent_payments: list