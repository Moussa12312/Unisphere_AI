"""
Script d'initialisation rapide et robuste des 8 comptes de démonstration ECOB pour UniSphere AI.
Tous les comptes utilisent le mot de passe : unisphere2026
"""

import os
import sys
from datetime import datetime, date, time

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.database.connection import SessionLocal
from app.core.security import hash_password
from app.models.university import University
from app.models.academic_config import AcademicConfig
from app.models.user import User
from app.models.censor import Censor
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.alumni import AlumniProfile, AlumniConnection
from app.models.filiere import Filiere
from app.models.teaching_unit import TeachingUnit
from app.models.course import Course
from app.models.exam_session import ExamSession
from app.models.grade import Grade

def seed_demo_accounts(db=None):
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        print("🚀 [ECOB DEMO] Démarrage du provisionnement des 8 comptes démo...")

        # 1. UNIVERSITÉ ECOB
        univ = db.query(University).filter((University.id == 1) | (University.name == "ECOB")).first()
        if not univ:
            univ = University(
                id=1,
                name="ECOB",
                email="contact@ecobmali.com",
                country="Mali",
                address="Hamdallaye ACI 2000, Bamako, Mali",
                phone="+223 20 22 44 88",
                website="https://ecobmali.com",
                slogan="Excellence & Innovation Académique",
                description="Institut Universitaire d'Excellence et d'Ingénierie",
                established_year="2018",
                rector_name="Pr. Mahamadou CISSE",
                academic_year="2026-2027",
                is_active=True,
                status="active",
                institution_type="university"
            )
            db.add(univ)
            db.commit()
            db.refresh(univ)
            print("   ✅ Université ECOB créée (ID: 1).")
        else:
            univ.name = "ECOB"
            univ.slogan = "Excellence & Innovation Académique"
            univ.academic_year = "2026-2027"
            univ.is_active = True
            univ.status = "active"
            db.commit()
            print("   ℹ️ Université ECOB synchronisée (ID: 1).")

        # Configuration académique ECOB
        ac_config = db.query(AcademicConfig).filter(AcademicConfig.university_id == univ.id).first()
        if not ac_config:
            ac_config = AcademicConfig(
                university_id=univ.id,
                grading_system="20",
                min_passing_grade=10.0,
                max_grade=20.0,
                default_cc_coefficient=0.4,
                default_exam_coefficient=0.6,
                allow_compensation=True,
                allow_makeup_exam=True,
                min_gpa_to_pass=10.0,
                current_academic_year="2026-2027",
                semester_system="semestriel",
                min_attendance_rate=75.0,
                late_threshold_time=time(8, 30)
            )
            db.add(ac_config)
            db.commit()

        # 2. LES 8 COMPTES UTILISATEURS DÉMO (Mot de passe : unisphere2026)
        demo_users_data = [
            {
                "email": "admin@unisphere.ai",
                "role": "admin",
                "name": "Direction ECOB",
                "phone": "+223 70 00 00 01"
            },
            {
                "email": "censeur@unisphere.ai",
                "role": "censeur",
                "name": "Dr. Boubacar TOURE",
                "phone": "+223 70 00 00 02"
            },
            {
                "email": "secretaire@unisphere.ai",
                "role": "secretary",
                "name": "Mme Aminata DIARRA",
                "phone": "+223 70 00 00 03"
            },
            {
                "email": "enseignant@unisphere.ai",
                "role": "teacher",
                "name": "Pr. Mamadou KANTE",
                "phone": "+223 70 00 00 04"
            },
            {
                "email": "etudiant@unisphere.ai",
                "role": "student",
                "name": "Aïssata DIALLO",
                "phone": "+223 70 00 00 05"
            },
            {
                "email": "comptable@unisphere.ai",
                "role": "accountant",
                "name": "M. Ousmane TRAORE",
                "phone": "+223 70 00 00 06"
            },
            {
                "email": "gardien@unisphere.ai",
                "role": "guard",
                "name": "M. Bakary KONE",
                "phone": "+223 70 00 00 07"
            },
            {
                "email": "alumni@unisphere.ai",
                "role": "alumni",
                "name": "Moussa FOFANA",
                "phone": "+223 70 00 00 08"
            }
        ]

        hashed_pwd = hash_password("unisphere2026")
        user_map = {}

        for udata in demo_users_data:
            u = db.query(User).filter(User.email == udata["email"]).first()
            if not u:
                u = User(
                    full_name=udata["name"],
                    email=udata["email"],
                    hashed_password=hashed_pwd,
                    role=udata["role"],
                    phone=udata["phone"],
                    is_active=True,
                    is_email_verified=True,
                    university_id=univ.id
                )
                db.add(u)
                db.commit()
                db.refresh(u)
            else:
                u.full_name = udata["name"]
                u.hashed_password = hashed_pwd
                u.role = udata["role"]
                u.phone = udata["phone"]
                u.is_active = True
                u.is_email_verified = True
                u.university_id = univ.id
                db.commit()
                db.refresh(u)
            user_map[udata["role"]] = u
            print(f"   👤 Compte démo prêt : {udata['name']} ({udata['role']}) -> {udata['email']}")

        # 3. PROFIL CENSEUR
        censor_u = user_map.get("censeur")
        if censor_u:
            censor = db.query(Censor).filter(Censor.university_id == univ.id).first()
            if not censor:
                censor = Censor(
                    first_name="Boubacar",
                    last_name="TOURE",
                    email=censor_u.email,
                    phone=censor_u.phone,
                    department="Direction Pédagogique & Études",
                    employee_id="EMP-CENS-001",
                    status="active",
                    user_id=censor_u.id,
                    university_id=univ.id
                )
                db.add(censor)
                db.commit()
            else:
                censor.user_id = censor_u.id
                censor.email = censor_u.email
                db.commit()

        # 4. FILIÈRE D'EXCELLENCE : GLSI
        filiere = db.query(Filiere).filter(Filiere.university_id == univ.id, Filiere.name.ilike("%GLSI%")).first()
        if not filiere:
            filiere = Filiere(
                name="Génie Logiciel & Systèmes d'Information (GLSI)",
                domain="Sciences & Technologies",
                levels="Licence 1, Licence 2, Licence 3, Master 1, Master 2",
                university_id=univ.id
            )
            db.add(filiere)
            db.commit()
            db.refresh(filiere)

        # 5. PROFIL ENSEIGNANT
        teacher_u = user_map.get("teacher")
        teacher = None
        if teacher_u:
            teacher = db.query(Teacher).filter(Teacher.university_id == univ.id, Teacher.email == teacher_u.email).first()
            if not teacher:
                teacher = Teacher(
                    first_name="Mamadou",
                    last_name="KANTE",
                    email=teacher_u.email,
                    department="Génie Logiciel",
                    speciality="Architectures Cloud, Algorithmique & Sécurité",
                    phone=teacher_u.phone,
                    user_id=teacher_u.id,
                    university_id=univ.id,
                    university_name=univ.name,
                    filiere_id=filiere.id
                )
                db.add(teacher)
                db.commit()
                db.refresh(teacher)
            else:
                teacher.user_id = teacher_u.id
                db.commit()

        # 6. UEs & COURS
        ue1 = db.query(TeachingUnit).filter(TeachingUnit.university_id == univ.id, TeachingUnit.code == "UE-GL301").first()
        if not ue1:
            ue1 = TeachingUnit(
                code="UE-GL301",
                name="Génie Logiciel Avancé & Cloud",
                credits=6,
                category="Fondamentale",
                semester="S5",
                level="Licence 3",
                description="Conception microservices, Cloud computing et DevOps",
                filiere_id=filiere.id,
                university_id=univ.id
            )
            db.add(ue1)
            db.commit()
            db.refresh(ue1)

        course1 = db.query(Course).filter(Course.university_id == univ.id, Course.code == "GL301-1").first()
        if not course1:
            course1 = Course(
                title="Architectures Microservices & Cloud",
                code="GL301-1",
                department="Génie Logiciel",
                level="Licence 3",
                teacher_id=teacher.id if teacher else None,
                credits=3,
                hours=40,
                university_id=univ.id,
                filiere_id=filiere.id,
                teaching_unit_id=ue1.id
            )
            db.add(course1)
            db.commit()
            db.refresh(course1)

        course2 = db.query(Course).filter(Course.university_id == univ.id, Course.code == "GL301-2").first()
        if not course2:
            course2 = Course(
                title="Intelligence Artificielle & Deep Learning",
                code="GL301-2",
                department="Génie Logiciel",
                level="Licence 3",
                teacher_id=teacher.id if teacher else None,
                credits=3,
                hours=40,
                university_id=univ.id,
                filiere_id=filiere.id,
                teaching_unit_id=ue1.id
            )
            db.add(course2)
            db.commit()
            db.refresh(course2)

        # 7. PROFIL ÉTUDIANT (Aïssata DIALLO, Matricule: EC-2026-0001)
        student_u = user_map.get("student")
        student = None
        if student_u:
            student = db.query(Student).filter(
                (Student.university_id == univ.id) & 
                ((Student.matricule == "EC-2026-0001") | (Student.email == student_u.email))
            ).first()

            if not student:
                student = Student(
                    first_name="Aïssata",
                    last_name="DIALLO",
                    email=student_u.email,
                    date_of_birth=date(2003, 5, 14),
                    place_of_birth="Bamako",
                    gender="Féminin",
                    nationality="Malienne",
                    phone=student_u.phone,
                    address="Sébénikoro, Bamako",
                    filiere="GLSI",
                    level="Licence 3",
                    domain="Sciences & Technologies",
                    matricule="EC-2026-0001",
                    parent_name="M. Oumar DIALLO",
                    parent_phone="+223 76 11 22 33",
                    parent_email="parent.diallo@gmail.com",
                    qr_code="QR-EC-2026-0001",
                    user_id=student_u.id,
                    university_id=univ.id,
                    university_name=univ.name,
                    status="active",
                    net_tuition_amount=450000.0,
                    payment_plan="tranches"
                )
                db.add(student)
                db.commit()
                db.refresh(student)
            else:
                student.user_id = student_u.id
                student.email = student_u.email
                student.matricule = "EC-2026-0001"
                student.status = "active"
                db.commit()
                db.refresh(student)

            # Session d'examen pour les notes
            exam_session = db.query(ExamSession).filter(ExamSession.university_id == univ.id).first()
            if not exam_session:
                exam_session = ExamSession(
                    name="Session Normale - Semestre 1",
                    session_type="normale",
                    start_date=date(2027, 2, 1),
                    end_date=date(2027, 2, 15),
                    status="completed",
                    description="Examens du 1er semestre 2026-2027",
                    university_id=univ.id
                )
                db.add(exam_session)
                db.commit()
                db.refresh(exam_session)

            # Notes pour l'étudiante
            if course1 and student:
                g1 = db.query(Grade).filter(Grade.student_id == student.id, Grade.course_id == course1.id).first()
                if not g1:
                    g1 = Grade(
                        student_id=student.id,
                        course_id=course1.id,
                        session_id=exam_session.id,
                        cc_score=16.5,
                        exam_score=17.0,
                        cc_coefficient=0.4,
                        exam_coefficient=0.6,
                        score=16.8,
                        coefficient=3,
                        status="validated",
                        comment="Excellent travail et maîtrise des concepts microservices",
                        university_id=univ.id
                    )
                    db.add(g1)

            if course2 and student:
                g2 = db.query(Grade).filter(Grade.student_id == student.id, Grade.course_id == course2.id).first()
                if not g2:
                    g2 = Grade(
                        student_id=student.id,
                        course_id=course2.id,
                        session_id=exam_session.id,
                        cc_score=15.0,
                        exam_score=16.0,
                        cc_coefficient=0.4,
                        exam_coefficient=0.6,
                        score=15.6,
                        coefficient=3,
                        status="validated",
                        comment="Très bonne assimilation des modèles d'apprentissage profond",
                        university_id=univ.id
                    )
                    db.add(g2)
            db.commit()

        # 8. PROFIL ALUMNI (Moussa FOFANA)
        alumni_u = user_map.get("alumni")
        if alumni_u:
            alumni = db.query(AlumniProfile).filter(AlumniProfile.university_id == univ.id, AlumniProfile.user_id == alumni_u.id).first()
            if not alumni:
                alumni = AlumniProfile(
                    user_id=alumni_u.id,
                    university_id=univ.id,
                    first_name="Moussa",
                    last_name="FOFANA",
                    email=alumni_u.email,
                    phone=alumni_u.phone,
                    filiere="GLSI",
                    domain="Sciences & Technologies",
                    level="Master 2",
                    graduation_year=2024,
                    promotion="Promotion 2024 - Excellence",
                    current_position="Lead Architecte Logiciel & Cloud",
                    company="Orange Mali",
                    activity_domain="Télécommunications & Technologies",
                    location="Bamako, Mali",
                    linkedin_url="https://linkedin.com/in/moussa-fofana-demo",
                    skills="Python, FastAPI, Next.js, Docker, Kubernetes, AWS",
                    is_open_to_mentoring=True,
                    is_open_to_internship=True,
                    status="approved",
                    is_visible=True,
                    is_verified=True,
                    accepted_conditions=True
                )
                db.add(alumni)
                db.commit()
                db.refresh(alumni)

            if student:
                conn_demo = db.query(AlumniConnection).filter(
                    AlumniConnection.alumni_id == alumni.id,
                    AlumniConnection.student_id == student.id
                ).first()
                if not conn_demo:
                    conn_demo = AlumniConnection(
                        alumni_id=alumni.id,
                        student_id=student.id,
                        connection_type="mentor",
                        status="accepted",
                        message="Mentorat académique et accompagnement professionnel GLSI",
                        accepted_at=datetime.utcnow()
                    )
                    db.add(conn_demo)
                    db.commit()

        print("✨ [ECOB DEMO] Tous les 8 comptes de démonstration et leurs profils sont prêts et fonctionnels !")
        return {
            "status": "success",
            "message": "Les 8 comptes de démonstration ECOB sont configurés avec succès !"
        }

    except Exception as e:
        db.rollback()
        print(f"❌ [ECOB DEMO] Erreur lors de l'initialisation : {e}")
        raise e
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    seed_demo_accounts()
