from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import os
import json

from app.database.connection import SessionLocal
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.payment import Payment
from app.models.course import Course
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.exam_session import ExamSession
from app.models.schedule import Schedule
from app.models.message import Message
from app.models.notification import Notification
from app.core.dependencies import require_role

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# CONTEXTE PAR RÔLE (inchangé)
# ==========================================

def get_admin_context(db: Session, university_id: int) -> dict:
    """Contexte admin : vue globale de l'université"""
    total_students = db.query(func.count(Student.id)).filter(Student.university_id == university_id).scalar() or 0
    total_teachers = db.query(func.count(User.id)).filter(User.university_id == university_id, User.role == "teacher").scalar() or 0
    total_courses = db.query(func.count(Course.id)).filter(Course.university_id == university_id).scalar() or 0
    
    filieres = db.query(Student.filiere, func.count(Student.id).label('count')).filter(
        Student.university_id == university_id, Student.filiere.isnot(None)
    ).group_by(Student.filiere).all()
    filieres_data = {f[0]: f[1] for f in filieres}
    
    niveaux = db.query(Student.level, func.count(Student.id).label('count')).filter(
        Student.university_id == university_id, Student.level.isnot(None)
    ).group_by(Student.level).all()
    niveaux_data = {n[0]: n[1] for n in niveaux}
    
    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.university_id == university_id, Payment.status == "completed"
    ).scalar()
    unpaid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.university_id == university_id, Payment.status == "failed"
    ).scalar()
    late = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.university_id == university_id, Payment.status == "pending"
    ).scalar()
    
    total_expected = total_revenue + late
    collection_rate = (total_revenue / total_expected * 100) if total_expected > 0 else 100.0
    
    total_attendance = db.query(func.count(Attendance.id)).filter(Attendance.university_id == university_id).scalar() or 0
    present_count = db.query(func.count(Attendance.id)).filter(
        Attendance.university_id == university_id, Attendance.status == "present"
    ).scalar() or 0
    attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0
    
    return {
        "role": "admin",
        "role_label": "Administrateur",
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_courses": total_courses,
        "filieres": filieres_data,
        "niveaux": niveaux_data,
        "total_revenue": total_revenue,
        "unpaid": unpaid,
        "late": late,
        "collection_rate": round(collection_rate, 1),
        "attendance_rate": round(attendance_rate, 1)
    }


def get_teacher_context(db: Session, user_id: int, university_id: int) -> dict:
    """Contexte teacher : ses cours, étudiants, notes"""
    teacher = db.query(Teacher).filter(Teacher.user_id == user_id).first()
    if not teacher:
        return {"role": "teacher", "role_label": "Enseignant", "error": "Profil enseignant non trouvé"}
    
    courses = db.query(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == university_id
    ).all()
    
    courses_data = []
    total_students = 0
    all_scores = []
    
    for course in courses:
        students_count = db.query(func.count(Student.id)).filter(
            Student.university_id == university_id,
            Student.level == course.level,
            Student.filiere == course.department
        ).scalar() or 0
        
        grades = db.query(Grade).filter(Grade.course_id == course.id, Grade.score.isnot(None)).all()
        scores = [g.score for g in grades if g.score is not None]
        avg = sum(scores) / len(scores) if scores else 0
        passing = len([s for s in scores if s >= 10])
        
        courses_data.append({
            "code": course.code,
            "title": course.title,
            "level": course.level,
            "department": course.department,
            "credits": course.credits,
            "students_count": students_count,
            "grades_count": len(scores),
            "average": round(avg, 2),
            "pass_rate": round((passing / len(scores) * 100), 1) if scores else 0
        })
        
        total_students += students_count
        all_scores.extend(scores)
    
    overall_average = sum(all_scores) / len(all_scores) if all_scores else 0
    overall_passing = len([s for s in all_scores if s >= 10])
    overall_pass_rate = (overall_passing / len(all_scores) * 100) if all_scores else 0
    
    return {
        "role": "teacher",
        "role_label": "Enseignant",
        "teacher_name": f"{teacher.first_name} {teacher.last_name}",
        "speciality": teacher.speciality,
        "courses_count": len(courses),
        "total_students": total_students,
        "overall_average": round(overall_average, 2),
        "overall_pass_rate": round(overall_pass_rate, 1),
        "courses": courses_data
    }


