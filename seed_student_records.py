import sqlite3
from datetime import datetime, date

conn = sqlite3.connect('backend/unisphere.db')
c = conn.cursor()

# Trouver l'étudiant
c.execute("SELECT id, user_id, first_name, last_name, university_id, filiere FROM students WHERE email='etudiant@unisphere.ai'")
st = c.fetchone()
print(f"Student: {st}")

if st:
    st_id, u_id, fn, ln, univ_id, filiere = st

    # Trouver des cours de cette université
    c.execute("SELECT id, title, code, credits FROM courses WHERE university_id=? LIMIT 5", (univ_id,))
    courses = c.fetchall()
    print(f"Courses: {courses}")

    # Trouver ou créer une session d'examen
    c.execute("SELECT id, name FROM exam_sessions WHERE university_id=? LIMIT 1", (univ_id,))
    session = c.fetchone()
    if not session:
        c.execute("""
            INSERT INTO exam_sessions (name, session_type, status, start_date, end_date, university_id, created_at)
            VALUES ('Session Normale Semestre 1', 'normal', 'open', '2025-10-01', '2026-06-30', ?, ?)
        """, (univ_id, datetime.now()))
        conn.commit()
        session_id = c.lastrowid
        print(f"Created ExamSession: {session_id}")
    else:
        session_id = session[0]
        print(f"Existing ExamSession: {session_id}")

    # Insérer des notes réelles pour cet étudiant
    for course_id, title, code, credits in courses:
        c.execute("SELECT id FROM grades WHERE student_id=? AND course_id=?", (st_id, course_id))
        existing_grade = c.fetchone()
        if not existing_grade:
            c.execute("""
                INSERT INTO grades (student_id, course_id, session_id, cc_score, exam_score, score, coefficient, status, university_id, created_at)
                VALUES (?, ?, ?, 15.0, 16.5, 16.05, ?, 'validated', ?, ?)
            """, (st_id, course_id, session_id, credits or 3, univ_id, datetime.now()))
            print(f"Added grade for course: {title}")

    # Vérifier emploi du temps (schedules)
    c.execute("SELECT id FROM schedules WHERE university_id=? LIMIT 3", (univ_id,))
    existing_sched = c.fetchall()
    if not existing_sched and courses:
        days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
        rooms = ['Amphi 1', 'Salle B204', 'Labo Info 1', 'Salle C102']
        for i, (cid, title, code, _) in enumerate(courses[:4]):
            c.execute("""
                INSERT INTO schedules (day_of_week, start_time, end_time, course_id, university_id, room, building)
                VALUES (?, '08:30', '10:30', ?, ?, ?, 'Bâtiment Principal')
            """, (days[i % len(days)], cid, univ_id, rooms[i % len(rooms)]))
            print(f"Added schedule for: {title}")

    # Vérifier paiements réels
    c.execute("SELECT id FROM payments WHERE student_id=?", (st_id,))
    existing_pay = c.fetchone()
    if not existing_pay:
        c.execute("""
            INSERT INTO payments (student_id, amount, payment_type, payment_method, status, reference, receipt_number, university_id, created_at)
            VALUES (?, 150000.0, 'Tranche 1 - Scolarité', 'Wave', 'completed', 'REF-2026-001', 'REC-2026-001', ?, ?)
        """, (st_id, univ_id, datetime.now().isoformat()))
        c.execute("""
            INSERT INTO payments (student_id, amount, payment_type, payment_method, status, reference, receipt_number, university_id, created_at)
            VALUES (?, 150000.0, 'Tranche 2 - Scolarité', 'Espèces', 'completed', 'REF-2026-002', 'REC-2026-002', ?, ?)
        """, (st_id, univ_id, datetime.now().isoformat()))
        print("Added 2 real payment records for student")

    conn.commit()

conn.close()
print("Seed script completed successfully!")
