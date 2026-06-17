"""
tests/test_batch_enrollment.py
──────────────────────────────
Unit tests for the Batch Enrollment System.

Tests verify:
  1. Creating a batch and adding students
  2. Enrolling a batch into a class via POST enroll-batch
  3. Duplicate enrollments are counted as skipped
  4. Deleting a batch does NOT delete Enrollment rows
  5. Removing a student from a batch does NOT delete their Enrollment
  6. Creating a class without batch_id works normally

Run from the backend root:
    python -m pytest tests/test_batch_enrollment.py -v
"""

import sys
import os
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ─── Minimal Flask app factory for testing ───────────────────────────────────

def _make_app():
    """Create a minimal in-memory Flask app with batch and admin blueprints."""
    from flask import Flask

    app = Flask(__name__)
    app.config["TESTING"]                       = True
    app.config["SQLALCHEMY_DATABASE_URI"]       = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"]                    = "test-secret"
    app.config["WTF_CSRF_ENABLED"]              = False

    from database import db
    db.init_app(app)

    with app.app_context():
        import models  # registers all models
        db.create_all()

    from routes.batch import batch_bp
    from routes.admin import admin_bp
    app.register_blueprint(batch_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    return app


def _seed_users_and_students(db, count=3):
    """
    Seed one admin user + `count` students (each with a linked user).
    Returns a list of student_ids.
    """
    from models.user import User
    from models.student import Student

    # Admin user id=1
    db.session.add(User(
        id=1, fullname="Admin User", email="admin@test.com",
        password_hash="x", role="admin",
    ))

    student_ids = []
    for i in range(count):
        uid = 100 + i
        sid = 200 + i
        db.session.add(User(
            id=uid, fullname=f"Student {i+1}", email=f"s{uid}@test.com",
            password_hash="x", role="student",
        ))
        db.session.add(Student(
            student_id=sid, user_id=uid,
            roll_number=f"R-{uid}", program="CS",
        ))
        student_ids.append(sid)

    db.session.commit()
    return student_ids


def _auth_patch():
    """Return a context manager that bypasses JWT auth as an admin."""
    return patch(
        "middleware.auth_middleware._decode_jwt",
        return_value={"user_id": 1, "role": "admin", "email": "admin@test.com"},
    )


# ─── Test cases ───────────────────────────────────────────────────────────────

class TestBatchEnrollment(unittest.TestCase):

    def setUp(self):
        self.app = _make_app()
        self.client = self.app.test_client()

        with self.app.app_context():
            from database import db
            self.student_ids = _seed_users_and_students(db, count=3)

    # ── Test 1 ────────────────────────────────────────────────────────
    def test_create_batch_with_students(self):
        """Create a batch, add 3 students — assert 3 BatchStudent rows exist."""
        with _auth_patch():
            resp = self.client.post(
                "/api/admin/batches",
                json={
                    "batch_name":  "Morning Batch",
                    "description": "First-year students",
                    "student_ids": self.student_ids,
                },
            )
        self.assertEqual(resp.status_code, 201, resp.get_json())
        data = resp.get_json()
        self.assertEqual(data["batch_name"], "Morning Batch")
        self.assertEqual(data["student_count"], 3)

        with self.app.app_context():
            from models.batch import BatchStudent
            count = BatchStudent.query.filter_by(batch_id=data["batch_id"]).count()
            self.assertEqual(count, 3)

    # ── Test 2 ────────────────────────────────────────────────────────
    def test_enroll_batch_into_class(self):
        """Create batch with 3 students, create class, enroll-batch → enrolled=3, skipped=0."""
        # Create batch
        with _auth_patch():
            batch_resp = self.client.post(
                "/api/admin/batches",
                json={"batch_name": "Test Batch", "student_ids": self.student_ids},
            )
        self.assertEqual(batch_resp.status_code, 201)
        batch_id = batch_resp.get_json()["batch_id"]

        # Create class
        with self.app.app_context():
            from database import db
            from models.user import User
            from models.class_model import Class
            # Need a teacher user
            teacher = User(
                id=50, fullname="Teacher A", email="teacher@test.com",
                password_hash="x", role="teacher",
            )
            cls = Class(
                class_id=10, class_name="CS101", subject="Intro CS",
                teacher_id=50, duration_minutes=60,
            )
            db.session.add(teacher)
            db.session.add(cls)
            db.session.commit()

        # Enroll batch into class
        with _auth_patch():
            enroll_resp = self.client.post(
                "/api/admin/classes/10/enroll-batch",
                json={"batch_id": batch_id},
            )
        self.assertEqual(enroll_resp.status_code, 200, enroll_resp.get_json())
        result = enroll_resp.get_json()
        self.assertEqual(result["enrolled"], 3)
        self.assertEqual(result["skipped"], 0)
        self.assertEqual(result["total"], 3)

        with self.app.app_context():
            from models.class_model import Enrollment
            count = Enrollment.query.filter_by(class_id=10).count()
            self.assertEqual(count, 3)

    # ── Test 3 ────────────────────────────────────────────────────────
    def test_duplicate_enrollment_counted_as_skipped(self):
        """Enroll batch into class twice — second call returns enrolled=0, skipped=3."""
        # Create batch
        with _auth_patch():
            batch_resp = self.client.post(
                "/api/admin/batches",
                json={"batch_name": "Dup Batch", "student_ids": self.student_ids},
            )
        batch_id = batch_resp.get_json()["batch_id"]

        # Create class
        with self.app.app_context():
            from database import db
            from models.user import User
            from models.class_model import Class
            db.session.add(User(
                id=51, fullname="Teacher B", email="teacherb@test.com",
                password_hash="x", role="teacher",
            ))
            db.session.add(Class(
                class_id=20, class_name="MA101", subject="Math",
                teacher_id=51, duration_minutes=60,
            ))
            db.session.commit()

        # First enrollment
        with _auth_patch():
            first = self.client.post(
                "/api/admin/classes/20/enroll-batch",
                json={"batch_id": batch_id},
            )
        self.assertEqual(first.get_json()["enrolled"], 3)

        # Second enrollment — all should be skipped
        with _auth_patch():
            second = self.client.post(
                "/api/admin/classes/20/enroll-batch",
                json={"batch_id": batch_id},
            )
        self.assertEqual(second.status_code, 200, second.get_json())
        result = second.get_json()
        self.assertEqual(result["enrolled"], 0)
        self.assertEqual(result["skipped"], 3)

    # ── Test 4 ────────────────────────────────────────────────────────
    def test_delete_batch_does_not_affect_enrollments(self):
        """Enroll batch into class (3 enrolled), delete batch — Enrollment rows still exist."""
        # Create batch
        with _auth_patch():
            batch_resp = self.client.post(
                "/api/admin/batches",
                json={"batch_name": "Delete Batch", "student_ids": self.student_ids},
            )
        batch_id = batch_resp.get_json()["batch_id"]

        # Create class
        with self.app.app_context():
            from database import db
            from models.user import User
            from models.class_model import Class
            db.session.add(User(
                id=52, fullname="Teacher C", email="teacherc@test.com",
                password_hash="x", role="teacher",
            ))
            db.session.add(Class(
                class_id=30, class_name="PH101", subject="Physics",
                teacher_id=52, duration_minutes=60,
            ))
            db.session.commit()

        # Enroll batch
        with _auth_patch():
            self.client.post(
                "/api/admin/classes/30/enroll-batch",
                json={"batch_id": batch_id},
            )

        # Delete batch
        with _auth_patch():
            del_resp = self.client.delete(f"/api/admin/batches/{batch_id}")
        self.assertEqual(del_resp.status_code, 200)

        # Enrollments must still exist
        with self.app.app_context():
            from models.class_model import Enrollment
            from models.batch import Batch, BatchStudent
            count = Enrollment.query.filter_by(class_id=30).count()
            self.assertEqual(count, 3,
                             "Enrollments must not be deleted when batch is deleted")
            # Batch rows are gone
            self.assertIsNone(Batch.query.get(batch_id))
            bs_count = BatchStudent.query.filter_by(batch_id=batch_id).count()
            self.assertEqual(bs_count, 0)

    # ── Test 5 ────────────────────────────────────────────────────────
    def test_remove_student_from_batch_does_not_affect_enrollment(self):
        """Remove a student from a batch — their Enrollment in the class still exists."""
        # Create batch
        with _auth_patch():
            batch_resp = self.client.post(
                "/api/admin/batches",
                json={"batch_name": "Remove Batch", "student_ids": self.student_ids},
            )
        batch_id = batch_resp.get_json()["batch_id"]

        # Create class
        with self.app.app_context():
            from database import db
            from models.user import User
            from models.class_model import Class
            db.session.add(User(
                id=53, fullname="Teacher D", email="teacherd@test.com",
                password_hash="x", role="teacher",
            ))
            db.session.add(Class(
                class_id=40, class_name="CH101", subject="Chemistry",
                teacher_id=53, duration_minutes=60,
            ))
            db.session.commit()

        # Enroll batch
        with _auth_patch():
            self.client.post(
                "/api/admin/classes/40/enroll-batch",
                json={"batch_id": batch_id},
            )

        # Remove one student from batch
        target_student = self.student_ids[0]
        with _auth_patch():
            rm_resp = self.client.delete(
                f"/api/admin/batches/{batch_id}/students/{target_student}"
            )
        self.assertEqual(rm_resp.status_code, 200)

        # Their Enrollment must still exist
        with self.app.app_context():
            from models.class_model import Enrollment
            enrollment = Enrollment.query.filter_by(
                student_id=target_student, class_id=40
            ).first()
            self.assertIsNotNone(
                enrollment,
                "Enrollment must persist after student is removed from batch",
            )

    # ── Test 6 ────────────────────────────────────────────────────────
    def test_class_creation_without_batch_id_works(self):
        """POST /class/create without batch_id → class created normally, no enrollments."""
        with self.app.app_context():
            from database import db
            from models.user import User
            db.session.add(User(
                id=54, fullname="Teacher E", email="teachere@test.com",
                password_hash="x", role="teacher",
            ))
            db.session.commit()

        with _auth_patch():
            resp = self.client.post(
                "/api/admin/class/create",
                json={
                    "class_name":       "CS999",
                    "subject":          "No Batch Subject",
                    "duration_minutes": 45,
                    "teacher_id":       54,
                },
            )
        self.assertEqual(resp.status_code, 201, resp.get_json())
        data = resp.get_json()
        self.assertIn("class_id", data)
        self.assertEqual(data.get("auto_enrolled", 0), 0)

        with self.app.app_context():
            from models.class_model import Enrollment
            count = Enrollment.query.filter_by(class_id=data["class_id"]).count()
            self.assertEqual(count, 0, "No enrollments should be created without batch_id")


if __name__ == "__main__":
    unittest.main(verbosity=2)
