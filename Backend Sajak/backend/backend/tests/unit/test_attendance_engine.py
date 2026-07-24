"""Unit tests for services/attendance_engine._determine_status.

Rules:
  - No Flask app, no DB, no HTTP.
  - Calls _determine_status() directly with plain Python arguments.
  - Runs in milliseconds with zero setup.

Function signature (from services/attendance_engine.py):
    _determine_status(
        total_duration: float,
        session_duration_seconds: float,
        threshold_percent: float,
    ) -> str   # 'Present' | 'Absent'

Logic:
    if session_duration_seconds <= 0:
        return 'Absent'
    threshold_seconds = threshold_percent * session_duration_seconds
    if total_duration >= threshold_seconds:
        return 'Present'
    return 'Absent'
"""

import sys
import os
import types
import unittest
import unittest.mock as mock

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
_BACKEND_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

# ---------------------------------------------------------------------------
# Stub every module that attendance_engine.py imports at the top level so
# that we never touch SQLAlchemy, Flask, or any DB connection.
#
# attendance_engine.py module-level imports:
#   from database import db
#   from models.attendance import AttendanceLog, AttendanceRecord
#   from models.class_model import Enrollment
#   from models.session import Session
# ---------------------------------------------------------------------------

def _make_stub(name):
    m = types.ModuleType(name)
    sys.modules[name] = m
    return m

# database
_db_mod = _make_stub("database")
_db_mod.db = mock.MagicMock()

# models (parent package must be a real module object, not a namespace)
_models_pkg = _make_stub("models")

# models.attendance — needs AttendanceLog and AttendanceRecord as attributes
_att_mod = _make_stub("models.attendance")
_att_mod.AttendanceLog = mock.MagicMock()
_att_mod.AttendanceRecord = mock.MagicMock()
_models_pkg.attendance = _att_mod

# models.class_model — needs Enrollment
_class_mod = _make_stub("models.class_model")
_class_mod.Enrollment = mock.MagicMock()
_models_pkg.class_model = _class_mod

# models.session — needs Session
_session_mod = _make_stub("models.session")
_session_mod.Session = mock.MagicMock()
_models_pkg.session = _session_mod

# ---------------------------------------------------------------------------
# NOW safe to import the target function
# ---------------------------------------------------------------------------
from services.attendance_engine import _determine_status


class TestDetermineStatus(unittest.TestCase):
    """Tests for _determine_status(total_duration, session_duration_seconds, threshold_percent)."""

    # ------------------------------------------------------------------
    # Normal "Present" paths
    # ------------------------------------------------------------------

    def test_full_duration_present(self):
        """Student present for the entire class → Present."""
        result = _determine_status(
            total_duration=3600.0,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Present")

    def test_exactly_at_threshold_present(self):
        """Total duration == threshold_seconds exactly → Present (boundary is >= inclusive)."""
        # threshold = 0.80 * 3600 = 2880 s
        result = _determine_status(
            total_duration=2880.0,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Present")

    def test_one_second_above_threshold_present(self):
        """One second above the threshold → Present."""
        result = _determine_status(
            total_duration=2881.0,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Present")

    def test_activity_mode_threshold_present(self):
        """Activity-mode threshold (0.55) — student present for 60 % → Present."""
        # 0.55 * 3300 = 1815 s required; student was there for 2000 s
        result = _determine_status(
            total_duration=2000.0,
            session_duration_seconds=3300.0,
            threshold_percent=0.55,
        )
        self.assertEqual(result, "Present")

    def test_activity_mode_exactly_at_threshold_present(self):
        """Activity-mode: total_duration exactly equals threshold_seconds → Present (boundary is >= inclusive)."""
        # threshold = 0.55 * 2000 = 1100 s exactly
        result = _determine_status(
            total_duration=1100.0,
            session_duration_seconds=2000.0,
            threshold_percent=0.55,
        )
        self.assertEqual(result, "Present")

    def test_activity_mode_just_above_threshold_present(self):
        """Activity-mode: one second above the 55% threshold → Present."""
        # threshold = 0.55 * 1000 = 550 s; 560 s is just above → Present
        result = _determine_status(
            total_duration=560.0,
            session_duration_seconds=1000.0,
            threshold_percent=0.55,
        )
        self.assertEqual(result, "Present")

    # ------------------------------------------------------------------
    # Normal "Absent" paths
    # ------------------------------------------------------------------

    def test_zero_duration_absent(self):
        """Student never scanned → total_duration=0 → Absent."""
        result = _determine_status(
            total_duration=0.0,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Absent")

    def test_one_second_below_threshold_absent(self):
        """One second below the threshold → Absent."""
        # threshold = 2880 s  →  2879 s should be Absent
        result = _determine_status(
            total_duration=2879.0,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Absent")

    def test_far_below_threshold_absent(self):
        """Student barely present (5 minutes out of 60) → Absent."""
        result = _determine_status(
            total_duration=300.0,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Absent")

    # ------------------------------------------------------------------
    # Edge cases involving session_duration_seconds
    # ------------------------------------------------------------------

    def test_zero_session_duration_absent(self):
        """session_duration_seconds=0 is degenerate → always Absent."""
        result = _determine_status(
            total_duration=9999.0,
            session_duration_seconds=0.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Absent")

    def test_negative_session_duration_absent(self):
        """Negative session duration (data corruption edge case) → Absent."""
        result = _determine_status(
            total_duration=100.0,
            session_duration_seconds=-600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Absent")

    # ------------------------------------------------------------------
    # Multi-pair summation
    # ------------------------------------------------------------------

    def test_multiple_entry_exit_pairs_summed_present(self):
        """
        Two spans: 1200 s + 1800 s = 3000 s.
        Class is 3600 s, threshold 80% = 2880 s.
        3000 >= 2880 → Present.
        _determine_status receives the already-summed total.
        """
        total = 1200.0 + 1800.0  # 3000 s
        result = _determine_status(
            total_duration=total,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Present")

    def test_multiple_entry_exit_pairs_summed_absent(self):
        """
        Two short spans: 400 s + 600 s = 1000 s in a 3600 s class → Absent.
        1000 < 2880 threshold.
        """
        total = 400.0 + 600.0  # 1000 s
        result = _determine_status(
            total_duration=total,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Absent")

    def test_single_unmatched_entry_no_exit_short_span_absent(self):
        """
        Single ENTRY 3 s before session end (no EXIT) → duration = 3 s → Absent.
        get_student_duration() closes an unmatched ENTRY at end_time; the
        resulting small duration is passed here as total_duration=3.0.
        """
        result = _determine_status(
            total_duration=3.0,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Absent")

    def test_single_unmatched_entry_near_full_session_present(self):
        """
        Single ENTRY 60 s into a 3600 s class, no EXIT.
        get_student_duration() closes at end_time → duration = 3540 s.
        3540 >= 2880 threshold → Present.
        """
        result = _determine_status(
            total_duration=3540.0,
            session_duration_seconds=3600.0,
            threshold_percent=0.80,
        )
        self.assertEqual(result, "Present")


if __name__ == "__main__":
    unittest.main()
