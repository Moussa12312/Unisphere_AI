from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.student import Student
from app.models.filiere import Filiere
from app.models.course import Course
from app.models.user import User
from app.models.teacher import Teacher
from app.models.schedule import Schedule
from app.models.grade import Grade          
from app.models.attendance import Attendance
from app.core.dependencies import get_current_user, require_role
from app.core.security import hash_password
from typing import Optional
import time
import os
import qrcode
import datetime

router = APIRouter(prefix="/students", tags=["Students"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_matricule(db: Session, university_id: int, university_name: str) -> str:
    prefix = university_name[:2].upper() if len(university_name) >= 2 else university_name.upper()
    year = datetime.datetime.now().year
    
    last_student = db.query(Student).filter(
        Student.university_id == university_id,
        Student.matricule.like(f'{prefix}-{year}-%')
    ).order_by(Student.id.desc()).first()
    
    if last_student:
        try:
            last_number = int(last_student.matricule.split('-')[-1])
            new_number = last_number + 1
        except:
            new_number = 1
    else:
        new_number = 1
    
    return f"{prefix}-{year}-{new_number:04d}"

def cleanup_orphan_users(db: Session, university_id: int):
    orphan_users = db.query(User).filter(
        User.role == "student",
        User.university_id == university_id,
        ~User.id.in_(db.query(Student.user_id))
    ).all()
    
    for user in orphan_users:
        print(f"🧹 Nettoyage utilisateur orphelin: {user.email}")
        db.delete(user)
    
    if orphan_users:
        db.commit()

@router.post("/")
async def create_student(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    filiere: str = Form(...),
    level: str = Form(...),
    # ✅ NOUVEAUX CHAMPS
    date_of_birth: Optional[str] = Form(None),
    place_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    nationality: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    domain: Optional[str] = Form(None),
    parent_name: Optional[str] = Form(None),
    parent_phone: Optional[str] = Form(None),
    parent_email: Optional[str] = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    cleanup_orphan_users(db, current_user.university_id)
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    new_user = None
    new_student = None
    
    try:
        new_user = User(
            full_name=f"{first_name} {last_name}",
            email=email,
            hashed_password=hash_password("123456"),
            role="student",
            university_id=current_user.university_id
        )
        db.add(new_user)
        db.flush()
        db.refresh(new_user)

        univ_name = current_user.university.name if current_user.university else "UN"
        auto_matricule = generate_matricule(db, current_user.university_id, univ_name)

        # ✅ Créer l'étudiant avec TOUS les champs
        new_student = Student(
            first_name=first_name,
            last_name=last_name,
            email=email,
            filiere=filiere,
            level=level,
            domain=domain,
            date_of_birth=date_of_birth if date_of_birth else None,
            place_of_birth=place_of_birth,
            gender=gender,
            nationality=nationality,
            phone=phone,
            address=address,
            parent_name=parent_name,
            parent_phone=parent_phone,
            parent_email=parent_email,
            matricule=auto_matricule,
            user_id=new_user.id,
            university_id=current_user.university_id,
            university_name=univ_name,
            status="active"
        )
        db.add(new_student)
        db.flush()
        db.refresh(new_student)

        # QR Code
        os.makedirs("qr_codes", exist_ok=True)
        qr_filename = f"STUDENT_{new_student.id}.png"
        qr_path = os.path.join("qr_codes", qr_filename)
        qr = qrcode.make(auto_matricule)
        qr.save(qr_path)
        new_student.qr_code = qr_filename

        # Photo
        if photo and photo.filename and photo.size > 0:
            os.makedirs("uploads", exist_ok=True)
            photo_filename = f"STUDENT_{new_student.id}_{int(time.time())}.png"
            photo_path = os.path.join("uploads", photo_filename)
            
            content = await photo.read()
            with open(photo_path, "wb") as buffer:
                buffer.write(content)
            
            new_student.photo = photo_filename

        db.commit()
        db.refresh(new_student)

        return {
            "student": new_student,
            "temp_password": "123456",
            "message": "Étudiant créé avec succès"
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur création étudiant: {str(e)}")
        try:
            cleanup_orphan_users(db, current_user.university_id)
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")

from app.models.filiere import Filiere  # ✅ AJOUTER EN HAUT DU FICHIER

@router.get("/")
def get_students(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "teacher", "student"))
):
    """Liste des étudiants (filtrée par université OU par user_id si student)"""
    query = db.query(Student).filter(
        Student.university_id == current_user.university_id
    )
    
    # ✅ SÉCURITÉ : Un étudiant ne peut voir que son propre profil via cette route
    if current_user.role == "student":
        query = query.filter(Student.user_id == current_user.id)
    
    # Recherche par nom, prénom, matricule ou email
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Student.first_name.ilike(search_term)) |
            (Student.last_name.ilike(search_term)) |
            (Student.matricule.ilike(search_term)) |
            (Student.email.ilike(search_term))
        )
    
    students = query.order_by(Student.last_name, Student.first_name).all()
    
    # ✅ TRANSFORMER pour ajouter le champ domain et les nouveaux champs de dossier
    result = []
    for student in students:
        # Chercher la filière pour avoir le domaine
        filiere_obj = None
        if student.filiere:
            filiere_obj = db.query(Filiere).filter(
                Filiere.name == student.filiere,
                Filiere.university_id == current_user.university_id
            ).first()
        
        # Convertir l'étudiant en dictionnaire
        student_dict = {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "matricule": student.matricule,
            "email": student.email,
            "phone": student.phone,
            "level": student.level,
            "filiere": student.filiere,
            "domain": filiere_obj.domain if filiere_obj else "Non défini",
            "status": student.status,
            "photo": student.photo,
            "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
            "place_of_birth": student.place_of_birth,
            "address": student.address,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "user_id": student.user_id,
            "birth_certificate": student.birth_certificate,
            "previous_diploma": student.previous_diploma,
            "id_document": student.id_document,
            "photo_id": student.photo_id,
            "file_status": student.file_status
        }
        result.append(student_dict)
    
    return result

