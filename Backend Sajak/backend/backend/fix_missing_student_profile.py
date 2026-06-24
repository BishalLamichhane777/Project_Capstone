"""fix_missing_student_profile.py
Run this script once from the backend root to insert the missing students
row for user_id=8 (ballaswornim@gmail.com).

Usage:
    python fix_missing_student_profile.py

The script:
  - Boots the Flask app so it uses the same SQLAlchemy setup as the server
  - Checks whether a students row already exists for user_id=8 (idempotent)
  - Prompts for roll_number, program, and year_of_study before inserting
  - Prints a confirmation after the insert
"""

import sys
import os

# ── Bootstrap Flask app context ──────────────────────────────────────────────
# Adjust the path so imports resolve the same way as the running server
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from database import db
from models.student import Student
from models.user import User

TARGET_USER_ID = 8

app = create_app()

with app.app_context():
    # ── Verify the target user exists ────────────────────────────────────
    user = User.query.get(TARGET_USER_ID)
    if not user:
        print(f"\nERROR: No user with user_id={TARGET_USER_ID} found in the database.")
        print("Nothing was changed.")
        sys.exit(1)

    if user.role != "student":
        print(f"\nWARNING: user_id={TARGET_USER_ID} ({user.email}) has role='{user.role}', not 'student'.")
        confirm = input("Continue anyway? [y/N]: ").strip().lower()
        if confirm != "y":
            print("Aborted.")
            sys.exit(0)

    print(f"\nTarget user found:")
    print(f"  user_id  : {user.id}")
    print(f"  name     : {user.fullname}")
    print(f"  email    : {user.email}")
    print(f"  role     : {user.role}")

    # ── Idempotency check ────────────────────────────────────────────────
    existing = Student.query.filter_by(user_id=TARGET_USER_ID).first()
    if existing:
        print(f"\nstudents row already exists for user_id={TARGET_USER_ID}:")
        print(f"  student_id  : {existing.student_id}")
        print(f"  roll_number : {existing.roll_number}")
        print(f"  program     : {existing.program}")
        print(f"  year_of_study: {existing.year_of_study}")
        print("\nNothing to do — profile is already present.")
        sys.exit(0)

    # ── Prompt for required fields ───────────────────────────────────────
    print("\nNo students record found. Please provide the following details:\n")

    while True:
        roll_number = input("  roll_number (required, must be unique): ").strip()
        if not roll_number:
            print("  roll_number cannot be empty.")
            continue
        if Student.query.filter_by(roll_number=roll_number).first():
            print(f"  '{roll_number}' is already used by another student. Choose a different one.")
            continue
        break

    while True:
        program = input("  program     (required, e.g. 'Computer Science'): ").strip()
        if not program:
            print("  program cannot be empty.")
            continue
        break

    year_raw = input("  year_of_study (optional, press Enter to skip): ").strip()
    year_of_study = None
    if year_raw:
        try:
            year_of_study = int(year_raw)
        except ValueError:
            print(f"  '{year_raw}' is not a valid integer — year_of_study will be set to NULL.")

    # ── Confirm before inserting ─────────────────────────────────────────
    print("\nAbout to insert:")
    print(f"  user_id      : {TARGET_USER_ID}")
    print(f"  roll_number  : {roll_number}")
    print(f"  program      : {program}")
    print(f"  year_of_study: {year_of_study}")
    confirm = input("\nProceed? [y/N]: ").strip().lower()
    if confirm != "y":
        print("Aborted. No changes were made.")
        sys.exit(0)

    # ── Insert ───────────────────────────────────────────────────────────
    student = Student(
        user_id=TARGET_USER_ID,
        roll_number=roll_number,
        program=program,
        year_of_study=year_of_study,
        face_label=None,  # no face enrolled yet; admin can enroll via the API later
    )
    db.session.add(student)
    db.session.commit()

    # ── Confirm ──────────────────────────────────────────────────────────
    saved = Student.query.filter_by(user_id=TARGET_USER_ID).first()
    if saved:
        print(f"\n✓ students row created successfully:")
        print(f"  student_id   : {saved.student_id}")
        print(f"  user_id      : {saved.user_id}")
        print(f"  roll_number  : {saved.roll_number}")
        print(f"  program      : {saved.program}")
        print(f"  year_of_study: {saved.year_of_study}")
        print(f"\nUser '{user.fullname}' ({user.email}) can now log in as a student.")
        print("If face recognition is needed, enroll via: POST /api/admin/enroll-face")
    else:
        print("\nERROR: Insert appeared to succeed but the row cannot be read back.")
        print("Check the database manually.")
        sys.exit(1)
