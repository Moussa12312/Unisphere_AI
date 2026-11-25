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
from app.utils.email_service import send_email, is_email_configured

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


def compute_student_balance(student: Student, db: Session) -> Dict[str, Any]:
    """Calcule de manière 100 % déterministe le net scolarité dû, le payé scolarité réel et le reliquat."""
    from app.utils.tuition import is_valid_payment_status, is_scolarite_payment_type

    univ_id = student.university_id
    if not univ_id:
        return {"is_configured": False, "total_tuition": 0.0, "total_paid": 0.0, "balance": 0.0}

    breakdown = resolve_student_tuition_breakdown(db, student, univ_id, "scolarite")
    if not breakdown.get("is_configured", False):
        return {"is_configured": False, "total_tuition": 0.0, "total_paid": 0.0, "balance": 0.0}

    total_tuition = float(breakdown.get("net_amount") or 0.0)
    st_payments = db.query(Payment).filter(Payment.student_id == student.id).all()
    paid_sum = sum(
        float(p.amount or 0.0)
        for p in st_payments
        if is_valid_payment_status(p.status) and is_scolarite_payment_type(p.payment_type)
    )

    balance = max(0.0, total_tuition - paid_sum)
    return {
        "is_configured": True,
        "total_tuition": round(total_tuition),
        "total_paid": round(paid_sum),
        "balance": round(balance),
    }


