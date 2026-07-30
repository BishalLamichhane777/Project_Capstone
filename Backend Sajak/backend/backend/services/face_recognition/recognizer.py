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

# ── MODEL CONFIGURATION ──
# CHANGE #7: Ensemble recognition with two independent models.
# FaceNet512: Trained with triplet loss (anchor-positive-negative)
# ArcFace:    Trained with angular margin loss (arc cosine separation)
# Both must agree on student identity for recognition.
MODEL_FACENET = "Facenet512"
MODEL_ARCFACE = "ArcFace"
DETECTOR_BACKEND = "mtcnn"

# Cosine distance threshold (fallback for old single-model embeddings)
COSINE_THRESHOLD = 0.40

# ── CHANGE #6: Minimum confidence floor ──────────────────────────────────
# Reject matches below this confidence percentage even if distance passes.
# Prevents false positives from "barely below threshold" matches.
# Example: distance=0.39, threshold=0.40 → confidence=2.5% → REJECTED
MIN_CONFIDENCE_PERCENT = 40.0

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
    Called ONCE when the backend starts.

    Lookup order per student:
      1. {student_id}_data.npz with "embeddings_facenet" and "embeddings_arcface" keys
         — NEW format (Change #7 Ensemble): Arrays of embeddings from BOTH models
      2. {student_id}_data.npz with "embeddings" key — Format from Change #3:
         Contains array of embeddings (N×512) from single model + threshold
      3. {student_id}_data.npz with "mean_embedding" key — OLD format:
         Contains single mean embedding (512,) + threshold
      4. {student_id}_mean.npy — Legacy format: Single mean (512,), threshold → 0.40

    Returns:
        dict: {
            "Student_1": {
                "embeddings_facenet": np.array([[emb1], [emb2], ...]),  # Shape: (N, 512)
                "embeddings_arcface": np.array([[emb1], [emb2], ...]),  # Shape: (N, 512)
                "threshold_facenet": 0.35,
                "threshold_arcface": 0.38
            },
            ...
        }
        
    NOTE: For backward compatibility, old formats are supported but only use FaceNet.
    Full ensemble requires re-enrollment with both models.
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
            data = np.load(npz_path, allow_pickle=False)
            
            # Check format priority: ensemble > all photos > mean > legacy
            if "embeddings_facenet" in data and "embeddings_arcface" in data:
                # NEW ENSEMBLE format (Change #7): Both models' embeddings
                embeddings_facenet = data["embeddings_facenet"]
                embeddings_arcface = data["embeddings_arcface"]
                threshold_facenet = float(data["threshold_facenet"])
                threshold_arcface = float(data["threshold_arcface"])
                source = "npz (ensemble)"
                
                embeddings[student_id] = {
                    "embeddings_facenet": embeddings_facenet,
                    "embeddings_arcface": embeddings_arcface,
                    "threshold_facenet": threshold_facenet,
                    "threshold_arcface": threshold_arcface,
                }
                print(f"Loaded: {student_id}  "
                      f"FaceNet: {len(embeddings_facenet)} photos, threshold={threshold_facenet:.4f}  "
                      f"ArcFace: {len(embeddings_arcface)} photos, threshold={threshold_arcface:.4f}  [{source}]")
            
            elif "embeddings" in data:
                # Format from Change #3: Array of all embeddings (single model)
                embeddings_array = data["embeddings"]
                threshold = float(data["threshold"])
                source = "npz (all photos, single model)"
                
                embeddings[student_id] = {
                    "embeddings_facenet": embeddings_array,  # Only FaceNet available
                    "embeddings_arcface": None,  # No ArcFace - will skip ensemble
                    "threshold_facenet": threshold,
                    "threshold_arcface": None,
                }
                print(f"Loaded: {student_id}  "
                      f"photos={len(embeddings_array)}  dim={len(embeddings_array[0])}  "
                      f"threshold={threshold:.4f}  [{source}] (single model only)")
            
            elif "mean_embedding" in data:
                # OLD format (pre-Change #3): Single mean embedding
                mean_embedding = data["mean_embedding"]
                threshold = float(data["threshold"])
                source = "npz (mean only - OLD)"
                
                # Wrap single mean in array for compatibility
                embeddings[student_id] = {
                    "embeddings_facenet": np.array([mean_embedding]),
                    "embeddings_arcface": None,
                    "threshold_facenet": threshold,
                    "threshold_arcface": None,
                }
                print(f"Loaded: {student_id}  "
                      f"photos=1 (averaged)  dim={len(mean_embedding)}  "
                      f"threshold={threshold:.4f}  [{source}]")
            else:
                print(f"WARNING: {student_id}_data.npz missing required keys")
                continue
                
        elif os.path.exists(npy_path):
            # Legacy format — single mean embedding
            mean_embedding = np.load(npy_path)
            threshold = COSINE_THRESHOLD
            source = "npy (legacy)"
            
            embeddings[student_id] = {
                "embeddings_facenet": np.array([mean_embedding]),
                "embeddings_arcface": None,
                "threshold_facenet": threshold,
                "threshold_arcface": None,
            }
            print(f"Loaded: {student_id}  "
                  f"photos=1  dim={len(mean_embedding)}  threshold={threshold:.4f}  [{source}]")
        else:
            continue

    if not embeddings:
        print("ERROR: No embeddings found! Run enroll.py first.")
    else:
        print(f"\nTotal students loaded: {len(embeddings)}")

    return embeddings


def get_face_embedding(face_bgr, detection=None):
    """
    Generates face embeddings from BOTH models (FaceNet512 and ArcFace).
    
    CHANGE #7 (Ensemble): Returns embeddings from two independent models.
    
    Args:
        face_bgr: Cropped face image (BGR format)
        detection: Optional MTCNN detection dict containing keypoints for alignment
        
    Returns:
        tuple: (facenet_embedding, arcface_embedding) as numpy arrays (512,) each
               or (None, None) if processing fails
    """
    from deepface import DeepFace
    import warnings
    warnings.filterwarnings('ignore')
    
    from services.face_recognition.detector import align_face

    try:
        # Step 1 — align the face if keypoints are available
        if detection and 'keypoints' in detection:
            face_aligned = align_face(face_bgr, detection['keypoints'])
        else:
            face_aligned = face_bgr
        
        if face_aligned is None or face_aligned.size == 0:
            return None, None
        
        # Step 2 — resize to 160×160 for FaceNet input
        face_160 = cv2.resize(face_aligned, (160, 160), interpolation=cv2.INTER_AREA)
        
        # Step 3a — generate FaceNet512 embedding
        result_facenet = DeepFace.represent(
            img_path         = face_160,
            model_name       = MODEL_FACENET,
            detector_backend = "skip",
            enforce_detection= False,
            align            = False
        )
        embedding_facenet = np.array(result_facenet[0]['embedding'])
        embedding_facenet /= (np.linalg.norm(embedding_facenet) + 1e-10)
        
        # Step 3b — generate ArcFace embedding
        result_arcface = DeepFace.represent(
            img_path         = face_160,
            model_name       = MODEL_ARCFACE,
            detector_backend = "skip",
            enforce_detection= False,
            align            = False
        )
        embedding_arcface = np.array(result_arcface[0]['embedding'])
        embedding_arcface /= (np.linalg.norm(embedding_arcface) + 1e-10)
        
        return embedding_facenet, embedding_arcface

    except Exception as e:
        print(f"Embedding generation error: {e}")
        return None, None


def recognize_face(frame_bgr, embeddings_dict):
    """
    MAIN RECOGNITION FUNCTION.
    Called for every camera frame during a live session.

    Pipeline (Report Section 3.2.1):
      Step 1: Preprocess frame
      Step 2: MTCNN face detection (all faces)
      Step 3: Loop every detected face; skip faces narrower than MIN_FACE_WIDTH
      Step 4: Generate embeddings from BOTH models (FaceNet512 + ArcFace)
      Step 5: ENSEMBLE COMPARISON — For each model, compare against ALL
              enrollment photos and use MINIMUM distance (closest match).
              NEW (Change #7): Both models must identify the SAME student.
      Step 6: Apply thresholds and confidence floors for BOTH models
              Both models must pass their respective checks for recognition.
              If models disagree on identity, reject the match (impostor detection).

    Returns list of dicts (one entry per recognized face):
        [
          {
            "status"     : "recognized",
            "student_id" : str,
            "distance"   : float,   ← average of both models' distances
            "confidence" : float,   ← average of both models' confidences (≥40% each)
            "face_coords": (x,y,w,h),
            "message"    : str (includes "ensemble" if both models used)
          },
          ...
        ]

    Returns an empty list when no face is detected or no face passes the
    ensemble checks. Returns [{"status": "error", ...}] on hard failures.
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

        # Step 4: Crop face and generate embeddings from BOTH models (with alignment)
        face_crop = crop_face(preprocessed, detection, padding=0.1)
        emb_facenet, emb_arcface = get_face_embedding(face_crop, detection=detection)

        if emb_facenet is None:
            # DeepFace couldn't process this crop — skip silently
            continue

        # Step 5: ENSEMBLE COMPARISON - both models must agree
        # CHANGE #7: Compare against all enrollment photos with BOTH models.
        # For recognition, BOTH models must identify the same student AND
        # both must pass their respective thresholds and confidence floors.
        
        best_match_facenet = None
        best_distance_facenet = float('inf')
        best_threshold_facenet = COSINE_THRESHOLD
        
        best_match_arcface = None
        best_distance_arcface = float('inf')
        best_threshold_arcface = COSINE_THRESHOLD
        
        # Flag to track if this student has ArcFace embeddings
        has_arcface_embeddings = False

        for student_id, student_data in embeddings_dict.items():
            ref_embeddings_facenet = student_data.get("embeddings_facenet")
            ref_embeddings_arcface = student_data.get("embeddings_arcface")
            threshold_facenet = student_data.get("threshold_facenet", COSINE_THRESHOLD)
            threshold_arcface = student_data.get("threshold_arcface", COSINE_THRESHOLD)
            
            if ref_embeddings_facenet is None:
                continue
            
            # Handle both new format (2D array) and old format (1D array)
            if ref_embeddings_facenet.ndim == 1:
                ref_embeddings_facenet = np.array([ref_embeddings_facenet])
            
            # Compare with FaceNet512
            min_dist_facenet = float('inf')
            for ref_emb in ref_embeddings_facenet:
                dist = cosine_distance(emb_facenet, ref_emb)
                if dist < min_dist_facenet:
                    min_dist_facenet = dist
            
            if min_dist_facenet < best_distance_facenet:
                best_distance_facenet = min_dist_facenet
                best_match_facenet = student_id
                best_threshold_facenet = threshold_facenet
            
            # Compare with ArcFace (if available for this student)
            if ref_embeddings_arcface is not None and emb_arcface is not None:
                has_arcface_embeddings = True
                
                if ref_embeddings_arcface.ndim == 1:
                    ref_embeddings_arcface = np.array([ref_embeddings_arcface])
                
                min_dist_arcface = float('inf')
                for ref_emb in ref_embeddings_arcface:
                    dist = cosine_distance(emb_arcface, ref_emb)
                    if dist < min_dist_arcface:
                        min_dist_arcface = dist
                
                if min_dist_arcface < best_distance_arcface:
                    best_distance_arcface = min_dist_arcface
                    best_match_arcface = student_id
                    best_threshold_arcface = threshold_arcface
        
        # ── ENSEMBLE DECISION LOGIC ──────────────────────────────────────
        # For students with both models: BOTH must agree on identity
        # For students with only FaceNet: Use FaceNet alone (backward compat)
        
        if has_arcface_embeddings and emb_arcface is not None:
            # ENSEMBLE MODE: Both models available
            # Check if both models agree on the same student
            if best_match_facenet == best_match_arcface and best_match_facenet is not None:
                # Both models agree - check thresholds and confidence floors
                conf_facenet = compute_confidence(best_distance_facenet, best_threshold_facenet)
                conf_arcface = compute_confidence(best_distance_arcface, best_threshold_arcface)
                
                # Both must pass distance threshold AND confidence floor
                if (best_distance_facenet <= best_threshold_facenet and
                    best_distance_arcface <= best_threshold_arcface and
                    conf_facenet >= MIN_CONFIDENCE_PERCENT and
                    conf_arcface >= MIN_CONFIDENCE_PERCENT):
                    
                    # RECOGNIZED - both models agree with high confidence
                    recognized_results.append({
                        "status": "recognized",
                        "student_id": best_match_facenet,
                        "distance": round((best_distance_facenet + best_distance_arcface) / 2, 4),
                        "confidence": round((conf_facenet + conf_arcface) / 2, 1),
                        "face_coords": (x, y, w, h),
                        "message": f"Recognized: {best_match_facenet} (ensemble)",
                    })
            # else: Models disagree or one/both failed checks → REJECTED (silent)
        
        else:
            # SINGLE MODEL MODE: Only FaceNet available (backward compatibility)
            conf_facenet = compute_confidence(best_distance_facenet, best_threshold_facenet)
            
            if (best_distance_facenet <= best_threshold_facenet and
                conf_facenet >= MIN_CONFIDENCE_PERCENT):
                
                recognized_results.append({
                    "status": "recognized",
                    "student_id": best_match_facenet,
                    "distance": round(best_distance_facenet, 4),
                    "confidence": conf_facenet,
                    "face_coords": (x, y, w, h),
                    "message": f"Recognized: {best_match_facenet}",
                })

    return recognized_results


if __name__ == "__main__":
    print("=" * 55)
    print("  RECOGNITION TEST — Ensemble (FaceNet512 + ArcFace)")
    print("=" * 55)

    print("\nLoading student embeddings...")
    embeddings = load_all_embeddings()

    if not embeddings:
        print("\nNo embeddings found!")
        print("Please run enroll.py first.")
        exit()

    # Check if any students have ensemble embeddings
    ensemble_count = sum(1 for s in embeddings.values() if s.get("embeddings_arcface") is not None)
    single_count = len(embeddings) - ensemble_count
    
    print(f"\nModel       : FaceNet512 + ArcFace (ensemble)")
    print(f"Students    : {len(embeddings)} total")
    print(f"  Ensemble  : {ensemble_count} (both models)")
    print(f"  Single    : {single_count} (FaceNet only)")
    print(f"Threshold   : per-student adaptive")
    print(f"Conf Floor  : {MIN_CONFIDENCE_PERCENT}%")
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
