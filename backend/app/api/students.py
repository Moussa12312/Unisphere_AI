from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Request, BackgroundTasks
import logging
import base64
import threading

logger = logging.getLogger(__name__)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from pathlib import Path
from datetime import datetime, date, time
import re
import os
import time as time_module  # ✅ Alias pour éviter le conflit avec datetime.time
import shutil
import secrets
import qrcode
import io
import csv
from io import BytesIO, StringIO
from typing import Optional, Any, List, Dict
from pydantic import BaseModel

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

from app.database.connection import SessionLocal
from app.models.student import Student
from app.models.academic_fee import AcademicFee
from app.models.document import Document
from app.models.filiere import Filiere
from app.models.course import Course
from app.models.user import User
from app.models.university import University
from app.models.teacher import Teacher
from app.models.schedule import Schedule
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.material import Material
from app.models.payment import Payment
from app.models.exam_session import ExamSession
from app.models.notification import Notification
from app.core.dependencies import get_current_user, require_role
from app.core.security import hash_password, verify_password
from app.core.config import BACKEND_URL
from app.services.image_compressor import compress_and_save_upload, compress_image_data
from app.utils.email_validator import validate_email_exists, validate_email_format
from app.utils.academic_year import get_current_academic_year
from app.utils.email_service import send_credentials_email, send_password_reset_email