# ==========================================
# 0. LISTE DES ÉTUDIANTS AVEC IMPAYÉS (100 % DÉTERMINISTE, ZÉRO N+1)
# ==========================================
@router.get("/unpaid-students")
def get_unpaid_students(
    filiere: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALLOWED_ROLES))
):
    from app.utils.tuition import (
        build_university_tuition_cache,
        UniversityTuitionCache,
        is_valid_payment_status,
        is_scolarite_payment_type,
    )

    _ensure_reminder_table()
    univ_id = current_user.university_id
    univ = db.query(University).filter(University.id == univ_id).first() if univ_id else None
    univ_name = univ.name if univ else "UniSphere"

    base_student_query = db.query(Student)
    if current_user.role not in ["super_admin", "superadmin"] and univ_id:
        base_student_query = base_student_query.filter(Student.university_id == univ_id)

    # Liste complète des filières de l'établissement (ne rétrécit jamais quand on filtre)
    all_filieres = sorted({
        str(r[0]).strip()
        for r in base_student_query.with_entities(Student.filiere).all()
        if r[0] and str(r[0]).strip()
    })

    query = base_student_query
    if filiere:
        query = query.filter(Student.filiere == filiere)
    if level:
        query = query.filter(Student.level == level)

    students = query.order_by(Student.id.asc()).all()
    student_ids = [s.id for s in students]
    student_id_set = set(student_ids)

    # Chargement groupé des paiements et relances (Zéro N+1, sans dépasser la limite SQLite IN)
    paid_by_student: Dict[int, float] = {}
    payments_by_univ: Dict[int, List[Payment]] = {}
    reminders_by_student: Dict[int, List[PaymentReminder]] = {}

    if student_ids:
        if current_user.role not in ["super_admin", "superadmin"] and univ_id:
            all_payments = (
                db.query(Payment)
                .filter(Payment.university_id == univ_id)
                .order_by(Payment.id.asc())
                .all()
            )
            all_rems = (
                db.query(PaymentReminder)
                .filter(PaymentReminder.university_id == univ_id)
                .order_by(PaymentReminder.created_at.desc(), PaymentReminder.id.desc())
                .all()
            )
        else:
            all_payments = []
            all_rems = []
            for start_idx in range(0, len(student_ids), 500):
                chunk = student_ids[start_idx:start_idx + 500]
                all_payments.extend(
                    db.query(Payment)
                    .filter(Payment.student_id.in_(chunk))
                    .order_by(Payment.id.asc())
                    .all()
                )
                all_rems.extend(
                    db.query(PaymentReminder)
                    .filter(PaymentReminder.student_id.in_(chunk))
                    .order_by(PaymentReminder.created_at.desc(), PaymentReminder.id.desc())
                    .all()
                )

        student_univ_map = {s.id: (s.university_id or univ_id) for s in students}
        for p in all_payments:
            p_univ = p.university_id or student_univ_map.get(p.student_id)
            if p_univ:
                payments_by_univ.setdefault(p_univ, []).append(p)
            if p.student_id in student_id_set and is_valid_payment_status(p.status) and is_scolarite_payment_type(p.payment_type):
                paid_by_student[p.student_id] = paid_by_student.get(p.student_id, 0.0) + float(p.amount or 0.0)

        for rem in all_rems:
            if rem.student_id in student_id_set:
                reminders_by_student.setdefault(rem.student_id, []).append(rem)

    tuition_caches: Dict[int, UniversityTuitionCache] = {}
    unpaid_list = []
    total_unpaid_amount = 0
    with_phone_count = 0
    with_parent_phone_count = 0

    for s in students:
        full_name = f"{s.first_name} {s.last_name}".strip()
        if search:
            s_low = search.strip().lower()
            if s_low not in full_name.lower() and s_low not in (s.matricule or "").lower():
                continue

        s_univ = s.university_id or univ_id
        if not s_univ:
            continue

        if s_univ not in tuition_caches:
            tuition_caches[s_univ] = build_university_tuition_cache(
                db, s_univ, all_payments=payments_by_univ.get(s_univ, [])
            )

        breakdown = resolve_student_tuition_breakdown(
            db, s, s_univ, "scolarite", cache=tuition_caches[s_univ]
        )
        if not breakdown.get("is_configured", False):
            # Filière non configurée : ne JAMAIS générer d'impayé fictif !
            continue

        total_due = round(float(breakdown.get("net_amount") or 0.0))
        total_paid = round(paid_by_student.get(s.id, 0.0))
        bal = max(0, total_due - total_paid)
        if bal <= 0:
            continue

        total_unpaid_amount += bal
        if s.phone:
            with_phone_count += 1
        if s.parent_phone:
            with_parent_phone_count += 1

        reminders = reminders_by_student.get(s.id, [])
        last_reminder = reminders[0].created_at.isoformat() if reminders and reminders[0].created_at else None

        wa_text_student = build_tuition_reminder_template(
            university_name=univ_name,
            recipient_name=full_name,
            student_name=full_name,
            filiere=s.filiere or "votre filière",
            balance=bal
        )
        wa_url_student = generate_whatsapp_url(s.phone, wa_text_student) if s.phone else None

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
            "filiere": s.filiere or "Non renseignée",
            "level": s.level or "L1",
            "phone": s.phone,
            "parent_name": s.parent_name,
            "parent_phone": s.parent_phone,
            "total_due": total_due,
            "total_paid": total_paid,
            "balance": bal,
            "reminder_count": len(reminders),
            "last_reminder_at": last_reminder,
            "whatsapp_student_url": wa_url_student,
            "whatsapp_parent_url": wa_url_parent
        })

    # Tri déterministe (reliquat décroissant, puis ID croissant)
    unpaid_list.sort(key=lambda x: (-x["balance"], x["student_id"]))

    return {
        "total_unpaid_students": len(unpaid_list),
        "total_unpaid_amount": round(total_unpaid_amount),
        "with_student_phone_count": with_phone_count,
        "with_parent_phone_count": with_parent_phone_count,
        "all_filieres": all_filieres,
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

    if not recipients and student.email:
        recipients.append({
            "target_type": "student",
            "name": student_name,
            "phone": student.email,
            "label": "Étudiant (Email)"
        })

    if not recipients and not student.user_id:
        raise HTTPException(
            status_code=400, 
            detail="Aucun moyen de contact disponible (ni téléphone, ni email, ni compte étudiant actif)."
        )

    results = []
    whatsapp_links = []
    email_sent = False
    internal_sent = False

    # Message de référence
    default_msg_text = payload.custom_message if payload.custom_message else build_tuition_reminder_template(
        university_name=univ_name,
        recipient_name=student_name,
        student_name=student_name,
        filiere=filiere,
        balance=balance
    )

    for r in recipients:
        msg_text = payload.custom_message if payload.custom_message else build_tuition_reminder_template(
            university_name=univ_name,
            recipient_name=r["name"],
            student_name=student_name,
            filiere=filiere,
            balance=balance
        )

        # Lien WhatsApp direct si vrai numéro
        if "@" not in str(r["phone"]):
            wa_url = generate_whatsapp_url(r["phone"], msg_text)
            whatsapp_links.append({
                "target": r["label"],
                "recipient_name": r["name"],
                "phone": r["phone"],
                "whatsapp_url": wa_url
            })

        sms_result = None
        reminder_status = "simulated"
        effective_channel = payload.channel

        # Envoi SMS si canal demandé et vrai numéro
        if payload.channel in ["sms", "all"] and "@" not in str(r["phone"]):
            sms_result = send_sms(to_phone=r["phone"], message=msg_text, sender_id=univ_name[:11])
            reminder_status = sms_result.get("status", "sent")

        # Relais automatique par Email réel si pas de passerelle SMS active (ou canal all/email)
        if (reminder_status == "simulated" or payload.channel in ["email", "all"]) and not email_sent and student.email and is_email_configured():
            amount_fmt = f"{int(balance):,}".replace(",", " ")
            html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
              <div style="background: #0a1628; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                <h2 style="color: #FF6B00; margin: 0; font-size: 18px;">{univ_name} • Service Comptabilité</h2>
              </div>
              <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
                <p>Bonjour <strong>{student_name}</strong>,</p>
                <p style="white-space: pre-line; line-height: 1.6;">{msg_text}</p>
                <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px; margin: 16px 0;">
                  <strong>Reste à payer :</strong> <span style="color: #ea580c; font-weight: 700;">{amount_fmt} FCFA</span> ({filiere})
                </div>
                <p style="font-size: 12px; color: #64748b;">Cet avis vous est adressé par l'administration financière via UniSphere AI.</p>
              </div>
            </div>
            """
            if send_email(student.email, f"Rappel de scolarité — {univ_name}", html_body):
                email_sent = True
                if reminder_status == "simulated":
                    reminder_status = "delivered"
                    effective_channel = "email"

        results.append({
            "recipient": r,
            "sms_result": sms_result,
            "email_sent": email_sent,
            "status": reminder_status
        })

        reminder_entry = PaymentReminder(
            student_id=student.id,
            university_id=student.university_id,
            channel=effective_channel,
            target=r["target_type"],
            recipient_phone=r["phone"],
            recipient_name=r["name"],
            amount_due=balance,
            message=msg_text,
            status=reminder_status,
            sent_by_user_id=current_user.id
        )
        db.add(reminder_entry)

    # Notification cloche + Message interne systématique dans l'espace Étudiant (100 % gratuit même sans SMS)
    if student.user_id:
        try:
            from app.models.message import Message
            from app.models.notification import Notification
            amount_fmt = f"{int(balance):,}".replace(",", " ")
            internal_msg = Message(
                sender_id=current_user.id,
                recipient_id=student.user_id,
                subject="Rappel de scolarité • Solde restant",
                content=default_msg_text,
                message_type="direct",
                university_id=student.university_id
            )
            notif = Notification(
                title="Rappel de frais de scolarité",
                message=f"Un reliquat de {amount_fmt} FCFA reste à régulariser ({filiere}).",
                notification_type="payment",
                type="warning",
                recipient_id=student.user_id,
                created_by=current_user.id,
                university_id=student.university_id
            )
            db.add(internal_msg)
            db.add(notif)
            internal_sent = True
        except Exception as e:
            print(f"⚠️ Erreur création notification/message interne relance: {e}")

    db.commit()

    channels_used = []
    if any(r.get("sms_result") and r["sms_result"].get("status") == "delivered" for r in results):
        channels_used.append("SMS")
    if email_sent:
        channels_used.append("Email")
    if internal_sent:
        channels_used.append("Notification interne")
    via_label = f" via {' + '.join(channels_used)}" if channels_used else ""

    return {
        "success": True,
        "message": f"Relance envoyée avec succès pour {student_name}{via_label}",
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

        if not phone_to_send and not s.email and not s.user_id:
            errors.append(f"{student_name} : aucun contact disponible")
            continue

        recipient_display = recipient_name or student_name
        msg_text = payload.custom_message if payload.custom_message else build_tuition_reminder_template(
            university_name=univ_name,
            recipient_name=recipient_display,
            student_name=student_name,
            filiere=filiere,
            balance=bal
        )

        status = "simulated"
        effective_channel = "sms"
        if phone_to_send:
            sms_res = send_sms(to_phone=phone_to_send, message=msg_text, sender_id=univ_name[:11])
            status = sms_res.get("status", "sent")

        # Relais Email réel automatique si pas de SMS configuré
        if status == "simulated" and s.email and is_email_configured():
            amount_fmt = f"{int(bal):,}".replace(",", " ")
            html_body = (
                f"<div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;'>"
                f"<h3 style='color:#FF6B00;'>{univ_name} • Rappel de scolarité</h3>"
                f"<p style='white-space:pre-line;'>{msg_text}</p>"
                f"<p><strong>Solde dû :</strong> {amount_fmt} FCFA</p></div>"
            )
            if send_email(s.email, f"Rappel de scolarité — {univ_name}", html_body):
                status = "delivered"
                effective_channel = "email"

        # Notification & message interne dans l'application étudiante
        if s.user_id:
            try:
                from app.models.message import Message
                from app.models.notification import Notification
                amount_fmt = f"{int(bal):,}".replace(",", " ")
                db.add(Message(
                    sender_id=current_user.id,
                    recipient_id=s.user_id,
                    subject="Rappel de scolarité • Solde restant",
                    content=msg_text,
                    message_type="direct",
                    university_id=s.university_id
                ))
                db.add(Notification(
                    title="Rappel de frais de scolarité",
                    message=f"Un reliquat de {amount_fmt} FCFA reste à régulariser ({filiere}).",
                    notification_type="payment",
                    type="warning",
                    recipient_id=s.user_id,
                    created_by=current_user.id,
                    university_id=s.university_id
                ))
                if status == "simulated":
                    status = "delivered"
                    effective_channel = "internal"
            except Exception:
                pass

        reminder_entry = PaymentReminder(
            student_id=s.id,
            university_id=s.university_id,
            channel=effective_channel,
            target=target_label,
            recipient_phone=phone_to_send or s.email or "compte-interne",
            recipient_name=recipient_display,
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
        "message": f"Campagne de relance terminée : {total_sent} relance(s) transmise(s) sur {total_targeted} étudiant(s) ciblé(s).",
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
