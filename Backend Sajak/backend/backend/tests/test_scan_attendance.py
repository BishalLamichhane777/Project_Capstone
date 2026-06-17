"""
tests/test_scan_attendance.py
─────────────────────────────
Unit tests for POST /api/attendance/scan — specifically the enrollment
check that was added to prevent non-enrolled students from having attendance
logged when their face is recognized globally.

Run from the backend root:
    python -m pytest tests/test_scan_attendance.py -v
"""

import io
import sys
import os
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ─── Minimal Flask app factory for testing ───────────────────────────────────

def _make_app():
    """Create a minimal in-memory Flask app with the attendance blueprint."""
    from flask import Flask
    from flask_sqlalchemy import SQLAlchemy

    app = Flask(__name__)
    app.config["TESTING"]                  = True
    app.config["SQLALCHEMY_DATABASE_URI"]  = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"]               = "test-secret"
    app.config["SCAN_COOLDOWN_SECONDS"]    = 0   # disable cooldown in tests
    app.config["WTF_CSRF_ENABLED"]         = False

    from database import db
    db.init_app(app)

    with app.app_context():
        import models  # registers all models
        db.create_all()

    from routes.attendance import attendance_bp
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")

    return app


def _make_jpeg_bytes() -> bytes:
    """Return a tiny valid JPEG for multipart upload."""
    import cv2, numpy as np
    img = (np.ones((50, 50, 3), dtype=np.uint8) * 120)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def _seed_db(db, class_id=1, enrolled_student_id=2, other_student_id=3):
    """
    Seed an in-memory DB with:
      - one class (class_id)
      - one ACTIVE session for that class
      - two students:
          enrolled_student_id  → IS enrolled in class_id
          other_student_id     → is NOT enrolled in class_id
    Returns (session_id, enrolled_student_id, other_student_id).
    """
    import uuid
    from datetime import datetime, timezone
    from models.user import User
    from models.student import Student
    from models.class_model import Class, Enrollment
    from models.session import Session

    # Users
    for uid, name, role in [
        (1, "Teacher One", "teacher"),
        (2, "Student Enrolled", "student"),
        (3, "Student Other", "student"),
    ]:
        u = User(id=uid, fullname=name, email=f"u{uid}@test.com",
                 password_hash="x", role=role)
        db.session.add(u)

    # Students
    db.session.add(Student(student_id=enrolled_student_id,
                           user_id=2, roll_number="R-002",
                           program="CS", face_label="R-002"))
    db.session.add(Student(student_id=other_student_id,
                           user_id=3, roll_number="R-003",
                           program="CS", face_label="R-003"))

    # Class
    db.session.add(Class(class_id=class_id, class_name="Test Class",
                         subject="CS", teacher_id=1, duration_minutes=60))

    # Enrollment — only enrolled_student_id
    db.session.add(Enrollment(student_id=enrolled_student_id, class_id=class_id))

    # Session
    session_id = str(uuid.uuid4())
    db.session.add(Session(
        session_id=session_id, class_id=class_id, teacher_id=1,
        mode="Strict", start_time=datetime.now(timezone.utc),
        status="ACTIVE", threshold_percent=0.80,
    ))
    db.session.commit()
    return session_id


# ─── Test cases ───────────────────────────────────────────────────────────────

