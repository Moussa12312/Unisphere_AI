from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.connection import SessionLocal
from app.models.report_card import ReportCard
from app.models.grade import Grade
from app.models.course import Course
from app.models.student import Student
from app.models.exam_session import ExamSession
from app.models.user import User
from app.core.dependencies import require_role
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO

router = APIRouter(prefix="/report-cards", tags=["Report Cards"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_mention(average: float) -> str:
    if average < 10:
        return "Insuffisant"
    elif average < 12:
        return "Passable"
    elif average < 14:
        return "Assez Bien"
    elif average < 16:
        return "Bien"
    elif average < 18:
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
        # ✅ UTILISER LES CRÉDITS DES COURS
        s_grades = db.query(Grade, Course).join(Course).filter(
            Grade.student_id == s.id,
            Grade.session_id == session_id,
            Grade.score.isnot(None)
        ).all()
        
        if s_grades:
            # ✅ Moyenne pondérée : Σ(Note × Crédits) / Σ(Crédits)
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
    current_user: User = Depends(require_role("admin", "secretary"))
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
    
    # ✅ JOIN avec Course pour avoir les crédits
    grades_with_courses = db.query(Grade, Course).join(Course).filter(
        Grade.student_id == student_id,
        Grade.session_id == session_id,
        Grade.score.isnot(None)
    ).all()
    
    if not grades_with_courses:
        raise HTTPException(status_code=400, detail="Aucune note trouvée")
    
    total_weighted_score = 0
    total_credits = 0
    obtained_credits = 0
    
    for grade, course in grades_with_courses:
        credits = course.credits or 3  # ✅ Utiliser les crédits du cours
        total_weighted_score += grade.score * credits
        total_credits += credits
        if grade.score >= 10:
            obtained_credits += credits
    
    # ✅ Moyenne pondérée
    average = total_weighted_score / total_credits if total_credits > 0 else 0
    mention = get_mention(average)
    
    # Calculer le rang
    students_averages = get_students_averages(
        db, session_id, current_user.university_id, 
        student.filiere, student.level
    )
    rank = next((i+1 for i, (sid, _) in enumerate(students_averages) if sid == student_id), len(students_averages)+1)
    
    # Créer ou mettre à jour le bulletin
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
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "student"))
):
    """Récupère toutes les notes avec crédits"""
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    # ✅ JOIN avec Course pour avoir les crédits
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
            credits = course.credits or 3  # ✅ Utiliser les crédits
            weighted = grade.score * credits
            percentage = (grade.score / 20) * 100
            
            subjects.append({
                "course_id": course.id,
                "course_code": course.code,
                "course_title": course.title,
                "score": grade.score,
                "cc_score": grade.cc_score,  # ✅ AJOUTÉ
                "exam_score": grade.exam_score,  # ✅ AJOUTÉ
                "credits": credits,  # ✅ AJOUTÉ
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
    
    # Calculer le rang
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
            "weighted_average": round(average, 2),  # ✅ RENOMMÉ
            "average": round(average, 2),  # ✅ Compatibilité
            "mention": get_mention(average),
            "rank": rank,
            "total_students": len(students_averages),
            "total_coefficients": total_credits,  # ✅ Maintenant = crédits
            "total_credits": total_credits,  # ✅ AJOUTÉ
            "obtained_credits": obtained_credits,  # ✅ AJOUTÉ
            "total_weighted": round(total_weighted, 2)
        }
    }


