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

# ── CHANGE #7: Ensemble Model Configuration ──────────────────────────────
# Two independent models for recognition - both must agree for a match.
# Different training approaches mean they make different mistakes, so a face
# that tricks one model rarely tricks both.
#
# FaceNet512: Trained with triplet loss (anchor-positive-negative)
# ArcFace:    Trained with angular margin loss (arc cosine separation)
#
# Both models produce 512-dimensional embeddings.
MODEL_FACENET = "Facenet512"
MODEL_ARCFACE = "ArcFace"
DETECTOR_BACKEND = "mtcnn"   # MTCNN for detection + alignment


def _compute_adaptive_threshold(embeddings_list, all_other_embeddings=None):
    """
    Calculates a per-student adaptive cosine-distance threshold from BOTH:
    1. Intra-class variance (pairwise distances between this student's photos)
    2. Inter-class distances (distances to other enrolled students)
    
    CHANGE #8: Now considers how similar the student looks to classmates.
    
    Formula (when other students available):
        max_intra = mean_intra + 2 * std_dev (upper bound of student's variance)
        min_inter = minimum distance to any other student
        threshold = (max_intra + min_inter) / 2.0
        threshold = clamp(threshold, min=0.25, max=0.60)
    
    Formula (when no other students or backward compat):
        threshold = clamp(0.40 + std_dev * 2, min=0.30, max=0.55)
    
    Examples:
    - Student with consistent photos (max_intra=0.15) and distant classmates (min_inter=0.70):
      → threshold = (0.15 + 0.70) / 2 = 0.425 (loose, plenty of margin)
    
    - Student with consistent photos (max_intra=0.15) and twin sibling (min_inter=0.35):
      → threshold = (0.15 + 0.35) / 2 = 0.25 (tight, must be precise)
    
    - Student with variable photos (max_intra=0.30) and distant classmates (min_inter=0.80):
      → threshold = (0.30 + 0.80) / 2 = 0.55 (loose, distinctive despite variance)

    Args:
        embeddings_list: list of L2-normalised numpy arrays (512-dim each)
        all_other_embeddings: list of lists of embeddings from other students
                             (optional, enables inter-class calculation)

    Returns:
        float — the per-student threshold
    """
    DEFAULT_THRESHOLD = 0.40
    
    if len(embeddings_list) < 2:
        return DEFAULT_THRESHOLD

    # ── Intra-class variance (how spread out this student's photos are) ──
    pairwise_distances = []
    for i in range(len(embeddings_list)):
        for j in range(i + 1, len(embeddings_list)):
            a = embeddings_list[i] / (np.linalg.norm(embeddings_list[i]) + 1e-10)
            b = embeddings_list[j] / (np.linalg.norm(embeddings_list[j]) + 1e-10)
            dist = float(1.0 - np.dot(a, b))
            pairwise_distances.append(dist)

    mean_intra = float(np.mean(pairwise_distances))
    std_dev = float(np.std(pairwise_distances))
    max_intra = mean_intra + 2 * std_dev  # Upper bound of this student's variance
    
    # ── Inter-class distances (how far away other students are) ──
    # CHANGE #8: Consider similarity to classmates when setting threshold
    if all_other_embeddings and len(all_other_embeddings) > 0:
        min_inter = float('inf')
        
        for my_emb in embeddings_list:
            my_emb_norm = my_emb / (np.linalg.norm(my_emb) + 1e-10)
            
            for other_student_embeddings in all_other_embeddings:
                for other_emb in other_student_embeddings:
                    other_emb_norm = other_emb / (np.linalg.norm(other_emb) + 1e-10)
                    dist = float(1.0 - np.dot(my_emb_norm, other_emb_norm))
                    if dist < min_inter:
                        min_inter = dist
        
        # Set threshold at midpoint between max intra-class and min inter-class
        # This balances: tight enough to reject similar-looking others,
        # loose enough to accept this student's natural variance
        threshold = (max_intra + min_inter) / 2.0
        
        # Clamp to safe bounds (wider range than old formula)
        threshold = float(max(0.25, min(0.60, threshold)))
        
        return threshold
    
    else:
        # No other students yet - fall back to intra-class only (old formula)
        raw = DEFAULT_THRESHOLD + std_dev * 2
        return float(max(0.30, min(0.55, raw)))

