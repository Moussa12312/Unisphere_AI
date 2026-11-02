"""
Module de calcul et de résolution déterministe de la scolarité et des frais académiques.
Garantit :
1. Isolation stricte par Université, Niveau LMD et Domaine/Filière :
   - Une filière non configurée ne récupère JAMAIS le tarif ni les tranches d'une autre filière (retourne 0 FCFA, is_configured=False).
2. Aucune mutation SQL implicite lors des lectures (GET).
3. Tri déterministe sur toutes les requêtes SQL pour garantir des montants 100 % stables à chaque rechargement.
4. Mise à l'échelle exacte des tranches en cas de remise/bourse ou de mise à jour tarifaire.
"""
from typing import Optional, Dict, Any, List
import unicodedata
import re
from datetime import date
from sqlalchemy.orm import Session

from app.models.academic_fee import AcademicFee
from app.models.payment_tranche import PaymentTranche
from app.models.student import Student

# Constantes comptables partagées
SCOLARITE_PAYMENT_TYPES = ("scolarite", "reliquat")
VALID_PAYMENT_STATUSES = ("completed", "partial", "validated")


def is_valid_payment_status(status: Optional[str]) -> bool:
    return (status or "").strip().lower() in VALID_PAYMENT_STATUSES


def is_scolarite_payment_type(payment_type: Optional[str]) -> bool:
    pt = (payment_type or "").strip().lower()
    return pt == "" or pt in SCOLARITE_PAYMENT_TYPES


def normalize_academic_level(level: Optional[str]) -> str:
    """
    Normalise les différents formats de niveau académique vers le code canonique LMD.
    Exemples : "Licence 3", "L3", "3", "3ème année" -> "L3"
    """
    if not level:
        return "L1"
    raw = str(level).strip().upper()

    if "LICENCE 1" in raw or raw in ["L1", "1", "1ERE", "1ERE ANNEE", "1ÈRE ANNÉE", "PREMIERE ANNEE"]:
        return "L1"
    if "LICENCE 2" in raw or raw in ["L2", "2", "2EME", "2EME ANNEE", "2ÈME ANNÉE", "DEUXIEME ANNEE"]:
        return "L2"
    if "LICENCE 3" in raw or raw in ["L3", "3", "3EME", "3EME ANNEE", "3ÈME ANNÉE", "TROISIEME ANNEE"]:
        return "L3"
    if "MASTER 1" in raw or raw in ["M1", "4", "4EME", "4EME ANNEE", "4ÈME ANNÉE", "MAITRISE"]:
        return "M1"
    if "MASTER 2" in raw or raw in ["M2", "5", "5EME", "5EME ANNEE", "5ÈME ANNÉE", "MBA"]:
        return "M2"
    if "DOCTORAT 1" in raw or raw in ["D1"]:
        return "D1"
    if "DOCTORAT 2" in raw or raw in ["D2"]:
        return "D2"
    if "DOCTORAT 3" in raw or raw in ["D3", "DOCTORAT", "PHD"]:
        return "D3"
    if "DUT 1" in raw or "BTS 1" in raw or raw in ["DUT1", "BTS1"]:
        return "DUT1"
    if "DUT 2" in raw or "BTS 2" in raw or raw in ["DUT2", "BTS2"]:
        return "DUT2"

    for code in ["L1", "L2", "L3", "M1", "M2", "D1", "D2", "D3", "DUT1", "DUT2"]:
        if raw.startswith(code):
            return code

    return raw


def get_level_variants(canonical_level: str, raw_level: Optional[str] = None) -> List[str]:
    """Retourne toutes les formes textuelles courantes d'un niveau pour requête SQL."""
    variants = {canonical_level}
    if raw_level and str(raw_level).strip():
        variants.add(str(raw_level).strip())

    mapping = {
        "L1": ["L1", "Licence 1", "1"],
        "L2": ["L2", "Licence 2", "2"],
        "L3": ["L3", "Licence 3", "3"],
        "M1": ["M1", "Master 1", "4"],
        "M2": ["M2", "Master 2", "5"],
        "D1": ["D1", "Doctorat 1"],
        "D2": ["D2", "Doctorat 2"],
        "D3": ["D3", "Doctorat 3", "Doctorat"],
        "DUT1": ["DUT1", "DUT 1", "BTS1", "BTS 1"],
        "DUT2": ["DUT2", "DUT 2", "BTS2", "BTS 2"],
    }
    for v in mapping.get(canonical_level, []):
        variants.add(v)
    return sorted(variants)


