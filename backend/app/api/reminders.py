from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.database.connection import get_db, engine
from app.models.user import User
from app.models.student import Student
from app.models.university import University
from app.models.payment_reminder import PaymentReminder
from app.models.payment import Payment
from app.models.payment_tranche import PaymentTranche
from app.core.dependencies import get_current_user, require_role
from app.utils.tuition import resolve_student_tuition_breakdown
from app.utils.sms_service import (
    send_sms,
    generate_whatsapp_url,
    build_tuition_reminder_template,
    normalize_phone_number
)

_REMINDER_TABLE_READY = False


def _ensure_reminder_table() -> None:
    global _REMINDER_TABLE_READY
    if _REMINDER_TABLE_READY:
        return
    try:
        PaymentReminder.__table__.create(bind=engine, checkfirst=True)
        _REMINDER_TABLE_READY = True
    except Exception as _table_err:
        print(f"[WARNING] Initialisation table payment_reminders: {_table_err}")


_ensure_reminder_table()

router = APIRouter(prefix="/reminders", tags=["Reminders"])

ALLOWED_ROLES = ["admin", "accountant", "super_admin", "superadmin", "secretary", "censeur"]


class SingleReminderRequest(BaseModel):
    student_id: int
    channel: str = "sms" # "sms", "whatsapp", "internal", "all"
    target: str = "student" # "student", "parent", "both"
    custom_message: Optional[str] = None


class BulkReminderRequest(BaseModel):
    student_ids: Optional[List[int]] = None
    channel: str = "sms"
    target: str = "both"
    custom_message: Optional[str] = None


def compute_student_balance(student: Student, db: Session) -> Dict[str, float]:
    """Calcule le montant total net dû (selon tarif niveau/domaine + remises), le payé réel et le reliquat restant."""
    univ_id = student.university_id or 1
    breakdown = resolve_student_tuition_breakdown(db, student, univ_id, "scolarite")
    total_tuition = float(breakdown.get("net_amount") or 0.0)

    paid_sum = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.student_id == student.id,
        Payment.status.in_(["validated", "completed", "partial"])
    ).scalar() or 0.0

    balance = max(0.0, total_tuition - float(paid_sum))
    return {
        "total_tuition": round(total_tuition, 2),
        "total_paid": round(float(paid_sum), 2),
        "balance": round(balance, 2)
    }


# ==========================================
# 0. LISTE DES ÉTUDIANTS AVEC IMPAYÉS (POUR LE COMPTABLE)
# ==========================================
@router.get("/unpaid-students")
def get_unpaid_students(
    filiere: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALLOWED_ROLES))
):
    _ensure_reminder_table()
    univ_id = current_user.university_id or 1
    univ = db.query(University).filter(University.id == univ_id).first()
    univ_name = univ.name if univ else "UniSphere"

    query = db.query(Student)
    if current_user.role not in ["super_admin", "superadmin"] and current_user.university_id:
        query = query.filter(Student.university_id == current_user.university_id)

    if filiere:
        query = query.filter(Student.filiere == filiere)
    if level:
        query = query.filter(Student.level == level)

    students = query.all()

    unpaid_list = []
    total_unpaid_amount = 0.0
    with_phone_count = 0
    with_parent_phone_count = 0

    for s in students:
        full_name = f"{s.first_name} {s.last_name}"
        if search:
            s_low = search.lower()
            if s_low not in full_name.lower() and s_low not in (s.matricule or "").lower():
                continue

        finances = compute_student_balance(s, db)
        bal = finances["balance"]
        if bal <= 0:
            continue

        total_unpaid_amount += bal
        if s.phone:
            with_phone_count += 1
        if s.parent_phone:
            with_parent_phone_count += 1

        # Historique des relances pour cet étudiant
        reminders = db.query(PaymentReminder).filter(
            PaymentReminder.student_id == s.id
        ).order_by(PaymentReminder.created_at.desc()).all()
        
        last_reminder = reminders[0].created_at.isoformat() if reminders else None

        # Template de message pour WhatsApp étudiant
        wa_text_student = build_tuition_reminder_template(
            university_name=univ_name,
            recipient_name=full_name,
            student_name=full_name,
            filiere=s.filiere or "votre filière",
            balance=bal
        )
        wa_url_student = generate_whatsapp_url(s.phone, wa_text_student) if s.phone else None

        # Template de message pour WhatsApp parent
        wa_text_parent = build_tuition_reminder_template(
            university_name=univ_name,
            recipient_name=s.parent_name or f"Parent de {s.first_name}",
            student_name=full_name,
            filiere=s.filiere or "votre filière",
            balance=bal
        )
        wa_url_parent = generate_whatsapp_url(s.parent_phone, wa_text_parent) if s.parent_phone else None

        unpaid_list.append({
            "student_id": s.id,
            "student_name": full_name,
            "matricule": s.matricule or f"STU-{s.id:04d}",
            "filiere": s.filiere or "Tronc Commun",
            "level": s.level or "L1",
            "phone": s.phone,
            "parent_name": s.parent_name,
            "parent_phone": s.parent_phone,
            "total_due": finances["total_tuition"],
            "total_paid": finances["total_paid"],
            "balance": bal,
            "reminder_count": len(reminders),
            "last_reminder_at": last_reminder,
            "whatsapp_student_url": wa_url_student,
            "whatsapp_parent_url": wa_url_parent
        })

    # Trier par reliquat décroissant
    unpaid_list.sort(key=lambda x: x["balance"], reverse=True)

    return {
        "total_unpaid_students": len(unpaid_list),
        "total_unpaid_amount": total_unpaid_amount,
        "with_student_phone_count": with_phone_count,
        "with_parent_phone_count": with_parent_phone_count,
        "students": unpaid_list
    }


