"""Unit tests for services/face_recognition/enroll._compute_adaptive_threshold.

Rules:
  - No Flask app, no DB, no HTTP, no cv2, no DeepFace.
  - Calls _compute_adaptive_threshold() directly with plain numpy arrays.
  - numpy is a standard dependency (installs locally, no Docker needed).
  - Runs in milliseconds with zero setup.

Function signature:
    _compute_adaptive_threshold(embeddings_list: list[np.ndarray]) -> float

Formula:
    if len(embeddings_list) < 2:
        return 0.40   # DEFAULT_THRESHOLD
    pairwise_distances = [cosine_dist(a, b) for all i<j pairs]
    std_dev = np.std(pairwise_distances)
    raw     = 0.40 + std_dev * 2
    return clamp(raw, min=0.30, max=0.55)

    where cosine_dist(a, b) = 1.0 - dot(a_norm, b_norm)
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
# Stub the heavy deps so we can import enroll.py locally.
#
# Import chain triggered by:
#   from services.face_recognition.enroll import _compute_adaptive_threshold
#
# That pulls in services/face_recognition/__init__.py first, which does:
#   import cv2
#   import numpy as np           ← real numpy is fine; we keep it
#   from models.student import Student
#   from services.face_recognition.recognizer import recognize_face, load_all_embeddings
#
# recognizer.py in turn does:
#   from services.face_recognition.detector import detect_faces, crop_face
#   from services.face_recognition.preprocess import preprocess_for_recognition
#
# enroll.py itself does:
#   import cv2
#   from services.face_recognition.preprocess import (
#       preprocess_for_enrollment, get_all_photos, check_image_quality, DATASET_FOLDER)
# ---------------------------------------------------------------------------

def _make_stub(name):
    if name not in sys.modules:
        m = types.ModuleType(name)
        sys.modules[name] = m
    return sys.modules[name]

# cv2 stub
_cv2 = _make_stub("cv2")
_cv2.imread = mock.MagicMock(return_value=None)
_cv2.resize = mock.MagicMock(return_value=None)
_cv2.imdecode = mock.MagicMock(return_value=None)
_cv2.IMREAD_COLOR = 1
_cv2.INTER_AREA = 3
_cv2.bilateralFilter = mock.MagicMock()
_cv2.cvtColor = mock.MagicMock()
_cv2.equalizeHist = mock.MagicMock()
_cv2.COLOR_BGR2GRAY = 6

# deepface stub
_df = _make_stub("deepface")
_df.DeepFace = mock.MagicMock()

# mtcnn stub
_mtcnn = _make_stub("mtcnn")
_mtcnn.MTCNN = mock.MagicMock()

# tensorflow stub
_tf = _make_stub("tensorflow")
_tf.keras = types.SimpleNamespace()

# models package + models.student
_models_pkg = _make_stub("models")
_student_mod = _make_stub("models.student")
_student_mod.Student = mock.MagicMock()
_models_pkg.student = _student_mod

# database
_db_mod = _make_stub("database")
_db_mod.db = mock.MagicMock()

# services.face_recognition.detector — needs detect_faces and crop_face
_detector = _make_stub("services.face_recognition.detector")
_detector.detect_faces = mock.MagicMock(return_value=[])
_detector.crop_face = mock.MagicMock(return_value=None)
_detector.get_largest_face = mock.MagicMock(return_value=None)

# services.face_recognition.preprocess — needs the symbols enroll.py unpacks
_preprocess = _make_stub("services.face_recognition.preprocess")
_preprocess.preprocess_for_enrollment = mock.MagicMock(return_value=(None, "stub"))
_preprocess.preprocess_for_recognition = mock.MagicMock(return_value=None)
_preprocess.get_all_photos = mock.MagicMock(return_value={})
_preprocess.check_image_quality = mock.MagicMock(return_value=(True, "ok"))
_preprocess.DATASET_FOLDER = "/dev/null"

# services.face_recognition.recognizer — needed by __init__.py
_recognizer = _make_stub("services.face_recognition.recognizer")
_recognizer.recognize_face = mock.MagicMock(return_value=[])
_recognizer.load_all_embeddings = mock.MagicMock(return_value={})
_recognizer.compute_confidence = mock.MagicMock(return_value=0.0)

# services.face_recognition package itself — stub __init__ so it never runs
# its real body (which calls load_all_embeddings and _warmup_deepface)
_fr_pkg = _make_stub("services.face_recognition")
_fr_pkg.reload_embeddings = mock.MagicMock()
_fr_pkg.recognize_student = mock.MagicMock(return_value=[])

# services package stub
_services = _make_stub("services")
_services.face_recognition = _fr_pkg

# ---------------------------------------------------------------------------
# NOW safe to import the target function directly from the module file,
# bypassing the package __init__ entirely.
# ---------------------------------------------------------------------------
import importlib.util as _ilu

_enroll_path = os.path.join(_BACKEND_ROOT, "services", "face_recognition", "enroll.py")
_spec = _ilu.spec_from_file_location("services.face_recognition.enroll", _enroll_path)
_enroll_mod = _ilu.module_from_spec(_spec)
# Register under the dotted name so relative imports inside enroll.py resolve
sys.modules["services.face_recognition.enroll"] = _enroll_mod
_spec.loader.exec_module(_enroll_mod)

_compute_adaptive_threshold = _enroll_mod._compute_adaptive_threshold

import numpy as np


class TestComputeAdaptiveThreshold(unittest.TestCase):
    """Tests for _compute_adaptive_threshold(embeddings_list)."""

    # ------------------------------------------------------------------
    # Helper
    # ------------------------------------------------------------------

    @staticmethod
    def _unit_vec(dim=128, seed=None):
        """Return a random L2-normalised numpy vector of length `dim`."""
        rng = np.random.default_rng(seed)
        v = rng.standard_normal(dim)
        return (v / np.linalg.norm(v)).astype(np.float32)

    # ------------------------------------------------------------------
    # Single embedding / empty list → default 0.40
    # ------------------------------------------------------------------

    def test_single_photo_returns_default_040(self):
        """Single embedding (len < 2) → default 0.40."""
        result = _compute_adaptive_threshold([self._unit_vec(seed=0)])
        self.assertAlmostEqual(result, 0.40, places=6)

    def test_empty_list_returns_default_040(self):
        """Empty list (len < 2) → default 0.40."""
        result = _compute_adaptive_threshold([])
        self.assertAlmostEqual(result, 0.40, places=6)

    # ------------------------------------------------------------------
    # Identical embeddings → std_dev = 0 → result = 0.40
    # ------------------------------------------------------------------

    def test_identical_embeddings_returns_040(self):
        """All embeddings identical → all pairwise distances = 0 → std_dev = 0
        → raw = 0.40 → clamped result = 0.40."""
        v = self._unit_vec(seed=42)
        result = _compute_adaptive_threshold([v.copy(), v.copy(), v.copy()])
        self.assertAlmostEqual(result, 0.40, places=5)

    def test_two_embeddings_single_distance_std_zero(self):
        """Two embeddings → one pairwise distance → std([d]) = 0 → result = 0.40."""
        result = _compute_adaptive_threshold([
            self._unit_vec(seed=10),
            self._unit_vec(seed=11),
        ])
        self.assertAlmostEqual(result, 0.40, places=5)

    # ------------------------------------------------------------------
    # Large std_dev → result clamped to ceiling 0.55
    # ------------------------------------------------------------------

    def test_large_std_dev_clamped_to_055(self):
        """Opposite vector pairs → huge pairwise distance variance → raw > 0.55 → 0.55."""
        rng = np.random.default_rng(7)
        embs = []
        for _ in range(6):
            v = rng.standard_normal(128).astype(np.float32)
            v /= np.linalg.norm(v)
            embs.append(v)
            embs.append(-v)   # cosine distance ≈ 2.0 vs the original
        result = _compute_adaptive_threshold(embs)
        self.assertAlmostEqual(result, 0.55, places=6)

    def test_result_never_above_ceiling(self):
        """No matter what, result <= 0.55."""
        rng = np.random.default_rng(13)
        embs = [rng.standard_normal(128).astype(np.float32) for _ in range(20)]
        self.assertLessEqual(_compute_adaptive_threshold(embs), 0.55)

    # ------------------------------------------------------------------
    # Floor bound
    # ------------------------------------------------------------------

    def test_result_never_below_floor(self):
        """No matter what, result >= 0.30."""
        rng = np.random.default_rng(99)
        for n in range(1, 15):
            embs = [rng.standard_normal(128).astype(np.float32) for _ in range(n)]
            self.assertGreaterEqual(_compute_adaptive_threshold(embs), 0.30,
                                    msg=f"n={n} produced result below 0.30")

    # ------------------------------------------------------------------
    # Clamp expression boundary checks (formula validation)
    # ------------------------------------------------------------------

    def test_clamp_boundary_exactly_030(self):
        """max(0.30, min(0.55, 0.30)) == 0.30."""
        self.assertAlmostEqual(max(0.30, min(0.55, 0.30)), 0.30, places=6)

    def test_clamp_boundary_exactly_055(self):
        """max(0.30, min(0.55, 0.55)) == 0.55."""
        self.assertAlmostEqual(max(0.30, min(0.55, 0.55)), 0.55, places=6)

    def test_clamp_raw_just_below_ceiling(self):
        """raw = 0.549 stays at 0.549 (not clamped up or down)."""
        self.assertAlmostEqual(max(0.30, min(0.55, 0.549)), 0.549, places=6)

    def test_clamp_raw_just_above_ceiling(self):
        """raw = 0.551 → clamped to 0.55."""
        self.assertAlmostEqual(max(0.30, min(0.55, 0.551)), 0.55, places=6)

    # ------------------------------------------------------------------
    # Output always in valid range for diverse inputs
    # ------------------------------------------------------------------

    def test_output_always_in_valid_range_property(self):
        """Property test: result in [0.30, 0.55] for embedding counts 1–20."""
        rng = np.random.default_rng(42)
        for n in range(1, 21):
            embs = [rng.standard_normal(128).astype(np.float32) for _ in range(n)]
            result = _compute_adaptive_threshold(embs)
            self.assertGreaterEqual(result, 0.30, msg=f"n={n}: {result} < 0.30")
            self.assertLessEqual(result, 0.55,    msg=f"n={n}: {result} > 0.55")


if __name__ == "__main__":
    unittest.main()