@router.get("/{student_id}")
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "teacher"))  # ✅ AJOUTÉ accountant
):
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    return student

@router.put("/{student_id}")
async def update_student(
    student_id: int,
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    filiere: str = Form(...),
    level: str = Form(...),
    # ✅ NOUVEAUX CHAMPS
    date_of_birth: Optional[str] = Form(None),
    place_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    nationality: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    domain: Optional[str] = Form(None),
    parent_name: Optional[str] = Form(None),
    parent_phone: Optional[str] = Form(None),
    parent_email: Optional[str] = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    existing_student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not existing_student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    if email != existing_student.email:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    # ✅ Mettre à jour TOUS les champs
    existing_student.first_name = first_name
    existing_student.last_name = last_name
    existing_student.email = email
    existing_student.filiere = filiere
    existing_student.level = level
    existing_student.domain = domain
    existing_student.date_of_birth = date_of_birth if date_of_birth else None
    existing_student.place_of_birth = place_of_birth
    existing_student.gender = gender
    existing_student.nationality = nationality
    existing_student.phone = phone
    existing_student.address = address
    existing_student.parent_name = parent_name
    existing_student.parent_phone = parent_phone
    existing_student.parent_email = parent_email
    
    if photo and photo.filename and photo.size > 0:
        os.makedirs("uploads", exist_ok=True)
        photo_filename = f"STUDENT_{existing_student.id}_{int(time.time())}.png"
        photo_path = os.path.join("uploads", photo_filename)
        
        content = await photo.read()
        with open(photo_path, "wb") as buffer:
            buffer.write(content)
        
        existing_student.photo = photo_filename

    user = db.query(User).filter(User.id == existing_student.user_id).first()
    if user:
        user.full_name = f"{first_name} {last_name}"
        user.email = email

    db.commit()
    db.refresh(existing_student)
    return existing_student

@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    user_id = student.user_id
    
    if student.qr_code:
        qr_path = os.path.join("qr_codes", student.qr_code)
        if os.path.exists(qr_path):
            os.remove(qr_path)
            
    if student.photo:
        photo_path = os.path.join("uploads", student.photo)
        if os.path.exists(photo_path):
            os.remove(photo_path)
            
    db.delete(student)
    db.commit()
    
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        
    return {"message": "Étudiant supprimé"}

# ==========================================
# ✅ UPLOAD DE DOCUMENTS ÉTUDIANT
# ==========================================
@router.post("/{student_id}/document/{doc_type}")
async def upload_student_document(
    student_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "student"))
):
    """Upload un document officiel pour un étudiant"""
    
    valid_types = ["birth_certificate", "previous_diploma", "id_document", "photo_id"]
    if doc_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type invalide. Types: {', '.join(valid_types)}")
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    # Sécurité : un étudiant ne peut modifier que son propre dossier
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Sauvegarder le fichier
    os.makedirs("uploads/student_documents", exist_ok=True)
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    filename = f"{doc_type}_{student_id}_{int(time.time())}.{ext}"
    filepath = os.path.join("uploads/student_documents", filename)
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # Max 10 Mo
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")
    
    with open(filepath, "wb") as buffer:
        buffer.write(content)
    
    # Mettre à jour la BDD
    setattr(student, doc_type, filename)
    
    # Vérifier si le dossier est complet (les 3 premiers sont obligatoires)
    required_docs = ["birth_certificate", "previous_diploma", "id_document"]
    all_present = all(getattr(student, doc) for doc in required_docs)
    student.file_status = "complete" if all_present else "incomplete"
    
    db.commit()
    
    return {
        "message": "Document uploadé avec succès",
        "filename": filename,
        "file_status": student.file_status
    }

