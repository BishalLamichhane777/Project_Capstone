import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database", "attendance.db")

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Idempotency check
c.execute("SELECT student_id, roll_number, program FROM students WHERE user_id = 8")
row = c.fetchone()
if row:
    print(f"Row already exists — student_id={row[0]}, roll_number={row[1]}, program={row[2]}")
    print("Nothing to do.")
    conn.close()
    exit(0)

# Prompt for values
print("No students record found for user_id=8. Please enter the details:\n")

while True:
    roll_number = input("  roll_number (required, must be unique): ").strip()
    if not roll_number:
        print("  Cannot be empty.")
        continue
    c.execute("SELECT 1 FROM students WHERE roll_number = ?", (roll_number,))
    if c.fetchone():
        print(f"  '{roll_number}' is already used. Choose another.")
        continue
    break

while True:
    program = input("  program (required, e.g. Computer Science): ").strip()
    if not program:
        print("  Cannot be empty.")
        continue
    break

year_raw = input("  year_of_study (optional, press Enter to skip): ").strip()
year_of_study = int(year_raw) if year_raw.isdigit() else None

print(f"\nAbout to insert: user_id=8, roll_number={roll_number}, program={program}, year_of_study={year_of_study}")
confirm = input("Proceed? [y/N]: ").strip().lower()
if confirm != "y":
    print("Aborted.")
    conn.close()
    exit(0)

c.execute(
    "INSERT INTO students (user_id, roll_number, program, year_of_study, face_label) VALUES (?, ?, ?, ?, NULL)",
    (8, roll_number, program, year_of_study)
)
conn.commit()

c.execute("SELECT student_id, user_id, roll_number, program, year_of_study FROM students WHERE user_id = 8")
saved = c.fetchone()
print(f"\nInserted successfully:")
print(f"  student_id    : {saved[0]}")
print(f"  user_id       : {saved[1]}")
print(f"  roll_number   : {saved[2]}")
print(f"  program       : {saved[3]}")
print(f"  year_of_study : {saved[4]}")

conn.close()
