from datetime import datetime, timedelta
from jose import jwt
import bcrypt

# =========================================================================
# ✅ Patch de compatibilité bcrypt >= 4.1.0 avec passlib 1.7.4
# Résout AttributeError '__about__' et ValueError 'password cannot be longer than 72 bytes'
# =========================================================================
if not hasattr(bcrypt, "__about__"):
    class _About:
        __version__ = getattr(bcrypt, "__version__", "4.0.1")
    bcrypt.__about__ = _About()

if hasattr(bcrypt, "hashpw"):
    _orig_hashpw = bcrypt.hashpw
    def _safe_hashpw(password, salt):
        if isinstance(password, (bytes, bytearray)) and len(password) > 72:
            password = password[:72]
        return _orig_hashpw(password, salt)
    bcrypt.hashpw = _safe_hashpw

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
    if isinstance(password, str) and len(password.encode("utf-8")) > 72:
        password = password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    if isinstance(plain_password, str) and len(plain_password.encode("utf-8")) > 72:
        plain_password = plain_password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
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
