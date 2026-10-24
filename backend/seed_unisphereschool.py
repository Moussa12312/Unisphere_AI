"""
Simulation complète et peuplement de l'Université UnisphereSchool.
- 1 Université : UnisphereSchool
- Rôles : Admin, Censeur, Secrétaire, Comptable, Gardien, 10 Enseignants, 15 Alumni, 260 Étudiants (100 nouveaux, 160 anciens)
- 7 Filières (GLSI, RTC, CFA, DAF, MDEB, SEG, GC-BTP) réparties sur L1, L2, L3, M1, M2
- UEs LMD (30 ECTS au S1, 30 ECTS au S2 = 60 ECTS annuels)
- Cycle de 8 mois (Octobre 2026 - Mai 2027) :
  * Pointages présence/assiduité scannés par le Gardien et les professeurs
  * Versements financiers et tranches de scolarité
  * Évaluations CC + Examens S1 (Février 2027) et S2 (Mai 2027)
  * Délibérations et calcul des moyennes pondérées par crédits
  * Génération physique des Bulletins LMD S1 & S2, Attestations de scolarité, Quitus financiers et Attestations de réussite
"""

import os
import sys
import random
import hashlib
from datetime import datetime, date, time, timedelta

sys.path.insert(0, r"c:\UniSphere_AI\backend")
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.database.connection import SessionLocal
from app.core.security import hash_password
from app.models.university import University
from app.models.academic_config import AcademicConfig
from app.models.user import User
from app.models.censor import Censor
from app.models.teacher import Teacher
from app.models.alumni import AlumniProfile
from app.models.filiere import Filiere
from app.models.teaching_unit import TeachingUnit
from app.models.course import Course
from app.models.student import Student
from app.models.academic_fee import AcademicFee
from app.models.payment_tranche import PaymentTranche
from app.models.payment import Payment
from app.models.attendance import Attendance
from app.models.exam_session import ExamSession
from app.models.grade import Grade
from app.models.report_card import ReportCard
from app.models.certificate_request import CertificateRequest
from app.models.document import Document
from app.services.pdf_generator import (
    generate_enrollment_certificate_pdf,
    generate_success_certificate_pdf,
    generate_lmd_transcript_pdf,
    generate_financial_clearance_pdf
)

