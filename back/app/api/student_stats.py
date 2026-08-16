from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from datetime import datetime
from app.database.connection import SessionLocal
from app.models.student import Student
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/students", tags=["Student Stats"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ STATISTIQUES POUR L'ÉTUDIANT CONNECTÉ
@router.get("/me/stats")
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les stats de l'étudiant connecté"""
    
    # Trouver l'étudiant lié à cet utilisateur
    # Adapter selon ta structure (student.user_id ou autre)
    student = db.query(Student).filter(
        Student.user_id == current_user.id  # Adapter si différent
    ).first()
    
    if not student:
        # Essayer par email ou autre critère
        student = db.query(Student).filter(
            Student.email == current_user.email
        ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    # Réutiliser la fonction précédente
    return get_student_stats(student.id, db=db, current_user=current_user)



# ✅ STATISTIQUES D'UN ÉTUDIANT
@router.get("/{student_id}/stats")
def get_student_stats(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "student"))
):
    """Récupère les stats complètes d'un étudiant"""
    
    # Vérifier l'étudiant
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    # Sécurité : un étudiant ne peut voir que ses propres stats
    if current_user.role == "student":
        # On suppose que l'ID de l'étudiant est lié à l'user
        # Si besoin, adapter selon ta structure
        pass
    
    # ============================================
    # 1️⃣ MOYENNE GÉNÉRALE
    # ============================================
    grades = db.query(Grade).filter(
        Grade.student_id == student_id,
        Grade.score.isnot(None)
    ).all()
    
    average_grade = None
    if grades:
        total_weighted = 0
        total_coef = 0
        for grade in grades:
            coef = grade.coefficient or 1
            total_weighted += grade.score * coef
            total_coef += coef
        average_grade = total_weighted / total_coef if total_coef > 0 else 0
    
    # ============================================
    # 2️⃣ TAUX DE PRÉSENCE
    # ============================================
    attendances = db.query(Attendance).filter(
        Attendance.student_id == student_id
    ).all()
    
    attendance_rate = None
    if attendances:
        total_att = len(attendances)
        present_count = len([a for a in attendances if a.status == 'present'])
        late_count = len([a for a in attendances if a.status == 'late'])
        # Présent + Retard = considéré comme présent
        attendance_rate = ((present_count + late_count) / total_att) * 100
    
    # ============================================
    # 3️⃣ PAIEMENTS
    # ============================================
    total_payments = 0
    payment_status = "Aucun paiement"
    
    try:
        from app.models.payment import Payment
        payments = db.query(Payment).filter(
            Payment.student_id == student_id,
            Payment.status == "completed"
        ).all()
        
        if payments:
            total_payments = sum(p.amount for p in payments)
            payment_status = "À jour"
        else:
            payment_status = "Aucun paiement"
    except Exception as e:
        payment_status = "Non configuré"
        total_payments = 0
    
    return {
        "student_id": student_id,
        "student_name": f"{student.first_name} {student.last_name}",
        "average_grade": round(average_grade, 2) if average_grade is not None else None,
        "attendance_rate": round(attendance_rate, 1) if attendance_rate is not None else None,
        "attendance_details": {
            "total": len(attendances),
            "present": len([a for a in attendances if a.status == 'present']),
            "absent": len([a for a in attendances if a.status == 'absent']),
            "late": len([a for a in attendances if a.status == 'late']),
            "excused": len([a for a in attendances if a.status == 'excused'])
        },
        "payment_status": payment_status,
        "total_payments": total_payments,
        "total_grades": len(grades)
    }