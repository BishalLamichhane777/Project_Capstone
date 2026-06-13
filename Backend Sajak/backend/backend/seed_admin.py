"""Seed script — creates the first admin user directly in the database.

Run this ONCE to bootstrap the system before using the API.

Usage:
    python seed_admin.py

You can customize the admin credentials below or pass them as env vars:
    ADMIN_EMAIL=myadmin@example.com ADMIN_PASSWORD=secret python seed_admin.py
"""

import os
import sys

import bcrypt

from app import create_app
from database import db
from models.user import User
from models.student import Student


def seed_admin():
    """Insert the first admin user and test students into the database."""
    app = create_app()

    with app.app_context():
        email = os.getenv("ADMIN_EMAIL", "admin@mytimes.com")
        password = os.getenv("ADMIN_PASSWORD", "admin123")
        fullname = os.getenv("ADMIN_NAME", "System Admin")

        # Check if admin already exists
        existing = User.query.filter_by(email=email).first()
        if not existing:
            # Hash the password
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

            admin = User(
                fullname=fullname,
                email=email,
                password_hash=password_hash,
                role="admin",
                phone=None,
            )
            db.session.add(admin)
            print(f"Created admin user: {email}")
        else:
            print(f"[!] Admin user '{email}' already exists (id={existing.id}). Skipping admin creation.")

        # Seed three test students for face recognition matching our embeddings
        test_students = [
            {
                "fullname": "Student One",
                "email": "student1@capstone.com",
                "roll_number": "CS-001",
                "program": "Computer Science",
                "year_of_study": 3,
                "face_label": "Student_1",
            },
            {
                "fullname": "Student Two",
                "email": "student2@capstone.com",
                "roll_number": "CS-002",
                "program": "Computer Science",
                "year_of_study": 3,
                "face_label": "Student_2",
            },
            {
                "fullname": "Student Three",
                "email": "student3@capstone.com",
                "roll_number": "CS-003",
                "program": "Computer Science",
                "year_of_study": 3,
                "face_label": "Student_3",
            },
        ]

        for s_data in test_students:
            existing_stud = User.query.filter_by(email=s_data["email"]).first()
            if existing_stud:
                print(f"[!] Student '{s_data['email']}' already exists. Skipping.")
                continue

            # Create User account
            s_salt = bcrypt.gensalt()
            s_pass_hash = bcrypt.hashpw("student123".encode("utf-8"), s_salt).decode("utf-8")
            s_user = User(
                fullname=s_data["fullname"],
                email=s_data["email"],
                password_hash=s_pass_hash,
                role="student",
                phone=None,
            )
            db.session.add(s_user)
            db.session.flush()

            # Create Student profile
            student = Student(
                user_id=s_user.id,
                roll_number=s_data["roll_number"],
                program=s_data["program"],
                year_of_study=s_data["year_of_study"],
                face_label=s_data["face_label"],
            )
            db.session.add(student)
            print(f"Created student user and profile for {s_data['email']} with face_label={s_data['face_label']}")

        db.session.commit()

        print("=" * 50)
        print("  SEEDING COMPLETED SUCCESSFULLY")
        print("=" * 50)


if __name__ == "__main__":
    seed_admin()
