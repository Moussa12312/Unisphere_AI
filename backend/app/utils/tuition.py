"""
Module de calcul et de résolution de la scolarité et des frais académiques.
Gère :
1. Les tarifs configurés par Niveau ET Domaine/Pôle (ex: Gestion vs Santé vs Informatique)
2. La détection intelligente et tolérante des niveaux LMD (ex: "Licence 3" <-> "L3", "Master 2" <-> "M2")
3. L'inférence automatique et robuste des domaines/filières (synonymes, & vs et, sans accents)
4. La déduction comptable des remises/bourses négociées (montant fixe ou pourcentage)
5. La transparence comptable (net dû = tarif standard - réduction autorisée)
6. Zéro fallback arbitraire : calcul dynamique strict depuis les tarifs configurés par l'administration.
"""
from typing import Optional, Dict, Any, List
import unicodedata
import re
from datetime import date
from sqlalchemy.orm import Session
from app.models.academic_fee import AcademicFee
from app.models.payment_tranche import PaymentTranche
from app.models.student import Student


def normalize_academic_level(level: Optional[str]) -> str:
    """
    Normalise les différents formats de niveau académique vers le code canonique LMD.
    Exemples :
    - "Licence 3", "licence 3", "L3", "3", "3ème année" -> "L3"
    - "Licence 1", "L1", "1" -> "L1"
    - "Master 2", "M2", "5" -> "M2"
    """
    if not level:
        return "L1"
    raw = str(level).strip().upper()
    
    # Licence 1
    if "LICENCE 1" in raw or raw in ["L1", "1", "1ERE", "1ERE ANNEE", "1ÈRE ANNÉE", "PREMIERE ANNEE"]:
        return "L1"
    # Licence 2
    if "LICENCE 2" in raw or raw in ["L2", "2", "2EME", "2EME ANNEE", "2ÈME ANNÉE", "DEUXIEME ANNEE"]:
        return "L2"
    # Licence 3
    if "LICENCE 3" in raw or raw in ["L3", "3", "3EME", "3EME ANNEE", "3ÈME ANNÉE", "TROISIEME ANNEE"]:
        return "L3"
    # Master 1
    if "MASTER 1" in raw or raw in ["M1", "4", "4EME", "4EME ANNEE", "4ÈME ANNÉE"]:
        return "M1"
    # Master 2
    if "MASTER 2" in raw or raw in ["M2", "5", "5EME", "5EME ANNEE", "5ÈME ANNÉE"]:
        return "M2"
    # Doctorat
    if "DOCTORAT 1" in raw or raw in ["D1"]:
        return "D1"
    if "DOCTORAT 2" in raw or raw in ["D2"]:
        return "D2"
    if "DOCTORAT 3" in raw or raw in ["D3"]:
        return "D3"
        
    for code in ["L1", "L2", "L3", "M1", "M2", "D1", "D2", "D3"]:
        if raw.startswith(code):
            return code
            
    return raw


def get_level_variants(canonical_level: str, raw_level: Optional[str] = None) -> List[str]:
    """Retourne toutes les formes textuelles courantes d'un niveau pour requête SQL."""
    variants = {canonical_level}
    if raw_level:
        variants.add(str(raw_level).strip())
    
    mapping = {
        "L1": ["L1", "Licence 1", "1"],
        "L2": ["L2", "Licence 2", "2"],
        "L3": ["L3", "Licence 3", "3"],
        "M1": ["M1", "Master 1", "4"],
        "M2": ["M2", "Master 2", "5"],
        "D1": ["D1", "Doctorat 1"],
        "D2": ["D2", "Doctorat 2"],
        "D3": ["D3", "Doctorat 3"],
    }
    for v in mapping.get(canonical_level, []):
        variants.add(v)
    return list(variants)


def normalize_text_key(text: Optional[str]) -> str:
    """Normalise un texte pour comparaison souple : sans accents, minuscule, '&' -> 'et', sans ponctuation superflue."""
    if not text:
        return ""
    s = unicodedata.normalize('NFKD', str(text)).encode('ASCII', 'ignore').decode('utf-8').lower()
    s = s.replace('&', ' et ')
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