router = APIRouter(prefix="/students", tags=["Students"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def parse_date_safely(date_val: Optional[Any]) -> Optional[date]:
    """Parse en toute sécurité une date (str, datetime, date) en objet datetime.date pour SQLite/PostgreSQL"""
    if not date_val:
        return None
    if isinstance(date_val, date) and not isinstance(date_val, datetime):
        return date_val
    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, str):
        clean_str = date_val.strip()
        if not clean_str or clean_str.lower() in ("none", "null", "undefined", ""):
            return None
        # Découpe d'éventuels suffixes horaires (ex: "2002-05-14T00:00:00.000Z")
        clean_str = clean_str.split("T")[0].split(" ")[0].strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%m/%d/%Y"):
            try:
                return datetime.strptime(clean_str, fmt).date()
            except ValueError:
                continue
    return None


def generate_matricule(db: Session, university_id: int, university_name: str) -> str:
    """Génère un matricule unique au format XX-YYYY-NNNN"""
    prefix = university_name[:2].upper() if len(university_name) >= 2 else university_name.upper()
    year = datetime.now().year

    pattern = re.compile(rf'^{re.escape(prefix)}-{year}-(\d+)$')

    existing_matricules = db.query(Student.matricule).filter(
        Student.university_id == university_id,
        Student.matricule.like(f'{prefix}-{year}-%')
    ).all()

    max_number = 0
    for (matricule,) in existing_matricules:
        if matricule:
            m = pattern.match(matricule)
            if m:
                max_number = max(max_number, int(m.group(1)))

    return f"{prefix}-{year}-{max_number + 1:04d}"


def cleanup_orphan_users(db: Session, university_id: int):
    """Supprime sans erreur les utilisateurs étudiants orphelins (sans Student associé)"""
    try:
        orphan_users = db.query(User).filter(
            User.role == "student",
            User.university_id == university_id,
            ~User.id.in_(db.query(Student.user_id).filter(Student.user_id.isnot(None)))
        ).all()
        for user in orphan_users:
            try:
                db.delete(user)
                db.commit()
            except Exception:
                db.rollback()
    except Exception:
        db.rollback()


# ==========================================
# ✅ CRUD ÉTUDIANTS (Admin/Secretary)
# ==========================================

@router.post("/")
async def create_student(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    filiere: str = Form(...),
    level: str = Form(...),
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
    student_type: Optional[str] = Form("new"),  # "new" (Nouveau) ou "returning" (Ancien / Réinscription)
    photo: Optional[UploadFile] = File(None),
    scanned_file_path: Optional[str] = Form(None),
    # Pièces pour Nouvel Étudiant (toutes strictement facultatives)
    birth_certificate: Optional[UploadFile] = File(None),
    bac_diploma: Optional[UploadFile] = File(None),
    bac_transcript: Optional[UploadFile] = File(None),
    id_document: Optional[UploadFile] = File(None),
    medical_certificate: Optional[UploadFile] = File(None),
    # Pièces pour Ancien Étudiant (toutes strictement facultatives)
    previous_transcript: Optional[UploadFile] = File(None),
    success_certificate: Optional[UploadFile] = File(None),
    financial_clearance: Optional[UploadFile] = File(None),
    reenrollment_form: Optional[UploadFile] = File(None),
    # Tarification particulière & Réduction négociée (optionnel)
    discount_amount: Optional[Any] = Form(0.0),
    discount_percentage: Optional[Any] = Form(0.0),
    discount_reason: Optional[str] = Form(None),
    discount_approved_by: Optional[str] = Form(None),
    net_tuition_amount: Optional[Any] = Form(None),
    # Modalité de paiement (tranches vs mensuel)
    payment_plan: Optional[str] = Form("tranches"),
    monthly_deposit: Optional[Any] = Form(None),
    monthly_installment: Optional[Any] = Form(None),
    monthly_months_count: Optional[Any] = Form(5),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Créer un nouvel étudiant avec son dossier d'inscription adapté (Nouveau vs Ancien)"""
    email = (email or "").strip().lower()
    cleanup_orphan_users(db, current_user.university_id)
    
    existing_user = db.query(User).filter(func.lower(User.email) == email).first()
    existing_st = db.query(Student).filter(func.lower(Student.email) == email).first()
    if existing_user or existing_st:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    is_valid, error_msg = validate_email_format(email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    new_user = None
    new_student = None
    
    try:
        temp_password = secrets.token_urlsafe(8)
        new_user = User(
            full_name=f"{first_name} {last_name}",
            email=email,
            hashed_password=hash_password(temp_password),
            role="student",
            university_id=current_user.university_id
        )
        db.add(new_user)
        db.flush()
        db.refresh(new_user)

        univ_name = current_user.university.name if (current_user.university and current_user.university.name) else "UN"
        auto_matricule = generate_matricule(db, current_user.university_id, univ_name)

        normalized_student_type = "returning" if student_type == "returning" else "new"
        # Calcul du net convenu si une remise est saisie
        computed_net = float(net_tuition_amount) if net_tuition_amount is not None else None
        if computed_net is None and (float(discount_amount or 0.0) > 0 or float(discount_percentage or 0.0) > 0):
            from app.utils.tuition import find_matching_academic_fee
            temp_stub = Student(level=level, domain=domain, filiere=filiere)
            matched_fee = find_matching_academic_fee(db, temp_stub, current_user.university_id, "scolarite")
            base_val = float(matched_fee.amount) if matched_fee else 0.0
            def _safe_f(v, default=0.0):
                try:
                    return float(str(v).strip()) if v is not None and str(v).strip() != "" else default
                except (ValueError, TypeError):
                    return default

            disc_amt = _safe_f(discount_amount, 0.0)
            disc_pct = _safe_f(discount_percentage, 0.0)
            if disc_amt > 0:
                computed_net = max(0.0, base_val - disc_amt)
            elif disc_pct > 0:
                computed_net = max(0.0, round(base_val * (1.0 - disc_pct / 100.0)))

        new_student = Student(
            first_name=first_name,
            last_name=last_name,
            email=email,
            filiere=filiere,
            level=level,
            domain=domain,
            student_type=normalized_student_type,
            date_of_birth=parse_date_safely(date_of_birth),
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
            status="active",
            file_status="incomplete",
            discount_amount=_safe_f(discount_amount, 0.0),
            discount_percentage=_safe_f(discount_percentage, 0.0),
            discount_reason=discount_reason,
            discount_approved_by=discount_approved_by,
            net_tuition_amount=computed_net,
            payment_plan=payment_plan or "tranches",
            monthly_deposit=float(str(monthly_deposit).strip()) if (monthly_deposit is not None and str(monthly_deposit).strip() != "") else None,
            monthly_installment=float(str(monthly_installment).strip()) if (monthly_installment is not None and str(monthly_installment).strip() != "") else None,
            monthly_months_count=int(str(monthly_months_count).strip()) if (monthly_months_count is not None and str(monthly_months_count).strip() != "") else 5
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

        # Photo de profil (lecture directe des octets — enregistrement robuste multi-dossiers)
        base_dir = Path(__file__).resolve().parent.parent.parent
        upload_dir = base_dir / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        (upload_dir / "photos").mkdir(parents=True, exist_ok=True)
        Path("uploads").mkdir(parents=True, exist_ok=True)
        Path("uploads/photos").mkdir(parents=True, exist_ok=True)

        if photo and photo.filename:
            content = await photo.read()
            if content:
                ext = Path(photo.filename).suffix.lower()
                if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                    ext = ".jpg"
                photo_filename = f"STUDENT_{new_student.id}_{int(time_module.time())}{ext}"
                photo_path = upload_dir / photo_filename
                saved_p = compress_and_save_upload(content, photo_path, max_dimension=1200, quality=82)
                
                # Duplication de sécurité dans uploads/photos et CWD/uploads
                try:
                    shutil.copy2(str(saved_p), str(upload_dir / "photos" / saved_p.name))
                except Exception:
                    pass
                try:
                    cwd_p = Path("uploads") / saved_p.name
                    if cwd_p.resolve() != saved_p.resolve():
                        shutil.copy2(str(saved_p), str(cwd_p))
                except Exception:
                    pass

                new_student.photo = saved_p.name
                new_user.photo = saved_p.name

        # Dossier de l'étudiant
        dossier_dir = upload_dir / "dossier_etudiant" / str(new_student.id)

        async def save_dossier_file(file_obj, prefix, doc_title):
            if file_obj and file_obj.filename:
                c = await file_obj.read()
                if c:
                    dossier_dir.mkdir(parents=True, exist_ok=True)
                    Path(f"uploads/dossier_etudiant/{new_student.id}").mkdir(parents=True, exist_ok=True)
                    ext = Path(file_obj.filename).suffix.lower() or ".pdf"
                    fname = f"{prefix}_{new_student.id}_{int(time_module.time())}{ext}"
                    target_path = dossier_dir / fname
                    saved_target = compress_and_save_upload(c, target_path, max_dimension=1600, quality=80)
                    
                    try:
                        cwd_p = Path(f"uploads/dossier_etudiant/{new_student.id}") / saved_target.name
                        if cwd_p.resolve() != saved_target.resolve():
                            shutil.copy2(str(saved_target), str(cwd_p))
                    except Exception:
                        pass

                    posix_path = f"uploads/dossier_etudiant/{new_student.id}/{saved_target.name}"
                    doc_record = Document(
                        document_type=prefix,
                        title=f"{doc_title} - {first_name} {last_name}",
                        file_path=posix_path,
                        student_id=new_student.id,
                        generated_by=current_user.id,
                        university_id=current_user.university_id
                    )
                    db.add(doc_record)
                    return posix_path
            return None

        # Gestion des documents scannés via OCR / Scanner
        if scanned_file_path:
            temp_file = Path(scanned_file_path)
            if temp_file.exists():
                dossier_dir.mkdir(parents=True, exist_ok=True)
                dest_path = dossier_dir / temp_file.name
                shutil.move(str(temp_file), str(dest_path))
                new_student.id_document = str(dest_path)

        # Enregistrement des pièces selon le type d'inscription
        if normalized_student_type == "new":
            if birth_certificate:
                new_student.birth_certificate = await save_dossier_file(birth_certificate, "birth_certificate", "Acte de naissance")
            if bac_diploma:
                new_student.bac_diploma = await save_dossier_file(bac_diploma, "bac_diploma", "Diplôme du Baccalauréat")
            if bac_transcript:
                new_student.bac_transcript = await save_dossier_file(bac_transcript, "bac_transcript", "Relevé de notes du Bac")
            if id_document:
                new_student.id_document = await save_dossier_file(id_document, "id_document", "Pièce d'identité (CNI / Passeport)")
            if medical_certificate:
                new_student.medical_certificate = await save_dossier_file(medical_certificate, "medical_certificate", "Certificat médical d'aptitude")

            # Statut du dossier
            required = [new_student.birth_certificate, new_student.bac_diploma, new_student.bac_transcript, new_student.id_document]
            new_student.file_status = "complete" if all(required) else "incomplete"
        else:
            # Ancien Étudiant (Réinscription)
            if previous_transcript:
                new_student.previous_transcript = await save_dossier_file(previous_transcript, "previous_transcript", "Relevé de notes N-1")
            if success_certificate:
                new_student.success_certificate = await save_dossier_file(success_certificate, "success_certificate", "Attestation de réussite / passage")
            if financial_clearance:
                new_student.financial_clearance = await save_dossier_file(financial_clearance, "financial_clearance", "Quitus financier / solde scolarité")
            if reenrollment_form:
                new_student.reenrollment_form = await save_dossier_file(reenrollment_form, "reenrollment_form", "Fiche de réinscription signée")
            if id_document:
                new_student.id_document = await save_dossier_file(id_document, "id_document", "Carte d'étudiant précédente")

            # Statut du dossier
            required = [new_student.previous_transcript, new_student.success_certificate, new_student.financial_clearance]
            new_student.file_status = "complete" if all(required) else "incomplete"

        db.commit()
        db.refresh(new_student)

        # Envoi asynchrone non-bloquant des identifiants par email
        threading.Thread(
            target=send_credentials_email,
            kwargs={
                "to_email": email,
                "full_name": f"{first_name} {last_name}",
                "password": temp_password,
                "role": "student",
                "university_name": univ_name,
            },
            daemon=True,
        ).start()

        return {
            "student": new_student,
            "temp_password": temp_password,
            "message": "Étudiant créé avec succès et dossier enregistré"
        }
        
    except IntegrityError as e:
        db.rollback()
        print(f"❌ Conflit d'unicité: {str(e)}")
        try:
            cleanup_orphan_users(db, current_user.university_id)
        except Exception:
            pass
        raise HTTPException(
            status_code=409,
            detail="Un conflit est survenu. Merci de réessayer."
        )
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur création étudiant: {str(e)}")
        try:
            cleanup_orphan_users(db, current_user.university_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")


# ==========================================
# 📦 CRÉATION & IMPORT EN MASSE (BULK / CSV / EXCEL)
# ==========================================

class StudentBulkCreateItem(BaseModel):
    first_name: str
    last_name: str
    email: str
    filiere: str
    level: str
    domain: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = "Malienne"
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    student_type: Optional[str] = "new"
    payment_plan: Optional[str] = "tranches"

class StudentBulkCreateRequest(BaseModel):
    students: List[StudentBulkCreateItem]


COLUMN_MAPPINGS = {
    "nom": "last_name",
    "nom de famille": "last_name",
    "last_name": "last_name",
    "lastname": "last_name",
    "prenom": "first_name",
    "prénom": "first_name",
    "prenoms": "first_name",
    "prénoms": "first_name",
    "first_name": "first_name",
    "firstname": "first_name",
    "email": "email",
    "e-mail": "email",
    "mail": "email",
    "courriel": "email",
    "filiere": "filiere",
    "filière": "filiere",
    "specialite": "filiere",
    "spécialité": "filiere",
    "programme": "filiere",
    "niveau": "level",
    "level": "level",
    "classe": "level",
    "domaine": "domain",
    "pôle": "domain",
    "pole": "domain",
    "telephone": "phone",
    "téléphone": "phone",
    "phone": "phone",
    "tel": "phone",
    "contact": "phone",
    "date de naissance": "date_of_birth",
    "date_naissance": "date_of_birth",
    "date_de_naissance": "date_of_birth",
    "date of birth": "date_of_birth",
    "date_of_birth": "date_of_birth",
    "dob": "date_of_birth",
    "lieu de naissance": "place_of_birth",
    "lieu_naissance": "place_of_birth",
    "lieu_de_naissance": "place_of_birth",
    "place_of_birth": "place_of_birth",
    "genre": "gender",
    "sexe": "gender",
    "gender": "gender",
    "sex": "gender",
    "nationalite": "nationality",
    "nationalité": "nationality",
    "nationality": "nationality",
    "pays": "nationality",
    "adresse": "address",
    "address": "address",
    "ville": "address",
    "nom parent": "parent_name",
    "nom_parent": "parent_name",
    "parent_name": "parent_name",
    "tuteur": "parent_name",
    "telephone parent": "parent_phone",
    "telephone_parent": "parent_phone",
    "téléphone parent": "parent_phone",
    "téléphone_parent": "parent_phone",
    "parent_phone": "parent_phone",
    "email parent": "parent_email",
    "email_parent": "parent_email",
    "parent_email": "parent_email",
    "type inscription": "student_type",
    "type_inscription": "student_type",
    "student_type": "student_type",
    "type": "student_type",
    "plan paiement": "payment_plan",
    "plan_paiement": "payment_plan",
    "payment_plan": "payment_plan",
    "modalite": "payment_plan",
    "modalité": "payment_plan"
}


def normalize_column_name(header: str) -> Optional[str]:
    if not header:
        return None
    cleaned = str(header).strip().lower()
    cleaned = re.sub(r'[\r\n\t]+', '', cleaned)
    return COLUMN_MAPPINGS.get(cleaned, cleaned)


def process_bulk_students(students_data: List[Dict[str, Any]], db: Session, current_user: User) -> Dict[str, Any]:
    """Exécute la création en masse d'étudiants avec attribution des comptes, matricules et QR codes"""
    univ_id = current_user.university_id
    univ_name = current_user.university.name if (current_user.university and current_user.university.name) else "UN"

    created = []
    errors = []

    # Cache des filières et leurs domaines pour résolution automatique
    filieres_db = db.query(Filiere).filter(Filiere.university_id == univ_id).all()
    filiere_domain_map = {f.name.lower(): f.domain for f in filieres_db if f.name and f.domain}

    for idx, item in enumerate(students_data):
        row_num = idx + 1
        fn = str(item.get("first_name") or "").strip()
        ln = str(item.get("last_name") or "").strip()
        em = str(item.get("email") or "").strip().lower()
        fil = str(item.get("filiere") or "").strip()
        lvl = str(item.get("level") or "").strip().upper()
        dom = str(item.get("domain") or "").strip()

        # Validation champs obligatoires
        if not fn or not ln:
            errors.append({"row": row_num, "name": f"{fn} {ln}".strip() or "Inconnu", "email": em, "error": "Nom et Prénom sont obligatoires"})
            continue

        if not em:
            errors.append({"row": row_num, "name": f"{fn} {ln}", "email": "", "error": "L'adresse email est obligatoire"})
            continue

        if "@" not in em or "." not in em:
            errors.append({"row": row_num, "name": f"{fn} {ln}", "email": em, "error": "Format d'adresse email invalide"})
            continue

        if not fil or not lvl:
            errors.append({"row": row_num, "name": f"{fn} {ln}", "email": em, "error": "Filière et Niveau sont obligatoires"})
            continue

        # Vérifier si l'email existe déjà (insensible à la casse sur User et Student)
        existing_user = db.query(User).filter(func.lower(User.email) == em).first()
        existing_st = db.query(Student).filter(func.lower(Student.email) == em).first()
        if existing_user or existing_st:
            errors.append({"row": row_num, "name": f"{fn} {ln}", "email": em, "error": "Cet email est déjà utilisé par un autre compte"})
            continue

        # Résoudre automatiquement le domaine si absent
        if not dom:
            dom = filiere_domain_map.get(fil.lower()) or None

        try:
            # 1. Compte utilisateur
            temp_password = secrets.token_urlsafe(8)
            new_user = User(
                full_name=f"{fn} {ln}",
                email=em,
                hashed_password=hash_password(temp_password),
                role="student",
                university_id=univ_id
            )
            db.add(new_user)
            db.flush()

            # 2. Matricule
            matricule = generate_matricule(db, univ_id, univ_name)

            # 3. Parsing date de naissance
            dob = parse_date_safely(item.get("date_of_birth"))

            # 4. Normalisation types
            st_type = str(item.get("student_type") or "new").lower()
            norm_student_type = "returning" if st_type in ("returning", "ancien", "reinscription", "réinscription") else "new"

            pay_plan = str(item.get("payment_plan") or "tranches").lower()
            norm_payment_plan = "mensuel" if pay_plan in ("mensuel", "monthly") else "tranches"

            gdr = str(item.get("gender") or "").strip().upper()
            norm_gender = "M" if gdr.startswith("M") or gdr == "H" else "F" if gdr.startswith("F") else (gdr or None)

            # 5. Création Étudiant
            student = Student(
                first_name=fn,
                last_name=ln,
                email=em,
                filiere=fil,
                level=lvl,
                domain=dom,
                student_type=norm_student_type,
                date_of_birth=dob,
                place_of_birth=str(item.get("place_of_birth") or "").strip() or None,
                gender=norm_gender,
                nationality=str(item.get("nationality") or "Malienne").strip(),
                phone=str(item.get("phone") or "").strip() or None,
                address=str(item.get("address") or "").strip() or None,
                parent_name=str(item.get("parent_name") or "").strip() or None,
                parent_phone=str(item.get("parent_phone") or "").strip() or None,
                parent_email=str(item.get("parent_email") or "").strip() or None,
                matricule=matricule,
                user_id=new_user.id,
                university_id=univ_id,
                university_name=univ_name,
                status="active",
                file_status="incomplete",
                payment_plan=norm_payment_plan
            )
            db.add(student)
            db.flush()

            # 6. QR Code
            os.makedirs("qr_codes", exist_ok=True)
            qr_filename = f"STUDENT_{student.id}.png"
            qr_path = os.path.join("qr_codes", qr_filename)
            qr = qrcode.make(matricule)
            qr.save(qr_path)
            student.qr_code = qr_filename

            db.commit()

            # 7. Notification email en arrière-plan pour ne jamais bloquer l'import massif
            threading.Thread(
                target=send_credentials_email,
                kwargs={
                    "to_email": em,
                    "full_name": f"{fn} {ln}",
                    "password": temp_password,
                    "role": "student",
                    "university_name": univ_name,
                },
                daemon=True,
            ).start()

            created.append({
                "id": student.id,
                "matricule": matricule,
                "first_name": fn,
                "last_name": ln,
                "email": em,
                "filiere": fil,
                "level": lvl,
                "domain": dom,
                "temp_password": temp_password
            })

        except Exception as e:
            db.rollback()
            try:
                cleanup_orphan_users(db, univ_id)
            except Exception:
                pass
            errors.append({"row": row_num, "name": f"{fn} {ln}", "email": em, "error": f"Erreur base de données: {str(e)}"})

    return {
        "success": len(errors) == 0,
        "total": len(students_data),
        "created_count": len(created),
        "errors_count": len(errors),
        "created": created,
        "errors": errors
    }


@router.get("/template/csv")
def download_csv_template(
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Télécharge le modèle officiel de fichier CSV pour l'import d'étudiants"""
    headers = [
        "Nom", "Prénom", "Email", "Filière", "Niveau", "Domaine", "Téléphone",
        "Date de naissance", "Lieu de naissance", "Genre", "Nationalité", "Adresse",
        "Nom Parent", "Téléphone Parent", "Email Parent", "Type Inscription", "Plan Paiement"
    ]
    sample1 = [
        "Traoré", "Moussa", "moussa.traore@unisphere.edu", "Génie Logiciel", "L1", "Informatique & Technologies",
        "+223 70 00 00 01", "2004-05-15", "Bamako", "M", "Malienne", "Hamdallaye ACI 2000",
        "Mariam Traoré", "+223 60 00 00 01", "mariam.traore@gmail.com", "Nouveau", "Tranches"
    ]
    sample2 = [
        "Coulibaly", "Fatoumata", "fatoumata.coulibaly@unisphere.edu", "Sciences Économiques & Gestion", "L1", "Gestion & Economie",
        "+223 70 00 00 02", "2003-09-20", "Ségou", "F", "Malienne", "Badalabougou",
        "Ousmane Coulibaly", "+223 60 00 00 02", "ousmane.c@gmail.com", "Nouveau", "Mensuel"
    ]

    output = io.StringIO()
    # Ajout du BOM UTF-8 pour ouverture directe sans problème d'accents dans Excel
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";")
    writer.writerow(headers)
    writer.writerow(sample1)
    writer.writerow(sample2)

    return Response(
        content=output.getvalue().encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=modele_import_etudiants.csv"}
    )


@router.get("/template/excel")
def download_excel_template(
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Télécharge le modèle officiel Excel (.xlsx) pour l'import d'étudiants"""
    global HAS_OPENPYXL
    if not HAS_OPENPYXL:
        try:
            import openpyxl
            from openpyxl.styles import Font, PatternFill, Alignment
            HAS_OPENPYXL = True
        except ImportError:
            pass

    if not HAS_OPENPYXL:
        # Fallback élégant en CSV compatible Excel si openpyxl n'est pas installé
        return download_csv_template(current_user=current_user)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Étudiants"

    headers = [
        "Nom", "Prénom", "Email", "Filière", "Niveau", "Domaine", "Téléphone",
        "Date de naissance", "Lieu de naissance", "Genre", "Nationalité", "Adresse",
        "Nom Parent", "Téléphone Parent", "Email Parent", "Type Inscription", "Plan Paiement"
    ]
    sample1 = [
        "Traoré", "Moussa", "moussa.traore@unisphere.edu", "Génie Logiciel", "L1", "Informatique & Technologies",
        "+223 70 00 00 01", "2004-05-15", "Bamako", "M", "Malienne", "Hamdallaye ACI 2000",
        "Mariam Traoré", "+223 60 00 00 01", "mariam.traore@gmail.com", "Nouveau", "Tranches"
    ]
    sample2 = [
        "Coulibaly", "Fatoumata", "fatoumata.coulibaly@unisphere.edu", "Sciences Économiques & Gestion", "L1", "Gestion & Economie",
        "+223 70 00 00 02", "2003-09-20", "Ségou", "F", "Malienne", "Badalabougou",
        "Ousmane Coulibaly", "+223 60 00 00 02", "ousmane.c@gmail.com", "Nouveau", "Mensuel"
    ]

    ws.append(headers)
    ws.append(sample1)
    ws.append(sample2)

    # Style en-têtes
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Ajustement largeurs colonnes
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=modele_import_etudiants.xlsx"}
    )


@router.post("/bulk-create")
def bulk_create_students(
    data: StudentBulkCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Création en masse d'étudiants depuis une liste structurée (grille de saisie rapide)"""
    if not data.students or len(data.students) == 0:
        raise HTTPException(status_code=400, detail="Aucun étudiant à créer fourni")
    if len(data.students) > 500:
        raise HTTPException(status_code=400, detail="Limite de 500 étudiants par lot dépassée")

    items = [s.model_dump() for s in data.students]
    return process_bulk_students(items, db, current_user)


@router.post("/import-file")
async def import_students_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Import et création en masse d'étudiants à partir d'un fichier Excel (.xlsx) ou CSV (.csv)"""
    filename = file.filename or ""
    ext = filename.lower().split(".")[-1]

    if ext not in ("csv", "xlsx", "xls", "txt"):
        raise HTTPException(status_code=400, detail="Format non supporté. Veuillez importer un fichier .csv ou .xlsx")

    content = await file.read()
    if not content or len(content) == 0:
        raise HTTPException(status_code=400, detail="Le fichier envoyé est vide")

    parsed_rows: List[Dict[str, Any]] = []

    def _clean_excel_cell(val: Any) -> str:
        if val is None:
            return ""
        if isinstance(val, float) and val.is_integer():
            return str(int(val))
        if isinstance(val, datetime):
            return val.strftime("%Y-%m-%d")
        if isinstance(val, date):
            return val.strftime("%Y-%m-%d")
        s = str(val).strip()
        if s.endswith(".0") and s[:-2].lstrip("+").isdigit():
            return s[:-2]
        return s

    # 1. Traitement fichier Excel (.xlsx via openpyxl, .xls via xlrd)
    if ext == "xls":
        try:
            import xlrd
            book = xlrd.open_workbook(file_contents=content)
            sheet = book.sheet_by_index(0)
            if sheet.nrows == 0:
                raise HTTPException(status_code=400, detail="Le fichier Excel (.xls) est vide")
            raw_headers = [sheet.cell_value(0, col_idx) for col_idx in range(sheet.ncols)]
            canonical_headers = [normalize_column_name(str(h)) if h is not None and str(h).strip() else None for h in raw_headers]
            for r_idx in range(1, sheet.nrows):
                row_vals = [sheet.cell_value(r_idx, col_idx) for col_idx in range(sheet.ncols)]
                if not any(str(v).strip() for v in row_vals if v is not None):
                    continue
                row_dict = {}
                for h, val in zip(canonical_headers, row_vals):
                    if h:
                        row_dict[h] = _clean_excel_cell(val)
                if row_dict:
                    parsed_rows.append(row_dict)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erreur de lecture du fichier Excel (.xls): {str(e)}")
    elif ext == "xlsx":
        if not HAS_OPENPYXL:
            raise HTTPException(status_code=500, detail="openpyxl n'est pas disponible sur le serveur")
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            ws = wb.active
            rows_iter = ws.iter_rows(values_only=True)
            raw_headers = next(rows_iter, None)
            if not raw_headers:
                raise HTTPException(status_code=400, detail="Le fichier Excel ne contient pas d'en-têtes")

            canonical_headers = [normalize_column_name(str(h)) if h is not None else None for h in raw_headers]

            for row in rows_iter:
                if not any(row):
                    continue
                row_dict = {}
                for h, val in zip(canonical_headers, row):
                    if h:
                        row_dict[h] = _clean_excel_cell(val)
                if row_dict:
                    parsed_rows.append(row_dict)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erreur de lecture du fichier Excel (.xlsx): {str(e)}")

    # 2. Traitement fichier CSV
    else:
        text_content = None
        for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
            try:
                text_content = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue

        if text_content is None:
            raise HTTPException(status_code=400, detail="Impossible de décoder le fichier CSV (encodage non supporté)")

        try:
            sample = text_content[:2048]
            delimiter = ";" if ";" in sample else ("," if "," in sample else "\t")
            reader = csv.reader(io.StringIO(text_content), delimiter=delimiter)
            raw_headers = next(reader, None)
            if not raw_headers:
                raise HTTPException(status_code=400, detail="Le fichier CSV ne contient pas d'en-têtes")

            canonical_headers = [normalize_column_name(str(h)) if h is not None else None for h in raw_headers]

            for row in reader:
                if not any(row):
                    continue
                row_dict = {}
                for h, val in zip(canonical_headers, row):
                    if h:
                        row_dict[h] = str(val).strip() if val is not None else ""
                if row_dict:
                    parsed_rows.append(row_dict)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erreur de lecture du fichier CSV: {str(e)}")

    if not parsed_rows:
        raise HTTPException(status_code=400, detail="Aucune donnée d'étudiant trouvée dans le fichier")

    if len(parsed_rows) > 500:
        raise HTTPException(status_code=400, detail="Le fichier contient plus de 500 étudiants. Veuillez découper par lot.")

    return process_bulk_students(parsed_rows, db, current_user)


# ==========================================
# 🌐 INSCRIPTION EN LIGNE PUBLIQUE (Dépôt de dossier)
# ==========================================

@router.post("/public-register")
async def public_register_student(
    student_type: str = Form("new"),  # "new" ou "returning"
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    place_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    nationality: Optional[str] = Form("Malienne"),
    address: Optional[str] = Form(None),
    filiere: str = Form(...),
    level: str = Form(...),
    domain: str = Form(...),
    parent_name: Optional[str] = Form(None),
    parent_phone: Optional[str] = Form(None),
    parent_email: Optional[str] = Form(None),
    existing_matricule: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    birth_certificate: Optional[UploadFile] = File(None),
    bac_diploma: Optional[UploadFile] = File(None),
    bac_transcript: Optional[UploadFile] = File(None),
    id_document: Optional[UploadFile] = File(None),
    medical_certificate: Optional[UploadFile] = File(None),
    previous_transcript: Optional[UploadFile] = File(None),
    success_certificate: Optional[UploadFile] = File(None),
    financial_clearance: Optional[UploadFile] = File(None),
    reenrollment_form: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Inscription en ligne publique et dépôt de dossier (Nouvel étudiant ou Ancien étudiant)"""
    email_clean = email.strip().lower()

    # 1. Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Un compte existe déjà avec cette adresse email. Veuillez vous connecter."
        )

    # 2. Université cible
    university = db.query(University).first()
    university_id = university.id if university else 1
    university_name = university.name if university else "UniSphere"

    # 3. Matricule
    if student_type == "returning" and existing_matricule and existing_matricule.strip():
        matricule = existing_matricule.strip().upper()
    else:
        matricule = generate_matricule(db, university_id, university_name)

    # 4. Parser date de naissance
    dob = parse_date_safely(date_of_birth)

    # 5. Créer l'utilisateur (rôle student)
    new_user = User(
        email=email_clean,
        hashed_password=hash_password(password),
        full_name=f"{first_name} {last_name}",
        role="student",
        university_id=university_id
    )
    db.add(new_user)
    db.flush()

    # 6. Créer le profil étudiant
    new_student = Student(
        user_id=new_user.id,
        university_id=university_id,
        matricule=matricule,
        student_type=student_type,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        date_of_birth=dob,
        place_of_birth=place_of_birth,
        gender=gender,
        nationality=nationality,
        email=email_clean,
        phone=phone,
        address=address,
        filiere=filiere,
        level=level,
        domain=domain,
        parent_name=parent_name,
        parent_phone=parent_phone,
        parent_email=parent_email,
        university_name=university_name,
        status="pending",
        file_status="incomplete"
    )
    db.add(new_student)
    db.flush()

    # 7. Dossier uploads
    upload_dir = Path(f"uploads/dossier_etudiant/{new_student.id}")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Photo de profil (optimisée et enregistrée dans uploads/ comme le reste de l'application)
    if photo and photo.filename:
        photo_bytes = await photo.read()
        if photo_bytes:
            photo_dir = Path("uploads")
            photo_dir.mkdir(parents=True, exist_ok=True)
            photo_name = f"STUDENT_{new_student.id}_{int(datetime.now().timestamp())}.jpg"
            photo_path = photo_dir / photo_name
            saved_photo = compress_and_save_upload(photo_bytes, photo_path, max_dimension=1200, quality=82)
            new_student.photo = saved_photo.name
            new_user.photo = saved_photo.name

    dossier_files = {
        "birth_certificate": birth_certificate,
        "bac_diploma": bac_diploma,
        "bac_transcript": bac_transcript,
        "id_document": id_document,
        "medical_certificate": medical_certificate,
        "previous_transcript": previous_transcript,
        "success_certificate": success_certificate,
        "financial_clearance": financial_clearance,
        "reenrollment_form": reenrollment_form,
    }

    for doc_key, upload_file in dossier_files.items():
        if upload_file and upload_file.filename:
            file_bytes = await upload_file.read()
            if file_bytes:
                ext = Path(upload_file.filename).suffix.lower() or ".pdf"
                fname = f"{doc_key}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
                fpath = upload_dir / fname
                saved_fpath = compress_and_save_upload(file_bytes, fpath, max_dimension=1600, quality=80)
                
                rel_path = f"uploads/dossier_etudiant/{new_student.id}/{saved_fpath.name}"
                setattr(new_student, doc_key, rel_path)

                doc_entry = Document(
                    document_type=doc_key,
                    title=f"{doc_key} - {new_student.first_name} {new_student.last_name}",
                    file_path=rel_path,
                    student_id=new_student.id,
                    generated_by=new_user.id,
                    university_id=university_id,
                )
                db.add(doc_entry)

    # 8. Calcul de complétude
    if student_type == "new":
        all_req = bool(
            new_student.birth_certificate and
            new_student.bac_diploma and
            new_student.bac_transcript and
            new_student.id_document
        )
    else:
        all_req = bool(
            new_student.previous_transcript and
            new_student.success_certificate and
            new_student.financial_clearance
        )
    new_student.file_status = "complete" if all_req else "incomplete"

    # 9. Générer le QR Code
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(f"UNISPHERE:{new_student.matricule}:{new_student.first_name}:{new_student.last_name}")
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_dir = Path("qr_codes")
        qr_dir.mkdir(parents=True, exist_ok=True)
        qr_filename = f"STUDENT_{new_student.id}.png"
        qr_path = qr_dir / qr_filename
        qr_img.save(str(qr_path))
        new_student.qr_code = qr_filename
    except Exception as e:
        print(f"⚠️ Erreur génération QR Code: {e}")

    # 10. Notifier les administrateurs
    admins = db.query(User).filter(
        User.university_id == university_id,
        User.role == "admin"
    ).all()
    type_str = "Nouvel étudiant" if student_type == "new" else "Réinscription"
    for admin in admins:
        notif = Notification(
            title=f"🎓 Nouvelle inscription ({type_str})",
            message=f"{first_name} {last_name} ({email_clean}) a soumis son dossier administratif.",
            type="info",
            notification_type="student_enrollment",
            recipient_id=admin.id,
            created_by=new_user.id,
            university_id=university_id,
            is_read=False
        )
        db.add(notif)

    db.commit()
    db.refresh(new_student)

    return {
        "message": "Inscription enregistrée avec succès ! Votre dossier est en cours d'examen.",
        "student_id": new_student.id,
        "matricule": new_student.matricule,
        "student_type": new_student.student_type,
        "file_status": new_student.file_status,
        "email": new_user.email
    }


# ==========================================
# 📁 GESTION DU DOSSIER ÉTUDIANT (NOUVEAU & ANCIEN)
# ==========================================

@router.get("/{student_id}/dossier")
def get_student_dossier(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "teacher", "student"))
):
    """Consulter l'état détaillé du dossier de l'étudiant avec checklist adapté"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    st_type = student.student_type or "new"

    if st_type == "new":
        checklist = [
            {
                "code": "birth_certificate",
                "label": "Extrait d'acte de naissance",
                "description": "Copie lisible de l'acte de naissance",
                "required": False,
                "is_uploaded": bool(student.birth_certificate),
                "file_path": student.birth_certificate,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/birth_certificate" if student.birth_certificate else None
            },
            {
                "code": "bac_diploma",
                "label": "Diplôme ou Attestation du Baccalauréat",
                "description": "Attestation de réussite ou diplôme officiel",
                "required": False,
                "is_uploaded": bool(student.bac_diploma),
                "file_path": student.bac_diploma,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/bac_diploma" if student.bac_diploma else None
            },
            {
                "code": "bac_transcript",
                "label": "Relevé de notes du Baccalauréat",
                "description": "Relevé officiel des notes de l'examen",
                "required": False,
                "is_uploaded": bool(student.bac_transcript),
                "file_path": student.bac_transcript,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/bac_transcript" if student.bac_transcript else None
            },
            {
                "code": "id_document",
                "label": "Pièce d'identité (CNI / Passeport)",
                "description": "Carte nationale d'identité, passeport ou attestation biométrique",
                "required": False,
                "is_uploaded": bool(student.id_document),
                "file_path": student.id_document,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/id_document" if student.id_document else None
            },
            {
                "code": "medical_certificate",
                "label": "Certificat médical d'aptitude",
                "description": "Certificat d'aptitude physique délivré par un médecin",
                "required": False,
                "is_uploaded": bool(student.medical_certificate),
                "file_path": student.medical_certificate,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/medical_certificate" if student.medical_certificate else None
            }
        ]
    else:
        # Ancien Étudiant (Réinscription)
        checklist = [
            {
                "code": "previous_transcript",
                "label": "Relevé de notes de l'année précédente (N-1)",
                "description": "Relevé officiel validé par la direction académique",
                "required": False,
                "is_uploaded": bool(student.previous_transcript),
                "file_path": student.previous_transcript,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/previous_transcript" if student.previous_transcript else None
            },
            {
                "code": "success_certificate",
                "label": "Attestation de passage ou réussite",
                "description": "Attestation de validation du niveau antérieur",
                "required": False,
                "is_uploaded": bool(student.success_certificate),
                "file_path": student.success_certificate,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/success_certificate" if student.success_certificate else None
            },
            {
                "code": "financial_clearance",
                "label": "Quitus financier / Justificatif de solde",
                "description": "Reçu ou quitus attestant le solde complet de la scolarité précédente",
                "required": False,
                "is_uploaded": bool(student.financial_clearance),
                "file_path": student.financial_clearance,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/financial_clearance" if student.financial_clearance else None
            },
            {
                "code": "id_document",
                "label": "Ancienne carte d'étudiant ou CNI",
                "description": "Carte d'étudiant UniSphere de l'année précédente ou pièce d'identité",
                "required": False,
                "is_uploaded": bool(student.id_document),
                "file_path": student.id_document,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/id_document" if student.id_document else None
            },
            {
                "code": "reenrollment_form",
                "label": "Fiche de réinscription signée",
                "description": "Fiche d'inscription annuelle dûment signée par l'étudiant",
                "required": False,
                "is_uploaded": bool(student.reenrollment_form),
                "file_path": student.reenrollment_form,
                "download_url": f"/api/v1/students/{student.id}/dossier/download/reenrollment_form" if student.reenrollment_form else None
            }
        ]

    required_items = [item for item in checklist if item["required"]]
    total_required = len(required_items)
    provided_required = len([item for item in required_items if item["is_uploaded"]])
    completion_rate = int((provided_required / total_required) * 100) if total_required > 0 else 100

    documents = [
        {
            "key": item["code"],
            "code": item["code"],
            "label": item["label"],
            "description": item["description"],
            "required": item["required"],
            "uploaded": item["is_uploaded"],
            "is_uploaded": item["is_uploaded"],
            "path": item["file_path"],
            "file_path": item["file_path"],
            "download_url": item["download_url"]
        }
        for item in checklist
    ]

    return {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "filiere": student.filiere,
        "level": student.level,
        "student_type": st_type,
        "student_type_label": "Nouvel Étudiant (Inscription)" if st_type == "new" else "Ancien Étudiant (Réinscription)",
        "file_status": student.file_status or ("complete" if completion_rate == 100 else "incomplete"),
        "completion_rate": completion_rate,
        "required_count": total_required,
        "uploaded_count": provided_required,
        "documents": documents,
        "checklist": documents,
        "stats": {
            "total_items": len(checklist),
            "total_required": total_required,
            "provided_count": len([i for i in checklist if i["is_uploaded"]]),
            "provided_required": provided_required,
            "completion_rate": completion_rate,
            "is_complete": completion_rate == 100
        }
    }


@router.post("/{student_id}/dossier/upload")
async def upload_dossier_document(
    student_id: int,
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Téléverser ou mettre à jour une pièce spécifique du dossier étudiant"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    allowed_types = {
        "birth_certificate": "Acte de naissance",
        "bac_diploma": "Diplôme du Baccalauréat",
        "bac_transcript": "Relevé de notes du Bac",
        "id_document": "Pièce d'identité",
        "medical_certificate": "Certificat médical",
        "previous_transcript": "Relevé de notes N-1",
        "success_certificate": "Attestation de réussite",
        "financial_clearance": "Quitus financier",
        "reenrollment_form": "Fiche de réinscription",
        "previous_diploma": "Diplôme antérieur"
    }

    resolved_type = doc_type or document_type
    if not resolved_type or resolved_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Type de pièce invalide ({resolved_type}). Choisir parmi: {list(allowed_types.keys())}")

    dossier_dir = Path(f"uploads/dossier_etudiant/{student.id}")
    dossier_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix.lower() or ".pdf"
    fname = f"{resolved_type}_{student.id}_{int(time_module.time())}{ext}"
    target_path = dossier_dir / fname
    
    content = await file.read()
    saved_target = compress_and_save_upload(content, target_path, max_dimension=1600, quality=80)

    # Assigner à l'attribut de l'étudiant (chemin POSIX universel)
    posix_path = f"uploads/dossier_etudiant/{student.id}/{saved_target.name}"
    setattr(student, resolved_type, posix_path)

    # Enregistrer dans la table Document
    doc_record = Document(
        document_type=resolved_type,
        title=f"{allowed_types[resolved_type]} - {student.first_name} {student.last_name}",
        file_path=posix_path,
        student_id=student.id,
        generated_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(doc_record)

    # Recalculer la complétude
    st_type = student.student_type or "new"
    if st_type == "new":
        req = [student.birth_certificate, student.bac_diploma, student.bac_transcript, student.id_document]
    else:
        req = [student.previous_transcript, student.success_certificate, student.financial_clearance]
    
    student.file_status = "complete" if all(req) else "incomplete"

    db.commit()
    db.refresh(student)

    return {
        "message": f"Pièce '{allowed_types[resolved_type]}' téléversée avec succès",
        "doc_type": resolved_type,
        "file_path": str(saved_target),
        "file_status": student.file_status
    }


@router.delete("/{student_id}/dossier/{doc_type}")
def delete_dossier_document(
    student_id: int,
    doc_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Supprimer une pièce spécifique du dossier étudiant"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    if hasattr(student, doc_type):
        existing_p = getattr(student, doc_type, None)
        if existing_p and Path(existing_p).exists():
            try:
                Path(existing_p).unlink()
            except Exception:
                pass
        setattr(student, doc_type, None)
        st_type = student.student_type or "new"
        req = (
            [student.birth_certificate, student.bac_diploma, student.bac_transcript, student.id_document]
            if st_type == "new"
            else [student.previous_transcript, student.success_certificate, student.financial_clearance]
        )
        student.file_status = "complete" if all(req) else "incomplete"
        db.commit()
    return {"message": "Pièce supprimée du dossier", "file_status": student.file_status}


@router.get("/{student_id}/dossier/download/{doc_type}")
def download_dossier_document(
    student_id: int,
    doc_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "teacher", "student"))
):
    """Télécharger ou afficher une pièce spécifique du dossier de l'étudiant"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    file_path_str = getattr(student, doc_type, None)
    if not file_path_str and doc_type == "photo":
        file_path_str = student.photo
    if not file_path_str:
        raise HTTPException(status_code=404, detail="Document non encore téléversé")

    clean_p = str(file_path_str).replace("\\", "/").strip().lstrip("/")
    fname = Path(clean_p).name
    base_dir = Path(__file__).resolve().parent.parent.parent

    candidates = [
        base_dir / clean_p,
        Path(clean_p),
        base_dir / "uploads" / clean_p,
        base_dir / "uploads" / "dossier_etudiant" / str(student.id) / fname,
        base_dir / "uploads" / "dossier_etudiant" / str(student.id) / "validated" / fname,
        base_dir / "uploads" / "photos" / fname,
        base_dir / "uploads" / "student_documents" / fname,
        base_dir / "uploads" / fname,
        Path(f"uploads/dossier_etudiant/{student.id}") / fname,
        Path(f"uploads/dossier_etudiant/{student.id}/validated") / fname,
        Path(f"uploads/student_documents") / fname,
        Path("uploads") / fname,
    ]
    fpath = next((c for c in candidates if c.exists() and c.is_file()), None)
    if not fpath:
        raise HTTPException(status_code=404, detail="Document introuvable sur le serveur")
    ext = fpath.suffix.lower()
    media_map = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif"
    }
    media_type = media_map.get(ext, "application/octet-stream")
    return FileResponse(
        path=str(fpath),
        filename=f"{doc_type}_{student.matricule or student.id}{fpath.suffix}",
        media_type=media_type
    )


@router.patch("/{student_id}/dossier/status")
async def update_dossier_status(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Mettre à jour le statut du dossier de l'étudiant (validated / complete / incomplete)"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    new_status = None
    try:
        body = await request.json()
        if isinstance(body, dict):
            new_status = body.get("status")
    except Exception:
        pass

    if not new_status:
        try:
            form = await request.form()
            new_status = form.get("status")
        except Exception:
            pass

    valid_statuses = ["complete", "incomplete", "validated", "rejected"]
    if not new_status or new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Statut invalide ({new_status}). Choisir parmi: {valid_statuses}")

    student.file_status = new_status
    db.commit()
    db.refresh(student)

    return {"message": f"Statut du dossier mis à jour : {new_status}", "file_status": student.file_status}


@router.patch("/{student_id}/discount")
async def update_student_discount(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    """Accorder ou modifier une réduction/bourse négociée pour un étudiant avec traçabilité comptable"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    body = {}
    try:
        body = await request.json()
    except Exception:
        try:
            form = await request.form()
            body = dict(form)
        except Exception:
            pass

    discount_amount = float(body.get("discount_amount") or 0.0)
    discount_percentage = float(body.get("discount_percentage") or 0.0)
    discount_reason = body.get("discount_reason")
    discount_approved_by = body.get("discount_approved_by") or current_user.full_name
    net_tuition_amount = body.get("net_tuition_amount")

    from app.utils.tuition import find_matching_academic_fee

    fee = find_matching_academic_fee(db, student, current_user.university_id, "scolarite")
    if not fee:
        raise HTTPException(
            status_code=400,
            detail=f"Veuillez d'abord configurer la scolarité de la filière « {student.filiere or 'N/A'} » ({student.level}) avant d'appliquer une remise."
        )

    base_fee = float(fee.amount or 0.0)
    discount_percentage = max(0.0, min(100.0, discount_percentage))

    if discount_percentage >= 100.0:
        discount_amount = base_fee
        net_val = 0.0
    elif discount_percentage > 0:
        discount_amount = round(base_fee * (discount_percentage / 100.0))
        net_val = max(0.0, base_fee - discount_amount)
    elif discount_amount > 0:
        discount_amount = min(base_fee, discount_amount)
        net_val = max(0.0, base_fee - discount_amount)
    elif net_tuition_amount is not None and str(net_tuition_amount).strip() != "" and float(net_tuition_amount) >= 0:
        net_val = min(base_fee, float(net_tuition_amount))
        discount_amount = max(0.0, base_fee - net_val)
    else:
        discount_amount = 0.0
        discount_percentage = 0.0
        net_val = None

    student.discount_amount = discount_amount
    student.discount_percentage = discount_percentage
    student.discount_reason = discount_reason if (discount_amount > 0 or discount_percentage > 0) else None
    student.discount_approved_by = discount_approved_by if (discount_amount > 0 or discount_percentage > 0) else None
    student.net_tuition_amount = net_val

    # Audit log
    try:
        from app.models.audit_log import AuditLog
        log = AuditLog(
            action=f"Tarif particulier accordé pour {student.first_name} {student.last_name} : remise de {discount_amount} FCFA (Net dû: {net_val} FCFA) - Motif: {discount_reason}",
            user_email=current_user.email,
            status="success",
            university_id=current_user.university_id
        )
        db.add(log)
    except Exception:
        pass

    db.commit()
    db.refresh(student)

    return {
        "message": "Réduction / Bourse mise à jour avec succès",
        "student_id": student.id,
        "standard_fee": base_fee,
        "discount_amount": student.discount_amount,
        "discount_percentage": student.discount_percentage,
        "discount_reason": student.discount_reason,
        "discount_approved_by": student.discount_approved_by,
    }


@router.patch("/{student_id}/payment-plan")
async def update_student_payment_plan(
    student_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    """Modifier le plan de paiement d'un étudiant (tranches classiques vs mensualités)"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    plan = body.get("payment_plan", "tranches")
    # Accepter "monthly" comme alias de "mensuel" pour retro-compatibilite
    if plan == "monthly":
        plan = "mensuel"
    if plan not in ["tranches", "mensuel"]:
        raise HTTPException(status_code=400, detail="Plan de paiement invalide (doit être 'tranches' ou 'mensuel')")

    student.payment_plan = plan
    if "monthly_deposit" in body:
        student.monthly_deposit = float(body["monthly_deposit"]) if body["monthly_deposit"] is not None and str(body["monthly_deposit"]).strip() != "" else None
    if "monthly_installment" in body:
        student.monthly_installment = float(body["monthly_installment"]) if body["monthly_installment"] is not None and str(body["monthly_installment"]).strip() != "" else None
    if "monthly_months_count" in body:
        student.monthly_months_count = int(body["monthly_months_count"]) if body["monthly_months_count"] is not None and str(body["monthly_months_count"]).strip() != "" else 5

    db.commit()
    db.refresh(student)

    from app.utils.tuition import resolve_student_tuition_breakdown
    breakdown = resolve_student_tuition_breakdown(db, student, current_user.university_id, "scolarite")

    return {
        "message": f"Plan de paiement mis à jour : {plan}",
        "student_id": student.id,
        "payment_plan": student.payment_plan,
        "monthly_plan": breakdown.get("monthly_plan")
    }


@router.get("/")
def get_students(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "teacher", "student", "guard", "super_admin"))
):
    """Liste des étudiants"""
    query = db.query(Student)
    if current_user.role != "super_admin" and current_user.university_id:
        query = query.filter(Student.university_id == current_user.university_id)
    elif current_user.university_id:
        query = query.filter(Student.university_id == current_user.university_id)
    
    if current_user.role == "student":
        query = query.filter(Student.user_id == current_user.id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Student.first_name.ilike(search_term)) |
            (Student.last_name.ilike(search_term)) |
            (Student.matricule.ilike(search_term)) |
            (Student.email.ilike(search_term))
        )
    
    students = query.order_by(Student.last_name, Student.first_name).all()
    
    result = []
    univ_id = current_user.university_id or (students[0].university_id if students else 1)
    for student in students:
        filiere_obj = None
        if student.filiere:
            filiere_obj = db.query(Filiere).filter(
                Filiere.name == student.filiere,
                Filiere.university_id == (student.university_id or univ_id)
            ).first()
        
        # Prioriser le domaine stocké sur l'étudiant, sinon celui de la filière
        resolved_domain = student.domain or (filiere_obj.domain if filiere_obj else None) or "Non défini"
        
        student_dict = {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "matricule": student.matricule,
            "email": student.email,
            "phone": student.phone,
            "level": student.level,
            "filiere": student.filiere,
            "domain": resolved_domain,
            "status": student.status,
            "photo": student.photo,
            "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
            "place_of_birth": student.place_of_birth,
            "address": student.address,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "user_id": student.user_id,
            "birth_certificate": getattr(student, 'birth_certificate', None),
            "previous_diploma": getattr(student, 'previous_diploma', None),
            "id_document": getattr(student, 'id_document', None),
            "photo_id": getattr(student, 'photo_id', None),
            "file_status": getattr(student, 'file_status', None)
        }
        result.append(student_dict)
    
    return result


@router.get("/{student_id}/qr-code")
@router.get("/{student_id}/qrcode")
def generate_student_qr_code(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Génère et retourne l'image PNG du QR code d'un étudiant (accessible directement ou par img tag)"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    base_dir = Path(__file__).resolve().parent.parent.parent
    qr_dir = base_dir / "qr_codes"
    qr_dir.mkdir(parents=True, exist_ok=True)
    
    qr_filename = student.qr_code or f"STUDENT_{student.id}.png"
    qr_filename = os.path.basename(qr_filename)
    qr_path = str(qr_dir / qr_filename)
    
    # Headers de mise en cache HTTP agressive (1 an) pour éviter de saturer le serveur
    cache_headers = {"Cache-Control": "public, max-age=31536000, immutable"}

    # Si le fichier existe déjà, le renvoyer directement avec mise en cache
    if os.path.exists(qr_path) and os.path.getsize(qr_path) > 0:
        return FileResponse(qr_path, media_type="image/png", filename=f"QR_{student.matricule or student.id}.png", headers=cache_headers)
    
    # Sinon, générer le QR code avec le matricule de l'étudiant
    qr_data = student.matricule or f"STUDENT-{student.id}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(qr_path)
    
    # Enregistrer la référence dans l'étudiant si manquante
    if student.qr_code != qr_filename:
        student.qr_code = qr_filename
        try:
            db.commit()
        except Exception:
            db.rollback()
    
    return FileResponse(qr_path, media_type="image/png", filename=f"QR_{student.matricule or student.id}.png", headers=cache_headers)


# ==========================================
# ✅ ESPACE ÉTUDIANT CONNECTÉ (/me/*)
# ⚠️ IMPORTANT : Doit être AVANT /{student_id}
# ==========================================

@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Profil de l'étudiant connecté"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    # Récupérer aussi les infos du User pour le phone/email
    user = db.query(User).filter(User.id == current_user.id).first()
    
    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "matricule": student.matricule,
        "email": student.email,
        "phone": student.phone or (user.phone if user else None),
        "level": student.level,
        "filiere": student.filiere,
        "domain": student.domain,
        "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
        "place_of_birth": student.place_of_birth,
        "gender": student.gender,
        "nationality": student.nationality,
        "address": student.address,
        "photo": student.photo,
        "status": student.status,
        "academic_year": getattr(student, 'academic_year', '2025-2026'),
        "emergency_contact": getattr(student, 'emergency_contact', None),
        "emergency_phone": getattr(student, 'emergency_phone', None),
        "city": getattr(student, 'city', None),
        "country": getattr(student, 'country', None),
        "user_id": student.user_id,
        "created_at": student.created_at.isoformat() if student.created_at else None
    }


@router.put("/me")
async def update_my_profile(
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    emergency_contact: Optional[str] = Form(None),
    emergency_phone: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Met à jour les informations personnelles de l'étudiant connecté"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    # Mise à jour des champs modifiables (avec vérification d'existence)
    if phone is not None:
        student.phone = phone
    if address is not None:
        student.address = address
    
    for field in ['city', 'country', 'emergency_contact', 'emergency_phone']:
        value = locals().get(field)
        if value is not None and hasattr(student, field):
            setattr(student, field, value)
    
    # Mise à jour du user associé
    user = db.query(User).filter(User.id == current_user.id).first()
    if user and phone is not None:
        user.phone = phone
    
    db.commit()
    db.refresh(student)
    
    return {
        "message": "Profil mis à jour avec succès",
        "student": student
    }


@router.post("/me/photo")
async def upload_my_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Upload la photo de profil de l'étudiant connecté"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    ctype = (file.content_type or "").lower()
    ext_chk = Path(file.filename or "").suffix.lower()
    if not ctype.startswith("image/") and ext_chk not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        raise HTTPException(status_code=400, detail="Format non supporté (JPG, PNG, WebP)")
    
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Image vide")
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 8 Mo)")
    
    os.makedirs("uploads", exist_ok=True)
    photo_filename = f"STUDENT_{student.id}_{int(time_module.time())}.jpg"
    photo_path = Path("uploads") / photo_filename
    
    # Supprimer l'ancienne photo si elle existe
    if student.photo:
        old_path = os.path.join("uploads", student.photo)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass
    
    saved_photo = compress_and_save_upload(content, photo_path, max_dimension=1200, quality=82)
    
    student.photo = saved_photo.name
    current_user.photo = saved_photo.name
    db.commit()
    
    return {
        "message": "Photo mise à jour",
        "photo": saved_photo.name
    }


@router.post("/me/change-password")
def change_my_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Change le mot de passe de l'étudiant connecté"""
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caractères")
    
    current_user.hashed_password = hash_password(new_password)
    db.commit()
    
    return {"message": "Mot de passe modifié avec succès"}


@router.get("/me/dashboard")
def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Dashboard complet de l'étudiant connecté"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    # Statistiques de base
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

    # Dernières notes
    recent_grades = []
    sorted_grades = sorted(grades, key=lambda x: x.created_at or datetime.min, reverse=True)[:5]
    for g in sorted_grades:
        course_name = "Module inconnu"
        if hasattr(g, 'course') and g.course:
            course_name = (
                getattr(g.course, 'title', None) or 
                getattr(g.course, 'subject', None) or 
                getattr(g.course, 'name', None) or 
                getattr(g.course, 'module', "Module inconnu")
            )
        
        recent_grades.append({
            "subject": course_name,
            "score": g.score,
            "coefficient": g.coefficient or 1,
            "date": g.created_at.strftime("%d/%m/%Y") if g.created_at else "N/A",
            "comment": getattr(g, 'comment', "") or ""
        })

    # Prochains événements
    upcoming_events = []
    
    try:
        if student.class_room_id:
            schedules = db.query(Schedule, Course).join(
                Course, Schedule.course_id == Course.id
            ).filter(
                Schedule.class_id == student.class_room_id,
                Schedule.university_id == current_user.university_id
            ).order_by(Schedule.day_of_week, Schedule.start_time).limit(3).all()
            
            for sch, course in schedules:
                upcoming_events.append({
                    "title": f"Cours: {course.title if course else 'Module'}",
                    "type": "course",
                    "date": sch.day_of_week,
                    "time": f"{sch.start_time} - {sch.end_time}",
                    "location": f"{sch.building or ''} {sch.room or 'Salle inconnue'}".strip()
                })
        
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
            
        upcoming_events = upcoming_events[:3]
        
    except Exception as e:
        print(f"⚠️ Erreur événements: {e}")
        upcoming_events = []

    return {
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "filiere": student.filiere,
        "average_grade": average_grade,
        "attendance_rate": attendance_rate,
        "recent_grades": recent_grades,
        "upcoming_events": upcoming_events
    }


@router.get("/me/courses")
def get_my_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les cours de l'étudiant avec leurs supports"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    courses = db.query(Course).filter(
        Course.level == student.level,
        Course.university_id == student.university_id
    ).all()

    result = []
    for c in courses:
        course_filiere_name = ""
        if hasattr(c, 'filiere') and c.filiere:
            course_filiere_name = getattr(c.filiere, 'name', str(c.filiere))
        elif hasattr(c, 'department') and c.department:
            course_filiere_name = c.department

        if student.filiere and course_filiere_name:
            st_fil = student.filiere.strip().lower()
            co_fil = course_filiere_name.strip().lower()
            if st_fil != co_fil and st_fil not in co_fil and co_fil not in st_fil:
                continue

        teacher_name = "Enseignant non assigné"
        if hasattr(c, 'teacher_id') and c.teacher_id:
            teacher = db.query(Teacher).filter(Teacher.id == c.teacher_id).first()
            if teacher:
                teacher_name = f"{teacher.first_name} {teacher.last_name}"
        
        # 1. Supports enregistrés dans la table materials
        materials = db.query(Material).filter(
            Material.course_id == c.id,
            Material.university_id == current_user.university_id
        ).order_by(Material.created_at.desc()).all()
        
        materials_list = []
        for m in materials:
            materials_list.append({
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "file_path": m.file_path,
                "file_type": m.file_type or "application/pdf",
                "original_name": m.original_name or f"{m.title}.pdf",
                "file_size": m.file_size or 0,
                "download_count": m.download_count or 0,
                "created_at": m.created_at.isoformat() if m.created_at else None
            })

        # 2. Documents de type course_material rattachés à ce cours
        course_title_lower = getattr(c, 'title', '').strip().lower()
        doc_materials = db.query(Document).filter(
            Document.document_type == "course_material",
            Document.university_id == current_user.university_id
        ).all()
        
        for doc in doc_materials:
            doc_desc = (doc.description or '').lower()
            doc_tit = (doc.title or '').lower()
            if course_title_lower in doc_desc or course_title_lower in doc_tit or doc_tit in course_title_lower:
                if not any(m["title"] == doc.title for m in materials_list):
                    materials_list.append({
                        "id": doc.id,
                        "title": doc.title,
                        "description": doc.description or f"Cours: {c.title}",
                        "file_path": doc.file_path,
                        "file_type": "application/pdf",
                        "original_name": f"{doc.title}.pdf",
                        "file_size": 1024 * 1024,
                        "download_count": doc.download_count or 0,
                        "created_at": doc.created_at.isoformat() if doc.created_at else None
                    })

        result.append({
            "id": c.id,
            "title": getattr(c, 'title', getattr(c, 'name', 'Cours sans titre')),
            "description": getattr(c, 'description', ''),
            "teacher": teacher_name,
            "coefficient": getattr(c, 'credits', getattr(c, 'coefficient', 1)),
            "materials": materials_list
        })

    return result


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
        subject = "Module inconnu"
        if hasattr(g, 'course') and g.course:
            subject = getattr(g.course, 'title', getattr(g.course, 'name', 'Module'))
            
        result.append({
            "id": g.id,
            "subject": subject,
            "score": g.score,
            "max_score": getattr(g, 'max_score', 20),
            "coefficient": g.coefficient or 1,
            "exam_type": getattr(g, 'exam_type', getattr(g, 'type', 'Devoir')),
            "date": g.created_at.strftime("%d/%m/%Y") if g.created_at else "N/A",
            "comment": getattr(g, 'comment', '')
        })

    result.sort(key=lambda x: x['date'], reverse=True)
    return result