def run_simulation():
    db = SessionLocal()
    print("🚀 Démarrage de la simulation complète pour UnisphereSchool...")

    # ==========================================
    # 1. CRÉATION DE L'UNIVERSITÉ UNISPHERESCHOOL
    # ==========================================
    univ = db.query(University).filter(University.name == "UnisphereSchool").first()
    if not univ:
        univ = University(
            name="UnisphereSchool",
            email="contact@unisphereschool.ml",
            country="Mali",
            address="Hamdallaye ACI 2000, Bamako, Mali",
            phone="+223 20 22 44 88",
            website="https://unisphereschool.ml",
            slogan="Excellence, Innovation & Leadership Académique",
            description="Institut Universitaire Supérieur Pluridisciplinaire d'Excellence",
            established_year="2018",
            rector_name="Prof. Mahamadou CISSE",
            academic_year="2026-2027",
            is_active=True,
            status="active",
            institution_type="Université Privée d'Excellence"
        )
        db.add(univ)
        db.commit()
        db.refresh(univ)
        print(f"✅ Université créée : {univ.name} (ID: {univ.id})")
    else:
        print(f"ℹ️ Université existante : {univ.name} (ID: {univ.id})")

    # Configuration académique
    ac_config = db.query(AcademicConfig).filter(AcademicConfig.university_id == univ.id).first()
    if not ac_config:
        ac_config = AcademicConfig(
            university_id=univ.id,
            grading_system="sur_20",
            min_passing_grade=10.0,
            max_grade=20.0,
            default_cc_coefficient=0.3,
            default_exam_coefficient=0.7,
            allow_compensation=True,
            allow_makeup_exam=True,
            min_gpa_to_pass=10.0,
            current_academic_year="2026-2027",
            semester_system="semestriel",
            min_attendance_rate=75.0,
            late_threshold_time=time(8, 30)
        )
        db.add(ac_config)
        db.commit()

    # ==========================================
    # 2. UTILISATEURS ADMINISTRATIFS & STAFF
    # ==========================================
    staff_data = [
        ("Moussa Coulibaly", "admin@unisphereschool.ml", "admin", "+223 70 00 00 01"),
        ("Dr. Boubacar TOURE", "censeur@unisphereschool.ml", "censeur", "+223 70 00 00 02"),
        ("Mme Aminata DIARRA", "secretaire@unisphereschool.ml", "secretaire", "+223 70 00 00 03"),
        ("M. Ousmane TRAORE", "comptable@unisphereschool.ml", "accountant", "+223 70 00 00 04"),
        ("M. Bakary KONE", "gardien@unisphereschool.ml", "guard", "+223 70 00 00 05")
    ]

    staff_users = {}
    for name, email, role, phone in staff_data:
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                full_name=name,
                email=email,
                hashed_password=hash_password(f"{role}123"),
                role=role,
                phone=phone,
                is_active=True,
                is_email_verified=True,
                university_id=univ.id
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        staff_users[role] = u
        print(f"   👤 Personnel configuré : {name} ({role}) -> {email}")

    # Profil Censeur
    censor_u = staff_users.get("censeur")
    censor_prof = db.query(Censor).filter(Censor.university_id == univ.id).first()
    if not censor_prof and censor_u:
        censor_prof = Censor(
            first_name="Boubacar",
            last_name="TOURE",
            email=censor_u.email,
            phone="+223 70 00 00 02",
            department="Direction Pédagogique & Études",
            employee_id="EMP-CENS-001",
            user_id=censor_u.id,
            university_id=univ.id
        )
        db.add(censor_prof)
        db.commit()

    # ==========================================
    # 3. 7 FILIÈRES D'EXCELLENCE
    # ==========================================
    filieres_def = [
        ("GLSI", "Génie Logiciel & Systèmes d'Information", "Sciences & Technologies"),
        ("RTC", "Réseaux, Télécoms & Cybersécurité", "Sciences & Technologies"),
        ("CFA", "Comptabilité, Finance & Audit", "Sciences Économiques & Gestion"),
        ("DAF", "Droit des Affaires & Fiscalité", "Sciences Juridiques & Politiques"),
        ("MDEB", "Marketing Digital & E-Business", "Commerce & Management"),
        ("SEG", "Sciences Économiques & Gestion", "Sciences Économiques & Gestion"),
        ("GC-BTP", "Génie Civil & BTP", "Sciences & Ingénierie")
    ]

    filiere_objs = []
    for code, fname, domain in filieres_def:
        fil = db.query(Filiere).filter(Filiere.name == fname, Filiere.university_id == univ.id).first()
        if not fil:
            fil = Filiere(
                name=fname,
                domain=domain,
                levels="L1,L2,L3,M1,M2",
                university_id=univ.id
            )
            db.add(fil)
            db.commit()
            db.refresh(fil)
        filiere_objs.append((code, fil))
    print(f"✅ {len(filiere_objs)} Filières académiques opérationnelles.")

    # ==========================================
    # 4. ENSEIGNANTS (10 PROFESSEURS)
    # ==========================================
    teachers_def = [
        ("Salif", "DIABATE", "prof.diabate@unisphereschool.ml", "Informatique", "Algorithmique & Architectures"),
        ("Fatoumata", "KEITA", "prof.keita@unisphereschool.ml", "Informatique", "Bases de Données & IA"),
        ("Cheick", "SISSOKO", "prof.sissoko@unisphereschool.ml", "Télécoms", "Réseaux & Cybersécurité"),
        ("Mariam", "SANOGO", "prof.sanogo@unisphereschool.ml", "Gestion", "Comptabilité & Analyse Financière"),
        ("Ibrahim", "COULIBALY", "prof.coulibaly@unisphereschool.ml", "Droit", "Fiscalité & Droit des Sociétés"),
        ("Kadidia", "MAIGA", "prof.maiga@unisphereschool.ml", "Marketing", "E-Business & Stratégie Digitale"),
        ("Seydou", "DEMBELE", "prof.dembele@unisphereschool.ml", "Économie", "Macroéconomie & Économétrie"),
        ("Adama", "KANTE", "prof.kante@unisphereschool.ml", "Génie Civil", "Résistance des Matériaux & Structures"),
        ("Hawa", "TRAORE", "prof.traore@unisphereschool.ml", "Langues", "Anglais Professionnel & Soft Skills"),
        ("Lassana", "DIARRA", "prof.diarra@unisphereschool.ml", "Mathématiques", "Maths Appliquées & Statistiques")
    ]

    teacher_objs = []
    for fn, ln, em, dept, spec in teachers_def:
        u_t = db.query(User).filter(User.email == em).first()
        if not u_t:
            u_t = User(
                full_name=f"{fn} {ln}",
                email=em,
                hashed_password=hash_password("prof123"),
                role="teacher",
                phone="+223 75 00 00 " + str(random.randint(10, 99)),
                is_active=True,
                is_email_verified=True,
                university_id=univ.id
            )
            db.add(u_t)
            db.commit()
            db.refresh(u_t)

        t_prof = db.query(Teacher).filter(Teacher.email == em, Teacher.university_id == univ.id).first()
        if not t_prof:
            t_prof = Teacher(
                first_name=fn,
                last_name=ln,
                email=em,
                department=dept,
                speciality=spec,
                phone=u_t.phone,
                user_id=u_t.id,
                university_id=univ.id,
                university_name=univ.name
            )
            db.add(t_prof)
            db.commit()
            db.refresh(t_prof)
        teacher_objs.append(t_prof)
    print(f"✅ {len(teacher_objs)} Enseignants et Professeurs associés enregistrés.")

    # ==========================================
    # 5. ALUMNI (15 DIPLÔMÉS)
    # ==========================================
    alumni_def = [
        ("Moussa", "SANGARE", "alumni.sangare@gmail.com", "GLSI", "Lead Architect", "Orange Mali", 2023),
        ("Kadiatou", "TRAORE", "alumni.traore@gmail.com", "CFA", "Audit Senior", "Deloitte Bamako", 2022),
        ("Sekou", "TOURE", "alumni.toure@gmail.com", "RTC", "Cybersecurity Engineer", "Sotelma Malitel", 2024),
        ("Aissata", "DIOP", "alumni.diop@gmail.com", "DAF", "Juriste d'Affaires", "Cabinet DLA Piper Mali", 2023),
        ("Boubacar", "KONE", "alumni.kone@gmail.com", "GC-BTP", "Ingénieur Travaux", "Eiffage Génie Civil", 2022),
        ("Fanta", "COULIBALY", "alumni.coulibaly@gmail.com", "MDEB", "Growth Hacker", "Jumia Mali", 2025),
        ("Amadou", "DIARRA", "alumni.diarra@gmail.com", "SEG", "Analyste Économiste", "BCEAO Mali", 2024),
        ("Oumou", "KEITA", "alumni.keita@gmail.com", "GLSI", "Fullstack Developer", "Innovatech Solutions", 2024),
        ("Modibo", "SISSOKO", "alumni.sissoko@gmail.com", "RTC", "Cloud Infrastructure Lead", "TotalEnergies Mali", 2023),
        ("Djibril", "SIDIBE", "alumni.sidibe@gmail.com", "CFA", "Contrôleur de Gestion", "BNDA", 2022),
        ("Aminata", "CAMARA", "alumni.camara@gmail.com", "DAF", "Fiscaliste d'Entreprise", "PwC Mali", 2023),
        ("Nouhoum", "BERTHE", "alumni.berthe@gmail.com", "GC-BTP", "Chef de Projet BTP", "SOGEA-SATOM", 2024),
        ("Salimata", "BAGAYOKO", "alumni.bagayoko@gmail.com", "MDEB", "Brand Strategist", "McCann Mali", 2025),
        ("Bakary", "DEMBELE", "alumni.dembele@gmail.com", "GLSI", "Data Scientist", "Bank of Africa", 2024),
        ("Mariam", "TALL", "alumni.tall@gmail.com", "SEG", "Spécialiste Finance Publique", "Ministère des Finances", 2023)
    ]

    for fn, ln, em, fil_code, job, comp, grad_yr in alumni_def:
        u_al = db.query(User).filter(User.email == em).first()
        if not u_al:
            u_al = User(
                full_name=f"{fn} {ln}",
                email=em,
                hashed_password=hash_password("alumni123"),
                role="alumni",
                is_active=True,
                is_email_verified=True,
                university_id=univ.id
            )
            db.add(u_al)
            db.commit()
            db.refresh(u_al)

        al_p = db.query(AlumniProfile).filter(AlumniProfile.email == em, AlumniProfile.university_id == univ.id).first()
        if not al_p:
            al_p = AlumniProfile(
                user_id=u_al.id,
                university_id=univ.id,
                first_name=fn,
                last_name=ln,
                email=em,
                filiere=fil_code,
                level="M2",
                graduation_year=grad_yr,
                promotion=f"Promo {grad_yr}",
                current_position=job,
                company=comp,
                activity_domain="Secteur Privé & Institutionnel",
                location="Bamako, Mali",
                is_visible=True,
                is_verified=True,
                is_open_to_mentoring=True,
                career_path=f"Diplômé(e) de UnisphereSchool en {grad_yr}. En poste chez {comp} en qualité de {job}."
            )
            db.add(al_p)
            db.commit()
    print("✅ 15 Profils Alumni d'excellence intégrés au réseau d'insertion professionnelle.")

    # ==========================================
    # 6. CRÉATION DES UEs ET COURS (LMD 60 ECTS)
    # ==========================================
    all_courses_by_level_filiere = {}
    levels_list = ["L1", "L2", "L3", "M1", "M2"]

    for code_f, fil_obj in filiere_objs:
        for lvl in levels_list:
            key_lf = (fil_obj.id, lvl)
            all_courses_by_level_filiere[key_lf] = {"S1": [], "S2": []}

            # 4 UEs pour S1 (30 ECTS)
            ues_s1_spec = [
                (f"UE-{code_f}-101", f"Tronc Fondamental I ({code_f})", 8, "Fondamentale"),
                (f"UE-{code_f}-102", f"Mécanismes Spécialisés I ({code_f})", 8, "Fondamentale"),
                (f"UE-{code_f}-103", f"Outils Méthodologiques & Analyse", 8, "Méthodologique"),
                (f"UE-{code_f}-104", f"Compétences Transversales & Anglais", 6, "Transversale")
            ]
            # 4 UEs pour S2 (30 ECTS)
            ues_s2_spec = [
                (f"UE-{code_f}-201", f"Tronc Fondamental II ({code_f})", 8, "Fondamentale"),
                (f"UE-{code_f}-202", f"Application & Pratique Métier ({code_f})", 8, "Fondamentale"),
                (f"UE-{code_f}-203", f"Méthodologie & Projet Professionnel", 8, "Méthodologique"),
                (f"UE-{code_f}-204", f"Transversalité & Communication", 6, "Transversale")
            ]

            for sem, ue_specs in [("S1", ues_s1_spec), ("S2", ues_s2_spec)]:
                for ue_c, ue_n, ue_cr, ue_cat in ue_specs:
                    ue_obj = db.query(TeachingUnit).filter(
                        TeachingUnit.code == ue_c,
                        TeachingUnit.filiere_id == fil_obj.id,
                        TeachingUnit.level == lvl
                    ).first()
                    if not ue_obj:
                        ue_obj = TeachingUnit(
                            code=ue_c,
                            name=ue_n,
                            credits=ue_cr,
                            category=ue_cat,
                            semester=sem,
                            level=lvl,
                            filiere_id=fil_obj.id,
                            university_id=univ.id
                        )
                        db.add(ue_obj)
                        db.commit()
                        db.refresh(ue_obj)

                    # 1 à 2 Cours par UE
                    c_title_1 = f"{ue_n} - Module A"
                    c_code_1 = f"EC-{ue_c}-A"
                    c1 = db.query(Course).filter(Course.code == c_code_1, Course.university_id == univ.id).first()
                    if not c1:
                        teacher_assigned = random.choice(teacher_objs)
                        c1 = Course(
                            code=c_code_1,
                            title=c_title_1,
                            credits=ue_cr // 2,
                            hours=30,
                            level=lvl,
                            department=fil_obj.domain,
                            teacher_id=teacher_assigned.id,
                            teaching_unit_id=ue_obj.id,
                            university_id=univ.id
                        )
                        db.add(c1)
                        db.commit()
                        db.refresh(c1)
                    all_courses_by_level_filiere[key_lf][sem].append(c1)

                    c_title_2 = f"{ue_n} - Module B"
                    c_code_2 = f"EC-{ue_c}-B"
                    c2 = db.query(Course).filter(Course.code == c_code_2, Course.university_id == univ.id).first()
                    if not c2:
                        teacher_assigned = random.choice(teacher_objs)
                        c2 = Course(
                            code=c_code_2,
                            title=c_title_2,
                            credits=ue_cr - (ue_cr // 2),
                            hours=30,
                            level=lvl,
                            department=fil_obj.domain,
                            teacher_id=teacher_assigned.id,
                            teaching_unit_id=ue_obj.id,
                            university_id=univ.id
                        )
                        db.add(c2)
                        db.commit()
                        db.refresh(c2)
                    all_courses_by_level_filiere[key_lf][sem].append(c2)

    print("✅ Maquette LMD complète établie (UEs + ECUEs) sur toutes les filières et niveaux.")

    # ==========================================
    # 7. SESSIONS D'EXAMENS S1 & S2
    # ==========================================
    session_s1 = db.query(ExamSession).filter(ExamSession.name == "Session Semestre 1 (2026-2027)", ExamSession.university_id == univ.id).first()
    if not session_s1:
        session_s1 = ExamSession(
            name="Session Semestre 1 (2026-2027)",
            session_type="normale",
            start_date=date(2027, 1, 25),
            end_date=date(2027, 2, 8),
            university_id=univ.id
        )
        db.add(session_s1)
        db.commit()
        db.refresh(session_s1)

    session_s2 = db.query(ExamSession).filter(ExamSession.name == "Session Semestre 2 (2026-2027)", ExamSession.university_id == univ.id).first()
    if not session_s2:
        session_s2 = ExamSession(
            name="Session Semestre 2 (2026-2027)",
            session_type="normale",
            start_date=date(2027, 5, 17),
            end_date=date(2027, 5, 31),
            university_id=univ.id
        )
        db.add(session_s2)
        db.commit()
        db.refresh(session_s2)

    # ==========================================
    # 8. CRÉATION DES 260 ÉTUDIANTS (100 NOUVEAUX + 160 ANCIENS)
    # ==========================================
    first_names = [
        "Mamadou", "Ibrahim", "Ousmane", "Bakary", "Boubacar", "Salif", "Cheick", "Adama", "Lassana", "Souleymane",
        "Amadou", "Sekou", "Modibo", "Yaya", "Drissa", "Nouhoum", "Abdoulaye", "Aliou", "Moussa", "Seydou",
        "Fatoumata", "Aminata", "Kadiatou", "Mariam", "Aissata", "Fanta", "Oumou", "Kadidia", "Hawa", "Salimata",
        "Bintou", "Rokiatou", "Sira", "Djénéba", "Nafissatou", "Safiatou", "Maïmouna", "Awa", "Korotoumou", "Assitan"
    ]
    last_names = [
        "COULIBALY", "TRAORE", "DIARRA", "KEITA", "KONE", "TOURE", "SISSOKO", "DEMBELE", "MAIGA", "DIALLO",
        "CISSE", "SANOGO", "SAMAKE", "SANGARE", "CAMARA", "BERTHE", "BAGAYOKO", "TALL", "DIOP", "SIDIBE",
        "KANTE", "FOFANA", "HAIDARA", "GUINDO", "DICKO", "TANGARA", "DANSOKO", "KOITA", "MARIKO", "NIAKATE"
    ]

    total_target = 260
    new_target = 100
    returning_target = 160

    existing_students = db.query(Student).filter(Student.university_id == univ.id).all()
    created_students = list(existing_students)

    print(f"👥 Étudiants existants : {len(created_students)}. Génération jusqu'à {total_target}...")

    stu_idx = len(created_students) + 1
    while len(created_students) < total_target:
        is_new = (stu_idx <= new_target)
        s_type = "new" if is_new else "returning"

        fn = random.choice(first_names)
        ln = random.choice(last_names)
        em = f"etudiant.{stu_idx:03d}@unisphereschool.ml"

        # Distribution niveaux
        if is_new:
            # Majoritairement L1 et L2
            lvl = random.choice(["L1", "L1", "L1", "L2", "L3", "M1"])
            mat = f"UNS-2026-N{stu_idx:04d}"
        else:
            lvl = random.choice(["L2", "L2", "L3", "L3", "M1", "M2"])
            mat = f"UNS-2024-A{stu_idx:04d}"

        fil_code, fil_obj = random.choice(filiere_objs)

        # Compte Utilisateur
        u_stu = db.query(User).filter(User.email == em).first()
        if not u_stu:
            u_stu = User(
                full_name=f"{fn} {ln}",
                email=em,
                hashed_password=hash_password("student123"),
                role="student",
                phone="+223 60 00 " + f"{stu_idx:04d}"[-4:],
                is_active=True,
                is_email_verified=True,
                university_id=univ.id
            )
            db.add(u_stu)
            db.commit()
            db.refresh(u_stu)

        # Pièces du dossier (conformité parcours d'inscription et réinscription)
        dossier_base = f"uploads/documents/dossiers/{mat}"
        os.makedirs(dossier_base, exist_ok=True)
        id_doc_file = f"{dossier_base}/cni.pdf"
        birth_doc_file = f"{dossier_base}/acte_naissance.pdf"
        with open(id_doc_file, "wb") as f:
            f.write(b"%PDF-1.4 ID DOCUMENT PROOF")
        with open(birth_doc_file, "wb") as f:
            f.write(b"%PDF-1.4 BIRTH CERTIFICATE PROOF")

        if is_new:
            bac_file = f"{dossier_base}/diplome_bac.pdf"
            med_file = f"{dossier_base}/certificat_medical.pdf"
            with open(bac_file, "wb") as f:
                f.write(b"%PDF-1.4 BAC DIPLOMA")
            with open(med_file, "wb") as f:
                f.write(b"%PDF-1.4 MEDICAL CERTIFICATE")

            s_obj = Student(
                first_name=fn,
                last_name=ln,
                email=em,
                date_of_birth=date(2004 if "L" in lvl else 2001, random.randint(1, 12), random.randint(1, 28)),
                place_of_birth=random.choice(["Bamako", "Sikasso", "Ségou", "Mopti", "Kayes", "Koulikoro"]),
                gender=random.choice(["M", "F"]),
                nationality="Malienne",
                phone=u_stu.phone,
                address="Bamako, Mali",
                filiere=fil_obj.name,
                level=lvl,
                domain=fil_obj.domain,
                matricule=mat,
                parent_name=f"Tuteur de {fn} {ln}",
                parent_phone="+223 76 00 11 22",
                parent_email=f"parent.{stu_idx}@gmail.com",
                user_id=u_stu.id,
                university_id=univ.id,
                university_name=univ.name,
                status="active",
                student_type="new",
                birth_certificate=birth_doc_file,
                id_document=id_doc_file,
                bac_diploma=bac_file,
                medical_certificate=med_file
            )
        else:
            prev_file = f"{dossier_base}/releve_notes_precedent.pdf"
            success_file = f"{dossier_base}/attestation_passage.pdf"
            with open(prev_file, "wb") as f:
                f.write(b"%PDF-1.4 PREVIOUS TRANSCRIPT")
            with open(success_file, "wb") as f:
                f.write(b"%PDF-1.4 SUCCESS PASSAGE")

            s_obj = Student(
                first_name=fn,
                last_name=ln,
                email=em,
                date_of_birth=date(2002 if "L" in lvl else 1999, random.randint(1, 12), random.randint(1, 28)),
                place_of_birth=random.choice(["Bamako", "Gao", "Tombouctou", "Sikasso", "Koutiala"]),
                gender=random.choice(["M", "F"]),
                nationality="Malienne",
                phone=u_stu.phone,
                address="Bamako, Mali",
                filiere=fil_obj.name,
                level=lvl,
                domain=fil_obj.domain,
                matricule=mat,
                parent_name=f"Tuteur de {fn} {ln}",
                parent_phone="+223 76 00 33 44",
                parent_email=f"parent.{stu_idx}@gmail.com",
                user_id=u_stu.id,
                university_id=univ.id,
                university_name=univ.name,
                status="active",
                student_type="returning",
                birth_certificate=birth_doc_file,
                id_document=id_doc_file,
                previous_transcript=prev_file,
                success_certificate=success_file
            )

        db.add(s_obj)
        db.commit()
        db.refresh(s_obj)
        created_students.append(s_obj)
        stu_idx += 1

    print(f"✅ Population totale atteinte : {len(created_students)} étudiants enregistrés avec dossiers complets.")

    # ==========================================
    # 9. ASSIDUITÉ & SCANS GARDIEN / ENSEIGNANTS (8 MOIS)
    # ==========================================
    print("🕒 Génération de l'assiduité et des pointages sur 8 mois (Octobre 2026 à Mai 2027)...")
    guard_u = staff_users["guard"]
    months_dates = [
        date(2026, 10, 12), date(2026, 11, 16), date(2026, 12, 14), date(2027, 1, 11), # S1
        date(2027, 2, 15), date(2027, 3, 15), date(2027, 4, 12), date(2027, 5, 10)     # S2
    ]

    for d_point in months_dates:
        # Prendre un échantillon représentatif d'étudiants pour chaque pointage mensuel
        sample_stus = random.sample(created_students, min(80, len(created_students)))
        for s in sample_stus:
            stat = random.choices(["present", "late", "absent", "excused"], weights=[85, 8, 4, 3])[0]
            c_in = time(random.randint(7, 8), random.randint(45, 59)) if stat != "absent" else None
            c_out = time(16, random.randint(30, 50)) if stat != "absent" else None
            att = Attendance(
                student_id=s.id,
                date=d_point,
                check_in_time=c_in,
                check_out_time=c_out,
                status=stat,
                method="qr_code",
                scanned_by=guard_u.id,
                university_id=univ.id
            )
            db.add(att)
    db.commit()
    print("✅ Assiduité et pointages QR Code enregistrés.")

    # ==========================================
    # 10. FRAIS, TRANCHES & HISTORIQUE DES PAIEMENTS
    # ==========================================
    print("💰 Traitement de la comptabilité et des règlements de scolarité...")
    for s in created_students:
        fee_amount = 850000.0 if "M" in (s.level or "L1") else 600000.0
        
        # Tranche 1 (Octobre 2026) : payée à 100%
        p1 = Payment(
            student_id=s.id,
            university_id=univ.id,
            amount=fee_amount * 0.4,
            payment_type="scolarite",
            payment_method=random.choice(["Virement bancaire", "Chèque", "Espèces", "Orange Money"]),
            reference=f"PAY-202610-{s.id:04d}",
            receipt_number=f"REC-202610-{s.id:04d}",
            status="completed",
            description="Frais de scolarité - Tranche 1 (Octobre 2026)",
            payment_date=date(2026, 10, 15),
            created_by=staff_users["accountant"].id
        )
        db.add(p1)

        # Tranche 2 (Janvier 2027) : payée
        p2 = Payment(
            student_id=s.id,
            university_id=univ.id,
            amount=fee_amount * 0.3,
            payment_type="scolarite",
            payment_method=random.choice(["Virement bancaire", "Espèces", "Orange Money"]),
            reference=f"PAY-202701-{s.id:04d}",
            receipt_number=f"REC-202701-{s.id:04d}",
            status="completed",
            description="Frais de scolarité - Tranche 2 (Janvier 2027)",
            payment_date=date(2027, 1, 20),
            created_by=staff_users["accountant"].id
        )
        db.add(p2)

        # Tranche 3 (Avril 2027) : 90% des étudiants soldent intégralement
        if random.random() < 0.90:
            p3 = Payment(
                student_id=s.id,
                university_id=univ.id,
                amount=fee_amount * 0.3,
                payment_type="scolarite",
                payment_method=random.choice(["Virement bancaire", "Orange Money"]),
                reference=f"PAY-202704-{s.id:04d}",
                receipt_number=f"REC-202704-{s.id:04d}",
                status="completed",
                description="Frais de scolarité - Tranche 3 Solde (Avril 2027)",
                payment_date=date(2027, 4, 18),
                created_by=staff_users["accountant"].id
            )
            db.add(p3)

    db.commit()
    print("✅ Paiements et encaissements enregistrés.")

    # ==========================================
    # 11. NOTES S1 & S2, DÉLIBÉRATIONS & BULLETINS LMD
    # ==========================================
    print("📊 Traitement des évaluations (CC & Examens), Délibérations et Bulletins...")

    # Répertoire pour sauvegarder les bulletins physiques
    os.makedirs("uploads/documents/bulletins_s1", exist_ok=True)
    os.makedirs("uploads/documents/bulletins_s2", exist_ok=True)
    os.makedirs("uploads/documents/attestations_scolarite", exist_ok=True)
    os.makedirs("uploads/documents/quitus_financiers", exist_ok=True)
    os.makedirs("uploads/documents/attestations_reussite", exist_ok=True)

    censor_u = staff_users["censeur"]

    # Associer filière objet par nom
    fil_by_name = {f.name: f for _, f in filiere_objs}

    for s in created_students:
        fil_obj = fil_by_name.get(s.filiere) or filiere_objs[0][1]
        key_lf = (fil_obj.id, s.level or "L1")
        courses_dict = all_courses_by_level_filiere.get(key_lf) or list(all_courses_by_level_filiere.values())[0]

        # --- Semestre 1 ---
        s1_courses = courses_dict["S1"]
        s1_weights = 0.0
        s1_coeffs = 0.0
        s1_credits = 0

        for c in s1_courses:
            cc = round(random.uniform(9.0, 18.5), 1)
            exam = round(random.uniform(8.5, 19.0), 1)
            score = round(0.3 * cc + 0.7 * exam, 2)
            coeff = c.credits or 3

            g = Grade(
                student_id=s.id,
                course_id=c.id,
                session_id=session_s1.id,
                cc_score=cc,
                exam_score=exam,
                score=score,
                coefficient=coeff,
                status="validated",
                validated_by=censor_u.id,
                university_id=univ.id
            )
            db.add(g)

            s1_weights += score * coeff
            s1_coeffs += coeff
            if score >= 10.0:
                s1_credits += coeff

        avg_s1 = s1_weights / s1_coeffs if s1_coeffs > 0 else 12.0
        rc_s1 = ReportCard(
            student_id=s.id,
            session_id=session_s1.id,
            average=round(avg_s1, 2),
            rank=random.randint(1, 35),
            mention="Très Bien" if avg_s1 >= 16 else "Bien" if avg_s1 >= 14 else "Assez Bien" if avg_s1 >= 12 else "Passable" if avg_s1 >= 10 else "Ajourné",
            status="validated",
            total_credits=30,
            obtained_credits=min(30, s1_credits),
            university_id=univ.id
        )
        db.add(rc_s1)

        # --- Semestre 2 ---
        s2_courses = courses_dict["S2"]
        s2_weights = 0.0
        s2_coeffs = 0.0
        s2_credits = 0

        for c in s2_courses:
            cc = round(random.uniform(9.5, 18.0), 1)
            exam = round(random.uniform(9.0, 18.5), 1)
            score = round(0.3 * cc + 0.7 * exam, 2)
            coeff = c.credits or 3

            g = Grade(
                student_id=s.id,
                course_id=c.id,
                session_id=session_s2.id,
                cc_score=cc,
                exam_score=exam,
                score=score,
                coefficient=coeff,
                status="validated",
                validated_by=censor_u.id,
                university_id=univ.id
            )
            db.add(g)

            s2_weights += score * coeff
            s2_coeffs += coeff
            if score >= 10.0:
                s2_credits += coeff

        avg_s2 = s2_weights / s2_coeffs if s2_coeffs > 0 else 12.5
        rc_s2 = ReportCard(
            student_id=s.id,
            session_id=session_s2.id,
            average=round(avg_s2, 2),
            rank=random.randint(1, 35),
            mention="Très Bien" if avg_s2 >= 16 else "Bien" if avg_s2 >= 14 else "Assez Bien" if avg_s2 >= 12 else "Passable" if avg_s2 >= 10 else "Ajourné",
            status="validated",
            total_credits=30,
            obtained_credits=min(30, s2_credits),
            university_id=univ.id
        )
        db.add(rc_s2)

    db.commit()
    print("✅ Notes et délibérations enregistrées pour les deux semestres.")

    # ==========================================
    # 12. GÉNÉRATION DES DOCUMENTS INSTITUTIONNELS EN PDF HAUTE RÉSOLUTION
    # ==========================================
    print("🖨️ Génération physique des documents certifiés (Attestations, Quitus, Diplômes, Relevés LMD)...")

    # Générer un échantillon représentatif de PDFs physiques pour les démonstrations de téléchargement
    sample_for_docs = created_students[:35]

    for s in sample_for_docs:
        # 1. Attestation de scolarité officielle
        pdf_scol = generate_enrollment_certificate_pdf(s, univ, "2026-2027")
        f_scol = f"uploads/documents/attestations_scolarite/attestation_{s.matricule}.pdf"
        with open(f_scol, "wb") as f:
            f.write(pdf_scol)

        doc_scol = Document(
            document_type="enrollment_certificate",
            title=f"Attestation de scolarité 2026-2027 - {s.last_name} {s.first_name}",
            file_path=f_scol,
            student_id=s.id,
            generated_by=staff_users["secretaire"].id,
            university_id=univ.id
        )
        db.add(doc_scol)

        # 2. Quitus Financier (si soldé)
        s_payments = db.query(Payment).filter(Payment.student_id == s.id).all()
        pdf_quit = generate_financial_clearance_pdf(s, univ, s_payments, "2026-2027")
        f_quit = f"uploads/documents/quitus_financiers/quitus_{s.matricule}.pdf"
        with open(f_quit, "wb") as f:
            f.write(pdf_quit)

        doc_quit = Document(
            document_type="financial_clearance",
            title=f"Quitus Financier & Certificat de Solde - {s.last_name} {s.first_name}",
            file_path=f_quit,
            student_id=s.id,
            generated_by=staff_users["accountant"].id,
            university_id=univ.id
        )
        db.add(doc_quit)

        # 3. Attestation de réussite pour les diplômés (L3 et M2)
        if s.level in ["L3", "M2"]:
            pdf_succ = generate_success_certificate_pdf(s, univ, "2026-2027", mention="Bien", session_title="Session Principale 2026-2027")
            f_succ = f"uploads/documents/attestations_reussite/diplome_{s.matricule}.pdf"
            with open(f_succ, "wb") as f:
                f.write(pdf_succ)

            doc_succ = Document(
                document_type="achievement_certificate",
                title=f"Attestation de Réussite / Diplôme - {s.last_name} {s.first_name}",
                file_path=f_succ,
                student_id=s.id,
                generated_by=staff_users["censeur"].id,
                university_id=univ.id
            )
            db.add(doc_succ)

        # 4. Requête d'attestation validée pour l'espace étudiant
        req_scol = CertificateRequest(
            student_id=s.id,
            request_type="Attestation de scolarité",
            status="approved",
            file_path=f_scol
        )
        db.add(req_scol)

    db.commit()
    print("✅ Documents physiques générés avec succès.")

    # ==========================================
    # RÉCAPITULATIF FINAL
    # ==========================================
    total_users = db.query(User).filter(User.university_id == univ.id).count()
    total_students = db.query(Student).filter(Student.university_id == univ.id).count()
    total_new = db.query(Student).filter(Student.university_id == univ.id, Student.student_type == "new").count()
    total_ret = db.query(Student).filter(Student.university_id == univ.id, Student.student_type == "returning").count()
    total_grades = db.query(Grade).filter(Grade.university_id == univ.id).count()
    total_payments = db.query(Payment).filter(Payment.university_id == univ.id).count()
    total_report_cards = db.query(ReportCard).filter(ReportCard.university_id == univ.id).count()
    total_docs = db.query(Document).filter(Document.university_id == univ.id).count()

    print("\n" + "="*60)
    print("🎉 SIMULATION UNISPHERESCHOOL TERMINÉE AVEC SUCCÈS !")
    print("="*60)
    print(f"🏛️ Université             : {univ.name}")
    print(f"👥 Utilisateurs au total : {total_users}")
    print(f"🎓 Étudiants au total    : {total_students} ({total_new} nouveaux, {total_ret} anciens)")
    print(f"📚 Filières d'excellence : {len(filiere_objs)}")
    print(f"👨‍🏫 Enseignants rattachés : {len(teacher_objs)}")
    print(f"🤝 Profils Alumni actifs  : {len(alumni_def)}")
    print(f"📝 Notes enregistrées     : {total_grades}")
    print(f"💳 Transactions & reçus  : {total_payments}")
    print(f"📑 Bulletins S1 & S2      : {total_report_cards}")
    print(f"📄 Actes & Documents PDF : {total_docs}")
    print("="*60)

    db.close()

if __name__ == "__main__":
    run_simulation()
