from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.student import Student
from app.models.course import Course
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.payment import Payment
from app.core.dependencies import require_role

router = APIRouter(prefix="/statistics", tags=["Statistics"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

STATS_ROLES = ("admin", "accountant", "secretary", "censeur")
FINANCIAL_ROLES = ("admin", "accountant")


# ==========================================
# 1. VUE D'ENSEMBLE (KPIs)
# ==========================================
@router.get("/overview")
def get_statistics_overview(
    period: str = "year",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*STATS_ROLES))
):
    university_id = current_user.university_id

    # Étudiants
    total_students = db.query(func.count(Student.id)).filter(
        Student.university_id == university_id
    ).scalar() or 0

    # Enseignants
    total_teachers = db.query(func.count(User.id)).filter(
        User.university_id == university_id,
        User.role == "teacher"
    ).scalar() or 0

    # Cours
    total_courses = db.query(func.count(Course.id)).filter(
        Course.university_id == university_id
    ).scalar() or 0

    # Revenus
    now = datetime.now()
    if period == "month":
        start_date = now.replace(day=1)
    elif period == "quarter":
        start_date = now - timedelta(days=90)
    else:
        start_date = now.replace(month=1, day=1)

    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.university_id == university_id,
        Payment.status == "completed",
        Payment.created_at >= start_date
    ).scalar() or 0

    # ✅ Taux de réussite - utilise Grade.score
    try:
        total_grades = db.query(func.count(Grade.id)).filter(
            Grade.university_id == university_id,
            Grade.score.isnot(None)
        ).scalar() or 0

        passing_grades = db.query(func.count(Grade.id)).filter(
            Grade.university_id == university_id,
            Grade.score >= 10
        ).scalar() or 0

        success_rate = (passing_grades / total_grades * 100) if total_grades > 0 else 0
    except Exception as e:
        print(f"⚠️ Erreur calcul taux de réussite: {e}")
        success_rate = 0

    # ✅ Taux d'assiduité
    try:
        total_attendance = db.query(func.count(Attendance.id)).filter(
            Attendance.university_id == university_id
        ).scalar() or 0

        present_count = db.query(func.count(Attendance.id)).filter(
            Attendance.university_id == university_id,
            Attendance.status == "present"
        ).scalar() or 0

        attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0
    except Exception as e:
        print(f"⚠️ Erreur calcul assiduité: {e}")
        attendance_rate = 0

    result = {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_courses": total_courses,
        "total_revenue": total_revenue,
        "success_rate": round(success_rate, 1),
        "attendance_rate": round(attendance_rate, 1),
        "period": period
    }

    if current_user.role not in FINANCIAL_ROLES:
        result["total_revenue"] = None
    
    return result


# ==========================================
# 2. INSCRIPTIONS PAR MOIS
# ==========================================
@router.get("/inscriptions/monthly")
def get_monthly_inscriptions(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*STATS_ROLES))
):
    university_id = current_user.university_id
    cutoff_date = datetime.now() - timedelta(days=months * 30)

    results = db.query(
        extract('year', Student.created_at).label('year'),
        extract('month', Student.created_at).label('month'),
        func.count(Student.id).label('count')
    ).filter(
        Student.university_id == university_id,
        Student.created_at >= cutoff_date
    ).group_by('year', 'month').order_by('year', 'month').all()

    month_names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    data = []
    for year, month, count in results:
        data.append({
            "month": month_names[int(month) - 1],
            "inscriptions": count
        })

    if not data:
        for i in range(months):
            idx = (datetime.now().month - months + i) % 12
            data.append({
                "month": month_names[idx],
                "inscriptions": 0
            })

    return data


