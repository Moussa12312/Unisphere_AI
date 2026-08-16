from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.connection import SessionLocal
from app.models.document import Document
from app.models.student import Student
from app.models.course import Course
from app.models.university import University
from app.models.user import User
from app.models.report_card import ReportCard
from app.models.exam_session import ExamSession
from app.models.attendance import Attendance
from app.services.ocr_service import extract_text_from_image, extract_student_info
from app.core.dependencies import require_role
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from io import BytesIO
from pathlib import Path

router = APIRouter(prefix="/documents", tags=["Documents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ GÉNÉRER ATTESTATION DE SCOLARITÉ (100% GÉNÉRIQUE)
@router.get("/generate-enrollment-certificate/{student_id}")
def generate_enrollment_certificate(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    university = db.query(University).filter(University.id == student.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(name="Title", fontSize=16, leading=20, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=colors.black, spaceAfter=20)
    header_style = ParagraphStyle(name="Header", fontSize=11, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=5)
    body_style = ParagraphStyle(name="Body", fontSize=12, alignment=TA_LEFT, fontName="Helvetica", spaceAfter=10)

    # Logo
    logo_path = f"uploads/logos/{university.logo}" if university and university.logo else None
    if logo_path and Path(logo_path).exists():
        logo = Image(logo_path, width=3*cm, height=3*cm)
        logo.hAlign = "CENTER"
        elements.append(logo)
        elements.append(Spacer(1, 0.3*cm))

    # En-tête dynamique avec le NOM DE L'UNIVERSITÉ
    elements.append(Paragraph(university.name.upper(), header_style))
    if university.address:
        elements.append(Paragraph(university.address, ParagraphStyle(name="Address", fontSize=9, alignment=TA_CENTER, fontName="Helvetica", spaceAfter=10, textColor=colors.grey)))
    else:
        elements.append(Spacer(1, 0.5*cm))
        
    elements.append(Paragraph("ATTESTATION DE SCOLARITÉ", title_style))
    elements.append(Spacer(1, 1*cm))

    elements.append(Paragraph(f"La Direction de {university.name} atteste que :", body_style))
    elements.append(Spacer(1, 0.8*cm))

    date_of_birth = student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else "N/A"
    student_info = [
        ["Nom et Prénom :", f"{student.last_name.upper()} {student.first_name}"],
        ["Matricule :", student.matricule or "N/A"],
        ["Date de naissance :", date_of_birth],
        ["Filière :", student.filiere or "Non spécifié"],
        ["Niveau :", student.level or "Non spécifié"]
    ]

    info_table = Table(student_info, colWidths=[4*cm, 8*cm])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'), ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6), ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 1*cm))

    current_year = datetime.now().year
    certification_text = f"""
    Est régulièrement inscrit(e) au sein de notre établissement pour l'année universitaire <b>{current_year}-{current_year+1}</b>.
    <br/><br/>
    Cette attestation est délivrée à l'intéressé(e), sur sa demande, pour servir et valoir ce que de droit.
    """
    elements.append(Paragraph(certification_text, body_style))

    elements.append(Spacer(1, 2*cm))
    elements.append(Paragraph(f"Fait à Bamako, le {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle(name="Date", fontSize=11, alignment=TA_RIGHT, fontName="Helvetica", spaceAfter=20)))
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph("Le Directeur", ParagraphStyle(name="SignatureTitle", fontSize=12, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=20)))
    elements.append(Paragraph("(Signature et Cachet)", ParagraphStyle(name="SignatureNote", fontSize=10, alignment=TA_CENTER, fontName="Helvetica-Oblique", spaceAfter=10)))
    elements.append(Paragraph("______", ParagraphStyle(name="SignatureLine", fontSize=11, alignment=TA_CENTER, fontName="Helvetica", spaceAfter=0)))

    doc.build(elements)
    buffer.seek(0)
    pdf_content = buffer.getvalue()

    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"attestation_scolarite_{student.matricule or student.id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    file_path = upload_dir / filename
    with open(file_path, "wb") as f:
        f.write(pdf_content)

    document = Document(document_type="enrollment_certificate", title=f"Attestation de scolarité - {student.last_name} {student.first_name}", file_path=str(file_path), student_id=student_id, generated_by=current_user.id, university_id=current_user.university_id)
    db.add(document)
    db.commit()

    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


# ✅ GÉNÉRER ATTESTATION DE RÉUSSITE (100% GÉNÉRIQUE)
@router.get("/generate-achievement-certificate/{student_id}")
def generate_achievement_certificate(
    student_id: int,
    session_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    university = db.query(University).filter(University.id == student.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")

    if session_id:
        session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    else:
        session = db.query(ExamSession).filter(ExamSession.university_id == university.id).order_by(ExamSession.start_date.desc()).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")

    report_card = db.query(ReportCard).filter(ReportCard.student_id == student_id, ReportCard.session_id == session.id).first()
    mention = report_card.mention if report_card and report_card.mention else "Passable"
    average = report_card.average if report_card else 0

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(name="AchievementTitle", fontSize=18, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=colors.HexColor("#003366"), spaceAfter=20)
    
    logo_path = f"uploads/logos/{university.logo}" if university and university.logo else None
    if logo_path and Path(logo_path).exists():
        logo = Image(logo_path, width=3*cm, height=3*cm)
        logo.hAlign = "CENTER"
        elements.append(logo)
        elements.append(Spacer(1, 0.3*cm))

    elements.append(Paragraph(university.name.upper(), ParagraphStyle(name='UniHeader', fontSize=12, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=5)))
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph("ATTESTATION DE RÉUSSITE", title_style))
    elements.append(Spacer(1, 1*cm))

    elements.append(Paragraph(f"La Direction de {university.name} certifie par la présente que l'étudiant(e) :", body_style))
    elements.append(Spacer(1, 0.8*cm))

    date_of_birth = student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else "N/A"
    birth_place = getattr(student, 'place_of_birth', 'N/A') or "N/A"
    
    recipient_data = [
        ["Nom et Prénom :", f"{student.last_name.upper()} {student.first_name}"],
        ["Matricule :", student.matricule or "N/A"],
        ["Né(e) le :", f"{date_of_birth} à {birth_place}"],
    ]
    recipient_table = Table(recipient_data, colWidths=[4*cm, 8*cm])
    recipient_table.setStyle(TableStyle([('ALIGN', (0, 0), (0, -1), 'RIGHT'), ('ALIGN', (1, 0), (1, -1), 'LEFT'), ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 11), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
    elements.append(recipient_table)
    elements.append(Spacer(1, 1*cm))

    success_text = f"A satisfait avec succès aux épreuves de l'examen de fin d'année de la session <b>{session.name}</b>."
    elements.append(Paragraph(success_text, ParagraphStyle(name="BodySuccess", fontSize=12, alignment=TA_LEFT, fontName="Helvetica", spaceAfter=10)))
    elements.append(Spacer(1, 0.5*cm))

    conclusion_text = f"En conséquence, il/elle a obtenu le diplôme de <b>{student.level or 'Niveau'} en {student.filiere or 'Filière'}</b> avec la mention <b>{mention.upper()}</b> (moyenne : {average:.2f}/20).<br/><br/>Cette attestation lui est délivrée pour servir et valoir ce que de droit."
    elements.append(Paragraph(conclusion_text, ParagraphStyle(name="BodyConclusion", fontSize=12, alignment=TA_LEFT, fontName="Helvetica", spaceAfter=10)))
    elements.append(Spacer(1, 2*cm))

    elements.append(Paragraph(f"Fait à Bamako, le {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle(name='DateFooter', fontSize=11, alignment=TA_RIGHT, spaceAfter=20)))
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph("Le Directeur", ParagraphStyle(name='DirectorTitle', fontSize=12, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=5)))
    elements.append(Paragraph("(Signature et Cachet)", ParagraphStyle(name='SignatureNote', fontSize=10, alignment=TA_CENTER, fontName="Helvetica-Oblique", spaceAfter=10)))
    elements.append(Paragraph("______", ParagraphStyle(name='SignatureLine', fontSize=11, alignment=TA_CENTER, spaceAfter=0)))

    doc.build(elements)
    buffer.seek(0)
    pdf_content = buffer.getvalue()

    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"certificat_reussite_{student.matricule or student.id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    file_path = upload_dir / filename
    with open(file_path, "wb") as f:
        f.write(pdf_content)

    document = Document(document_type="achievement_certificate", title=f"Certificat de réussite - {student.last_name} {student.first_name}", file_path=str(file_path), student_id=student_id, generated_by=current_user.id, university_id=current_user.university_id)
    db.add(document)
    db.commit()

    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


# ✅ GÉNÉRER ATTESTATION DE PRÉSENCE (100% GÉNÉRIQUE)
@router.get("/generate-attendance-certificate/{student_id}")
def generate_attendance_certificate(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    university = db.query(University).filter(University.id == student.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")

    try:
        total_sessions = db.query(func.count(Attendance.id)).filter(Attendance.student_id == student_id).scalar() or 0
        present_sessions = db.query(func.count(Attendance.id)).filter(Attendance.student_id == student_id, Attendance.status == 'present').scalar() or 0
        late_sessions = db.query(func.count(Attendance.id)).filter(Attendance.student_id == student_id, Attendance.status == 'late').scalar() or 0

        total_present = present_sessions + late_sessions
        attendance_rate = round((total_present / total_sessions) * 100, 1) if total_sessions > 0 else 0
        attendance_text = f"a suivi les cours avec un <b>taux de présence de {attendance_rate}%</b> ({total_present} séances sur {total_sessions})"
    except Exception as e:
        # ✅ CORRIGÉ : le texte de repli reste le même (comportement voulu), mais on
        # log désormais l'erreur réelle pour pouvoir la diagnostiquer si elle est fréquente.
        print(f"⚠️ Impossible de calculer le taux de présence: {str(e)}")
        attendance_text = "est régulièrement inscrit(e) et suit les cours"

    current_year = datetime.now().year

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(name="AttendanceTitle", fontSize=16, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=colors.black, spaceAfter=20)
    body_style = ParagraphStyle(name="AttendanceBody", fontSize=12, alignment=TA_LEFT, fontName="Helvetica", spaceAfter=10)

    logo_path = f"uploads/logos/{university.logo}" if university and university.logo else None
    if logo_path and Path(logo_path).exists():
        logo = Image(logo_path, width=3*cm, height=3*cm)
        logo.hAlign = "CENTER"
        elements.append(logo)
        elements.append(Spacer(1, 0.3*cm))

    elements.append(Paragraph("RÉPUBLIQUE DU MALI", ParagraphStyle(name="RepublicHeader", fontSize=10, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=3)))
    elements.append(Paragraph("Un Peuple - Un But - Une Foi", ParagraphStyle(name="MottoHeader", fontSize=10, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=5)))
    elements.append(Paragraph("MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR", ParagraphStyle(name="MinistryHeader", fontSize=10, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=3)))
    elements.append(Paragraph("ET DE LA RECHERCHE SCIENTIFIQUE", ParagraphStyle(name="MinistrySubHeader", fontSize=10, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=10)))
    elements.append(Paragraph(university.name.upper(), ParagraphStyle(name="UniversityHeader", fontSize=12, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=10)))
    elements.append(Paragraph(f"ANNÉE UNIVERSITAIRE {current_year}-{current_year+1}", ParagraphStyle(name="YearHeader", fontSize=11, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=colors.HexColor("#FF6B00"), spaceAfter=15)))

    elements.append(Paragraph("ATTESTATION DE PRÉSENCE", title_style))
    elements.append(Paragraph("Je soussigné(e), Directeur(trice) de l'établissement,", body_style))
    elements.append(Paragraph("certifie que l'étudiant(e) :", body_style))
    elements.append(Spacer(1, 0.5*cm))

    date_of_birth = student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else "N/A"
    student_info = [
        ["Nom :", f"{student.last_name.upper()}"],
        ["Prénom :", f"{student.first_name}"],
        ["Matricule :", f"{student.matricule or 'N/A'}"],
        ["Né(e) le :", f"{date_of_birth}"],
        ["Filière :", f"{student.filiere or 'N/A'}"],
        ["Niveau :", f"{student.level or 'N/A'}"]
    ]

    info_table = Table(student_info, colWidths=[3*cm, 6*cm])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'), ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6), ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 1*cm))

    elements.append(Paragraph(f"{attendance_text} durant l'année universitaire {current_year}-{current_year+1}.", body_style))
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph("Cette attestation lui est délivrée à sa demande pour servir et valoir ce que de droit.", body_style))

    elements.append(Paragraph(f"Fait à Bamako, le {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle(name="DateFooter", fontSize=11, alignment=TA_RIGHT, spaceAfter=20)))
    elements.append(Paragraph("Le Directeur", ParagraphStyle(name="DirectorTitle", fontSize=12, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=5)))
    elements.append(Paragraph("(Signature et Cachet)", ParagraphStyle(name="SignatureNote", fontSize=10, alignment=TA_CENTER, fontName="Helvetica-Oblique", spaceAfter=10)))
    elements.append(Paragraph("______", ParagraphStyle(name="SignatureLine", fontSize=11, alignment=TA_CENTER, spaceAfter=0)))

    doc.build(elements)
    buffer.seek(0)
    pdf_content = buffer.getvalue()

    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"attestation_presence_{student.matricule or student.id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    file_path = upload_dir / filename
    with open(file_path, "wb") as f:
        f.write(pdf_content)

    document = Document(document_type="attendance_certificate", title=f"Attestation de présence - {student.last_name} {student.first_name}", file_path=str(file_path), student_id=student_id, generated_by=current_user.id, university_id=current_user.university_id)
    db.add(document)
    db.commit()

    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

# ✅ SCAN OCR DE DOCUMENT
@router.post("/scan")
async def scan_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Scanne un document et extrait les informations avec OCR"""
    
    if not file.filename or not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.pdf')):
        raise HTTPException(status_code=400, detail="Format non supporté (JPG, PNG, PDF uniquement)")
    
    # Lire l'image
    image_bytes = await file.read()
    
    # Extraire le texte avec OCR
    raw_text = extract_text_from_image(image_bytes)
    
    if not raw_text:
        raise HTTPException(status_code=400, detail="Impossible de lire le document")
    
    # Extraire les informations structurées
    student_info = extract_student_info(raw_text)
    
    # Sauvegarder temporairement le fichier pour prévisualisation
    upload_dir = Path("uploads/temp_scans")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        f.write(image_bytes)
    
    return {
        "message": "Document scanné avec succès",
        "raw_text": raw_text[:500],  # Limiter à 500 caractères
        "extracted_info": student_info,
        "file_path": str(file_path),
        "confidence": "high" if student_info['nom'] and student_info['prenom'] else "low"
    }

# ✅ UPLOAD COURS PDF
@router.post("/upload-course-material")
async def upload_course_material(
    title: str = Form(...), course_id: int = Form(...), file: UploadFile = File(...),
    db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "secretary", "teacher", "censeur"))
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course: raise HTTPException(status_code=404, detail="Cours non trouvé")
    if not file.filename or not file.filename.endswith('.pdf'): raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    upload_dir = Path("uploads/courses")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f: f.write(await file.read())
    
    document = Document(document_type="course_material", title=title, description=f"Cours: {course.title}", file_path=str(file_path), generated_by=current_user.id, university_id=current_user.university_id)
    db.add(document)
    db.commit()
    return {"message": "Fichier uploadé avec succès", "file_path": str(file_path), "document_id": document.id}


# ✅ LISTE DES DOCUMENTS GÉNÉRÉS
@router.get("/my-documents")
def get_my_documents(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))):
    documents = db.query(Document).filter(Document.university_id == current_user.university_id).order_by(Document.created_at.desc()).all()
    return [{"id": doc.id, "document_type": doc.document_type, "title": doc.title, "description": doc.description, "file_path": doc.file_path, "student_id": doc.student_id, "generated_by": doc.generated_by, "created_at": doc.created_at.isoformat() if doc.created_at else None, "download_count": doc.download_count} for doc in documents]


# ✅ AJOUTÉ : documents personnels de l'étudiant connecté (le endpoint ci-dessus
# est réservé au staff et renvoie TOUS les documents de l'université, donc
# inutilisable pour un étudiant qui doit voir uniquement ses propres fichiers).
@router.get("/me")
def get_my_own_documents(db: Session = Depends(get_db), current_user: User = Depends(require_role("student"))):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    documents = db.query(Document).filter(Document.student_id == student.id).order_by(Document.created_at.desc()).all()
    return [{
        "id": doc.id,
        "document_type": doc.document_type,
        "title": doc.title,
        "description": doc.description,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "download_count": doc.download_count
    } for doc in documents]


# ✅ TÉLÉCHARGER UN DOCUMENT
@router.get("/{document_id}/download")
def download_document(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "secretary", "teacher", "student", "censeur"))):
    document = db.query(Document).filter(Document.id == document_id, Document.university_id == current_user.university_id).first()
    if not document or not document.file_path: raise HTTPException(status_code=404, detail="Document non trouvé")

    # ✅ CORRIGÉ (faille IDOR) : un étudiant ne peut télécharger que SES PROPRES documents.
    # Avant, seul le filtre par université était appliqué : n'importe quel étudiant pouvait
    # télécharger le document de n'importe quel autre étudiant en devinant l'ID.
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or document.student_id != student.id:
            raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce document")

    file_path = Path(document.file_path)
    if not file_path.exists(): raise HTTPException(status_code=404, detail="Fichier introuvable sur le serveur")
    
    document.download_count = (document.download_count or 0) + 1
    db.commit()
    return Response(content=file_path.read_bytes(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={file_path.name}"})