# ==========================================
# ✅ DASHBOARD COMPLET ÉTUDIANT (Connecté BDD)
# ==========================================
@router.get("/me/dashboard")
def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère toutes les données nécessaires au dashboard étudiant"""
    from datetime import date
    from app.models.schedule import Schedule
    from app.models.course import Course
    from app.models.exam_session import ExamSession
    
    # 1. Trouver l'étudiant
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    # 2. Statistiques de base (Moyenne & Présence)
    grades = db.query(Grade).filter(Grade.student_id == student.id, Grade.score.isnot(None)).all()
    average_grade = 0
    if grades:
        total_weighted = sum(g.score * (g.coefficient or 1) for g in grades)
        total_coef = sum(g.coefficient or 1 for g in grades)
        average_grade = round(total_weighted / total_coef, 2) if total_coef > 0 else 0

    attendances = db.query(Attendance).filter(Attendance.student_id == student.id).all()
    attendance_rate = 0
    if attendances:
        present_count = len([a for a in attendances if a.status in ['present', 'late']])
        attendance_rate = round((present_count / len(attendances)) * 100, 1)

    # 3. Dernières notes (Top 5)
    recent_grades = []
    sorted_grades = sorted(grades, key=lambda x: x.created_at or datetime.min, reverse=True)[:5]
    for g in sorted_grades:
        course_name = "Matière inconnue"
        if hasattr(g, 'course') and g.course:
            course_name = (
                getattr(g.course, 'title', None) or 
                getattr(g.course, 'subject', None) or 
                getattr(g.course, 'name', None) or 
                getattr(g.course, 'matiere', "Matière inconnue")
            )
        
        recent_grades.append({
            "subject": course_name,
            "score": g.score,
            "coefficient": g.coefficient or 1,
            "date": g.created_at.strftime("%d/%m/%Y") if g.created_at else "N/A",
            "comment": getattr(g, 'comment', "") or ""
        })

    # 4. Prochains événements (Connecté à la BDD)
    upcoming_events = []
    
    try:
        # A. Prochains cours de l'étudiant (basé sur sa classe)
        if student.class_room_id:
            schedules = db.query(Schedule, Course).join(
                Course, Schedule.course_id == Course.id
            ).filter(
                Schedule.class_id == student.class_room_id,
                Schedule.university_id == current_user.university_id
            ).order_by(Schedule.day_of_week, Schedule.start_time).limit(3).all()
            
            for sch, course in schedules:
                upcoming_events.append({
                    "title": f"Cours: {course.title if course else 'Matière'}",
                    "type": "course",
                    "date": sch.day_of_week, # Ex: "Lundi"
                    "time": f"{sch.start_time} - {sch.end_time}",
                    "location": f"{sch.building or ''} {sch.room or 'Salle inconnue'}".strip()
                })
        
        # B. Prochaines sessions d'examen à venir
        exams = db.query(ExamSession).filter(
            ExamSession.university_id == current_user.university_id,
            ExamSession.start_date >= date.today()
        ).order_by(ExamSession.start_date.asc()).limit(2).all()
        
        for exam in exams:
            upcoming_events.append({
                "title": f"Session: {exam.name}",
                "type": "exam",
                "date": exam.start_date.strftime("%d/%m/%Y") if exam.start_date else "Date inconnue",
                "time": "Voir détails",
                "location": "Session officielle"
            })
            
        # On garde maximum 3 événements pour ne pas surcharger le dashboard
        upcoming_events = upcoming_events[:3]
        
    except Exception as e:
        print(f"⚠️ Erreur lors du chargement des événements: {e}")
        upcoming_events = [
            {
                "title": "Aucun événement à venir",
                "type": "course",
                "date": "Bientôt",
                "time": "--:--",
                "location": "Restez à l'écoute"
            }
        ]

    return {
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "filiere": student.filiere,
        "average_grade": average_grade,
        "attendance_rate": attendance_rate,
        "recent_grades": recent_grades,
        "upcoming_events": upcoming_events
    }

# ==========================================
# ✅ 1. MES COURS (PDF) - CORRIGÉ
# ==========================================
@router.get("/me/courses")
def get_my_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les cours de l'étudiant avec leurs supports (Materials)"""
    from app.models.material import Material  # ✅ Import du modèle Material
    
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    # Récupérer les cours du même niveau et université
    courses = db.query(Course).filter(
        Course.level == student.level,
        Course.university_id == student.university_id
    ).all()

    result = []
    for c in courses:
        # 1. Vérification sécurisée de la filière
        course_filiere_name = ""
        if hasattr(c, 'filiere') and c.filiere:
            course_filiere_name = getattr(c.filiere, 'name', '')
        elif hasattr(c, 'filiere_name'):
            course_filiere_name = c.filiere_name
            
        if student.filiere and course_filiere_name != student.filiere:
            continue

        # 2. Récupération de l'enseignant
        teacher_name = "Enseignant non assigné"
        if hasattr(c, 'teacher_id') and c.teacher_id:
            teacher = db.query(Teacher).filter(Teacher.id == c.teacher_id).first()
            if teacher:
                teacher_name = f"{teacher.first_name} {teacher.last_name}"
        
        # 3. ✅ Récupérer les Materials associés à ce cours (visibles pour les étudiants)
        materials = db.query(Material).filter(
            Material.course_id == c.id,
            Material.visibility.in_(['students', 'public']),  # ✅ Filtre de visibilité
            Material.university_id == current_user.university_id
        ).order_by(Material.created_at.desc()).all()
        
        # Formater les materials pour le frontend
        materials_list = []
        for m in materials:
            materials_list.append({
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "file_path": m.file_path,
                "file_type": m.file_type,
                "original_name": m.original_name,
                "file_size": m.file_size,
                "download_count": m.download_count,
                "created_at": m.created_at.isoformat() if m.created_at else None
            })

        result.append({
            "id": c.id,
            "title": getattr(c, 'title', getattr(c, 'name', 'Cours sans titre')),
            "description": getattr(c, 'description', ''),
            "teacher": teacher_name,
            "coefficient": getattr(c, 'coefficient', 1),
            "materials": materials_list  # ✅ Liste des supports de cours
        })

    return result

