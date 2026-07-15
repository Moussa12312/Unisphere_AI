from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database.connection import SessionLocal
from app.models.user import User
from app.core.dependencies import require_role
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/v1/ai", tags=["AI Assistant"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class AIQuestion(BaseModel):
    question: str
    context: Optional[dict] = None


@router.post("/ask")
async def ask_ai(question_data: AIQuestion, current_user: User = Depends(require_role("admin", "censeur", "secretary", "teacher"))):
    """Ask a question to the AI assistant."""
    result = await ai_service.answer_question(question_data.question, question_data.context or {})
    return result


@router.get("/insights")
async def get_insights(current_user: User = Depends(require_role("admin", "censeur"))):
    """Get AI insights about the university."""
    from app.api.dashboard import get_db
    from app.models.student import Student
    from app.models.teacher import Teacher
    from app.models.attendance import Attendance
    from app.models.payment import Payment
    from app.models.grade import Grade
    from sqlalchemy import func
    from datetime import datetime, timedelta

    db = next(get_db())
    university_id = current_user.university_id

    total_students = db.query(Student).filter(Student.university_id == university_id).count()
    total_teachers = db.query(Teacher).filter(Teacher.university_id == university_id).count()

    thirty_days_ago = (datetime.now() - timedelta(days=30)).date()
    total_attendance = db.query(Attendance).filter(Attendance.student_id.in_(db.query(Student.id).filter(Student.university_id == university_id)), Attendance.date >= thirty_days_ago).count()
    present_count = db.query(Attendance).filter(Attendance.student_id.in_(db.query(Student.id).filter(Student.university_id == university_id)), Attendance.date >= thirty_days_ago, Attendance.status == "present").count()
    attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0

    total_graded = db.query(func.count(func.distinct(Grade.student_id))).filter(Grade.student_id.in_(db.query(Student.id).filter(Student.university_id == university_id))).scalar() or 0
    passing = db.query(func.count(func.distinct(Grade.student_id))).join(Student, Grade.student_id == Student.id).filter(Student.university_id == university_id).group_by(Grade.student_id).having(func.avg(Grade.score) >= 10).count()
    success_rate = (passing / total_graded * 100) if total_graded > 0 else 0

    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.university_id == university_id, Payment.status == "completed").scalar() or 0

    data = {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "attendance_rate": attendance_rate,
        "success_rate": success_rate,
        "total_revenue": total_revenue
    }

    return await ai_service.analyze_university_data(data)