# ==========================================
# 1. ENVOI DE RELANCE INDIVIDUELLE (SMS / WHATSAPP)
# ==========================================
@router.post("/send")
def send_single_reminder(
    payload: SingleReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALLOWED_ROLES))
):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")

    if current_user.role not in ["super_admin", "superadmin"]:
        if student.university_id != current_user.university_id:
            raise HTTPException(status_code=403, detail="Accès non autorisé à cet étudiant")

    univ = db.query(University).filter(University.id == student.university_id).first()
    univ_name = univ.name if univ else "Université"

    # Calcul du solde
    finances = compute_student_balance(student, db)
    balance = finances["balance"]
    if balance <= 0:
        raise HTTPException(status_code=400, detail="Cet étudiant est entièrement à jour de ses paiements (solde: 0 FCFA).")

    student_name = f"{student.first_name} {student.last_name}"
    filiere = student.filiere or "votre formation"

    # Déterminer les destinataires
    recipients = []
    
    # 1. Étudiant
    if payload.target in ["student", "both"]:
        if student.phone:
            recipients.append({
                "target_type": "student",
                "name": student_name,
                "phone": student.phone,
                "label": "Étudiant"
            })

    # 2. Parent / Tuteur
    if payload.target in ["parent", "both"]:
        if student.parent_phone:
            recipients.append({
                "target_type": "parent",
                "name": student.parent_name or f"Parent de {student.first_name}",
                "phone": student.parent_phone,
                "label": "Parent / Tuteur"
            })

    if not recipients:
        raise HTTPException(
            status_code=400, 
            detail="Aucun numéro de téléphone disponible pour la cible sélectionnée (l'étudiant et/ou le parent n'ont pas de numéro renseigné)."
        )

    results = []
    whatsapp_links = []

    for r in recipients:
        # Message personnalisé ou template par défaut
        msg_text = payload.custom_message if payload.custom_message else build_tuition_reminder_template(
            university_name=univ_name,
            recipient_name=r["name"],
            student_name=student_name,
            filiere=filiere,
            balance=balance
        )

        # Lien WhatsApp direct
        wa_url = generate_whatsapp_url(r["phone"], msg_text)
        whatsapp_links.append({
            "target": r["label"],
            "recipient_name": r["name"],
            "phone": r["phone"],
            "whatsapp_url": wa_url
        })

        sms_result = None
        reminder_status = "simulated"

        # Envoi SMS si canal demandé
        if payload.channel in ["sms", "all"]:
            sms_result = send_sms(to_phone=r["phone"], message=msg_text, sender_id=univ_name[:11])
            reminder_status = sms_result.get("status", "sent")

        # Enregistrement dans l'historique
        reminder_entry = PaymentReminder(
            student_id=student.id,
            university_id=student.university_id,
            channel=payload.channel,
            target=r["target_type"],
            recipient_phone=r["phone"],
            recipient_name=r["name"],
            amount_due=balance,
            message=msg_text,
            status=reminder_status,
            sent_by_user_id=current_user.id
        )
        db.add(reminder_entry)
        results.append({
            "recipient": r,
            "sms_result": sms_result,
            "status": reminder_status
        })

    # Message interne sur la plateforme si demandé
    if payload.channel in ["internal", "all"] and student.user_id:
        try:
            from app.models.message import Message
            internal_msg = Message(
                sender_id=current_user.id,
                recipient_id=student.user_id,
                subject="Rappel de scolarité • Solde restant",
                content=f"Bonjour {student.first_name}, un reliquat de {int(balance):,} FCFA reste dû sur vos frais de scolarité ({filiere}). Merci de régulariser auprès du service comptabilité.",
                message_type="direct",
                university_id=student.university_id
            )
            db.add(internal_msg)
        except Exception as e:
            print(f"⚠️ Erreur création message interne relance: {e}")

    db.commit()

    return {
        "success": True,
        "message": f"Relance effectuée avec succès pour {student_name}",
        "student_id": student.id,
        "balance": balance,
        "results": results,
        "whatsapp_links": whatsapp_links
    }