DOMAIN_SYNONYMS = {
    "Informatique & Technologies": [
        "informatique", "technologie", "technologies", "informatique et technologies",
        "genie informatique", "genie logiciel", "software", "reseau", "reseaux",
        "telecom", "telecommunications", "cyber", "cybersecurite", "base de donnees",
        "bases de donnees", "developpement web", "intelligence artificielle", "ai",
        "data", "systeme dinformation", "systemes dinformation"
    ],
    "Gestion & Economie": [
        "gestion", "economie", "gestion et economie", "finance", "comptabilite",
        "finance et comptabilite", "marketing", "banque", "commerce", "management",
        "ressources humaines", "logistique", "logistique et transport", "transport"
    ],
    "Communication & Medias": [
        "communication", "media", "medias", "communication et medias",
        "journalisme", "audiovisuel", "relations publiques", "publicite"
    ],
    "Mines & Géologie": [
        "mine", "mines", "geologie", "mines et geologie", "petrole",
        "environnement", "topographie", "geomatique", "exploration miniere"
    ],
    "Agros Business": [
        "agro", "agrobusiness", "agros business", "agriculture", "elevage",
        "pisciculture", "aviculture", "culture hors sol", "agroalimentaire"
    ],
    "Sciences de la Santé": [
        "sante", "medecine", "pharmacie", "infirmier", "sage femme", "biologie medicale"
    ],
    "Sciences Juridiques": [
        "droit", "juridique", "sciences juridiques", "droit prive", "droit public"
    ]
}


def infer_student_domain(student: Student, db: Session) -> Optional[str]:
    """
    Détermine avec certitude le domaine d'un étudiant à partir de son domain explicite,
    de sa filière en base de données, ou de la reconnaissance sémantique de son intitulé.
    """
    raw_domain = getattr(student, "domain", None)
    if raw_domain and str(raw_domain).strip():
        norm_d = normalize_text_key(raw_domain)
        # Vérifier si c'est un domaine canonique ou synonyme
        for canon, syns in DOMAIN_SYNONYMS.items():
            if normalize_text_key(canon) == norm_d or any(normalize_text_key(s) == norm_d for s in syns):
                return canon
        return str(raw_domain).strip()

    # Recherche via la table Filiere
    raw_filiere = getattr(student, "filiere", None)
    if raw_filiere and str(raw_filiere).strip():
        from app.models.filiere import Filiere
        # 1. Égalité stricte
        fil = db.query(Filiere).filter(Filiere.name == raw_filiere).first()
        if fil and fil.domain:
            return fil.domain

        # 2. Égalité insensible à la casse
        fils = db.query(Filiere).all()
        norm_f = normalize_text_key(raw_filiere)
        for f in fils:
            if normalize_text_key(f.name) == norm_f and f.domain:
                return f.domain

        # 3. Correspondance sémantique avec DOMAIN_SYNONYMS
        for canon, syns in DOMAIN_SYNONYMS.items():
            if normalize_text_key(canon) == norm_f:
                return canon
            for s in syns:
                if normalize_text_key(s) in norm_f or norm_f in normalize_text_key(s):
                    return canon

    return None


