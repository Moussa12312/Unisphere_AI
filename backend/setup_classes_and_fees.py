"""
Configuration complète des Classes (ClassRoom), des Frais Académiques (AcademicFee),
des Échéanciers (PaymentDeadline), des Tranches (PaymentTranche) configurés par l'Admin,
et synchronisation des 260 étudiants et 757 paiements pour UnisphereSchool.
"""

import os
import sys
import random
from datetime import datetime, date, time

sys.path.insert(0, r"c:\UniSphere_AI\backend")
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.database.connection import SessionLocal
from app.models.university import University
from app.models.user import User
from app.models.teacher import Teacher
from app.models.filiere import Filiere
from app.models.class_room import ClassRoom
from app.models.student import Student
from app.models.academic_fee import AcademicFee
from app.models.payment_deadline import PaymentDeadline
from app.models.payment_tranche import PaymentTranche
from app.models.payment_installment import PaymentInstallment
from app.models.payment import Payment

def configure_classes_and_fees():
    db = SessionLocal()
    print("🚀 Début de la configuration des Classes, Scolarités et Tranches...")

    univ = db.query(University).filter(University.name == "UnisphereSchool").first()
    if not univ:
        print("❌ Université UnisphereSchool non trouvée.")
        return

    admin = db.query(User).filter(User.email == "admin@unisphereschool.ml").first()
    comptable = db.query(User).filter(User.email == "comptable@unisphereschool.ml").first()
    if not admin:
        print("❌ Compte Administrateur non trouvé.")
        return

    teachers = db.query(Teacher).filter(Teacher.university_id == univ.id).all()
    filieres = db.query(Filiere).filter(Filiere.university_id == univ.id).all()
    students = db.query(Student).filter(Student.university_id == univ.id).all()

    print(f"🏛️ Université: {univ.name} (ID: {univ.id})")
    print(f"👥 Admin: {admin.full_name} (ID: {admin.id})")
    print(f"📚 Filières: {len(filieres)}, Enseignants: {len(teachers)}, Étudiants: {len(students)}")

    # ==========================================
    # 1. CRÉATION DES 35 CLASSES (ClassRoom)
    # ==========================================
    print("\n--- 1. CRÉATION DES CLASSES DE COURS ---")
    levels = ["L1", "L2", "L3", "M1", "M2"]
    rooms_pool = [
        ("Amphi A - Nelson Mandela", "Bâtiment Principal", 100),
        ("Amphi B - Cheikh Anta Diop", "Bâtiment Principal", 80),
        ("Salle 101 - Informatique", "Pavillon Sciences & Tech", 45),
        ("Salle 102 - Multimédia", "Pavillon Sciences & Tech", 40),
        ("Labo Réseaux & Cyber 201", "Pavillon Sciences & Tech", 35),
        ("Labo Génie Logiciel 202", "Pavillon Sciences & Tech", 35),
        ("Salle 201 - Comptabilité & Finance", "Pavillon Économie & Gestion", 50),
        ("Salle 202 - Audit & Contrôle", "Pavillon Économie & Gestion", 45),
        ("Salle 301 - Droit & Fiscalité", "Bâtiment Juridique", 45),
        ("Salle 302 - Droit des Affaires", "Bâtiment Juridique", 40),
        ("Salle 401 - Marketing & Digital", "Pavillon Management", 45),
        ("Salle 402 - E-Business Lab", "Pavillon Management", 35),
        ("Salle 501 - Économie Appliquée", "Pavillon Économie & Gestion", 50),
        ("Labo Matériaux BTP 601", "Pavillon Génie Civil", 35),
        ("Salle Dessin & DAO 602", "Pavillon Génie Civil", 35),
        ("Salle de Séminaire Master 701", "Bâtiment Recherche & Post-Grad", 30),
        ("Salle de Conférence Master 702", "Bâtiment Recherche & Post-Grad", 30),
    ]

    classes_dict = {}  # key: (filiere_name, level)
    created_classes_count = 0

    for fil in filieres:
        for lvl in levels:
            # Code de filière court
            code = "GLSI" if "Logiciel" in fil.name else (
                "RTC" if "Réseaux" in fil.name else (
                    "CFA" if "Comptabilité" in fil.name else (
                        "DAF" if "Droit" in fil.name else (
                            "MDEB" if "Marketing" in fil.name else (
                                "SEG" if "Économiques" in fil.name else "GC-BTP"
                            )
                        )
                    )
                )
            )

            class_name = f"{lvl} {code} — Promo 2026-2027"
            existing_class = db.query(ClassRoom).filter(
                ClassRoom.university_id == univ.id,
                ClassRoom.filiere_id == fil.id,
                ClassRoom.level == lvl
            ).first()

            if not existing_class:
                room_choice, bldg_choice, cap_choice = random.choice(rooms_pool)
                teacher_choice = random.choice(teachers) if teachers else None

                existing_class = ClassRoom(
                    name=class_name,
                    filiere_id=fil.id,
                    level=lvl,
                    room=room_choice,
                    building=bldg_choice,
                    capacity=cap_choice,
                    academic_year="2026-2027",
                    main_teacher_id=teacher_choice.id if teacher_choice else None,
                    university_id=univ.id
                )
                db.add(existing_class)
                db.commit()
                db.refresh(existing_class)
                created_classes_count += 1

            classes_dict[(fil.name, lvl)] = existing_class

    print(f"✅ {len(classes_dict)} Classes configurées ({created_classes_count} nouvellement créées).")

    # ==========================================
    # 2. RATTACHEMENT DES 260 ÉTUDIANTS AUX CLASSES
    # ==========================================
    print("\n--- 2. RATTACHEMENT DES ÉTUDIANTS AUX CLASSES ---")
    attached_students = 0
    for s in students:
        matching_class = classes_dict.get((s.filiere, s.level))
        if matching_class:
            s.class_room_id = matching_class.id
            attached_students += 1
    db.commit()
    print(f"✅ {attached_students}/{len(students)} Étudiants rattachés à leur classe officielle.")

    # ==========================================
    # 3. FRAIS ACADÉMIQUES CONFIGURÉS PAR L'ADMIN (AcademicFee)
    # ==========================================
    print("\n--- 3. CONFIGURATION DES FRAIS ACADÉMIQUES PAR L'ADMIN ---")
    tuition_rates = {
        "L1": {"inscription": 50000.0, "scolarite": 600000.0},
        "L2": {"inscription": 50000.0, "scolarite": 650000.0},
        "L3": {"inscription": 50000.0, "scolarite": 700000.0},
        "M1": {"inscription": 60000.0, "scolarite": 850000.0},
        "M2": {"inscription": 60000.0, "scolarite": 950000.0},
    }

    academic_fees_dict = {}  # key: (level, payment_type)
    for lvl, rates in tuition_rates.items():
        students_count_lvl = db.query(Student).filter(
            Student.university_id == univ.id,
            Student.level == lvl
        ).count()

        for p_type, amount in rates.items():
            fee = db.query(AcademicFee).filter(
                AcademicFee.university_id == univ.id,
                AcademicFee.level == lvl,
                AcademicFee.payment_type == p_type,
                AcademicFee.academic_year == "2026-2027"
            ).first()

            if not fee:
                fee = AcademicFee(
                    university_id=univ.id,
                    level=lvl,
                    payment_type=p_type,
                    amount=amount,
                    currency="FCFA",
                    academic_year="2026-2027",
                    is_locked=True,
                    locked_count=students_count_lvl,
                    created_by=admin.id
                )
                db.add(fee)
                db.commit()
                db.refresh(fee)
            else:
                fee.is_locked = True
                fee.locked_count = students_count_lvl
                fee.amount = amount
                db.commit()

            academic_fees_dict[(lvl, p_type)] = fee

    # Assigner locked_fee_id à chaque étudiant
    for s in students:
        fee_scol = academic_fees_dict.get((s.level, "scolarite"))
        if fee_scol:
            s.locked_fee_id = fee_scol.id
    db.commit()
    print(f"✅ {len(academic_fees_dict)} Grilles tarifaires configurées et verrouillées par l'Admin.")

    # ==========================================
    # 4. ÉCHÉANCIERS OFFICIELS (PaymentDeadline)
    # ==========================================
    print("\n--- 4. ÉCHÉANCIERS ET DATES BUTOIRS DE PAIEMENT ---")
    deadlines_def = [
        ("tranche_1", date(2026, 10, 31), "Date limite Tranche 1 (40% - Inscription et rentrée)"),
        ("tranche_2", date(2027, 1, 31), "Date limite Tranche 2 (30% - Mi-parcours & Examens S1)"),
        ("tranche_3", date(2027, 4, 30), "Date limite Tranche 3 (30% - Solde avant examens S2)"),
    ]

    for d_type, d_date, d_desc in deadlines_def:
        dl = db.query(PaymentDeadline).filter(
            PaymentDeadline.university_id == univ.id,
            PaymentDeadline.deadline_type == d_type,
            PaymentDeadline.academic_year == "2026-2027"
        ).first()

        if not dl:
            dl = PaymentDeadline(
                university_id=univ.id,
                deadline_type=d_type,
                deadline_date=d_date,
                academic_year="2026-2027",
                description=d_desc
            )
            db.add(dl)
        else:
            dl.deadline_date = d_date
            dl.description = d_desc
    db.commit()
    print(f"✅ {len(deadlines_def)} Échéanciers officiels enregistrés.")

    # ==========================================
    # 5. TRANCHES OFFICIELLES PAR NIVEAU (PaymentTranche)
    # ==========================================
    print("\n--- 5. TRANCHES DE PAIEMENT PAR NIVEAU ---")
    tranches_dict = {}  # key: (level, tranche_number)
    for lvl in levels:
        scol_amount = tuition_rates[lvl]["scolarite"]
        tranches_specs = [
            (1, "1ère tranche (40%)", 40.0, scol_amount * 0.40, datetime(2026, 10, 31, 23, 59, 59)),
            (2, "2ème tranche (30%)", 30.0, scol_amount * 0.30, datetime(2027, 1, 31, 23, 59, 59)),
            (3, "3ème tranche (30%)", 30.0, scol_amount * 0.30, datetime(2027, 4, 30, 23, 59, 59))
        ]

        for t_num, t_name, t_pct, t_amt, t_due in tranches_specs:
            tr = db.query(PaymentTranche).filter(
                PaymentTranche.university_id == univ.id,
                PaymentTranche.level == lvl,
                PaymentTranche.payment_type == "scolarite",
                PaymentTranche.academic_year == "2026-2027",
                PaymentTranche.tranche_number == t_num
            ).first()

            if not tr:
                tr = PaymentTranche(
                    university_id=univ.id,
                    level=lvl,
                    payment_type="scolarite",
                    academic_year="2026-2027",
                    tranche_number=t_num,
                    tranche_name=t_name,
                    percentage=t_pct,
                    amount=t_amt,
                    due_date=t_due
                )
                db.add(tr)
                db.commit()
                db.refresh(tr)
            else:
                tr.percentage = t_pct
                tr.amount = t_amt
                tr.due_date = t_due
                db.commit()

            tranches_dict[(lvl, t_num)] = tr

    print(f"✅ {len(tranches_dict)} Tranches officielles configurées pour l'ensemble des niveaux L1-M2.")

    # ==========================================
    # 6. SYNCHRONISATION DES PAIEMENTS & INSTALLMENTS
    # ==========================================
    print("\n--- 6. SYNCHRONISATION DES PAIEMENTS & ÉCHÉANCIERS ---")
    payments = db.query(Payment).filter(Payment.university_id == univ.id).all()
    updated_payments = 0

    for p in payments:
        student = db.query(Student).filter(Student.id == p.student_id).first()
        if not student:
            continue

        p_date = p.payment_date or (p.created_at.date() if p.created_at else date(2026, 10, 15))
        # Déterminer la tranche correspondante selon le mois de paiement
        if p_date.month in [10, 11, 12]:
            t_num = 1
        elif p_date.month in [1, 2, 3]:
            t_num = 2
        else:
            t_num = 3

        target_tranche = tranches_dict.get((student.level, t_num))
        if target_tranche:
            p.tranche_id = target_tranche.id
            if comptable:
                p.created_by = comptable.id
            updated_payments += 1

    db.commit()
    print(f"✅ {updated_payments}/{len(payments)} Paiements reliés à leur tranche officielle et validés par le Comptable.")

    # Création des PaymentInstallment pour chaque étudiant
    installments_created = 0
    for s in students:
        scol_fee = tuition_rates[s.level]["scolarite"]
        # Vérifier si l'étudiant a déjà des installments
        existing_inst = db.query(PaymentInstallment).filter(PaymentInstallment.student_id == s.id).all()
        if not existing_inst:
            # Récupérer les paiements de l'étudiant
            stu_payments = db.query(Payment).filter(Payment.student_id == s.id).all()
            
            p_first = stu_payments[0] if stu_payments else None
            p_id = p_first.id if p_first else 1

            for t_num in [1, 2, 3]:
                t_obj = tranches_dict.get((s.level, t_num))
                amt_due = t_obj.amount if t_obj else (scol_fee * 0.33)
                
                # Montant payé pour cette tranche
                t_payments = [p for p in stu_payments if p.tranche_id == (t_obj.id if t_obj else None)]
                amt_paid = sum(p.amount for p in t_payments)
                
                status = "completed" if amt_paid >= amt_due else ("partial" if amt_paid > 0 else "pending")
                balance = max(0.0, amt_due - amt_paid)

                inst = PaymentInstallment(
                    payment_id=p_id,
                    student_id=s.id,
                    amount_due=amt_due,
                    amount_paid=amt_paid,
                    balance=balance,
                    installment_number=t_num,
                    total_installments=3,
                    due_date=t_obj.due_date if t_obj else datetime(2027, 4, 30),
                    paid_at=datetime.utcnow() if status == "completed" else None,
                    status=status,
                    is_exam_blocked=(status == "pending" and t_num <= 2),
                    description=f"{t_num}ère tranche de scolarité ({s.level})",
                    university_id=univ.id
                )
                db.add(inst)
                installments_created += 1

    db.commit()
    print(f"✅ {installments_created} Échéances individuelles (PaymentInstallment) créées pour les 260 étudiants.")

    print("\n🎉 TOUTE LA CONFIGURATION PÉDAGOGIQUE ET FINANCIÈRE EST OPÉRATIONNELLE ET SYNCHRONISÉE !")

if __name__ == "__main__":
    configure_classes_and_fees()
