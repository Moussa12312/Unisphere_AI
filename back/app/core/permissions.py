"""
Système de permissions centralisé pour UniSphere AI
Chaque permission est une chaîne unique identifiant une action.
"""

# =========================
# PERMISSIONS ÉTUDIANTS
# =========================
STUDENT_CREATE = "student:create"
STUDENT_READ = "student:read"
STUDENT_UPDATE = "student:update"
STUDENT_DELETE = "student:delete"
STUDENT_LIST = "student:list"
STUDENT_SCAN = "student:scan"
STUDENT_DATA_READ = "student:data_read"    # ✅ AJOUTÉ : Accès mentor aux données étudiant

# =========================
# PERMISSIONS ENSEIGNANTS
# =========================
TEACHER_CREATE = "teacher:create"
TEACHER_READ = "teacher:read"
TEACHER_UPDATE = "teacher:update"
TEACHER_DELETE = "teacher:delete"
TEACHER_LIST = "teacher:list"

# =========================
# PERMISSIONS CENSEURS
# =========================
CENSOR_CREATE = "censor:create"
CENSOR_READ = "censor:read"
CENSOR_UPDATE = "censor:update"
CENSOR_DELETE = "censor:delete"

# =========================
# PERMISSIONS SECRÉTAIRE
# =========================
SECRETARY_CREATE = "secretary:create"
SECRETARY_READ = "secretary:read"

# =========================
# PERMISSIONS COMPTABLE
# =========================
ACCOUNTANT_CREATE = "accountant:create"
ACCOUNTANT_READ = "accountant:read"
PAYMENT_CREATE = "payment:create"
PAYMENT_READ = "payment:read"
PAYMENT_UPDATE = "payment:update"
PAYMENT_DELETE = "payment:delete"
PAYMENT_LIST = "payment:list"
FEE_CREATE = "fee:create"
FEE_READ = "fee:read"
FEE_UPDATE = "fee:update"
FEE_DELETE = "fee:delete"
FEE_LIST = "fee:list"

# =========================
# PERMISSIONS GARDIEN
# =========================
GUARD_CREATE = "guard:create"
GUARD_READ = "guard:read"
ATTENDANCE_CREATE = "attendance:create"
ATTENDANCE_READ = "attendance:read"
ATTENDANCE_UPDATE = "attendance:update"
ATTENDANCE_LIST = "attendance:list"

# =========================
# PERMISSIONS COURS & NOTES
# =========================
COURSE_CREATE = "course:create"
COURSE_READ = "course:read"
COURSE_UPDATE = "course:update"
COURSE_DELETE = "course:delete"
COURSE_LIST = "course:list"
GRADE_CREATE = "grade:create"
GRADE_READ = "grade:read"
GRADE_UPDATE = "grade:update"
GRADE_DELETE = "grade:delete"
GRADE_VALIDATE = "grade:validate"
GRADE_LIST = "grade:list"

# =========================
# PERMISSIONS DOCUMENTS
# =========================
DOCUMENT_CREATE = "document:create"
DOCUMENT_READ = "document:read"
DOCUMENT_GENERATE = "document:generate"
DOCUMENT_LIST = "document:list"

# =========================
# 🎖️ PERMISSIONS ALUMNI (NOUVEAU RÔLE)
# =========================
ALUMNI_CREATE = "alumni:create"              # Créer un profil alumni
ALUMNI_READ = "alumni:read"                  # Consulter un profil alumni
ALUMNI_UPDATE = "alumni:update"              # Modifier son profil alumni
ALUMNI_DELETE = "alumni:delete"              # Supprimer un alumni
ALUMNI_LIST = "alumni:list"                  # Lister les alumni
ALUMNI_INVITE = "alumni:invite"              # Générer liens d'invitation
ALUMNI_VALIDATE = "alumni:validate"          # Valider/rejeter inscriptions

# =========================
# 🤝 PERMISSIONS CONNEXIONS (Mentorat/Amitié)
# =========================
CONNECTION_CREATE = "connection:create"      # Étudiant demande un mentor/ami
CONNECTION_READ = "connection:read"          # Voir les connexions
CONNECTION_ACCEPT = "connection:accept"      # Alumni accepte une demande
CONNECTION_REJECT = "connection:reject"      # Alumni rejette une demande
CONNECTION_LIST = "connection:list"          # Lister les connexions
CONNECTION_DELETE = "connection:delete"      # Supprimer une connexion

# =========================
# 💬 PERMISSIONS CHAT ALUMNI
# =========================
ALUMNI_CHAT_CREATE = "alumni_chat:create"    # Envoyer un message
ALUMNI_CHAT_READ = "alumni_chat:read"        # Lire les messages
ALUMNI_CHAT_LIST = "alumni_chat:list"        # Lister les conversations

