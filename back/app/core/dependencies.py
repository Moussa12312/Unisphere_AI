from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.user import User
from app.core.config import SECRET_KEY, ALGORITHM
from app.core.permissions import has_permission, get_role_permissions

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Invalid token"
    )
    
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    
    return user


def require_role(*roles: str):
    """
    Vérifie que l'utilisateur a UN des rôles spécifiés.
    Usage: current_user: User = Depends(require_role("admin", "censeur"))
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(roles)}"
            )
        return current_user
    return role_checker


def require_permission(permission: str):
    """
    Vérifie que l'utilisateur a la permission spécifique.
    Usage: current_user: User = Depends(require_permission("student:create"))
    """
    def permission_checker(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required permission: {permission}"
            )
        return current_user
    return permission_checker


def require_any_permission(*permissions: str):
    """
    Vérifie que l'utilisateur a AU MOINS UNE des permissions.
    Usage: current_user: User = Depends(require_any_permission("student:read", "teacher:read"))
    """
    def permission_checker(current_user: User = Depends(get_current_user)):
        user_permissions = get_role_permissions(current_user.role)
        if not any(p in user_permissions for p in permissions):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required one of: {', '.join(permissions)}"
            )
        return current_user
    return permission_checker