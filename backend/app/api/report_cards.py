from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.connection import SessionLocal
from app.models.report_card import ReportCard
from app.models.grade import Grade
from app.models.course import Course
from app.models.student import Student
from app.models.exam_session import ExamSession
from app.models.university import University
from app.models.user import User
from app.core.dependencies import require_role
from datetime import datetime, timedelta
from app.models.teaching_unit import TeachingUnit
from app.services.pdf_generator import generate_lmd_transcript_pdf
from reportlab.lib.pagesizes import A4, landscape  
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from pathlib import Path

router = APIRouter(prefix="/report-cards", tags=["Report Cards"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_mention(average: float, max_grade: float = 20.0) -> str:
    scale = (max_grade / 20.0) if max_grade > 0 else 1.0
    if average < (10 * scale):
        return "Insuffisant"
    elif average < (12 * scale):
        return "Passable"
    elif average < (14 * scale):
        return "Assez Bien"
    elif average < (16 * scale):
        return "Bien"
    elif average < (18 * scale):
        return "Très Bien"
    else:
        return "Excellent"


def get_letter_grade(score: float) -> str:
    if score >= 18:
        return "A+"
    elif score >= 16:
        return "A"
    elif score >= 15:
        return "A-"
    elif score >= 14:
        return "B+"
    elif score >= 13:
        return "B"
    elif score >= 12:
        return "B-"
    elif score >= 11:
        return "C+"
    elif score >= 10:
        return "C"
    elif score >= 9:
        return "D"
    else:
        return "F"


def get_students_averages(db: Session, session_id: int, university_id: int, filiere: str = None, level: str = None):
    """Calcule les moyennes pondérées par crédits de tous les étudiants"""
    query = db.query(Student).filter(Student.university_id == university_id)
    
    if filiere:
        query = query.filter(Student.filiere == filiere)
    if level:
        query = query.filter(Student.level == level)
    
    all_students = query.all()
    
    students_averages = []
    for s in all_students:
        s_grades = db.query(Grade, Course).join(Course).filter(
            Grade.student_id == s.id,
            Grade.session_id == session_id,
            Grade.score.isnot(None)
        ).all()
        
        if s_grades:
            s_weighted_sum = sum(g.score * (c.credits or 3) for g, c in s_grades)
            s_total_credits = sum(c.credits or 3 for g, c in s_grades)
            s_avg = s_weighted_sum / s_total_credits if s_total_credits > 0 else 0
            students_averages.append((s.id, s_avg))
    
    students_averages.sort(key=lambda x: x[1], reverse=True)
    return students_averages


@router.get("/calculate/{student_id}")
def calculate_report_card(
    student_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Calcule les moyennes pondérées par crédits"""
    
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.university_id == current_user.university_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    grades_with_courses = db.query(Grade, Course).join(Course).filter(
        Grade.student_id == student_id,
        Grade.session_id == session_id,
        Grade.score.isnot(None)
    ).all()
    
    if not grades_with_courses:
        raise HTTPException(status_code=400, detail="Aucune note trouvée")
    
    # ✅ APPLICATION RÉELLE : Récupération des règles académiques (Notation, Assiduité, Délibération)
    from app.models.academic_config import AcademicConfig
    from app.models.attendance import Attendance
    
    ac_config = db.query(AcademicConfig).filter(
        AcademicConfig.university_id == current_user.university_id
    ).first()
    
    min_passing_grade = ac_config.min_passing_grade if ac_config else 10.0
    max_grade = ac_config.max_grade if ac_config else 20.0
    allow_compensation = ac_config.allow_compensation if ac_config else True
    min_attendance_rate = ac_config.min_attendance_rate if ac_config else 75.0

    # 1. Vérification réelle du taux d'assiduité requis par l'université
    student_attendances = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.university_id == current_user.university_id
    ).all()
    total_att = len(student_attendances)
    present_att = sum(1 for a in student_attendances if a.status in ["present", "late", "excused"])
    attendance_rate = round((present_att / total_att * 100), 1) if total_att > 0 else 100.0
    is_attendance_valid = attendance_rate >= min_attendance_rate

    total_weighted_score = 0
    total_credits = 0
    
    for grade, course in grades_with_courses:
        credits = course.credits or 3
        total_weighted_score += grade.score * credits
        total_credits += credits
    
    average = total_weighted_score / total_credits if total_credits > 0 else 0
    
    # 2. Validation des crédits (directe ou par compensation selon la configuration)
    obtained_credits = 0
    for grade, course in grades_with_courses:
        credits = course.credits or 3
        if grade.score >= min_passing_grade:
            obtained_credits += credits
        elif allow_compensation and average >= min_passing_grade and is_attendance_valid:
            # Validé par compensation entre matières
            obtained_credits += credits

    mention = get_mention(average, max_grade)
    if not is_attendance_valid:
        mention = f"Assiduité insuffisante ({attendance_rate}% < {min_attendance_rate}%)"
    
    students_averages = get_students_averages(
        db, session_id, current_user.university_id, 
        student.filiere, student.level
    )
    rank = next((i+1 for i, (sid, _) in enumerate(students_averages) if sid == student_id), len(students_averages)+1)
    
    report_card = db.query(ReportCard).filter(
        ReportCard.student_id == student_id,
        ReportCard.session_id == session_id
    ).first()
    
    if report_card:
        report_card.average = average
        report_card.rank = rank
        report_card.mention = mention
        report_card.total_credits = total_credits
        report_card.obtained_credits = obtained_credits
        report_card.status = "validated"
    else:
        report_card = ReportCard(
            student_id=student_id,
            session_id=session_id,
            average=average,
            rank=rank,
            mention=mention,
            total_credits=total_credits,
            obtained_credits=obtained_credits,
            status="validated",
            university_id=current_user.university_id
        )
        db.add(report_card)
    
    db.commit()
    db.refresh(report_card)
    
    return {
        "message": "Bulletin calculé",
        "average": round(average, 2),
        "mention": mention,
        "rank": rank,
        "total_students": len(students_averages),
        "total_credits": total_credits,
        "obtained_credits": obtained_credits
    }


@router.get("/student-detail/{student_id}")
def get_student_detail(
    student_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Récupère toutes les notes avec crédits"""
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    grades_with_courses = db.query(Grade, Course).join(Course).filter(
        Grade.student_id == student_id,
        Grade.session_id == session_id
    ).all()
    
    subjects = []
    total_weighted = 0
    total_credits = 0
    obtained_credits = 0
    
    for grade, course in grades_with_courses:
        if grade.score is not None:
            credits = course.credits or 3
            weighted = grade.score * credits
            percentage = (grade.score / 20) * 100
            
            subjects.append({
                "course_id": course.id,
                "course_code": course.code,
                "course_title": course.title,
                "score": grade.score,
                "cc_score": grade.cc_score,
                "exam_score": grade.exam_score,
                "credits": credits,
                "coefficient": grade.coefficient or 1,
                "weighted_average": round(weighted, 2),
                "percentage": round(percentage, 1),
                "letter_grade": get_letter_grade(grade.score),
                "status": grade.status,
                "comment": grade.comment
            })
            
            total_weighted += weighted
            total_credits += credits
            if grade.score >= 10:
                obtained_credits += credits
    
    average = total_weighted / total_credits if total_credits > 0 else 0
    
    students_averages = get_students_averages(
        db, session_id, current_user.university_id,
        student.filiere, student.level
    )
    rank = next((i+1 for i, (sid, _) in enumerate(students_averages) if sid == student_id), len(students_averages)+1)
    
    return {
        "student": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "matricule": student.matricule,
            "filiere": student.filiere,
            "level": student.level,
            "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None
        },
        "session": {
            "id": session.id,
            "name": session.name,
            "session_type": session.session_type
        },
        "subjects": subjects,
        "statistics": {
            "weighted_average": round(average, 2),
            "average": round(average, 2),
            "mention": get_mention(average),
            "rank": rank,
            "total_students": len(students_averages),
            "total_coefficients": total_credits,
            "total_credits": total_credits,
            "obtained_credits": obtained_credits,
            "total_weighted": round(total_weighted, 2)
        }
    }


@router.get("/generate-pdf/{student_id}")
def generate_pdf(
    student_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Génère le bulletin officiel conforme 1:1 à la maquette institutionnelle ECOB sur une seule page"""
    return generate_lmd_pdf(
        student_id=student_id,
        session_id=session_id,
        db=db,
        current_user=current_user
    )



@router.get("/generate-lmd-pdf/{student_id}")
def generate_lmd_pdf(
    student_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Génère le relevé de notes officiel LMD institutionnel structuré par Unités d'Enseignement (UEs)"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")

    university = db.query(University).filter(University.id == student.university_id).first()

    grades_with_courses = db.query(Grade, Course).join(Course).filter(
        Grade.student_id == student_id,
        Grade.session_id == session_id
    ).all()

    if not grades_with_courses:
        raise HTTPException(status_code=404, detail="Aucune note enregistrée pour cet étudiant dans cette session")

    # Groupement par Unité d'Enseignement
    tu_map = {}
    tu_ids = {c.teaching_unit_id for _, c in grades_with_courses if c.teaching_unit_id}
    all_tus = db.query(TeachingUnit).filter(TeachingUnit.id.in_(tu_ids)).all() if tu_ids else []
    tu_by_id = {tu.id: tu for tu in all_tus}

    for grade, course in grades_with_courses:
        if grade.score is None:
            continue
        
        t_unit = tu_by_id.get(course.teaching_unit_id)
        if t_unit:
            u_key = f"tu_{t_unit.id}"
            u_code = t_unit.code
            u_name = t_unit.name
            u_credits = t_unit.credits or 6
        else:
            # Regroupement automatique par matière
            u_key = "tu_default"
            u_code = f"UE-{student.filiere[:3].upper() if student.filiere else 'GEN'}-101"
            u_name = f"Unité d'Enseignement Fondamentale ({student.filiere or 'Tronc commun'})"
            u_credits = 6

        if u_key not in tu_map:
            tu_map[u_key] = {
                "code": u_code,
                "name": u_name,
                "credits": u_credits,
                "courses": []
            }

        coeff = grade.coefficient or course.credits or 1.0
        tu_map[u_key]["courses"].append({
            "title": course.title,
            "code": course.code,
            "cc_score": grade.cc_score,
            "exam_score": grade.exam_score,
            "score": grade.score,
            "coefficient": coeff,
            "credits": course.credits or 3
        })

    # Calcul des moyennes d'UE et crédits
    units_list = []
    total_credits_earned = 0
    total_credits_possible = 0
    grand_weighted_sum = 0.0
    grand_coeff_sum = 0.0

    for u_key, u_data in tu_map.items():
        courses = u_data["courses"]
        if not courses:
            continue
        c_weight = sum(c["score"] * c["coefficient"] for c in courses)
        c_coeff = sum(c["coefficient"] for c in courses)
        ue_avg = c_weight / c_coeff if c_coeff > 0 else 0.0
        u_data["average"] = ue_avg
        
        grand_weighted_sum += c_weight
        grand_coeff_sum += c_coeff
        
        u_credits = u_data.get("credits", 6)
        total_credits_possible += u_credits
        
        from app.models.academic_config import AcademicConfig
        ac_config = db.query(AcademicConfig).filter(
            AcademicConfig.university_id == student.university_id
        ).first()
        min_pass = getattr(ac_config, 'min_passing_grade', 10.0) or 10.0
        allow_comp = getattr(ac_config, 'allow_compensation', True) if getattr(ac_config, 'allow_compensation', None) is not None else True

        if ue_avg >= min_pass or (allow_comp and ue_avg >= (min_pass * 0.8) and c_weight > 0):  # Validé ou compensable selon config
            total_credits_earned += u_credits

        units_list.append(u_data)

    general_avg = grand_weighted_sum / grand_coeff_sum if grand_coeff_sum > 0 else 0.0

    # Classement de la session
    students_averages = get_students_averages(
        db, session_id, student.university_id,
        student.filiere, student.level
    )
    rank = next((i + 1 for i, (sid, _) in enumerate(students_averages) if sid == student_id), 1)

    pdf_bytes = generate_lmd_transcript_pdf(
        student=student,
        university=university,
        session=session,
        units_with_grades=units_list,
        general_average=general_avg,
        total_credits_earned=total_credits_earned,
        total_credits_possible=max(total_credits_possible, 30),
        rank=rank,
        total_students=len(students_averages) or 1,
        academic_config=ac_config
    )

    filename = f"releve_lmd_{student.matricule or student.id}_{session_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/me/lmd-pdf")
def get_my_lmd_transcript_pdf(
    session_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Télécharge le relevé de notes officiel LMD de l'étudiant connecté"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant introuvable")

    if session_id:
        session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    else:
        latest_grade = db.query(Grade).filter(Grade.student_id == student.id).order_by(Grade.created_at.desc()).first()
        if latest_grade and latest_grade.session_id:
            session = db.query(ExamSession).filter(ExamSession.id == latest_grade.session_id).first()
        else:
            session = db.query(ExamSession).filter(ExamSession.university_id == student.university_id).order_by(ExamSession.start_date.desc()).first()

    if not session:
        raise HTTPException(status_code=404, detail="Aucune session académique disponible")

    return generate_lmd_pdf(student.id, session.id, db, current_user)


@router.get("/student/{student_id}")
def get_student_report_cards(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "student"))
):
    """Récupère tous les bulletins d'un étudiant"""
    
    report_cards = db.query(ReportCard, ExamSession).join(ExamSession).filter(
        ReportCard.student_id == student_id,
        ReportCard.university_id == current_user.university_id
    ).order_by(ExamSession.start_date.desc()).all()
    
    return [
        {
            "id": rc.id,
            "session_name": session.name,
            "session_type": session.session_type,
            "average": rc.average,
            "rank": rc.rank,
            "mention": rc.mention,
            "status": rc.status,
            "total_credits": rc.total_credits,
            "obtained_credits": rc.obtained_credits,
            "generated_at": rc.generated_at.isoformat() if rc.generated_at else None
        }
        for rc, session in report_cards
    ]

@router.get("/generate-report-card-landscape/{student_id}")
def generate_report_card_landscape(
    student_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Génère le relevé de notes en format PAYSAGE (comme l'image 5)"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")

    university = db.query(University).filter(University.id == student.university_id).first()

    # Récupérer les notes avec les cours
    grades_with_courses = db.query(Grade, Course).join(Course).filter(
        Grade.student_id == student_id,
        Grade.session_id == session_id
    ).all()

    if not grades_with_courses:
        raise HTTPException(status_code=404, detail="Aucune note trouvée")

    # Calculs
    total_weighted = 0
    total_credits = 0
    obtained_credits = 0
    subjects_data = []

    for grade, course in grades_with_courses:
        if grade.score is not None:
            credits = course.credits or 1
            weighted = grade.score * credits
            percentage = (grade.score / 20) * 100

            total_weighted += weighted
            total_credits += credits
            if grade.score >= 10:
                obtained_credits += credits

            subjects_data.append([
                course.code or "",
                course.title,
                f"{grade.score:.2f}",
                str(credits),
                f"{weighted:.2f}",
                get_letter_grade(grade.score)
            ])

    average = total_weighted / total_credits if total_credits > 0 else 0
    mention = get_mention(average)

    # Calculer le rang
    students_averages = get_students_averages(
        db, session_id, current_user.university_id,
        student.filiere, student.level
    )
    rank = next((i+1 for i, (sid, _) in enumerate(students_averages) if sid == student_id), len(students_averages)+1)

    # --- Configuration du PDF (PAYSAGE) ---
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),  # <-- Format paysage
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1*cm,
        bottomMargin=1*cm
    )
    elements = []
    styles = getSampleStyleSheet()

    # --- Logo et en-tête ---
    logo_path = f"uploads/logos/{university.logo}" if university and university.logo else None
    if logo_path and Path(logo_path).exists():
        logo = Image(logo_path, width=2*cm, height=2*cm)
        elements.append(logo)
    else:
        elements.append(Spacer(1, 2*cm))

    # En-tête officiel
    header_text = """
    RÉPUBLIQUE DU MALI
    Un Peuple - Un But - Une Foi
    MINISTÈRE DE L'ÉDUCATION NATIONALE
    """
    elements.append(Paragraph(header_text, ParagraphStyle(
        fontSize=10,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        spaceAfter=5
    )))

    if university:
        elements.append(Paragraph(university.name.upper(), ParagraphStyle(
            fontSize=14,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            spaceAfter=5
        )))
        if university.address:
            elements.append(Paragraph(university.address, ParagraphStyle(
                fontSize=10,
                alignment=TA_CENTER,
                fontName="Helvetica",
                spaceAfter=10
            )))

    # Titre du document
    elements.append(Paragraph(f"BACCALEAURÉAT MALIEN SESSION DE {session.name.upper()}", ParagraphStyle(
        fontSize=14,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        spaceAfter=5
    )))
    elements.append(Paragraph(f"SÉRIE : TERMINALES {student.filiere or 'SCIENCES EXACTES (TSE)'}", ParagraphStyle(
        fontSize=12,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        spaceAfter=10
    )))

    # Informations de l'étudiant
    date_of_birth = student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else "N/A"
    student_info = [
        ["N°", f"{student.matricule or 'N/A'}"],
        ["Nom et Prénom :", f"{student.last_name.upper()} {student.first_name}"],
        ["Date de naissance :", f"{date_of_birth}"],
        ["Lieu :", f"{student.birth_place or 'SIKASSO'}"],
    ]

    info_table = Table(student_info, colWidths=[3*cm, 8*cm])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.5*cm))

    # Titre du relevé
    elements.append(Paragraph("RELEVÉ DES NOTES", ParagraphStyle(
        fontSize=14,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        spaceAfter=10
    )))

    # Tableau des notes (paysage)
    headers = [
        Paragraph("N°", ParagraphStyle(fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Bold")),
        Paragraph("ÉPREUVES", ParagraphStyle(fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Bold")),
        Paragraph("NOTES / 20", ParagraphStyle(fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Bold")),
        Paragraph("COEFF.", ParagraphStyle(fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Bold")),
        Paragraph("NOTES POND.", ParagraphStyle(fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Bold")),
        Paragraph("APPRECIATION", ParagraphStyle(fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Bold"))
    ]

    table_data = [headers]
    for i, (code, title, note, credits, weighted, mention) in enumerate(subjects_data, 1):
        row = [
            Paragraph(str(i), ParagraphStyle(fontSize=9, alignment=TA_CENTER)),
            Paragraph(title, ParagraphStyle(fontSize=8, alignment=TA_LEFT)),
            Paragraph(note, ParagraphStyle(
                fontSize=9,
                alignment=TA_CENTER,
                fontName="Helvetica-Bold",
                textColor=colors.green if float(note) >= 10 else colors.red
            )),
            Paragraph(credits, ParagraphStyle(fontSize=9, alignment=TA_CENTER)),
            Paragraph(weighted, ParagraphStyle(fontSize=9, alignment=TA_CENTER)),
            Paragraph(mention, ParagraphStyle(
                fontSize=9,
                alignment=TA_CENTER,
                fontName="Helvetica-Bold",
                textColor=colors.HexColor('#FF6B00')
            ))
        ]
        table_data.append(row)

    # Ligne de total
    total_row = [
        Paragraph("TOTAL", ParagraphStyle(fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Bold")),
        Paragraph("", ParagraphStyle(fontSize=9)),
        Paragraph(f"{average:.2f}", ParagraphStyle(
            fontSize=10,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor('#FF6B00')
        )),
        Paragraph(f"{total_credits}", ParagraphStyle(fontSize=9, alignment=TA_CENTER)),
        Paragraph(f"{total_weighted:.2f}", ParagraphStyle(fontSize=9, alignment=TA_CENTER)),
        Paragraph(f"{get_letter_grade(average)}", ParagraphStyle(
            fontSize=10,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor('#FF6B00')
        ))
    ]
    table_data.append(total_row)

    # Moyenne
    average_row = [
        Paragraph("MOYENNE", ParagraphStyle(fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Bold")),
        Paragraph(f"{average:.2f}/20 - {mention.upper()}", ParagraphStyle(
            fontSize=10,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor('#FF6B00'),
            colSpan=5
        )),
        Paragraph("", ParagraphStyle(fontSize=9)),
        Paragraph("", ParagraphStyle(fontSize=9)),
        Paragraph("", ParagraphStyle(fontSize=9)),
        Paragraph("", ParagraphStyle(fontSize=9))
    ]
    table_data.append(average_row)

    notes_table = Table(table_data, colWidths=[1*cm, 5*cm, 1.5*cm, 1.5*cm, 2*cm, 2*cm])
    notes_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF6B00')),
        ('BACKGROUND', (0, -2), (-1, -1), colors.HexColor('#FFE5CC')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#FF6B00')),
        ('SPAN', (1, -1), (-1, -1)),
        *[('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FFF5EB') if i % 2 == 0 else colors.white)
          for i in range(1, len(table_data)-2)],
    ]))
    elements.append(notes_table)
    elements.append(Spacer(1, 0.5*cm))

    # Date et signature
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph(
        f"Fait à Bamako, le {datetime.now().strftime('%d/%m/%Y')}",
        ParagraphStyle(
            fontSize=11,
            alignment=TA_RIGHT,
            spaceAfter=20
        )
    ))
    elements.append(Paragraph("Le Directeur de l'Académie d'Enseignement", ParagraphStyle(
        fontSize=12,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        spaceAfter=5
    )))
    elements.append(Paragraph("(Signature et Cachet)", ParagraphStyle(
        fontSize=10,
        alignment=TA_CENTER,
        fontName="Helvetica-Oblique",
        spaceAfter=10
    )))
    elements.append(Paragraph("______", ParagraphStyle(
        fontSize=11,
        alignment=TA_CENTER,
        spaceAfter=0
    )))

    # Génération du PDF
    doc.build(elements)
    buffer.seek(0)

    # Sauvegarde
    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"releve_notes_landscape_{student.matricule or student.id}_{session_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    file_path = upload_dir / filename
    with open(file_path, "wb") as f:
        f.write(buffer.getvalue())

    # Enregistrement en base
    document = Document(
        document_type="report_card_landscape",
        title=f"Relevé de notes (paysage) - {student.last_name} {student.first_name} - {session.name}",
        file_path=str(file_path),
        student_id=student_id,
        generated_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(document)
    db.commit()

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )