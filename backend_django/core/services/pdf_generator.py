import os
from io import BytesIO
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
import qrcode


# ==========================================
# 🎨 PALETTE & STYLES OFFICIELS
# ==========================================
NAVY = colors.HexColor("#0A1628")
ORANGE = colors.HexColor("#FF6B00")
DARK_GRAY = colors.HexColor("#334155")
LIGHT_BG = colors.HexColor("#F8FAFC")
BORDER_COLOR = colors.HexColor("#CBD5E1")
GOLD = colors.HexColor("#D97706")
EMERALD = colors.HexColor("#059669")
CRIMSON = colors.HexColor("#DC2626")


def make_qr_code_image(data_str: str, size: float = 2.2 * cm) -> Image:
    """Génère un QR code d'authentification numérique en mémoire"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=1,
    )
    qr.add_data(data_str)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Image(buf, width=size, height=size)


def draw_official_page_decorations(canvas_obj, doc_obj, university_name: str = "UNIVERSITÉ", watermark: str = "DOCUMENT OFFICIEL"):
    """Dessine le double filet d'encadrement institutionnel, le filigrane et les mentions de sécurité"""
    canvas_obj.saveState()

    w, h = doc_obj.pagesize

    # 1. Double filet d'encadrement noble
    canvas_obj.setStrokeColor(NAVY)
    canvas_obj.setLineWidth(1.8)
    canvas_obj.rect(1.2 * cm, 1.2 * cm, w - 2.4 * cm, h - 2.4 * cm)

    canvas_obj.setStrokeColor(ORANGE)
    canvas_obj.setLineWidth(0.6)
    canvas_obj.rect(1.38 * cm, 1.38 * cm, w - 2.76 * cm, h - 2.76 * cm)

    # Coins décoratifs
    corner_size = 0.4 * cm
    canvas_obj.setFillColor(NAVY)
    for cx, cy in [
        (1.2 * cm, 1.2 * cm),
        (w - 1.2 * cm - corner_size, 1.2 * cm),
        (1.2 * cm, h - 1.2 * cm - corner_size),
        (w - 1.2 * cm - corner_size, h - 1.2 * cm - corner_size)
    ]:
        canvas_obj.rect(cx, cy, corner_size, corner_size, fill=1, stroke=0)

    # 2. Filigrane de fond incliné
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica-Bold", 38)
    canvas_obj.setFillColor(colors.HexColor("#F1F5F9"))
    canvas_obj.translate(w / 2.0, h / 2.0)
    canvas_obj.rotate(40)
    canvas_obj.drawCentredString(0, 0, watermark.upper())
    canvas_obj.restoreState()

    # 3. Pied de page sécurisé (Filigrane institutionnel propre sans surcharge)
    canvas_obj.restoreState()