@router.get("/generate-pdf/{student_id}")
def generate_pdf(
    student_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "student"))
):
    """Génère le PDF du bulletin"""
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    from app.models.university import University
    university = db.query(University).filter(University.id == student.university_id).first()
    
    # ✅ JOIN avec Course pour avoir les crédits
    grades_with_courses = db.query(Grade, Course).join(Course).filter(
        Grade.student_id == student_id,
        Grade.session_id == session_id
    ).all()

    # Calculer la moyenne pondérée
    total_weighted = 0
    total_credits = 0

    for grade, course in grades_with_courses:
        if grade.score is not None:
            credits = course.credits or 3  # ✅ Utiliser les crédits
            total_weighted += grade.score * credits
            total_credits += credits

    average = total_weighted / total_credits if total_credits > 0 else 0
    mention = get_mention(average)
    
    # Calculer le rang
    students_averages = get_students_averages(
        db, session_id, current_user.university_id,
        student.filiere, student.level
    )
    rank = next((i+1 for i, (sid, _) in enumerate(students_averages) if sid == student_id), len(students_averages)+1)
    
    # Créer le PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=10
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=5
    )
    
    # En-tête
    elements.append(Paragraph("REPUBLIQUE DU MALI", header_style))
    elements.append(Paragraph("Un Peuple - Un But - Une Foi", header_style))
    elements.append(Spacer(1, 0.3*cm))
    elements.append(Paragraph("MINISTERE DE L'ENSEIGNEMENT SUPERIEUR", header_style))
    elements.append(Paragraph("ET DE LA RECHERCHE SCIENTIFIQUE", header_style))
    elements.append(Spacer(1, 0.5*cm))
    
    if university:
        elements.append(Paragraph(f"<b>{university.name.upper()}</b>", title_style))
        if university.address:
            elements.append(Paragraph(university.address, header_style))
    
    elements.append(Spacer(1, 0.3*cm))
    elements.append(Paragraph(f"<b>ANNEE UNIVERSITAIRE {session.name}</b>", header_style))
    elements.append(Paragraph(f"<b>RELEVÉ DE NOTES - {session.session_type.upper()}</b>", header_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Informations étudiant
    student_data = [
        ['Nom:', student.last_name.upper(), 'Prénom:', student.first_name],
        ['Date de naissance:', student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else 'N/A', 
         'Matricule:', student.matricule or 'N/A'],
        ['Filière:', student.filiere or 'N/A', 'Niveau:', student.level or 'N/A']
    ]
    
    student_table = Table(student_data, colWidths=[4*cm, 5*cm, 4*cm, 5*cm])
    student_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
    ]))
    elements.append(student_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # Tableau des notes avec crédits
    data = [['UE', 'Matière', 'CC', 'Exam', 'Note/20', 'Crédits', 'Moy. Pond.', '%', 'Mention']]

    for grade, course in grades_with_courses:
        if grade.score is not None:
            credits = course.credits or 3
            weighted = grade.score * credits
            percentage = (grade.score / 20) * 100
            letter = get_letter_grade(grade.score)
            
            data.append([
                Paragraph(f"<b>{course.code or ''}</b>", ParagraphStyle('UEStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.HexColor('#FF6B00'))),
                Paragraph(course.title, ParagraphStyle('MatiereStyle', parent=styles['Normal'], fontSize=9, alignment=TA_LEFT)),
                Paragraph(f"{grade.cc_score:.2f}" if grade.cc_score else "-", ParagraphStyle('CCStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)),
                Paragraph(f"{grade.exam_score:.2f}" if grade.exam_score else "-", ParagraphStyle('ExamStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)),
                Paragraph(f"<b>{grade.score:.2f}</b>", ParagraphStyle('NoteStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.green if grade.score >= 10 else colors.red)),
                Paragraph(f"<b>{credits}</b>", ParagraphStyle('CreditsStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.HexColor('#6B46C1'))),
                Paragraph(f"{weighted:.2f}", ParagraphStyle('MoyStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)),
                Paragraph(f"{percentage:.1f}%", ParagraphStyle('PctStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)),
                Paragraph(f"<b>{letter}</b>", ParagraphStyle('LetterStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.HexColor('#FF6B00')))
            ])

    # Ligne total
    data.append([
        '',
        Paragraph("<b>MOYENNE GÉNÉRALE</b>", ParagraphStyle('TotalStyle', parent=styles['Normal'], fontSize=9, alignment=TA_LEFT)),
        '',
        '',
        Paragraph(f"<b>{average:.2f}</b>", ParagraphStyle('TotalNoteStyle', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER, textColor=colors.HexColor('#FF6B00'))),
        Paragraph(f"<b>{total_credits}</b>", ParagraphStyle('TotalCreditsStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)),
        Paragraph(f"<b>{total_weighted:.2f}</b>", ParagraphStyle('TotalMoyStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)),
        Paragraph(f"<b>{(average/20)*100:.1f}%</b>", ParagraphStyle('TotalPctStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER)),
        Paragraph(f"<b>{get_letter_grade(average)}</b>", ParagraphStyle('TotalLetterStyle', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER, textColor=colors.HexColor('#FF6B00')))
    ])

    # ✅ COLONNES AJUSTÉES
    table = Table(data, colWidths=[2.5*cm, 4.5*cm, 1.5*cm, 1.5*cm, 1.8*cm, 1.5*cm, 2*cm, 1.5*cm, 1.8*cm])
    
    table.setStyle(TableStyle([
        # En-tête orange
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF6B00')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        
        # Alignement
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # Padding
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        
        # Grille
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        
        # Alternance de couleurs pour les lignes
        *[('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FFF5EB') if i % 2 == 0 else colors.white) 
          for i in range(1, len(data)-1)],
        
        # Ligne du total (dernière ligne)
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FFE5CC')),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#FF6B00')),
        
        # Colonne UE avec fond légèrement coloré
        *[('BACKGROUND', (0, i), (0, i), colors.HexColor('#FFF0E0')) 
          for i in range(1, len(data))],
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 0.5*cm))
    
    # Mention finale
    mention_text = f"<b>MOYENNE GÉNÉRALE: {average:.2f}/20</b> - <b>MENTION: {mention.upper()}</b> - <b>RANG: {rank}/{len(students_averages)}</b>"
    
    elements.append(Paragraph(mention_text, ParagraphStyle(
        'Mention',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#FF6B00'),
        spaceAfter=1*cm
    )))
    
    # Date et signature
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph(f"Fait à Bamako, le {datetime.now().strftime('%d/%m/%Y')}", 
                             ParagraphStyle('Date', parent=styles['Normal'], alignment=TA_RIGHT)))
    elements.append(Spacer(1, 1.5*cm))
    elements.append(Paragraph("<b>Le Directeur</b>", header_style))
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph("_________________________", header_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=bulletin_{student.matricule or student_id}.pdf"}
    )


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