def generate_embedding(image_bgr):
    """
    Generates face embeddings from BOTH models (FaceNet512 and ArcFace).
    
    CHANGE #7 (Ensemble): Returns embeddings from two independent models
    trained with different loss functions. Both embeddings are stored and
    both must agree during recognition for a match.

    Enrollment path (this function):
      - Runs MTCNN once via detector.py to find and crop the face
      - Aligns the face by rotating it so eyes are horizontal (corrects head tilt)
      - Resizes the crop to 160×160 (FaceNet's expected input size)
      - Calls DeepFace.represent() TWICE (once per model) with detector_backend='skip'
      - Returns tuple of (facenet_embedding, arcface_embedding) or (None, None) on failure

    Uses FaceNet512 (triplet loss) and ArcFace (angular margin loss) which
    produce 512-dimensional embeddings. Different training approaches mean
    they make different kinds of mistakes - a face that fools one rarely fools both.

    The scan/recognition path (recognizer.py) uses the same alignment pipeline.
    
    Returns:
        tuple: (facenet_embedding, arcface_embedding) as numpy arrays (512,) each
               or (None, None) if processing fails
    """
    from deepface import DeepFace
    import warnings
    warnings.filterwarnings('ignore')

    from services.face_recognition.detector import detect_faces, get_largest_face, crop_face, align_face

    try:
        # Step 1 — detect face with MTCNN (runs exactly once)
        detections = detect_faces(image_bgr)
        if not detections:
            return None, None

        best = get_largest_face(detections)
        if best is None:
            return None, None

        # Step 2 — crop the face region (10% padding for alignment margin)
        face_crop = crop_face(image_bgr, best, padding=0.1)
        if face_crop is None or face_crop.size == 0:
            return None, None

        # Step 3 — align the face so eyes are horizontal (corrects head tilt)
        face_aligned = align_face(face_crop, best.get('keypoints', {}))
        if face_aligned is None or face_aligned.size == 0:
            return None, None

        # Step 4 — resize to 160×160 — FaceNet's fixed input size
        face_160 = cv2.resize(face_aligned, (160, 160), interpolation=cv2.INTER_AREA)

        # Step 5a — generate FaceNet512 embedding
        result_facenet = DeepFace.represent(
            img_path          = face_160,
            model_name        = MODEL_FACENET,
            detector_backend  = "skip",
            enforce_detection = False,
            align             = False,   # alignment was manually done in Step 3
        )
        embedding_facenet = np.array(result_facenet[0]['embedding'])
        
        # Step 5b — generate ArcFace embedding (same preprocessed face)
        result_arcface = DeepFace.represent(
            img_path          = face_160,
            model_name        = MODEL_ARCFACE,
            detector_backend  = "skip",
            enforce_detection = False,
            align             = False,
        )
        embedding_arcface = np.array(result_arcface[0]['embedding'])
        
        return embedding_facenet, embedding_arcface

    except Exception as e:
        print(f"    Embedding generation error: {e}")
        return None, None