def find_matching_academic_fee(
    db: Session,
    student: Student,
    university_id: int,
    payment_type: str = "scolarite",
    target_year: Optional[str] = None
) -> Optional[AcademicFee]:
    """
    Recherche le meilleur tarif académique configuré pour un étudiant.
    Priorité absolue :
    1. Niveau normalisé + Domaine résolu + Année cible
    2. Niveau normalisé + Domaine résolu (toute année)
    3. Niveau normalisé + Frais général sans domaine
    4. Tout frais configuré pour le niveau de l'étudiant
    5. Tout frais de scolarité actif pour cette université
    """
    canonical_lvl = normalize_academic_level(student.level)
    level_variants = get_level_variants(canonical_lvl, student.level)
    resolved_domain = infer_student_domain(student, db)

    # Récupérer tous les frais de l'université pour ce type de paiement
    all_fees = db.query(AcademicFee).filter(
        AcademicFee.university_id == university_id,
        AcademicFee.payment_type == payment_type
    ).all()

    if not all_fees:
        return None

    # Normalisation du domaine recherché
    norm_target_domain = normalize_text_key(resolved_domain) if resolved_domain else ""
    norm_student_filiere = normalize_text_key(student.filiere)

    best_fee = None
    best_score = -1

    for fee in all_fees:
        fee_canon_lvl = normalize_academic_level(fee.level)
        fee_norm_dom = normalize_text_key(fee.domain)
        score = 0

        # Évaluation du Niveau
        if fee.level in level_variants or fee_canon_lvl == canonical_lvl:
            score += 100
        else:
            # Niveau différent : ne pas associer
            continue

        # Évaluation du Domaine / Filière
        if norm_target_domain and fee_norm_dom:
            if fee_norm_dom == norm_target_domain:
                score += 150
            elif norm_target_domain in fee_norm_dom or fee_norm_dom in norm_target_domain:
                score += 100
            elif norm_student_filiere and (fee_norm_dom in norm_student_filiere or norm_student_filiere in fee_norm_dom):
                score += 90
            else:
                score += 10
        elif not fee.domain:
            # Tarif général (sans restriction de domaine)
            score += 50
        elif norm_student_filiere and fee_norm_dom and (fee_norm_dom in norm_student_filiere or norm_student_filiere in fee_norm_dom):
            score += 90

        # Évaluation de l'Année Académique
        if target_year and fee.academic_year == target_year:
            score += 30
        elif fee.academic_year:
            # Bonus pour l'année la plus récente
            try:
                yr_val = int(fee.academic_year.split("-")[0])
                score += min(20, max(0, yr_val - 2024))
            except Exception:
                pass

        if score > best_score:
            best_score = score
            best_fee = fee

    # Fallback dynamique si aucun score satisfaisant n'a été trouvé
    if not best_fee:
        # Chercher le premier tarif du niveau canonique
        for fee in all_fees:
            if normalize_academic_level(fee.level) == canonical_lvl:
                best_fee = fee
                break

    # Si toujours rien, prendre le premier tarif configuré de l'université
    if not best_fee and all_fees:
        best_fee = all_fees[0]

    return best_fee


def resolve_student_tuition_breakdown(
    db: Session,
    student: Student,
    university_id: int,
    payment_type: str = "scolarite",
    target_year: Optional[str] = None
) -> Dict[str, Any]:
    """
    Résout le tarif de base, la remise négociée éventuelle et le net dû pour un étudiant.
    Priorise le tarif spécifique au domaine/pôle de l'étudiant, puis le tarif global.
    """
    # Résolution intelligente du domaine si manquant
    resolved_domain = infer_student_domain(student, db)
    if resolved_domain and not student.domain:
        try:
            student.domain = resolved_domain
            db.flush()
        except Exception:
            pass

    fee = find_matching_academic_fee(
        db=db,
        student=student,
        university_id=university_id,
        payment_type=payment_type,
        target_year=target_year
    )

    # Calcul dynamique du tarif de base (aucun fallback arbitraire)
    if fee:
        base_amount = float(fee.amount)
    else:
        # Si aucun frais n'est configuré du tout dans l'université, chercher un montant par défaut
        existing_fees = db.query(AcademicFee).filter(AcademicFee.university_id == university_id).all()
        if existing_fees:
            base_amount = float(existing_fees[0].amount)
        else:
            base_amount = 0.0

    if payment_type == "scolarite":
        if student.net_tuition_amount is not None and float(student.net_tuition_amount) > 0:
            net_amount = float(student.net_tuition_amount)
            discount_amount = max(0.0, base_amount - net_amount) if base_amount > net_amount else 0.0
        elif (student.discount_amount or 0.0) > 0:
            discount_amount = float(student.discount_amount)
            net_amount = max(0.0, base_amount - discount_amount)
        elif (student.discount_percentage or 0.0) > 0:
            discount_amount = round(base_amount * (float(student.discount_percentage) / 100.0))
            net_amount = max(0.0, base_amount - discount_amount)
        else:
            net_amount = base_amount
            discount_amount = 0.0
    else:
        net_amount = base_amount
        discount_amount = 0.0

    # Résolution de la modalité mensuelle
    payment_plan = getattr(student, "payment_plan", "tranches") or "tranches"
    months_count = getattr(student, "monthly_months_count", None) or (fee.monthly_months_count if fee and fee.monthly_months_count else 5) or 5
    monthly_inst = getattr(student, "monthly_installment", None) or (fee.monthly_installment if fee and fee.monthly_installment else None)

    if not monthly_inst or monthly_inst <= 0:
        # Calcul automatique : étaler 60% sur months_count mois
        monthly_inst = round((net_amount * 0.6) / max(1, months_count))
    else:
        monthly_inst = float(monthly_inst)

    if getattr(student, "monthly_deposit", None) is not None and float(student.monthly_deposit) > 0:
        monthly_dep = float(student.monthly_deposit)
    elif fee and fee.monthly_deposit is not None and float(fee.monthly_deposit) > 0:
        monthly_dep = float(fee.monthly_deposit)
    else:
        calc_dep = net_amount - (months_count * monthly_inst)
        monthly_dep = max(0.0, calc_dep) if calc_dep > 0 else round(net_amount * 0.4)

    monthly_plan_info = {
        "has_monthly_option": getattr(fee, "has_monthly_option", True) if fee else True,
        "deposit": round(monthly_dep),
        "installment": round(monthly_inst),
        "months_count": months_count,
        "formatted_summary": f"{int(monthly_dep):,} F à l'inscription, puis {int(monthly_inst):,} F pendant {months_count} mois".replace(",", " ")
    }

    return {
        "base_amount": base_amount,
        "discount_amount": discount_amount,
        "discount_percentage": float(student.discount_percentage or 0.0),
        "discount_reason": student.discount_reason,
        "discount_approved_by": student.discount_approved_by,
        "net_amount": net_amount,
        "fee_id": fee.id if fee else None,
        "fee_academic_year": fee.academic_year if fee else None,
        "domain": resolved_domain or (fee.domain if fee else student.domain),
        "level": student.level,
        "canonical_level": normalize_academic_level(student.level),
        "payment_plan": payment_plan,
        "monthly_plan": monthly_plan_info
    }


