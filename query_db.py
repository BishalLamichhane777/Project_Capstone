import sqlite3

db_path = r'c:\Users\sajak\Project_Capstone\Backend Sajak\backend\backend\database\attendance.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("=== USERS ===")
cur.execute("SELECT id, role, email, is_active, fullname FROM users ORDER BY role, id")
for r in cur.fetchall():
    print(r)

print("\n=== CLASSES ===")
cur.execute("SELECT class_id, class_name, subject, teacher_id, scheduled_date, scheduled_time, scheduled_end_time, duration_minutes FROM classes LIMIT 5")
for r in cur.fetchall():
    print(r)

print("\n=== SESSIONS (last 5) ===")
cur.execute("SELECT session_id, class_id, teacher_id, mode, status, start_time FROM sessions ORDER BY start_time DESC LIMIT 5")
for r in cur.fetchall():
    print(r)

print("\n=== STUDENTS ===")
cur.execute("SELECT student_id, user_id, roll_number, program, face_label FROM students LIMIT 5")
for r in cur.fetchall():
    print(r)

print("\n=== ENROLLMENTS (sample) ===")
cur.execute("SELECT student_id, class_id FROM enrollments LIMIT 10")
for r in cur.fetchall():
    print(r)

print("\n=== WAIVER REQUESTS ===")
cur.execute("SELECT request_id, student_id, session_id, status FROM waiver_requests LIMIT 5")
for r in cur.fetchall():
    print(r)

print("\n=== ATTENDANCE RECORDS (sample) ===")
cur.execute("SELECT record_id, student_id, session_id, status FROM attendance_records LIMIT 5")
for r in cur.fetchall():
    print(r)

print("\n=== BATCHES ===")
cur.execute("SELECT batch_id, batch_name FROM batches LIMIT 5")
for r in cur.fetchall():
    print(r)

conn.close()
