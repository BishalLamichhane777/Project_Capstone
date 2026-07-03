# recognize.py
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

BACKEND_DIR       = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

from detector   import detect_faces, get_largest_face, crop_face
from preprocess import preprocess_for_recognition

EMBEDDINGS_FOLDER = os.path.join(BACKEND_DIR, "embeddings")
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


def load_all_embeddings():
    """
    Loads ALL student mean embeddings into memory.
    Called ONCE when session starts (replaces load_all_models).

    Returns:
        dict: { "Student_1": np.array(shape=(128,)), ... }
    """
    embeddings = {}

    if not os.path.exists(EMBEDDINGS_FOLDER):
        print("ERROR: Embeddings folder not found!")
        print(f"Path: {EMBEDDINGS_FOLDER}")
        print("Run enroll.py first!")
        return embeddings

    # Load labels map
    if os.path.exists(LABELS_FILE):
        with open(LABELS_FILE, 'r') as f:
            labels_map = json.load(f)
        print(f"Labels loaded: {list(labels_map.keys())}")
    else:
        print("WARNING: labels.json not found!")
        labels_map = {}

    # Load each student's mean embedding
    for fname in os.listdir(EMBEDDINGS_FOLDER):
        if not fname.endswith('_mean.npy'):
            continue

        student_id = fname.replace('_mean.npy', '')
        emb_path   = os.path.join(EMBEDDINGS_FOLDER, fname)

        embedding  = np.load(emb_path)
        embeddings[student_id] = embedding
        print(f"Loaded: {student_id}  "
              f"(embedding dim={len(embedding)})")

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
            detector_backend = DETECTOR_BACKEND,
            enforce_detection= True,
            align            = True
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
      Step 2: MTCNN face detection
      Step 3: Crop largest face
      Step 4: Generate DeepFace embedding
      Step 5: Compare with all student embeddings (cosine distance)
      Step 6: Apply threshold

    Returns dict:
        {
          "status"     : "recognized" | "unknown" | "no_face" | "error",
          "student_id" : str or None,
          "distance"   : float or None,  ← cosine distance (lower = better)
          "confidence" : float or None,  ← converted to 0-100 for display
          "face_coords": (x,y,w,h) or None,
          "message"    : str
        }
    """
    if not embeddings_dict:
        return {
            "status"    : "error",
            "message"   : "No embeddings loaded",
            "student_id": None,
            "distance"  : None,
            "confidence": None,
            "face_coords": None
        }

    # Step 1: Preprocess frame
    preprocessed = preprocess_for_recognition(frame_bgr)

    # Step 2: Detect face with MTCNN
    detections = detect_faces(preprocessed)

    if not detections:
        return {
            "status"     : "no_face",
            "message"    : "No face detected",
            "student_id" : None,
            "distance"   : None,
            "confidence" : None,
            "face_coords": None
        }

    # Step 3: Use the largest face (person closest to door)
    best_det   = get_largest_face(detections)
    x, y, w, h = best_det['box']

    # Step 4: Crop face and generate embedding
    face_crop = crop_face(preprocessed, best_det, padding=0.1)
    embedding = get_face_embedding(face_crop)

    if embedding is None:
        # DeepFace couldn't process this crop
        return {
            "status"     : "no_face",
            "message"    : "Could not generate embedding",
            "student_id" : None,
            "distance"   : None,
            "confidence" : None,
            "face_coords": (x, y, w, h)
        }

    # Step 5: Compare against all student embeddings
    best_match    = None
    best_distance = float('inf')

    for student_id, ref_embedding in embeddings_dict.items():
        dist = cosine_distance(embedding, ref_embedding)
        if dist < best_distance:
            best_distance = dist
            best_match    = student_id

    # Convert cosine distance to a 0–100 confidence score for display.
    # distance=0.0              → confidence=100%
    # distance=COSINE_THRESHOLD → confidence=0%
    # Using threshold-relative scaling so the score means the same thing
    # regardless of the absolute threshold value.
    display_confidence = round(
        max(0, (1.0 - (best_distance / COSINE_THRESHOLD)) * 100), 1
    )

    # Step 6: Apply threshold
    if best_distance <= COSINE_THRESHOLD:
        return {
            "status"     : "recognized",
            "student_id" : best_match,
            "distance"   : round(best_distance, 4),
            "confidence" : display_confidence,
            "face_coords": (x, y, w, h),
            "message"    : f"Recognized: {best_match}"
        }
    else:
        return {
            "status"     : "unknown",
            "student_id" : None,
            "distance"   : round(best_distance, 4),
            "confidence" : display_confidence,
            "face_coords": (x, y, w, h),
            "message"    : "Unknown face"
        }


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

        result  = recognize_face(frame, embeddings)
        display = frame.copy()
        status  = result["status"]

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
                        (20, 45),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1, (0, 255, 0), 2)
            cv2.putText(display,
                        f"Confidence: {conf}%  dist: {dist}",
                        (20, 85),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.65, (0, 255, 0), 2)

        elif status == "unknown":
            conf       = result["confidence"]
            dist       = result["distance"]
            x, y, w, h = result["face_coords"]

            # Red box = unknown
            cv2.rectangle(display,
                          (x, y), (x + w, y + h),
                          (0, 0, 255), 2)
            cv2.putText(display,
                        "UNKNOWN FACE",
                        (20, 45),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1, (0, 0, 255), 2)
            cv2.putText(display,
                        f"Confidence: {conf}%  dist: {dist}",
                        (20, 85),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.65, (0, 0, 255), 2)

        elif status == "no_face":
            cv2.putText(display,
                        "No face in frame",
                        (20, 45),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1, (0, 255, 255), 2)

        cv2.imshow(
            "Recognition Test - Press Q to quit",
            display
        )

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Recognition test finished.")
