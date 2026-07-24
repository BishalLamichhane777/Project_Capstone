"""Unit tests for the at-risk pure helpers in routes/batch.py.

Rules:
  - No Flask app, no DB, no HTTP.
  - Calls is_at_risk() and pick_worst_class() directly with plain Python values.
  - Runs in milliseconds with zero setup.

Functions under test:

    is_at_risk(attendance_percent: float) -> bool
        True  when attendance_percent <  75.0  (strictly less than)
        False when attendance_percent >= 75.0

    pick_worst_class(student_classes: list[dict]) -> dict | None
        Returns the dict whose attendance_percent is the LOWEST and
        strictly below AT_RISK_THRESHOLD (75.0), or None if no entry qualifies.

AT_RISK_THRESHOLD = 75.0
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
# routes/batch.py is imported via `from routes.batch import ...`.
# Python first executes routes/__init__.py, which eagerly imports every other
# blueprint (auth, session, attendance, etc.) — those pull in real Flask,
# SQLAlchemy, bcrypt, firebase, and AI packages.
#
# Strategy: stub routes/__init__.py so it is a no-op package, then load
# routes/batch.py directly via importlib — this completely bypasses __init__.
# ---------------------------------------------------------------------------

def _make_stub(name):
    if name not in sys.modules:
        m = types.ModuleType(name)
        sys.modules[name] = m
    return sys.modules[name]

# Flask — batch.py uses Blueprint, jsonify, request at module level
_flask = _make_stub("flask")
_flask.Blueprint = mock.MagicMock(return_value=mock.MagicMock())
_flask.jsonify = mock.MagicMock()
_flask.request = mock.MagicMock()

# sqlalchemy extras used at module level in batch.py
_sa = _make_stub("sqlalchemy")
_sa.func = mock.MagicMock()
_sa.case = mock.MagicMock()
_make_stub("sqlalchemy.exc")
_sa_exc = sys.modules["sqlalchemy.exc"]
_sa_exc.IntegrityError = Exception   # just needs to be importable

# database
_db_mod = _make_stub("database")
_db_mod.db = mock.MagicMock()

# models
_models_pkg = _make_stub("models")

for _mname in (
    "models.attendance",
    "models.batch",
    "models.batch_class_link",
    "models.class_model",
    "models.session",
    "models.student",
):
    _m = _make_stub(_mname)

# Give each model module the class names batch.py unpacks
sys.modules["models.attendance"].AttendanceRecord = mock.MagicMock()
sys.modules["models.batch"].Batch = mock.MagicMock()
sys.modules["models.batch"].BatchStudent = mock.MagicMock()
sys.modules["models.batch_class_link"].BatchClassLink = mock.MagicMock()
sys.modules["models.class_model"].Class = mock.MagicMock()
sys.modules["models.class_model"].Enrollment = mock.MagicMock()
sys.modules["models.session"].Session = mock.MagicMock()
sys.modules["models.student"].Student = mock.MagicMock()

# middleware
_mw = _make_stub("middleware")
_mw_auth = _make_stub("middleware.auth_middleware")
_mw_auth.require_role = lambda *a, **kw: (lambda f: f)

# routes package — must exist but must NOT execute its real __init__
_routes_pkg = _make_stub("routes")

# ---------------------------------------------------------------------------
# Load routes/batch.py directly to avoid routes/__init__ cascade
# ---------------------------------------------------------------------------
import importlib.util as _ilu

_batch_path = os.path.join(_BACKEND_ROOT, "routes", "batch.py")
_spec = _ilu.spec_from_file_location("routes.batch", _batch_path)
_batch_mod = _ilu.module_from_spec(_spec)
sys.modules["routes.batch"] = _batch_mod
_spec.loader.exec_module(_batch_mod)

AT_RISK_THRESHOLD = _batch_mod.AT_RISK_THRESHOLD
is_at_risk = _batch_mod.is_at_risk
pick_worst_class = _batch_mod.pick_worst_class


# ===========================================================================

class TestIsAtRisk(unittest.TestCase):
    """Tests for is_at_risk(attendance_percent)."""

    # ------------------------------------------------------------------
    # Boundary — the critical 75 % line
    # ------------------------------------------------------------------

    def test_exactly_75_is_NOT_at_risk(self):
        """75.0 % is the safe boundary — NOT at risk (< not <=)."""
        self.assertFalse(is_at_risk(75.0),
                         msg="75.0 should NOT be at risk — condition is strict < 75.0")

    def test_just_below_75_IS_at_risk(self):
        """74.9 % is one decimal below — IS at risk."""
        self.assertTrue(is_at_risk(74.9))

    def test_just_above_75_is_NOT_at_risk(self):
        """75.1 % is above — NOT at risk."""
        self.assertFalse(is_at_risk(75.1))

    # ------------------------------------------------------------------
    # Clear at-risk cases
    # ------------------------------------------------------------------

    def test_zero_percent_at_risk(self):
        self.assertTrue(is_at_risk(0.0))

    def test_50_percent_at_risk(self):
        self.assertTrue(is_at_risk(50.0))

    def test_74_99_at_risk(self):
        self.assertTrue(is_at_risk(74.99))

    # ------------------------------------------------------------------
    # Clear safe cases
    # ------------------------------------------------------------------

    def test_100_percent_not_at_risk(self):
        self.assertFalse(is_at_risk(100.0))

    def test_80_percent_not_at_risk(self):
        self.assertFalse(is_at_risk(80.0))

    def test_75_01_not_at_risk(self):
        self.assertFalse(is_at_risk(75.01))

    # ------------------------------------------------------------------
    # Threshold constant sanity
    # ------------------------------------------------------------------

    def test_threshold_constant_is_75(self):
        """AT_RISK_THRESHOLD must be 75.0 (not 0.75, not 80.0)."""
        self.assertEqual(AT_RISK_THRESHOLD, 75.0)


# ===========================================================================

class TestPickWorstClass(unittest.TestCase):
    """Tests for pick_worst_class(student_classes)."""

    # ------------------------------------------------------------------
    # Empty / all-safe inputs → None
    # ------------------------------------------------------------------

    def test_empty_list_returns_none(self):
        self.assertIsNone(pick_worst_class([]))

    def test_all_safe_returns_none(self):
        """All classes at or above 75 % → None."""
        classes = [
            {"class_id": 1, "attendance_percent": 75.0},
            {"class_id": 2, "attendance_percent": 80.0},
            {"class_id": 3, "attendance_percent": 100.0},
        ]
        self.assertIsNone(pick_worst_class(classes))

    def test_exactly_75_considered_safe(self):
        """75.0 % exactly → safe → None."""
        self.assertIsNone(pick_worst_class([{"class_id": 1, "attendance_percent": 75.0}]))

    # ------------------------------------------------------------------
    # Single at-risk class
    # ------------------------------------------------------------------

    def test_single_at_risk_class_returned(self):
        entry = {"class_id": 5, "class_name": "Math", "attendance_percent": 60.0}
        self.assertEqual(pick_worst_class([entry]), entry)

    # ------------------------------------------------------------------
    # Multiple classes — pick the lowest at-risk one
    # ------------------------------------------------------------------

    def test_three_at_risk_classes_returns_lowest(self):
        """Student in 3 at-risk classes — must return the one with the lowest %."""
        classes = [
            {"class_id": 1, "class_name": "Math",    "attendance_percent": 72.0},
            {"class_id": 2, "class_name": "Science", "attendance_percent": 65.0},
            {"class_id": 3, "class_name": "English", "attendance_percent": 50.0},
        ]
        result = pick_worst_class(classes)
        self.assertEqual(result["class_id"], 3)
        self.assertEqual(result["attendance_percent"], 50.0)

    def test_mix_safe_and_at_risk_returns_lowest_at_risk(self):
        classes = [
            {"class_id": 1, "attendance_percent": 80.0},   # safe
            {"class_id": 2, "attendance_percent": 74.0},   # at-risk
            {"class_id": 3, "attendance_percent": 60.0},   # at-risk, worst
            {"class_id": 4, "attendance_percent": 90.0},   # safe
        ]
        result = pick_worst_class(classes)
        self.assertEqual(result["class_id"], 3)
        self.assertEqual(result["attendance_percent"], 60.0)

    def test_two_at_risk_returns_lower(self):
        classes = [
            {"class_id": 10, "attendance_percent": 70.0},
            {"class_id": 20, "attendance_percent": 40.0},
        ]
        self.assertEqual(pick_worst_class(classes)["class_id"], 20)

    # ------------------------------------------------------------------
    # Boundary: 74.9 (at-risk) vs 75.0 (safe) in same list
    # ------------------------------------------------------------------

    def test_boundary_749_beats_750(self):
        classes = [
            {"class_id": 1, "attendance_percent": 75.0},
            {"class_id": 2, "attendance_percent": 74.9},
        ]
        result = pick_worst_class(classes)
        self.assertIsNotNone(result)
        self.assertEqual(result["class_id"], 2)

    # ------------------------------------------------------------------
    # Returns the original dict object (not a copy)
    # ------------------------------------------------------------------

    def test_returns_original_dict_reference(self):
        entry = {"class_id": 7, "attendance_percent": 55.5, "extra": "data"}
        self.assertIs(pick_worst_class([entry]), entry)

    # ------------------------------------------------------------------
    # All classes at 0 %
    # ------------------------------------------------------------------

    def test_all_zero_percent(self):
        classes = [
            {"class_id": 1, "attendance_percent": 0.0},
            {"class_id": 2, "attendance_percent": 0.0},
        ]
        result = pick_worst_class(classes)
        self.assertIsNotNone(result)
        self.assertEqual(result["attendance_percent"], 0.0)
        self.assertIn(result["class_id"], (1, 2))

    def test_missing_attendance_percent_handled_without_error(self):
        """A malformed entry missing 'attendance_percent' must not crash the selection logic."""
        classes = [
            {"class_id": 1, "attendance_percent": 60.0},
            {"class_id": 2},  # missing key — simulates incomplete data
        ]
        try:
            pick_worst_class(classes)
        except Exception as e:
            self.fail(f"pick_worst_class raised {type(e).__name__} on malformed data: {e}")


if __name__ == "__main__":
    unittest.main()
