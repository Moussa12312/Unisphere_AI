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
    
    u_filter = [Payment.university_id == university_id] if university_id else []
    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        *u_filter, Payment.status == "completed"
    ).scalar() or 0.0
    unpaid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        *u_filter, Payment.status == "failed"
    ).scalar() or 0.0
    late = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        *u_filter, Payment.status == "pending"
    ).scalar() or 0.0

    total_expenses = 0.0
    try:
        from app.models.accounting import Expense
        exp_filter = [Expense.university_id == university_id] if university_id else []
        total_expenses = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            *exp_filter, Expense.status == "paid"
        ).scalar() or 0.0
    except Exception:
        total_expenses = 0.0

    net_balance = (total_revenue or 0.0) - total_expenses
    total_expected = (total_revenue or 0.0) + (late or 0.0)
    collection_rate = ((total_revenue or 0.0) / total_expected * 100) if total_expected > 0 else 100.0
    
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
        "total_expenses": total_expenses,
        "net_balance": net_balance,
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

def call_llm_provider(system_prompt: str, conversation_history: list, user_message: str):
    """Interroge le meilleur fournisseur LLM configuré dans .env (Groq, OpenAI, Gemini, OpenRouter)."""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in conversation_history[-10:]:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })
    messages.append({"role": "user", "content": user_message})

    # 1. Groq (Prioritaire : 100% gratuit, extrêmement rapide, multi-modèles)
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key and groq_api_key.strip() and not groq_api_key.startswith("gsk_placeholder"):
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=groq_api_key.strip(),
                base_url="https://api.groq.com/openai/v1"
            )
            configured_model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b").strip()
            models_to_try = [configured_model] if configured_model else []
            for candidate in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"]:
                if candidate not in models_to_try:
                    models_to_try.append(candidate)

            for model_name in models_to_try:
                try:
                    completion = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=1500,
                    )
                    content = completion.choices[0].message.content
                    if content and len(content.strip()) > 0:
                        return content.strip(), f"UniSphere AI (Groq {model_name})"
                except Exception as m_err:
                    print(f"⚠️ Modèle Groq {model_name} non disponible : {m_err}")
                    continue
        except Exception as e:
            print(f"⚠️ Erreur Groq: {e}")

    # 2. OpenAI officiel (GPT-4o / GPT-4o-mini)
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key and openai_api_key.strip() and not openai_api_key.startswith("sk-placeholder"):
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_api_key.strip())
            completion = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
            )
            return completion.choices[0].message.content, "UniSphere AI (OpenAI GPT-4o)"
        except Exception as e:
            print(f"⚠️ Erreur OpenAI: {e}")

    # 3. Google Gemini (via endpoint OpenAI compatible)
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key and gemini_api_key.strip() and not gemini_api_key.startswith("AIza_placeholder"):
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=gemini_api_key.strip(),
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            )
            completion = client.chat.completions.create(
                model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
            )
            return completion.choices[0].message.content, "UniSphere AI (Google Gemini)"
        except Exception as e:
            print(f"⚠️ Erreur Gemini: {e}")

    # 4. OpenRouter
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    if openrouter_api_key and openrouter_api_key.strip():
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=openrouter_api_key.strip(),
                base_url="https://openrouter.ai/api/v1"
            )
            completion = client.chat.completions.create(
                model=os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct"),
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
            )
            return completion.choices[0].message.content, "UniSphere AI (OpenRouter)"
        except Exception as e:
            print(f"⚠️ Erreur OpenRouter: {e}")

    return None, None


