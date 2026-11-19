import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models.student import Student
from app.models.course import Course
from app.models.filiere import Filiere

LEVEL_ALIASES = {
    "l1": ["L1", "Licence 1", "LICENCE 1", "1ère Année", "1ere Annee"],
    "licence 1": ["L1", "Licence 1", "LICENCE 1", "1ère Année", "1ere Annee"],
    "l2": ["L2", "Licence 2", "LICENCE 2", "2ème Année", "2eme Annee"],
    "licence 2": ["L2", "Licence 2", "LICENCE 2", "2ème Année", "2eme Annee"],
    "l3": ["L3", "Licence 3", "LICENCE 3", "3ème Année", "3eme Annee"],
    "licence 3": ["L3", "Licence 3", "LICENCE 3", "3ème Année", "3eme Annee"],
    "m1": ["M1", "Master 1", "MASTER 1"],
    "master 1": ["M1", "Master 1", "MASTER 1"],
    "m2": ["M2", "Master 2", "MASTER 2"],
    "master 2": ["M2", "Master 2", "MASTER 2"],
    "doctorat": ["Doctorat", "DOCTORAT", "PhD", "D1"],
}


def get_level_variants(level_str: str) -> list[str]:
    if not level_str:
        return []
    key = level_str.strip().lower()
    variants = set(LEVEL_ALIASES.get(key, [level_str.strip()]))
    variants.add(level_str.strip())
    return list(variants)


def expand_filiere_variants(name: str) -> list[str]:
    """Extrait le nom complet, le nom sans parenthèses et le sigle entre parenthèses ex: (GLSI)."""
    if not name:
        return []
    clean = name.strip()
    variants = {clean}
    # Extraire l'acronyme entre parenthèses ex: "Génie Logiciel (GLSI)" -> "GLSI"
    for match in re.findall(r"\(([^)]+)\)", clean):
        m = match.strip()
        if len(m) >= 2:
            variants.add(m)
    # Extraire la partie avant la parenthèse
    before_paren = re.sub(r"\s*\([^)]*\)", "", clean).strip()
    if len(before_paren) >= 3:
        variants.add(before_paren)
    return list(variants)


def get_course_target_filiere_names(db: Session, course: Course, university_id: int):
    """
    Retourne:
    - None si le cours concerne TOUTES les filières du niveau (Tronc Commun intégral 'ALL').
    - Une liste de noms/variantes de filières [str, ...] si le cours concerne une sélection de filières ou une filière unique.
    """
    is_cc = bool(getattr(course, 'is_common_core', False)) or (
        (getattr(course, 'department', '') or '').strip().lower() in ('tronc commun', 'transversal', 'all')
    )
    cc_filieres = (getattr(course, 'common_core_filieres', None) or '').strip()

    if is_cc:
        if not cc_filieres or cc_filieres.upper() == 'ALL':
            return None  # Toutes les filières de l'établissement pour ce niveau
        ids = []
        raw_names = []
        for part in cc_filieres.split(','):
            p = part.strip()
            if not p:
                continue
            if p.isdigit():
                ids.append(int(p))
            else:
                raw_names.append(p)
        if ids:
            rows = db.query(Filiere.name).filter(
                Filiere.id.in_(ids),
                Filiere.university_id == university_id
            ).all()
            raw_names.extend([r[0] for r in rows if r[0]])
        expanded = []
        for rn in raw_names:
            expanded.extend(expand_filiere_variants(rn))
        return expanded if expanded else None

    # Cours rattaché à une filière unique
    raw_names = []
    if getattr(course, 'filiere', None) and getattr(course.filiere, 'name', None):
        raw_names.append(course.filiere.name)
    elif getattr(course, 'filiere_id', None):
        f_obj = db.query(Filiere).filter(Filiere.id == course.filiere_id).first()
        if f_obj and f_obj.name:
            raw_names.append(f_obj.name)
    if getattr(course, 'department', None) and course.department.strip().lower() not in ('tronc commun', 'transversal', 'all'):
        if course.department not in raw_names:
            raw_names.append(course.department)

    expanded = []
    for rn in raw_names:
        expanded.extend(expand_filiere_variants(rn))
    return expanded if expanded else None


def build_course_students_query(db: Session, course: Course, university_id: int):
    """
    Construit la requête SQLAlchemy retournant tous les étudiants inscrits à ce cours
    (gère Filière unique, Tronc Commun multi-filières par sélection, et Tronc Commun global).
    """
    uid = university_id or course.university_id
    query = db.query(Student).filter(Student.university_id == uid)

    if course.level:
        lvl_variants = get_level_variants(course.level)
        query = query.filter(
            or_(*[func.lower(Student.level) == v.lower() for v in lvl_variants])
        )

    target_names = get_course_target_filiere_names(db, course, uid)
    if target_names is not None:
        conditions = []
        for name in target_names:
            clean = name.strip()
            if clean:
                conditions.append(func.lower(Student.filiere) == clean.lower())
                conditions.append(Student.filiere.ilike(f"%{clean}%"))
        if conditions:
            query = query.filter(or_(*conditions))
    return query


def student_matches_course(db: Session, student: Student, course: Course, university_id: int) -> bool:
    """
    Vérifie si un étudiant donné est concerné par un cours (Filière unique ou Tronc Commun).
    """
    if course.level and student.level:
        lvl_variants = [v.lower() for v in get_level_variants(course.level)]
        if student.level.strip().lower() not in lvl_variants:
            return False

    uid = university_id or course.university_id or student.university_id
    target_names = get_course_target_filiere_names(db, course, uid)
    if target_names is None:
        return True  # Tronc commun global
    if not student.filiere:
        return False
    st_fil = student.filiere.strip().lower()
    for name in target_names:
        co_fil = name.strip().lower()
        if st_fil == co_fil or st_fil in co_fil or co_fil in st_fil:
            return True
    return False
