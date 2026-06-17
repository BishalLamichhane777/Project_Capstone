"""
tests/test_schedule_enforcement.py
────────────────────────────────────
Tests for time-based session-start enforcement in POST /api/session/start.

All timezone-aware checks use ZoneInfo("Asia/Kathmandu") (UTC+5:45).
We mock `routes.session.datetime` so we can control "now" precisely.

Tests:
  1. No scheduled_date → session starts (backward compat)
  2. scheduled_date + no scheduled_time → 403 incomplete
  3. Future date → 403 not today
  4. Today but end_time already passed → 403 ended
  5. Today but start_time is 2 hours away → 403 not started yet
  6. Today, within buffer window → 200 OK

Run from the backend root:
    python -m pytest tests/test_schedule_enforcement.py -v
"""

import sys
import os
import datetime as _dt
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from zoneinfo import ZoneInfo

_NPT = ZoneInfo("Asia/Kathmandu")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_app():
    """Minimal in-memory Flask app with session and admin blueprints."""
    from flask import Flask
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY="test",
        WTF_CSRF_ENABLED=False,
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
    from routes.admin import admin_bp
    app.register_blueprint(session_bp, url_prefix="/api/session")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    return app


def _seed(db):
    """Seed one teacher + one class (no schedule). Returns class_id."""
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
    """
    Subclass of datetime that overrides .now() to return a fixed value
    while delegating everything else (combine, fromisoformat, etc.) to
    the real datetime class.  This is the safest way to mock datetime.now()
    without breaking SQLAlchemy's internals.
    """
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

class TestScheduleEnforcement(unittest.TestCase):

    def setUp(self):
        self.app = _make_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            from database import db
            _seed(db)

    def _start(self, extra_patch=None):
        """POST /api/session/start for class_id=1 Strict mode."""
        ctx = _teacher_patch()
        if extra_patch:
            with ctx, extra_patch:
                return self.client.post(
                    "/api/session/start",
                    json={"class_id": 1, "mode": "Strict"},
                )
        else:
            with ctx:
                return self.client.post(
                    "/api/session/start",
                    json={"class_id": 1, "mode": "Strict"},
                )

    def _set_schedule(self, scheduled_date=None, scheduled_time=None,
                      scheduled_end_time=None):
        """PUT schedule directly via SQLAlchemy (bypasses HTTP for speed)."""
        with self.app.app_context():
            from database import db
            from models.class_model import Class
            cls = Class.query.get(1)
            cls.scheduled_date     = scheduled_date
            cls.scheduled_time     = scheduled_time
            cls.scheduled_end_time = scheduled_end_time
            db.session.commit()

    # ── Test 1 ────────────────────────────────────────────────────────
    def test_no_schedule_allows_start(self):
        """Class with no scheduled_date → session starts (backward compat)."""
        resp = self._start()
        self.assertEqual(resp.status_code, 200, resp.get_json())
        self.assertIn("session_id", resp.get_json())

    # ── Test 2 ────────────────────────────────────────────────────────
    def test_date_without_time_is_blocked(self):
        """scheduled_date set but no scheduled_time → 403 incomplete schedule."""
        self._set_schedule(
            scheduled_date=_dt.date.today(),   # today (any tz is fine for seed)
            scheduled_time=None,
        )
        resp = self._start()
        self.assertEqual(resp.status_code, 403, resp.get_json())
        self.assertIn("incomplete", resp.get_json()["error"].lower())

    # ── Test 3 ────────────────────────────────────────────────────────
    def test_future_date_is_blocked(self):
        """Class scheduled for tomorrow → 403 not today."""
        tomorrow_npt = _dt.date.today() + _dt.timedelta(days=1)
        self._set_schedule(
            scheduled_date=tomorrow_npt,
            scheduled_time=_dt.time(9, 0),
        )
        # Now = today 10:00 NPT — date is tomorrow so must be blocked
        fixed = _npt_now(tomorrow_npt.year, tomorrow_npt.month,
                         tomorrow_npt.day - 1, 10, 0)
        resp = self._start(_patch_now(fixed))
        self.assertEqual(resp.status_code, 403, resp.get_json())
        self.assertIn("not scheduled for today", resp.get_json()["error"].lower())

    # ── Test 4 ────────────────────────────────────────────────────────
    def test_past_end_time_is_blocked(self):
        """Today's class whose end_time has already passed → 403 ended."""
        today = _dt.date.today()
        self._set_schedule(
            scheduled_date=today,
            scheduled_time=_dt.time(8, 0),
            scheduled_end_time=_dt.time(9, 30),
        )
        # Current time = 10:00 NPT today — past the 09:30 end
        fixed = _npt_now(today.year, today.month, today.day, 10, 0)
        resp = self._start(_patch_now(fixed))
        self.assertEqual(resp.status_code, 403, resp.get_json())
        self.assertIn("passed", resp.get_json()["error"].lower())

    # ── Test 5 ────────────────────────────────────────────────────────
    def test_too_early_is_blocked(self):
        """Class starts in 2 hours → 403 not started yet (beyond 15-min buffer)."""
        today = _dt.date.today()
        self._set_schedule(
            scheduled_date=today,
            scheduled_time=_dt.time(12, 0),   # noon
        )
        # Current time = 09:30 NPT — 2.5 hours before noon
        fixed = _npt_now(today.year, today.month, today.day, 9, 30)
        resp = self._start(_patch_now(fixed))
        self.assertEqual(resp.status_code, 403, resp.get_json())
        self.assertIn("not started yet", resp.get_json()["error"].lower())

    # ── Test 6 ────────────────────────────────────────────────────────
    def test_within_buffer_window_allows_start(self):
        """Now = 10 minutes before start → within 15-min buffer → 200 OK."""
        today = _dt.date.today()
        self._set_schedule(
            scheduled_date=today,
            scheduled_time=_dt.time(10, 0),    # 10:00
            scheduled_end_time=_dt.time(11, 30),
        )
        # 09:50 NPT = 10 minutes before start, inside the 15-min buffer
        fixed = _npt_now(today.year, today.month, today.day, 9, 50)
        resp = self._start(_patch_now(fixed))
        self.assertEqual(resp.status_code, 200, resp.get_json())
        self.assertIn("session_id", resp.get_json())


if __name__ == "__main__":
    unittest.main(verbosity=2)
