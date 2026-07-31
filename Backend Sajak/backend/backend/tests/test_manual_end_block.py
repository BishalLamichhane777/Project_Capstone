"""
tests/test_manual_end_block.py
───────────────────────────────
Tests for blocking session restart after a teacher manually ends a class early.

Background:
  When a teacher ends a session via POST /api/session/end, ended_reason is
  set to 'manual'. The system must prevent starting a new session for the
  same class on the same local calendar day. Auto-expired sessions
  (ended_reason='auto_expired') are allowed to restart (existing behavior).

Tests:
  1. Teacher ends class early → tries to start again same day → 403 blocked
  2. Session auto-expires past scheduled_end_time → starting again works
  3. Manual end + no scheduled_date → still blocked from restart same day
  4. Manual end yesterday → starting today is allowed
  5. Manual end + start on different day → allowed

Run from the backend root:
    python -m pytest tests/test_manual_end_block.py -v
"""

import sys
import os
import datetime as _dt
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from zoneinfo import ZoneInfo

_NPT = ZoneInfo("Asia/Kathmandu")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_app():
    """Minimal in-memory Flask app with session blueprint."""
    from flask import Flask
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY="test",
        STRICT_MODE_THRESHOLD=0.80,
        ACTIVITY_MODE_THRESHOLD=0.55,
        SERVER_TIMEZONE="Asia/Kathmandu",
        SESSION_START_BUFFER_MINUTES=15,
    )
    from database import db
    db.init_app(app)
    with app.app_context():
        import models
        db.create_all()

    from routes.session import session_bp
    app.register_blueprint(session_bp, url_prefix="/api/session")
    return app


def _seed(db):
    """Seed one teacher + one class. Returns class_id."""
    from models.user import User
    from models.class_model import Class

    db.session.add(User(
        id=1, fullname="Teacher T", email="t@t.com",
        password_hash="x", role="teacher",
    ))
    cls = Class(
        class_id=1, class_name="CS101", subject="Intro CS",
        teacher_id=1, duration_minutes=60,
    )
    db.session.add(cls)
    db.session.commit()
    return 1


def _teacher_patch():
    """Bypass JWT as teacher user_id=1."""
    return patch(
        "middleware.auth_middleware._decode_jwt",
        return_value={"user_id": 1, "role": "teacher", "email": "t@t.com"},
    )


def _npt_now(year, month, day, hour, minute):
    """Return a timezone-aware datetime in NPT for the given wall-clock values."""
    return _dt.datetime(year, month, day, hour, minute, 0, tzinfo=_NPT)


class _MockDatetime(_dt.datetime):
    """Mock datetime with fixed .now() for consistent test execution."""
    _fixed_now = None

    @classmethod
    def now(cls, tz=None):
        if cls._fixed_now is not None:
            if tz is not None:
                return cls._fixed_now.astimezone(tz)
            return cls._fixed_now
        return super().now(tz)


def _patch_now(fixed_dt):
    """Context manager: patch routes.session.datetime so now() returns fixed_dt."""
    _MockDatetime._fixed_now = fixed_dt
    return patch("routes.session.datetime", _MockDatetime)


# ─── Tests ────────────────────────────────────────────────────────────────────