# ==========================================
# ✅ 2. MES NOTES DÉTAILLÉES
# ==========================================
@router.get("/me/grades")
def get_my_grades(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère toutes les notes de l'étudiant"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    grades = db.query(Grade).filter(Grade.student_id == student.id).all()
    
    result = []
    for g in grades:
        subject = "Matière inconnue"
        if hasattr(g, 'course') and g.course:
            subject = getattr(g.course, 'title', getattr(g.course, 'name', 'Matière'))
            
        result.append({
            "id": g.id,
            "subject": subject,
            "score": g.score,
            "max_score": getattr(g, 'max_score', 20),
            "coefficient": g.coefficient or 1,
            "exam_type": getattr(g, 'exam_type', getattr(g, 'type', 'Devoir')), # Ex: 'Devoir', 'Examen'
            "date": g.created_at.strftime("%d/%m/%Y") if g.created_at else "N/A",
            "comment": getattr(g, 'comment', '')
        })

    # Trier par date décroissante
    result.sort(key=lambda x: x['date'], reverse=True)
    return result


# ==========================================
# ✅ 3. MON EMPLOI DU TEMPS - CORRIGÉ
# ==========================================
@router.get("/me/schedule")
def get_my_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'emploi du temps de la classe de l'étudiant"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil non trouvé")

    # Si l'étudiant a une classe assignée, on prend les cours de cette classe
    if student.class_room_id:
        schedules = db.query(Schedule).filter(
            Schedule.class_id == student.class_room_id,
            Schedule.university_id == student.university_id
        ).all()
    else:
        # Sinon, on prend les cours du même niveau et université
        schedules = db.query(Schedule).filter(
            Schedule.university_id == student.university_id
        ).all()

    result = []
    for s in schedules:
        course = db.query(Course).filter(Course.id == s.course_id).first()
        
        # Filtre de filière en Python pour éviter l'erreur SQLAlchemy
        if course and student.filiere:
            course_filiere_name = ""
            if hasattr(course, 'filiere') and course.filiere:
                course_filiere_name = getattr(course.filiere, 'name', '')
            elif hasattr(course, 'filiere_name'):
                course_filiere_name = course.filiere_name
                
            if course_filiere_name != student.filiere:
                continue # On ignore ce cours s'il n'est pas de la bonne filière

        teacher = db.query(Teacher).filter(Teacher.id == s.teacher_id).first() if s.teacher_id else None
        
        result.append({
            "id": s.id,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "subject": getattr(course, 'title', getattr(course, 'name', 'Cours inconnu')) if course else "Cours inconnu",
            "teacher": f"{teacher.first_name} {teacher.last_name}" if teacher else "Non assigné",
            "room": f"{s.building or ''} {s.room or ''}".strip() or "Salle inconnue"
        })

    return result


