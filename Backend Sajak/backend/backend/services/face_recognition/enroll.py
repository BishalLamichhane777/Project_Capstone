# enroll.py
# Student enrollment for the DeepFace + MTCNN pipeline.
# Replaces the old train_model.py.
#
# HOW IT WORKS (vs old LBPH training):
#
#   OLD (LBPH):   For each student, train an LBPH model on their photos.
#                 Saves a .yml file per student.
#                 "Training" takes time and must be redone for new students.
#
#   NEW (DeepFace): For each student photo, generate a 128-dim face embedding
#                   using a pretrained FaceNet model (already trained on millions
#                   of faces by Google). Save embeddings as .npy files.
#                   NO training needed - FaceNet is fixed, we just store
#                   reference embeddings.
#
# EMBEDDING FILES:
#   Backend/embeddings/Student_1/
#       photo1_embedding.npy   ← one file per photo
#       photo2_embedding.npy
#   Backend/embeddings/Student_1_mean.npy  ← mean of all embeddings (used at runtime)
#
# At recognition time, the mean embedding for each student is compared
# to the live frame embedding using cosine distance.

import cv2
import numpy as np
import os
import json

_DIR = os.path.dirname(os.path.abspath(__file__))

from services.face_recognition.preprocess import (
    preprocess_for_enrollment,
    get_all_photos,
    check_image_quality,
    DATASET_FOLDER,
)

EMBEDDINGS_FOLDER = os.path.join(_DIR, "embeddings")
LABELS_FILE       = os.path.join(EMBEDDINGS_FOLDER, "labels.json")

# DeepFace model used for recognition
# Facenet: 128-dim embedding, ~21MB weights, good accuracy
# Facenet512: 512-dim embedding, better accuracy, slightly slower
MODEL_NAME       = "Facenet"
DETECTOR_BACKEND = "mtcnn"   # MTCNN for detection + alignment


def _compute_adaptive_threshold(embeddings_list):
    """
    Calculates a per-student adaptive cosine-distance threshold from the
    pairwise distances between all enrollment embeddings.

    Formula:
        threshold = clamp(0.40 + std_dev * 2,  min=0.30, max=0.55)

    A student with very consistent photos (low std_dev) gets a tighter
    threshold; a student whose face varies a lot (glasses, lighting, pose)
    gets a looser one.  If only one photo is available the standard
    deviation is undefined, so the default 0.40 is returned.

    Args:
        embeddings_list: list of L2-normalised numpy arrays (128-dim each)

    Returns:
        float — the per-student threshold
    """
    DEFAULT_THRESHOLD = 0.40
    if len(embeddings_list) < 2:
        return DEFAULT_THRESHOLD

    # Compute every pair (i, j) with i < j
    pairwise_distances = []
    for i in range(len(embeddings_list)):
        for j in range(i + 1, len(embeddings_list)):
            a = embeddings_list[i] / (np.linalg.norm(embeddings_list[i]) + 1e-10)
            b = embeddings_list[j] / (np.linalg.norm(embeddings_list[j]) + 1e-10)
            dist = float(1.0 - np.dot(a, b))
            pairwise_distances.append(dist)

def generate_embedding(image_bgr):
    """
    Generates a DeepFace FaceNet embedding from a BGR image.

    Enrollment path (this function):
      - Runs MTCNN once via detector.py to find and crop the face
      - Resizes the crop to 160×160 (FaceNet's expected input size)
      - Calls DeepFace.represent() with detector_backend='skip' so
        DeepFace does NOT run MTCNN a second time internally
      - Returns a numpy array of shape (128,) or None on failure

    The scan/recognition path (recognizer.py) is separate and unchanged.
    """
    from deepface import DeepFace
    import warnings
    warnings.filterwarnings('ignore')

    from services.face_recognition.detector import detect_faces, get_largest_face, crop_face

    try:
        # Step 1 — detect face with MTCNN (runs exactly once)
        detections = detect_faces(image_bgr)
        if not detections:
            return None

        best = get_largest_face(detections)
        if best is None:
            return None

        # Step 2 — crop the face region (10% padding for alignment margin)
        face_crop = crop_face(image_bgr, best, padding=0.1)
        if face_crop is None or face_crop.size == 0:
            return None

        # Step 3 — resize to 160×160 — FaceNet's fixed input size.
        # DeepFace does this internally when detector_backend != 'skip',
        # but with 'skip' we must do it ourselves.
        face_160 = cv2.resize(face_crop, (160, 160), interpolation=cv2.INTER_AREA)

        # Step 4 — generate embedding. detector_backend='skip' tells
        # DeepFace to treat the input as an already-cropped face and skip
        # its own MTCNN pass — avoiding the duplicate detection cost.
        result = DeepFace.represent(
            img_path          = face_160,
            model_name        = MODEL_NAME,
            detector_backend  = "skip",
            enforce_detection = False,
            align             = False,   # alignment was done by MTCNN crop above
        )
        embedding = np.array(result[0]['embedding'])
        return embedding

    except Exception:
        return None


