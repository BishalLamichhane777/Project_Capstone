# recognizer.py
# Face recognition using DeepFace (FaceNet) + MTCNN.
# Replaces the old LBPH-based recognizer.
#
# HOW RECOGNITION WORKS:
#
#   At enrollment:  one mean embedding (.npy) is saved per student
#   At recognition: live frame → MTCNN detects face → DeepFace generates
#                   embedding → compare with all stored embeddings using
#                   cosine distance → best match below threshold = recognized
#
# COSINE DISTANCE:
#   - Range: 0.0 (identical) to 2.0 (completely opposite)
#   - Same person from different photos: typically 0.05 – 0.35
#   - Different people:                 typically 0.50 – 1.50
#   - FaceNet threshold: 0.40 (verified by DeepFace authors)
#
# This is very different from LBPH confidence where LOWER meant more similar.
# Here, cosine distance is also LOWER = more similar (same intuition).

import cv2
import numpy as np
import os
import json
import sys

_DIR = os.path.dirname(os.path.abspath(__file__))

from services.face_recognition.detector import detect_faces, crop_face
from services.face_recognition.preprocess import preprocess_for_recognition

EMBEDDINGS_FOLDER = os.path.join(_DIR, "embeddings")
LABELS_FILE       = os.path.join(EMBEDDINGS_FOLDER, "labels.json")

MODEL_NAME       = "Facenet"
DETECTOR_BACKEND = "mtcnn"

# Cosine distance threshold
# score < 0.40 → recognized (same person)
# score ≥ 0.40 → unknown
COSINE_THRESHOLD = 0.40

# Cooldown in seconds to prevent duplicate events
COOLDOWN_SECONDS = 5


def cosine_distance(vec_a, vec_b):
    """
    Computes cosine distance between two embedding vectors.
    Returns a value between 0.0 (identical) and 2.0 (opposite).
    Lower = more similar.
    """
    a = vec_a / (np.linalg.norm(vec_a) + 1e-10)
    b = vec_b / (np.linalg.norm(vec_b) + 1e-10)
    return float(1.0 - np.dot(a, b))


def compute_confidence(distance: float, threshold: float) -> float:
    """Convert a cosine distance into a 0–100 display confidence score.

    Pure function — no I/O, no imports, no side effects.  Extracted so it
    can be unit-tested independently of the full recognition pipeline.

    Formula:
        confidence = max(0, (1 - distance / threshold) * 100)  rounded to 1 dp

    Examples:
        distance = 0.0          → 100.0  (perfect match)
        distance = threshold    → 0.0    (right at the boundary)
        distance > threshold    → 0.0    (unknown face — never negative)
        distance = threshold/2  → 50.0   (halfway)

    Args:
        distance:  cosine distance in [0, 2]
        threshold: per-student recognition threshold (e.g. 0.40)

    Returns:
        float in [0.0, 100.0]
    """
    return round(max(0.0, (1.0 - (distance / threshold)) * 100), 1)


def load_all_embeddings():
    """
    Loads ALL student data into memory.
    Called ONCE when the backend starts (replaces the old flat-array version).

    Lookup order per student:
      1. {student_id}_data.npz  — new format: mean_embedding + per-student threshold
      2. {student_id}_mean.npy  — legacy format: mean_embedding only (threshold → 0.40)

    Returns:
        dict: {
            "Student_1": {"embedding": np.array(128,), "threshold": 0.35},
            "Student_2": {"embedding": np.array(128,), "threshold": 0.40},
            ...
        }
    """
    embeddings = {}

    if not os.path.exists(EMBEDDINGS_FOLDER):
        print("ERROR: Embeddings folder not found!")
        print(f"Path: {EMBEDDINGS_FOLDER}")
        print("Run enroll.py first!")
        return embeddings

    # Load labels map (best-effort — only used for console logging here)
    if os.path.exists(LABELS_FILE):
        with open(LABELS_FILE, 'r') as f:
            labels_map = json.load(f)
        print(f"Labels loaded: {list(labels_map.keys())}")
    else:
        print("WARNING: labels.json not found!")
        labels_map = {}

    # Collect all student IDs present in the folder.
    # A student may have a .npz, a _mean.npy, or both.
    student_ids = set()
    for fname in os.listdir(EMBEDDINGS_FOLDER):
        if fname.endswith('_data.npz'):
            student_ids.add(fname[:-9])          # strip '_data.npz'
        elif fname.endswith('_mean.npy'):
            student_ids.add(fname[:-9])          # strip '_mean.npy'

    for student_id in sorted(student_ids):
        npz_path  = os.path.join(EMBEDDINGS_FOLDER, f"{student_id}_data.npz")
        npy_path  = os.path.join(EMBEDDINGS_FOLDER, f"{student_id}_mean.npy")

        if os.path.exists(npz_path):
            # New format — has per-student threshold
            data      = np.load(npz_path, allow_pickle=False)
            embedding = data["mean_embedding"]
            threshold = float(data["threshold"])
            source    = "npz"
        elif os.path.exists(npy_path):
            # Legacy format — fall back to global default threshold
            embedding = np.load(npy_path)
            threshold = COSINE_THRESHOLD
            source    = "npy (legacy)"
        else:
            continue   # file disappeared between listing and loading

        embeddings[student_id] = {
            "embedding" : embedding,
            "threshold" : threshold,
        }
        print(f"Loaded: {student_id}  "
              f"dim={len(embedding)}  threshold={threshold:.4f}  [{source}]")

    if not embeddings:
        print("ERROR: No embeddings found! Run enroll.py first.")
    else:
        print(f"\nTotal students loaded: {len(embeddings)}")

    return embeddings


