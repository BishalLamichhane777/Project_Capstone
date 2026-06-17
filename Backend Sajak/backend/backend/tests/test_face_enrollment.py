"""
tests/test_face_enrollment.py
─────────────────────────────
Unit tests for the face enrollment pipeline.

Tests verify the core invariant:
  embedding key == roll_number == student.face_label

Run from the backend root:
    python -m pytest tests/test_face_enrollment.py -v
"""

import io
import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# ── Make the backend package importable ────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ─────────────────────────────────────────────────────────────────────────────
# Helper: build a minimal 150x150 white JPEG in memory (no real face, but
# enough to pass the quality check and test file-save logic)
# ─────────────────────────────────────────────────────────────────────────────
def _make_blank_jpeg(width=150, height=150):
    import cv2
    import numpy as np
    img = (np.ones((height, width, 3), dtype=np.uint8) * 180).astype(np.uint8)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


class TestEnrollStudentFromImages(unittest.TestCase):
    """
    Tests for enroll_student_from_images().

    The DeepFace / MTCNN stack is mocked so tests run without GPU/weights.
    """

    def setUp(self):
        import tempfile
        self.tmp_dir = tempfile.mkdtemp()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _make_file_obj(self, jpeg_bytes: bytes, filename: str = "photo.jpg"):
        """Return a file-like object that mimics Flask's FileStorage."""
        f = MagicMock()
        f.filename = filename
        f.read.return_value = jpeg_bytes
        return f

    @patch("services.face_recognition.enroll.EMBEDDINGS_FOLDER", None)
    @patch("services.face_recognition.enroll.LABELS_FILE", None)
    @patch("services.face_recognition.enroll.generate_embedding")
    def test_mean_npy_named_by_roll_number(self, mock_gen_emb):
        """
        Invariant 1: The saved mean embedding file must be named
        {roll_number}_mean.npy, not student_id or any other key.
        """
        import numpy as np
        from services.face_recognition.enroll import enroll_student_from_images

        roll_number = "CS-TEST-001"
        fake_embedding = np.random.rand(128).astype(np.float32)
        mock_gen_emb.return_value = fake_embedding

        # Point module-level paths to our temp dir
        import services.face_recognition.enroll as enroll_mod
        enroll_mod.EMBEDDINGS_FOLDER = self.tmp_dir
        enroll_mod.LABELS_FILE       = os.path.join(self.tmp_dir, "labels.json")

        photo = self._make_file_obj(_make_blank_jpeg(), "face1.jpg")
        success, message, skips = enroll_student_from_images(roll_number, [photo])

        self.assertTrue(success, f"Enrollment failed: {message}")

        expected_npy = os.path.join(self.tmp_dir, f"{roll_number}_mean.npy")
        self.assertTrue(
            os.path.isfile(expected_npy),
            f"Expected {expected_npy} but it does not exist. "
            f"Files: {os.listdir(self.tmp_dir)}"
        )

    @patch("services.face_recognition.enroll.generate_embedding")
    def test_labels_json_uses_roll_number_as_key(self, mock_gen_emb):
        """
        Invariant 2: labels.json must store the roll_number as the key,
        not a numeric student_id or folder name.
        """
        import numpy as np
        from services.face_recognition.enroll import enroll_student_from_images

        roll_number = "CS-TEST-002"
        mock_gen_emb.return_value = np.random.rand(128).astype(np.float32)

        import services.face_recognition.enroll as enroll_mod
        enroll_mod.EMBEDDINGS_FOLDER = self.tmp_dir
        enroll_mod.LABELS_FILE       = os.path.join(self.tmp_dir, "labels.json")

        photo = self._make_file_obj(_make_blank_jpeg(), "face1.jpg")
        enroll_student_from_images(roll_number, [photo])

        with open(enroll_mod.LABELS_FILE) as f:
            labels = json.load(f)

        self.assertIn(roll_number, labels, f"roll_number '{roll_number}' not in labels.json: {labels}")

    @patch("services.face_recognition.enroll.generate_embedding")
    def test_reenrollment_overwrites_not_appends(self, mock_gen_emb):
        """
        Invariant 3: Re-enrolling the same student (same roll_number) must
        overwrite the existing mean .npy, not create duplicates or stack embeddings.
        """
        import numpy as np
        from services.face_recognition.enroll import enroll_student_from_images

        roll_number = "CS-TEST-003"
        import services.face_recognition.enroll as enroll_mod
        enroll_mod.EMBEDDINGS_FOLDER = self.tmp_dir
        enroll_mod.LABELS_FILE       = os.path.join(self.tmp_dir, "labels.json")

        emb1 = np.zeros(128, dtype=np.float32)
        mock_gen_emb.return_value = emb1
        enroll_student_from_images(roll_number, [self._make_file_obj(_make_blank_jpeg())])

        emb2 = np.ones(128, dtype=np.float32)
        mock_gen_emb.return_value = emb2
        enroll_student_from_images(roll_number, [self._make_file_obj(_make_blank_jpeg())])

        npy_files = [f for f in os.listdir(self.tmp_dir) if f.endswith("_mean.npy")]
        self.assertEqual(
            len(npy_files), 1,
            f"Expected exactly 1 mean .npy after re-enrollment, got: {npy_files}"
        )

        # Content should reflect the second enrollment
        saved = np.load(os.path.join(self.tmp_dir, npy_files[0]))
        # normalised version of emb2 (all-ones vector)
        norm_emb2 = emb2 / (np.linalg.norm(emb2) + 1e-10)
        np.testing.assert_allclose(saved, norm_emb2, rtol=1e-5)

    @patch("services.face_recognition.enroll.generate_embedding")
    def test_zero_embeddings_returns_failure(self, mock_gen_emb):
        """
        Invariant 4: When no face can be detected in any uploaded photo,
        enroll_student_from_images must return (False, ..., [...]) and
        must NOT write any .npy file.
        """
        from services.face_recognition.enroll import enroll_student_from_images

        mock_gen_emb.return_value = None  # simulate no face detected

        import services.face_recognition.enroll as enroll_mod
        enroll_mod.EMBEDDINGS_FOLDER = self.tmp_dir
        enroll_mod.LABELS_FILE       = os.path.join(self.tmp_dir, "labels.json")

        photo = self._make_file_obj(_make_blank_jpeg(), "blurry.jpg")
        success, message, skips = enroll_student_from_images("CS-TEST-004", [photo])

        self.assertFalse(success)
        npy_files = [f for f in os.listdir(self.tmp_dir) if f.endswith(".npy")]
        self.assertEqual(npy_files, [], f"No .npy should be written on failure, got: {npy_files}")