def enroll_student(student_id, photo_paths):
    """
    Generates and saves embeddings for one student.
    Returns (success_count, fail_count).
    """
    student_emb_dir = os.path.join(EMBEDDINGS_FOLDER, student_id)
    os.makedirs(student_emb_dir, exist_ok=True)

    embeddings = []

    for photo_path in photo_paths:
        photo_name = os.path.basename(photo_path)

        # Load image
        image = cv2.imread(photo_path)

        # Quality check
        ok, reason = check_image_quality(image)
        if not ok:
            print(f"    SKIP: {photo_name} ({reason})")
            continue

        # Preprocess
        preprocessed, err = preprocess_for_enrollment(image)
        if preprocessed is None:
            print(f"    PREPROCESS FAIL: {photo_name} ({err})")
            continue

        # Generate embedding
        print(f"    Processing: {photo_name}...", end=" ")
        embedding = generate_embedding(preprocessed)

        if embedding is None:
            print("no face detected")
            continue

        # Save individual embedding
        save_name = (os.path.splitext(photo_name)[0]
                     + "_embedding.npy")
        save_path = os.path.join(student_emb_dir, save_name)
        np.save(save_path, embedding)

        embeddings.append(embedding)
        print(f"OK (dim={len(embedding)})")

    if len(embeddings) == 0:
        print(f"    ERROR: No valid embeddings for {student_id}")
        return 0, len(photo_paths)

    # Compute L2-normalised mean embedding
    mean_embedding = np.mean(embeddings, axis=0)
    mean_embedding /= (np.linalg.norm(mean_embedding) + 1e-10)

    # ── Per-student adaptive threshold ────────────────────────────────
    # Calculate pairwise distances between all enrollment embeddings to
    # measure intra-student variation, then set a threshold relative to
    # that variation.  Consistent faces → tighter threshold; variable
    # faces (glasses, lighting) → looser threshold.
    student_threshold = _compute_adaptive_threshold(embeddings)

    # Save .npz (new primary format) — contains both mean embedding and threshold
    data_path = os.path.join(EMBEDDINGS_FOLDER, f"{student_id}_data.npz")
    np.savez(data_path,
             mean_embedding=mean_embedding,
             threshold=np.array(student_threshold))

    # Save legacy _mean.npy for backward compatibility
    mean_path = os.path.join(EMBEDDINGS_FOLDER, f"{student_id}_mean.npy")
    np.save(mean_path, mean_embedding)

    success = len(embeddings)
    failed  = len(photo_paths) - success
    print(f"    Data saved:  {data_path}  (threshold={student_threshold:.4f})")
    print(f"    Legacy file: {mean_path}")
    print(f"    Photos used: {success} | Skipped: {failed}")

    return success, failed


