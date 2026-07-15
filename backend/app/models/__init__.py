# ✅ Import de TOUS les modèles
from app.models.university import University
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.filiere import Filiere
from app.models.course import Course
from app.models.course_history import CourseHistory
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.academic_config import AcademicConfig
from app.models.class_room import ClassRoom
from app.models.announcement import Announcement
from app.models.schedule import Schedule
from app.models.payment_deadline import PaymentDeadline
from app.models.payment import Payment
from app.models.academic_fee import AcademicFee 
from app.models.exam_session import ExamSession
from app.models.report_card import ReportCard
from app.models.document import Document
from app.models.message import Message
from app.models.payment import Payment
from app.models.payment_tranche import PaymentTranche

__all__ = [
    "University",
    "User", 
    "Student",
    "Teacher",
    "Filiere",
    "Course",
    "CourseHistory",
    "Grade",
    "Attendance",
    "AcademicConfig",
    "ClassRoom",
    "Announcement",
    "Schedule",
    "PaymentDeadline",
    "Payment",
    "AcademicFee",
    "ExamSession",
    "Grade",
    "ReportCard",
    "Document",
    "Message"
]