# __init__.py
# Face Recognition service package initialization.

import cv2
import numpy as np
import logging
from models.student import Student
from services.face_recognition.recognizer import recognize_face, load_all_embeddings

logger = logging.getLogger(__name__)

# Cache embeddings at module load time
try:
    _EMBEDDINGS = load_all_embeddings()
    logger.info("Face recognition embeddings loaded successfully.")
except Exception as e:
    _EMBEDDINGS = {}
    logger.error("Failed to load face recognition embeddings: %s", e)

# Warm-up DeepFace + FaceNet at startup so the first real scan doesn't
# pay the model-load penalty (typically 2–5 s on first call).
def _warmup_deepface():
    try:
        from deepface import DeepFace
        import warnings
        warnings.filterwarnings('ignore')
        blank = np.zeros((160, 160, 3), dtype=np.uint8)
        DeepFace.represent(
            img_path=blank,
            model_name="Facenet",
            detector_backend="skip",
            enforce_detection=False,
            align=False,
        )
        logger.info("DeepFace FaceNet model warmed up successfully.")
    except Exception as e:
        logger.warning("DeepFace warm-up failed (non-fatal): %s", e)

_warmup_deepface()


def reload_embeddings() -> None:
    """Reload all student embeddings from disk into the module-level cache.

    Calls load_all_embeddings() and updates _EMBEDDINGS **in place** so that
    existing references (e.g. in recognize_student) immediately see the new
    data without requiring a module reimport.

    Known limitation: with ``gunicorn --preload --workers N`` each worker
    process has its own copy of _EMBEDDINGS in memory. Calling this function
    only refreshes the worker that handles the current request. For a
    low-traffic single-server deployment this is acceptable — all workers
    will eventually be refreshed as they handle subsequent enrollment calls,
    and a container restart guarantees full consistency.
    """
    global _EMBEDDINGS
    try:
        new_embeddings = load_all_embeddings()
        _EMBEDDINGS.clear()
        _EMBEDDINGS.update(new_embeddings)
        logger.info(
            "Face recognition embeddings reloaded — %d student(s) in cache.",
            len(_EMBEDDINGS),
        )
    except Exception as e:
        logger.error("Failed to reload face recognition embeddings: %s", e)


def recognize_student(image_bytes: bytes) -> dict:
    """Decodes image_bytes, performs face recognition, and resolves
    the matching student ID from the database.
    """
    try:
        # Decode image bytes to BGR numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            logger.error("Failed to decode image bytes with cv2.imdecode")
            return {
                "status": "error",
                "student_id": None,
                "confidence": None,
                "distance": None,
                "face_label": None,
                "message": "Failed to decode image"
            }

        # Downscale if the frame is larger than 640px wide.
        # FaceNet operates on a 160×160 face crop, so anything beyond
        # ~640px wide wastes MTCNN inference time with no accuracy gain.
        # The frontend already resizes to 480px; this guard handles any
        # client that skips that step.
        MAX_WIDTH = 640
        h, w = img.shape[:2]
        if w > MAX_WIDTH:
            scale = MAX_WIDTH / w
            img = cv2.resize(img, (MAX_WIDTH, int(h * scale)),
                             interpolation=cv2.INTER_AREA)

        # Perform recognition
        result = recognize_face(img, _EMBEDDINGS)
        
        status = result.get("status", "unknown")
        distance = result.get("distance")
        confidence = result.get("confidence")
        
        # If recognized, look up student_id from face_label in database
        student_id = None
        face_label = None
        if status == "recognized":
            face_label = result.get("student_id")  # recognizer returns face_label in student_id field
            student = Student.query.filter_by(face_label=face_label).first()
            if student:
                student_id = student.student_id
            else:
                logger.warning("Recognized face_label '%s' but no matching student found in DB", face_label)

        return {
            "status": status,
            "student_id": student_id,
            "confidence": confidence,
            "distance": distance,
            "face_label": face_label
        }

    except Exception as e:
        logger.exception("Error during recognize_student execution: %s", e)
        return {
            "status": "error",
            "student_id": None,
            "confidence": None,
            "distance": None,
            "face_label": None,
            "message": str(e)
        }