class TestScanAttendanceEnrollmentCheck(unittest.TestCase):

    def setUp(self):
        self.app = _make_app()
        self.client = self.app.test_client()

        # Seed DB and stash ids
        with self.app.app_context():
            from database import db
            self.session_id = _seed_db(
                db,
                class_id=1,
                enrolled_student_id=2,
                other_student_id=3,
            )

    def _post_scan(self, recognize_return: dict):
        """
        Helper: POST /api/attendance/scan with a fake image, mocking
        recognize_student to return the given dict.
        """
        jpeg = _make_jpeg_bytes()
        data = {
            "session_id": self.session_id,
            "image": (io.BytesIO(jpeg), "frame.jpg", "image/jpeg"),
        }

        # Patch recognize_student AND the JWT middleware so we don't need a real token
        with patch("routes.attendance.recognize_student",
                   return_value=recognize_return):
            with patch("middleware.auth_middleware._decode_jwt",
                       return_value={"user_id": 1, "role": "teacher", "email": "t@t.com"}):
                return self.client.post(
                    "/api/attendance/scan",
                    data=data,
                    content_type="multipart/form-data",
                )

    # ── Test 1 ────────────────────────────────────────────────────────
    def test_enrolled_student_gets_attendance_logged(self):
        """
        A recognized student who IS enrolled in the class must receive
        an ENTRY log and the response status must be 'recognized'.
        """
        resp = self._post_scan({
            "status"    : "recognized",
            "student_id": 2,         # enrolled
            "student_name": "Student Enrolled",
            "confidence": 95.0,
            "face_label": "R-002",
        })
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertEqual(body["status"], "recognized",
                         f"Expected 'recognized', got: {body}")
        self.assertEqual(body["event"], "ENTRY")
        self.assertEqual(body["student_id"], 2)

        # Confirm log was written to DB
        with self.app.app_context():
            from models.attendance import AttendanceLog
            log = AttendanceLog.query.filter_by(
                student_id=2, session_id=self.session_id
            ).first()
            self.assertIsNotNone(log, "AttendanceLog should have been created")
            self.assertEqual(log.event_type, "ENTRY")

    # ── Test 2 ────────────────────────────────────────────────────────
    def test_non_enrolled_student_does_not_get_attendance_logged(self):
        """
        A recognized student who is NOT enrolled in the class must NOT
        have attendance logged, and the response status must be 'not_enrolled'.
        """
        resp = self._post_scan({
            "status"    : "recognized",
            "student_id": 3,         # NOT enrolled in class 1
            "student_name": "Student Other",
            "confidence": 91.0,
            "face_label": "R-003",
        })
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertEqual(body["status"], "not_enrolled",
                         f"Expected 'not_enrolled', got: {body}")
        self.assertIsNone(body["event"])

        # Confirm NO log was written to DB
        with self.app.app_context():
            from models.attendance import AttendanceLog
            log = AttendanceLog.query.filter_by(
                student_id=3, session_id=self.session_id
            ).first()
            self.assertIsNone(log, "AttendanceLog must NOT be created for non-enrolled student")

    # ── Test 3 ────────────────────────────────────────────────────────
    def test_unknown_face_does_not_get_attendance_logged(self):
        """
        When recognize_student returns 'unknown' (face seen but no match),
        no attendance must be logged.
        """
        resp = self._post_scan({
            "status"    : "unknown",
            "student_id": None,
            "student_name": None,
            "confidence": 40.0,
            "face_label": None,
            "message"   : "Unknown face",
        })
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertEqual(body["status"], "unknown")
        self.assertIsNone(body["student_id"])

        # No log for any student
        with self.app.app_context():
            from models.attendance import AttendanceLog
            count = AttendanceLog.query.filter_by(
                session_id=self.session_id
            ).count()
            self.assertEqual(count, 0,
                             "No AttendanceLogs should exist for unknown face")

    # ── Test 4 ────────────────────────────────────────────────────────
    def test_no_face_does_not_get_attendance_logged(self):
        """
        When recognize_student returns 'no_face', no attendance must be logged.
        """
        resp = self._post_scan({
            "status"    : "no_face",
            "student_id": None,
            "confidence": None,
            "face_label": None,
            "message"   : "No face detected",
        })
        self.assertEqual(resp.status_code, 200)
        body = resp.get_json()
        self.assertIn(body["status"], ("no_face", "unknown"))

        with self.app.app_context():
            from models.attendance import AttendanceLog
            count = AttendanceLog.query.filter_by(
                session_id=self.session_id
            ).count()
            self.assertEqual(count, 0)

    # ── Test 5 ────────────────────────────────────────────────────────
    def test_not_enrolled_response_includes_student_name(self):
        """
        The 'not_enrolled' response must still include student_name and
        confidence so the frontend can display a useful message
        (e.g. 'Alice — not enrolled in this class').
        """
        resp = self._post_scan({
            "status"    : "recognized",
            "student_id": 3,
            "student_name": "Student Other",
            "confidence": 88.5,
            "face_label": "R-003",
        })
        body = resp.get_json()
        self.assertEqual(body["status"], "not_enrolled")
        self.assertIsNotNone(body["student_name"],
                             "student_name should be present even for not_enrolled")
        self.assertIsNotNone(body["confidence"],
                             "confidence should be present even for not_enrolled")


if __name__ == "__main__":
    unittest.main(verbosity=2)