class TestManualEndBlock(unittest.TestCase):

    def setUp(self):
        self.app = _make_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            from database import db
            _seed(db)

    def _start(self, class_id=1, extra_patch=None):
        """POST /api/session/start for specified class_id in Strict mode."""
        ctx = _teacher_patch()
        if extra_patch:
            with ctx, extra_patch:
                return self.client.post(
                    "/api/session/start",
                    json={"class_id": class_id, "mode": "Strict"},
                )
        else:
            with ctx:
                return self.client.post(
                    "/api/session/start",
                    json={"class_id": class_id, "mode": "Strict"},
                )

    def _end(self, session_id):
        """POST /api/session/end."""
        with _teacher_patch():
            return self.client.post(
                "/api/session/end",
                json={"session_id": session_id},
            )

    def _set_schedule(self, scheduled_date=None, scheduled_time=None,
                      scheduled_end_time=None):
        """Update class schedule directly via SQLAlchemy."""
        with self.app.app_context():
            from database import db
            from models.class_model import Class
            cls = Class.query.get(1)
            cls.scheduled_date     = scheduled_date
            cls.scheduled_time     = scheduled_time
            cls.scheduled_end_time = scheduled_end_time
            db.session.commit()

    # ── Test 1: Manual end → restart same day blocked ────────────────
    def test_manual_end_blocks_restart_same_day(self):
        """Teacher ends class early, then tries to start again → 403."""
        today = _dt.date(2026, 7, 31)  # Fixed date for consistency
        fixed = _npt_now(2026, 7, 31, 10, 0)

        # Start session
        resp1 = self._start(extra_patch=_patch_now(fixed))
        self.assertEqual(resp1.status_code, 200, resp1.get_json())
        session_id = resp1.get_json()["session_id"]

        # Teacher manually ends session early
        resp2 = self._end(session_id)
        self.assertEqual(resp2.status_code, 200, resp2.get_json())

        # Verify ended_reason was set to 'manual'
        with self.app.app_context():
            from models.session import Session
            sess = Session.query.get(session_id)
            self.assertEqual(sess.ended_reason, "manual")
            self.assertEqual(sess.status, "CLOSED")

        # Try to start again same day → should be blocked
        resp3 = self._start(extra_patch=_patch_now(fixed))
        self.assertEqual(resp3.status_code, 403, resp3.get_json())
        self.assertIn("already ended earlier today", resp3.get_json()["error"].lower())

    # ── Test 2: Auto-expired session can be restarted ────────────────
    def test_auto_expired_session_allows_restart(self):
        """Session auto-expires past scheduled_end_time → restart still works."""
        today = _dt.date(2026, 7, 31)
        self._set_schedule(
            scheduled_date=today,
            scheduled_time=_dt.time(9, 0),
            scheduled_end_time=_dt.time(10, 30),
        )

        # Start session at 09:00
        start_time = _npt_now(2026, 7, 31, 9, 0)
        resp1 = self._start(extra_patch=_patch_now(start_time))
        self.assertEqual(resp1.status_code, 200, resp1.get_json())
        session_id = resp1.get_json()["session_id"]

        # Simulate time passing to 12:00 (past end + grace period)
        # Start request with active session will auto-expire it
        later_time = _npt_now(2026, 7, 31, 12, 0)
        resp2 = self._start(extra_patch=_patch_now(later_time))
        
        # Should create a new session (auto-expired sessions don't block restart)
        self.assertEqual(resp2.status_code, 200, resp2.get_json())
        new_session_id = resp2.get_json()["session_id"]

        # Verify the old session was auto-expired
        with self.app.app_context():
            from models.session import Session
            old_sess = Session.query.get(session_id)
            self.assertEqual(old_sess.status, "CLOSED")
            self.assertEqual(old_sess.ended_reason, "auto_expired")

            # Verify new session was created
            new_sess = Session.query.get(new_session_id)
            self.assertEqual(new_sess.status, "ACTIVE")
            self.assertIsNone(new_sess.ended_reason)

    # ── Test 3: Manual end without schedule → still blocked ──────────
    def test_manual_end_without_schedule_blocks_restart(self):
        """Class with no scheduled_date, manually ended → restart blocked."""
        fixed = _npt_now(2026, 7, 31, 14, 0)

        # Start session (no schedule set)
        resp1 = self._start(extra_patch=_patch_now(fixed))
        self.assertEqual(resp1.status_code, 200, resp1.get_json())
        session_id = resp1.get_json()["session_id"]

        # Manually end
        resp2 = self._end(session_id)
        self.assertEqual(resp2.status_code, 200, resp2.get_json())

        # Try to restart same day → blocked
        resp3 = self._start(extra_patch=_patch_now(fixed))
        self.assertEqual(resp3.status_code, 403, resp3.get_json())
        self.assertIn("already ended earlier today", resp3.get_json()["error"].lower())

    # ── Test 4: Manual end yesterday → today start allowed ───────────
    def test_manual_end_yesterday_allows_today_start(self):
        """Session manually ended yesterday → starting today is allowed."""
        # Start and end on July 30
        yesterday = _npt_now(2026, 7, 30, 10, 0)
        resp1 = self._start(extra_patch=_patch_now(yesterday))
        self.assertEqual(resp1.status_code, 200, resp1.get_json())
        session_id = resp1.get_json()["session_id"]

        resp2 = self._end(session_id)
        self.assertEqual(resp2.status_code, 200, resp2.get_json())

        # Verify it was manually ended
        with self.app.app_context():
            from models.session import Session
            sess = Session.query.get(session_id)
            self.assertEqual(sess.ended_reason, "manual")

        # Try to start on July 31 (next day) → should work
        today = _npt_now(2026, 7, 31, 10, 0)
        resp3 = self._start(extra_patch=_patch_now(today))
        self.assertEqual(resp3.status_code, 200, resp3.get_json())
        new_session_id = resp3.get_json()["session_id"]
        self.assertNotEqual(session_id, new_session_id)

    # ── Test 5: Multiple start attempts after manual end ─────────────
    def test_multiple_start_attempts_after_manual_end(self):
        """Multiple start attempts after manual end → all blocked same day."""
        fixed = _npt_now(2026, 7, 31, 9, 0)

        # Start and immediately end
        resp1 = self._start(extra_patch=_patch_now(fixed))
        self.assertEqual(resp1.status_code, 200, resp1.get_json())
        session_id = resp1.get_json()["session_id"]

        self._end(session_id)

        # Try to start multiple times → all should fail
        for i in range(3):
            resp = self._start(extra_patch=_patch_now(fixed))
            self.assertEqual(resp.status_code, 403, f"Attempt {i+1}: {resp.get_json()}")
            self.assertIn("already ended earlier today", resp.get_json()["error"].lower())

    # ── Test 6: Different class not affected ─────────────────────────
    def test_different_class_not_affected(self):
        """Manual end of one class doesn't affect other classes."""
        # Seed a second class
        with self.app.app_context():
            from database import db
            from models.class_model import Class
            cls2 = Class(
                class_id=2, class_name="CS102", subject="Data Structures",
                teacher_id=1, duration_minutes=60,
            )
            db.session.add(cls2)
            db.session.commit()

        fixed = _npt_now(2026, 7, 31, 10, 0)

        # Start and end class 1
        resp1 = self._start(class_id=1, extra_patch=_patch_now(fixed))
        self.assertEqual(resp1.status_code, 200)
        session_id = resp1.get_json()["session_id"]
        self._end(session_id)

        # Class 1 restart → blocked
        resp2 = self._start(class_id=1, extra_patch=_patch_now(fixed))
        self.assertEqual(resp2.status_code, 403)

        # Class 2 start → should work fine
        resp3 = self._start(class_id=2, extra_patch=_patch_now(fixed))
        self.assertEqual(resp3.status_code, 200, resp3.get_json())


if __name__ == "__main__":
    unittest.main(verbosity=2)