def get_face_embedding(face_bgr):
    """
    Generates a DeepFace embedding from a cropped face BGR image.
    Returns numpy array (128,) or None if it fails.
    """
    from deepface import DeepFace
    import warnings
    warnings.filterwarnings('ignore')

    try:
        result = DeepFace.represent(
            img_path         = face_bgr,
            model_name       = MODEL_NAME,
            detector_backend = "skip",
            enforce_detection= False,
            align            = False
        )
        embedding = np.array(result[0]['embedding'])
        # L2-normalise to match how we stored mean embeddings
        embedding /= (np.linalg.norm(embedding) + 1e-10)
        return embedding

    except Exception:
        return None


def recognize_face(frame_bgr, embeddings_dict):
    """
    MAIN RECOGNITION FUNCTION.
    Called for every camera frame during a live session.

    Pipeline (Report Section 3.2.1):
      Step 1: Preprocess frame
      Step 2: MTCNN face detection (all faces)
      Step 3: Loop every detected face; skip faces narrower than MIN_FACE_WIDTH
      Step 4: Generate DeepFace embedding per face
      Step 5: Compare with all student embeddings (cosine distance)
      Step 6: Apply threshold — collect all recognized hits into a list

    Returns list of dicts (one entry per recognized face):
        [
          {
            "status"     : "recognized",
            "student_id" : str,
            "distance"   : float,   ← cosine distance (lower = better)
            "confidence" : float,   ← 0-100 for display
            "face_coords": (x,y,w,h),
            "message"    : str
          },
          ...
        ]

    Returns an empty list when no face is detected or no face passes the
    threshold.  Returns [{"status": "error", ...}] on hard failures.
    """
    # Minimum bounding-box width to attempt recognition.
    # Faces narrower than this are too small / too far away to produce a
    # reliable FaceNet embedding — skip them rather than risk false matches.
    MIN_FACE_WIDTH = 60

    if not embeddings_dict:
        return [{
            "status"     : "error",
            "message"    : "No embeddings loaded",
            "student_id" : None,
            "distance"   : None,
            "confidence" : None,
            "face_coords": None,
        }]

    # Step 1: Preprocess frame
    preprocessed = preprocess_for_recognition(frame_bgr)

    # Step 2: Detect ALL faces with MTCNN
    detections = detect_faces(preprocessed)

    if not detections:
        return []   # caller interprets empty list as "no_face"

    recognized_results = []

    # Step 3: Loop every detected face
    for detection in detections:
        x, y, w, h = detection['box']

        # Skip faces that are too small to recognise reliably
        if w < MIN_FACE_WIDTH:
            continue

        # Step 4: Crop face and generate embedding
        face_crop = crop_face(preprocessed, detection, padding=0.1)
        embedding = get_face_embedding(face_crop)

        if embedding is None:
            # DeepFace couldn't process this crop — skip silently
            continue

        # Step 5: Compare against all student embeddings using per-student thresholds
        best_match     = None
        best_distance  = float('inf')
        best_threshold = COSINE_THRESHOLD  # fallback, replaced when a match is found

        for student_id, student_data in embeddings_dict.items():
            # Support both new dict format and legacy plain-array format
            if isinstance(student_data, dict):
                ref_embedding      = student_data["embedding"]
                student_threshold  = student_data["threshold"]
            else:
                ref_embedding      = student_data
                student_threshold  = COSINE_THRESHOLD

            dist = cosine_distance(embedding, ref_embedding)
            if dist < best_distance:
                best_distance  = dist
                best_match     = student_id
                best_threshold = student_threshold

        # ── Prompt 3D: confidence relative to per-student threshold ──
        # distance=0.0          → confidence=100%
        # distance=threshold    → confidence=0%
        # This makes the score mean the same thing for every student
        # regardless of how tight or loose their threshold is.
        display_confidence = compute_confidence(best_distance, best_threshold)

        # Step 6: Apply per-student threshold — only collect recognized hits
        if best_distance <= best_threshold:
            recognized_results.append({
                "status"     : "recognized",
                "student_id" : best_match,
                "distance"   : round(best_distance, 4),
                "confidence" : display_confidence,
                "face_coords": (x, y, w, h),
                "message"    : f"Recognized: {best_match}",
            })
        # Unknown faces are skipped silently

    return recognized_results


if __name__ == "__main__":
    print("=" * 55)
    print("  RECOGNITION TEST — DeepFace + MTCNN")
    print("=" * 55)

    print("\nLoading student embeddings...")
    embeddings = load_all_embeddings()

    if not embeddings:
        print("\nNo embeddings found!")
        print("Please run enroll.py first.")
        exit()

    print(f"\nThreshold : cosine distance < {COSINE_THRESHOLD}")
    print("Starting webcam recognition test...")
    print("Press Q to quit\n")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open webcam!")
        exit()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = recognize_face(frame, embeddings)
        display = frame.copy()

        if not results:
            cv2.putText(display,
                        "No face in frame",
                        (20, 45),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1, (0, 255, 255), 2)
        else:
            for idx, result in enumerate(results):
                status = result["status"]
                y_offset = 45 + idx * 80

                if status == "recognized":
                    sid        = result["student_id"]
                    conf       = result["confidence"]
                    dist       = result["distance"]
                    x, y, w, h = result["face_coords"]

                    # Green box = recognized
                    cv2.rectangle(display,
                                  (x, y), (x + w, y + h),
                                  (0, 255, 0), 2)
                    cv2.putText(display,
                                f"RECOGNIZED: {sid}",
                                (20, y_offset),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                0.8, (0, 255, 0), 2)
                    cv2.putText(display,
                                f"Confidence: {conf}%  dist: {dist}",
                                (20, y_offset + 30),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                0.55, (0, 255, 0), 2)

        cv2.imshow(
            "Recognition Test - Press Q to quit",
            display
        )

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Recognition test finished.")
