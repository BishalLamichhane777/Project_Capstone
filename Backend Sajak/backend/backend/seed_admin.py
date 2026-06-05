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


def seed_admin():
    """Insert the first admin user into the database."""
    app = create_app()

    with app.app_context():
        email = os.getenv("ADMIN_EMAIL", "admin@mytimes.com")
        password = os.getenv("ADMIN_PASSWORD", "admin123")
        fullname = os.getenv("ADMIN_NAME", "System Admin")

        # Check if admin already exists
        existing = User.query.filter_by(email=email).first()
        if existing:
            print(f"[!] Admin user '{email}' already exists (id={existing.id}). Skipping.")
            sys.exit(0)

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
        db.session.commit()

        print("=" * 50)
        print("  ADMIN USER CREATED SUCCESSFULLY")
        print("=" * 50)
        print(f"  User ID  : {admin.id}")
        print(f"  Email    : {email}")
        print(f"  Password : {password}")
        print(f"  Role     : admin")
        print("=" * 50)
        print()
        print("  Next step: POST /api/auth/login with these credentials")
        print("  to get your JWT token, then use it to register other users.")
        print()


if __name__ == "__main__":
    seed_admin()