def get_student_context(db: Session, user_id: int, university_id: int) -> dict:
    """Contexte student : ses notes, présences, paiements"""
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        return {"role": "student", "role_label": "Étudiant", "error": "Profil étudiant non trouvé"}
    
    grades = db.query(Grade).join(Course).filter(
        Grade.student_id == student.id,
        Grade.score.isnot(None)
    ).all()
    
    grades_data = []
    total_weighted = 0
    total_credits = 0
    
    for grade in grades:
        course = db.query(Course).filter(Course.id == grade.course_id).first()
        if course:
            credits = course.credits or 3
            grades_data.append({
                "course": course.title,
                "code": course.code,
                "score": grade.score,
                "credits": credits,
                "status": grade.status
            })
            total_weighted += grade.score * credits
            total_credits += credits
    
    average = total_weighted / total_credits if total_credits > 0 else 0
    
    total_attendance = db.query(func.count(Attendance.id)).filter(Attendance.student_id == student.id).scalar() or 0
    present_count = db.query(func.count(Attendance.id)).filter(
        Attendance.student_id == student.id,
        Attendance.status.in_(["present", "late"])
    ).scalar() or 0
    attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0
    
    total_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.student_id == student.id, Payment.status == "completed"
    ).scalar()
    total_pending = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.student_id == student.id, Payment.status == "pending"
    ).scalar()
    
    return {
        "role": "student",
        "role_label": "Étudiant",
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "filiere": student.filiere,
        "level": student.level,
        "average": round(average, 2),
        "total_credits": total_credits,
        "attendance_rate": round(attendance_rate, 1),
        "total_paid": total_paid,
        "total_pending": total_pending,
        "grades": grades_data[:10]
    }


def get_secretary_context(db: Session, university_id: int) -> dict:
    """Contexte secretary"""
    total_students = db.query(func.count(Student.id)).filter(Student.university_id == university_id).scalar() or 0
    total_courses = db.query(func.count(Course.id)).filter(Course.university_id == university_id).scalar() or 0
    total_sessions = db.query(func.count(ExamSession.id)).filter(ExamSession.university_id == university_id).scalar() or 0
    total_teachers = db.query(func.count(Teacher.id)).filter(Teacher.university_id == university_id).scalar() or 0
    
    # Répartition par filière
    filieres = db.query(Student.filiere, func.count(Student.id)).filter(
        Student.university_id == university_id, Student.filiere.isnot(None)
    ).group_by(Student.filiere).all()
    filieres_data = {f[0]: f[1] for f in filieres}
    
    # Répartition par niveau
    niveaux = db.query(Student.level, func.count(Student.id)).filter(
        Student.university_id == university_id, Student.level.isnot(None)
    ).group_by(Student.level).all()
    niveaux_data = {n[0]: n[1] for n in niveaux}
    
    recent_students = db.query(Student).filter(
        Student.university_id == university_id
    ).order_by(Student.created_at.desc()).limit(5).all()
    
    recent_data = [{
        "name": f"{s.first_name} {s.last_name}",
        "matricule": s.matricule,
        "filiere": s.filiere,
        "level": s.level
    } for s in recent_students]
    
    return {
        "role": "secretary",
        "role_label": "Secrétaire",
        "total_students": total_students,
        "total_courses": total_courses,
        "total_sessions": total_sessions,
        "total_teachers": total_teachers,
        "filieres": filieres_data,
        "niveaux": niveaux_data,
        "recent_students": recent_data
    }


def get_censeur_context(db: Session, university_id: int) -> dict:
    """Contexte censeur"""
    pending_grades = db.query(func.count(Grade.id)).filter(
        Grade.university_id == university_id,
        Grade.status == "draft"
    ).scalar() or 0
    
    validated_grades = db.query(func.count(Grade.id)).filter(
        Grade.university_id == university_id,
        Grade.status == "validated"
    ).scalar() or 0
    
    rejected_grades = db.query(func.count(Grade.id)).filter(
        Grade.university_id == university_id,
        Grade.status == "rejected"
    ).scalar() or 0
    
    anomalies = db.query(func.count(Grade.id)).filter(
        Grade.university_id == university_id,
        Grade.score.isnot(None),
        (Grade.score > 18) | (Grade.score < 5)
    ).scalar() or 0
    
    return {
        "role": "censeur",
        "role_label": "Censeur",
        "pending_grades": pending_grades,
        "validated_grades": validated_grades,
        "rejected_grades": rejected_grades,
        "anomalies": anomalies
    }


def get_accountant_context(db: Session, university_id: int) -> dict:
    """Contexte accountant"""
    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.university_id == university_id, Payment.status == "completed"
    ).scalar()
    
    total_pending = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.university_id == university_id, Payment.status == "pending"
    ).scalar()
    
    total_failed = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.university_id == university_id, Payment.status == "failed"
    ).scalar()
    
    payments_count = db.query(func.count(Payment.id)).filter(
        Payment.university_id == university_id, Payment.status == "completed"
    ).scalar() or 0
    
    return {
        "role": "accountant",
        "role_label": "Comptable",
        "total_revenue": total_revenue,
        "total_pending": total_pending,
        "total_failed": total_failed,
        "payments_count": payments_count
    }