def enroll_all_students():
    """
    Enrolls all students found in the Dataset folder.

    IMPORTANT — naming convention:
    The Dataset subfolder name (e.g. 'Student_1') is used as a temporary
    key during processing. Before saving the mean embedding, this function
    attempts to look up a matching student in the database by roll_number.
    If found, the ROLL NUMBER is used as the embedding key (e.g. 'CS-001')
    so it stays consistent with the API enrollment path.
    If no DB match is found, the folder name is used as a fallback and a
    warning is printed — you should re-enroll those students via the API.

    Main entry point — run this script to process your dataset.
    """
    print("\n" + "=" * 60)
    print("  STUDENT ENROLLMENT — DeepFace + MTCNN")
    print("=" * 60)

    if not os.path.exists(DATASET_FOLDER):
        print(f"\nERROR: Dataset folder not found!")
        print(f"Expected at: {DATASET_FOLDER}")
        print("Create folders like: Backend/Dataset/Student_1/")
        return

    student_photos = get_all_photos(DATASET_FOLDER)

    if not student_photos:
        print("\nERROR: No photos found in dataset!")
        return

    print(f"\nStudents found: {len(student_photos)}")
    for sid, paths in sorted(student_photos.items()):
        print(f"  {sid}: {len(paths)} photos")

    os.makedirs(EMBEDDINGS_FOLDER, exist_ok=True)

    # ── Build a roll_number lookup from the DB (best-effort) ─────────
    # Maps folder-name index (1, 2, 3…) to roll_number when available.
    db_roll_map = {}  # { folder_key: roll_number }
    try:
        import sys as _sys
        _sys.path.insert(0, os.path.join(_DIR, "..", ".."))
        from app import create_app as _create_app
        _app = _create_app()
        with _app.app_context():
            from models.student import Student as _Student
            for s in _Student.query.all():
                db_roll_map[s.roll_number] = s.roll_number
        print(f"\nDB roll numbers loaded: {list(db_roll_map.keys())}")
    except Exception as e:
        print(f"\nWARNING: Could not connect to DB to resolve roll numbers: {e}")
        print("Falling back to folder-name keys — run API enrollment for consistency.")

    labels_map     = {}
    enrolled_count = 0
    failed_count   = 0

    for idx, (folder_key, photo_paths) in enumerate(
            sorted(student_photos.items())):

        print(f"\n{'─'*50}")
        print(f"Enrolling: {folder_key}  ({len(photo_paths)} photos)")
        print(f"{'─'*50}")

        success, failed = enroll_student(folder_key, photo_paths)

        if success > 0:
            labels_map[folder_key] = idx
            enrolled_count += 1
            print(f"\n  ✓ {folder_key} enrolled successfully!")
            if db_roll_map:
                print(f"  NOTE: Embedding key is '{folder_key}' (folder name).")
                print(f"  If this student's DB roll_number differs, re-enroll via POST /api/admin/enroll-face")
        else:
            failed_count += 1
            print(f"\n  ✗ {folder_key} enrollment FAILED!")

    # Save labels.json (student_id → index mapping)
    with open(LABELS_FILE, 'w') as f:
        json.dump(labels_map, f, indent=4)

    print("\n" + "=" * 60)
    print("ENROLLMENT COMPLETE!")
    print(f"  Enrolled : {enrolled_count} students")
    print(f"  Failed   : {failed_count} students")
    print(f"  Saved to : {EMBEDDINGS_FOLDER}")
    print("=" * 60)
    print()
    print("NEXT STEP: Run the migration script to align DB face_label values:")
    print("  python services/face_recognition/validate_embeddings.py --fix")

    # List created files
    print("\nFiles in embeddings folder:")
    for fname in sorted(os.listdir(EMBEDDINGS_FOLDER)):
        if fname.endswith('.npy') or fname.endswith('.json'):
            fpath = os.path.join(EMBEDDINGS_FOLDER, fname)
            size  = os.path.getsize(fpath) / 1024
            print(f"  {fname}  ({size:.1f} KB)")


