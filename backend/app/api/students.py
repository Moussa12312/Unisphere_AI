from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Request
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
from app.utils.email_validator import validate_email_exists
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
    """Supprime les utilisateurs étudiants orphelins (sans Student associé)"""
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
    discount_amount: Optional[float] = Form(0.0),
    discount_percentage: Optional[float] = Form(0.0),
    discount_reason: Optional[str] = Form(None),
    discount_approved_by: Optional[str] = Form(None),
    net_tuition_amount: Optional[float] = Form(None),
    # Modalité de paiement (tranches vs mensuel)
    payment_plan: Optional[str] = Form("tranches"),
    monthly_deposit: Optional[float] = Form(None),
    monthly_installment: Optional[float] = Form(None),
    monthly_months_count: Optional[int] = Form(5),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Créer un nouvel étudiant avec son dossier d'inscription adapté (Nouveau vs Ancien)"""
    cleanup_orphan_users(db, current_user.university_id)
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    is_valid, error_msg = validate_email_exists(email)
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
            base_fee = None
            if domain:
                base_fee = db.query(AcademicFee).filter(
                    AcademicFee.university_id == current_user.university_id,
                    AcademicFee.level == level,
                    AcademicFee.domain == domain,
                    AcademicFee.payment_type == "scolarite"
                ).first()
            if not base_fee:
                base_fee = db.query(AcademicFee).filter(
                    AcademicFee.university_id == current_user.university_id,
                    AcademicFee.level == level,
                    AcademicFee.payment_type == "scolarite"
                ).first()
            base_val = base_fee.amount if base_fee else 450000.0
            if float(discount_amount or 0.0) > 0:
                computed_net = max(0.0, base_val - float(discount_amount))
            elif float(discount_percentage or 0.0) > 0:
                computed_net = max(0.0, round(base_val * (1.0 - float(discount_percentage) / 100.0)))

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
            discount_amount=float(discount_amount or 0.0),
            discount_percentage=float(discount_percentage or 0.0),
            discount_reason=discount_reason,
            discount_approved_by=discount_approved_by,
            net_tuition_amount=computed_net,
            payment_plan=payment_plan or "tranches",
            monthly_deposit=float(monthly_deposit) if monthly_deposit is not None else None,
            monthly_installment=float(monthly_installment) if monthly_installment is not None else None,
            monthly_months_count=int(monthly_months_count) if monthly_months_count is not None else 5
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

        # Photo de profil (avec compression automatique)
        if photo and photo.filename and getattr(photo, "size", 1) > 0:
            os.makedirs("uploads", exist_ok=True)
            photo_filename = f"STUDENT_{new_student.id}_{int(time_module.time())}.jpg"
            photo_path = Path("uploads") / photo_filename
            
            content = await photo.read()
            saved_p = compress_and_save_upload(content, photo_path, max_dimension=1200, quality=82)
            new_student.photo = saved_p.name

        # Dossier de l'étudiant (créé uniquement à la demande si des fichiers sont téléversés)
        dossier_dir = Path(f"uploads/dossier_etudiant/{new_student.id}")

        async def save_dossier_file(file_obj, prefix, doc_title):
            if file_obj and file_obj.filename and getattr(file_obj, "size", 1) > 0:
                dossier_dir.mkdir(parents=True, exist_ok=True)
                ext = Path(file_obj.filename).suffix.lower() or ".pdf"
                fname = f"{prefix}_{new_student.id}_{int(time_module.time())}{ext}"
                target_path = dossier_dir / fname
                c = await file_obj.read()
                saved_target = compress_and_save_upload(c, target_path, max_dimension=1600, quality=80)
                
                # Enregistrer dans la table Document
                doc_record = Document(
                    document_type=prefix,
                    title=f"{doc_title} - {first_name} {last_name}",
                    file_path=str(saved_target),
                    student_id=new_student.id,
                    generated_by=current_user.id,
                    university_id=current_user.university_id
                )
                db.add(doc_record)
                return str(saved_target)
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

        # Envoi des identifiants par email
        send_credentials_email(
            to_email=email,
            full_name=f"{first_name} {last_name}",
            password=temp_password,
            role="student",
            university_name=univ_name
        )

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

        # Vérifier si l'email existe déjà
        existing_user = db.query(User).filter(User.email == em).first()
        if existing_user:
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

            # 7. Notification email optionnelle (ne bloque pas si échec smtp)
            try:
                send_credentials_email(
                    to_email=em,
                    full_name=f"{fn} {ln}",
                    password=temp_password,
                    role="student",
                    university_name=univ_name
                )
            except Exception:
                pass

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
        "Traoré", "Moussa", "moussa.traore@ecob.edu.ml", "Génie Logiciel", "L1", "Informatique & Technologies",
        "+223 70 00 00 01", "2004-05-15", "Bamako", "M", "Malienne", "Hamdallaye ACI 2000",
        "Mariam Traoré", "+223 60 00 00 01", "mariam.traore@gmail.com", "Nouveau", "Tranches"
    ]
    sample2 = [
        "Coulibaly", "Fatoumata", "fatoumata.coulibaly@ecob.edu.ml", "Sciences Économiques & Gestion", "L1", "Gestion & Economie",
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
    if not HAS_OPENPYXL:
        raise HTTPException(status_code=500, detail="openpyxl n'est pas disponible sur le serveur")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Étudiants"

    headers = [
        "Nom", "Prénom", "Email", "Filière", "Niveau", "Domaine", "Téléphone",
        "Date de naissance", "Lieu de naissance", "Genre", "Nationalité", "Adresse",
        "Nom Parent", "Téléphone Parent", "Email Parent", "Type Inscription", "Plan Paiement"
    ]
    sample1 = [
        "Traoré", "Moussa", "moussa.traore@ecob.edu.ml", "Génie Logiciel", "L1", "Informatique & Technologies",
        "+223 70 00 00 01", "2004-05-15", "Bamako", "M", "Malienne", "Hamdallaye ACI 2000",
        "Mariam Traoré", "+223 60 00 00 01", "mariam.traore@gmail.com", "Nouveau", "Tranches"
    ]
    sample2 = [
        "Coulibaly", "Fatoumata", "fatoumata.coulibaly@ecob.edu.ml", "Sciences Économiques & Gestion", "L1", "Gestion & Economie",
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

    # 1. Traitement fichier Excel
    if ext in ("xlsx", "xls"):
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
                        row_dict[h] = str(val).strip() if val is not None else ""
                if row_dict:
                    parsed_rows.append(row_dict)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erreur de lecture du fichier Excel: {str(e)}")

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
        academic_year=get_current_academic_year(),
        status="pending",
        file_status="incomplete"
    )
    db.add(new_student)
    db.flush()

    # 7. Dossier uploads
    upload_dir = Path(f"uploads/dossier_etudiant/{new_student.id}")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Photo de profil (optimisée et compressée)
    if photo and photo.filename:
        photo_dir = Path("uploads/photos")
        photo_dir.mkdir(parents=True, exist_ok=True)
        photo_ext = Path(photo.filename).suffix.lower() or ".jpg"
        photo_name = f"student_{new_student.id}_{int(datetime.now().timestamp())}{photo_ext}"
        photo_path = photo_dir / photo_name
        photo_bytes = await photo.read()
        saved_photo = compress_and_save_upload(photo_bytes, photo_path, max_dimension=1200, quality=82)
        new_student.photo = f"uploads/photos/{saved_photo.name}"

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
            ext = Path(upload_file.filename).suffix.lower() or ".pdf"
            fname = f"{doc_key}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{ext}"
            fpath = upload_dir / fname
            saved_fpath = compress_and_save_upload(file_bytes, fpath, max_dimension=1600, quality=80)
            
            rel_path = f"uploads/dossier_etudiant/{new_student.id}/{saved_fpath.name}"
            setattr(new_student, doc_key, rel_path)

            doc_entry = Document(
                title=f"{doc_key} - {new_student.first_name} {new_student.last_name}",
                file_path=rel_path,
                file_type=upload_file.content_type or "application/octet-stream",
                file_size=saved_fpath.stat().st_size if saved_fpath.exists() else len(file_bytes),
                university_id=university_id,
                uploaded_by=new_user.id
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
        qr_dir = Path("uploads/qrcodes")
        qr_dir.mkdir(parents=True, exist_ok=True)
        qr_filename = f"qr_{new_student.matricule.replace('/', '_')}.png"
        qr_path = qr_dir / qr_filename
        qr_img.save(str(qr_path))
        new_student.qr_code = f"uploads/qrcodes/{qr_filename}"
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
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Consulter l'état détaillé du dossier de l'étudiant avec checklist adapté"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

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

    # Assigner à l'attribut de l'étudiant
    setattr(student, resolved_type, str(saved_target))

    # Enregistrer dans la table Document
    doc_record = Document(
        document_type=resolved_type,
        title=f"{allowed_types[resolved_type]} - {student.first_name} {student.last_name}",
        file_path=str(saved_target),
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
        "file_path": str(target_path),
        "file_status": student.file_status
    }


@router.get("/{student_id}/dossier/download/{doc_type}")
def download_dossier_document(
    student_id: int,
    doc_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Télécharger ou afficher une pièce spécifique du dossier de l'étudiant"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    file_path_str = getattr(student, doc_type, None)
    if not file_path_str or not Path(file_path_str).exists():
        raise HTTPException(status_code=404, detail="Document non trouvé ou non encore téléversé")

    fpath = Path(file_path_str)
    media_type = "application/pdf" if fpath.suffix.lower() == ".pdf" else "image/jpeg"
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

    # Résoudre le tarif standard de base (domaine + niveau)
    fee = None
    if student.domain:
        fee = db.query(AcademicFee).filter(
            AcademicFee.university_id == current_user.university_id,
            AcademicFee.level == student.level,
            AcademicFee.domain == student.domain,
            AcademicFee.payment_type == 'scolarite'
        ).first()

    if not fee:
        fee = db.query(AcademicFee).filter(
            AcademicFee.university_id == current_user.university_id,
            AcademicFee.level == student.level,
            AcademicFee.payment_type == 'scolarite'
        ).first()

    base_fee = fee.amount if fee else 0.0

    if net_tuition_amount is not None and float(net_tuition_amount) >= 0:
        net_val = float(net_tuition_amount)
        discount_amount = max(0.0, base_fee - net_val) if base_fee > 0 else 0.0
    elif discount_amount > 0:
        net_val = max(0.0, base_fee - discount_amount) if base_fee > 0 else 0.0
    elif discount_percentage > 0:
        discount_amount = round(base_fee * (discount_percentage / 100.0))
        net_val = max(0.0, base_fee - discount_amount)
    else:
        net_val = base_fee
        discount_amount = 0.0

    student.discount_amount = discount_amount
    student.discount_percentage = discount_percentage
    student.discount_reason = discount_reason
    student.discount_approved_by = discount_approved_by
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
    
    # Si le fichier existe déjà, le renvoyer directement
    if os.path.exists(qr_path) and os.path.getsize(qr_path) > 0:
        return FileResponse(qr_path, media_type="image/png", filename=f"QR_{student.matricule or student.id}.png")
    
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
        db.commit()
    
    return FileResponse(qr_path, media_type="image/png", filename=f"QR_{student.matricule or student.id}.png")


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
    
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Format non supporté (JPG, PNG uniquement)")
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 5 Mo)")
    
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
    student_folder = base_dir / "uploads" / "dossier_etudiant" / str(student.id)
    if not student_folder.exists():
        fallback_folder = Path(f"uploads/dossier_etudiant/{student.id}")
        if fallback_folder.exists():
            student_folder = fallback_folder
        else:
            return []
    
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

    files = []
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
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Upload un fichier dans le dossier de l'étudiant et met à jour son profil"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez JPG, PNG ou PDF.")
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")
    
    base_dir = Path(__file__).resolve().parent.parent.parent
    student_folder = base_dir / "uploads" / "dossier_etudiant" / str(student.id)
    student_folder.mkdir(parents=True, exist_ok=True)
    
    # Supprimer l'ancien fichier du même type
    for existing_file in student_folder.iterdir():
        if existing_file.name.startswith(f"{document_type}_"):
            try:
                existing_file.unlink()
            except Exception:
                pass
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    filename = f"{document_type}_{timestamp}{ext}"
    file_path = student_folder / filename
    
    saved_file = compress_and_save_upload(content, file_path, max_dimension=1600, quality=80)

    rel_path = f"uploads/dossier_etudiant/{student.id}/{saved_file.name}"
    
    # Mettre à jour l'attribut du modèle Student
    col_name = "id_document" if document_type == "cni" else document_type
    if hasattr(student, col_name):
        setattr(student, col_name, rel_path)
    
    # Recalculer complétude
    st_type = student.student_type or "new"
    if st_type == "new":
        has_req = all([
            student.birth_certificate,
            student.bac_diploma,
            student.bac_transcript,
            student.id_document
        ])
    else:
        has_req = all([
            student.previous_transcript,
            student.success_certificate,
            student.financial_clearance
        ])
    
    if student.file_status != "validated":
        student.file_status = "complete" if has_req else "incomplete"

    db.commit()
    db.refresh(student)
    
    return {
        "message": "Fichier uploadé avec succès",
        "filename": filename,
        "path": rel_path,
        "file_status": student.file_status
    }


@router.delete("/me/files/{filename}")
def delete_my_file(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Supprime un fichier du dossier de l'étudiant"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    base_dir = Path(__file__).resolve().parent.parent.parent
    file_path = base_dir / "uploads" / "dossier_etudiant" / str(student.id) / filename
    
    if not file_path.exists():
        fallback = Path(f"uploads/dossier_etudiant/{student.id}/{filename}")
        if fallback.exists():
            file_path = fallback
        else:
            raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    file_path.unlink()

    # Nettoyer l'attribut correspondant si c'est le fichier actif
    for attr in [
        "birth_certificate", "bac_diploma", "bac_transcript", "id_document",
        "medical_certificate", "previous_transcript", "success_certificate",
        "financial_clearance", "reenrollment_form"
    ]:
        val = getattr(student, attr, None)
        if val and filename in val:
            setattr(student, attr, None)
    
    if student.file_status != "validated":
        student.file_status = "incomplete"

    db.commit()
    
    return {"message": "Fichier supprimé avec succès"}


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
    payment_plan: Optional[str] = Form(None),
    monthly_deposit: Optional[str] = Form(None),
    monthly_installment: Optional[str] = Form(None),
    monthly_months_count: Optional[str] = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Met à jour un étudiant"""
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
    
    if photo and photo.filename and photo.size > 0:
        os.makedirs("uploads", exist_ok=True)
        photo_filename = f"STUDENT_{existing_student.id}_{int(time_module.time())}.png"
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
    dossier_dir = base_dir / "uploads" / "dossiers" / str(student_id)
    if dossier_dir.exists():
        try:
            shutil.rmtree(str(dossier_dir))
        except Exception:
            pass

    # 2. Supprimer les dépendances en base de données
    try:
        db.query(Grade).filter(Grade.student_id == student_id).delete(synchronize_session=False)
    except Exception:
        pass
    try:
        db.query(Attendance).filter(Attendance.student_id == student_id).delete(synchronize_session=False)
    except Exception:
        pass
    try:
        db.query(Payment).filter(Payment.student_id == student_id).delete(synchronize_session=False)
    except Exception:
        pass
    try:
        db.query(Document).filter(Document.student_id == student_id).delete(synchronize_session=False)
    except Exception:
        pass
    try:
        from app.models.payment_installment import PaymentInstallment
        db.query(PaymentInstallment).filter(PaymentInstallment.student_id == student_id).delete(synchronize_session=False)
    except Exception:
        pass
    try:
        from app.models.deliberation import DeliberationDecision
        db.query(DeliberationDecision).filter(DeliberationDecision.student_id == student_id).delete(synchronize_session=False)
    except Exception:
        pass
    try:
        from app.models.report_card import ReportCard
        db.query(ReportCard).filter(ReportCard.student_id == student_id).delete(synchronize_session=False)
    except Exception:
        pass
    try:
        from app.models.incident import Incident
        db.query(Incident).filter(Incident.student_id == student_id).delete(synchronize_session=False)
    except Exception:
        pass

    db.delete(student)
    db.commit()
    
    # 3. Supprimer le compte utilisateur et ses traces si présent
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            try:
                db.query(Message).filter((Message.sender_id == user_id) | (Message.recipient_id == user_id)).delete(synchronize_session=False)
            except Exception:
                pass
            try:
                db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)
            except Exception:
                pass
            db.delete(user)
            db.commit()
        
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
    update_file_status(student, validated_folder)
    
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


def update_file_status(student: Student, validated_folder: Path):
    """Met à jour le statut du dossier de l'étudiant (complet/incomplet)"""
    # Vérifier si tous les documents requis sont validés
    required_docs = ["cni", "birth_certificate", "photo"]
    
    validated_count = 0
    for doc_type in required_docs:
        # Chercher un fichier validé de ce type
        found = False
        for file in validated_folder.iterdir():
            if file.name.startswith(f"{doc_type}_"):
                found = True
                break
        if found:
            validated_count += 1
    
    if validated_count >= len(required_docs):
        student.file_status = "complete"
    else:
        student.file_status = "incomplete"
    
    # Sauvegarder (la session sera commit par l'appelant)
    try:
        db = SessionLocal()
        db.add(student)
        db.commit()
    except Exception:
        pass


@router.post("/{student_id}/reset-password")
def reset_student_password(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
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