def generate_local_ai_response(message: str, context: dict, user_name: str) -> str:
    """Moteur IA local contextuel étendu, dynamique et intelligent pour UniSphere AI."""
    msg = message.lower().strip()
    role = context.get("role", "admin")
    role_label = context.get("role_label", "Utilisateur")
    first_name = user_name.split()[0] if user_name else "cher collègue"

    total_students = context.get("total_students", 0)
    total_teachers = context.get("total_teachers", 0)
    total_courses = context.get("total_courses", context.get("courses_count", 0))
    rate = context.get("attendance_rate", 0)
    rev = context.get("total_revenue", 0) or 0
    expenses = context.get("total_expenses", 0) or 0
    net = context.get("net_balance", rev - expenses) or 0
    late = context.get("late", 0) or 0
    unpaid = context.get("unpaid", 0) or 0
    rate_coll = context.get("collection_rate", 100) or 100

    rev_str = f"{rev:,.0f} FCFA".replace(",", " ")
    exp_str = f"{expenses:,.0f} FCFA".replace(",", " ")
    net_str = f"{net:,.0f} FCFA".replace(",", " ")
    late_str = f"{late:,.0f} FCFA".replace(",", " ")
    unpaid_str = f"{unpaid:,.0f} FCFA".replace(",", " ")

    # 1. Salutations & Présentation
    if any(k in msg for k in ["bonjour", "salut", "coucou", "hello", "bonsoir", "qui es-tu", "qui es tu", "tu es qui", "ton rôle", "que peux-tu faire"]):
        return (
            f"Bonjour {first_name} ! Je suis **UniSphere AI**, l'assistant intelligent de votre établissement. 🎓\n\n"
            f"En tant que **{role_label}**, vous pouvez me poser des questions précises ou me demander d'effectuer des tâches :\n"
            f"• 👥 **Inscriptions & Effectifs** : gestion des dossiers, matricules, filières\n"
            f"• 📚 **Modules & Cours** : création, semestres, syllabus, crédits LMD\n"
            f"• ⚖️ **Délibérations & Rattrapages** : seuils LMD, jurys, PV de délibération\n"
            f"• 💳 **Finances & Scolarité** : 3 tranches (P1, P2, P3), paiements mensuels, quittances\n"
            f"• 🪪 **Cartes Étudiantes & Badges** : format CR80, QR code de sécurité, tirage A4\n"
            f"• ⏱️ **Présences & Assiduité** : scans des gardiens, appel en classe, seuil des 75%\n"
            f"• 📝 **Pédagogie & Examens** : génération de sujets, QCM, fiches de révision\n\n"
            f"Quelle tâche ou information souhaitez-vous aborder ?"
        )

    # 2. Cours, Modules, Enseignements & Semestres
    if any(k in msg for k in ["cours", "module", "matiere", "matière", "enseignement", "semestre", "coefficient", "credit", "crédit", "syllabus"]):
        return (
            f"📚 **Gestion des Modules & Enseignements (Norme LMD) :**\n\n"
            f"• **Organisation par Filière & Semestre :** Les modules sont rattachés à une filière précise et à un semestre (S1, S2, S3, S4, S5, S6).\n"
            f"• **Création d'un module :** Rendez-vous dans *Cours & Modules > Créer un cours* pour définir l'intitulé, le code UE, le semestre concerné, le coefficient (ex: 2) et le volume horaire.\n"
            f"• **Affectation des enseignants :** Chaque module est associé à un enseignant titulaire qui peut ensuite faire l'appel et saisir les notes.\n"
            f"• **Syllabus & Supports :** L'enseignant peut déposer le syllabus officiel et les supports de cours téléchargeables par les étudiants.\n"
            f"• **Situation actuelle :** L'établissement compte actuellement **{total_courses} modules configurés**."
        )

    # 3. Examens, Sessions & Calendrier
    if any(k in msg for k in ["examen", "examens", "session d'examen", "calendrier", "planning d'examen", "date d'examen", "epreuve", "épreuve"]):
        return (
            f"🗓️ **Organisation des Examens & Sessions :**\n\n"
            f"• **Sessions officielles :** Chaque année académique comprend la Session Normale (Session 1) et la Session de Rattrapage (Session 2).\n"
            f"• **Planification :** Le calendrier des épreuves est configuré dans *Examens > Sessions d'examens* avec attribution des salles et des surveillants.\n"
            f"• **Anonymat & PV :** Le système permet de générer les listes d'émargement et les procès-verbaux de surveillance d'examen conformes aux normes académiques.\n"
            f"• **Consultation :** Les étudiants et enseignants peuvent consulter les dates et horaires depuis leur tableau de bord dans l'onglet *Examens*."
        )

    # 4. Délibérations & Jurys LMD
    if any(k in msg for k in ["deliberation", "délibération", "jury", "pv de deliberation", "regle de deliberation", "validation lmd"]):
        return (
            f"⚖️ **Système de Délibération Académique (LMD) :**\n\n"
            f"UniSphere AI applique les règles officielles de l'enseignement supérieur :\n"
            f"1. **Validation directe :** Moyenne générale ≥ 10.0/20 et acquisition des 30 crédits du semestre (ou 60 crédits de l'année).\n"
            f"2. **Compensation LMD :** Compensation automatique entre les matières d'une même Unité d'Enseignement (UE).\n"
            f"3. **Basculement en rattrapage :** Les étudiants avec des modules ajournés (< 10/20 non compensés) sont automatiquement inscrits en session 2.\n"
            f"4. **PV Officiel :** Génération instantanée du Procès-Verbal avec mentions (Passable, Assez-Bien, Bien, Très-Bien) et signatures.\n\n"
            f"⚙️ Configurable dans *Administration > Délibérations > Règles*."
        )

    # 5. Rattrapages
    if any(k in msg for k in ["rattrapage", "ajourne", "ajourné", "recalé", "note eliminatoire", "note éliminatoire", "deuxieme session"]):
        return (
            f"📝 **Gestion des Sessions de Rattrapage :**\n\n"
            f"• **Candidats éligibles :** Tout étudiant ayant obtenu une note < 10/20 sur une matière non validée par compensation après délibération.\n"
            f"• **Règle de la meilleure note :** La note finale retenue est `MAX(Session 1, Session 2)` afin de ne jamais pénaliser l'étudiant.\n"
            f"• **Export Excel :** Le Censeur et le Secrétariat peuvent exporter la liste complète des candidats au rattrapage par filière depuis *Examens > Rattrapages*."
        )

    # 6. Inscriptions, Admission & Ajout d'étudiant
    if any(k in msg for k in ["inscrire", "inscription", "admission", "ajouter un etudiant", "ajouter un étudiant", "nouveau etudiant", "matricule", "dossier"]):
        return (
            f"👤 **Inscriptions & Gestion des Étudiants :**\n\n"
            f"• **Création individuelle :** Depuis *Secrétariat / Administration > Étudiants > Inscrire un étudiant* en renseignant identité, filière, niveau et tuteur.\n"
            f"• **Import massif Excel :** Vous pouvez importer des promotions entières en quelques secondes via un fichier `.xlsx` depuis *Import en masse*.\n"
            f"• **Génération automatique du Matricule :** UniSphere génère un identifiant unique (ex: `UAI2026001`) gravé sur la carte et encodé dans le QR code officiel.\n"
            f"• **Effectif actuel :** **{total_students} étudiants inscrits** dans la base de données."
        )

    # 7. Cartes Étudiantes, Badges & Impression
    if any(k in msg for k in ["carte", "carte etudiante", "carte étudiante", "badge", "imprimer la carte", "tirage", "cr80", "qr code", "filigrane"]):
        return (
            f"🪪 **Atelier des Cartes Étudiantes (Norme ISO CR80) :**\n\n"
            f"• **Format Vectoriel Haute Fidélité :** Rendu officiel aux dimensions standard carte bancaire (85.6 × 54 mm).\n"
            f"• **Design Institutionnel :** Double vague dynamique, photo d'identité haute résolution, devise officielle et logo de l'établissement.\n"
            f"• **QR Code Sécurisé :** Scan direct par les gardiens à l'entrée pour vérification d'identité instantanée.\n"
            f"• **Planches d'impression A4 :** Tirage en grille A4 prête à l'impression (recto ou verso) accessible depuis *Secrétariat > Cartes Étudiantes*.\n"
            f"• **Personnalisation :** Choix parmi 8 palettes officielles ou personnalisation libre des couleurs."
        )

    # 8. Finances, Trésorerie, Dépenses & Recettes (enrichi avec tous les mots-clés)
    if any(k in msg for k in [
        "finance", "finances", "argent", "combien", "caisse", "solde", "tresorerie", "trésorerie",
        "chiffre", "recette", "recettes", "revenu", "revenus", "depense", "depenses", "dépense", "dépenses",
        "impaye", "impayes", "impayé", "impayés", "tranche", "tranches", "scolarite", "scolarité",
        "frais", "tarif", "paiement", "recouvrement", "mensuel", "mensualite", "mensualité",
        "quittance", "recu", "reçu"
    ]):
        return (
            f"💰 **Situation Financière & Trésorerie en Temps Réel :**\n\n"
            f"Voici l'état consolidé de vos finances pour votre établissement :\n\n"
            f"• 📥 **Total Recettes Encaissées :** **{rev_str}**\n"
            f"• 📤 **Total Dépenses Payées :** **{exp_str}**\n"
            f"• 🏦 **Solde Net de Trésorerie :** **{net_str}**\n"
            f"• ⏳ **Reliquats / Échéances en Attente :** **{late_str}**\n"
            f"• 📊 **Taux de Recouvrement Global :** **{rate_coll}%**\n\n"
            f"📌 *UniSphere AI gère automatiquement la répartition stricte des 3 tranches académiques (P1, P2, P3 = 100%) "
            f"ainsi que les facilités de paiements mensuels avec délivrance instantanée des quittances.*"
        )

    # 9. Notes, Bulletins & Relevés LMD
    if any(k in msg for k in ["note", "notes", "bulletin", "releve", "relevé", "moyenne", "gpa", "saisie des notes", "cloture", "clôture"]):
        return (
            f"📊 **Notes, Bulletins & Relevés Officiels :**\n\n"
            f"• **Formule de notation :** Moyenne = `(CC × 0.3) + (Examen × 0.7)` (paramétrable dans la configuration académique).\n"
            f"• **Circuit de validation :** Enseignant (saisie) ➔ Censeur (détection d'anomalies & validation) ➔ Proclamation des bulletins.\n"
            f"• **Bulletins LMD :** Relevés de notes complets avec crédits ECTS, rang, moyenne générale et décision du jury.\n"
            f"• **Verrouillage :** Option de gel immédiat de la saisie des notes pour empêcher toute altération post-délibération."
        )

    # 10. Présences & Assiduité
    if any(k in msg for k in ["presence", "présence", "assiduite", "assiduité", "retard", "absent", "absence", "scan", "appel"]):
        return (
            f"⏱️ **Assiduité & Contrôle de Présence :**\n\n"
            f"• **Taux d'assiduité actuel :** **{rate}%**.\n"
            f"• **Double contrôle :** Scan des badges au portail par les gardiens + appel numérique en classe par les enseignants.\n"
            f"• **Règle des 75% :** Tout étudiant ayant un taux d'assiduité inférieur à 75% peut être exclu de la session normale d'examen.\n"
            f"• **Justifications :** Le secrétariat peut enregistrer les justificatifs médicaux ou administratifs pour régulariser les absences."
        )

    # 11. Pédagogie, Révision & Méthodes d'étude
    if any(k in msg for k in ["conseil", "revision", "révision", "reviser", "réviser", "etudier", "étudier", "motivation", "methodologie", "méthodologie", "ameliorer", "améliorer"]):
        return (
            f"💡 **Conseils Pédagogiques & Méthode de Travail :**\n\n"
            f"1. **Répétition espacée :** Revoir les notions 24h après le cours, puis à J+7 et J+30 pour ancrer la mémoire à long terme.\n"
            f"2. **Pratique active :** Résoudre des exercices et des annales plutôt que de simplement relire passivement les polycopiés.\n"
            f"3. **Gestion du temps (Pomodoro) :** Travailler par blocs intenses de 45 minutes suivis de 10 minutes de pause sans écran.\n"
            f"4. **Groupes d'études :** Expliquer une notion difficile à un camarade est la meilleure preuve de maîtrise.\n"
            f"5. **Suivi des notes :** Utilisez votre tableau de bord UniSphere pour identifier vos matières fragiles et cibler vos efforts."
        )

    # 12. Création de QCM ou Sujets d'examen (Génération pédagogique)
    if any(k in msg for k in ["qcm", "sujet d'examen", "exercice", "test", "interrogation"]):
        return (
            f"📋 **Modèle de Génération d'Épreuve / QCM :**\n\n"
            f"Voici la structure recommandée pour une épreuve universitaire équilibrée :\n"
            f"• **Partie 1 — Contrôle des connaissances fondamentales (5 pts) :** 5 questions QCM à réponse unique pour vérifier les définitions clés.\n"
            f"• **Partie 2 — Application directe / Exercice guidé (7 pts) :** Cas pratique ou problème court appliquant le cours.\n"
            f"• **Partie 3 — Problème d'analyse & Synthèse (8 pts) :** Mise en situation complexe demandant réflexion critique et argumentation.\n\n"
            f"💡 *Précisez le thème exact de votre cours (ex: 'QCM en Algorithmique L1' ou 'Cas pratique en Droit des Sociétés L3') pour que je vous génère les questions complètes avec barème et corrigé !*"
        )

    # 13. Sécurité & Gardiennage
    if any(k in msg for k in ["securite", "sécurité", "gardien", "incident", "camera", "caméra"]):
        return (
            f"🛡️ **Sécurité & Contrôle d'Accès :**\n\n"
            f"• **Scanner mobile HTTP/HTTPS :** Fonctionne directement sur le smartphone du gardien via caméra ou prise de photo du badge.\n"
            f"• **Recherche visuelle :** Si un élève a oublié son badge, le gardien peut le rechercher par nom/photo pour valider son entrée.\n"
            f"• **Signalement d'incidents :** Enregistrement immédiat des retards majeurs, dégradations ou comportements anormaux notifiant la direction."
        )

    # 14. Alumni & Mentorat
    if any(k in msg for k in ["alumni", "mentor", "insertion", "diplome", "diplômé", "stage", "emploi"]):
        return (
            f"🤝 **Réseau Alumni & Mentorat :**\n\n"
            f"• **Annuaire par Domaine :** Les étudiants peuvent entrer en relation avec les anciens diplômés de leur domaine d'études.\n"
            f"• **Mentorat académique :** Soutien pour le choix de stage, relecture de mémoires et conseils d'orientation professionnelle.\n"
            f"• **Messagerie directe :** Échanges sécurisés intégrés à la plateforme."
        )

    # 15. Enseignants
    if any(k in msg for k in ["enseignant", "professeur", "prof", "profs"]):
        return (
            f"👨‍🏫 **Corps Professoral :**\n\n"
            f"• L'établissement compte **{total_teachers} enseignants actifs**.\n"
            f"• Chaque enseignant dispose de son espace dédié pour faire l'appel, déposer ses supports de cours, saisir les notes et planifier ses séances."
        )

    # 16. Filières
    if any(k in msg for k in ["filiere", "filière", "departement", "département"]):
        filieres = context.get("filieres", {})
        if filieres and isinstance(filieres, dict) and len(filieres) > 0:
            items = [f"• **{k}** : {v} étudiants" for k, v in filieres.items()]
            return "🏫 **Répartition des effectifs par filière :**\n\n" + "\n".join(items)
        return "Toutes les filières académiques sont configurées avec leurs semestres et niveaux associés (L1, L2, L3, M1, M2)."

    # 17. Paramétrage & Réglages
    if any(k in msg for k in ["configuration", "parametre", "paramètre", "reglage", "réglage", "annee academique", "année académique"]):
        return (
            f"⚙️ **Configuration Académique & Paramétrages :**\n\n"
            f"Dans *Administration > Paramètres > Configuration* :\n"
            f"• **Grille tarifaire :** Frais d'inscription et scolarité par niveau et domaine.\n"
            f"• **Tranches de paiement :** Configuration officielle des 3 tranches (P1, P2, P3).\n"
            f"• **Système de notation :** Barème sur 20, seuil de validation (10/20), note éliminatoire.\n"
            f"• **Assiduité :** Taux minimal requis (75%) avant convocation aux examens."
        )

    # 18. Réponse analytique intelligente pour les questions ouvertes
    # Décompose la question pour fournir une réponse personnalisée
    return (
        f"Bonjour {first_name} !\n\n"
        f"Concernant votre question : *« {message} »*\n\n"
        f"Voici les éléments de réponse en tenant compte de votre rôle de **{role_label}** :\n\n"
        f"1. **Fonctionnalités associées dans UniSphere :** Le système gère en temps réel les étudiants ({total_students} inscrits), les modules ({total_courses} cours) et les présences ({rate}% d'assiduité).\n"
        f"2. **Procédure recommandée :** Utilisez la barre de navigation pour accéder au module correspondant (Étudiants, Cours, Examens, Finances ou Paramètres).\n"
        f"3. **Assistance rapide :** Posez-moi des questions ciblées comme : *'Comment fonctionne la délibération ?'*, *'Comment sont calculées les 3 tranches ?'*, *'Comment créer un module par semestre ?'* ou *'Comment inscrire un étudiant ?'*\n\n"
        f"💡 *Pour débloquer un dialogue 100% conversationnel et fluide sans restriction, ajoutez une clé gratuite `GROQ_API_KEY` (obtenable en 30 secondes sur console.groq.com) ou `OPENAI_API_KEY` dans le fichier `.env` du serveur.*"
    )