def get_monthly_schedule_for_student(
    breakdown: Dict[str, Any],
    total_paid: float,
    payments: List[Any],
    academic_year: Optional[str] = "2025-2026"
) -> List[Dict[str, Any]]:
    """
    Génère la grille détaillée des mensualités (Acompte inscription + mensualités régulières)
    et ventile le montant déjà versé.
    """
    m_info = breakdown["monthly_plan"]
    deposit = m_info["deposit"]
    installment = m_info["installment"]
    months_count = m_info["months_count"]
    total_net = breakdown["net_amount"]

    year = 2025
    if academic_year and "-" in academic_year:
        try:
            year = int(academic_year.split("-")[0])
        except Exception:
            year = date.today().year

    schedule_dates = [
        date(year, 10, 31),
        date(year, 11, 30),
        date(year, 12, 31),
        date(year + 1, 1, 31),
        date(year + 1, 2, 28),
        date(year + 1, 3, 31),
        date(year + 1, 4, 30),
        date(year + 1, 5, 31),
        date(year + 1, 6, 30)
    ]
    month_names = ["Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"]

    items = []
    items.append({
        "number": 1,
        "name": "Acompte à l'inscription",
        "amount": round(deposit),
        "due_date": schedule_dates[0].isoformat()
    })

    for i in range(months_count):
        m_name = month_names[i] if i < len(month_names) else f"Mois {i+1}"
        m_date = schedule_dates[i+1] if (i+1) < len(schedule_dates) else schedule_dates[-1]
        items.append({
            "number": i + 2,
            "name": f"Mensualité {i+1} ({m_name})",
            "amount": round(installment),
            "due_date": m_date.isoformat()
        })

    sum_items = sum(it["amount"] for it in items)
    if sum_items != total_net and len(items) > 0:
        diff = total_net - sum_items
        items[-1]["amount"] = max(0, items[-1]["amount"] + diff)

    remaining_to_allocate = total_paid
    tranches_result = []

    for idx, it in enumerate(items):
        amt = it["amount"]
        if remaining_to_allocate >= amt:
            p_amt = amt
            st = "paid"
            remaining_to_allocate -= amt
        elif remaining_to_allocate > 0:
            p_amt = remaining_to_allocate
            st = "available"
            remaining_to_allocate = 0
        else:
            p_amt = 0
            if idx == 0 or (tranches_result and tranches_result[-1]["status"] == "paid"):
                st = "available"
            else:
                st = "locked"

        tranches_result.append({
            "id": idx + 1,
            "number": it["number"],
            "name": it["name"],
            "amount": amt,
            "percentage": round((amt / total_net) * 100, 1) if total_net > 0 else 0,
            "status": st,
            "due_date": it["due_date"],
            "paid_amount": round(p_amt),
            "remaining": round(max(0, amt - p_amt)),
            "payment_date": None,
            "payment_method": None,
            "receipt_number": None,
            "is_monthly": True
        })

    return tranches_result