def enroll_student(student_id, photo_paths):
    """
    Generates and saves embeddings for one student using BOTH models.
    Returns (success_count, fail_count).
    
    CHANGE #7: Each photo generates TWO embeddings (FaceNet512 + ArcFace).
    Both are saved separately for ensemble recognition.
    """
    student_emb_dir = os.path.join(EMBEDDINGS_FOLDER, student_id)
    os.makedirs(student_emb_dir, exist_ok=True)

    embeddings_facenet = []
    embeddings_arcface = []

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

        # Generate BOTH embeddings
        print(f"    Processing: {photo_name}...", end=" ")
        emb_facenet, emb_arcface = generate_embedding(preprocessed)

        if emb_facenet is None or emb_arcface is None:
            print("no face detected or embedding failed")
            continue

        embeddings_facenet.append(emb_facenet)
        embeddings_arcface.append(emb_arcface)
        print(f"OK (FaceNet: {len(emb_facenet)}dim, ArcFace: {len(emb_arcface)}dim)")

    if len(embeddings_facenet) == 0:
        print(f"    ERROR: No valid embeddings for {student_id}")
        return 0, len(photo_paths)

    # ── Load other students' embeddings for inter-class threshold calculation ──
    # CHANGE #8: Consider similarity to classmates when setting threshold
    other_students_facenet = []
    other_students_arcface = []
    
    try:
        for fname in os.listdir(EMBEDDINGS_FOLDER):
            if fname.endswith('_data.npz') and not fname.startswith(student_id):
                other_path = os.path.join(EMBEDDINGS_FOLDER, fname)
                other_data = np.load(other_path, allow_pickle=False)
                
                # Try to load embeddings from other students
                if 'embeddings_facenet' in other_data:
                    other_students_facenet.append(list(other_data['embeddings_facenet']))
                    if 'embeddings_arcface' in other_data:
                        other_students_arcface.append(list(other_data['embeddings_arcface']))
                elif 'embeddings' in other_data:
                    # Single model format - use for FaceNet comparison
                    other_students_facenet.append(list(other_data['embeddings']))
    except Exception as e:
        print(f"    Warning: Could not load other students for threshold calc: {e}")
        # Continue with intra-class only threshold
    
    # ── Per-student adaptive thresholds (with inter-class consideration) ──
    threshold_facenet = _compute_adaptive_threshold(embeddings_facenet, other_students_facenet if other_students_facenet else None)
    threshold_arcface = _compute_adaptive_threshold(embeddings_arcface, other_students_arcface if other_students_arcface else None)

    # ── Save ALL individual embeddings from BOTH models ──────────────────
    embeddings_array_facenet = np.array(embeddings_facenet)  # Shape: (N, 512)
    embeddings_array_arcface = np.array(embeddings_arcface)  # Shape: (N, 512)

    # Save .npz (primary format) — contains embeddings + thresholds for BOTH models
    data_path = os.path.join(EMBEDDINGS_FOLDER, f"{student_id}_data.npz")
    np.savez(data_path,
             embeddings_facenet=embeddings_array_facenet,
             embeddings_arcface=embeddings_array_arcface,
             threshold_facenet=np.array(threshold_facenet),
             threshold_arcface=np.array(threshold_arcface))

    # Save legacy _mean.npy for backward compatibility (FaceNet mean only)
    mean_embedding_facenet = np.mean(embeddings_facenet, axis=0)
    mean_embedding_facenet /= (np.linalg.norm(mean_embedding_facenet) + 1e-10)
    mean_path = os.path.join(EMBEDDINGS_FOLDER, f"{student_id}_mean.npy")
    np.save(mean_path, mean_embedding_facenet)

    success = len(embeddings_facenet)
    failed  = len(photo_paths) - success
    print(f"    Data saved:  {data_path}")
    print(f"      FaceNet512: {len(embeddings_facenet)} embeddings, threshold={threshold_facenet:.4f}")
    print(f"      ArcFace:    {len(embeddings_arcface)} embeddings, threshold={threshold_arcface:.4f}")
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
    print("  STUDENT ENROLLMENT — FaceNet512 + MTCNN")
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

        # Generate BOTH embeddings (MTCNN + FaceNet512 + ArcFace)
        print(f"    Processing: {filename}...", end=" ", flush=True)
        emb_facenet, emb_arcface = generate_embedding(preprocessed)
        if emb_facenet is None or emb_arcface is None:
            print("no face detected or embedding failed")
            return None, f"{filename}: no face detected or embedding generation failed"

        print(f"OK (FaceNet: {len(emb_facenet)}dim, ArcFace: {len(emb_arcface)}dim)")
        return (emb_facenet, emb_arcface), None

    # Cap workers at 3 to avoid TF contention on a single-core Docker budget.
    n_workers = min(len(file_data), 3)
    embeddings_facenet = []
    embeddings_arcface = []
    skip_reasons = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=n_workers) as pool:
        futures = {pool.submit(process_one, item): item[0] for item in file_data}
        for future in concurrent.futures.as_completed(futures):
            result, reason = future.result()
            if result is not None:
                emb_facenet, emb_arcface = result
                embeddings_facenet.append(emb_facenet)
                embeddings_arcface.append(emb_arcface)
            else:
                skip_reasons.append(reason)
                print(f"    SKIP: {reason}")

    if len(embeddings_facenet) == 0:
        return False, "No valid face embeddings generated", skip_reasons

    # ── Load other students' embeddings for inter-class threshold calculation ──
    # CHANGE #8: Consider similarity to classmates when setting threshold
    other_students_facenet = []
    other_students_arcface = []
    
    try:
        for fname in os.listdir(EMBEDDINGS_FOLDER):
            if fname.endswith('_data.npz') and not fname.startswith(face_label):
                other_path = os.path.join(EMBEDDINGS_FOLDER, fname)
                other_data = np.load(other_path, allow_pickle=False)
                
                # Try to load embeddings from other students
                if 'embeddings_facenet' in other_data:
                    other_students_facenet.append(list(other_data['embeddings_facenet']))
                    if 'embeddings_arcface' in other_data:
                        other_students_arcface.append(list(other_data['embeddings_arcface']))
                elif 'embeddings' in other_data:
                    # Single model format - use for FaceNet comparison
                    other_students_facenet.append(list(other_data['embeddings']))
    except Exception as e:
        print(f"    Warning: Could not load other students for threshold calc: {e}")
        # Continue with intra-class only threshold

    # ── Per-student adaptive thresholds (with inter-class consideration) ──
    threshold_facenet = _compute_adaptive_threshold(embeddings_facenet, other_students_facenet if other_students_facenet else None)
    threshold_arcface = _compute_adaptive_threshold(embeddings_arcface, other_students_arcface if other_students_arcface else None)

    # ── Save ALL individual embeddings from BOTH models ──────────────────
    embeddings_array_facenet = np.array(embeddings_facenet)  # Shape: (N, 512)
    embeddings_array_arcface = np.array(embeddings_arcface)  # Shape: (N, 512)

    # Save .npz (primary format) — embeddings + thresholds for BOTH models
    data_path = os.path.join(EMBEDDINGS_FOLDER, f"{face_label}_data.npz")
    np.savez(data_path,
             embeddings_facenet=embeddings_array_facenet,
             embeddings_arcface=embeddings_array_arcface,
             threshold_facenet=np.array(threshold_facenet),
             threshold_arcface=np.array(threshold_arcface))

    # Save legacy _mean.npy for backward compatibility (FaceNet mean only)
    mean_embedding_facenet  = np.mean(embeddings_facenet, axis=0)
    mean_embedding_facenet /= (np.linalg.norm(mean_embedding_facenet) + 1e-10)
    mean_path = os.path.join(EMBEDDINGS_FOLDER, f"{face_label}_mean.npy")
    np.save(mean_path, mean_embedding_facenet)

    print(f"    Data saved:  {data_path}")
    print(f"      FaceNet512: {len(embeddings_facenet)} embeddings, threshold={threshold_facenet:.4f}")
    print(f"      ArcFace:    {len(embeddings_arcface)} embeddings, threshold={threshold_arcface:.4f}")
    print(f"    Legacy file: {mean_path}")
    print(f"    Photos used: {len(embeddings_facenet)} | Skipped: {len(skip_reasons)}")

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