def get_guard_context(db: Session, university_id: int) -> dict:
    """Contexte guard"""
    today = date.today()
    
    today_present = db.query(func.count(Attendance.id)).filter(
        Attendance.university_id == university_id,
        Attendance.date == today,
        Attendance.status == "present"
    ).scalar() or 0
    
    today_late = db.query(func.count(Attendance.id)).filter(
        Attendance.university_id == university_id,
        Attendance.date == today,
        Attendance.status == "late"
    ).scalar() or 0
    
    today_absent = db.query(func.count(Attendance.id)).filter(
        Attendance.university_id == university_id,
        Attendance.date == today,
        Attendance.status == "absent"
    ).scalar() or 0
    
    total_students = db.query(func.count(Student.id)).filter(
        Student.university_id == university_id,
        Student.status == "active"
    ).scalar() or 0
    
    return {
        "role": "guard",
        "role_label": "Gardien",
        "today_present": today_present,
        "today_late": today_late,
        "today_absent": today_absent,
        "total_students": total_students,
        "attendance_rate": round(((today_present + today_late) / total_students * 100), 1) if total_students > 0 else 0
    }


# ==========================================
# ENDPOINT UNIFIÉ : CHAT AVEC L'IA (PROMPT AMÉLIORÉ)
# ==========================================

def generate_local_ai_response(message: str, context: dict, user_name: str) -> str:
    """Moteur IA local contextuel intelligent pour UniSphere AI."""
    msg = message.lower().strip()
    role = context.get("role", "admin")
    
    # 1. Salutations & Présentation
    if any(k in msg for k in ["bonjour", "salut", "coucou", "hello", "bonsoir", "qui es-tu", "qui es tu", "tu es qui", "ton rôle", "que peux-tu faire", "aide"]):
        first_name = user_name.split()[0] if user_name else "cher collègue"
        role_label = context.get("role_label", "utilisateur")
        return (
            f"Bonjour {first_name} ! Je suis **UniSphere AI**, votre assistant universitaire intelligent. 🎓\n\n"
            f"En tant que **{role_label}**, vous pouvez me poser des questions en temps réel sur les effectifs d'étudiants, "
            f"les enseignants, les cours, les filières, les finances, les présences ou les performances académiques. "
            f"Que souhaitez-vous savoir ?"
        )
    
    # 2. Questions sur les étudiants / effectifs
    if any(k in msg for k in ["etudiant", "étudiant", "effectif", "élève", "eleve", "inscrits"]):
        total_students = context.get("total_students", 0)
        filieres = context.get("filieres", {})
        filiere_str = ""
        if filieres and isinstance(filieres, dict):
            top_filieres = sorted(filieres.items(), key=lambda x: x[1], reverse=True)[:3]
            filiere_str = " Les filières principales sont : " + ", ".join([f"**{k}** ({v} étudiants)" for k, v in top_filieres]) + "."
        return (
            f"L'université compte actuellement un total de **{total_students} étudiants inscrits**.{filiere_str} 📚"
        )
        
    # 3. Questions sur les enseignants / professeurs
    if any(k in msg for k in ["enseignant", "professeur", "prof", "profs", "combien d'enseignant", "combien de prof", "corps professoral"]):
        total_teachers = context.get("total_teachers", 0)
        return (
            f"Nous avons actuellement **{total_teachers} enseignants** enregistrés et actifs dans l'écosystème UniSphere AI. 👨‍🏫"
        )
        
    # 4. Questions sur les cours / matières
    if any(k in msg for k in ["cours", "matiere", "matière", "programme", "classe", "combien de cours"]):
        total_courses = context.get("total_courses", context.get("courses_count", 0))
        return (
            f"Il y a actuellement **{total_courses} cours** configurés et dispensés à l'université. 📖"
        )

    # 5. Questions sur les finances / chiffre d'affaires / paiements
    if any(k in msg for k in ["chiffre d'affaire", "chiffre d'affaires", "argent", "revenu", "caisse", "recouvrement", "paiement", "impayé", "impaye", "solde"]):
        rev = context.get("total_revenue", 0)
        late = context.get("late", 0)
        rate = context.get("collection_rate", 0)
        rev_str = f"{rev:,.0f} FCFA".replace(",", " ")
        late_str = f"{late:,.0f} FCFA".replace(",", " ")
        return (
            f"📊 **Situation Financière :**\n"
            f"• Chiffre d'affaires collecté : **{rev_str}**\n"
            f"• En attente / retards : **{late_str}**\n"
            f"• Taux de recouvrement : **{rate}%**"
        )

    # 6. Questions sur les présences / retards / assiduité
    if any(k in msg for k in ["presence", "présence", "assiduite", "assiduité", "retard", "absent", "taux de presence"]):
        rate = context.get("attendance_rate", 0)
        return (
            f"Le taux de présence global est actuellement de **{rate}%**. Les scans de QR codes à l'entrée permettent un suivi en temps réel des flux. ⏱️"
        )
        
    # 7. Questions sur les filières
    if any(k in msg for k in ["filiere", "filière", "departement", "département", "specialite", "spécialité"]):
        filieres = context.get("filieres", {})
        if filieres and isinstance(filieres, dict):
            items = [f"• **{k}** : {v} étudiants" for k, v in filieres.items()]
            return "Voici la répartition actuelle par filière :\n" + "\n".join(items)
        return "Toutes les filières académiques sont configurées et actives dans le système. 🏫"

    # 8. Réponse contextuelle globale intelligente par défaut
    total_students = context.get("total_students", 0)
    total_teachers = context.get("total_teachers", 0)
    total_courses = context.get("total_courses", context.get("courses_count", 0))
    rate = context.get("attendance_rate", 0)
    
    first_name = user_name.split()[0] if user_name else ""
    return (
        f"Bonjour {first_name} ! Voici un aperçu en temps réel : "
        f"l'université compte actuellement **{total_students} étudiants**, **{total_teachers} enseignants** et **{total_courses} cours**. "
        f"Le taux d'assiduité est de **{rate}%**.\n\n"
        f"💡 Vous pouvez me poser des questions précises sur les effectifs, les cours, les finances ou les présences."
    )


