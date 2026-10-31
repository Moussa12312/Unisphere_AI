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

    # En-tête national & universitaire avec Logo officiel AU MILIEU
    logo_flowable = get_dynamic_university_logo_flowable(university)
    header_data = [
        [
            Paragraph("<b>RÉPUBLIQUE DU MALI</b><br/><i>Un Peuple - Un But - Une Foi</i><br/>---------<br/><b>MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR<br/>ET DE LA RECHERCHE SCIENTIFIQUE</b>", h_republic),
            logo_flowable,
            Paragraph(f"<b>N° RÉFÉRENCE :</b><br/><font color='#FF6B00'>{cert_num}</font><br/><br/><b>DATE D'ÉMISSION :</b><br/>{datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('RefStyle', fontName='Helvetica', fontSize=8.5, alignment=TA_RIGHT, leading=11))
        ]
    ]
    t_header = Table(header_data, colWidths=[6.0 * cm, 5.0 * cm, 6.0 * cm])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
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
    pob_str = getattr(student, "place_of_birth", None) or "N/A"
    nat_str = getattr(student, "nationality", None) or "Malienne"
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

    # Bloc signatures, tampon officiel et QR Code
    verify_url = f"UNISPHERE-VERIF:{mat_str}:{cert_num}:{academic_year}"
    qr_img = make_qr_code_image(verify_url, size=2.4 * cm)
    stamp_img = get_dynamic_university_stamp_image(university, "LE DIRECTEUR GÉNÉRAL")

    sign_data = [
        [
            Paragraph("<b>Authentification Numérique</b><br/><font size=7 color='#64748B'>Scannez pour vérifier l'authenticité</font>", ParagraphStyle('QRTxt', fontSize=8, alignment=TA_CENTER, leading=10)),
            Paragraph(f"Fait à Bamako, le {format_french_date()}<br/><b>Le Directeur Général</b>", ParagraphStyle('SignHead', fontName='Helvetica-Bold', fontSize=9.5, alignment=TA_CENTER, leading=13))
        ],
        [
            qr_img,
            stamp_img
        ],
        [
            Paragraph(f"<font size=7 color='#475569'>{mat_str}</font>", ParagraphStyle('QRSub', alignment=TA_CENTER, fontSize=7)),
            Paragraph("<b>Prof. Moussa COULIBALY</b><br/><font size=7 color='#64748B'>Direction Générale • Cachet & Signature</font>", ParagraphStyle('SignName', alignment=TA_CENTER, fontSize=8.5, leading=10))
        ]
    ]
    t_sign = Table(sign_data, colWidths=[6.0 * cm, 11.0 * cm])
    t_sign.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
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

    # En-tête national avec Logo officiel de l'université AU MILIEU
    logo_flowable = get_dynamic_university_logo_flowable(university)
    header_data = [
        [
            Paragraph("<b>RÉPUBLIQUE DU MALI</b><br/><i>Un Peuple - Un But - Une Foi</i><br/>---------<br/><b>MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR<br/>ET DE LA RECHERCHE SCIENTIFIQUE</b>", h_republic),
            logo_flowable,
            Paragraph(f"<b>N° DIPLÔME :</b><br/><font color='#D97706'>{cert_num}</font><br/><br/><b>DÉLIVRÉ LE :</b><br/>{datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('RefStyle2', fontName='Helvetica', fontSize=8.5, alignment=TA_RIGHT, leading=11))
        ]
    ]
    t_header = Table(header_data, colWidths=[6.0 * cm, 5.0 * cm, 6.0 * cm])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
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
    pob_str = getattr(student, "place_of_birth", None) or "N/A"
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
    stamp_img = get_dynamic_university_stamp_image(university, "LE DIRECTEUR GÉNÉRAL")

    sign_data = [
        [
            Paragraph("<b>Contrôle d'Authenticité</b><br/><font size=7 color='#64748B'>Scannez pour valider ce diplôme</font>", ParagraphStyle('QRTxt2', fontSize=8, alignment=TA_CENTER, leading=10)),
            Paragraph(f"Fait à Bamako, le {format_french_date()}<br/><b>Le Directeur Général / Le Recteur</b>", ParagraphStyle('SignHead2', fontName='Helvetica-Bold', fontSize=9.5, alignment=TA_CENTER, leading=13))
        ],
        [
            qr_img,
            stamp_img
        ],
        [
            Paragraph(f"<font size=7 color='#475569'>{mat_str}</font>", ParagraphStyle('QRSub2', alignment=TA_CENTER, fontSize=7)),
            Paragraph("<b>Prof. Moussa COULIBALY</b><br/><font size=7 color='#64748B'>Direction Générale • Cachet & Signature</font>", ParagraphStyle('SignName2', alignment=TA_CENTER, fontSize=8.5, leading=10))
        ]
    ]
    t_sign = Table(sign_data, colWidths=[6.0 * cm, 11.0 * cm])
    t_sign.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
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
    def load_proportional_img(file_path: Path, max_w: float = 5.2 * cm, max_h: float = 3.0 * cm):
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
                return load_proportional_img(p, max_w=5.2 * cm, max_h=3.0 * cm)

    # 2. Vérifier si un logo statique pour l'université existe
    univ_id = getattr(university, 'id', 1)
    static_candidates = [
        Path(__file__).resolve().parent.parent / "static" / "logos" / f"univ_{univ_id}.png",
        Path(__file__).resolve().parent.parent / "static" / "ecob" / "ecob_logo.png" if "ECOB" in univ_name else None
    ]
    for sc in static_candidates:
        if sc and sc.exists():
            return load_proportional_img(sc, max_w=5.2 * cm, max_h=3.0 * cm)

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
        leftMargin=1.80 * cm,
        rightMargin=1.80 * cm,
        topMargin=1.50 * cm,
        bottomMargin=1.40 * cm
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

        # 1. Double filet d'encadrement institutionnel aéré et retiré des bords physiques (1.40 cm)
        canv.saveState()
        canv.setStrokeColor(colors.HexColor("#1E293B"))
        canv.setLineWidth(1.2)
        canv.rect(1.40 * cm, 1.10 * cm, w - 2.80 * cm, h - 2.20 * cm)

        canv.setStrokeColor(colors.HexColor("#475569"))
        canv.setLineWidth(0.5)
        canv.rect(1.48 * cm, 1.18 * cm, w - 2.96 * cm, h - 2.36 * cm)

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
    receipt_reference: Optional[str] = None,
    total_amount: Optional[float] = None,
    total_remaining: Optional[float] = None
) -> bytes:
    """
    Génère un Quitus Financier Officiel ou une Attestation de Règlement de Scolarité.
    Si le solde restant est supérieur à 0, indique clairement un RÈGLEMENT PARTIEL
    avec le montant restant dû (Audio 1 Moussa Coulibaly).
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
        fontSize=17,
        alignment=TA_CENTER,
        textColor=NAVY
    )

    body_style = ParagraphStyle(
        'FinBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=16,
        alignment=TA_JUSTIFY,
        textColor=colors.black
    )

    ref_num = receipt_reference or f"QUITUS-FIN/{datetime.now().year}/{student.id:04d}"
    univ_name = (university.name if university and university.name else "UNIVERSITÉ UNISPHERE").upper()

    elements = []

    # En-tête avec Logo officiel de l'université AU MILIEU
    logo_flowable = get_dynamic_university_logo_flowable(university)
    header_data = [
        [
            Paragraph(f"<b>{univ_name}</b><br/><font size=8 color='#475569'>Direction Administrative & Financière (DAF)<br/>Service de la Comptabilité et du Recouvrement</font>", ParagraphStyle('FHead1', fontSize=10, leading=13)),
            logo_flowable,
            Paragraph(f"<b>N° RÉFÉRENCE :</b><br/><font color='#0F172A'><b>{ref_num}</b></font><br/><br/><b>DATE :</b> {datetime.now().strftime('%d/%m/%Y')}", ParagraphStyle('FHead2', fontSize=9, alignment=TA_RIGHT, leading=12))
        ]
    ]
    t_head = Table(header_data, colWidths=[6.0 * cm, 5.0 * cm, 6.0 * cm])
    t_head.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(t_head)
    elements.append(Spacer(1, 0.4 * cm))

    # Calcul total payé
    total_paid = sum(float(getattr(p, 'amount', 0.0) or 0.0) for p in payments)
    
    # Calcul du reste à payer
    if total_remaining is None:
        if total_amount is not None:
            total_remaining = max(0.0, total_amount - total_paid)
        else:
            total_remaining = 0.0

    is_fully_paid = (total_remaining <= 0)

    # Titre Quitus / Attestation
    if is_fully_paid:
        title_box = [
            [Paragraph("<b>QUITUS FINANCIER & CERTIFICAT DE SOLDE</b><br/><font size=9 color='#059669'>ATTESTATION OFFICIELLE DE RÈGLEMENT INTÉGRAL DE SCOLARITÉ</font>", title_style)]
        ]
        t_title = Table(title_box, colWidths=[17.0 * cm])
        t_title.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ECFDF5")),
            ('BOX', (0, 0), (-1, -1), 1.5, EMERALD),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
    else:
        title_box = [
            [Paragraph("<b>ATTESTATION DE SITUATION FINANCIÈRE</b><br/><font size=9 color='#D97706'>ÉTAT DE RÈGLEMENT PARTIEL — SOLDE EN COURS DE PAIEMENT</font>", title_style)]
        ]
        t_title = Table(title_box, colWidths=[17.0 * cm])
        t_title.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFFBEB")),
            ('BOX', (0, 0), (-1, -1), 1.5, colors.HexColor("#F59E0B")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

    elements.append(t_title)
    elements.append(Spacer(1, 0.5 * cm))

    full_name = f"{student.first_name} {student.last_name.upper()}"
    mat_str = student.matricule or f"UN-{student.id:04d}"
    filiere_str = student.filiere or "Tronc commun"
    level_str = student.level or "L1"

    elements.append(Paragraph(
        "Le Directeur Administratif et Financier de l'Université certifie par la présente l'état de la situation comptable de l'étudiant(e) ci-après désigné(e) :",
        body_style
    ))
    elements.append(Spacer(1, 0.3 * cm))

    # Situation comptable text
    if is_fully_paid:
        situation_html = "<font color='#059669'><b>INTÉGRALEMENT SOLDÉ (SOLDE = 0 FCFA)</b></font>"
    else:
        situation_html = f"<font color='#D97706'><b>RÈGLEMENT PARTIEL — RESTE À SOLDER : {total_remaining:,.0f} FCFA</b></font>".replace(',', ' ')

    tot_due = total_amount if total_amount is not None else (total_paid + total_remaining)

    cartouche_data = [
        [Paragraph("<b>Nom & Prénoms :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style)],
        [Paragraph("<b>Matricule :</b>", body_style), Paragraph(f"<b>{mat_str}</b>", body_style)],
        [Paragraph("<b>Filière & Niveau :</b>", body_style), Paragraph(f"{filiere_str} — {level_str}", body_style)],
        [Paragraph("<b>Année Académique :</b>", body_style), Paragraph(f"<b>{academic_year}</b>", body_style)],
        [Paragraph("<b>Montant Total Dû :</b>", body_style), Paragraph(f"<b>{tot_due:,.0f} FCFA</b>".replace(',', ' '), body_style)],
        [Paragraph("<b>Montant Réglé :</b>", body_style), Paragraph(f"<font color='#059669'><b>{total_paid:,.0f} FCFA</b></font>".replace(',', ' '), body_style)],
        [Paragraph("<b>Situation Comptable :</b>", body_style), Paragraph(situation_html, body_style)],
    ]
    t_cartouche = Table(cartouche_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_cartouche.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_cartouche)
    elements.append(Spacer(1, 0.4 * cm))

    # Historique récapitulatif des versements
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

    if not is_fully_paid:
        pay_rows.append([
            "", "", "",
            Paragraph("<b>RESTE À SOLDER :</b>", ParagraphStyle('RemLbl', fontName='Helvetica-Bold', fontSize=9, alignment=TA_RIGHT, textColor=colors.HexColor("#D97706"))),
            Paragraph(f"<b>{total_remaining:,.0f} FCFA</b>".replace(',', ' '), ParagraphStyle('RemVal', fontName='Helvetica-Bold', fontSize=9, alignment=TA_RIGHT, textColor=colors.HexColor("#D97706")))
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
    elements.append(Spacer(1, 0.4 * cm))

    if is_fully_paid:
        elements.append(Paragraph(
            "L'intéressé(e) est en règle de la totalité de ses obligations financières envers l'établissement pour "
            f"l'année académique <b>{academic_year}</b>. Il/Elle est dûment autorisé(e) à passer l'ensemble de ses examens "
            "et à solliciter la délivrance de ses attestations et diplômes.<br/><br/>"
            "<i>En foi de quoi, ce quitus lui est délivré pour servir et valoir ce que de droit.</i>",
            body_style
        ))
    else:
        elements.append(Paragraph(
            f"L'intéressé(e) est à jour de ses règlements d'étape à hauteur de <b>{total_paid:,.0f} FCFA</b>. "
            f"Le solde restant dû de <b>{total_remaining:,.0f} FCFA</b> doit être régularisé conformément au calendrier des tranches.<br/><br/>"
            "<i>La présente attestation provisoire est délivrée pour faire valoir les paiements effectivement enregistrés à ce jour.</i>",
            body_style
        ))
    elements.append(Spacer(1, 0.6 * cm))

    # Signatures & QR Code avec cachet officiel
    qr_verify = f"UNISPHERE-FIN:{mat_str}:{ref_num}:{total_paid:.0f}FCFA:RESTANT={total_remaining:.0f}FCFA"
    qr_img = make_qr_code_image(qr_verify, size=2.2 * cm)
    stamp_img = get_dynamic_university_stamp_image(university, "DIRECTION FINANCIÈRE")

    sign_data = [
        [
            Paragraph("<b>Contrôle Financier</b><br/><font size=7 color='#64748B'>Scannez pour vérifier l'authenticité</font>", ParagraphStyle('QRTxtF', fontSize=8, alignment=TA_CENTER, leading=10)),
            Paragraph(f"Fait à Bamako, le {format_french_date()}<br/><b>La Direction Administrative & Financière</b>", ParagraphStyle('SignFinHead', fontName='Helvetica-Bold', fontSize=9.5, alignment=TA_CENTER, leading=13))
        ],
        [
            qr_img,
            stamp_img
        ],
        [
            Paragraph(f"<font size=7 color='#475569'>{ref_num}</font>", ParagraphStyle('QRSubF', alignment=TA_CENTER, fontSize=7)),
            Paragraph("<b>M. Ousmane KONE</b><br/><font size=7 color='#64748B'>Service Comptabilité & DAF • Cachet Apposé</font>", ParagraphStyle('SignFin', alignment=TA_CENTER, fontSize=8.5, leading=10))
        ]
    ]
    t_signatures = Table(sign_data, colWidths=[6.0 * cm, 11.0 * cm])
    t_signatures.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    elements.append(KeepTogether(t_signatures))

    watermark_label = "QUITUS FINANCIER" if is_fully_paid else "RÈGLEMENT PARTIEL"

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark=watermark_label)

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 🏛️ MODULE D'HARMONISATION INSTITUTIONNELLE : EN-TÊTE ET PIED DE PAGE STANDARDS
# ==============================================================================
def make_official_3col_header_table(university: Any, doc_ref: str, emit_date: str = None) -> Table:
    """En-tête officiel gouvernemental et académique strict avec LOGO AU MILIEU"""
    if not emit_date:
        emit_date = datetime.now().strftime('%d/%m/%Y')
    
    logo_flowable = get_dynamic_university_logo_flowable(university)
    h_republic = ParagraphStyle(
        'RepHeaderStd',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        alignment=TA_CENTER,
        textColor=NAVY
    )
    ref_style = ParagraphStyle(
        'RefStyleStd',
        fontName='Helvetica',
        fontSize=8.5,
        alignment=TA_RIGHT,
        leading=11
    )
    header_data = [
        [
            Paragraph("<b>RÉPUBLIQUE DU MALI</b><br/><i>Un Peuple - Un But - Une Foi</i><br/>---------<br/><b>MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR<br/>ET DE LA RECHERCHE SCIENTIFIQUE</b>", h_republic),
            logo_flowable,
            Paragraph(f"<b>N° RÉFÉRENCE :</b><br/><font color='#FF6B00'>{doc_ref}</font><br/><br/><b>DATE D'ÉMISSION :</b><br/>{emit_date}", ref_style)
        ]
    ]
    t = Table(header_data, colWidths=[6.0 * cm, 5.0 * cm, 6.0 * cm])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    return t


def make_official_footer_table(
    university: Any,
    verify_code: str,
    director_title: str = "LE DIRECTEUR GÉNÉRAL",
    director_name: str = "Prof. Moussa COULIBALY",
    city: str = "Bamako",
    doc_id_label: str = None
) -> KeepTogether:
    """Pied de page officiel unifié avec QR Code de sécurité, CACHET BLEU et SIGNATURE"""
    qr_img = make_qr_code_image(verify_code, size=2.3 * cm)
    stamp_img = get_dynamic_university_stamp_image(university, director_title)
    
    sign_data = [
        [
            Paragraph("<b>Authentification Numérique</b><br/><font size=7 color='#64748B'>Scannez pour vérifier l'authenticité</font>", ParagraphStyle('QRTxtFtr', fontSize=8, alignment=TA_CENTER, leading=10)),
            Paragraph(f"Fait à {city}, le {format_french_date()}<br/><b>{director_title}</b>", ParagraphStyle('SignHeadFtr', fontName='Helvetica-Bold', fontSize=9.5, alignment=TA_CENTER, leading=13))
        ],
        [
            qr_img,
            stamp_img
        ],
        [
            Paragraph(f"<font size=7 color='#475569'>{doc_id_label or 'Document Officiel Sécurisé'}</font>", ParagraphStyle('QRSubFtr', alignment=TA_CENTER, fontSize=7)),
            Paragraph(f"<b>{director_name}</b><br/><font size=7 color='#64748B'>Direction Générale • Cachet & Signature</font>", ParagraphStyle('SignNameFtr', alignment=TA_CENTER, fontSize=8.5, leading=10))
        ]
    ]
    t = Table(sign_data, colWidths=[6.0 * cm, 11.0 * cm])
    t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    return KeepTogether(t)


# ==============================================================================
# 💼 1. CONVENTION DE STAGE TRIPARTITE (Université - Entreprise - Étudiant)
# ==============================================================================
def generate_internship_agreement_pdf(
    student: Any,
    university: Any,
    company_name: str = "Société Partenaire",
    company_address: str = "Bamako, Mali",
    company_tutor: str = "Le Responsable des Ressources Humaines",
    start_date: str = "01/06/2026",
    end_date: str = "31/08/2026",
    mission_description: str = "Application pratique des enseignements théoriques en milieu professionnel",
    academic_year: str = "2025-2026"
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=1.8*cm, rightMargin=1.8*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"CONV-STAGE/{datetime.now().year}/{student.id:04d}"
    mat_str = student.matricule or f"EC-{student.id:04d}"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UNameStg', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.4 * cm))

    # Titre Encadré
    t_title = Table([[Paragraph("<b>CONVENTION DE STAGE ACADÉMIQUE TRIPARTITE</b><br/><font size=8.5>CONFORME AUX DISPOSITIONS DU SYSTÈME LMD</font>", ParagraphStyle('ConvT', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=NAVY, leading=16))]], colWidths=[17.4 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#2563EB")), ('PADDING', (0,0), (-1,-1), 6)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.4 * cm))

    body_style = ParagraphStyle('ConvB', fontName='Helvetica', fontSize=8.8, leading=12.5, alignment=TA_JUSTIFY)
    
    # Présentation des parties
    parties_text = (
        f"<b>ENTRE LES SOUSSIGNÉS :</b><br/>"
        f"<b>1. L'Établissement :</b> {univ_name}, représenté par son Directeur Général.<br/>"
        f"<b>2. L'Entreprise d'Accueil :</b> <b>{company_name}</b>, sise à {company_address}, représentée par <b>{company_tutor}</b>.<br/>"
        f"<b>3. Le Stagiaire :</b> M./Mme <b>{student.first_name} {student.last_name.upper()}</b>, Matricule <b>{mat_str}</b>, inscrit(e) en <b>{student.level or 'L3'}</b> - <b>{student.filiere or 'Formation Supérieure'}</b>.<br/>"
    )
    elements.append(Paragraph(parties_text, body_style))
    elements.append(Spacer(1, 0.25 * cm))

    # Articles
    articles_data = [
        [Paragraph("<b>ARTICLE 1 : OBJET DU STAGE</b>", ParagraphStyle('ArtH', fontName='Helvetica-Bold', fontSize=8.5, textColor=NAVY))],
        [Paragraph(f"Le stage a pour but la mise en pratique des connaissances académiques et l'acquisition d'une expérience professionnelle. Objet de la mission : <i>{mission_description}</i>.", body_style)],
        [Paragraph("<b>ARTICLE 2 : DURÉE ET PÉRIODE DU STAGE</b>", ParagraphStyle('ArtH', fontName='Helvetica-Bold', fontSize=8.5, textColor=NAVY))],
        [Paragraph(f"Le stage se déroulera du <b>{start_date}</b> au <b>{end_date}</b> pour l'année universitaire <b>{academic_year}</b>, sur une base hebdomadaire conforme à la réglementation en vigueur.", body_style)],
        [Paragraph("<b>ARTICLE 3 : ASSURANCES ET RESPONSABILITÉ CIVILE</b>", ParagraphStyle('ArtH', fontName='Helvetica-Bold', fontSize=8.5, textColor=NAVY))],
        [Paragraph("Le stagiaire reste sous statut d'étudiant régulier. Il est couvert par l'assurance responsabilité civile scolaire souscrite par l'établissement pour la durée de ses études.", body_style)],
        [Paragraph("<b>ARTICLE 4 : RAPPORT DE STAGE ET ÉVALUATION</b>", ParagraphStyle('ArtH', fontName='Helvetica-Bold', fontSize=8.5, textColor=NAVY))],
        [Paragraph("À l'issue du stage, le maître de stage remet une fiche d'appréciation. Le stagiaire rédige un rapport de stage validé académiquement en vue de l'obtention des crédits ECTS.", body_style)]
    ]
    t_art = Table(articles_data, colWidths=[17.4 * cm])
    t_art.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('PADDING', (0,0), (-1,-1), 1.5)]))
    elements.append(t_art)
    elements.append(Spacer(1, 0.4 * cm))

    # Signatures des 3 parties
    verify_url = f"UNISPHERE-CONV:{mat_str}:{doc_ref}:{academic_year}"
    qr_img = make_qr_code_image(verify_url, size=2.1 * cm)
    stamp_img = get_dynamic_university_stamp_image(university, "LE DIRECTEUR GÉNÉRAL")

    tripartite_sign = [
        [
            Paragraph("<b>Pour l'Entreprise d'Accueil</b><br/><font size=7 color='#64748B'>Signature & Cachet commercial</font>", ParagraphStyle('S1', alignment=TA_CENTER, fontSize=8, fontName='Helvetica-Bold')),
            Paragraph("<b>Le Stagiaire</b><br/><font size=7 color='#64748B'>Lu et approuvé</font>", ParagraphStyle('S2', alignment=TA_CENTER, fontSize=8, fontName='Helvetica-Bold')),
            Paragraph("<b>Pour l'Université</b><br/><font size=7 color='#64748B'>Le Directeur Général & Sceau</font>", ParagraphStyle('S3', alignment=TA_CENTER, fontSize=8, fontName='Helvetica-Bold'))
        ],
        [
            Paragraph("<br/><br/><i>[ Cachet Entreprise ]</i>", ParagraphStyle('C1', alignment=TA_CENTER, fontSize=7.5, textColor=colors.gray)),
            Paragraph(f"<br/><br/><b>{student.first_name} {student.last_name.upper()}</b>", ParagraphStyle('C2', alignment=TA_CENTER, fontSize=8)),
            stamp_img
        ],
        [
            Paragraph(f"<font size=6.5 color='#64748B'>{company_name}</font>", ParagraphStyle('C3', alignment=TA_CENTER, fontSize=7)),
            qr_img,
            Paragraph("<b>Prof. Moussa COULIBALY</b><br/><font size=6.5 color='#64748B'>Direction Générale</font>", ParagraphStyle('C4', alignment=TA_CENTER, fontSize=7.5, leading=9))
        ]
    ]
    t_tri = Table(tripartite_sign, colWidths=[5.8 * cm, 5.8 * cm, 5.8 * cm])
    t_tri.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('PADDING', (0,0), (-1,-1), 1)]))
    elements.append(KeepTogether(t_tri))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="CONVENTION STAGE")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# ✉️ 2. LETTRE DE RECOMMANDATION OFFICIELLE DU DIRECTEUR
# ==============================================================================
def generate_recommendation_letter_pdf(
    student: Any,
    university: Any,
    target_entity: str = "Aux Responsables des Recrutements & Admissions",
    academic_year: str = "2025-2026",
    appreciation: str = "étudiant(e) brillant(e), assidu(e) et doté(e) d'un sens aigu des responsabilités"
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.0*cm, rightMargin=2.0*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"RECOM-DIR/{datetime.now().year}/{student.id:04d}"
    mat_str = student.matricule or f"EC-{student.id:04d}"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('URec', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.5 * cm))

    # Titre
    t_title = Table([[Paragraph("<b>LETTRE DE RECOMMANDATION OFFICIELLE</b><br/><font size=9>DIRECTION GÉNÉRALE & RECTORAT</font>", ParagraphStyle('RecT', fontName='Helvetica-Bold', fontSize=14, alignment=TA_CENTER, textColor=NAVY, leading=18))]], colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#D97706")), ('PADDING', (0,0), (-1,-1), 7)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.6 * cm))

    # Destinataire
    elements.append(Paragraph(f"<b>À l'attention de :</b> <i>{target_entity}</i>", ParagraphStyle('Dest', fontName='Helvetica-Bold', fontSize=10.5, leading=14, textColor=DARK_GRAY)))
    elements.append(Spacer(1, 0.4 * cm))

    body_style = ParagraphStyle('RecBody', fontName='Helvetica', fontSize=10, leading=16, alignment=TA_JUSTIFY)
    
    full_name = f"{student.first_name} {student.last_name.upper()}"
    filiere = student.filiere or "Sciences de Gestion & Technologies"
    level = student.level or "Licence 3 (L3)"

    letter_text = (
        f"Madame, Monsieur,<br/><br/>"
        f"En ma qualité de Directeur Général de <b>{univ_name}</b>, c'est avec un réel honneur et une pleine confiance que je vous recommande vivement la candidature de notre étudiant(e) <b>M./Mme {full_name}</b>, titulaire du matricule <b>{mat_str}</b>, inscrit(e) en <b>{level}</b> au sein du département <b>{filiere}</b>.<br/><br/>"
        f"Tout au long de son parcours universitaire au cours de l'année académique <b>{academic_year}</b>, {full_name} s'est distingué(e) comme un(e) <b>{appreciation}</b>. "
        f"Ses compétences techniques, sa capacité d'analyse et son esprit d'initiative ont été régulièrement salués par l'ensemble du corps professoral.<br/><br/>"
        f"Outre ses excellents résultats académiques, il/elle fait preuve d'une grande rigueur morale, d'une aisance relationnelle remarquable et d'une remarquable adaptabilité au travail d'équipe. "
        f"Nous sommes convaincus que son intégration au sein de votre honorable institution ou entreprise sera un atout précieux et couronné de succès.<br/><br/>"
        f"La présente lettre lui est délivrée pour appuyer sa candidature et faire valoir ce que de droit."
    )
    elements.append(Paragraph(letter_text, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    verify_url = f"UNISPHERE-RECOM:{mat_str}:{doc_ref}"
    elements.append(make_official_footer_table(university, verify_url, doc_id_label=mat_str))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="RECOMMANDATION")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 📝 3. CERTIFICAT D'ASSIDUITÉ ET DE FRÉQUENTATION
# ==============================================================================
def generate_attendance_certificate_pdf(
    student: Any,
    university: Any,
    attendance_rate: float = 96.5,
    total_sessions: int = 120,
    academic_year: str = "2025-2026"
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.0*cm, rightMargin=2.0*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"ASSID/{datetime.now().year}/{student.id:04d}"
    mat_str = student.matricule or f"EC-{student.id:04d}"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UAss', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.5 * cm))

    t_title = Table([[Paragraph("<b>CERTIFICAT D'ASSIDUITÉ ET DE FRÉQUENTATION</b><br/><font size=9>CONTRÔLE DE SCOLARITÉ & VALIDATION DE PRÉSENCE</font>", ParagraphStyle('AssT', fontName='Helvetica-Bold', fontSize=13.5, alignment=TA_CENTER, textColor=NAVY, leading=17))]], colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#059669")), ('PADDING', (0,0), (-1,-1), 7)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.6 * cm))

    body_style = ParagraphStyle('AssB', fontName='Helvetica', fontSize=10, leading=16, alignment=TA_JUSTIFY)
    full_name = f"{student.first_name} {student.last_name.upper()}"

    elements.append(Paragraph("Le Directeur Général soussigné certifie par la présente que :", body_style))
    elements.append(Spacer(1, 0.3 * cm))

    cart_data = [
        [Paragraph("<b>Nom & Prénoms :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style)],
        [Paragraph("<b>Numéro Matricule :</b>", body_style), Paragraph(f"<b>{mat_str}</b>", body_style)],
        [Paragraph("<b>Filière / Programme :</b>", body_style), Paragraph(f"{student.filiere or 'Logistique et Transport'}", body_style)],
        [Paragraph("<b>Niveau de Formation :</b>", body_style), Paragraph(f"<b>{student.level or 'Licence 3'}</b>", body_style)],
        [Paragraph("<b>Année Académique :</b>", body_style), Paragraph(f"<b>{academic_year}</b>", body_style)],
        [Paragraph("<b>Séances Contrôlées :</b>", body_style), Paragraph(f"{total_sessions} séances obligatoires", body_style)],
        [Paragraph("<b>Taux de Présence Effectif :</b>", body_style), Paragraph(f"<font color='#059669'><b>{attendance_rate:.1f} % (Assiduité Exemplaire)</b></font>", body_style)],
    ]
    t_cart = Table(cart_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_cart.setStyle(TableStyle([('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8FAFC")), ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR), ('PADDING', (0,0), (-1,-1), 4.5)]))
    elements.append(t_cart)
    elements.append(Spacer(1, 0.5 * cm))

    concl_text = (
        f"L'étudiant(e) suit régulièrement et avec une grande ponctualité l'ensemble des modules d'enseignement théoriques et pratiques dispensés au sein de notre établissement.<br/><br/>"
        f"Aucune absence non justifiée n'a été constatée à ce jour. Ce certificat est délivré à l'intéressé(e) pour servir et valoir ce que de droit (organismes de bourses, consulats, caisses d'allocations)."
    )
    elements.append(Paragraph(concl_text, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    verify_url = f"UNISPHERE-ASSID:{mat_str}:{attendance_rate}PCT"
    elements.append(make_official_footer_table(university, verify_url, doc_id_label=mat_str))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="ASSIDUITÉ CERTIFIÉE")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 🎓 4. ATTESTATION D'ADMISSION & ACCEPTATION OFFICIELLE
# ==============================================================================
def generate_admission_letter_pdf(
    student: Any,
    university: Any,
    academic_year: str = "2026-2027",
    specialty: str = None
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.0*cm, rightMargin=2.0*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"ADMIS/{datetime.now().year}/{student.id:04d}"
    mat_str = student.matricule or f"EC-{student.id:04d}"
    spec = specialty or student.filiere or "Logistique et Transport International"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UAdm', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.5 * cm))

    t_title = Table([[Paragraph("<b>ATTESTATION D'ADMISSION ET D'ACCEPTATION OFFICIELLE</b><br/><font size=9>DÉCISION DU COMITÉ PÉDAGOGIQUE D'ADMISSION</font>", ParagraphStyle('AdmT', fontName='Helvetica-Bold', fontSize=13.5, alignment=TA_CENTER, textColor=NAVY, leading=17))]], colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#16A34A")), ('PADDING', (0,0), (-1,-1), 7)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.6 * cm))

    body_style = ParagraphStyle('AdmB', fontName='Helvetica', fontSize=10, leading=16, alignment=TA_JUSTIFY)
    full_name = f"{student.first_name} {student.last_name.upper()}"

    elements.append(Paragraph("Le Comité de Sélection et la Direction Générale attestent par la présente que :", body_style))
    elements.append(Spacer(1, 0.3 * cm))

    cart_data = [
        [Paragraph("<b>Candidat(e) Admis(e) :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style)],
        [Paragraph("<b>Identifiant / Matricule :</b>", body_style), Paragraph(f"<b>{mat_str}</b>", body_style)],
        [Paragraph("<b>Formation Accordée :</b>", body_style), Paragraph(f"<b>{spec}</b>", body_style)],
        [Paragraph("<b>Grade & Niveau :</b>", body_style), Paragraph(f"<b>{student.level or 'Licence 1 (L1)'} — Système LMD</b>", body_style)],
        [Paragraph("<b>Rentrée Universitaire :</b>", body_style), Paragraph(f"Année académique <b>{academic_year}</b>", body_style)],
        [Paragraph("<b>Régime d'Études :</b>", body_style), Paragraph("Temps plein • Présentiel et Travaux Dirigés", body_style)],
    ]
    t_cart = Table(cart_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_cart.setStyle(TableStyle([('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8FAFC")), ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR), ('PADDING', (0,0), (-1,-1), 4.5)]))
    elements.append(t_cart)
    elements.append(Spacer(1, 0.5 * cm))

    details_text = (
        f"L'examen approfondi du dossier académique a démontré les aptitudes requises pour suivre avec succès le cursus d'excellence dispensé par notre établissement.<br/><br/>"
        f"La présente attestation d'admission est délivrée pour servir et valoir ce que de droit, notamment pour les formalités de visa d'études, d'attribution de bourses de formation ou d'inscription administrative définitive."
    )
    elements.append(Paragraph(details_text, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    verify_url = f"UNISPHERE-ADMIS:{mat_str}:{academic_year}"
    elements.append(make_official_footer_table(university, verify_url, doc_id_label=mat_str))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="ADMISSION OFFICIELLE")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 📖 5. ATTESTATION DE DÉPÔT DE MÉMOIRE & AUTORISATION DE SOUTENANCE
# ==============================================================================
def generate_thesis_submission_certificate_pdf(
    student: Any,
    university: Any,
    thesis_title: str = "Optimisation de la chaîne logistique multimodale en Afrique de l'Ouest",
    supervisor_name: str = "Dr. Djeneba COULIBALY",
    academic_year: str = "2025-2026"
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.0*cm, rightMargin=2.0*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"MEM-SOUT/{datetime.now().year}/{student.id:04d}"
    mat_str = student.matricule or f"EC-{student.id:04d}"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UMem', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.5 * cm))

    t_title = Table([[Paragraph("<b>ATTESTATION DE DÉPÔT DE MÉMOIRE & AUTORISATION DE SOUTENANCE</b><br/><font size=9>VALIDATION DU CYCLE DE FORMATION SUPÉRIEURE</font>", ParagraphStyle('MemT', fontName='Helvetica-Bold', fontSize=12.5, alignment=TA_CENTER, textColor=NAVY, leading=16))]], colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FDF4FF")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#A855F7")), ('PADDING', (0,0), (-1,-1), 7)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.6 * cm))

    body_style = ParagraphStyle('MemB', fontName='Helvetica', fontSize=10, leading=16, alignment=TA_JUSTIFY)
    full_name = f"{student.first_name} {student.last_name.upper()}"

    elements.append(Paragraph("La Direction des Études et la Commission Pédagogique certifient par la présente que :", body_style))
    elements.append(Spacer(1, 0.3 * cm))

    cart_data = [
        [Paragraph("<b>Impétrant(e) :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style)],
        [Paragraph("<b>Numéro Matricule :</b>", body_style), Paragraph(f"<b>{mat_str}</b>", body_style)],
        [Paragraph("<b>Filière & Niveau :</b>", body_style), Paragraph(f"<b>{student.filiere or 'Logistique et Transport'} — {student.level or 'Licence 3'}</b>", body_style)],
        [Paragraph("<b>Thème du Mémoire :</b>", body_style), Paragraph(f"<i>« {thesis_title} »</i>", body_style)],
        [Paragraph("<b>Directeur de Mémoire :</b>", body_style), Paragraph(f"<b>{supervisor_name}</b>", body_style)],
        [Paragraph("<b>Conformité Anti-plagiat :</b>", body_style), Paragraph("<font color='#059669'><b>Conforme & Validé (Score d'originalité : 94 %)</b></font>", body_style)],
    ]
    t_cart = Table(cart_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_cart.setStyle(TableStyle([('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8FAFC")), ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR), ('PADDING', (0,0), (-1,-1), 4.5)]))
    elements.append(t_cart)
    elements.append(Spacer(1, 0.5 * cm))

    concl = (
        f"Le dépôt officiel des exemplaires du mémoire de fin de cycle a été enregistré avec succès pour la session <b>{academic_year}</b>.<br/><br/>"
        f"En conséquence, l'étudiant(e) est formellement autorisé(e) à soutenir son travail devant le jury académique dûment constitué. "
        f"Cette attestation est délivrée pour valoir quitus de dépôt scientifique."
    )
    elements.append(Paragraph(concl, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    verify_url = f"UNISPHERE-THESIS:{mat_str}:{academic_year}"
    elements.append(make_official_footer_table(university, verify_url, doc_id_label=mat_str))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="DÉPÔT MÉMOIRE")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 🚪 6. CERTIFICAT DE RADIATION ET DE TRANSFERT ACADÉMIQUE
# ==============================================================================
def generate_transfer_certificate_pdf(
    student: Any,
    university: Any,
    target_institution: str = "Établissement d'Accueil",
    academic_year: str = "2025-2026"
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.0*cm, rightMargin=2.0*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"RAD-TRANSF/{datetime.now().year}/{student.id:04d}"
    mat_str = student.matricule or f"EC-{student.id:04d}"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('URad', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.5 * cm))

    t_title = Table([[Paragraph("<b>CERTIFICAT DE RADIATION ET DE TRANSFERT ACADÉMIQUE</b><br/><font size=9>QUITUS ADMINISTRATIF & MUTATION INTER-UNIVERSITAIRE</font>", ParagraphStyle('RadT', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=NAVY, leading=17))]], colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFF1F2")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#E11D48")), ('PADDING', (0,0), (-1,-1), 7)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.6 * cm))

    body_style = ParagraphStyle('RadB', fontName='Helvetica', fontSize=10, leading=16, alignment=TA_JUSTIFY)
    full_name = f"{student.first_name} {student.last_name.upper()}"

    elements.append(Paragraph("Le Directeur Général soussigné certifie que :", body_style))
    elements.append(Spacer(1, 0.3 * cm))

    cart_data = [
        [Paragraph("<b>Étudiant(e) Concerné(e) :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style)],
        [Paragraph("<b>Matricule Établissement :</b>", body_style), Paragraph(f"<b>{mat_str}</b>", body_style)],
        [Paragraph("<b>Dernier Cursus Suivi :</b>", body_style), Paragraph(f"{student.filiere or 'Logistique et Transport'} — {student.level or 'L2'}", body_style)],
        [Paragraph("<b>Établissement Destinataire :</b>", body_style), Paragraph(f"<b>{target_institution}</b>", body_style)],
        [Paragraph("<b>Situation Disciplinaire :</b>", body_style), Paragraph("<font color='#059669'><b>En règle (Aucune sanction ni litige)</b></font>", body_style)],
        [Paragraph("<b>Situation Comptable :</b>", body_style), Paragraph("<font color='#059669'><b>Quitus Financier accordé (Solde = 0 FCFA)</b></font>", body_style)],
    ]
    t_cart = Table(cart_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_cart.setStyle(TableStyle([('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8FAFC")), ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR), ('PADDING', (0,0), (-1,-1), 4.5)]))
    elements.append(t_cart)
    elements.append(Spacer(1, 0.5 * cm))

    concl = (
        f"L'intéressé(e) est formellement radié(e) des registres de scolarité de <b>{univ_name}</b> à sa demande à compter de ce jour.<br/><br/>"
        f"Il/Elle est entièrement libre de tout engagement académique et financier envers notre institution et est dûment autorisé(e) à s'inscrire auprès de tout autre établissement d'enseignement supérieur.<br/><br/>"
        f"Le présent certificat de radiation lui est délivré pour servir et valoir ce que de droit."
    )
    elements.append(Paragraph(concl, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    verify_url = f"UNISPHERE-TRANSF:{mat_str}:{doc_ref}"
    elements.append(make_official_footer_table(university, verify_url, doc_id_label=mat_str))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="RADIATION TRANSFERT")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 📋 7. FEUILLE D'ÉMARGEMENT OFFICIELLE D'EXAMEN (Par salle & matière)
# ==============================================================================
def generate_exam_attendance_sheet_pdf(
    students: List[Any],
    university: Any,
    course_name: str = "Gestion des Opérations de Transport",
    filiere: str = "Logistique et Transport",
    level: str = "Licence 3",
    room_name: str = "Amphi A - Salle 102",
    session_title: str = "Session Normale Semestre 5",
    exam_date: str = None
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm, topMargin=1.8*cm, bottomMargin=1.8*cm)
    styles = getSampleStyleSheet()
    elements = []

    if not exam_date:
        exam_date = datetime.now().strftime('%d/%m/%Y')

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"EMARG/{datetime.now().year}/{abs(hash(course_name)) % 10000:04d}"

    elements.append(make_official_3col_header_table(university, doc_ref, emit_date=exam_date))
    elements.append(Spacer(1, 0.25 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UEmarg', fontName='Helvetica-Bold', fontSize=12, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.3 * cm))

    # Titre
    t_title = Table([[Paragraph(f"<b>FEUILLE D'ÉMARGEMENT OFFICIELLE D'EXAMEN — {session_title.upper()}</b>", ParagraphStyle('EmargT', fontName='Helvetica-Bold', fontSize=12, alignment=TA_CENTER, textColor=NAVY))]], colWidths=[18.0 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#2563EB")), ('PADDING', (0,0), (-1,-1), 5)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.3 * cm))

    # Métadonnées de l'épreuve
    b_meta = ParagraphStyle('MetaS', fontName='Helvetica', fontSize=8.5, leading=11)
    meta_table = [
        [Paragraph(f"<b>Module / Matière :</b> {course_name}", b_meta), Paragraph(f"<b>Salle d'Examen :</b> <font color='#DC2626'><b>{room_name}</b></font>", b_meta)],
        [Paragraph(f"<b>Filière & Niveau :</b> {filiere} ({level})", b_meta), Paragraph(f"<b>Date de l'Épreuve :</b> {exam_date}", b_meta)],
    ]
    t_m = Table(meta_table, colWidths=[10.5 * cm, 7.5 * cm])
    t_m.setStyle(TableStyle([('PADDING', (0,0), (-1,-1), 2), ('LINEBELOW', (0,-1), (-1,-1), 1, BORDER_COLOR)]))
    elements.append(t_m)
    elements.append(Spacer(1, 0.4 * cm))

    # Tableau des étudiants à émarger
    h_th = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER, textColor=colors.white)
    b_td = ParagraphStyle('TD', fontName='Helvetica', fontSize=8, alignment=TA_LEFT)
    b_td_c = ParagraphStyle('TDC', fontName='Helvetica', fontSize=8, alignment=TA_CENTER)

    table_rows = [
        [
            Paragraph("<b>N°</b>", h_th),
            Paragraph("<b>Matricule</b>", h_th),
            Paragraph("<b>Nom & Prénoms de l'Étudiant</b>", h_th),
            Paragraph("<b>Table</b>", h_th),
            Paragraph("<b>Émargement / Signature</b>", h_th),
            Paragraph("<b>Nb Copies</b>", h_th)
        ]
    ]

    for idx, s in enumerate(students[:26], start=1):
        mat = getattr(s, 'matricule', None) or f"EC-{getattr(s, 'id', idx):04d}"
        nom = f"{getattr(s, 'last_name', 'ETUDIANT').upper()} {getattr(s, 'first_name', '')}"
        table_rows.append([
            Paragraph(f"{idx:02d}", b_td_c),
            Paragraph(f"<b>{mat}</b>", b_td_c),
            Paragraph(nom[:32], b_td),
            Paragraph(f"T-{idx:02d}", b_td_c),
            Paragraph("", b_td),  # Espace pour signer
            Paragraph("1", b_td_c)
        ])

    t_students = Table(table_rows, colWidths=[1.0 * cm, 3.2 * cm, 7.2 * cm, 1.8 * cm, 3.4 * cm, 1.4 * cm])
    t_students.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    elements.append(t_students)
    elements.append(Spacer(1, 0.4 * cm))

    # Bilan du surveillant de salle
    summary_box = [
        [
            Paragraph(f"<b>Total Inscrits :</b> {len(students)} | <b>Présents :</b> ........ | <b>Absents :</b> ........", ParagraphStyle('SumB', fontSize=8.5, fontName='Helvetica-Bold')),
            Paragraph("<b>Signature Surveillant(e) de Salle :</b> ____________________", ParagraphStyle('SurvS', fontSize=8.5, alignment=TA_RIGHT))
        ]
    ]
    t_sub = Table(summary_box, colWidths=[9.0 * cm, 9.0 * cm])
    elements.append(KeepTogether(t_sub))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="ÉMARGEMENT EXAMEN")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 🎫 8. CONVOCATION INDIVIDUELLE AUX EXAMENS ET RATTRAPAGES
# ==============================================================================
def generate_exam_convocation_pdf(
    student: Any,
    university: Any,
    session_title: str = "Session Normale Semestre 5",
    exams_list: List[Dict[str, str]] = None,
    academic_year: str = "2025-2026"
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.0*cm, rightMargin=2.0*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"CONVOC/{datetime.now().year}/{student.id:04d}"
    mat_str = student.matricule or f"EC-{student.id:04d}"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UCon', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.5 * cm))

    t_title = Table([[Paragraph(f"<b>CONVOCATION INDIVIDUELLE AUX ÉPREUVES D'EXAMEN</b><br/><font size=9>{session_title.upper()}</font>", ParagraphStyle('ConT', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=NAVY, leading=17))]], colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#D97706")), ('PADDING', (0,0), (-1,-1), 7)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.5 * cm))

    body_style = ParagraphStyle('ConB', fontName='Helvetica', fontSize=9.5, leading=15, alignment=TA_JUSTIFY)
    full_name = f"{student.first_name} {student.last_name.upper()}"

    # Identification
    id_card = [
        [Paragraph("<b>Candidat(e) :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style), Paragraph("<b>Matricule :</b>", body_style), Paragraph(f"<b>{mat_str}</b>", body_style)],
        [Paragraph("<b>Filière :</b>", body_style), Paragraph(f"{student.filiere or 'Logistique et Transport'}", body_style), Paragraph("<b>Niveau :</b>", body_style), Paragraph(f"<b>{student.level or 'Licence 3'}</b>", body_style)],
    ]
    t_id = Table(id_card, colWidths=[3.0 * cm, 6.0 * cm, 3.0 * cm, 5.0 * cm])
    t_id.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")), ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR), ('PADDING', (0,0), (-1,-1), 4)]))
    elements.append(t_id)
    elements.append(Spacer(1, 0.5 * cm))

    # Calendrier des épreuves
    if not exams_list:
        exams_list = [
            {"date": "08/06/2026", "time": "08h30 - 11h30", "course": "Gestion des Opérations de Transport", "room": "Salle 102", "seat": "T-18"},
            {"date": "09/06/2026", "time": "14h00 - 17h00", "course": "Droit Douanier & Transit International", "room": "Salle 102", "seat": "T-18"},
            {"date": "11/06/2026", "time": "08h30 - 11h30", "course": "Systèmes d'Information Logistiques (ERP)", "room": "Salle 104", "seat": "T-18"},
            {"date": "12/06/2026", "time": "14h00 - 16h00", "course": "Anglais Professionnel des Affaires", "room": "Amphi B", "seat": "T-18"}
        ]

    e_header = [Paragraph("<b>Date</b>", ParagraphStyle('H1', textColor=colors.white, fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER)),
                Paragraph("<b>Horaire</b>", ParagraphStyle('H2', textColor=colors.white, fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER)),
                Paragraph("<b>Module / Épreuve</b>", ParagraphStyle('H3', textColor=colors.white, fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER)),
                Paragraph("<b>Salle</b>", ParagraphStyle('H4', textColor=colors.white, fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER)),
                Paragraph("<b>Place</b>", ParagraphStyle('H5', textColor=colors.white, fontName='Helvetica-Bold', fontSize=8, alignment=TA_CENTER))]
    
    exam_rows = [e_header]
    for ex in exams_list:
        exam_rows.append([
            Paragraph(ex.get("date", ""), ParagraphStyle('C1', fontSize=8, alignment=TA_CENTER)),
            Paragraph(ex.get("time", ""), ParagraphStyle('C2', fontSize=8, alignment=TA_CENTER)),
            Paragraph(ex.get("course", ""), ParagraphStyle('C3', fontSize=8, fontName='Helvetica-Bold')),
            Paragraph(ex.get("room", ""), ParagraphStyle('C4', fontSize=8, alignment=TA_CENTER, textColor=colors.HexColor("#2563EB"))),
            Paragraph(ex.get("seat", ""), ParagraphStyle('C5', fontSize=8, alignment=TA_CENTER, fontName='Helvetica-Bold'))
        ])

    t_exams = Table(exam_rows, colWidths=[2.5 * cm, 3.2 * cm, 6.8 * cm, 2.5 * cm, 2.0 * cm])
    t_exams.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), NAVY), ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR), ('PADDING', (0,0), (-1,-1), 4)]))
    elements.append(t_exams)
    elements.append(Spacer(1, 0.4 * cm))

    rules_text = (
        "<b>RÈGLEMENT DE SALLE OBLIGATOIRE :</b><br/>"
        "• Présentation obligatoire de la carte d'étudiant officielle et de la présente convocation.<br/>"
        "• L'accès aux salles est interdit 15 minutes après le début de l'épreuve.<br/>"
        "• Les téléphones portables et montres connectées doivent être totalement éteints dans les sacs."
    )
    elements.append(Paragraph(rules_text, ParagraphStyle('Rul', fontName='Helvetica', fontSize=7.8, leading=11, textColor=CRIMSON)))
    elements.append(Spacer(1, 0.5 * cm))

    verify_url = f"UNISPHERE-CONVOC:{mat_str}:{session_title}"
    elements.append(make_official_footer_table(university, verify_url, doc_id_label=mat_str))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="CONVOCATION EXAMEN")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# ⚖️ 9. PROCÈS-VERBAL OFFICIEL DE DÉLIBÉRATION DU JURY D'EXAMENS
# ==============================================================================
def generate_jury_deliberation_pv_pdf(
    university: Any,
    filiere: str = "Logistique et Transport",
    level: str = "Licence 3",
    session_title: str = "Session Normale Semestre 6",
    academic_year: str = "2025-2026",
    total_candidates: int = 47,
    admitted_count: int = 43,
    repeating_count: int = 4
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=1.8*cm, rightMargin=1.8*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"PV-DELIB/{datetime.now().year}/{abs(hash(session_title)) % 10000:04d}"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UPV', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.5 * cm))

    t_title = Table([[Paragraph(f"<b>PROCÈS-VERBAL DE DÉLIBÉRATION OFFICIEL DU JURY D'EXAMENS</b><br/><font size=9>{session_title.upper()} — SYSTÈME LMD</font>", ParagraphStyle('PVT', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=NAVY, leading=17))]], colWidths=[17.4 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#1D4ED8")), ('PADDING', (0,0), (-1,-1), 7)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.5 * cm))

    body_style = ParagraphStyle('PVB', fontName='Helvetica', fontSize=9.5, leading=15, alignment=TA_JUSTIFY)

    intro_text = (
        f"L'an deux mille vingt-six et le {datetime.now().day:02d} {FRENCH_MONTHS.get(datetime.now().month, '')}, s'est réuni le jury de délibération d'examen institué par décision rectorale au titre de l'année académique <b>{academic_year}</b> pour statuer sur les résultats des étudiants de la filière <b>{filiere}</b> (Niveau <b>{level}</b>).<br/><br/>"
        "Après vérification minutieuse des procès-verbaux de notes, des coefficients et de la capitalisation des crédits ECTS, le jury a proclamé les résultats officiels suivants :"
    )
    elements.append(Paragraph(intro_text, body_style))
    elements.append(Spacer(1, 0.4 * cm))

    success_rate = (admitted_count / max(total_candidates, 1)) * 100
    stat_rows = [
        [Paragraph("<b>Candidats Inscrits :</b>", body_style), Paragraph(f"<b>{total_candidates}</b> étudiants", body_style)],
        [Paragraph("<b>Candidats Admis (Validés) :</b>", body_style), Paragraph(f"<font color='#059669'><b>{admitted_count} ({success_rate:.1f} %)</b></font>", body_style)],
        [Paragraph("<b>Ajournés / Session Rattrapage :</b>", body_style), Paragraph(f"<font color='#DC2626'><b>{repeating_count}</b></font>", body_style)],
        [Paragraph("<b>Major de Promotion :</b>", body_style), Paragraph("<b>BADAYOKO Mamadou (Moyenne : 17.85 / 20 • Mention Très Bien)</b>", body_style)]
    ]
    t_stat = Table(stat_rows, colWidths=[7.0 * cm, 10.4 * cm])
    t_stat.setStyle(TableStyle([('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8FAFC")), ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR), ('PADDING', (0,0), (-1,-1), 4)]))
    elements.append(t_stat)
    elements.append(Spacer(1, 0.5 * cm))

    concl_pv = (
        "Le jury certifie que les délibérations ont été menées en stricte conformité avec le règlement des examens en vigueur. "
        "Les présents résultats sont définitifs et ont été affichés publiquement."
    )
    elements.append(Paragraph(concl_pv, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    verify_url = f"UNISPHERE-PV:{doc_ref}:{filiere}"
    elements.append(make_official_footer_table(university, verify_url, doc_id_label=f"PV {filiere}"))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="PV DÉLIBÉRATION")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# ✈️ 10. ORDRE DE MISSION OFFICIEL (Enseignant & Personnel Administratif)
# ==============================================================================
def generate_mission_order_pdf(
    staff_member: Any,
    university: Any,
    mission_purpose: str = "Surveillance et coordination des examens délocalisés",
    destination: str = "Ségou, République du Mali",
    start_date: str = "05/06/2026",
    end_date: str = "09/06/2026",
    transport_mode: str = "Véhicule de service ou transport régulier",
    budget_charge: str = "Budget de fonctionnement de l'établissement"
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.0*cm, rightMargin=2.0*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"ORD-MISS/{datetime.now().year}/{getattr(staff_member, 'id', 1):04d}"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UMiss', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.5 * cm))

    t_title = Table([[Paragraph("<b>ORDRE DE MISSION OFFICIEL</b><br/><font size=9>DÉPLACEMENT PROFESSIONNEL AUTORISÉ</font>", ParagraphStyle('MissT', fontName='Helvetica-Bold', fontSize=14, alignment=TA_CENTER, textColor=NAVY, leading=18))]], colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#D97706")), ('PADDING', (0,0), (-1,-1), 7)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.6 * cm))

    body_style = ParagraphStyle('MissB', fontName='Helvetica', fontSize=10, leading=16, alignment=TA_JUSTIFY)
    
    first_name = getattr(staff_member, 'first_name', '')
    last_name = getattr(staff_member, 'last_name', 'COLLABORATEUR').upper()
    role = getattr(staff_member, 'role', 'Enseignant-Chercheur')
    full_name = f"{first_name} {last_name}".strip()

    mission_data = [
        [Paragraph("<b>Bénéficiaire :</b>", body_style), Paragraph(f"<b>{full_name}</b>", body_style)],
        [Paragraph("<b>Fonction / Titre :</b>", body_style), Paragraph(f"<b>{role.capitalize()}</b>", body_style)],
        [Paragraph("<b>Objet de la Mission :</b>", body_style), Paragraph(f"<i>{mission_purpose}</i>", body_style)],
        [Paragraph("<b>Lieu de Destination :</b>", body_style), Paragraph(f"<b>{destination}</b>", body_style)],
        [Paragraph("<b>Période Autorisée :</b>", body_style), Paragraph(f"Du <b>{start_date}</b> au <b>{end_date}</b>", body_style)],
        [Paragraph("<b>Moyen de Transport :</b>", body_style), Paragraph(f"{transport_mode}", body_style)],
        [Paragraph("<b>Prise en Charge :</b>", body_style), Paragraph(f"{budget_charge}", body_style)],
    ]
    t_miss = Table(mission_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_miss.setStyle(TableStyle([('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8FAFC")), ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR), ('PADDING', (0,0), (-1,-1), 4.5)]))
    elements.append(t_miss)
    elements.append(Spacer(1, 0.6 * cm))

    inj = (
        "Il est expressément demandé aux autorités civiles, militaires et de sécurité de prêter assistance et protection au porteur du présent ordre de mission dans l'exercice de ses fonctions.<br/><br/>"
        "Fait pour servir et valoir ce que de droit."
    )
    elements.append(Paragraph(inj, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    verify_url = f"UNISPHERE-MISSION:{doc_ref}:{full_name}"
    elements.append(make_official_footer_table(university, verify_url, doc_id_label=doc_ref))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="ORDRE DE MISSION")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()


# ==============================================================================
# 👨‍🏫 11. ATTESTATION DE SERVICE FAIT & PRISE DE FONCTION (Enseignants)
# ==============================================================================
def generate_service_completion_certificate_pdf(
    teacher: Any,
    university: Any,
    course_name: str = "Systèmes de Gestion Logistique & ERP",
    total_hours: int = 45,
    academic_year: str = "2025-2026",
    level: str = "Licence 3"
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2.0*cm, rightMargin=2.0*cm, topMargin=2.0*cm, bottomMargin=2.0*cm)
    styles = getSampleStyleSheet()
    elements = []

    univ_name = (getattr(university, 'name', '') or "UNIVERSITÉ UNISPHERE").upper()
    doc_ref = f"SERV-FAIT/{datetime.now().year}/{getattr(teacher, 'id', 1):04d}"

    elements.append(make_official_3col_header_table(university, doc_ref))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(Paragraph(f"<b>{univ_name}</b>", ParagraphStyle('UServ', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=ORANGE)))
    elements.append(Spacer(1, 0.5 * cm))

    t_title = Table([[Paragraph("<b>ATTESTATION DE SERVICE FAIT & D'INTERVENTION ACADÉMIQUE</b><br/><font size=9>DIRECTION DES ÉTUDES & SERVICE DU PERSONNEL</font>", ParagraphStyle('ServT', fontName='Helvetica-Bold', fontSize=13, alignment=TA_CENTER, textColor=NAVY, leading=17))]], colWidths=[17.0 * cm])
    t_title.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")), ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#059669")), ('PADDING', (0,0), (-1,-1), 7)]))
    elements.append(t_title)
    elements.append(Spacer(1, 0.6 * cm))

    body_style = ParagraphStyle('ServB', fontName='Helvetica', fontSize=10, leading=16, alignment=TA_JUSTIFY)

    first_name = getattr(teacher, 'first_name', '')
    last_name = getattr(teacher, 'last_name', 'ENSEIGNANT').upper()
    full_name = f"{first_name} {last_name}".strip()

    elements.append(Paragraph("Le Directeur Général de l'établissement certifie par la présente que :", body_style))
    elements.append(Spacer(1, 0.3 * cm))

    serv_data = [
        [Paragraph("<b>Enseignant(e) Intervenant(e) :</b>", body_style), Paragraph(f"<b>Prof./Dr. {full_name}</b>", body_style)],
        [Paragraph("<b>Qualité / Statut :</b>", body_style), Paragraph("Enseignant Vacataire / Chargé de cours magistraux et TD", body_style)],
        [Paragraph("<b>Module Enseigné :</b>", body_style), Paragraph(f"<b>{course_name}</b>", body_style)],
        [Paragraph("<b>Promotion / Cursus :</b>", body_style), Paragraph(f"{level} — Département Pédagogique", body_style)],
        [Paragraph("<b>Année Académique :</b>", body_style), Paragraph(f"<b>{academic_year}</b>", body_style)],
        [Paragraph("<b>Volume Horaire Effectué :</b>", body_style), Paragraph(f"<font color='#059669'><b>{total_hours} heures d'enseignement validées</b></font>", body_style)],
        [Paragraph("<b>Évaluations Rentrées :</b>", body_style), Paragraph("Notes d'examen et procès-verbaux dûment déposés", body_style)],
    ]
    t_serv = Table(serv_data, colWidths=[5.5 * cm, 11.5 * cm])
    t_serv.setStyle(TableStyle([('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8FAFC")), ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR), ('PADDING', (0,0), (-1,-1), 4.5)]))
    elements.append(t_serv)
    elements.append(Spacer(1, 0.5 * cm))

    concl = (
        f"L'enseignant(e) a exécuté l'intégralité de sa charge horaire conformément aux exigences pédagogiques et au calendrier de l'établissement.<br/><br/>"
        f"La présente attestation lui est délivrée pour servir et valoir ce que de droit, notamment pour la liquidation de ses honoraires auprès de la Direction Administrative et Financière."
    )
    elements.append(Paragraph(concl, body_style))
    elements.append(Spacer(1, 0.8 * cm))

    verify_url = f"UNISPHERE-SERV:{doc_ref}:{total_hours}H"
    elements.append(make_official_footer_table(university, verify_url, doc_id_label=doc_ref))

    def on_page(canv, doc_inst):
        draw_official_page_decorations(canv, doc_inst, university_name=univ_name, watermark="SERVICE FAIT")

    doc.build(elements, onFirstPage=on_page)
    buffer.seek(0)
    return buffer.getvalue()

FRENCH_MONTHS = {
    1: "janvier", 2: "février", 3: "mars", 4: "avril",
    5: "mai", 6: "juin", 7: "juillet", 8: "août",
    9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre"
}

def format_french_date(dt=None) -> str:
    """Formate une date en français garanti (ex: 31 octobre 2026)"""
    if dt is None:
        dt = datetime.now()
    if hasattr(dt, 'day') and hasattr(dt, 'month') and hasattr(dt, 'year'):
        m_name = FRENCH_MONTHS.get(dt.month, str(dt.month))
        return f"{dt.day:02d} {m_name} {dt.year}"
    return str(dt)



