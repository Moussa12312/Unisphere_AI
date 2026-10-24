import sqlite3
import os
import sys

from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
hp = pwd_context.hash('unisphere2026')

db_path = os.path.join(os.path.dirname(__file__), 'unisphere.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

accounts = [
    ('Étudiant UniSphere', 'etudiant@unisphere.ai', 'student', '+223 70 11 22 33', 1),
    ('Prof. Djeneba Coulibaly', 'enseignant@unisphere.ai', 'teacher', '+223 70 22 33 44', 1),
    ('Mme Fatoumata Tangara', 'secretaire@unisphere.ai', 'secretary', '+223 70 33 44 55', 1),
    ('Prof. Fakoly Dembélé', 'censeur@unisphere.ai', 'censeur', '+223 70 44 55 66', 1),
    ('Administrateur Principal', 'admin@unisphere.ai', 'admin', '+223 70 55 66 77', 1),
    ('Agent Simon Dembélé', 'gardien@unisphere.ai', 'guard', '+223 70 66 77 88', 1),
    ('Mme Habibatou Traoré', 'comptable@unisphere.ai', 'accountant', '+223 70 77 88 99', 1),
    ('Moussa Coulibaly (Alumni)', 'alumni@unisphere.ai', 'alumni', '+223 70 88 99 00', 1),
]

for name, email, role, phone, univ_id in accounts:
    existing = cursor.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        cursor.execute(
            'UPDATE users SET hashed_password = ?, is_active = 1, is_email_verified = 1, role = ?, university_id = ?, full_name = ? WHERE email = ?',
            (hp, role, univ_id, name, email)
        )
        print(f"Updated user {email} ({role})")
    else:
        cursor.execute('''
            INSERT INTO users (full_name, email, hashed_password, role, is_active, is_email_verified, university_id, phone)
            VALUES (?, ?, ?, ?, 1, 1, ?, ?)
        ''', (name, email, hp, role, univ_id, phone))
        print(f"Created user {email} ({role})")

# Also ensure student profile exists for etudiant@unisphere.ai
stu_u = cursor.execute('SELECT id FROM users WHERE email = "etudiant@unisphere.ai"').fetchone()
if stu_u:
    stu_prof = cursor.execute('SELECT id FROM students WHERE user_id = ?', (stu_u[0],)).fetchone()
    if not stu_prof:
        cursor.execute('''
            INSERT INTO students (user_id, matricule, first_name, last_name, email, filiere, level, university_id, status)
            VALUES (?, "ETU-2026-0842", "Moussa", "Coulibaly", "etudiant@unisphere.ai", "Génie Informatique", "Licence 3", 1, "active")
        ''', (stu_u[0],))
        print("Created student profile for etudiant@unisphere.ai")

# Also ensure teacher profile exists for enseignant@unisphere.ai
t_u = cursor.execute('SELECT id FROM users WHERE email = "enseignant@unisphere.ai"').fetchone()
if t_u:
    t_prof = cursor.execute('SELECT id FROM teachers WHERE user_id = ?', (t_u[0],)).fetchone()
    if not t_prof:
        cursor.execute('''
            INSERT INTO teachers (user_id, first_name, last_name, email, department, speciality, university_id)
            VALUES (?, "Djeneba", "Coulibaly", "enseignant@unisphere.ai", "Informatique", "Génie Logiciel", 1)
        ''', (t_u[0],))
        print("Created teacher profile for enseignant@unisphere.ai")

# Also ensure alumni profile exists for alumni@unisphere.ai
al_u = cursor.execute('SELECT id FROM users WHERE email = "alumni@unisphere.ai"').fetchone()
if al_u:
    try:
        al_prof = cursor.execute('SELECT id FROM alumni_profiles WHERE user_id = ?', (al_u[0],)).fetchone()
        if not al_prof:
            cursor.execute('''
                INSERT INTO alumni_profiles (user_id, first_name, last_name, email, graduation_year, filiere, current_position, company, is_open_to_mentoring, university_id, status)
                VALUES (?, "Moussa", "Coulibaly", "alumni@unisphere.ai", 2024, "Informatique", "Ingénieur Logiciel", "Tech Solutions", 1, 1, "active")
            ''', (al_u[0],))
            print("Created alumni profile for alumni@unisphere.ai")
    except Exception as e:
        print("Alumni profile info:", e)

conn.commit()
conn.close()
print("All 8 roles ensured successfully in DB!")
