from typing import Optional, List, Dict, Any, Set
from fastapi import Depends, HTTPException, Query, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.university import University
from app.core.config import SECRET_KEY, ALGORITHM
from app.core.permissions import has_permission, get_role_permissions

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    header_token: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
):
    token = (
        header_token 
        or token_query 
        or request.query_params.get("token") 
        or request.cookies.get("token")
    )
    if not token:
        auth_hdr = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth_hdr and auth_hdr.lower().startswith("bearer "):
            token = auth_hdr.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Non authentifié",
            headers={"WWW-Authenticate": "Bearer"},
        )
    credentials_exception = HTTPException(
        status_code=401,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
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
    
    # ✅ Bloque les utilisateurs d'une université suspendue (même déjà connectés)
    if user.role != "super_admin" and user.university_id:
        univ = db.query(University).filter(University.id == user.university_id).first()
        if univ and (univ.is_active == False or univ.status == "suspended"):
            raise HTTPException(
                status_code=403,
                detail="Accès suspendu. Votre université a été bloquée par l'administrateur de la plateforme.",
            )

    return user


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    try:
        token = request.query_params.get("token") or request.cookies.get("token")
        if not token:
            auth_hdr = request.headers.get("Authorization") or request.headers.get("authorization")
            if auth_hdr and auth_hdr.lower().startswith("bearer "):
                token = auth_hdr.split(" ", 1)[1].strip()
        if not token:
            return None
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        return db.query(User).filter(User.email == email).first()
    except Exception:
        return None



def require_role(*roles: str):
    """
    Vérifie que l'utilisateur a UN des rôles spécifiés (gère les équivalences FR/EN).
    Usage: current_user: User = Depends(require_role("admin", "censeur"))
    """
    role_synonyms = {
        "secretary": {"secretary", "secretaire"},
        "secretaire": {"secretary", "secretaire"},
        "guard": {"guard", "gardien"},
        "gardien": {"guard", "gardien"},
        "accountant": {"accountant", "comptable"},
        "comptable": {"accountant", "comptable"},
        "censeur": {"censeur", "censor"},
        "censor": {"censeur", "censor"},
        "teacher": {"teacher", "enseignant", "professeur"},
        "enseignant": {"teacher", "enseignant", "professeur"},
        "student": {"student", "etudiant"},
        "etudiant": {"student", "etudiant"},
        "super_admin": {"super_admin", "superadmin"},
        "superadmin": {"super_admin", "superadmin"}
    }
    
    expanded_roles = set()
    for r in roles:
        expanded_roles.add(r.lower())
        if r.lower() in role_synonyms:
            expanded_roles.update(role_synonyms[r.lower()])

    def role_checker(current_user: User = Depends(get_current_user)):
        user_role = (current_user.role or "").lower()
        user_roles_set = {user_role}
        if user_role in role_synonyms:
            user_roles_set.update(role_synonyms[user_role])
            
        # Super admin a un accès maître sur la plateforme
        if "super_admin" in user_roles_set or "superadmin" in user_roles_set:
            return current_user

        # ✅ Secrétaire a autorité et délégation totale pour effectuer toutes les tâches du censeur et des enseignants
        if "secretary" in user_roles_set or "secretaire" in user_roles_set:
            user_roles_set.update({"censeur", "censor", "teacher", "enseignant", "professeur"})
            
        if not user_roles_set.intersection(expanded_roles):
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