@router.get("/me/schedule")
def get_my_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'emploi du temps de l'étudiant"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil non trouvé")

    if student.class_room_id:
        schedules = db.query(Schedule).filter(
            Schedule.class_id == student.class_room_id,
            Schedule.university_id == student.university_id
        ).all()
    else:
        schedules = db.query(Schedule).filter(
            Schedule.university_id == student.university_id
        ).all()

    result = []
    for s in schedules:
        course = db.query(Course).filter(Course.id == s.course_id).first()
        
        if course and student.filiere and not student.class_room_id:
            course_filiere_name = ""
            if hasattr(course, 'filiere') and course.filiere and hasattr(course.filiere, 'name'):
                course_filiere_name = course.filiere.name
            elif getattr(course, 'department', None):
                course_filiere_name = course.department
            elif getattr(course, 'filiere_id', None):
                fil = db.query(Filiere).filter(Filiere.id == course.filiere_id).first()
                if fil:
                    course_filiere_name = fil.name
                
            if course_filiere_name and course_filiere_name.lower().strip() != student.filiere.lower().strip():
                continue

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


@router.get("/me/attendance")
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'historique des présences"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    attendances = db.query(Attendance).filter(
        Attendance.student_id == student.id
    ).order_by(Attendance.date.desc()).all()

    result = []
    for att in attendances:
        course_name = "Cours inconnu"
        if hasattr(att, 'course_id') and att.course_id:
            course = db.query(Course).filter(Course.id == att.course_id).first()
            if course:
                course_name = getattr(course, 'title', getattr(course, 'name', 'Cours'))
        
        result.append({
            "id": att.id,
            "date": att.date.strftime("%d/%m/%Y") if att.date else "N/A",
            "status": att.status,
            "course": course_name,
            "comment": getattr(att, 'comment', '') or ''
        })

    return result