# =========================
# PERMISSIONS ADMINISTRATION
# =========================
UNIVERSITY_CONFIG = "university:config"
ROLE_MANAGE = "role:manage"
USER_MANAGE = "user:manage"
REPORT_READ = "report:read"
REPORT_LIST = "report:list"
AI_ACCESS = "ai:access"
ANNOUNCEMENT_CREATE = "announcement:create"
ANNOUNCEMENT_READ = "announcement:read"
ANNOUNCEMENT_UPDATE = "announcement:update"
ANNOUNCEMENT_DELETE = "announcement:delete"
ANNOUNCEMENT_LIST = "announcement:list"

# =========================
# DÉFINITION DES RÔLES ET LEURS PERMISSIONS
# =========================
ROLE_PERMISSIONS = {
    "admin": [
        STUDENT_CREATE, STUDENT_READ, STUDENT_UPDATE, STUDENT_DELETE, STUDENT_LIST, STUDENT_SCAN,
        TEACHER_CREATE, TEACHER_READ, TEACHER_UPDATE, TEACHER_DELETE, TEACHER_LIST,
        CENSOR_CREATE, CENSOR_READ, CENSOR_UPDATE, CENSOR_DELETE,
        SECRETARY_CREATE, SECRETARY_READ,
        ACCOUNTANT_CREATE, ACCOUNTANT_READ,
        GUARD_CREATE, GUARD_READ,
        PAYMENT_CREATE, PAYMENT_READ, PAYMENT_UPDATE, PAYMENT_DELETE, PAYMENT_LIST,
        FEE_CREATE, FEE_READ, FEE_UPDATE, FEE_DELETE, FEE_LIST,
        ATTENDANCE_CREATE, ATTENDANCE_READ, ATTENDANCE_UPDATE, ATTENDANCE_LIST,
        COURSE_CREATE, COURSE_READ, COURSE_UPDATE, COURSE_DELETE, COURSE_LIST,
        GRADE_CREATE, GRADE_READ, GRADE_UPDATE, GRADE_DELETE, GRADE_VALIDATE, GRADE_LIST,
        DOCUMENT_CREATE, DOCUMENT_READ, DOCUMENT_GENERATE, DOCUMENT_LIST,
        # ✅ NOUVEAU : Gestion complète des Alumni
        ALUMNI_CREATE, ALUMNI_READ, ALUMNI_UPDATE, ALUMNI_DELETE, ALUMNI_LIST,
        ALUMNI_INVITE, ALUMNI_VALIDATE,
        CONNECTION_READ, CONNECTION_LIST, CONNECTION_DELETE,
        UNIVERSITY_CONFIG, ROLE_MANAGE, USER_MANAGE, REPORT_READ, REPORT_LIST, AI_ACCESS,
        ANNOUNCEMENT_CREATE, ANNOUNCEMENT_READ, ANNOUNCEMENT_UPDATE, ANNOUNCEMENT_DELETE, ANNOUNCEMENT_LIST,
    ],

    "secretary": [
        STUDENT_CREATE, STUDENT_READ, STUDENT_UPDATE, STUDENT_LIST,
        TEACHER_READ, TEACHER_LIST,
        COURSE_READ, COURSE_CREATE, COURSE_UPDATE, COURSE_LIST,
        ATTENDANCE_READ, ATTENDANCE_LIST,
        GRADE_CREATE, GRADE_READ, GRADE_LIST,
        DOCUMENT_CREATE, DOCUMENT_READ, DOCUMENT_GENERATE, DOCUMENT_LIST,
        # ✅ NOUVEAU : Consultation alumni uniquement
        ALUMNI_READ, ALUMNI_LIST,
        ANNOUNCEMENT_CREATE, ANNOUNCEMENT_READ, ANNOUNCEMENT_UPDATE, ANNOUNCEMENT_DELETE, ANNOUNCEMENT_LIST,
        REPORT_READ, REPORT_LIST,
    ],

    "censeur": [
        STUDENT_READ, STUDENT_LIST,
        TEACHER_READ, TEACHER_LIST,
        COURSE_READ, COURSE_LIST,
        GRADE_CREATE, GRADE_READ, GRADE_UPDATE, GRADE_VALIDATE, GRADE_LIST,
        ATTENDANCE_READ, ATTENDANCE_LIST,
        DOCUMENT_CREATE, DOCUMENT_READ, DOCUMENT_GENERATE, DOCUMENT_LIST,
        # ✅ NOUVEAU : Consultation alumni uniquement
        ALUMNI_READ, ALUMNI_LIST,
        REPORT_READ, REPORT_LIST,
    ],

    "accountant": [
        STUDENT_READ, STUDENT_LIST,
        PAYMENT_CREATE, PAYMENT_READ, PAYMENT_UPDATE, PAYMENT_DELETE, PAYMENT_LIST,
        FEE_CREATE, FEE_READ, FEE_UPDATE, FEE_DELETE, FEE_LIST,
        REPORT_READ, REPORT_LIST,
    ],

    "teacher": [
        COURSE_READ, COURSE_LIST,
        STUDENT_READ, STUDENT_LIST,
        GRADE_CREATE, GRADE_READ, GRADE_UPDATE, GRADE_LIST,
        ATTENDANCE_CREATE, ATTENDANCE_READ, ATTENDANCE_LIST,
        DOCUMENT_CREATE, DOCUMENT_READ, DOCUMENT_LIST,
        # ✅ NOUVEAU : Consultation alumni uniquement
        ALUMNI_READ, ALUMNI_LIST,
        AI_ACCESS,
    ],

    "guard": [
        STUDENT_SCAN,
        ATTENDANCE_CREATE, ATTENDANCE_READ, ATTENDANCE_LIST,
        TEACHER_READ,
    ],

    "student": [
        STUDENT_READ,
        GRADE_READ,
        COURSE_READ, COURSE_LIST,
        ATTENDANCE_READ,
        DOCUMENT_READ, DOCUMENT_LIST,
        PAYMENT_READ,
        ANNOUNCEMENT_READ, ANNOUNCEMENT_LIST,
        # ✅ NOUVEAU : Accès communauté Alumni
        ALUMNI_READ, ALUMNI_LIST,
        CONNECTION_CREATE, CONNECTION_READ, CONNECTION_LIST,
        ALUMNI_CHAT_CREATE, ALUMNI_CHAT_READ, ALUMNI_CHAT_LIST,
    ],

    # ✅ NOUVEAU : RÔLE ALUMNI (8ème rôle)
    "alumni": [
        # Gestion de son propre profil
        ALUMNI_READ, ALUMNI_UPDATE, ALUMNI_LIST,
        # Gestion des connexions (mentorat)
        CONNECTION_READ, CONNECTION_ACCEPT, CONNECTION_REJECT, CONNECTION_LIST,
        # Accès aux données des étudiants mentorés
        STUDENT_READ, STUDENT_DATA_READ,
        GRADE_READ, GRADE_LIST,
        ATTENDANCE_READ,
        DOCUMENT_READ, DOCUMENT_LIST,
        # Chat avec les étudiants
        ALUMNI_CHAT_CREATE, ALUMNI_CHAT_READ, ALUMNI_CHAT_LIST,
        # Annonces (consultation)
        ANNOUNCEMENT_READ, ANNOUNCEMENT_LIST,
        # Assistant IA
        AI_ACCESS,
    ],
}