class TestValidateEmbeddings(unittest.TestCase):
    """
    Tests for validate_face_labels() in validate_embeddings.py.
    """

    def setUp(self):
        import tempfile
        import numpy as np
        self.tmp_dir = tempfile.mkdtemp()
        # Create two valid mean.npy files: CS-001, CS-002
        for key in ("CS-001", "CS-002"):
            np.save(os.path.join(self.tmp_dir, f"{key}_mean.npy"), np.zeros(128))

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp_dir, ignore_errors=True)

    def _mock_student(self, student_id, roll_number, face_label):
        s = MagicMock()
        s.student_id  = student_id
        s.roll_number = roll_number
        s.face_label  = face_label
        return s

    @patch("services.face_recognition.validate_embeddings.EMBEDDINGS_FOLDER", None)
    def test_no_mismatch_when_all_consistent(self):
        """All face_labels have matching .npy → ok=True, missing=[]."""
        from services.face_recognition import validate_embeddings as ve
        ve.EMBEDDINGS_FOLDER = self.tmp_dir

        students = [
            self._mock_student(1, "CS-001", "CS-001"),
            self._mock_student(2, "CS-002", "CS-002"),
        ]

        with patch("services.face_recognition.validate_embeddings.db") as mock_db:
            mock_db.session.query.return_value.all.return_value = students
            with patch("models.student.Student"):
                result = ve.validate_face_labels()

        self.assertTrue(result["ok"])
        self.assertEqual(result["missing"], [])

    @patch("services.face_recognition.validate_embeddings.EMBEDDINGS_FOLDER", None)
    def test_detects_missing_embedding(self):
        """face_label='Student_1' has no .npy → reported in missing."""
        from services.face_recognition import validate_embeddings as ve
        ve.EMBEDDINGS_FOLDER = self.tmp_dir

        students = [
            self._mock_student(1, "CS-001", "Student_1"),  # mismatch!
            self._mock_student(2, "CS-002", "CS-002"),
        ]

        with patch("services.face_recognition.validate_embeddings.db") as mock_db:
            mock_db.session.query.return_value.all.return_value = students
            with patch("models.student.Student"):
                result = ve.validate_face_labels()

        self.assertFalse(result["ok"])
        self.assertIn("Student_1", result["missing"])

    @patch("services.face_recognition.validate_embeddings.EMBEDDINGS_FOLDER", None)
    def test_detects_orphaned_embedding(self):
        """CS-001 .npy exists but no student has face_label=CS-001 → orphaned."""
        from services.face_recognition import validate_embeddings as ve
        ve.EMBEDDINGS_FOLDER = self.tmp_dir

        students = [
            self._mock_student(1, "CS-001", "CS-002"),  # both pointing to CS-002
            self._mock_student(2, "CS-002", "CS-002"),
        ]

        with patch("services.face_recognition.validate_embeddings.db") as mock_db:
            mock_db.session.query.return_value.all.return_value = students
            with patch("models.student.Student"):
                result = ve.validate_face_labels()

        self.assertIn("CS-001", result["orphaned"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