@router.get("/me/payments")
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'historique des paiements"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    try:
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
        
    except Exception:
        return []


@router.get("/me/receipts")
def get_my_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les reçus de paiement"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    try:
        payments = db.query(Payment).filter(
            Payment.student_id == student.id,
            Payment.status == 'completed'
        ).order_by(Payment.payment_date.desc()).all()

        result = []
        for p in payments:
            result.append({
                "id": p.id,
                "receipt_number": getattr(p, 'receipt_number', f"REC-{p.id:06d}"),
                "amount": p.amount,
                "payment_date": p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "N/A",
                "description": getattr(p, 'description', getattr(p, 'label', 'Paiement')),
                "payment_method": getattr(p, 'payment_method', 'Espèces'),
                "status": getattr(p, 'status', 'paid'),
                "student": {
                    "name": f"{student.first_name} {student.last_name}",
                    "matricule": student.matricule,
                    "level": student.level,
                    "filiere": student.filiere
                },
                "university": {
                    "name": getattr(current_user, 'university_name', 'Université')
                },
                "creator": {
                    "name": "Service Comptable"
                },
                "tranches": {
                    "paid": [{"tranche_name": "Paiement unique", "amount": p.amount}],
                    "remaining": [],
                    "total_paid": p.amount,
                    "paid_percentage": 100
                }
            })

        return result
        
    except Exception:
        return []