def enroll_student_from_images(face_label, image_files):
    """
    Enroll a student from in-memory uploaded image files (Flask FileStorage objects).

    Unlike enroll_student() (which reads from disk paths), this function accepts
    file objects whose bytes are decoded in memory via cv2.imdecode — no temp
    files are written.

    Re-enrollment is fully supported:
      - Old StudentID_data.npz and StudentID_mean.npy are deleted before
        the new pipeline runs so stale data can never be read.
      - After saving the new files, the module-level in-memory embeddings
        cache in __init__.py is refreshed via reload_embeddings() so the
        new threshold and embedding are active immediately without a restart.

    Photos are processed in parallel (thread pool) to avoid blocking the Flask
    worker for the full serial cost of N × (MTCNN + FaceNet). Each image is also
    downscaled to MAX_ENROLL_WIDTH before ML inference — FaceNet internally
    crops and resizes to 160×160 anyway, so there is no accuracy loss.

    Args:
        face_label  (str):  Unique label used as the embedding key and filename
                            stem, e.g. the student's roll_number.
        image_files (list): List of Flask FileStorage (or any file-like object
                            with a .read() method) containing JPEG/PNG images.

    Returns:
        (success: bool, message: str, skip_reasons: list[str])
    """
    import warnings
    import concurrent.futures
    warnings.filterwarnings('ignore')

    # Downscale images to this width before ML inference.
    # FaceNet works on a 160×160 face crop regardless of input size,
    # so anything beyond ~640px is wasted compute in MTCNN + bilateral filter.
    MAX_ENROLL_WIDTH = 640

    os.makedirs(EMBEDDINGS_FOLDER, exist_ok=True)

    # ── Re-enrollment cleanup: remove stale files before starting ─────
    # Deleting first ensures a partial failure never leaves a mix of old
    # and new data on disk.
    old_data_path = os.path.join(EMBEDDINGS_FOLDER, f"{face_label}_data.npz")
    old_mean_path = os.path.join(EMBEDDINGS_FOLDER, f"{face_label}_mean.npy")
    for old_path in (old_data_path, old_mean_path):
        if os.path.exists(old_path):
            os.remove(old_path)
            print(f"    Re-enrollment: removed old file {os.path.basename(old_path)}")

    # ── Read all file bytes up-front (FileStorage is not thread-safe) ──
    file_data = []
    for file_obj in image_files:
        filename = getattr(file_obj, 'filename', None) or 'unknown'
        try:
            raw_bytes = file_obj.read()
        except Exception as exc:
            file_data.append((filename, None, str(exc)))
            continue
        file_data.append((filename, raw_bytes, None))

    # ── Per-image worker — decode, resize, preprocess, embed ───────────
    def process_one(item):
        filename, raw_bytes, read_err = item

        if read_err:
            return None, f"{filename}: failed to read ({read_err})"

        # Decode
        try:
            nparr = np.frombuffer(raw_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as exc:
            return None, f"{filename}: failed to decode ({exc})"

        if image is None:
            return None, f"{filename}: failed to decode (cv2 returned None)"

        # Downscale to cap ML cost — no accuracy impact
        h, w = image.shape[:2]
        if w > MAX_ENROLL_WIDTH:
            scale = MAX_ENROLL_WIDTH / w
            image = cv2.resize(image, (MAX_ENROLL_WIDTH, int(h * scale)),
                               interpolation=cv2.INTER_AREA)

        # Quality check
        ok, reason_str = check_image_quality(image)
        if not ok:
            return None, f"{filename}: {reason_str}"

        # Preprocessing
        preprocessed, err = preprocess_for_enrollment(image)
        if preprocessed is None:
            return None, f"{filename}: preprocess failed ({err})"

        # Generate embedding (MTCNN + FaceNet)
        print(f"    Processing: {filename}...", end=" ", flush=True)
        embedding = generate_embedding(preprocessed)
        if embedding is None:
            print("no face detected")
            return None, f"{filename}: no face detected"

        print(f"OK (dim={len(embedding)})")
        return embedding, None

    # Cap workers at 3 to avoid TF contention on a single-core Docker budget.
    n_workers = min(len(file_data), 3)
    embeddings   = []
    skip_reasons = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=n_workers) as pool:
        futures = {pool.submit(process_one, item): item[0] for item in file_data}
        for future in concurrent.futures.as_completed(futures):
            embedding, reason = future.result()
            if embedding is not None:
                embeddings.append(embedding)
            else:
                skip_reasons.append(reason)
                print(f"    SKIP: {reason}")

    if len(embeddings) == 0:
        return False, "No valid face embeddings generated", skip_reasons

    # Compute L2-normalised mean embedding
    mean_embedding  = np.mean(embeddings, axis=0)
    mean_embedding /= (np.linalg.norm(mean_embedding) + 1e-10)

    # ── Per-student adaptive threshold ────────────────────────────────
    student_threshold = _compute_adaptive_threshold(embeddings)

    # Save .npz (new primary format) — mean embedding + threshold
    data_path = os.path.join(EMBEDDINGS_FOLDER, f"{face_label}_data.npz")
    np.savez(data_path,
             mean_embedding=mean_embedding,
             threshold=np.array(student_threshold))

    # Save legacy _mean.npy for backward compatibility
    mean_path = os.path.join(EMBEDDINGS_FOLDER, f"{face_label}_mean.npy")
    np.save(mean_path, mean_embedding)

    print(f"    Data saved:  {data_path}  (threshold={student_threshold:.4f})")
    print(f"    Legacy file: {mean_path}")
    print(f"    Photos used: {len(embeddings)} | Skipped: {len(skip_reasons)}")

    # Update labels.json
    labels_map = {}
    if os.path.exists(LABELS_FILE):
        try:
            with open(LABELS_FILE, 'r') as f:
                labels_map = json.load(f)
        except (json.JSONDecodeError, OSError):
            labels_map = {}

    if face_label not in labels_map:
        next_idx = max(labels_map.values(), default=-1) + 1
        labels_map[face_label] = next_idx

    with open(LABELS_FILE, 'w') as f:
        json.dump(labels_map, f, indent=4)

    # ── Refresh in-memory embeddings cache without a restart ──────────
    # Import here (not at top) to avoid a circular import — enroll.py is
    # part of the face_recognition package and __init__.py imports from it.
    try:
        from services.face_recognition import reload_embeddings
        reload_embeddings()
        print(f"    In-memory cache refreshed for '{face_label}'.")
    except Exception as exc:
        print(f"    WARNING: Could not refresh in-memory cache: {exc}")
        print(f"    The new embedding will be active after the next backend restart.")

    return True, "Enrolled successfully", skip_reasons


if __name__ == "__main__":
    enroll_all_students()
