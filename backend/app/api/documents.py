from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.document import Document
from app.models.student import Student
from app.models.course import Course
from app.models.university import University
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
from pathlib import Path

router = APIRouter(prefix="/documents", tags=["Documents"])


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


# ✅ GÉNÉRER ATTESTATION DE SCOLARITÉ
@router.get("/generate-enrollment-certificate/{student_id}")
def generate_enrollment_certificate(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Génère une attestation de scolarité PDF"""
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    university = db.query(University).filter(University.id == student.university_id).first()
    university_name = university.name if university else "l'université"
    
    # Créer le PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle', parent=styles['Heading1'],
        fontSize=16, alignment=TA_CENTER, spaceAfter=20
    )
    
    # En-tête
    elements.append(Paragraph(
        "REPUBLIQUE DU MALI",
        ParagraphStyle('Header', parent=styles['Normal'], alignment=TA_CENTER)
    ))
    elements.append(Paragraph(
        "Un Peuple - Un But - Une Foi",
        ParagraphStyle('Header', parent=styles['Normal'], alignment=TA_CENTER)
    ))
    elements.append(Spacer(1, 1*cm))
    
    if university:
        elements.append(Paragraph(f"<b>{university.name.upper()}</b>", title_style))
    
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph(
        "<b>ATTESTATION DE SCOLARITÉ</b>",
        ParagraphStyle('Title', parent=styles['Heading2'], fontSize=14, alignment=TA_CENTER, spaceAfter=20)
    ))
    
    # Contenu
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph(
        f"Je soussigné(e), Directeur(trice) de {university_name},",
        styles['Normal']
    ))
    elements.append(Spacer(1, 0.3*cm))
    elements.append(Paragraph("certifie que l'étudiant(e) :", styles['Normal']))
    elements.append(Spacer(1, 0.5*cm))
    
    # Infos étudiant
    date_of_birth = student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else 'N/A'
    student_info = f"""
    <b>Nom :</b> {student.last_name.upper()}<br/>
    <b>Prénom :</b> {student.first_name}<br/>
    <b>Matricule :</b> {student.matricule or 'N/A'}<br/>
    <b>Date de naissance :</b> {date_of_birth}<br/>
    <b>Filière :</b> {student.filiere or 'N/A'}<br/>
    <b>Niveau :</b> {student.level or 'N/A'}<br/>
    """
    elements.append(Paragraph(student_info, styles['Normal']))
    elements.append(Spacer(1, 0.5*cm))
    
    current_year = datetime.now().year
    elements.append(Paragraph(
        f"est régulièrement inscrit(e) pour l'année universitaire {current_year}-{current_year+1}.",
        styles['Normal']
    ))
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph(
        "Cette attestation lui est délivrée pour servir et valoir ce que de droit.",
        styles['Normal']
    ))
    
    # Date et signature
    elements.append(Spacer(1, 2*cm))
    current_date = datetime.now().strftime('%d/%m/%Y')
    elements.append(Paragraph(
        f"Fait à Bamako, le {current_date}",
        ParagraphStyle('Date', parent=styles['Normal'], alignment=TA_RIGHT)
    ))
    elements.append(Spacer(1, 1.5*cm))
    elements.append(Paragraph(
        "<b>Le Directeur</b>",
        ParagraphStyle('Signature', parent=styles['Normal'], alignment=TA_CENTER)
    ))
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph(
        "_________________________",
        ParagraphStyle('Signature', parent=styles['Normal'], alignment=TA_CENTER)
    ))
    
    doc.build(elements)
    buffer.seek(0)
    pdf_content = buffer.getvalue()
    
    # Sauvegarder le PDF sur disque
    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"attestation_{student.matricule or student_id}_{timestamp}.pdf"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        f.write(pdf_content)
    
    # Sauvegarder dans la base
    document = Document(
        document_type="enrollment_certificate",
        title=f"Attestation de scolarité - {student.first_name} {student.last_name}",
        file_path=str(file_path),
        student_id=student_id,
        generated_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(document)
    db.commit()
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ✅ GÉNÉRER RELEVÉ DE NOTES
@router.get("/generate-transcript/{student_id}")
def generate_transcript(
    student_id: int,
    session_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Génère un relevé de notes PDF"""
    
    from app.models.grade import Grade
    from app.models.exam_session import ExamSession
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    # Récupérer la session
    if not session_id:
        session = db.query(ExamSession).filter(
            ExamSession.university_id == current_user.university_id
        ).order_by(ExamSession.start_date.desc()).first()
    else:
        session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    # Récupérer les notes
    grades_with_courses = db.query(Grade, Course).join(Course).filter(
        Grade.student_id == student_id,
        Grade.session_id == session.id
    ).all()
    
    if not grades_with_courses:
        raise HTTPException(status_code=400, detail="Aucune note trouvée")
    
    # Calculer la moyenne
    total_weighted = 0
    total_coef = 0
    
    for grade, course in grades_with_courses:
        if grade.score is not None:
            coef = grade.coefficient or course.credits or 1
            total_weighted += grade.score * coef
            total_coef += coef
    
    average = total_weighted / total_coef if total_coef > 0 else 0
    
    # Créer le PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )
    elements = []
    styles = getSampleStyleSheet()
    
    # En-tête
    elements.append(Paragraph(
        "REPUBLIQUE DU MALI",
        ParagraphStyle('Header', parent=styles['Normal'], alignment=TA_CENTER)
    ))
    elements.append(Paragraph(
        "Un Peuple - Un But - Une Foi",
        ParagraphStyle('Header', parent=styles['Normal'], alignment=TA_CENTER)
    ))
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph(
        f"<b>RELEVÉ DE NOTES - {session.name}</b>",
        ParagraphStyle('Title', parent=styles['Heading2'], fontSize=14, alignment=TA_CENTER, spaceAfter=20)
    ))
    elements.append(Spacer(1, 0.5*cm))
    
    # Infos étudiant
    student_data = [
        ['Nom:', student.last_name.upper(), 'Prénom:', student.first_name],
        ['Matricule:', student.matricule or 'N/A', 'Filière:', student.filiere or 'N/A'],
        ['Niveau:', student.level or 'N/A', 'Session:', session.name]
    ]
    
    student_table = Table(student_data, colWidths=[3*cm, 5*cm, 3*cm, 5*cm])
    student_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
    ]))
    elements.append(student_table)
    elements.append(Spacer(1, 1*cm))
    
    # Tableau des notes
    data = [['Matière', 'Note/20', 'Coeff', 'Moy. Pond.']]
    
    for grade, course in grades_with_courses:
        if grade.score is not None:
            coef = grade.coefficient or course.credits or 1
            weighted = grade.score * coef
            data.append([
                course.title,
                f"{grade.score:.2f}",
                str(coef),
                f"{weighted:.2f}"
            ])
    
    data.append(['MOYENNE GÉNÉRALE', f"{average:.2f}", f"{total_coef}", f"{total_weighted:.2f}"])
    
    table = Table(data, colWidths=[8*cm, 3*cm, 2*cm, 3*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF6B00')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 1*cm))
    
    # Mention
    mention = get_mention(average)
    elements.append(Paragraph(
        f"<b>Moyenne Générale: {average:.2f}/20 - Mention: {mention}</b>",
        ParagraphStyle('Mention', parent=styles['Normal'], alignment=TA_CENTER, textColor=colors.HexColor('#FF6B00'))
    ))
    
    doc.build(elements)
    buffer.seek(0)
    pdf_content = buffer.getvalue()
    
    # Sauvegarder le PDF sur disque
    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"releve_{student.matricule or student_id}_{timestamp}.pdf"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        f.write(pdf_content)
    
    # Sauvegarder
    document = Document(
        document_type="transcript",
        title=f"Relevé de notes - {student.first_name} {student.last_name} - {session.name}",
        file_path=str(file_path),
        student_id=student_id,
        generated_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(document)
    db.commit()
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ✅ UPLOAD COURS PDF
@router.post("/upload-course-material")
async def upload_course_material(
    title: str = Form(...),
    course_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "censeur"))
):
    """Upload un fichier PDF de cours"""
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    
    if not file.filename or not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    upload_dir = Path("uploads/courses")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    document = Document(
        document_type="course_material",
        title=title,
        description=f"Cours: {course.title}",
        file_path=str(file_path),
        generated_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(document)
    db.commit()
    
    return {
        "message": "Fichier uploadé avec succès",
        "file_path": str(file_path),
        "document_id": document.id
    }


# ✅ LISTE DES DOCUMENTS GÉNÉRÉS
@router.get("/my-documents")
def get_my_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Récupère la liste des documents générés"""
    
    documents = db.query(Document).filter(
        Document.university_id == current_user.university_id
    ).order_by(Document.created_at.desc()).all()
    
    return [
        {
            "id": doc.id,
            "document_type": doc.document_type,
            "title": doc.title,
            "description": doc.description,
            "file_path": doc.file_path,
            "student_id": doc.student_id,
            "generated_by": doc.generated_by,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "download_count": doc.download_count
        }
        for doc in documents
    ]


# ✅ TÉLÉCHARGER UN DOCUMENT
@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "student", "censeur"))
):
    """Télécharge un document par son ID"""
    
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.university_id == current_user.university_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    if not document.file_path:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    file_path = Path(document.file_path)
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable sur le serveur")
    
    # Incrémenter le compteur
    document.download_count = (document.download_count or 0) + 1
    db.commit()
    
    return Response(
        content=file_path.read_bytes(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={file_path.name}"}
    )