def get_role_permissions(role: str) -> list:
    """Retourne la liste des permissions pour un rôle donné."""
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(role: str, permission: str) -> bool:
    """Vérifie si un rôle possède une permission donnée."""
    return permission in ROLE_PERMISSIONS.get(role, [])


def get_all_permissions():
    """Retourne toutes les permissions disponibles."""
    return {
        "students": [STUDENT_CREATE, STUDENT_READ, STUDENT_UPDATE, STUDENT_DELETE, STUDENT_LIST, STUDENT_SCAN, STUDENT_DATA_READ],
        "teachers": [TEACHER_CREATE, TEACHER_READ, TEACHER_UPDATE, TEACHER_DELETE, TEACHER_LIST],
        "censors": [CENSOR_CREATE, CENSOR_READ, CENSOR_UPDATE, CENSOR_DELETE],
        "courses": [COURSE_CREATE, COURSE_READ, COURSE_UPDATE, COURSE_DELETE, COURSE_LIST],
        "grades": [GRADE_CREATE, GRADE_READ, GRADE_UPDATE, GRADE_DELETE, GRADE_VALIDATE, GRADE_LIST],
        "attendance": [ATTENDANCE_CREATE, ATTENDANCE_READ, ATTENDANCE_UPDATE, ATTENDANCE_LIST],
        "payments": [PAYMENT_CREATE, PAYMENT_READ, PAYMENT_UPDATE, PAYMENT_DELETE, PAYMENT_LIST],
        "fees": [FEE_CREATE, FEE_READ, FEE_UPDATE, FEE_DELETE, FEE_LIST],
        "documents": [DOCUMENT_CREATE, DOCUMENT_READ, DOCUMENT_GENERATE, DOCUMENT_LIST],
        # ✅ NOUVEAU : Permissions Alumni
        "alumni": [ALUMNI_CREATE, ALUMNI_READ, ALUMNI_UPDATE, ALUMNI_DELETE, ALUMNI_LIST, ALUMNI_INVITE, ALUMNI_VALIDATE],
        "connections": [CONNECTION_CREATE, CONNECTION_READ, CONNECTION_ACCEPT, CONNECTION_REJECT, CONNECTION_LIST, CONNECTION_DELETE],
        "alumni_chat": [ALUMNI_CHAT_CREATE, ALUMNI_CHAT_READ, ALUMNI_CHAT_LIST],
        "administration": [UNIVERSITY_CONFIG, ROLE_MANAGE, USER_MANAGE, REPORT_READ, REPORT_LIST, AI_ACCESS, ANNOUNCEMENT_CREATE, ANNOUNCEMENT_READ, ANNOUNCEMENT_UPDATE, ANNOUNCEMENT_DELETE, ANNOUNCEMENT_LIST],
    }