def normalize_text_key(text: Optional[str]) -> str:
    """Normalise un texte : sans accents, minuscule, '&' -> 'et', sans ponctuation superflue."""
    if not text:
        return ""
    s = unicodedata.normalize("NFKD", str(text)).encode("ASCII", "ignore").decode("utf-8").lower()
    s = s.replace("&", " et ")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# Mots-clés testés uniquement par MOT ENTIER (\b...\b), jamais par sous-chaîne ("ai" exclu pour éviter "affaires")
DOMAIN_SYNONYMS: Dict[str, List[str]] = {
    "Informatique & Technologies": [
        "informatique", "technologie", "technologies", "informatique et technologies",
        "genie informatique", "genie logiciel", "software", "reseau", "reseaux",
        "telecom", "telecommunications", "cybersecurite", "base de donnees",
        "bases de donnees", "developpement web", "intelligence artificielle",
        "data", "systeme d information", "systemes d information", "miage"
    ],
    "Gestion & Economie": [
        "gestion", "economie", "gestion et economie", "finance", "comptabilite",
        "finance et comptabilite", "marketing", "banque", "commerce", "management",
        "ressources humaines", "logistique", "logistique et transport", "transport", "audit"
    ],
    "Communication & Medias": [
        "communication", "media", "medias", "communication et medias",
        "journalisme", "audiovisuel", "relations publiques", "publicite", "multimedia"
    ],
    "Mines & Géologie": [
        "mine", "mines", "geologie", "mines et geologie", "petrole",
        "topographie", "geomatique", "exploration miniere"
    ],
    "Agros Business": [
        "agrobusiness", "agros business", "agriculture", "elevage",
        "pisciculture", "aviculture", "culture hors sol", "agroalimentaire", "agronomie"
    ],
    "Sciences de la Santé": [
        "sante", "medecine", "pharmacie", "infirmier", "sage femme", "biologie medicale", "odontologie"
    ],
    "Sciences Juridiques": [
        "droit", "juridique", "juridiques", "sciences juridiques", "droit prive",
        "droit public", "droit des affaires", "sciences politiques", "science politique"
    ],
}


def _contains_whole_phrase(norm_text: str, phrase: str) -> bool:
    if not norm_text or not phrase:
        return False
    norm_phrase = normalize_text_key(phrase)
    if not norm_phrase:
        return False
    pattern = r"(?:^|\s)" + re.escape(norm_phrase) + r"(?:$|\s)"
    return re.search(pattern, norm_text) is not None


def canonicalize_domain_name(raw_domain: Optional[str]) -> str:
    """Retourne le libellé canonique du domaine s'il correspond à un groupe connu, sinon le texte nettoyé."""
    if not raw_domain or not str(raw_domain).strip():
        return ""
    norm_d = normalize_text_key(raw_domain)
    for canon, syns in DOMAIN_SYNONYMS.items():
        if normalize_text_key(canon) == norm_d:
            return canon
        if any(normalize_text_key(s) == norm_d for s in syns):
            return canon
    return str(raw_domain).strip()


