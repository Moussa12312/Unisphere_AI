from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from app.core.config import SECRET_KEY, ALGORITHM

# ✅ Durée par défaut : 30 jours
DEFAULT_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30

# ✅ Durée "Se souvenir de moi" : 90 jours
REMEMBER_ME_TOKEN_EXPIRE_MINUTES = 60 * 24 * 90

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, remember_me: bool = False):
    to_encode = data.copy()
    
    if remember_me:
        expire = datetime.utcnow() + timedelta(minutes=REMEMBER_ME_TOKEN_EXPIRE_MINUTES)
    else:
        expire = datetime.utcnow() + timedelta(minutes=DEFAULT_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    return encoded_jwt