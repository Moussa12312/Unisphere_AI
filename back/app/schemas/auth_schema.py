from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False

class RegisterRequest(BaseModel):
    university_name: str
    country: str
    institution_type: str
    university_email: str
    admin_full_name: str
    admin_email: str
    admin_phone: str
    admin_password: str