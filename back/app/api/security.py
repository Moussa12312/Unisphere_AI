from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta
from app.database.connection import SessionLocal
from app.models.audit_log import AuditLog, SecuritySetting
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/security", tags=["Security"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# FONCTION UTILITAIRE : Logger une action
# ==========================================
def log_audit_action(
    db: Session,
    action: str,
    user_id: int = None,
    user_email: str = None,
    ip_address: str = None,
    status: str = "success",
    details: str = None,
    university_id: int = None
):
    """Enregistre une action dans le journal d'audit"""
    log = AuditLog(
        action=action,
        user_id=user_id,
        user_email=user_email,
        ip_address=ip_address,
        status=status,
        details=details,
        university_id=university_id or 1
    )
    db.add(log)
    db.commit()


# ==========================================
# LISTE DES LOGS D'AUDIT
# ==========================================
@router.get("/audit-logs")
def get_audit_logs(
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Récupère les logs d'audit de l'université"""
    query = db.query(AuditLog).filter(
        AuditLog.university_id == current_user.university_id
    )
    
    if status:
        query = query.filter(AuditLog.status == status)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()) \
        .offset((page - 1) * per_page) \
        .limit(per_page) \
        .all()
    
    return {
        "data": [
            {
                "id": log.id,
                "action": log.action,
                "user": log.user_email or "Système",
                "ip": log.ip_address or "N/A",
                "time": log.created_at.isoformat() if log.created_at else None,
                "time_ago": format_time_ago(log.created_at),
                "status": "Succès" if log.status == "success" else "Échec",
                "status_code": log.status,
                "details": log.details
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page
    }


def format_time_ago(dt: datetime) -> str:
    """Formate une date en 'Il y a X minutes'"""
    if not dt:
        return "N/A"
    
    now = datetime.now()
    diff = now - dt
    
    if diff.days > 0:
        if diff.days == 1:
            return f"Hier, {dt.strftime('%H:%M')}"
        return f"Il y a {diff.days} jours"
    
    hours = diff.seconds // 3600
    if hours > 0:
        return f"Il y a {hours}h"
    
    minutes = diff.seconds // 60
    if minutes > 0:
        return f"Il y a {minutes} min"
    
    return "À l'instant"


# ==========================================
# PARAMÈTRES DE SÉCURITÉ
# ==========================================
@router.get("/settings")
def get_security_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Récupère les paramètres de sécurité"""
    settings = db.query(SecuritySetting).filter(
        SecuritySetting.university_id == current_user.university_id
    ).first()
    
    # Créer les settings par défaut si n'existent pas
    if not settings:
        settings = SecuritySetting(
            university_id=current_user.university_id,
            two_factor_enabled=0,
            password_expiry_days=90,
            password_expiry_enabled=1,
            session_timeout_minutes=30,
            max_login_attempts=5,
            ip_whitelist_enabled=0
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return {
        "two_factor_enabled": bool(settings.two_factor_enabled),
        "password_expiry_days": settings.password_expiry_days,
        "password_expiry_enabled": bool(settings.password_expiry_enabled),
        "session_timeout_minutes": settings.session_timeout_minutes,
        "max_login_attempts": settings.max_login_attempts,
        "ip_whitelist_enabled": bool(settings.ip_whitelist_enabled)
    }


@router.put("/settings")
def update_security_settings(
    data: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Met à jour les paramètres de sécurité"""
    settings = db.query(SecuritySetting).filter(
        SecuritySetting.university_id == current_user.university_id
    ).first()
    
    if not settings:
        settings = SecuritySetting(university_id=current_user.university_id)
        db.add(settings)
    
    # Mettre à jour les champs
    if "two_factor_enabled" in data:
        settings.two_factor_enabled = 1 if data["two_factor_enabled"] else 0
    if "password_expiry_days" in data:
        settings.password_expiry_days = data["password_expiry_days"]
    if "password_expiry_enabled" in data:
        settings.password_expiry_enabled = 1 if data["password_expiry_enabled"] else 0
    if "session_timeout_minutes" in data:
        settings.session_timeout_minutes = data["session_timeout_minutes"]
    if "max_login_attempts" in data:
        settings.max_login_attempts = data["max_login_attempts"]
    if "ip_whitelist_enabled" in data:
        settings.ip_whitelist_enabled = 1 if data["ip_whitelist_enabled"] else 0
    
    db.commit()
    
    # Logger l'action
    log_audit_action(
        db=db,
        action="Modification des paramètres de sécurité",
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else None,
        status="success",
        university_id=current_user.university_id
    )
    
    return {"message": "Paramètres mis à jour avec succès"}


# ==========================================
# STATISTIQUES DE SÉCURITÉ
# ==========================================
@router.get("/stats")
def get_security_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Statistiques de sécurité"""
    university_id = current_user.university_id
    
    # Total des actions
    total_actions = db.query(func.count(AuditLog.id)).filter(
        AuditLog.university_id == university_id
    ).scalar() or 0
    
    # Tentatives échouées
    failed_attempts = db.query(func.count(AuditLog.id)).filter(
        AuditLog.university_id == university_id,
        AuditLog.status == "failure"
    ).scalar() or 0
    
    # Actions aujourd'hui
    today = datetime.now().date()
    today_actions = db.query(func.count(AuditLog.id)).filter(
        AuditLog.university_id == university_id,
        func.date(AuditLog.created_at) == today
    ).scalar() or 0
    
    # IPs suspectes (plus de 3 échecs)
    suspicious_ips = db.query(AuditLog.ip_address, func.count(AuditLog.id)) \
        .filter(
            AuditLog.university_id == university_id,
            AuditLog.status == "failure"
        ) \
        .group_by(AuditLog.ip_address) \
        .having(func.count(AuditLog.id) >= 3) \
        .all()
    
    return {
        "total_actions": total_actions,
        "failed_attempts": failed_attempts,
        "today_actions": today_actions,
        "suspicious_ips": len(suspicious_ips)
    }