@router.get("/me/receipts/{receipt_id}")
def get_my_receipt_by_id(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les détails d'un reçu spécifique"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    try:
        payment = db.query(Payment).filter(
            Payment.id == receipt_id,
            Payment.student_id == student.id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Reçu introuvable")
        
        university = db.query(University).filter(
            University.id == current_user.university_id
        ).first()
        
        status = 'paid'
        if hasattr(payment, 'balance') and payment.balance and payment.balance > 0:
            status = 'partial'
        elif hasattr(payment, 'status'):
            status = payment.status
        
        receipt_data = {
            "payment": {
                "id": payment.id,
                "receipt_number": getattr(payment, 'receipt_number', None) or f"REC-{payment.id:06d}",
                "reference": getattr(payment, 'reference', None) or f"REF-{payment.id:06d}",
                "amount": payment.amount or 0,
                "total_amount": getattr(payment, 'total_amount', None) or payment.amount or 0,
                "balance": getattr(payment, 'balance', None) or 0,
                "payment_date": payment.payment_date.isoformat() if payment.payment_date else (payment.created_at.isoformat() if payment.created_at else None),
                "created_at": payment.created_at.isoformat() if payment.created_at else None,
                "payment_type": getattr(payment, 'payment_type', 'scolarite') or 'scolarite',
                "payment_method": getattr(payment, 'payment_method', 'cash') or 'cash',
                "description": getattr(payment, 'description', None) or getattr(payment, 'label', 'Paiement de scolarité'),
                "status": status
            },
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "first_name": student.first_name,
                "last_name": student.last_name,
                "matricule": student.matricule,
                "level": student.level,
                "filiere": student.filiere
            },
            "university": {
                "name": university.name if university else "Université",
                "address": getattr(university, 'address', '') if university else '',
                "phone": getattr(university, 'phone', '') if university else '',
                "email": getattr(university, 'email', '') if university else ''
            },
            "creator": {
                "name": "Service Comptable",
                "role": "accountant"
            },
            "tranches": {
                "paid": [{"tranche_name": "Paiement effectué", "amount": payment.amount or 0, "due_date": payment.payment_date.isoformat() if payment.payment_date else None}],
                "remaining": [],
                "total_paid": payment.amount or 0,
                "total_remaining": getattr(payment, 'balance', None) or 0,
                "paid_percentage": 100 if status == 'paid' else 0
            }
        }
        
        return {"receipt": receipt_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f" Erreur reçu: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")


@router.get("/me/card")
def get_my_student_card(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les données de la carte étudiante"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")

    saved_config = university.card_config or {}

    # URLs relatives robustes pour le frontend (évite le blocage sur BACKEND_URL externe)
    photo_url = None
    if student.photo:
        clean_p = str(student.photo).replace("\\", "/").lstrip("/")
        if clean_p.startswith(("http://", "https://")):
            photo_url = clean_p
        elif clean_p.startswith("uploads/"):
            photo_url = f"/{clean_p}"
        else:
            photo_url = f"/uploads/{clean_p}"

    # Utiliser le endpoint dynamique garanti de générer/servir le QR code
    qr_code_url = f"/api/v1/students/{student.id}/qrcode"

    logo_url = None
    if getattr(university, 'logo', None):
        clean_l = str(university.logo).replace("\\", "/").lstrip("/")
        if clean_l.startswith(("http://", "https://")):
            logo_url = clean_l
        elif clean_l.startswith("uploads/"):
            logo_url = f"/{clean_l}"
        elif clean_l.startswith("logos/"):
            logo_url = f"/uploads/{clean_l}"
        else:
            logo_url = f"/uploads/logos/{clean_l}"

    return {
        "student": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "matricule": student.matricule,
            "level": student.level,
            "filiere": student.filiere,
            "domain": getattr(student, 'domain', '') or getattr(student, 'faculty', ''),
            "faculty": getattr(student, 'faculty', ''),
            "date_of_birth": student.date_of_birth.strftime("%d/%m/%Y") if student.date_of_birth else None,
            "email": student.email,
            "phone": student.phone,
            "address": getattr(student, 'address', ''),
            "nationality": getattr(student, 'nationality', ''),
            "photo": photo_url,
            "qr_code": qr_code_url
        },
        "university": {
            "id": university.id,
            "name": university.name,
            "slogan": getattr(university, 'slogan', ''),
            "logo": logo_url,
            "academic_year": getattr(university, 'academic_year', None) or get_current_academic_year(db, current_user.university_id),
            "address": getattr(university, 'address', ''),
            "phone": getattr(university, 'phone', ''),
            "email": getattr(university, 'email', '')
        },
        "config": saved_config
    }


