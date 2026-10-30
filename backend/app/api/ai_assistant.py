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
    """Moteur IA local contextuel intelligent et riche pour UniSphere AI."""
    msg = message.lower().strip()
    role = context.get("role", "admin")
    role_label = context.get("role_label", "Utilisateur")
    first_name = user_name.split()[0] if user_name else "cher collègue"

    # 1. Salutations & Présentation
    if any(k in msg for k in ["bonjour", "salut", "coucou", "hello", "bonsoir", "qui es-tu", "qui es tu", "tu es qui", "ton rôle", "que peux-tu faire", "aide"]):
        return (
            f"Bonjour {first_name} ! Je suis **UniSphere AI**, l'assistant intelligent de votre établissement universitaire. 🎓\n\n"
            f"En tant que **{role_label}**, vous pouvez m'interroger sur :\n"
            f"• 👥 **Effectifs & Inscriptions** (étudiants, filières, promotions)\n"
            f"• 📚 **Notes, Délibérations & Rattrapages** (jury LMD, seuil de validation, rattrapages)\n"
            f"• 📅 **Emplois du temps & Salles** (créneaux de cours, disponibilités)\n"
            f"• ⏱️ **Présences & Suivi enseignant** (taux d'assiduité, ponctualité, scans)\n"
            f"• 💳 **Finances & Scolarité** (recouvrement des tranches, quittances)\n"
            f"• 📜 **Attestations & Relevés de notes** (génération et validation)\n"
            f"• 🤝 **Réseau Alumni & Mentorat**\n\n"
            f"Quelle information souhaitez-vous consulter aujourd'hui ?"
        )

    # 2. Délibérations & Jurys
    if any(k in msg for k in ["deliberation", "délibération", "jury", "pv", "regle de deliberation", "règle de délibération"]):
        return (
            f"⚖️ **Système de Délibération Académique (LMD) :**\n\n"
            f"Le module de délibération d'UniSphere AI applique les règles officielles de l'enseignement supérieur :\n"
            f"1. **Validation directe :** Moyenne générale ≥ 10.0/20 et validation des 30 crédits du semestre (ou 60 crédits de l'année).\n"
            f"2. **Compensation LMD :** Compensation inter-matières au sein d'une même UE si la moyenne de l'UE atteint le seuil requis.\n"
            f"3. **Orientation vers le rattrapage :** Les étudiants ayant des UE ajournées (< 10/20 non compensables) sont automatiquement versés en session de rattrapage.\n"
            f"4. **Procès-Verbal (PV) :** Génération automatique du PV de jury officiel avec signatures et mention (Passable, Assez-Bien, Bien, Très-Bien).\n\n"
            f"💡 Les règles de calcul peuvent être affinées dans la section *Administration > Délibérations > Règles*."
        )

    # 3. Rattrapages & Sessions de rattrapage
    if any(k in msg for k in ["rattrapage", "session de rattrapage", "ajourne", "ajourné", "recalé", "note eliminatoire", "note éliminatoire"]):
        return (
            f"📝 **Gestion des Sessions de Rattrapage :**\n\n"
            f"• **Éligibilité :** Tout étudiant ayant obtenu une note inférieure à 10/20 à la session normale sur une matière non validée par compensation est éligible au rattrapage.\n"
            f"• **Organisation :** Le Censeur et le Secrétaire peuvent consulter la liste des candidats par filière et générer l'état complet en Excel (.xlsx).\n"
            f"• **Prise en compte de la note :** La note retenue après délibération de rattrapage est calculée selon la règle de la meilleure note (Session 1 vs Session 2).\n"
            f"• **Export :** Vous pouvez exporter la liste des étudiants en rattrapage depuis *Examens > Rattrapages*."
        )

    # 4. Emploi du temps & Planning
    if any(k in msg for k in ["emploi du temps", "planning", "horaire", "cours du jour", "salle", "creneau", "créneau"]):
        return (
            f"📅 **Emploi du Temps & Planification :**\n\n"
            f"L'emploi du temps est synchronisé en temps réel avec les présences et les cartes étudiantes :\n"
            f"• Les cours sont structurés par jour (Lundi au Samedi) avec horaires de début et de fin, salle attribuée et enseignant titulaire.\n"
            f"• La présence des élèves est automatiquement vérifiée par rapport aux cours réellement programmés dans leur emploi du temps.\n"
            f"• Vous pouvez consulter et imprimer le planning hebdomadaire depuis *Planning / Emploi du temps*."
        )

    # 5. Notes, Saisie & Clôture
    if any(k in msg for k in ["fermer la saisie", "cloture", "clôture", "saisie des notes", "valider les notes", "bulletin", "releve", "relevé"]):
        return (
            f"📊 **Gestion et Clôture des Notes :**\n\n"
            f"• **Saisie :** Les enseignants et le secrétariat peuvent renseigner les notes de Contrôle Continu (CC) et d'Examen.\n"
            f"• **Validation Censeur :** Le Censeur vérifie les anomalies statistiques (notes aberrantes, écarts types).\n"
            f"• **Verrouillage de sécurité :** Un bouton *'Fermer / Rouvrir la saisie des notes'* est disponible sur les interfaces Administration, Censeur et Secrétaire pour geler toute modification dès que les notes sont proclamées."
        )

    # 6. Attestations, Certificats & Documents
    if any(k in msg for k in ["attestation", "certificat", "document", "demande d'attestation", "releve officiel"]):
        return (
            f"📜 **Attestations & Documents Officiels :**\n\n"
            f"• Les étudiants peuvent soumettre des demandes en ligne : *Attestation de scolarité*, *Attestation de réussite*, *Relevé de notes officiel LMD*.\n"
            f"• Dès que le Secrétariat valide ou refuse une demande, l'étudiant reçoit une **notification instantanée** sur son compte avec prévisualisation et bouton d'impression haute fidélité (marges aérées, logo officiel et QR code de vérification)."
        )

    # 7. Présence & Suivi des Enseignants
    if any(k in msg for k in ["presence", "présence", "assiduite", "assiduité", "retard", "absent", "taux de presence", "suivi enseignant"]):
        rate = context.get("attendance_rate", 0)
        return (
            f"⏱️ **Présences & Suivi de Ponctualité :**\n\n"
            f"• **Taux d'assiduité global :** **{rate}%**.\n"
            f"• **Double présence :** 1) Présence journalière à l'école (scan gardien ou synchronisation automatique dès que l'élève est noté présent en cours), et 2) Présence par module selon l'appel de l'enseignant.\n"
            f"• **Suivi Enseignants :** Le tableau de bord Admin et Censeur intègre le suivi des heures effectives, des heures perdues et du taux de ponctualité de chaque enseignant."
        )

    # 8. Finances & Scolarité
    if any(k in msg for k in ["chiffre d'affaire", "chiffre d'affaires", "argent", "revenu", "caisse", "recouvrement", "paiement", "impayé", "impaye", "solde", "tranche", "quittance"]):
        rev = context.get("total_revenue", 0)
        late = context.get("late", 0)
        rate = context.get("collection_rate", 0)
        rev_str = f"{rev:,.0f} FCFA".replace(",", " ")
        late_str = f"{late:,.0f} FCFA".replace(",", " ")
        return (
            f"💳 **Situation Financière de l'Établissement :**\n\n"
            f"• **Recouvrement total encaissé :** **{rev_str}**\n"
            f"• **Reliquats / Tranches en attente :** **{late_str}**\n"
            f"• **Taux de recouvrement :** **{rate}%**\n\n"
            f"📄 Les quittances officielles font la distinction automatique entre une *'Attestation de paiement partiel'* (reste à solder) et une *'Quittance financière officielle'* (intégralité soldée 100%)."
        )

    # 9. Incidents & Gardiennage
    if any(k in msg for k in ["incident", "securite", "sécurité", "gardien", "badge", "camera", "caméra"]):
        return (
            f"🛡️ **Sécurité & Contrôle d'Accès :**\n\n"
            f"• **Scanner mobile :** Les gardiens peuvent scanner les badges par caméra directe ou en prenant une photo du badge sur mobile (compatible HTTP sans SSL).\n"
            f"• **Signalement d'incidents :** Le gardien recherche directement l'élève avec sa photo et son nom complet pour enregistrer un incident sans devoir mémoriser son matricule."
        )

    # 10. Alumni & Insertion
    if any(k in msg for k in ["alumni", "mentor", "insertion", "diplome", "diplômé", "ancien"]):
        return (
            f"🎓 **Réseau Alumni & Mentorat :**\n\n"
            f"• Les étudiants peuvent explorer les profils des anciens diplômés de **leur domaine d'études** (pas seulement leur filière étroite) pour trouver un mentor, un directeur de mémoire ou une opportunité de stage.\n"
            f"• Les alumni disposent d'un espace dédié pour échanger par messagerie sécurisée avec les étudiants."
        )

    # 11. Étudiants / Effectifs
    if any(k in msg for k in ["etudiant", "étudiant", "effectif", "élève", "eleve", "inscrits"]):
        total_students = context.get("total_students", 0)
        filieres = context.get("filieres", {})
        filiere_str = ""
        if filieres and isinstance(filieres, dict):
            top_filieres = sorted(filieres.items(), key=lambda x: x[1], reverse=True)[:3]
            filiere_str = " Les filières les plus représentées sont : " + ", ".join([f"**{k}** ({v} étudiants)" for k, v in top_filieres]) + "."
        return (
            f"👥 L'établissement compte actuellement un effectif de **{total_students} étudiants inscrits**.{filiere_str}"
        )

    # 12. Enseignants
    if any(k in msg for k in ["enseignant", "professeur", "prof", "profs"]):
        total_teachers = context.get("total_teachers", 0)
        return (
            f"👨‍🏫 L'établissement compte **{total_teachers} enseignants** affectés aux différents départements académiques."
        )

    # 13. Filières
    if any(k in msg for k in ["filiere", "filière", "departement", "département"]):
        filieres = context.get("filieres", {})
        if filieres and isinstance(filieres, dict):
            items = [f"• **{k}** : {v} étudiants" for k, v in filieres.items()]
            return "🏫 **Répartition des effectifs par filière :**\n\n" + "\n".join(items)
        return "Toutes les filières académiques sont configurées avec leurs domaines et niveaux associés."

    # 14. Réponse contextuelle globale personnalisée
    total_students = context.get("total_students", 0)
    total_teachers = context.get("total_teachers", 0)
    total_courses = context.get("total_courses", context.get("courses_count", 0))
    rate = context.get("attendance_rate", 0)
    
    return (
        f"Bonjour {first_name} ! Je suis à votre service pour vous assister sur toutes les fonctionnalités d'UniSphere AI.\n\n"
        f"📊 **Situation en direct :**\n"
        f"• Étudiants inscrits : **{total_students}**\n"
        f"• Enseignants : **{total_teachers}**\n"
        f"• Cours configurés : **{total_courses}**\n"
        f"• Assiduité : **{rate}%**\n\n"
        f"💬 Posez-moi une question précise (ex: *'Comment fonctionne la délibération ?'*, *'Qui va au rattrapage ?'*, *'Taux d'assiduité'*, *'Chiffre d'affaires'*...) et je vous répondrai en détail !"
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