# ==========================================
# 📄 1. ATTESTATION DE SCOLARITÉ OFFICIELLE
# ==========================================
def generate_enrollment_certificate_pdf(
    student: Any,
    university: Any,
    academic_year: str = "2025-2026",
    certificate_id: Optional[int] = None
) -> bytes:
    """
    Génère une Attestation de Scolarité officielle avec mise en page gouvernementale,
    armoiries, cartouche d'identification, filigrane et QR code de vérification.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        textColor=NAVY,
        spaceAfter=12
    )

    h_republic = ParagraphStyle(
        'RepHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=NAVY
    )

    motto_style = ParagraphStyle(
        'Motto',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
        textColor=DARK_GRAY
    )

    body_style = ParagraphStyle(
        'BodyOfficial',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=18,
        alignment=TA_JUSTIFY,
        textColor=colors.black
    )

    cert_num = f"CERT-SCO/{datetime.now().year}/{certificate_id or (student.id + 1000)}"

    elements = []

    # En-tête national & universitaire
    header_data = [
        [
            Paragraph("<b>RÉPUBLIQUE DU MALI</b><br/><i>Un Peuple - Un But - Une Foi</i><br/>---------<br/><b>MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR<br/>ET DE LA RECHERCHE SCIENTIFIQUE</b>", h_republic),
            Paragraph(f"<b>N° RÉFÉRENCE :</b><br/><font color='#FF6B00'>{cert_num}</font><br/><br/><b>DATE D'ÉMISSION :</b><br/>{datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('RefStyle', fontName='Helvetica', fontSize=8.5, alignment=TA_RIGHT, leading=11))
        ]
    ]
    t_header = Table(header_data, colWidths=[10.5 * cm, 6.5 * cm])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(t_header)
    elements.append(Spacer(1, 0.4 * cm))

    # Bloc Université
    univ_name = (university.name if university and university.name else "UNIVERSITÉ UNISPHERE").upper()
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UnivTitle', fontName='Helvetica-Bold', fontSize=14, alignment=TA_CENTER, textColor=ORANGE)))
    if university and getattr(university, 'address', None):
        elements.append(Paragraph(f"<font size=8 color='#475569'>{university.address}</font>", ParagraphStyle('UnivAddr', alignment=TA_CENTER)))

    elements.append(Spacer(1, 0.6 * cm))

    # Titre officiel dans un cadre
    title_box = [
        [Paragraph("<b>ATTESTATION DE SCOLARITÉ</b><br/><font size=9>ANNÉE UNIVERSITAIRE " + academic_year + "</font>", title_style)]
    ]
    t_title = Table(title_box, colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFF7ED")),
        ('BOX', (0, 0), (-1, -1), 1.2, ORANGE),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.7 * cm))

    # Corps d'attestation
    full_name = f"{student.first_name} {student.last_name.upper()}"
    dob_str = student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else "Non renseignée"
    pob_str = student.place_of_birth or "N/A"
    nat_str = student.nationality or "Malienne"
    mat_str = student.matricule or f"UN-{student.id:04d}"
    filiere_str = student.filiere or "Tronc commun"
    domain_str = getattr(student, 'domain', None) or getattr(student, 'domaine', None) or "Sciences et Technologies"
    level_str = student.level or "Licence 1 (L1)"

    text_intro = (
        f"Le Recteur de l'Université soussigné atteste par la présente que l'étudiant(e) :"
    )
    elements.append(Paragraph(text_intro, body_style))
    elements.append(Spacer(1, 0.35 * cm))

    # Cartouche étudiant
    cartouche_data = [
        [Paragraph("<b>Nom & Prénoms :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style)],
        [Paragraph("<b>Numéro Matricule :</b>", body_style), Paragraph(f"<font color='#0A1628'><b>{mat_str}</b></font>", body_style)],
        [Paragraph("<b>Né(e) le :</b>", body_style), Paragraph(f"{dob_str} à {pob_str}", body_style)],
        [Paragraph("<b>Nationalité :</b>", body_style), Paragraph(f"{nat_str}", body_style)],
        [Paragraph("<b>Domaine :</b>", body_style), Paragraph(f"{domain_str}", body_style)],
        [Paragraph("<b>Filière / Spécialité :</b>", body_style), Paragraph(f"<b>{filiere_str}</b>", body_style)],
        [Paragraph("<b>Niveau d'études :</b>", body_style), Paragraph(f"<b>{level_str}</b>", body_style)],
        [Paragraph("<b>Régime d'études :</b>", body_style), Paragraph("Formation Initiale (Temps plein)", body_style)],
    ]
    t_cartouche = Table(cartouche_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_cartouche.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_cartouche)
    elements.append(Spacer(1, 0.5 * cm))

    text_concl = (
        f"Est régulièrement inscrit(e) au titre de l'année académique <b>{academic_year}</b> "
        f"et suit assidûment les enseignements théoriques et pratiques dispensés au sein de notre établissement.<br/><br/>"
        "En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit."
    )
    elements.append(Paragraph(text_concl, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    # Bloc signatures, tampon et QR Code
    verify_url = f"UNISPHERE-VERIF:{mat_str}:{cert_num}:{academic_year}"
    qr_img = make_qr_code_image(verify_url, size=2.4 * cm)

    sign_data = [
        [
            Paragraph("<b>Authentification Numérique</b><br/><font size=7 color='#64748B'>Scannez pour vérifier l'authenticité</font>", ParagraphStyle('QRTxt', fontSize=8, alignment=TA_CENTER, leading=10)),
            Paragraph(f"Fait à Bamako, le {datetime.now().strftime('%d %B %Y')}<br/><b>Le Directeur des Études & de la Scolarité</b>", ParagraphStyle('SignHead', fontName='Helvetica-Bold', fontSize=10, alignment=TA_CENTER, leading=14))
        ],
        [
            qr_img,
            Paragraph("<br/><br/><b>Dr. Souleymane DIARRA</b><br/><font size=8 color='#64748B'>[ Cachet Officiel & Signature Numérique Apposés ]</font>", ParagraphStyle('SignName', alignment=TA_CENTER, fontSize=9))
        ]
    ]
    t_sign = Table(sign_data, colWidths=[6.0 * cm, 11.0 * cm])
    t_sign.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(KeepTogether(t_sign))

    # Construire avec filigrane et cadre
    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="ATTESTATION OFFICIELLE")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==========================================
# 🎓 2. ATTESTATION DE RÉUSSITE AU DIPLÔME
# ==========================================
def generate_success_certificate_pdf(
    student: Any,
    university: Any,
    academic_year: str = "2024-2025",
    mention: str = "Assez Bien",
    session_title: str = "Session Normale",
    certificate_id: Optional[int] = None
) -> bytes:
    """
    Génère une Attestation de Réussite / Diplôme provisoire officiel
    conforme aux délibérations du jury du système LMD.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'SuccessTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        textColor=NAVY
    )

    h_republic = ParagraphStyle(
        'RepHeader2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=NAVY
    )

    body_style = ParagraphStyle(
        'SuccessBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=18,
        alignment=TA_JUSTIFY,
        textColor=colors.black
    )

    cert_num = f"DIPL-ATTEST/{datetime.now().year}/{certificate_id or (student.id + 5000)}"
    univ_name = (university.name if university and university.name else "UNIVERSITÉ UNISPHERE").upper()

    elements = []

    # En-tête national
    header_data = [
        [
            Paragraph("<b>RÉPUBLIQUE DU MALI</b><br/><i>Un Peuple - Un But - Une Foi</i><br/>---------<br/><b>MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR<br/>ET DE LA RECHERCHE SCIENTIFIQUE</b>", h_republic),
            Paragraph(f"<b>N° DIPLÔME :</b><br/><font color='#D97706'>{cert_num}</font><br/><br/><b>DÉLIVRÉ LE :</b><br/>{datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('RefStyle2', fontName='Helvetica', fontSize=8.5, alignment=TA_RIGHT, leading=11))
        ]
    ]
    t_header = Table(header_data, colWidths=[10.5 * cm, 6.5 * cm])
    t_header.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(t_header)
    elements.append(Spacer(1, 0.4 * cm))

    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UnivTitle2', fontName='Helvetica-Bold', fontSize=14, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.6 * cm))

    # Titre Attestation de Réussite
    title_box = [
        [Paragraph("<b>ATTESTATION DE RÉUSSITE AU DIPLÔME</b><br/><font size=10>GRADE DE LICENCE / SYSTÈME LMD</font>", title_style)]
    ]
    t_title = Table(title_box, colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
        ('BOX', (0, 0), (-1, -1), 1.5, GOLD),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.7 * cm))

    full_name = f"{student.first_name} {student.last_name.upper()}"
    dob_str = student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else "N/A"
    pob_str = student.place_of_birth or "N/A"
    mat_str = student.matricule or f"UN-{student.id:04d}"
    filiere_str = student.filiere or "Informatique et Télécommunications"
    domain_str = getattr(student, 'domain', None) or getattr(student, 'domaine', None) or "Sciences & Technologies"

    text_intro = (
        "Le Président du Jury d'Examen et de Délibération, vu les procès-verbaux de délibération "
        "en date de la session académique, atteste que :"
    )
    elements.append(Paragraph(text_intro, body_style))
    elements.append(Spacer(1, 0.4 * cm))

    # Cartouche étudiant
    cartouche_data = [
        [Paragraph("<b>L'étudiant(e) :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style)],
        [Paragraph("<b>Matricule :</b>", body_style), Paragraph(f"<b>{mat_str}</b>", body_style)],
        [Paragraph("<b>Né(e) le :</b>", body_style), Paragraph(f"{dob_str} à {pob_str}", body_style)],
        [Paragraph("<b>Domaine :</b>", body_style), Paragraph(f"{domain_str}", body_style)],
        [Paragraph("<b>Filière de Spécialité :</b>", body_style), Paragraph(f"<b>{filiere_str}</b>", body_style)],
        [Paragraph("<b>Année Académique :</b>", body_style), Paragraph(f"{academic_year}", body_style)],
        [Paragraph("<b>Session :</b>", body_style), Paragraph(f"{session_title}", body_style)],
        [Paragraph("<b>Mention Obtenue :</b>", body_style), Paragraph(f"<font color='#059669'><b>{mention.upper()}</b></font>", body_style)],
        [Paragraph("<b>Total Crédits ECTS :</b>", body_style), Paragraph("<b>180 Crédits (Cycle complet validé)</b>", body_style)],
    ]
    t_cartouche = Table(cartouche_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_cartouche.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#FFFBEB")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#FDE68A")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_cartouche)
    elements.append(Spacer(1, 0.5 * cm))

    text_concl = (
        "A satisfait aux épreuves de contrôle des connaissances et des compétences prévues "
        "par les règlements de l'enseignement supérieur pour l'obtention du diplôme de <b>LICENCE</b>.<br/><br/>"
        "<i>La présente attestation provisoire confère les mêmes droits que le diplôme définitif "
        "en cours d'établissement par les autorités compétentes.</i>"
    )
    elements.append(Paragraph(text_concl, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    # Bloc signatures
    verify_url = f"UNISPHERE-DIPLOMA:{mat_str}:{cert_num}:{mention}"
    qr_img = make_qr_code_image(verify_url, size=2.4 * cm)

    sign_data = [
        [
            Paragraph("<b>Contrôle d'Authenticité</b><br/><font size=7 color='#64748B'>Scannez pour valider ce diplôme</font>", ParagraphStyle('QRTxt2', fontSize=8, alignment=TA_CENTER, leading=10)),
            Paragraph(f"Fait à Bamako, le {datetime.now().strftime('%d %B %Y')}<br/><b>Le Recteur de l'Université</b>", ParagraphStyle('SignHead2', fontName='Helvetica-Bold', fontSize=10, alignment=TA_CENTER, leading=14))
        ],
        [
            qr_img,
            Paragraph("<br/><br/><b>Prof. Mahamadou CISSE</b><br/><font size=8 color='#64748B'>[ Sceau de l'Université & Signature Officielle ]</font>", ParagraphStyle('SignName2', alignment=TA_CENTER, fontSize=9))
        ]
    ]
    t_sign = Table(sign_data, colWidths=[6.0 * cm, 11.0 * cm])
    t_sign.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    elements.append(KeepTogether(t_sign))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="RÉUSSITE AU DIPLÔME")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==========================================
# 📊 3. RELEVÉ DE NOTES OFFICIEL DU SYSTÈME LMD
# ==========================================
def get_ecob_grade_details(score: float):
    """Calcule la lettre et la mention selon le barème officiel ECOB"""
    if score >= 18.0:
        return "A+", "Excellent"
    elif score >= 17.0:
        return "A", "Excellent"
    elif score >= 16.5:
        return "A-", "Excellent"
    elif score >= 16.0:
        return "B+", "Très Bien"
    elif score >= 15.0:
        return "B", "Très Bien"
    elif score >= 14.0:
        return "B-", "Bien"
    elif score >= 13.0:
        return "C+", "Assez Bien"
    elif score >= 12.0:
        return "C", "Assez Bien"
    elif score >= 10.0:
        return "D", "Passable"
    else:
        return "F", "Ajourné"


def get_lmd_grade_details(score: float):
    """Calcule la lettre et la mention selon le barème officiel du système LMD"""
    if score >= 18.0:
        return "A+", "Excellent"
    elif score >= 17.0:
        return "A", "Excellent"
    elif score >= 16.5:
        return "A-", "Excellent"
    elif score >= 16.0:
        return "B+", "Très Bien"
    elif score >= 15.0:
        return "B", "Très Bien"
    elif score >= 14.0:
        return "B-", "Bien"
    elif score >= 13.0:
        return "C+", "Assez Bien"
    elif score >= 12.0:
        return "C", "Assez Bien"
    elif score >= 10.0:
        return "D", "Passable"
    else:
        return "F", "Ajourné"

# Alias rétro-compatible
get_ecob_grade_details = get_lmd_grade_details


def get_dynamic_university_logo_flowable(university: Any) -> Any:
    """Retourne le logo officiel de l'université active en respectant rigoureusement son ratio d'aspect réel (sans rétrécissement ni écrasement)"""
    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ").upper()
    slogan = getattr(university, 'slogan', '') or ""

    # Helper pour instancier une image ReportLab proportionnelle
    def load_proportional_img(file_path: Path, max_w: float = 4.2 * cm, max_h: float = 2.3 * cm):
        try:
            from PIL import Image as PILImage
            with PILImage.open(file_path) as im:
                orig_w, orig_h = im.size
                if orig_h <= 0 or orig_w <= 0:
                    return Image(str(file_path), width=max_w, height=max_h)
                aspect = orig_w / float(orig_h)
                box_aspect = max_w / max_h
                if aspect >= box_aspect:
                    w = max_w
                    h = max_w / aspect
                else:
                    h = max_h
                    w = max_h * aspect
                return Image(str(file_path), width=w, height=h)
        except Exception:
            return Image(str(file_path), width=max_w, height=max_h)

    # 1. Vérifier si un logo spécifique a été uploadé pour l'université
    logo_filename = getattr(university, 'logo', None)
    if logo_filename:
        base_dir = Path(__file__).resolve().parent.parent.parent
        candidates = [
            base_dir / "uploads" / "logos" / logo_filename,
            base_dir / "backend" / "uploads" / "logos" / logo_filename,
            Path("uploads/logos") / logo_filename,
            Path("uploads") / logo_filename
        ]
        for p in candidates:
            if p.exists():
                return load_proportional_img(p, max_w=3.8 * cm, max_h=2.2 * cm)

    # 2. Vérifier si un logo statique pour l'université existe
    univ_id = getattr(university, 'id', 1)
    static_candidates = [
        Path(__file__).resolve().parent.parent / "static" / "logos" / f"univ_{univ_id}.png",
        Path(__file__).resolve().parent.parent / "static" / "ecob" / "ecob_logo.png" if "ECOB" in univ_name else None
    ]
    for sc in static_candidates:
        if sc and sc.exists():
            return load_proportional_img(sc, max_w=3.8 * cm, max_h=2.2 * cm)

    # 3. Sinon, génération d'une identité visuelle typographique officielle soignée
    h_style = ParagraphStyle('DynUnivLogo', alignment=TA_CENTER, leading=10)
    logo_markup = f"<b><font size=11 color='#0A1628'>{univ_name[:36]}</font></b>"
    if slogan:
        logo_markup += f"<br/><font size=6.5 color='#64748B'><i>{slogan[:50]}</i></font>"
    return Paragraph(logo_markup, h_style)


def get_dynamic_university_stamp_image(university: Any, rector_title: str) -> Any:
    """Retourne ou génère dynamiquement le tampon officiel circulaire adapté à l'université active"""
    card_cfg = getattr(university, 'card_config', {}) or {}
    custom_stamp = card_cfg.get("stamp_path")
    if custom_stamp and Path(custom_stamp).exists():
        return Image(str(custom_stamp), width=2.55 * cm, height=2.55 * cm)

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ").upper()
    univ_id = getattr(university, 'id', 1)

    # Cachet dynamique propre à l'université
    stamps_dir = Path(__file__).resolve().parent.parent / "static" / "stamps"
    stamps_dir.mkdir(parents=True, exist_ok=True)
    stamp_path = stamps_dir / f"stamp_univ_{univ_id}.png"

    if stamp_path.exists():
        return Image(str(stamp_path), width=2.55 * cm, height=2.55 * cm)

    try:
        from PIL import Image as PILImage, ImageDraw, ImageFont
        import math

        sw, sh = 400, 400
        stamp_img = PILImage.new('RGBA', (sw, sh), (255, 255, 255, 0))
        sdraw = ImageDraw.Draw(stamp_img)
        blue_stamp = (24, 72, 160, 230)

        sdraw.ellipse([(20, 20), (380, 380)], outline=blue_stamp, width=5)
        sdraw.ellipse([(34, 34), (366, 366)], outline=blue_stamp, width=2)
        sdraw.ellipse([(80, 80), (320, 320)], outline=blue_stamp, width=2)

        try:
            font_arc = ImageFont.truetype("arialbd.ttf", 19)
            font_center = ImageFont.truetype("arialbd.ttf", 22)
            font_dir = ImageFont.truetype("ariali.ttf", 17)
            font_sub = ImageFont.truetype("arialbd.ttf", 14)
        except Exception:
            font_arc = ImageFont.load_default()
            font_center = ImageFont.load_default()
            font_dir = ImageFont.load_default()
            font_sub = ImageFont.load_default()

        top_txt = univ_name[:30]
        r_top, cx, cy = 150, 200, 200
        angle_start, angle_end = -140, -40
        step = (angle_end - angle_start) / max(len(top_txt) - 1, 1)
        for i, ch in enumerate(top_txt):
            rad = math.radians(angle_start + i * step)
            x = cx + r_top * math.cos(rad) - 7
            y = cy + r_top * math.sin(rad) - 7
            sdraw.text((x, y), ch, fill=blue_stamp, font=font_arc)

        words = [w for w in univ_name.split() if len(w) > 2]
        acronym = ''.join([w[0] for w in words])[:8] if words else "UNIV"
        sdraw.text((150, 125), acronym, fill=blue_stamp, font=font_center)
        sdraw.text((115, 165), f"★ {rector_title} ★", fill=blue_stamp, font=font_dir)
        sdraw.text((125, 200), getattr(university, 'country', 'REPUBLIQUE DU MALI').upper()[:24], fill=blue_stamp, font=font_sub)

        phone = getattr(university, 'phone', '') or ''
        bot_txt = f"Tél: {phone}"[:24] if phone else "Sceau Officiel"
        r_bot = 152
        b_start, b_end = 145, 35
        b_step = (b_end - b_start) / max(len(bot_txt) - 1, 1)
        for i, ch in enumerate(bot_txt):
            rad = math.radians(b_start + i * b_step)
            x = cx + r_bot * math.cos(rad) - 6
            y = cy + r_bot * math.sin(rad) - 6
            sdraw.text((x, y), ch, fill=blue_stamp, font=font_sub)

        sig_blue = (15, 45, 140, 245)
        points = [
            (80, 210), (120, 150), (145, 230), (170, 160), (205, 175),
            (240, 140), (260, 185), (225, 220), (170, 235), (280, 225), (320, 215)
        ]
        sdraw.line(points, fill=sig_blue, width=4)
        sdraw.line([(100, 215), (290, 195)], fill=sig_blue, width=3)
        sdraw.arc([(160, 130), (250, 210)], start=20, end=340, fill=sig_blue, width=3)

        stamp_img.save(str(stamp_path), 'PNG')
        return Image(str(stamp_path), width=2.55 * cm, height=2.55 * cm)
    except Exception:
        return Spacer(1, 2.0 * cm)


def generate_lmd_transcript_pdf(
    student: Any,
    university: Any,
    session: Any,
    units_with_grades: List[Dict[str, Any]],
    general_average: float,
    total_credits_earned: int,
    total_credits_possible: int = 30,
    rank: Optional[int] = None,
    total_students: Optional[int] = None,
    academic_config: Optional[Any] = None
) -> bytes:
    """
    Génère le Relevé de Notes Officiel LMD conforme aux standards universitaires en une seule page A4 Portrait.
    100% DYNAMIQUE : alimenté exclusivement par les informations réelles saisies par l'administration.
    Marges aérées et équilibre visuel parfait du haut en bas (1.6cm de marge avec 1.2cm de filet de bordure).
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.60 * cm,
        rightMargin=1.60 * cm,
        topMargin=1.30 * cm,
        bottomMargin=1.10 * cm
    )

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ").upper()
    card_cfg = getattr(university, 'card_config', {}) or {}

    # Année académique dynamique prioritaire depuis AcademicConfig puis University
    acad_year = (
        (getattr(academic_config, 'current_academic_year', None) or "").strip()
        or (getattr(academic_config, 'academic_year', None) or "").strip()
        or (getattr(university, 'academic_year', None) or "").strip()
        or "2026-2027"
    )

    raw_country = getattr(university, 'country', None) or "Mali"
    country_name = "RÉPUBLIQUE DU MALI" if "mali" in raw_country.lower() else raw_country.upper()

    # Détermination du signataire et son titre
    rector_title = card_cfg.get("rector_title") or ("LE RECTEUR" if any(w in univ_name for w in ["UNIVERSITE", "UNIVERSITÉ"]) else "LE DIRECTEUR GÉNÉRAL")
    rector_name = getattr(university, 'rector_name', None) or "La Direction Générale"

    # Agrément officiel dynamique
    accreditation = card_cfg.get("accreditation") or getattr(university, 'description', None)
    if not accreditation or len(accreditation.strip()) < 5:
        accreditation = "Établissement d'Enseignement Supérieur Agréé par le MESRS"

    page_counter = [0]
    def on_page(canv, doc_inst):
        page_counter[0] += 1
        w, h = doc_inst.pagesize

        # 1. Double filet d'encadrement institutionnel aéré et retiré des bords physiques (1.20 cm)
        canv.saveState()
        canv.setStrokeColor(colors.HexColor("#1E293B"))
        canv.setLineWidth(1.2)
        canv.rect(1.20 * cm, 0.90 * cm, w - 2.40 * cm, h - 1.80 * cm)

        canv.setStrokeColor(colors.HexColor("#475569"))
        canv.setLineWidth(0.5)
        canv.rect(1.28 * cm, 0.98 * cm, w - 2.56 * cm, h - 1.96 * cm)

        # 2. Filigrane de fond central DYNAMIQUE de l'université
        canv.setFillColor(colors.HexColor("#CBD5E1"), alpha=0.18)
        canv.translate(w / 2.0, h / 2.0)
        canv.rotate(35)
        words = univ_name.split()
        if len(words) > 3:
            mid = len(words) // 2
            line1 = ' '.join(words[:mid])
            line2 = ' '.join(words[mid:])
            canv.setFont("Helvetica-Bold", 24)
            canv.drawCentredString(0, 16, line1)
            canv.drawCentredString(0, -16, line2)
        elif len(words) >= 1:
            canv.setFont("Helvetica-Bold", 30)
            canv.drawCentredString(0, 0, univ_name[:28])
        canv.restoreState()

    elements = []

    # ========================================================
    # 1. EN-TÊTE SUPÉRIEUR EN 3 COLONNES DISTINCTES ET ÉQUILIBRÉES (17.8 cm)
    # ========================================================
    h_left = ParagraphStyle('HL', fontName='Helvetica-Bold', fontSize=6.8, leading=8.5, alignment=TA_LEFT)
    h_right = ParagraphStyle('HR', fontName='Helvetica-Bold', fontSize=6.8, leading=8.5, alignment=TA_RIGHT)

    logo_flowable = get_dynamic_university_logo_flowable(university)

    header_3col_data = [
        [
            Paragraph("<b>MINISTERE DE L'ENSEIGNEMENT SUPERIEUR<br/>ET DE LA RECHERCHE SCIENTIFIQUE</b><br/>*******************", h_left),
            logo_flowable,
            Paragraph(f"<b>{country_name}</b><br/>Un Peuple - Un But - Une Foi<br/>*******************", h_right)
        ]
    ]
    t_top_banner = Table(header_3col_data, colWidths=[5.4 * cm, 7.0 * cm, 5.4 * cm])
    t_top_banner.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(t_top_banner)
    elements.append(Spacer(1, 1.5 * mm))

    # ========================================================
    # 2. BLOC CENTRAL INSTITUTIONNEL (PLEINE LARGEUR, CENTRÉ)
    # ========================================================
    h_center_agr = ParagraphStyle('HCA', fontName='Helvetica-Oblique', fontSize=6.2, leading=7.5, alignment=TA_CENTER, textColor=colors.HexColor("#334155"))
    h_center_year = ParagraphStyle('HCY', fontName='Helvetica-Bold', fontSize=7.5, leading=9.0, alignment=TA_CENTER)
    h_center_sub = ParagraphStyle('HCS', fontName='Helvetica-Bold', fontSize=7.8, leading=9.5, alignment=TA_CENTER, textColor=colors.HexColor("#1D4ED8"))
    h_center_spe = ParagraphStyle('HCSpe', fontName='Helvetica-Bold', fontSize=8.0, leading=9.8, alignment=TA_CENTER)
    h_center_title = ParagraphStyle('HCT', fontName='Helvetica-Bold', fontSize=12.0, leading=14.0, alignment=TA_CENTER, textColor=colors.HexColor("#DC2626"))
    h_center_sess = ParagraphStyle('HCSS', fontName='Helvetica-Bold', fontSize=7.8, leading=9.2, alignment=TA_CENTER)

    level_val = (student.level or "L1").upper()
    filiere_val = (student.filiere or "Tronc Commun").upper()

    # Intitulé du cycle dynamique et académique
    if any(k in level_val for k in ["L1", "LICENCE 1", "1ERE", "1ÈRE"]):
        cycle_str = "PREMIÈRE ANNÉE DE LICENCE (LICENCE 1)"
    elif any(k in level_val for k in ["L2", "LICENCE 2", "2EME", "2ÈME"]):
        cycle_str = "DEUXIÈME ANNÉE DE LICENCE (LICENCE 2)"
    elif any(k in level_val for k in ["L3", "LICENCE 3", "3EME", "3ÈME"]):
        cycle_str = "TROISIÈME ANNÉE DE LICENCE (LICENCE 3)"
    elif any(k in level_val for k in ["M1", "MASTER 1"]):
        cycle_str = "PREMIÈRE ANNÉE DE MASTER (MASTER 1)"
    elif any(k in level_val for k in ["M2", "MASTER 2"]):
        cycle_str = "DEUXIÈME ANNÉE DE MASTER (MASTER 2)"
    elif "D" in level_val or "DOCTORAT" in level_val:
        cycle_str = f"CYCLE DE DOCTORAT ({level_val})"
    else:
        cycle_str = f"CYCLE D'ENSEIGNEMENT SUPÉRIEUR ({level_val})"

    raw_sem = session.name.upper() if session and getattr(session, 'name', None) else "SESSION 1"
    raw_sem = raw_sem.replace("SESSION1", "SESSION 1").replace("SESSION2", "SESSION 2").replace("SESSION3", "SESSION 3")
    if "SESSION 1" in raw_sem or "SEMESTRE 1" in raw_sem:
        sem_label = "SESSION 1"
    elif "SESSION 2" in raw_sem or "SEMESTRE 2" in raw_sem:
        sem_label = "SESSION 2"
    elif "SESSION 3" in raw_sem or "SEMESTRE 3" in raw_sem:
        sem_label = "SESSION 3"
    else:
        sem_label = raw_sem

    elements.append(Paragraph(f"<i>{accreditation}</i>", h_center_agr))
    elements.append(Paragraph(f"<b>ANNÉE UNIVERSITAIRE {acad_year}</b>", h_center_year))
    elements.append(Paragraph(f"<b>{cycle_str}</b>", h_center_sub))
    elements.append(Paragraph(f"<font color='#1D4ED8'>Filière / Spécialité : </font><font color='#DC2626'><b>{filiere_val}</b></font>", h_center_spe))
    elements.append(Spacer(1, 1.2 * mm))
    elements.append(Paragraph("<b><u>RELEVÉ DE NOTES</u></b>", h_center_title))
    elements.append(Paragraph(f"<b>{sem_label}</b>", h_center_sess))
    elements.append(Spacer(1, 2.8 * mm))

    # ========================================================
    # 3. FICHE D'IDENTIFICATION ÉTUDIANT (5 COLONNES, TOTAL = 17.8 cm)
    # ========================================================
    stu_th = ParagraphStyle('STH', fontName='Helvetica-Bold', fontSize=7.5, leading=9.2, alignment=TA_CENTER)
    stu_td = ParagraphStyle('STD', fontName='Helvetica-Bold', fontSize=8.0, leading=10.0, alignment=TA_CENTER)

    dob_str = student.date_of_birth.strftime('%d/%m/%Y') if getattr(student, 'date_of_birth', None) else "—"
    pob_str = (getattr(student, 'place_of_birth', None) or "—").upper()
    mat_str = student.matricule or f"ETU-{student.id:04d}"

    stu_data = [
        [
            Paragraph("<b>Nom</b>", stu_th),
            Paragraph("<b>Prénom</b>", stu_th),
            Paragraph("<b>Date de<br/>Naissance</b>", stu_th),
            Paragraph("<b>Lieu de<br/>Naissance</b>", stu_th),
            Paragraph("<b>N° Matricule</b>", stu_th)
        ],
        [
            Paragraph(student.last_name.upper(), stu_td),
            Paragraph(student.first_name.upper(), stu_td),
            Paragraph(dob_str, stu_td),
            Paragraph(pob_str, stu_td),
            Paragraph(mat_str, stu_td)
        ]
    ]
    t_stu = Table(stu_data, colWidths=[3.5 * cm, 3.7 * cm, 3.4 * cm, 3.6 * cm, 3.6 * cm])
    t_stu.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#334155")),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.2),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(t_stu)
    elements.append(Spacer(1, 3.0 * mm))

    # ========================================================
    # 4. TABLEAU DES NOTES GROUPÉ PAR UNITÉS D'ENSEIGNEMENT (UEs) (TOTAL = 17.8 cm)
    # ========================================================
    col_w = [1.7 * cm, 6.5 * cm, 1.1 * cm, 1.1 * cm, 1.8 * cm, 1.4 * cm, 1.7 * cm, 2.5 * cm]

    th1 = ParagraphStyle('TH1', fontName='Helvetica-Bold', fontSize=7.0, leading=8.8, alignment=TA_CENTER)
    th2 = ParagraphStyle('TH2', fontName='Helvetica-Bold', fontSize=7.0, leading=8.8, alignment=TA_CENTER)
    td_ue = ParagraphStyle('TDUE', fontName='Helvetica-Bold', fontSize=7.5, leading=9.2, alignment=TA_LEFT)
    td_mod = ParagraphStyle('TDMOD', fontName='Helvetica', fontSize=7.2, leading=8.8, alignment=TA_LEFT)
    td_c = ParagraphStyle('TDC', fontName='Helvetica', fontSize=7.2, leading=8.8, alignment=TA_CENTER)
    td_cb = ParagraphStyle('TDCB', fontName='Helvetica-Bold', fontSize=7.4, leading=9.0, alignment=TA_CENTER)

    table_data = [
        [
            Paragraph("<b>N° UE<br/>&<br/>MOD</b>", th1),
            Paragraph("<b>Unités d'Enseignements & Modules</b>", th1),
            Paragraph("<b>Note<br/>s/20</b>", th1),
            "",
            Paragraph("<b>Moyenne<br/>Générale</b>", th1),
            Paragraph("<b>Notation<br/>%</b>", th1),
            Paragraph("<b>Notation<br/>Alphbtq</b>", th1),
            Paragraph("<b>Observation<br/>& Mention</b>", th1)
        ],
        [
            "", "",
            Paragraph("<b>CC</b>", th2),
            Paragraph("<b>Exam</b>", th2),
            "", "", "", ""
        ],
        [
            "",
            Paragraph(f"<b>{sem_label}</b>", ParagraphStyle('SB', fontName='Helvetica-Bold', fontSize=7.8, alignment=TA_CENTER)),
            "", "", "", "", "", ""
        ]
    ]

    table_styles = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#334155")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.0),
        ('LEFTPADDING', (0, 0), (-1, -1), 2.2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2.2),

        ('SPAN', (0, 0), (0, 1)),
        ('SPAN', (1, 0), (1, 1)),
        ('SPAN', (2, 0), (3, 0)),
        ('SPAN', (4, 0), (4, 1)),
        ('SPAN', (5, 0), (5, 1)),
        ('SPAN', (6, 0), (6, 1)),
        ('SPAN', (7, 0), (7, 1)),
        ('BACKGROUND', (0, 0), (-1, 1), colors.HexColor("#F1F5F9")),

        ('SPAN', (1, 2), (-1, 2)),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#E2E8F0")),
    ]

    current_row = 3
    mod_index = 1
    total_score_sum = 0.0
    total_modules_count = 0
    modules_to_retake = 0
    min_pass = getattr(academic_config, 'min_passing_grade', 10.0) or 10.0

    for idx, ue in enumerate(units_with_grades, 1):
        ue_code = ue.get("code") or f"UE{idx}"
        ue_name = ue.get("name") or "Unité d'Enseignement"
        ue_credits = ue.get("credits", 6)
        courses = ue.get("courses", [])

        table_data.append([
            Paragraph(f"<b>{ue_code}</b>", ParagraphStyle('UEC', fontName='Helvetica-Bold', fontSize=6.8, leading=8.5, alignment=TA_CENTER)),
            Paragraph(f"<b>{ue_name}. (Crédits : {ue_credits})</b>", td_ue),
            "", "", "", "", "", ""
        ])
        table_styles.append(('BACKGROUND', (0, current_row), (-1, current_row), colors.HexColor("#F8FAFC")))
        table_styles.append(('SPAN', (1, current_row), (-1, current_row)))
        current_row += 1

        for c in courses:
            score = float(c.get("score") or 0.0)
            cc_s = f"{c.get('cc_score'):.1f}".replace('.', ',') if c.get('cc_score') is not None else "-"
            ex_s = f"{c.get('exam_score'):.1f}".replace('.', ',') if c.get('exam_score') is not None else "-"
            avg_s = f"{score:.2f}".replace('.', ',')
            pct_s = f"{(score / 20.0) * 100:.1f}%".replace('.', ',')
            letter_s, mention_s = get_lmd_grade_details(score)

            if score < min_pass:
                modules_to_retake += 1

            total_score_sum += score
            total_modules_count += 1

            table_data.append([
                Paragraph(str(mod_index), td_c),
                Paragraph(c.get("title", f"Module {mod_index}"), td_mod),
                Paragraph(cc_s, td_c),
                Paragraph(ex_s, td_c),
                Paragraph(avg_s, td_cb),
                Paragraph(pct_s, td_c),
                Paragraph(letter_s, td_cb),
                Paragraph(mention_s, td_c)
            ])
            mod_index += 1
            current_row += 1

    # Ligne TOTAL
    max_pts = total_modules_count * 20
    tot_str = f"{total_score_sum:.2f}".replace('.', ',') + f" / {max_pts}"
    table_data.append([
        Paragraph("<b>TOTAL</b>", td_cb),
        Paragraph(f"<b>{total_modules_count} Modules</b>", td_c),
        Paragraph(f"<b>{tot_str}</b>", td_cb),
        "", "", "", "", ""
    ])
    table_styles.append(('SPAN', (2, current_row), (4, current_row)))
    table_styles.append(('BACKGROUND', (0, current_row), (-1, current_row), colors.HexColor("#F1F5F9")))
    current_row += 1

    # Ligne MOYENNE GÉNÉRALE
    gen_avg_s = f"{general_average:.2f}".replace('.', ',')
    gen_pct_s = f"{(general_average / 20.0) * 100:.2f}%".replace('.', ',')
    gen_let, gen_men = get_lmd_grade_details(general_average)

    table_data.append([
        Paragraph(f"<b>Moyenne Générale ({sem_label})</b>", td_cb),
        "", "", "",
        Paragraph(f"<b>{gen_avg_s}</b>", ParagraphStyle('MG', fontName='Helvetica-Bold', fontSize=8.0, alignment=TA_CENTER, textColor=colors.HexColor("#DC2626"))),
        Paragraph(f"<b>{gen_pct_s}</b>", td_cb),
        Paragraph(f"<b>{gen_let}</b>", td_cb),
        Paragraph(f"<b>{gen_men}</b>", td_cb)
    ])
    table_styles.append(('SPAN', (0, current_row), (3, current_row)))
    table_styles.append(('BACKGROUND', (0, current_row), (-1, current_row), colors.HexColor("#FFF7ED")))

    t_main = Table(table_data, colWidths=col_w)
    t_main.setStyle(TableStyle(table_styles))
    elements.append(t_main)
    elements.append(Spacer(1, 3.0 * mm))

    # ========================================================
    # 5. VISA & DÉCISION (GAUCHE) & SIGNATURE / SCEAU (DROITE) (TOTAL = 17.8 cm)
    # ========================================================
    visa_th = ParagraphStyle('VTH', fontName='Helvetica-Bold', fontSize=8.0, leading=10.0, alignment=TA_CENTER)
    visa_tb = ParagraphStyle('VTB', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=TA_LEFT)
    visa_sub = ParagraphStyle('VSUB', fontName='Helvetica', fontSize=5.8, leading=7.2, alignment=TA_LEFT)

    is_validated = (modules_to_retake == 0 and general_average >= min_pass)
    sess_status = "Validée" if is_validated else "Non Validée"
    sess_color = "#059669" if is_validated else "#DC2626"

    visa_box_content = [
        [Paragraph("<b>VISA</b>", visa_th)],
        [Spacer(1, 1.2 * mm)],
        [Paragraph(f"<b>Session : <font color='{sess_color}'>{sess_status}</font></b>", ParagraphStyle('VVal', fontName='Helvetica-Bold', fontSize=7.8, leading=9.5))],
        [Spacer(1, 1.2 * mm)],
        [Paragraph("<b>Nombre de modules à rattraper</b>", visa_tb)],
        [Paragraph(f"................... <b>{modules_to_retake}</b> ...................", ParagraphStyle('V0', fontName='Helvetica-Bold', fontSize=7.8, alignment=TA_CENTER))]
    ]
    t_visa_box = Table(visa_box_content, colWidths=[8.0 * cm])
    t_visa_box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#334155")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.8),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))

    left_block = [
        t_visa_box,
        Spacer(1, 1.2 * mm),
        Paragraph("<b>E / I :</b> cours à reprendre. <b>J :</b> incomplet mais suffisant comme préalable. <b>/ :</b> incomplet et insuffisant.", visa_sub),
        Paragraph("La lettre D correspond au seuil de diplômation.", visa_sub),
        Paragraph("<b>NB :</b> <i>Il n'est délivré qu'un seul exemplaire du présent document.</i>", visa_sub)
    ]

    addr_str = getattr(university, 'address', '') or ""
    city_name = "Bamako"
    for c in ["Bamako", "Ségou", "Segou", "Sikasso", "Mopti", "Koulikoro", "Kayes", "Gao", "Abidjan", "Dakar", "Niamey", "Ouagadougou", "Conakry", "Paris"]:
        if c.lower() in addr_str.lower():
            city_name = c
            break

    stamp_img = get_dynamic_university_stamp_image(university, rector_title)

    sign_data = [
        [Paragraph(f"Fait à {city_name}, le {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('DT', fontName='Helvetica-Bold', fontSize=7.8, leading=9.5, alignment=TA_CENTER))],
        [stamp_img],
        [Paragraph(f"<b>{rector_title}</b>", ParagraphStyle('DG', fontName='Helvetica-Bold', fontSize=8.0, leading=9.5, alignment=TA_CENTER))],
        [Paragraph(f"<b>{rector_name}</b>", ParagraphStyle('DGN', fontName='Helvetica-Bold', fontSize=8.0, leading=9.5, alignment=TA_CENTER))]
    ]
    t_right_sign = Table(sign_data, colWidths=[9.0 * cm])
    t_right_sign.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.0),
    ]))

    footer_actions = [
        [left_block, t_right_sign]
    ]
    t_foot_act = Table(footer_actions, colWidths=[8.4 * cm, 9.4 * cm])
    t_foot_act.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(t_foot_act)
    elements.append(Spacer(1, 3.5 * mm))

    # ========================================================
    # 6. PIED DE PAGE LÉGAL DYNAMIQUE (TOTAL = 17.8 cm)
    # ========================================================
    f_text_style = ParagraphStyle('FOT', fontName='Helvetica-Bold', fontSize=6.2, leading=7.8, alignment=TA_CENTER, textColor=colors.HexColor("#1E293B"))
    f_email_style = ParagraphStyle('FOE', fontName='Helvetica-Bold', fontSize=6.5, leading=8.0, alignment=TA_CENTER, textColor=colors.HexColor("#1E40AF"))

    rccm_val = card_cfg.get('rccm') or ""
    nif_val = card_cfg.get('nif') or ""
    rccm_info = f" • RCCM : {rccm_val}" if rccm_val else ""
    nif_info = f" • NIF : {nif_val}" if nif_val else ""
    legal_line1 = f"{univ_name}{rccm_info}{nif_info} — Établissement d'Enseignement Supérieur"

    addr_info = getattr(university, 'address', None) or "Campus Universitaire"
    phone_val = getattr(university, 'phone', None)
    phone_info = f" • Tél : {phone_val}" if phone_val else ""
    legal_line2 = f"{addr_info}{phone_info}"

    email_info = getattr(university, 'email', None) or "contact@unisphere.ai"
    web_val = getattr(university, 'website', None)
    web_info = f" • {web_val}" if web_val else ""
    legal_line3 = f"{email_info}{web_info}"

    foot_table_data = [
        [""],
        [Paragraph(f"<b>{legal_line1}</b>", f_text_style)],
        [Paragraph(f"<b>{legal_line2}</b>", f_text_style)],
        [Paragraph(legal_line3, f_email_style)],
        [""]
    ]
    t_legal_foot = Table(foot_table_data, colWidths=[17.8 * cm])
    t_legal_foot.setStyle(TableStyle([
        ('LINEABOVE', (0, 1), (-1, 1), 1.2, colors.HexColor("#881337")),
        ('LINEBELOW', (0, 3), (-1, 3), 1.2, colors.HexColor("#881337")),
        ('TOPPADDING', (0, 0), (-1, -1), 1.0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(t_legal_foot)

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# Alias direct
generate_ecob_transcript_pdf = generate_lmd_transcript_pdf


# ==========================================
# 💰 4. QUITUS FINANCIER & REÇU DE PAIEMENT
# ==========================================
def generate_financial_clearance_pdf(
    student: Any,
    university: Any,
    payments: List[Any],
    academic_year: str = "2025-2026",
    receipt_reference: Optional[str] = None
) -> bytes:
    """
    Génère un Quitus Financier Officiel & Attestation de Solde de Scolarité
    attestant que l'étudiant est 100% en règle avec l'administration financière.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'FinTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        alignment=TA_CENTER,
        textColor=NAVY
    )

    body_style = ParagraphStyle(
        'FinBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=18,
        alignment=TA_JUSTIFY,
        textColor=colors.black
    )

    ref_num = receipt_reference or f"QUITUS-FIN/{datetime.now().year}/{student.id:04d}"
    univ_name = (university.name if university and university.name else "UNIVERSITÉ UNISPHERE").upper()

    elements = []

    # En-tête
    header_data = [
        [
            Paragraph(f"<b>{univ_name}</b><br/><font size=8 color='#475569'>Direction Administrative & Financière (DAF)<br/>Service de la Comptabilité et du Recouvrement</font>", ParagraphStyle('FHead1', fontSize=10, leading=13)),
            Paragraph(f"<b>N° QUITUS :</b><br/><font color='#059669'><b>{ref_num}</b></font><br/><br/><b>DATE :</b> {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('FHead2', fontSize=9, alignment=TA_RIGHT, leading=12))
        ]
    ]
    t_head = Table(header_data, colWidths=[11.0 * cm, 6.0 * cm])
    t_head.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(t_head)
    elements.append(Spacer(1, 0.5 * cm))

    # Titre Quitus
    title_box = [
        [Paragraph("<b>QUITUS FINANCIER & CERTIFICAT DE SOLDE</b><br/><font size=9 color='#059669'>ATTESTATION OFFICIELLE DE RÈGLEMENT DE SCOLARITÉ</font>", title_style)]
    ]
    t_title = Table(title_box, colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ECFDF5")),
        ('BOX', (0, 0), (-1, -1), 1.5, EMERALD),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.7 * cm))

    full_name = f"{student.first_name} {student.last_name.upper()}"
    mat_str = student.matricule or f"UN-{student.id:04d}"
    filiere_str = student.filiere or "Tronc commun"
    level_str = student.level or "L1"

    elements.append(Paragraph(
        "Le Directeur Administratif et Financier de l'Université atteste par la présente que l'étudiant(e) ci-après désigné(e) :",
        body_style
    ))
    elements.append(Spacer(1, 0.4 * cm))

    # Cartouche étudiant
    cartouche_data = [
        [Paragraph("<b>Nom & Prénoms :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style)],
        [Paragraph("<b>Matricule :</b>", body_style), Paragraph(f"<b>{mat_str}</b>", body_style)],
        [Paragraph("<b>Filière & Niveau :</b>", body_style), Paragraph(f"{filiere_str} — {level_str}", body_style)],
        [Paragraph("<b>Année Académique :</b>", body_style), Paragraph(f"<b>{academic_year}</b>", body_style)],
        [Paragraph("<b>Situation Comptable :</b>", body_style), Paragraph("<font color='#059669'><b>INTÉGRALEMENT SOLDÉ (SOLDE = 0 FCFA)</b></font>", body_style)],
    ]
    t_cartouche = Table(cartouche_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_cartouche.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_cartouche)
    elements.append(Spacer(1, 0.5 * cm))

    # Historique récapitulatif des versements
    total_paid = 0.0
    pay_rows = [
        [
            Paragraph("<b>Référence Reçu</b>", ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER, textColor=colors.white)),
            Paragraph("<b>Date Versement</b>", ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER, textColor=colors.white)),
            Paragraph("<b>Mode de Règlement</b>", ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER, textColor=colors.white)),
            Paragraph("<b>Objet / Tranche</b>", ParagraphStyle('H4', fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER, textColor=colors.white)),
            Paragraph("<b>Montant (FCFA)</b>", ParagraphStyle('H5', fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER, textColor=colors.white))
        ]
    ]

    for p in payments:
        p_ref = getattr(p, 'reference', None) or f"PAY-{getattr(p, 'id', 1)}"
        p_date = getattr(p, 'created_at', None)
        p_date_str = p_date.strftime('%d/%m/%Y') if hasattr(p_date, 'strftime') else datetime.now().strftime('%d/%m/%Y')
        p_method = (getattr(p, 'method', None) or getattr(p, 'payment_method', None) or "Virement").upper()
        p_type = getattr(p, 'payment_type', None) or "Frais de scolarité"
        amount = float(getattr(p, 'amount', 0.0) or 0.0)
        total_paid += amount

        pay_rows.append([
            Paragraph(p_ref, ParagraphStyle('CR1', fontSize=8, alignment=TA_CENTER)),
            Paragraph(p_date_str, ParagraphStyle('CR2', fontSize=8, alignment=TA_CENTER)),
            Paragraph(p_method, ParagraphStyle('CR3', fontSize=8, alignment=TA_CENTER)),
            Paragraph(p_type, ParagraphStyle('CR4', fontSize=8, alignment=TA_LEFT)),
            Paragraph(f"<b>{amount:,.0f}</b>".replace(',', ' '), ParagraphStyle('CR5', fontName='Helvetica-Bold', fontSize=8, alignment=TA_RIGHT))
        ])

    pay_rows.append([
        "", "", "",
        Paragraph("<b>TOTAL DES PAIEMENTS :</b>", ParagraphStyle('TotLbl', fontName='Helvetica-Bold', fontSize=9, alignment=TA_RIGHT)),
        Paragraph(f"<b>{total_paid:,.0f} FCFA</b>".replace(',', ' '), ParagraphStyle('TotVal', fontName='Helvetica-Bold', fontSize=9, alignment=TA_RIGHT, textColor=EMERALD))
    ])

    t_payments = Table(pay_rows, colWidths=[3.5 * cm, 2.5 * cm, 3.0 * cm, 5.0 * cm, 3.0 * cm])
    t_payments.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(t_payments)
    elements.append(Spacer(1, 0.5 * cm))

    elements.append(Paragraph(
        "L'intéressé(e) est en règle de la totalité de ses obligations financières envers l'établissement pour "
        f"l'année académique <b>{academic_year}</b>. Il/Elle est dûment autorisé(e) à passer l'ensemble de ses examens "
        "et à solliciter la délivrance de ses attestations et diplômes.<br/><br/>"
        "<i>En foi de quoi, ce quitus lui est délivré pour servir et valoir ce que de droit.</i>",
        body_style
    ))
    elements.append(Spacer(1, 0.7 * cm))

    # Signatures & QR Code
    qr_verify = f"UNISPHERE-QUITUS:{mat_str}:{ref_num}:{total_paid:.0f}FCFA"
    qr_img = make_qr_code_image(qr_verify, size=2.4 * cm)

    sign_data = [
        [
            qr_img,
            Paragraph(f"Fait à Bamako, le {datetime.now().strftime('%d %B %Y')}<br/><b>Le Directeur Administratif et Financier (DAF)</b><br/><br/><br/><b>M. Ousmane KONE</b><br/><font size=7 color='#64748B'>Cachet de la Comptabilité Générale</font>", ParagraphStyle('SignFin', alignment=TA_CENTER, fontSize=9, leading=13))
        ]
    ]
    t_signatures = Table(sign_data, colWidths=[6.0 * cm, 11.0 * cm])
    t_signatures.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    elements.append(KeepTogether(t_signatures))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="QUITUS FINANCIER")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()