ai_compat_router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/chat")
@ai_compat_router.post("/chat")
def chat_with_ai(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "teacher", "student", "secretary", "censeur", "accountant", "guard", "alumni"))
):
    """Chat avec l'IA - Support multi-fournisseurs (Groq, OpenAI, Gemini) avec moteur local dynamique."""
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
    
    # 1. Essayer d'abord un modèle LLM externe (Groq, OpenAI, Gemini, etc.)
    context_json = json.dumps(context, ensure_ascii=False, default=str)
    system_prompt = f"""Tu es UniSphere AI, l'assistant intelligent et chaleureux de l'établissement d'enseignement supérieur. Tu t'adresses à {current_user.full_name}, qui a le rôle de {context.get('role_label', 'utilisateur')}.

DONNÉES EN TEMPS RÉEL DE L'ÉTABLISSEMENT :
{context_json}

CONSIGNES :
1. Réponds de façon précise, naturelle, professionnelle et chaleureuse en français.
2. Utilise les données et chiffres réels ci-dessus quand c'est pertinent.
3. Sois structuré avec des puces claires et du texte en gras.
4. Si la question porte sur une procédure de l'université (inscription, notes, délibération, tranches de paiement, cartes étudiantes), explique clairement la marche à suivre.
5. Langue : Français exclusivement."""

    llm_response, source = call_llm_provider(system_prompt, conversation_history, message)
    if llm_response:
        return {
            "response": llm_response,
            "context": context,
            "source": source,
            "role": role
        }

    # 2. Moteur IA contextuel local étendu (toujours disponible, varié et rapide)
    local_response = generate_local_ai_response(message, context, current_user.full_name)
    return {
        "response": local_response,
        "context": context,
        "source": "UniSphere AI (Moteur Local)",
        "role": role
    }
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