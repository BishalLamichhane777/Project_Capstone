"""Unit tests for services/face_recognition/recognizer.compute_confidence.

Rules:
  - No Flask app, no DB, no HTTP, no cv2, no DeepFace.
  - Calls compute_confidence() directly with plain float arguments.
  - Runs in milliseconds with zero setup.

Function signature:
    compute_confidence(distance: float, threshold: float) -> float

Formula (documented in source as a pure function):
    round(max(0.0, (1.0 - (distance / threshold)) * 100), 1)

Examples from source docstring:
    distance = 0.0       → 100.0  (perfect match)
    distance = threshold → 0.0    (at the boundary)
    distance > threshold → 0.0    (unknown — never negative)
    distance = threshold/2 → 50.0 (halfway)
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
# Stub chain:
#   recognizer.py imports from services.face_recognition.detector and .preprocess
#   services/face_recognition/__init__.py imports cv2, numpy, models.student,
#   and recognizer itself — we bypass __init__ by loading recognizer.py directly.
# ---------------------------------------------------------------------------

def _make_stub(name):
    if name not in sys.modules:
        m = types.ModuleType(name)
        sys.modules[name] = m
    return sys.modules[name]

# cv2
_cv2 = _make_stub("cv2")
_cv2.IMREAD_COLOR = 1

# numpy — keep the real one; recognizer uses it for array math
# (numpy is available locally without Docker)

# Heavy AI packages
for _mod_name in ("deepface", "mtcnn", "tensorflow"):
    _make_stub(_mod_name)

# models
_models_pkg = _make_stub("models")
_student_mod = _make_stub("models.student")
_student_mod.Student = mock.MagicMock()

# database
_db_mod = _make_stub("database")
_db_mod.db = mock.MagicMock()

# services.face_recognition.detector — must expose the names recognizer.py unpacks
_detector = _make_stub("services.face_recognition.detector")
_detector.detect_faces = mock.MagicMock(return_value=[])
_detector.crop_face = mock.MagicMock(return_value=None)

# services.face_recognition.preprocess
_preprocess = _make_stub("services.face_recognition.preprocess")
_preprocess.preprocess_for_recognition = mock.MagicMock(return_value=None)

# services.face_recognition package stub — prevents __init__.py from running
_fr_pkg = _make_stub("services.face_recognition")
_fr_pkg.reload_embeddings = mock.MagicMock()

_services_pkg = _make_stub("services")

# ---------------------------------------------------------------------------
# Load recognizer.py directly via importlib, bypassing package __init__
# ---------------------------------------------------------------------------
import importlib.util as _ilu

_rec_path = os.path.join(
    _BACKEND_ROOT, "services", "face_recognition", "recognizer.py"
)
_spec = _ilu.spec_from_file_location(
    "services.face_recognition.recognizer", _rec_path
)
_rec_mod = _ilu.module_from_spec(_spec)
sys.modules["services.face_recognition.recognizer"] = _rec_mod
_spec.loader.exec_module(_rec_mod)

compute_confidence = _rec_mod.compute_confidence


class TestComputeConfidence(unittest.TestCase):
    """Tests for compute_confidence(distance, threshold)."""

    # ------------------------------------------------------------------
    # Core examples from the source docstring
    # ------------------------------------------------------------------

    def test_distance_zero_returns_100(self):
        """Perfect match (distance=0) → confidence=100.0."""
        self.assertEqual(compute_confidence(0.0, 0.40), 100.0)

    def test_distance_equals_threshold_returns_0(self):
        """Distance exactly at threshold → confidence=0.0."""
        self.assertEqual(compute_confidence(0.40, 0.40), 0.0)

    def test_distance_above_threshold_returns_0_not_negative(self):
        """Distance greater than threshold → 0.0, never negative."""
        self.assertEqual(compute_confidence(0.60, 0.40), 0.0)

    def test_distance_halfway_to_threshold_returns_50(self):
        """distance = threshold / 2 → confidence = 50.0."""
        self.assertEqual(compute_confidence(0.20, 0.40), 50.0)

    # ------------------------------------------------------------------
    # Boundary and near-boundary values
    # ------------------------------------------------------------------

    def test_large_overshoot_still_zero(self):
        """distance = threshold + 1.0 → 0.0 (not negative)."""
        self.assertEqual(compute_confidence(1.40, 0.40), 0.0)

    def test_slightly_below_threshold_positive(self):
        """distance just below threshold → small positive confidence."""
        result = compute_confidence(0.399, 0.40)
        self.assertGreater(result, 0.0)
        self.assertLess(result, 1.0)

    def test_slightly_above_threshold_zero(self):
        """distance just above threshold → exactly 0.0 (clamped)."""
        self.assertEqual(compute_confidence(0.401, 0.40), 0.0)

    # ------------------------------------------------------------------
    # Adaptive per-student thresholds
    # ------------------------------------------------------------------

    def test_tight_threshold_030_zero_distance(self):
        """Tight threshold (0.30) — distance=0 → 100.0."""
        self.assertEqual(compute_confidence(0.0, 0.30), 100.0)

    def test_tight_threshold_030_halfway(self):
        """Tight threshold (0.30) — distance=0.15 → 50.0."""
        self.assertEqual(compute_confidence(0.15, 0.30), 50.0)

    def test_loose_threshold_055_zero_distance(self):
        """Loose threshold (0.55) — distance=0 → 100.0."""
        self.assertEqual(compute_confidence(0.0, 0.55), 100.0)

    def test_loose_threshold_055_halfway(self):
        """Loose threshold (0.55) — distance=0.275 → 50.0."""
        self.assertAlmostEqual(compute_confidence(0.275, 0.55), 50.0, places=1)

    def test_distance_zero_always_100_for_any_threshold(self):
        """distance=0 is always 100.0, regardless of threshold."""
        for t in (0.30, 0.35, 0.40, 0.45, 0.50, 0.55):
            with self.subTest(threshold=t):
                self.assertEqual(compute_confidence(0.0, t), 100.0)

    def test_distance_equals_threshold_always_0(self):
        """distance==threshold is always 0.0, regardless of threshold."""
        for t in (0.30, 0.35, 0.40, 0.45, 0.50, 0.55):
            with self.subTest(threshold=t):
                self.assertEqual(compute_confidence(t, t), 0.0)

    # ------------------------------------------------------------------
    # Return type and rounding
    # ------------------------------------------------------------------

    def test_return_type_is_float(self):
        """Return value must be a float."""
        self.assertIsInstance(compute_confidence(0.20, 0.40), float)

    def test_result_rounded_to_one_decimal(self):
        """Result is rounded to 1 decimal place."""
        result = compute_confidence(0.123, 0.40)
        expected = round(max(0.0, (1.0 - (0.123 / 0.40)) * 100), 1)
        self.assertEqual(result, expected)

    def test_result_never_exceeds_100(self):
        """Confidence is always <= 100."""
        for d in (0.0, 0.01, 0.10, 0.39, 0.40, 0.80):
            with self.subTest(distance=d):
                self.assertLessEqual(compute_confidence(d, 0.40), 100.0)

    def test_result_never_negative(self):
        """Confidence is always >= 0 (max-clamp enforces this)."""
        for d in (0.41, 0.50, 1.00, 2.00, 99.0):
            with self.subTest(distance=d):
                self.assertGreaterEqual(compute_confidence(d, 0.40), 0.0)


if __name__ == "__main__":
    unittest.main()