@router.get("/me/dossier")
def get_my_dossier(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Consulter l'état détaillé de son propre dossier étudiant"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    return get_student_dossier(student_id=student.id, db=db, current_user=current_user)


@router.get("/me/files")
def get_my_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les fichiers du dossier de l'étudiant avec métadonnées complètes"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    base_dir = Path(__file__).resolve().parent.parent.parent
    files = []
    if student.photo:
        clean_p = os.path.basename(student.photo)
        p_candidates = [Path("uploads") / clean_p, base_dir / "uploads" / clean_p]
        p_found = next((c for c in p_candidates if c.exists() and c.is_file()), None)
        if p_found:
            files.append({
                "id": clean_p,
                "name": "photo",
                "filename": clean_p,
                "path": f"uploads/{clean_p}",
                "size": p_found.stat().st_size,
                "status": "validated",
                "uploaded_at": datetime.fromtimestamp(p_found.stat().st_mtime).isoformat()
            })

    student_folder = base_dir / "uploads" / "dossier_etudiant" / str(student.id)
    if not student_folder.exists():
        fallback_folder = Path(f"uploads/dossier_etudiant/{student.id}")
        if fallback_folder.exists():
            student_folder = fallback_folder
        else:
            return files
    
    prefix_map = {
        "birth_certificate": "birth_certificate",
        "bac_diploma": "bac_diploma",
        "bac_transcript": "bac_transcript",
        "id_document": "id_document",
        "cni": "cni",
        "medical_certificate": "medical_certificate",
        "previous_transcript": "previous_transcript",
        "success_certificate": "success_certificate",
        "financial_clearance": "financial_clearance",
        "reenrollment_form": "reenrollment_form",
        "photo": "photo",
        "bac": "bac_diploma"
    }

    for file_path in student_folder.iterdir():
        if file_path.is_file():
            filename = file_path.name
            doc_type = "other"
            
            for p_key, mapped_type in prefix_map.items():
                if filename.startswith(f"{p_key}_"):
                    doc_type = mapped_type
                    break
            
            files.append({
                "id": filename,
                "name": doc_type,
                "filename": filename,
                "path": f"uploads/dossier_etudiant/{student.id}/{filename}",
                "size": file_path.stat().st_size,
                "status": student.file_status or "pending",
                "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            })
    
    return files


@router.post("/me/files")
async def upload_my_file(
    current_user: User = Depends(require_role("student"))
):
    """Accès restreint : Le dépôt et la modification de documents officiels sont réservés au secrétariat"""
    raise HTTPException(
        status_code=403,
        detail="Le téléversement de documents officiels est réservé aux services de la scolarité et du secrétariat. Veuillez présenter vos pièces originales au secrétariat académique."
    )


@router.delete("/me/files/{filename}")
def delete_my_file(
    filename: str,
    current_user: User = Depends(require_role("student"))
):
    """Accès restreint : La suppression de pièces officielles du dossier est réservée à l'administration"""
    raise HTTPException(
        status_code=403,
        detail="La suppression de pièces officielles du dossier étudiant est exclusivement réservée à l'administration."
    )


# ==========================================
# ✅ CRUD ÉTUDIANT (par ID - Admin/Secretary)
# ⚠️ Doit être APRÈS toutes les routes /me/*
# ==========================================

@router.get("/{student_id}")
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "teacher", "student", "guard", "super_admin"))
):
    """Récupère un étudiant par ID avec enrichissement tarifaire et modalité mensuelle"""
    query = db.query(Student).filter(Student.id == student_id)
    if current_user.role != "super_admin" and current_user.university_id:
        query = query.filter(Student.university_id == current_user.university_id)
    student = query.first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    # Si le demandeur est un étudiant, il ne peut voir que sa propre fiche
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Enrichir avec la décomposition tarifaire et la modalité mensuelle
    res = {c.name: getattr(student, c.name) for c in student.__table__.columns}
    try:
        from app.utils.tuition import resolve_student_tuition_breakdown
        breakdown = resolve_student_tuition_breakdown(db, student, current_user.university_id, "scolarite")
        res["monthly_plan"] = breakdown.get("monthly_plan")
        res["base_tuition_amount"] = breakdown.get("base_amount")
    except Exception:
        pass
    return res