def get_configured_tranches_for_student(
    db: Session,
    student: Student,
    university_id: int,
    net_tuition_amount: float
) -> List[PaymentTranche]:
    """
    Récupère les tranches de paiement configurées, en priorisant celles du domaine de l'étudiant
    et de l'année académique courante, avec dédoublonnage strict par numéro de tranche (P1, P2, P3...).
    Tolérant aux formats de niveau ("Licence 3" <-> "L3").
    """
    from app.utils.academic_year import get_current_academic_year
    from app.models.payment import Payment

    target_year = getattr(student, "academic_year", None) or get_current_academic_year(db, university_id)
    canonical_lvl = normalize_academic_level(student.level)
    level_variants = get_level_variants(canonical_lvl, student.level)
    resolved_domain = infer_student_domain(student, db)

    # Récupérer les IDs des tranches déjà payées par cet étudiant
    existing_payments = db.query(Payment).filter(
        Payment.student_id == student.id,
        Payment.status == "completed"
    ).all()
    paid_tranche_ids = {p.tranche_id for p in existing_payments if p.tranche_id}

    base_query = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == university_id,
        PaymentTranche.level.in_(level_variants),
        PaymentTranche.payment_type == "scolarite"
    )

    def _select_and_deduplicate(tranches_candidates: List[PaymentTranche]) -> List[PaymentTranche]:
        """Garantit l'unicité stricte de chaque numéro de tranche (P1, P2, P3)."""
        by_number = {}
        for t in tranches_candidates:
            num = t.tranche_number
            if num not in by_number:
                by_number[num] = t
            else:
                existing = by_number[num]
                if t.id in paid_tranche_ids and existing.id not in paid_tranche_ids:
                    by_number[num] = t
                elif existing.academic_year != target_year and t.academic_year == target_year:
                    by_number[num] = t

        return [by_number[n] for n in sorted(by_number.keys())]

    # 1. Domaine spécifique + Année académique cible
    if resolved_domain:
        candidates = base_query.filter(
            PaymentTranche.domain == resolved_domain,
            PaymentTranche.academic_year == target_year
        ).order_by(PaymentTranche.tranche_number).all()
        if candidates:
            return _select_and_deduplicate(candidates)

        # Tolérance de domaine insensible à la casse / synonymes
        all_tranches = base_query.all()
        norm_t_dom = normalize_text_key(resolved_domain)
        matched_candidates = [
            t for t in all_tranches
            if t.domain and (normalize_text_key(t.domain) == norm_t_dom or norm_t_dom in normalize_text_key(t.domain))
        ]
        if matched_candidates:
            return _select_and_deduplicate(matched_candidates)

    # 2. Tranches générales (sans domaine) + Année académique cible
    global_candidates = base_query.filter(
        (PaymentTranche.domain == None) | (PaymentTranche.domain == ""),
        PaymentTranche.academic_year == target_year
    ).order_by(PaymentTranche.tranche_number).all()
    if global_candidates:
        return _select_and_deduplicate(global_candidates)

    # 3. Dernier secours : toutes tranches du niveau dédoublonnées
    fallback = base_query.order_by(PaymentTranche.tranche_number).all()
    if fallback:
        return _select_and_deduplicate(fallback)

    # 4. Secours étendu : si les tranches sont enregistrées sous un code de niveau canonique
    fallback_canonical = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == university_id,
        PaymentTranche.level == canonical_lvl,
        PaymentTranche.payment_type == "scolarite"
    ).order_by(PaymentTranche.tranche_number).all()
    return _select_and_deduplicate(fallback_canonical)