def domains_match_strictly(domain_a: Optional[str], domain_b: Optional[str]) -> bool:
    """Vérifie que deux domaines désignent strictement le même domaine/pôle académique."""
    if not domain_a or not domain_b:
        return False
    na = normalize_text_key(domain_a)
    nb = normalize_text_key(domain_b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    ca = canonicalize_domain_name(domain_a)
    cb = canonicalize_domain_name(domain_b)
    return bool(ca and cb and normalize_text_key(ca) == normalize_text_key(cb))


def infer_student_domain(
    student: Student,
    db: Session,
    university_id: Optional[int] = None,
) -> Optional[str]:
    """
    Détermine de façon 100 % isolée par université le domaine académique d'un étudiant :
    1. En priorité absolue : recherche de `student.filiere` dans la table `Filiere` de CETTE université.
    2. Sinon : `student.domain` explicite s'il est renseigné sur la fiche étudiant.
    3. Sinon : reconnaissance par mot entier sur `student.filiere` via `DOMAIN_SYNONYMS` (ou retour de `student.filiere` tel quel pour isoler toute filière personnalisée non encore configurée).
    """
    target_univ_id = university_id or getattr(student, "university_id", None)
    raw_filiere = (getattr(student, "filiere", None) or "").strip()
    raw_domain = (getattr(student, "domain", None) or "").strip()

    if raw_filiere and target_univ_id:
        from app.models.filiere import Filiere

        univ_filieres = (
            db.query(Filiere)
            .filter(Filiere.university_id == target_univ_id)
            .order_by(Filiere.id.asc())
            .all()
        )
        norm_f = normalize_text_key(raw_filiere)
        for f in univ_filieres:
            if f.domain and str(f.domain).strip():
                if normalize_text_key(f.name) == norm_f or (f.code and normalize_text_key(f.code) == norm_f):
                    return str(f.domain).strip()

        for f in univ_filieres:
            if f.domain and str(f.domain).strip():
                fn = normalize_text_key(f.name)
                if len(fn) >= 5 and len(norm_f) >= 5 and (_contains_whole_phrase(norm_f, fn) or _contains_whole_phrase(fn, norm_f)):
                    return str(f.domain).strip()

    if raw_domain:
        return canonicalize_domain_name(raw_domain)

    if raw_filiere:
        norm_f = normalize_text_key(raw_filiere)
        for canon, syns in DOMAIN_SYNONYMS.items():
            if normalize_text_key(canon) == norm_f:
                return canon
            for s in syns:
                if _contains_whole_phrase(norm_f, s):
                    return canon
        # Filière personnalisée hors synonymes : retourner son propre intitulé afin qu'elle ne soit JAMAIS rattachée à une autre filière !
        return raw_filiere

    return None


def find_matching_academic_fee(
    db: Session,
    student: Student,
    university_id: int,
    payment_type: str = "scolarite",
    target_year: Optional[str] = None,
) -> Optional[AcademicFee]:
    """
    Recherche déterministe et strictement isolée du tarif configuré pour un étudiant :
    - Respecte `student.locked_fee_id` (pour `scolarite`) dans la même université.
    - Exige le même niveau canonique LMD.
    - Exige le même domaine/filière. Un tarif global sans domaine (`domain IS NULL/''`) n'est accepté
      QUE si l'université n'utilise aucun tarif par domaine pour ce type de frais (ou si l'étudiant n'a aucun domaine/filière).
    - AUCUN fallback vers une autre filière, un autre domaine ou un autre niveau !
    """
    target_univ_id = university_id or getattr(student, "university_id", None)
    if not target_univ_id:
        return None

    locked_fee_id = getattr(student, "locked_fee_id", None)
    if payment_type == "scolarite" and locked_fee_id:
        locked_fee = (
            db.query(AcademicFee)
            .filter(
                AcademicFee.id == locked_fee_id,
                AcademicFee.university_id == target_univ_id,
                AcademicFee.payment_type == payment_type,
            )
            .first()
        )
        if locked_fee:
            return locked_fee

    canonical_lvl = normalize_academic_level(student.level)
    level_variants = set(get_level_variants(canonical_lvl, student.level))
    resolved_domain = infer_student_domain(student, db, target_univ_id)

    all_fees = (
        db.query(AcademicFee)
        .filter(
            AcademicFee.university_id == target_univ_id,
            AcademicFee.payment_type == payment_type,
        )
        .order_by(AcademicFee.is_locked.asc(), AcademicFee.id.desc())
        .all()
    )
    if not all_fees:
        return None

    univ_has_domain_fees = any(bool((f.domain or "").strip()) for f in all_fees)

    best_fee: Optional[AcademicFee] = None
    best_score = -1

    for fee in all_fees:
        fee_canon_lvl = normalize_academic_level(fee.level)
        if fee.level not in level_variants and fee_canon_lvl != canonical_lvl:
            continue

        score = 100
        if normalize_text_key(fee.level) == normalize_text_key(student.level):
            score += 5
        if not getattr(fee, "is_locked", False):
            score += 3

        fee_dom_raw = (fee.domain or "").strip()
        if fee_dom_raw:
            if not resolved_domain:
                continue
            if normalize_text_key(fee_dom_raw) == normalize_text_key(resolved_domain):
                score += 200
            elif domains_match_strictly(fee_dom_raw, resolved_domain):
                score += 180
            else:
                # Domaine différent : INTERDICTION absolue de rattacher !
                continue
        else:
            # Tarif global sans domaine : interdit pour la scolarité si l'université configure par domaine
            # et que la filière de l'étudiant n'a pas encore été configurée.
            if payment_type == "scolarite" and univ_has_domain_fees and resolved_domain:
                continue
            score += 50

        if target_year and fee.academic_year == target_year:
            score += 30
        elif fee.academic_year:
            try:
                yr_val = int(str(fee.academic_year).split("-")[0])
                score += min(20, max(0, yr_val - 2024))
            except Exception:
                pass

        if score > best_score:
            best_score = score
            best_fee = fee

    return best_fee


def get_student_tuition_amount(
    db: Session,
    student: Student,
    university_id: Optional[int] = None,
    payment_type: str = "scolarite",
) -> float:
    target_univ_id = university_id or getattr(student, "university_id", None) or 0
    return resolve_student_tuition_breakdown(db, student, target_univ_id, payment_type)["net_amount"]


def resolve_student_tuition_breakdown(
    db: Session,
    student: Student,
    university_id: int,
    payment_type: str = "scolarite",
    target_year: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Résout de manière 100 % déterministe (et sans `db.flush()` implicite) :
    - `is_configured` : True si un tarif existe réellement pour cette filière/niveau, False sinon (`0 FCFA`)
    - `base_amount`, `discount_amount`, `net_amount` (supporte les bourses à 100 % -> `net_amount = 0.0`)
    - `monthly_plan`
    """
    target_univ_id = university_id or getattr(student, "university_id", None)
    resolved_domain = infer_student_domain(student, db, target_univ_id)

    fee = find_matching_academic_fee(
        db=db,
        student=student,
        university_id=target_univ_id,
        payment_type=payment_type,
        target_year=target_year,
    )

    is_configured = fee is not None
    base_amount = float(fee.amount) if (fee and fee.amount is not None) else 0.0

    discount_pct = float(getattr(student, "discount_percentage", 0.0) or 0.0)
    raw_disc_amt = float(getattr(student, "discount_amount", 0.0) or 0.0)
    discount_amount = 0.0

    if payment_type == "scolarite" and is_configured and base_amount > 0:
        if discount_pct >= 100.0:
            discount_amount = base_amount
            net_amount = 0.0
        elif discount_pct > 0.0:
            discount_amount = round(base_amount * (discount_pct / 100.0))
            net_amount = max(0.0, base_amount - discount_amount)
        elif raw_disc_amt > 0.0:
            discount_amount = min(base_amount, raw_disc_amt)
            net_amount = max(0.0, base_amount - discount_amount)
        elif getattr(student, "net_tuition_amount", None) is not None and float(student.net_tuition_amount) >= 0 and (
            getattr(student, "discount_reason", None) or getattr(student, "locked_fee_id", None)
        ):
            # Uniquement si une remise explicite ou un tarif verrouillé a fixé net_tuition_amount
            net_candidate = float(student.net_tuition_amount)
            if net_candidate <= base_amount:
                net_amount = net_candidate
                discount_amount = max(0.0, base_amount - net_amount)
            else:
                net_amount = base_amount
        else:
            net_amount = base_amount
    else:
        net_amount = base_amount
        discount_amount = 0.0

    payment_plan = getattr(student, "payment_plan", "tranches") or "tranches"
    months_count = (
        getattr(student, "monthly_months_count", None)
        or (fee.monthly_months_count if fee and fee.monthly_months_count else 5)
        or 5
    )
    if months_count < 1:
        months_count = 5

    if not is_configured or net_amount <= 0:
        monthly_dep = 0.0
        monthly_inst = 0.0
    else:
        raw_student_dep = getattr(student, "monthly_deposit", None)
        raw_student_inst = getattr(student, "monthly_installment", None)

        if raw_student_dep is not None and float(raw_student_dep) > 0:
            monthly_dep = min(net_amount, float(raw_student_dep))
        elif fee and fee.monthly_deposit is not None and float(fee.monthly_deposit) > 0 and discount_amount == 0:
            monthly_dep = min(net_amount, float(fee.monthly_deposit))
        else:
            monthly_dep = round(net_amount * 0.4)

        rem_after_dep = max(0.0, net_amount - monthly_dep)
        if raw_student_inst is not None and float(raw_student_inst) > 0:
            monthly_inst = float(raw_student_inst)
        elif fee and fee.monthly_installment is not None and float(fee.monthly_installment) > 0 and discount_amount == 0:
            monthly_inst = float(fee.monthly_installment)
        else:
            monthly_inst = round(rem_after_dep / max(1, months_count))

    monthly_plan_info = {
        "has_monthly_option": getattr(fee, "has_monthly_option", True) if fee else False,
        "deposit": round(monthly_dep),
        "installment": round(monthly_inst),
        "months_count": months_count,
        "formatted_summary": (
            f"{int(round(monthly_dep)):,} F à l'inscription, puis {int(round(monthly_inst)):,} F pendant {months_count} mois".replace(",", " ")
            if is_configured and net_amount > 0
            else "Scolarité non configurée pour cette filière"
        ),
    }

    return {
        "is_configured": is_configured,
        "base_amount": base_amount,
        "discount_amount": discount_amount,
        "discount_percentage": discount_pct,
        "discount_reason": getattr(student, "discount_reason", None),
        "discount_approved_by": getattr(student, "discount_approved_by", None),
        "net_amount": net_amount,
        "fee_id": fee.id if fee else None,
        "fee_academic_year": fee.academic_year if fee else None,
        "domain": resolved_domain or (fee.domain if fee else getattr(student, "domain", None)),
        "inferred_domain": resolved_domain,
        "level": student.level,
        "canonical_level": normalize_academic_level(student.level),
        "payment_plan": payment_plan,
        "monthly_plan": monthly_plan_info,
    }


def get_monthly_schedule_for_student(
    breakdown: Dict[str, Any],
    total_paid: float,
    payments: List[Any],
    academic_year: Optional[str] = "2025-2026",
) -> List[Dict[str, Any]]:
    """
    Génère la grille détaillée des mensualités (Acompte inscription + mensualités régulières)
    et ventile le montant déjà versé. Retourne `[]` si la filière n'est pas configurée.
    """
    if not breakdown.get("is_configured", True):
        return []

    m_info = breakdown["monthly_plan"]
    deposit = m_info["deposit"]
    installment = m_info["installment"]
    months_count = m_info["months_count"]
    total_net = round(float(breakdown["net_amount"] or 0.0))

    year = date.today().year
    if academic_year and "-" in str(academic_year):
        try:
            year = int(str(academic_year).split("-")[0])
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
        date(year + 1, 6, 30),
    ]
    month_names = ["Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"]

    items = [
        {
            "number": 1,
            "name": "Acompte à l'inscription",
            "amount": round(deposit),
            "due_date": schedule_dates[0].isoformat(),
        }
    ]

    for i in range(months_count):
        m_name = month_names[i] if i < len(month_names) else f"Mois {i + 1}"
        m_date = schedule_dates[i + 1] if (i + 1) < len(schedule_dates) else schedule_dates[-1]
        items.append({
            "number": i + 2,
            "name": f"Mensualité {i + 1} ({m_name})",
            "amount": round(installment),
            "due_date": m_date.isoformat(),
        })

    sum_items = sum(it["amount"] for it in items)
    if sum_items != total_net and len(items) > 0:
        diff = total_net - sum_items
        items[-1]["amount"] = max(0, items[-1]["amount"] + diff)

    valid_scol_payments = [
        p for p in (payments or [])
        if is_valid_payment_status(getattr(p, "status", None)) and is_scolarite_payment_type(getattr(p, "payment_type", None))
    ]
    last_payment = valid_scol_payments[-1] if valid_scol_payments else None

    remaining_to_allocate = float(total_paid or 0.0)
    tranches_result = []

    for idx, it in enumerate(items):
        amt = it["amount"]
        if amt == 0 and total_net == 0:
            p_amt = 0.0
            st = "paid"
        elif remaining_to_allocate >= amt and amt > 0:
            p_amt = float(amt)
            st = "paid"
            remaining_to_allocate -= amt
        elif remaining_to_allocate > 0:
            p_amt = remaining_to_allocate
            st = "available"
            remaining_to_allocate = 0.0
        else:
            p_amt = 0.0
            if idx == 0 or (tranches_result and tranches_result[-1]["status"] == "paid"):
                st = "available"
            else:
                st = "locked"

        matched_p = last_payment if p_amt > 0 and last_payment else None
        tranches_result.append({
            "id": idx + 1,
            "number": it["number"],
            "name": it["name"],
            "amount": amt,
            "percentage": round((amt / total_net) * 100, 1) if total_net > 0 else 0,
            "status": st,
            "due_date": it["due_date"],
            "paid_amount": round(p_amt),
            "remaining": round(max(0.0, amt - p_amt)),
            "payment_id": getattr(matched_p, "id", None) if matched_p else None,
            "payment_date": (
                matched_p.payment_date.isoformat()
                if matched_p and getattr(matched_p, "payment_date", None)
                else (matched_p.created_at.isoformat() if matched_p and getattr(matched_p, "created_at", None) else None)
            ),
            "payment_method": getattr(matched_p, "payment_method", None) if matched_p else None,
            "receipt_number": (getattr(matched_p, "receipt_number", None) or getattr(matched_p, "reference", None)) if matched_p else None,
            "is_monthly": True,
        })

    return tranches_result


def get_configured_tranches_for_student(
    db: Session,
    student: Student,
    university_id: int,
    net_tuition_amount: float = 0.0,
) -> List[PaymentTranche]:
    """
    Récupère les tranches de paiement configurées pour le niveau ET le domaine EXACTS de l'étudiant.
    - Si la scolarité de la filière/domaine de l'étudiant n'est PAS configurée, retourne `[]` (Zéro rattachement croisé).
    - Ne récupère JAMAIS les tranches d'un autre domaine/filière.
    """
    from app.utils.academic_year import get_current_academic_year
    from app.models.payment import Payment

    target_univ_id = university_id or getattr(student, "university_id", None)
    if not target_univ_id:
        return []

    # Vérifier d'abord que la filière/niveau a bien un tarif de scolarité configuré !
    matched_fee = find_matching_academic_fee(db, student, target_univ_id, "scolarite")
    if not matched_fee:
        return []

    target_year = getattr(student, "academic_year", None) or get_current_academic_year(db, target_univ_id)
    canonical_lvl = normalize_academic_level(student.level)
    level_variants = set(get_level_variants(canonical_lvl, student.level))
    resolved_domain = infer_student_domain(student, db, target_univ_id)

    existing_payments = (
        db.query(Payment)
        .filter(Payment.student_id == student.id)
        .order_by(Payment.id.asc())
        .all()
    )
    paid_tranche_ids = {
        p.tranche_id
        for p in existing_payments
        if p.tranche_id and is_valid_payment_status(p.status) and is_scolarite_payment_type(p.payment_type)
    }

    all_univ_tranches = (
        db.query(PaymentTranche)
        .filter(
            PaymentTranche.university_id == target_univ_id,
            PaymentTranche.payment_type == "scolarite",
        )
        .order_by(PaymentTranche.tranche_number.asc(), PaymentTranche.id.desc())
        .all()
    )
    if not all_univ_tranches:
        return []

    univ_has_domain_tranches = any(bool((t.domain or "").strip()) for t in all_univ_tranches)
    lvl_tranches = [
        t for t in all_univ_tranches
        if t.level in level_variants or normalize_academic_level(t.level) == canonical_lvl
    ]
    if not lvl_tranches:
        return []

    def _select_and_deduplicate(candidates: List[PaymentTranche]) -> List[PaymentTranche]:
        by_number: Dict[int, PaymentTranche] = {}
        for t in candidates:
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

    # 1. Recherche stricte sur le domaine résolu de l'étudiant
    if resolved_domain:
        exact_dom_year = [
            t for t in lvl_tranches
            if (t.domain or "").strip()
            and domains_match_strictly(t.domain, resolved_domain)
            and t.academic_year == target_year
        ]
        if exact_dom_year:
            return _select_and_deduplicate(exact_dom_year)

        exact_dom_any_year = [
            t for t in lvl_tranches
            if (t.domain or "").strip() and domains_match_strictly(t.domain, resolved_domain)
        ]
        if exact_dom_any_year:
            return _select_and_deduplicate(exact_dom_any_year)

    # 2. Tranches globales sans domaine UNIQUEMENT si le tarif trouvé est lui-même global
    # ou si l'université n'utilise aucune tranche par domaine
    fee_is_global = not bool((matched_fee.domain or "").strip())
    if fee_is_global or not univ_has_domain_tranches:
        global_year = [
            t for t in lvl_tranches
            if not (t.domain or "").strip() and t.academic_year == target_year
        ]
        if global_year:
            return _select_and_deduplicate(global_year)

        global_any = [t for t in lvl_tranches if not (t.domain or "").strip()]
        if global_any:
            return _select_and_deduplicate(global_any)

    return []


def scale_tranches_to_amount(
    configured_tranches: List[PaymentTranche],
    target_total: float,
) -> List[Dict[str, Any]]:
    """
    Calcule les montants effectifs des tranches pour `target_total` (ex: `net_amount` après bourse/remise
    ou après mise à jour du tarif `AcademicFee`), SANS jamais modifier les objets SQLAlchemy `PaymentTranche`.
    La somme des montants retournés est garantie strictement égale à `round(target_total)`.
    """
    if not configured_tranches:
        return []

    target_rounded = max(0, int(round(float(target_total or 0.0))))
    n = len(configured_tranches)

    if target_rounded == 0:
        return [
            {
                "id": ct.id,
                "tranche_number": ct.tranche_number,
                "tranche_name": ct.tranche_name or f"Tranche {ct.tranche_number}",
                "percentage": float(ct.percentage or 0.0),
                "amount": 0.0,
                "due_date": ct.due_date,
            }
            for ct in configured_tranches
        ]

    raw_amounts = [max(0.0, float(ct.amount or 0.0)) for ct in configured_tranches]
    raw_sum = sum(raw_amounts)
    pct_sum = sum(max(0.0, float(ct.percentage or 0.0)) for ct in configured_tranches)

    scaled: List[Dict[str, Any]] = []
    allocated = 0

    for idx, ct in enumerate(configured_tranches):
        if idx == n - 1:
            amt = max(0, target_rounded - allocated)
        else:
            if abs(raw_sum - target_rounded) <= 1.0 and raw_sum > 0:
                amt = int(round(raw_amounts[idx]))
            elif pct_sum > 0:
                amt = int(round((target_rounded * max(0.0, float(ct.percentage or 0.0))) / pct_sum))
            elif raw_sum > 0:
                amt = int(round((target_rounded * raw_amounts[idx]) / raw_sum))
            else:
                amt = int(round(target_rounded / n))
            amt = min(amt, max(0, target_rounded - allocated))
            allocated += amt

        scaled.append({
            "id": ct.id,
            "tranche_number": ct.tranche_number,
            "tranche_name": ct.tranche_name or f"Tranche {ct.tranche_number}",
            "percentage": float(ct.percentage or 0.0),
            "amount": float(amt),
            "due_date": ct.due_date,
        })

    return scaled