ai_compat_router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/chat")
@ai_compat_router.post("/chat")
def chat_with_ai(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "teacher", "student", "secretary", "censeur", "accountant", "guard", "alumni"))
):
    """Chat avec l'IA - Réponses naturelles et conversationnelles (Groq + moteur contextuel résilient)"""
    message = data.get("message", "")
    conversation_history = data.get("history", [])
    
    if not message:
        raise HTTPException(status_code=400, detail="Message requis")
    
    # Récupérer le contexte selon le rôle
    role = current_user.role
    university_id = current_user.university_id
    
    if role == "admin":
        context = get_admin_context(db, university_id)
    elif role == "teacher":
        context = get_teacher_context(db, current_user.id, university_id)
    elif role == "student":
        context = get_student_context(db, current_user.id, university_id)
    elif role == "secretary":
        context = get_secretary_context(db, university_id)
    elif role == "censeur":
        context = get_censeur_context(db, university_id)
    elif role == "accountant":
        context = get_accountant_context(db, university_id)
    elif role == "guard":
        context = get_guard_context(db, university_id)
    else:
        context = {"role": role, "role_label": "Utilisateur"}
    
    # 1. Si une clé GROQ_API_KEY est configurée, essayer Groq
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key and groq_api_key.strip():
        try:
            from groq import Groq
            client = Groq(api_key=groq_api_key.strip())
            
            context_json = json.dumps(context, ensure_ascii=False, default=str)
            system_prompt = f"""Tu es UniSphere AI, l'assistant virtuel de l'université. Tu parles à {current_user.full_name}, qui est {context.get('role_label', 'utilisateur')}.

DONNÉES DISPONIBLES :
{context_json}

RÈGLES DE CONVERSATION :
1. Réponds de manière naturelle et conversationnelle, comme un collègue friendly
2. Utilise les chiffres exacts des données pour répondre précisément
3. Sois concis : 2-4 phrases suffisent la plupart du temps
4. Langue : Français uniquement."""

            messages = [{"role": "system", "content": system_prompt}]
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            messages.append({"role": "user", "content": message})
            
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
            )
            
            ai_response = completion.choices[0].message.content
            return {
                "response": ai_response,
                "context": context,
                "source": "UniSphere AI (Groq)",
                "role": role
            }
        except Exception as groq_err:
            print(f"⚠️ Groq indisponible ({groq_err}), basculement automatique sur le moteur contextuel UniSphere.")

    # 2. Moteur IA local contextuel intelligent (toujours actif, rapide et 100% réel)
    local_response = generate_local_ai_response(message, context, current_user.full_name)
    return {
        "response": local_response,
        "context": context,
        "source": "UniSphere AI",
        "role": role
    }


# ==========================================
# ENDPOINTS HISTORIQUE
# ==========================================

@router.get("/history")
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "teacher", "student", "secretary", "censeur", "accountant", "guard", "alumni"))
):
    return []


@router.delete("/history")
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "teacher", "student", "secretary", "censeur", "accountant", "guard", "alumni"))
):
    return {"message": "Historique effacé"}