from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DocumentCreate(BaseModel):
    student_id: int
    document_type: str = Field(..., pattern="^(certificate|transcript|attestation|student_card|receipt)$")
    title: str = Field(..., min_length=1)


class DocumentResponse(BaseModel):
    id: int
    student_id: int
    document_type: str
    title: str
    file_url: str
    file_format: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True