# ==========================================
# ✅ 4. MES PRÉSENCES
# ==========================================
@router.get("/me/attendance")
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'historique des présences de l'étudiant"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    attendances = db.query(Attendance).filter(
        Attendance.student_id == student.id
    ).order_by(Attendance.date.desc()).all()

    result = []
    for att in attendances:
        # Récupérer le cours associé si disponible
        course_name = "Cours inconnu"
        if hasattr(att, 'course_id') and att.course_id:
            course = db.query(Course).filter(Course.id == att.course_id).first()
            if course:
                course_name = getattr(course, 'title', getattr(course, 'name', 'Cours'))
        
        result.append({
            "id": att.id,
            "date": att.date.strftime("%d/%m/%Y") if att.date else "N/A",
            "status": att.status,  # 'present', 'absent', 'late', 'excused'
            "course": course_name,
            "comment": getattr(att, 'comment', '') or ''
        })

    return result

# ==========================================
# ✅ 5. MES PAIEMENTS
# ==========================================
@router.get("/me/payments")
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'historique des paiements de l'étudiant"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    try:
        from app.models.payment import Payment
        
        payments = db.query(Payment).filter(
            Payment.student_id == student.id
        ).order_by(Payment.payment_date.desc()).all()

        result = []
        for p in payments:
            result.append({
                "id": p.id,
                "amount": p.amount,
                "payment_date": p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "N/A",
                "payment_method": getattr(p, 'payment_method', 'Espèces'),
                "description": getattr(p, 'description', getattr(p, 'label', 'Paiement')),
                "status": getattr(p, 'status', 'completed')
            })

        return result
        
    except ImportError:
        # Si le modèle Payment n'existe pas
        return []

# ==========================================
# ✅ 6. MES REÇUS
# ==========================================
@router.get("/me/receipts")
def get_my_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les reçus de paiement de l'étudiant"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    try:
        from app.models.payment import Payment
        
        payments = db.query(Payment).filter(
            Payment.student_id == student.id,
            Payment.status == 'completed'
        ).order_by(Payment.payment_date.desc()).all()

        result = []
        for p in payments:
            # Générer un numéro de reçu
            receipt_number = f"REC-{p.id:06d}"
            
            result.append({
                "id": p.id,
                "receipt_number": receipt_number,
                "amount": p.amount,
                "payment_date": p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "N/A",
                "description": getattr(p, 'description', getattr(p, 'label', 'Paiement')),
                "payment_method": getattr(p, 'payment_method', 'Espèces')
            })

        return result
        
    except ImportError:
        return []