# ==========================================
# 3. RÉPARTITION PAR FILIÈRE
# ==========================================
@router.get("/filieres/distribution")
def get_filiere_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*STATS_ROLES))
):
    university_id = current_user.university_id

    results = db.query(
        Student.filiere,
        func.count(Student.id).label('count')
    ).filter(
        Student.university_id == university_id,
        Student.filiere.isnot(None)
    ).group_by(Student.filiere).order_by(func.count(Student.id).desc()).all()

    colors = ['#FF6B00', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#14B8A6', '#F97316']
    data = []
    for idx, (filiere, count) in enumerate(results):
        data.append({
            "name": filiere,
            "value": count,
            "color": colors[idx % len(colors)]
        })

    return data


# ==========================================
# 4. PERFORMANCE PAR NIVEAU - CORRIGÉ
# ==========================================
@router.get("/performance/by-level")
def get_performance_by_level(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*STATS_ROLES))
):
    university_id = current_user.university_id

    try:
        # ✅ Utilise Grade.score
        results = db.query(
            Student.level,
            func.avg(Grade.score).label('avg_score'),
            func.count(Grade.id).label('total')
        ).join(Grade, Grade.student_id == Student.id).filter(
            Student.university_id == university_id,
            Student.level.isnot(None),
            Grade.score.isnot(None)
        ).group_by(Student.level).order_by(Student.level).all()

        data = []
        for level, avg_score, total in results:
            data.append({
                "name": level,
                "taux": round(float(avg_score), 1) if avg_score else 0,
                "total": total
            })

        return data
    except Exception as e:
        print(f"⚠️ Erreur performance by level: {e}")
        return []


# ==========================================
# 5. REVENUS MENSUELS
# ==========================================
@router.get("/revenue/monthly")
def get_monthly_revenue(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*STATS_ROLES))
):
    if current_user.role not in FINANCIAL_ROLES:
        return []
    
    university_id = current_user.university_id
    cutoff_date = datetime.now() - timedelta(days=months * 30)

    results = db.query(
        extract('year', Payment.created_at).label('year'),
        extract('month', Payment.created_at).label('month'),
        func.coalesce(func.sum(Payment.amount), 0).label('total')
    ).filter(
        Payment.university_id == university_id,
        Payment.status == "completed",
        Payment.created_at >= cutoff_date
    ).group_by('year', 'month').order_by('year', 'month').all()

    month_names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    data = []
    for year, month, total in results:
        data.append({
            "month": month_names[int(month) - 1],
            "revenus": float(total) if total else 0
        })

    if not data:
        for i in range(months):
            idx = (datetime.now().month - months + i) % 12
            data.append({
                "month": month_names[idx],
                "revenus": 0
            })

    return data


# ==========================================
# 6. ASSIDUITÉ PAR MOIS
# ==========================================
@router.get("/attendance/monthly")
def get_monthly_attendance(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*STATS_ROLES))
):
    university_id = current_user.university_id
    cutoff_date = datetime.now() - timedelta(days=months * 30)

    try:
        results = db.query(
            extract('month', Attendance.created_at).label('month'),
            Attendance.status,
            func.count(Attendance.id).label('count')
        ).filter(
            Attendance.university_id == university_id,
            Attendance.created_at >= cutoff_date
        ).group_by('month', Attendance.status).order_by('month').all()

        month_names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
        monthly_data = {}

        for month, status, count in results:
            m = int(month)
            if m not in monthly_data:
                monthly_data[m] = {"presents": 0, "absents": 0}

            if status == "present":
                monthly_data[m]["presents"] += count
            else:
                monthly_data[m]["absents"] += count

        data = []
        for m in sorted(monthly_data.keys()):
            total = monthly_data[m]["presents"] + monthly_data[m]["absents"]
            presents_pct = (monthly_data[m]["presents"] / total * 100) if total > 0 else 0
            absents_pct = (monthly_data[m]["absents"] / total * 100) if total > 0 else 0

            data.append({
                "month": month_names[m - 1],
                "presents": round(presents_pct, 1),
                "absents": round(absents_pct, 1)
            })

        if not data:
            for i in range(months):
                idx = (datetime.now().month - months + i) % 12
                data.append({
                    "month": month_names[idx],
                    "presents": 0,
                    "absents": 0
                })

        return data
    except Exception as e:
        print(f"⚠️ Erreur assiduité: {e}")
        return []