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
from app.models.payment import Payment
from app.models.academic_fee import AcademicFee
from app.models.payment_tranche import PaymentTranche
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
from app.services.pdf_generator import (
    generate_enrollment_certificate_pdf,
    generate_success_certificate_pdf,
    draw_official_page_decorations
)

router = APIRouter(prefix="/documents", tags=["Documents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ GÉNÉRER ATTESTATION DE SCOLARITÉ OFFICIELLE INSTITUTIONNELLE
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

    current_year = f"{datetime.now().year}-{datetime.now().year+1}"
    pdf_content = generate_enrollment_certificate_pdf(
        student=student,
        university=university,
        academic_year=current_year
    )

    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"attestation_scolarite_{student.matricule or student.id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    file_path = upload_dir / filename
    with open(file_path, "wb") as f:
        f.write(pdf_content)

    document = Document(
        document_type="enrollment_certificate",
        title=f"Attestation de scolarité officielle - {student.last_name} {student.first_name}",
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


# ✅ GÉNÉRER ATTESTATION DE RÉUSSITE OFFICIELLE INSTITUTIONNELLE
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

    session_name = session.name if session else "Session Principale"
    report_card = db.query(ReportCard).filter(
        ReportCard.student_id == student_id,
        ReportCard.session_id == (session.id if session else None)
    ).first() if session else None

    mention = report_card.mention if report_card and report_card.mention else "Bien"
    current_year = f"{datetime.now().year}-{datetime.now().year+1}"

    pdf_content = generate_success_certificate_pdf(
        student=student,
        university=university,
        academic_year=current_year,
        mention=mention,
        session_title=session_name
    )

    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"certificat_reussite_{student.matricule or student.id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    file_path = upload_dir / filename
    with open(file_path, "wb") as f:
        f.write(pdf_content)

    document = Document(
        document_type="achievement_certificate",
        title=f"Certificat de réussite officiel - {student.last_name} {student.first_name}",
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

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=university.name.upper(), watermark="ATTESTATION OFFICIELLE")

    doc.build(elements, onFirstPage=on_page)
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
    from app.models.material import Material
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course: raise HTTPException(status_code=404, detail="Cours non trouvé")
    if not file.filename or not file.filename.endswith('.pdf'): raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    upload_dir = Path("uploads/courses")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    file_path = upload_dir / filename
    
    content = await file.read()
    with open(file_path, "wb") as f: f.write(content)
    
    clean_path = str(file_path).replace("\\", "/")
    
    # 1. Enregistrer dans Material pour l'espace étudiant et enseignant
    material = Material(
        title=title,
        description=f"Cours: {course.title}",
        file_path=clean_path,
        file_type="application/pdf",
        file_size=len(content),
        original_name=file.filename,
        course_id=course.id,
        teacher_id=course.teacher_id,
        university_id=current_user.university_id,
        visibility="students"
    )
    db.add(material)

    # 2. Enregistrer également dans Document pour l'archivage global
    document = Document(
        document_type="course_material",
        title=title,
        description=f"Cours: {course.title}",
        file_path=clean_path,
        generated_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(document)
    db.commit()
    db.refresh(material)
    return {"message": "Fichier uploadé avec succès", "file_path": clean_path, "material_id": material.id, "document_id": document.id}


# ✅ LISTE DES DOCUMENTS GÉNÉRÉS
@router.get("/my-documents")
def get_my_documents(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))):
    documents = db.query(Document).filter(Document.university_id == current_user.university_id).order_by(Document.created_at.desc()).all()
    return [{"id": doc.id, "document_type": doc.document_type, "title": doc.title, "description": doc.description, "file_path": doc.file_path, "student_id": doc.student_id, "generated_by": doc.generated_by, "created_at": doc.created_at.isoformat() if doc.created_at else None, "download_count": doc.download_count} for doc in documents]


# ✅ AJOUTÉ : documents personnels de l'étudiant connecté
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

    # Si c'est un document de cours public, les étudiants y ont naturellement accès
    if current_user.role == "student" and document.document_type != "course_material":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or document.student_id != student.id:
            raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce document")

    file_path = Path(document.file_path)
    if not file_path.exists(): raise HTTPException(status_code=404, detail="Fichier introuvable sur le serveur")
    
    document.download_count = (document.download_count or 0) + 1
    db.commit()
    return Response(content=file_path.read_bytes(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={file_path.name}"})


# ✅ GÉNÉRER RELEVÉ DE NOTES (TRANSCRIPT)
@router.get("/generate-transcript/{student_id}")
def generate_transcript(
    student_id: int,
    session_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Génère le relevé de notes officiel de l'étudiant en PDF"""
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

    grades_query = db.query(Grade, Course).join(Course).filter(Grade.student_id == student_id)
    if session:
        grades_query = grades_query.filter(Grade.session_id == session.id)
    grades_with_courses = grades_query.all()

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    elements = []
    styles = getSampleStyleSheet()

    # En-tête avec logo
    logo_path = f"uploads/logos/{university.logo}" if university and university.logo else None
    if logo_path and Path(logo_path).exists():
        try:
            logo = Image(logo_path, width=2.5*cm, height=2.5*cm)
            logo.hAlign = "CENTER"
            elements.append(logo)
            elements.append(Spacer(1, 0.2*cm))
        except Exception:
            pass

    elements.append(Paragraph(university.name.upper(), ParagraphStyle('UniTitle', fontSize=13, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4)))
    if university.slogan:
        elements.append(Paragraph(university.slogan, ParagraphStyle('Slogan', fontSize=9, alignment=TA_CENTER, fontName="Helvetica-Oblique", spaceAfter=8)))

    elements.append(Paragraph("RELEVÉ DE NOTES OFFICIEL", ParagraphStyle('TranscriptTitle', fontSize=15, alignment=TA_CENTER, fontName="Helvetica-Bold", textColor=colors.HexColor("#0a1628"), spaceAfter=12)))

    # Infos étudiant
    dob = student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else "N/A"
    session_title = session.name if session else "Session Principale"
    student_table_data = [
        ["Nom & Prénom :", f"{student.last_name.upper()} {student.first_name}", "Matricule :", student.matricule or "N/A"],
        ["Filière :", student.filiere or "N/A", "Niveau :", student.level or "N/A"],
        ["Né(e) le :", dob, "Session :", session_title]
    ]
    student_table = Table(student_table_data, colWidths=[3.2*cm, 5.8*cm, 2.5*cm, 5.5*cm])
    student_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(student_table)
    elements.append(Spacer(1, 0.6*cm))

    # Tableau des notes
    table_data = [["Code", "Module", "Crédits", "CC", "Exam", "Moyenne /20", "Statut"]]
    total_credits = 0
    obtained_credits = 0
    total_weighted = 0

    for g, c in grades_with_courses:
        cr = c.credits or 3
        score = g.score if g.score is not None else 0
        total_credits += cr
        weighted = score * cr
        total_weighted += weighted
        if score >= 10:
            obtained_credits += cr
        status_txt = "Validé" if score >= 10 else "Ajourné"
        cc_txt = f"{g.cc_score:.2f}" if g.cc_score is not None else "-"
        exam_txt = f"{g.exam_score:.2f}" if g.exam_score is not None else "-"
        table_data.append([
            c.code or "-",
            c.title[:35],
            str(cr),
            cc_txt,
            exam_txt,
            f"{score:.2f}",
            status_txt
        ])

    overall_avg = round(total_weighted / total_credits, 2) if total_credits > 0 else 0
    table_data.append([
        "TOTAL", "MOYENNE GÉNÉRALE", str(total_credits), "", "", f"{overall_avg:.2f}", f"{obtained_credits}/{total_credits} crédits"
    ])

    notes_table = Table(table_data, colWidths=[2.2*cm, 6.2*cm, 1.6*cm, 1.6*cm, 1.6*cm, 2.2*cm, 2.2*cm])
    notes_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0a1628')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f1f5f9')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(notes_table)
    elements.append(Spacer(1, 0.8*cm))

    # Décision & Footer
    decision = "ADMIS(E)" if overall_avg >= 10 else "AJOURNÉ(E)"
    elements.append(Paragraph(f"<b>Décision du jury :</b> {decision} avec moyenne de <b>{overall_avg:.2f} / 20</b>", ParagraphStyle('Dec', fontSize=10, fontName="Helvetica", spaceAfter=15)))
    elements.append(Paragraph(f"Fait le {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('DateP', fontSize=10, alignment=TA_RIGHT, spaceAfter=20)))
    elements.append(Paragraph("La Direction des Études et Examens", ParagraphStyle('SignTitle', fontSize=11, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=5)))
    elements.append(Paragraph("(Signature & Sceau)", ParagraphStyle('SignSub', fontSize=9, fontName="Helvetica-Oblique", alignment=TA_CENTER)))

    doc.build(elements)
    buffer.seek(0)
    pdf_content = buffer.getvalue()

    upload_dir = Path("uploads/documents")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"releve_{student.matricule or student.id}_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
    file_path = upload_dir / filename
    with open(file_path, "wb") as f:
        f.write(pdf_content)

    doc_entry = Document(
        document_type="transcript",
        title=f"Relevé de notes - {student.last_name} {student.first_name}",
        file_path=str(file_path),
        student_id=student_id,
        generated_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(doc_entry)
    db.commit()

    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


# ==========================================
# ✅ REÇU DE PAIEMENT OFFICIEL (PDF)
# ==========================================
@router.get("/generate-receipt/{payment_id}")
def generate_receipt_pdf(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary", "student"))
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")

    student = db.query(Student).filter(Student.id == payment.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    university = db.query(University).filter(University.id == student.university_id).first()

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    elements = []
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(name="Header", fontSize=12, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4)
    title_style = ParagraphStyle(name="Title", fontSize=16, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=15, textColor=colors.HexColor('#0a1628'))
    body_style = ParagraphStyle(name="Body", fontSize=10.5, fontName="Helvetica", leading=14)

    # University header
    if university:
        elements.append(Paragraph(university.name.upper(), header_style))
        if university.address:
            elements.append(Paragraph(university.address, ParagraphStyle('Addr', fontSize=9, alignment=TA_CENTER, textColor=colors.grey)))
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph("REÇU DE PAIEMENT OFFICIEL", title_style))
    elements.append(Spacer(1, 0.5*cm))

    rec_num = getattr(payment, 'receipt_number', None) or f"REC-{payment.id:06d}"
    pay_date = payment.payment_date.strftime("%d/%m/%Y") if payment.payment_date else datetime.now().strftime("%d/%m/%Y")
    amount_str = f"{int(payment.amount):,} FCFA".replace(",", " ")

    info_data = [
        ["Numéro de reçu :", rec_num, "Date :", pay_date],
        ["Étudiant :", f"{student.first_name} {student.last_name}", "Matricule :", student.matricule or "-"],
        ["Filière :", student.filiere or "-", "Niveau :", student.level or "-"],
        ["Mode de règlement :", (payment.payment_method or "Espèces").upper(), "Statut :", (payment.status or "COMPLETED").upper()],
    ]
    info_table = Table(info_data, colWidths=[3.5*cm, 5*cm, 3*cm, 4.5*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('PADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.8*cm))

    # Payment details table
    details_data = [
        ["Désignation", "Type", "Montant réglé"],
        [payment.description or "Frais de scolarité", (payment.payment_type or "Scolarité").capitalize(), amount_str],
        ["TOTAL RÉGLÉ", "", amount_str]
    ]
    details_table = Table(details_data, colWidths=[8*cm, 4*cm, 4*cm])
    details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0a1628')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f8fafc')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 1*cm))

    # Signatures
    elements.append(Paragraph(f"Établi le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", ParagraphStyle('DT', fontSize=9, alignment=TA_RIGHT, spaceAfter=20)))
    sign_table = Table([
        ["L'Étudiant(e)", "Le Service Comptabilité & Caisse"],
        ["(Lu et approuvé)", "(Signature et Cachet)"]
    ], colWidths=[8*cm, 8*cm])
    sign_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(sign_table)

    doc.build(elements)
    buffer.seek(0)
    pdf_content = buffer.getvalue()

    filename = f"recu_{rec_num}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


# ==========================================
# ✅ RELEVÉ FINANCIER ÉTUDIANT (PDF)
# ==========================================
@router.get("/generate-financial-statement/{student_id}")
def generate_financial_statement_pdf(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary", "student"))
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    university = db.query(University).filter(University.id == student.university_id).first()

    # Get payments
    payments = db.query(Payment).filter(
        Payment.student_id == student_id,
        Payment.status == "completed"
    ).order_by(Payment.payment_date.asc()).all()

    # Get fee (Domaine + Remise négociée déduite)
    from app.utils.tuition import resolve_student_tuition_breakdown
    breakdown = resolve_student_tuition_breakdown(db, student, student.university_id, "scolarite")
    total_fee = breakdown["net_amount"]
    base_fee = breakdown["base_amount"]
    discount_fee = breakdown["discount_amount"]
    total_paid = sum(p.amount for p in payments)
    balance = max(0, total_fee - total_paid)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    elements = []
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(name="Header", fontSize=12, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4)
    title_style = ParagraphStyle(name="Title", fontSize=16, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=15, textColor=colors.HexColor('#0a1628'))

    if university:
        elements.append(Paragraph(university.name.upper(), header_style))
    elements.append(Spacer(1, 0.4*cm))
    elements.append(Paragraph("RELEVÉ DE SITUATION FINANCIÈRE", title_style))
    elements.append(Spacer(1, 0.4*cm))

    # Student info
    info_data = [
        ["Étudiant :", f"{student.first_name} {student.last_name}", "Matricule :", student.matricule or "-"],
        ["Filière :", student.filiere or "-", "Niveau :", student.level or "-"],
        ["Total Scolarité :", f"{int(total_fee):,} FCFA".replace(",", " "), "Statut Solde :", "SOLDÉ" if balance == 0 else "EN COURS"],
    ]
    info_table = Table(info_data, colWidths=[3.5*cm, 5*cm, 3*cm, 4.5*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('PADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.8*cm))

    # Payments table
    table_rows = [["N° Reçu", "Date", "Description", "Mode", "Montant"]]
    for p in payments:
        p_date = p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "-"
        p_rec = getattr(p, 'receipt_number', None) or f"REC-{p.id:06d}"
        table_rows.append([
            p_rec,
            p_date,
            (p.description or "Paiement scolarité")[:30],
            (p.payment_method or "Espèces").capitalize(),
            f"{int(p.amount):,} FCFA".replace(",", " ")
        ])

    table_rows.append(["TOTAL VERSÉ", "", "", "", f"{int(total_paid):,} FCFA".replace(",", " ")])
    table_rows.append(["SOLDE RESTANT", "", "", "", f"{int(balance):,} FCFA".replace(",", " ")])

    t = Table(table_rows, colWidths=[3.2*cm, 2.5*cm, 5*cm, 2.5*cm, 2.8*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0a1628')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0, -2), (-1, -1), colors.HexColor('#f8fafc')),
        ('FONTNAME', (0, -2), (-1, -1), 'Helvetica-Bold'),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 1*cm))

    elements.append(Paragraph(f"Arrêté à la somme versée de : <b>{int(total_paid):,} FCFA</b>".replace(",", " "), ParagraphStyle('Sum', fontSize=10, fontName="Helvetica", spaceAfter=15)))
    elements.append(Paragraph(f"Fait le {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('DateP', fontSize=10, alignment=TA_RIGHT, spaceAfter=20)))
    elements.append(Paragraph("Le Chef de Service Administratif et Financier", ParagraphStyle('SignTitle', fontSize=11, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=5)))
    elements.append(Paragraph("(Signature & Cachet)", ParagraphStyle('SignSub', fontSize=9, fontName="Helvetica-Oblique", alignment=TA_CENTER)))

    doc.build(elements)
    buffer.seek(0)
    pdf_content = buffer.getvalue()

    filename = f"releve_financier_{student.matricule or student.id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


# ==========================================
# ✅ ATTESTATION DE PAIEMENT (PDF)
# ==========================================
@router.get("/generate-payment-certificate/{student_id}")
def generate_payment_certificate_pdf(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary", "student"))
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    university = db.query(University).filter(University.id == student.university_id).first()

    payments = db.query(Payment).filter(
        Payment.student_id == student_id,
        Payment.status == "completed"
    ).all()
    total_paid = sum(p.amount for p in payments)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    elements = []
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(name="Header", fontSize=12, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4)
    title_style = ParagraphStyle(name="Title", fontSize=16, alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=20, textColor=colors.HexColor('#0a1628'))
    body_style = ParagraphStyle(name="Body", fontSize=12, leading=18, alignment=TA_JUSTIFY, fontName="Helvetica", spaceAfter=15)

    if university:
        elements.append(Paragraph(university.name.upper(), header_style))
    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph("ATTESTATION DE PAIEMENT", title_style))
    elements.append(Spacer(1, 0.8*cm))

    amount_str = f"{int(total_paid):,} FCFA".replace(",", " ")
    text = (
        f"Le Service de Gestion Financière de l'établissement atteste par la présente que l'étudiant(e) "
        f"<b>{student.first_name} {student.last_name}</b>, "
        f"inscrit(e) sous le matricule <b>{student.matricule or 'N/A'}</b> en filière <b>{student.filiere or 'Générale'}</b> "
        f"({student.level or 'Niveau en cours'}), a procédé au règlement effectif de la somme de <b>{amount_str}</b> "
        f"au titre de ses frais académiques pour l'année universitaire en cours.<br/><br/>"
        f"Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit."
    )
    elements.append(Paragraph(text, body_style))
    elements.append(Spacer(1, 2*cm))

    elements.append(Paragraph(f"Fait le {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('DateP', fontSize=11, alignment=TA_RIGHT, spaceAfter=20)))
    elements.append(Paragraph("Le Comptable Principal", ParagraphStyle('SignTitle', fontSize=12, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=5)))
    elements.append(Paragraph("(Signature & Cachet)", ParagraphStyle('SignSub', fontSize=10, fontName="Helvetica-Oblique", alignment=TA_CENTER)))

    doc.build(elements)
    buffer.seek(0)
    pdf_content = buffer.getvalue()

    filename = f"attestation_paiement_{student.matricule or student.id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})