@router.put("/{student_id}")
async def update_student(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Met à jour un étudiant.

    Accepte multipart/form-data (formulaire d'édition, avec photo optionnelle) ET
    application/json (mise à jour partielle). Un corps JSON ne doit jamais provoquer
    de 422 « Field required » : les champs absents conservent leur valeur actuelle.
    """
    existing_student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not existing_student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    is_json = "application/json" in (request.headers.get("content-type") or "").lower()
    photo = None
    payload: dict = {}
    if is_json:
        try:
            body = await request.json()
            payload = body if isinstance(body, dict) else {}
        except Exception:
            payload = {}
    else:
        form = await request.form()
        payload = {k: v for k, v in form.items() if isinstance(v, str)}
        upload = form.get("photo") or form.get("file") or form.get("image") or form.get("avatar")
        if upload is None:
            for v in form.values():
                if hasattr(v, "read"):
                    upload = v
                    break
        if upload is not None:
            photo = upload

    def _txt(key, current=None):
        """Formulaire : champ absent = vidé (comportement historique). JSON : absent = inchangé."""
        if key in payload:
            val = payload[key]
            return None if val is None else str(val)
        return current if is_json else None

    def _required(key, current):
        val = payload.get(key)
        val = (str(val).strip() if val is not None else "") or (current or "")
        if not val:
            raise HTTPException(status_code=422, detail=f"Le champ '{key}' est obligatoire")
        return val

    first_name = _required("first_name", existing_student.first_name)
    last_name = _required("last_name", existing_student.last_name)
    email = _required("email", existing_student.email)
    filiere = _required("filiere", existing_student.filiere)
    level = _required("level", existing_student.level)
    domain = _txt("domain", existing_student.domain)
    date_of_birth = _txt("date_of_birth", existing_student.date_of_birth.isoformat() if getattr(existing_student, "date_of_birth", None) else None)
    place_of_birth = _txt("place_of_birth", existing_student.place_of_birth)
    gender = _txt("gender", existing_student.gender)
    nationality = _txt("nationality", existing_student.nationality)
    phone = _txt("phone", existing_student.phone)
    address = _txt("address", existing_student.address)
    parent_name = _txt("parent_name", existing_student.parent_name)
    parent_phone = _txt("parent_phone", existing_student.parent_phone)
    parent_email = _txt("parent_email", existing_student.parent_email)
    payment_plan = payload.get("payment_plan") or None
    monthly_deposit = payload.get("monthly_deposit")
    monthly_installment = payload.get("monthly_installment")
    monthly_months_count = payload.get("monthly_months_count")

    email = (email or "").strip().lower()
    if email != (existing_student.email or "").lower():
        existing_user = db.query(User).filter(func.lower(User.email) == email, User.id != existing_student.user_id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    existing_student.first_name = first_name
    existing_student.last_name = last_name
    existing_student.email = email
    existing_student.filiere = filiere
    existing_student.level = level
    if domain:
        existing_student.domain = domain
    existing_student.date_of_birth = parse_date_safely(date_of_birth)
    existing_student.place_of_birth = place_of_birth
    existing_student.gender = gender
    existing_student.nationality = nationality
    existing_student.phone = phone
    existing_student.address = address
    existing_student.parent_name = parent_name
    existing_student.parent_phone = parent_phone
    existing_student.parent_email = parent_email

    if payment_plan:
        existing_student.payment_plan = payment_plan
    if monthly_deposit is not None:
        try:
            dep_str = str(monthly_deposit).strip()
            existing_student.monthly_deposit = float(dep_str) if dep_str else None
        except (ValueError, TypeError):
            pass
    if monthly_installment is not None:
        try:
            inst_str = str(monthly_installment).strip()
            existing_student.monthly_installment = float(inst_str) if inst_str else None
        except (ValueError, TypeError):
            pass
    if monthly_months_count is not None:
        try:
            cnt_str = str(monthly_months_count).strip()
            existing_student.monthly_months_count = int(cnt_str) if cnt_str else 5
        except (ValueError, TypeError):
            pass
    
    new_photo_name = None
    if photo:
        content = None
        orig_filename = getattr(photo, "filename", None) or "photo.jpg"
        if hasattr(photo, "read"):
            content = await photo.read()
        elif isinstance(photo, (bytes, bytearray)):
            content = bytes(photo)
        if content and len(content) > 10:
            uploads_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            os.makedirs("uploads", exist_ok=True)
            ext = Path(orig_filename).suffix.lower() or ".jpg"
            if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                ext = ".jpg"
            photo_path = uploads_dir / f"STUDENT_{existing_student.id}_{int(time_module.time())}{ext}"
            saved_p = compress_and_save_upload(content, photo_path, max_dimension=1200, quality=82)
            new_photo_name = saved_p.name
            existing_student.photo = new_photo_name
            # Duplication de sécurité
            try:
                rel_p = Path("uploads") / saved_p.name
                if rel_p.resolve() != saved_p.resolve():
                    with open(rel_p, "wb") as f_rel:
                        f_rel.write(content)
            except Exception:
                pass

    user = db.query(User).filter(User.id == existing_student.user_id).first()
    if user:
        user.full_name = f"{first_name} {last_name}"
        user.email = email
        if new_photo_name:
            user.photo = new_photo_name

    db.commit()
    db.refresh(existing_student)
    return existing_student


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin", "secretary"))
):
    """Supprime un étudiant et nettoie proprement toutes ses dépendances (notes, paiements, présences, fichiers, etc.)"""
    query = db.query(Student).filter(Student.id == student_id)
    if current_user.role != "super_admin" and current_user.university_id:
        query = query.filter(Student.university_id == current_user.university_id)
    student = query.first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    user_id = student.user_id
    
    # 1. Supprimer les fichiers physiques du disque
    if student.qr_code:
        qr_path = os.path.join("qr_codes", os.path.basename(student.qr_code))
        if os.path.exists(qr_path):
            try:
                os.remove(qr_path)
            except Exception:
                pass
            
    if student.photo:
        photo_path = os.path.join("uploads", os.path.basename(student.photo))
        if os.path.exists(photo_path):
            try:
                os.remove(photo_path)
            except Exception:
                pass
                
    # Dossier physique de documents
    base_dir = Path(__file__).resolve().parent.parent.parent
    for sub_folder in ("dossier_etudiant", "dossiers"):
        dossier_dir = base_dir / "uploads" / sub_folder / str(student_id)
        if dossier_dir.exists():
            try:
                shutil.rmtree(str(dossier_dir))
            except Exception:
                pass

    # 2. Supprimer toutes les dépendances en base de données selon l'ordre strict des clés étrangères
    try:
        # A. Relations Alumni : supprimer d'abord les messages liés aux connexions
        from app.models.alumni import AlumniConnection, AlumniMessage
        from app.models.alumni_profile import AlumniProfile
        conn_ids = [c.id for c in db.query(AlumniConnection.id).filter(AlumniConnection.student_id == student_id).all()]
        if conn_ids:
            db.query(AlumniMessage).filter(AlumniMessage.connection_id.in_(conn_ids)).delete(synchronize_session=False)
        if user_id:
            db.query(AlumniMessage).filter((AlumniMessage.sender_id == user_id) | (AlumniMessage.receiver_id == user_id)).delete(synchronize_session=False)
        db.query(AlumniConnection).filter(AlumniConnection.student_id == student_id).delete(synchronize_session=False)
        db.query(AlumniProfile).filter((AlumniProfile.student_id == student_id) | (AlumniProfile.user_id == user_id)).delete(synchronize_session=False)
    except Exception as e:
        logger.warning(f"Nettoyage alumni pour student {student_id}: {e}")

    try:
        # B. Paiements, Relances & Écritures au Grand Livre liées aux paiements de cet étudiant
        from app.models.payment_installment import PaymentInstallment
        from app.models.payment_reminder import PaymentReminder
        from app.models.payment import Payment
        from app.models.ledger import JournalEntry, JournalEntryLine
        p_ids = [r[0] for r in db.query(Payment.id).filter(Payment.student_id == student_id).all()]
        if p_ids:
            je_ids = [
                r[0] for r in db.query(JournalEntry.id).filter(
                    JournalEntry.source == "payment",
                    JournalEntry.source_id.in_(p_ids)
                ).all()
            ]
            if je_ids:
                db.query(JournalEntryLine).filter(JournalEntryLine.journal_entry_id.in_(je_ids)).delete(synchronize_session=False)
                db.query(JournalEntry).filter(JournalEntry.id.in_(je_ids)).delete(synchronize_session=False)
        db.query(PaymentReminder).filter(PaymentReminder.student_id == student_id).delete(synchronize_session=False)
        db.query(PaymentInstallment).filter(PaymentInstallment.student_id == student_id).delete(synchronize_session=False)
        db.query(Payment).filter(Payment.student_id == student_id).delete(synchronize_session=False)
    except Exception as e:
        logger.warning(f"Nettoyage paiements pour student {student_id}: {e}")

    try:
        # C. Notes, Délibérations et Bulletins
        from app.models.grade import Grade
        from app.models.deliberation import DeliberationDecision
        from app.models.report_card import ReportCard
        from app.models.student_academic_history import StudentAcademicHistory
        db.query(Grade).filter(Grade.student_id == student_id).delete(synchronize_session=False)
        db.query(DeliberationDecision).filter(DeliberationDecision.student_id == student_id).delete(synchronize_session=False)
        db.query(ReportCard).filter(ReportCard.student_id == student_id).delete(synchronize_session=False)
        db.query(StudentAcademicHistory).filter(StudentAcademicHistory.student_id == student_id).delete(synchronize_session=False)
    except Exception as e:
        logger.warning(f"Nettoyage académique pour student {student_id}: {e}")

    try:
        # D. Présences, Scans, Documents et Certificats
        from app.models.attendance import Attendance
        from app.models.scan_session import ScanSession
        from app.models.document import Document
        from app.models.certificate_request import CertificateRequest
        db.query(Attendance).filter(Attendance.student_id == student_id).delete(synchronize_session=False)
        db.query(ScanSession).filter(ScanSession.student_id == student_id).delete(synchronize_session=False)
        db.query(Document).filter(Document.student_id == student_id).delete(synchronize_session=False)
        db.query(CertificateRequest).filter(CertificateRequest.student_id == student_id).delete(synchronize_session=False)
    except Exception as e:
        logger.warning(f"Nettoyage présences/documents pour student {student_id}: {e}")

    try:
        # E. Incidents
        from app.models.incident import Incident
        db.query(Incident).filter(Incident.student_id == student_id).delete(synchronize_session=False)
        if user_id:
            db.query(Incident).filter(Incident.reported_by == user_id).update({Incident.reported_by: current_user.id}, synchronize_session=False)
    except Exception as e:
        logger.warning(f"Nettoyage incidents pour student {student_id}: {e}")

    # 3. Supprimer l'étudiant
    # D'abord détacher user_id pour éviter tout verrouillage circulaire
    student.user_id = None
    db.flush()
    db.delete(student)
    db.commit()

    # 4. Supprimer le compte utilisateur User s'il existe
    if user_id:
        try:
            from app.models.message import Message
            from app.models.notification import Notification
            from app.models.password_reset_otp import PasswordResetOTP
            from app.models.password_reset_request import PasswordResetRequest
            from app.models.audit_log import AuditLog
            from app.models.attendance import Attendance
            from app.models.document import Document
            from app.models.payment import Payment
            from app.models.grade import Grade

            db.query(Message).filter((Message.sender_id == user_id) | (Message.recipient_id == user_id)).update({Message.parent_id: None}, synchronize_session=False)
            db.query(Message).filter((Message.sender_id == user_id) | (Message.recipient_id == user_id)).delete(synchronize_session=False)
            db.query(Notification).filter((Notification.recipient_id == user_id) | (Notification.created_by == user_id)).delete(synchronize_session=False)
            db.query(PasswordResetOTP).filter(PasswordResetOTP.user_id == user_id).delete(synchronize_session=False)
            db.query(PasswordResetRequest).filter((PasswordResetRequest.user_id == user_id) | (PasswordResetRequest.handled_by == user_id)).delete(synchronize_session=False)
            db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None}, synchronize_session=False)
            db.query(Attendance).filter(Attendance.scanned_by == user_id).update({Attendance.scanned_by: None}, synchronize_session=False)
            db.query(Document).filter(Document.generated_by == user_id).update({Document.generated_by: None}, synchronize_session=False)
            db.query(Payment).filter((Payment.paid_by == user_id) | (Payment.created_by == user_id)).update({Payment.paid_by: None, Payment.created_by: None}, synchronize_session=False)
            db.query(Grade).filter((Grade.graded_by == user_id) | (Grade.validated_by == user_id) | (Grade.rejected_by == user_id)).update({Grade.graded_by: None, Grade.validated_by: None, Grade.rejected_by: None}, synchronize_session=False)

            user = db.query(User).filter(User.id == user_id).first()
            if user:
                db.delete(user)
                db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Avertissement lors de la suppression de l'utilisateur {user_id}: {e}")
        
    return {"message": "Étudiant supprimé avec succès", "id": student_id}


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
    
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    os.makedirs("uploads/student_documents", exist_ok=True)
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    filename = f"{doc_type}_{student_id}_{int(time_module.time())}.{ext}"
    filepath = os.path.join("uploads/student_documents", filename)
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")
    
    with open(filepath, "wb") as buffer:
        buffer.write(content)
    
    setattr(student, doc_type, filename)
    
    required_docs = ["birth_certificate", "previous_diploma", "id_document"]
    all_present = all(getattr(student, doc, None) for doc in required_docs)
    student.file_status = "complete" if all_present else "incomplete"
    
    db.commit()
    
    return {
        "message": "Document uploadé avec succès",
        "filename": filename,
        "file_status": student.file_status
    }

# ==========================================
# ✅ VALIDATION DES DOCUMENTS (Secrétaire/Admin)
# ==========================================

@router.get("/documents/pending")
def get_pending_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Récupère tous les documents en attente de validation"""
    import os
    from pathlib import Path
    
    # Récupérer tous les étudiants de l'université
    students = db.query(Student).filter(
        Student.university_id == current_user.university_id
    ).all()
    
    pending_docs = []
    
    for student in students:
        student_folder = Path(f"uploads/dossier_etudiant/{student.id}")
        
        if not student_folder.exists():
            continue
        
        for file_path in student_folder.iterdir():
            if file_path.is_file():
                filename = file_path.name
                
                # Déterminer le type
                doc_type = "other"
                if filename.startswith("cni_"):
                    doc_type = "cni"
                elif filename.startswith("birth_certificate_"):
                    doc_type = "birth_certificate"
                elif filename.startswith("photo_"):
                    doc_type = "photo"
                elif filename.startswith("bac_"):
                    doc_type = "bac"
                
                pending_docs.append({
                    "student_id": student.id,
                    "student_name": f"{student.first_name} {student.last_name}",
                    "matricule": student.matricule,
                    "level": student.level,
                    "filiere": student.filiere,
                    "document_type": doc_type,
                    "filename": filename,
                    "path": f"uploads/dossier_etudiant/{student.id}/{filename}",
                    "size": file_path.stat().st_size,
                    "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })
    
    # Trier par date décroissante
    pending_docs.sort(key=lambda x: x['uploaded_at'], reverse=True)
    
    return pending_docs


@router.post("/documents/{student_id}/{filename}/validate")
def validate_document(
    student_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Valide un document étudiant"""
    import os
    from pathlib import Path
    
    # Vérifier que l'étudiant appartient à l'université
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    file_path = Path(f"uploads/dossier_etudiant/{student_id}/{filename}")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Déplacer vers un dossier "validated"
    validated_folder = Path(f"uploads/dossier_etudiant/{student_id}/validated")
    validated_folder.mkdir(parents=True, exist_ok=True)
    
    validated_path = validated_folder / filename
    
    try:
        shutil.move(str(file_path), str(validated_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de déplacement: {str(e)}")
    
    # Mettre à jour le statut du dossier de l'étudiant
    update_file_status(db, student, validated_folder)
    
    # TODO : Notifier l'étudiant (optionnel)
    # send_notification(student.user_id, "Document validé", f"Votre document {filename} a été validé")
    
    return {
        "message": "Document validé avec succès",
        "new_path": str(validated_path)
    }


@router.post("/documents/{student_id}/{filename}/reject")
def reject_document(
    student_id: int,
    filename: str,
    reason: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Rejette un document étudiant"""
    import os
    from pathlib import Path
    
    # Vérifier que l'étudiant appartient à l'université
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    file_path = Path(f"uploads/dossier_etudiant/{student_id}/{filename}")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Supprimer le fichier rejeté
    try:
        file_path.unlink()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de suppression: {str(e)}")
    
    # TODO : Notifier l'étudiant avec la raison du rejet
    # send_notification(student.user_id, "Document rejeté", f"Raison: {reason}")
    
    return {
        "message": "Document rejeté",
        "reason": reason
    }


def update_file_status(db: Session, student: Student, validated_folder: Path):
    """Met à jour le statut du dossier de l'étudiant sur la session active"""
    required_docs = ["cni", "birth_certificate", "photo"]
    validated_count = 0
    for doc_type in required_docs:
        if any(f.name.startswith(f"{doc_type}_") for f in validated_folder.iterdir() if f.is_file()):
            validated_count += 1
    student.file_status = "complete" if validated_count >= len(required_docs) else "incomplete"
    db.commit()


@router.post("/{student_id}/photo")
async def upload_student_photo_by_staff(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Upload ou mise à jour directe de la photo d'identité d'un étudiant (multipart ou Base64 JSON)"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    content_type = (request.headers.get("content-type") or "").lower()
    content: Optional[bytes] = None
    orig_filename = "student.jpg"

    if "application/json" in content_type:
        try:
            payload = await request.json()
            b64_data = payload.get("photo_base64") or payload.get("photo") or payload.get("file") or payload.get("image")
            orig_filename = payload.get("filename") or "student.jpg"
            if isinstance(b64_data, str) and b64_data.strip():
                raw_b64 = b64_data.split(",", 1)[1] if "," in b64_data else b64_data
                content = base64.b64decode(raw_b64)
        except Exception:
            pass
    else:
        try:
            form = await request.form()
            uploaded = form.get("photo") or form.get("file") or form.get("image") or form.get("avatar")
            if uploaded is None:
                for v in form.values():
                    if hasattr(v, "read"):
                        uploaded = v
                        break
            if uploaded is not None:
                if hasattr(uploaded, "read"):
                    orig_filename = getattr(uploaded, "filename", None) or "student.jpg"
                    content = await uploaded.read()
                elif isinstance(uploaded, (bytes, bytearray)):
                    content = bytes(uploaded)
                elif isinstance(uploaded, str) and uploaded.strip():
                    raw_b64 = uploaded.split(",", 1)[1] if "," in uploaded else uploaded
                    try:
                        content = base64.b64decode(raw_b64)
                    except Exception:
                        pass
        except Exception:
            pass

    if not content and content_type.startswith("image/"):
        content = await request.body()

    if not content:
        raise HTTPException(status_code=400, detail="Aucune image valide reçue")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="L'image ne doit pas dépasser 10 Mo")

    uploads_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    os.makedirs("uploads", exist_ok=True)

    ext = Path(orig_filename).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        ext = ".jpg"
    target_path = uploads_dir / f"STUDENT_{student.id}_{int(time_module.time())}{ext}"
    saved_p = compress_and_save_upload(content, target_path, max_dimension=1200, quality=82)

    rel_p = Path("uploads") / saved_p.name
    if rel_p.resolve() != saved_p.resolve():
        try:
            with open(rel_p, "wb") as f_rel:
                f_rel.write(content)
        except Exception:
            pass

    student.photo = saved_p.name
    if student.user_id:
        u = db.query(User).filter(User.id == student.user_id).first()
        if u:
            u.photo = saved_p.name
    db.commit()
    return {"message": "Photo mise à jour avec succès", "photo": saved_p.name, "photo_url": f"/uploads/{saved_p.name}"}


@router.get("/{student_id}/card")
def get_student_card_by_id(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "student"))
):
    """Récupère toutes les données nécessaires pour afficher/imprimer la carte étudiante depuis la fiche 360°"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    university = db.query(University).filter(University.id == student.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")

    photo_url = None
    if student.photo:
        clean_p = str(student.photo).replace("\\", "/").lstrip("/")
        if clean_p.startswith(("http://", "https://")):
            photo_url = clean_p
        elif clean_p.startswith("uploads/"):
            photo_url = f"/{clean_p}"
        else:
            photo_url = f"/uploads/{clean_p}"

    logo_url = None
    if getattr(university, "logo", None):
        clean_l = str(university.logo).replace("\\", "/").lstrip("/")
        if clean_l.startswith(("http://", "https://")):
            logo_url = clean_l
        elif clean_l.startswith("uploads/"):
            logo_url = f"/{clean_l}"
        elif clean_l.startswith("logos/"):
            logo_url = f"/uploads/{clean_l}"
        else:
            logo_url = f"/uploads/logos/{clean_l}"

    return {
        "student": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "matricule": student.matricule,
            "level": student.level,
            "filiere": student.filiere,
            "domain": getattr(student, "domain", "") or "",
            "date_of_birth": student.date_of_birth.strftime("%d/%m/%Y") if student.date_of_birth else None,
            "email": student.email,
            "phone": student.phone,
            "address": getattr(student, "address", ""),
            "nationality": getattr(student, "nationality", ""),
            "photo": photo_url,
            "qr_code": f"/api/v1/students/{student.id}/qrcode",
        },
        "university": {
            "id": university.id,
            "name": university.name,
            "slogan": getattr(university, "slogan", ""),
            "logo": logo_url,
            "academic_year": getattr(university, "academic_year", None) or get_current_academic_year(db, student.university_id),
            "address": getattr(university, "address", ""),
            "phone": getattr(university, "phone", ""),
            "email": getattr(university, "email", ""),
        },
        "config": university.card_config or {},
    }


@router.get("/{student_id}/complete-dossier")
def get_student_complete_dossier(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "super_admin", "superadmin"))
):
    """
    Fiche Complète 360° de l'étudiant : agrège en un seul appel ultra-rapide et déterministe :
    - Coordonnées personnelles, académiques, parentales & carte étudiante
    - Notes détaillées par matière / UE / session d'examen
    - Sessions d'examen & bulletins disponibles
    - Situation financière exacte, tranches/mensualités & historique complet des reçus
    - Pièces du dossier administratif & actes officiels générés
    - Historique des présences & statistiques d'assiduité
    """
    query = db.query(Student).filter(Student.id == student_id)
    if current_user.role not in ("super_admin", "superadmin") and current_user.university_id:
        query = query.filter(Student.university_id == current_user.university_id)
    student = query.first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    univ_id = student.university_id
    university = db.query(University).filter(University.id == univ_id).first()

    # 1. Coordonnées enrichies
    student_data = {c.name: getattr(student, c.name) for c in student.__table__.columns}
    if student.date_of_birth and hasattr(student.date_of_birth, "isoformat"):
        student_data["date_of_birth"] = student.date_of_birth.isoformat()
    if student.created_at and hasattr(student.created_at, "isoformat"):
        student_data["created_at"] = student.created_at.isoformat()

    # 2. Notes & Sessions d'examen
    from app.models.teaching_unit import TeachingUnit
    from app.models.report_card import ReportCard

    sessions = (
        db.query(ExamSession)
        .filter(ExamSession.university_id == univ_id)
        .order_by(ExamSession.start_date.desc(), ExamSession.id.desc())
        .all()
    )
    sessions_map = {s.id: s for s in sessions}

    grades_rows = (
        db.query(Grade, Course)
        .outerjoin(Course, Grade.course_id == Course.id)
        .filter(Grade.student_id == student.id)
        .order_by(Grade.session_id.desc(), Grade.id.asc())
        .all()
    )
    tu_ids = {c.teaching_unit_id for _, c in grades_rows if c and getattr(c, "teaching_unit_id", None)}
    tu_map = {
        tu.id: tu
        for tu in (db.query(TeachingUnit).filter(TeachingUnit.id.in_(tu_ids)).all() if tu_ids else [])
    }

    grades_list = []
    total_weighted = 0.0
    total_credits = 0
    obtained_credits = 0

    for g, c in grades_rows:
        credits = (c.credits if c and c.credits else (g.coefficient or 3))
        score = float(g.score) if g.score is not None else None
        if score is not None:
            total_weighted += score * credits
            total_credits += credits
            if score >= 10.0:
                obtained_credits += credits
        tu_obj = tu_map.get(c.teaching_unit_id) if (c and getattr(c, "teaching_unit_id", None)) else None
        sess_obj = sessions_map.get(g.session_id)
        grades_list.append({
            "id": g.id,
            "session_id": g.session_id,
            "session_name": sess_obj.name if sess_obj else "Session Générale",
            "course_id": c.id if c else g.course_id,
            "course_code": c.code if c else "-",
            "course_title": c.title if c else "Module",
            "semester": getattr(c, "semester", None) if c else None,
            "ue_code": tu_obj.code if tu_obj else None,
            "ue_name": tu_obj.name if tu_obj else None,
            "cc_score": g.cc_score,
            "exam_score": g.exam_score,
            "score": score,
            "credits": credits,
            "status": g.status or ("validated" if (score is not None and score >= 10) else "graded"),
            "validated": bool(score is not None and score >= 10.0),
            "comment": g.comment,
        })

    overall_average = round(total_weighted / total_credits, 2) if total_credits > 0 else None

    report_cards = (
        db.query(ReportCard)
        .filter(ReportCard.student_id == student.id)
        .order_by(ReportCard.id.desc())
        .all()
    )
    report_cards_list = [
        {
            "id": rc.id,
            "session_id": rc.session_id,
            "session_name": sessions_map[rc.session_id].name if rc.session_id in sessions_map else f"Session #{rc.session_id}",
            "average": rc.average,
            "mention": rc.mention,
            "rank": rc.rank,
            "total_credits": rc.total_credits,
            "obtained_credits": rc.obtained_credits,
            "status": rc.status,
            "generated_at": rc.generated_at.isoformat() if getattr(rc, "generated_at", None) else None,
        }
        for rc in report_cards
    ]

    sessions_summary = []
    for s in sessions:
        s_grades = [gr for gr in grades_list if gr["session_id"] == s.id and gr["score"] is not None]
        s_cr = sum(gr["credits"] for gr in s_grades)
        s_obt = sum(gr["credits"] for gr in s_grades if gr["score"] >= 10.0)
        s_avg = round(sum(gr["score"] * gr["credits"] for gr in s_grades) / s_cr, 2) if s_cr > 0 else None
        sessions_summary.append({
            "id": s.id,
            "name": s.name,
            "session_type": getattr(s, "session_type", "normal"),
            "academic_year": getattr(s, "academic_year", None),
            "start_date": s.start_date.isoformat() if getattr(s, "start_date", None) else None,
            "grades_count": len(s_grades),
            "average": s_avg,
            "total_credits": s_cr,
            "obtained_credits": s_obt,
        })

    # 3. Paiements, Tranches & Reçus
    from app.api.payments import get_student_payment_summary
    payment_summary = get_student_payment_summary(student_id=student.id, db=db, current_user=current_user)

    # 4. Documents officiels déjà générés & Carte Étudiante
    generated_docs = (
        db.query(Document)
        .filter(Document.student_id == student.id)
        .order_by(Document.created_at.desc(), Document.id.desc())
        .all()
    )
    generated_docs_list = [
        {
            "id": d.id,
            "document_type": d.document_type,
            "title": d.title,
            "file_path": d.file_path,
            "download_count": d.download_count or 0,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in generated_docs
    ]

    card_data = get_student_card_by_id(student_id=student.id, db=db, current_user=current_user)

    # 5. Présences & Assiduité
    att_rows = (
        db.query(Attendance, Course)
        .outerjoin(Course, Attendance.course_id == Course.id)
        .filter(Attendance.student_id == student.id)
        .order_by(Attendance.id.desc())
        .limit(100)
        .all()
    )
    all_att_statuses = [r[0].status for r in db.query(Attendance.status).filter(Attendance.student_id == student.id).all()]
    total_att = len(all_att_statuses)
    present_att = sum(1 for st in all_att_statuses if st == "present")
    late_att = sum(1 for st in all_att_statuses if st == "late")
    absent_att = sum(1 for st in all_att_statuses if st == "absent")
    excused_att = sum(1 for st in all_att_statuses if st == "excused")
    att_rate = round(((present_att + late_att) / total_att) * 100, 1) if total_att > 0 else 100.0

    attendance_records = []
    for att, crs in att_rows:
        att_dt = getattr(att, "date", None) or getattr(att, "scanned_at", None) or getattr(att, "created_at", None)
        attendance_records.append({
            "id": att.id,
            "status": att.status,
            "course_title": crs.title if crs else (getattr(att, "notes", None) or "Contrôle Campus"),
            "date": att_dt.isoformat() if hasattr(att_dt, "isoformat") else (str(att_dt) if att_dt else None),
            "late_minutes": getattr(att, "late_minutes", 0) or 0,
            "notes": getattr(att, "notes", None),
        })

    return {
        "student": student_data,
        "university": card_data.get("university"),
        "card": card_data,
        "academics": {
            "overall_average": overall_average,
            "total_credits": total_credits,
            "obtained_credits": obtained_credits,
            "grades": grades_list,
            "sessions": sessions_summary,
            "report_cards": report_cards_list,
        },
        "financials": payment_summary,
        "documents": {
            "generated": generated_docs_list,
        },
        "attendance": {
            "total": total_att,
            "present": present_att,
            "late": late_att,
            "absent": absent_att,
            "excused": excused_att,
            "rate": att_rate,
            "records": attendance_records,
        },
    }


@router.post("/{student_id}/reset-password")
def reset_student_password(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Réinitialiser le mot de passe d'un étudiant"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    temp_password = secrets.token_urlsafe(8)

    user = db.query(User).filter(User.id == student.user_id).first()
    if user:
        user.hashed_password = hash_password(temp_password)
        db.commit()

        send_password_reset_email(
            to_email=user.email,
            full_name=user.full_name,
            new_password=temp_password
        )

        return {
            "temp_password": temp_password,
            "message": "Mot de passe réinitialisé avec succès"
        }

    raise HTTPException(status_code=404, detail="Utilisateur associé non trouvé")