# ==========================================
# 2. ENVOI GROUPÉ DE RELANCES (BULK SMS)
# ==========================================
@router.post("/bulk")
def send_bulk_reminders(
    payload: BulkReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALLOWED_ROLES))
):
    univ_id = current_user.university_id or 1
    univ = db.query(University).filter(University.id == univ_id).first()
    univ_name = univ.name if univ else "UniSphere"

    query = db.query(Student)
    if current_user.role not in ["super_admin", "superadmin"] and current_user.university_id:
        query = query.filter(Student.university_id == current_user.university_id)

    if payload.student_ids:
        query = query.filter(Student.id.in_(payload.student_ids))

    all_students = query.all()
    
    total_targeted = 0
    total_sent = 0
    total_balance = 0.0
    errors = []

    for s in all_students:
        finances = compute_student_balance(s, db)
        bal = finances["balance"]
        if bal <= 0:
            continue

        total_targeted += 1
        total_balance += bal
        student_name = f"{s.first_name} {s.last_name}"
        filiere = s.filiere or "votre formation"

        # Déterminer destinataires
        phone_to_send = None
        recipient_name = None
        target_label = "student"

        if payload.target in ["parent", "both"] and s.parent_phone:
            phone_to_send = s.parent_phone
            recipient_name = s.parent_name or f"Parent de {s.first_name}"
            target_label = "parent"
        elif s.phone:
            phone_to_send = s.phone
            recipient_name = student_name
            target_label = "student"

        if not phone_to_send:
            errors.append(f"{student_name} : aucun numéro disponible")
            continue

        msg_text = payload.custom_message if payload.custom_message else build_tuition_reminder_template(
            university_name=univ_name,
            recipient_name=recipient_name,
            student_name=student_name,
            filiere=filiere,
            balance=bal
        )

        sms_res = send_sms(to_phone=phone_to_send, message=msg_text, sender_id=univ_name[:11])
        status = sms_res.get("status", "sent")

        reminder_entry = PaymentReminder(
            student_id=s.id,
            university_id=s.university_id,
            channel="sms",
            target=target_label,
            recipient_phone=phone_to_send,
            recipient_name=recipient_name,
            amount_due=bal,
            message=msg_text,
            status=status,
            sent_by_user_id=current_user.id
        )
        db.add(reminder_entry)
        total_sent += 1

    db.commit()

    return {
        "success": True,
        "message": f"Campagne de relance terminée : {total_sent} SMS envoyés sur {total_targeted} étudiants ciblés.",
        "total_targeted": total_targeted,
        "total_sent": total_sent,
        "total_amount_recovered": total_balance,
        "errors": errors[:5]
    }


# ==========================================
# 3. HISTORIQUE DES RELANCES
# ==========================================
@router.get("/history")
def get_reminders_history(
    student_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALLOWED_ROLES))
):
    _ensure_reminder_table()
    query = db.query(PaymentReminder)
    if current_user.role not in ["super_admin", "superadmin"] and current_user.university_id:
        query = query.filter(PaymentReminder.university_id == current_user.university_id)

    if student_id:
        query = query.filter(PaymentReminder.student_id == student_id)

    items = query.order_by(PaymentReminder.created_at.desc()).limit(limit).all()

    result = []
    for r in items:
        st = db.query(Student).filter(Student.id == r.student_id).first()
        result.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": f"{st.first_name} {st.last_name}" if st else "Inconnu",
            "matricule": st.matricule if st else "N/A",
            "channel": r.channel,
            "target": r.target,
            "recipient_phone": r.recipient_phone,
            "recipient_name": r.recipient_name,
            "amount_due": r.amount_due,
            "message": r.message,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return result
