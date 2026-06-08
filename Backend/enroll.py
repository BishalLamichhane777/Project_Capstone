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
import importlib.util

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

def _load_local_preprocess():
    preprocess_path = os.path.join(BACKEND_DIR, "preprocess.py")
    if not os.path.exists(preprocess_path):
        raise FileNotFoundError(
            f"Could not locate preprocess.py at {preprocess_path}"
        )

    spec = importlib.util.spec_from_file_location(
        "preprocess", preprocess_path
    )
    if spec is None or spec.loader is None:
        raise ImportError(
            f"Unable to load preprocess module from {preprocess_path}"
        )

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

_preprocess = _load_local_preprocess()
preprocess_for_enrollment = _preprocess.preprocess_for_enrollment
get_all_photos = _preprocess.get_all_photos
check_image_quality = _preprocess.check_image_quality
DATASET_FOLDER = _preprocess.DATASET_FOLDER

EMBEDDINGS_FOLDER = os.path.join(BACKEND_DIR, "embeddings")
LABELS_FILE       = os.path.join(EMBEDDINGS_FOLDER, "labels.json")

# DeepFace model used for recognition
# Facenet: 128-dim embedding, ~21MB weights, good accuracy
# Facenet512: 512-dim embedding, better accuracy, slightly slower
MODEL_NAME       = "Facenet"
DETECTOR_BACKEND = "mtcnn"   # MTCNN for detection + alignment


def generate_embedding(image_bgr):
    """
    Generates a DeepFace face embedding from a BGR image.
    Returns a numpy array of shape (128,) or None on failure.

    DeepFace.represent() internally:
      1. Uses MTCNN to detect and align the face
      2. Resizes the aligned face to 160x160 (FaceNet input size)
      3. Passes it through the FaceNet CNN
      4. Returns the 128-dimensional embedding vector
    """
    from deepface import DeepFace
    import warnings
    warnings.filterwarnings('ignore')

    try:
        result = DeepFace.represent(
            img_path         = image_bgr,
            model_name       = MODEL_NAME,
            detector_backend = DETECTOR_BACKEND,
            enforce_detection= True,   # skip if no face found
            align            = True    # use landmarks for alignment
        )
        # result is a list of dicts, one per detected face
        # We take the first (largest/most confident) face
        embedding = np.array(result[0]['embedding'])
        return embedding

    except Exception as e:
        # Common reasons: no face detected, face too small
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

    # Compute and save the MEAN embedding
    # This single vector represents the student during live recognition
    # Using the mean of multiple photos makes it more robust to
    # lighting/pose variation than any single photo
    mean_embedding = np.mean(embeddings, axis=0)
    # L2-normalise so cosine distance calculation is consistent
    mean_embedding /= (np.linalg.norm(mean_embedding) + 1e-10)

    mean_path = os.path.join(EMBEDDINGS_FOLDER,
                             f"{student_id}_mean.npy")
    np.save(mean_path, mean_embedding)

    success = len(embeddings)
    failed  = len(photo_paths) - success
    print(f"    Mean embedding saved: {mean_path}")
    print(f"    Photos used: {success} | Skipped: {failed}")

    return success, failed


def enroll_all_students():
    """
    Enrolls all students found in the Dataset folder.
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

    labels_map     = {}
    enrolled_count = 0
    failed_count   = 0

    for idx, (student_id, photo_paths) in enumerate(
            sorted(student_photos.items())):

        print(f"\n{'─'*50}")
        print(f"Enrolling: {student_id}  "
              f"({len(photo_paths)} photos)")
        print(f"{'─'*50}")

        success, failed = enroll_student(student_id,
                                         photo_paths)

        if success > 0:
            labels_map[student_id] = idx
            enrolled_count += 1
            print(f"\n  ✓ {student_id} enrolled successfully!")
        else:
            failed_count += 1
            print(f"\n  ✗ {student_id} enrollment FAILED!")

    # Save labels.json (student_id → index mapping)
    with open(LABELS_FILE, 'w') as f:
        json.dump(labels_map, f, indent=4)

    print("\n" + "=" * 60)
    print("ENROLLMENT COMPLETE!")
    print(f"  Enrolled : {enrolled_count} students")
    print(f"  Failed   : {failed_count} students")
    print(f"  Saved to : {EMBEDDINGS_FOLDER}")
    print("=" * 60)

    # List created files
    print("\nFiles in embeddings folder:")
    for fname in sorted(os.listdir(EMBEDDINGS_FOLDER)):
        if fname.endswith('.npy') or fname.endswith('.json'):
            fpath = os.path.join(EMBEDDINGS_FOLDER, fname)
            size  = os.path.getsize(fpath) / 1024
            print(f"  {fname}  ({size:.1f} KB)")


if __name__ == "__main__":
    enroll_all_students()
