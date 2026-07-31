import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import cv2
import numpy as np
import time
import logging
from mtcnn import MTCNN

logger = logging.getLogger(__name__)

MIN_DETECTION_CONFIDENCE = 0.80

_detector = None
_haar_cascade = None

def get_detector():
    global _detector
    if _detector is None:
        print("Loading MTCNN detector (this may take a few seconds first time)...")
        _detector = MTCNN()
    return _detector


def get_haar_cascade():
    """Load Haar cascade for fast pre-filtering (cheap face detection)."""
    global _haar_cascade
    
    # Return cached result (None means unavailable, actual cascade object means available)
    if _haar_cascade is not None:
        return _haar_cascade if _haar_cascade is not False else None
    
    # First load attempt - check if OpenCV supports Haar cascades
    try:
        # Check if cv2.CascadeClassifier exists first
        if not hasattr(cv2, 'CascadeClassifier'):
            logger.warning("cv2.CascadeClassifier not available, pre-filter disabled")
            _haar_cascade = False
            return None
        
        # Check if cv2.data exists
        if not hasattr(cv2, 'data'):
            logger.warning("cv2.data not available, pre-filter disabled")
            _haar_cascade = False
            return None
        
        # Check if cv2.data.haarcascades exists
        if not hasattr(cv2.data, 'haarcascades'):
            logger.warning("cv2.data.haarcascades not available, pre-filter disabled")
            _haar_cascade = False
            return None
        
        # Try multiple common paths for Haar cascade
        cascade_paths = [
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml',
            '/usr/local/lib/python3.12/dist-packages/cv2/data/haarcascade_frontalface_default.xml',
            'haarcascade_frontalface_default.xml',
        ]
        
        for path in cascade_paths:
            if os.path.exists(path):
                _haar_cascade = cv2.CascadeClassifier(path)
                if _haar_cascade.empty():
                    continue
                logger.info(f"Haar cascade loaded from: {path}")
                return _haar_cascade
        
        # No valid cascade found
        logger.warning("Haar cascade file not found, pre-filter will be disabled")
        _haar_cascade = False
        return None
        
    except (AttributeError, Exception) as e:
        # OpenCV doesn't support Haar cascades in this build
        logger.warning(f"Haar cascade unavailable ({type(e).__name__}), pre-filter disabled")
        _haar_cascade = False
        return None


def fast_face_precheck(frame_bgr):
    """
    Fast pre-filter using Haar cascade to check if there's any face-like region.
    
    Returns:
        bool: True if potential face found (run full MTCNN), False if empty (skip MTCNN)
    
    This is a cheap check (~5-20ms) that can save ~250-400ms of MTCNN time
    when no one is in frame. Haar is prone to false positives (which is fine,
    we'll catch them with MTCNN), but has very few false negatives.
    """
    # Check if cascade is available (only get it once at module level)
    if _haar_cascade is False:
        # Cascade unavailable - skip precheck, always run full MTCNN
        return True
    
    cascade = get_haar_cascade()
    
    # If Haar cascade failed to load, always return True (fail-safe: run full pipeline)
    if cascade is None:
        return True
    
    t_start = time.perf_counter()
    
    # Convert to grayscale for Haar
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    
    # Detect faces with Haar (very fast, not very accurate)
    # Parameters tuned for speed over accuracy - we just need "any face-like blob"
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=3,      # Lower = more false positives (good for pre-filter)
        minSize=(40, 40),    # Smaller than MIN_FACE_WIDTH (60) to avoid missing faces
        flags=cv2.CASCADE_SCALE_IMAGE
    )
    
    t_end = time.perf_counter()
    has_face = len(faces) > 0
    
    logger.info(
        f"[TIMING] fast_face_precheck: "
        f"{1000*(t_end-t_start):.1f}ms, "
        f"result={'FACE_FOUND' if has_face else 'EMPTY'} "
        f"(Haar detected {len(faces)} candidate(s))"
    )
    
    return has_face


def detect_faces(frame_bgr, use_precheck=True):
    """
    Detect faces in a frame using MTCNN, with optional fast pre-filter.
    
    Args:
        frame_bgr: BGR image from camera
        use_precheck: If True, run cheap Haar cascade first to skip MTCNN on empty frames
    
    Returns:
        List of detection dicts from MTCNN, or empty list if no faces
    """
    if frame_bgr is None or frame_bgr.size == 0:
        return []
    
    t_start = time.perf_counter()
    
    # Step 1: Fast pre-check (optional, can be disabled for testing)
    if use_precheck:
        t_precheck_start = time.perf_counter()
        has_candidate = fast_face_precheck(frame_bgr)
        t_precheck_end = time.perf_counter()
        
        if not has_candidate:
            # No face-like regions detected by Haar - skip expensive MTCNN
            t_end = time.perf_counter()
            logger.info(
                f"[TIMING] detect_faces: SKIPPED MTCNN (precheck=EMPTY) | "
                f"precheck={1000*(t_precheck_end-t_precheck_start):.1f}ms, "
                f"total={1000*(t_end-t_start):.1f}ms | "
                f"SAVED ~300ms by skipping MTCNN ✅"
            )
            return []
    
    detector = get_detector()
    
    t_convert_start = time.perf_counter()
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    t_convert_end = time.perf_counter()
    
    try:
        t_detect_start = time.perf_counter()
        results = detector.detect_faces(frame_rgb)
        t_detect_end = time.perf_counter()
        
        # Filter low confidence detections
        filtered = [r for r in results if r.get('confidence', 0) >= MIN_DETECTION_CONFIDENCE]
        
        t_end = time.perf_counter()
        
        precheck_time = f"precheck={1000*(t_precheck_end-t_precheck_start):.1f}ms, " if use_precheck else ""
        
        logger.info(
            f"[TIMING] detect_faces: "
            f"{precheck_time}"
            f"BGR->RGB={1000*(t_convert_end-t_convert_start):.1f}ms, "
            f"MTCNN_raw={1000*(t_detect_end-t_detect_start):.1f}ms, "
            f"total={1000*(t_end-t_start):.1f}ms, "
            f"faces_found={len(results)}, "
            f"faces_filtered={len(filtered)} (conf>={MIN_DETECTION_CONFIDENCE})"
        )
        
        return filtered
    except Exception as e:
        print(f"Detection error: {e}")
        return []


def get_largest_face(detections):
    if not detections:
        return None
    return max(detections, key=lambda d: d['box'][2] * d['box'][3])


def crop_face(frame_bgr, detection, padding=0.1):
    x, y, w, h = detection['box']
    pad_x = int(w * padding)
    pad_y = int(h * padding)

    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(frame_bgr.shape[1], x + w + pad_x)
    y2 = min(frame_bgr.shape[0], y + h + pad_y)

    return frame_bgr[y1:y2, x1:x2]


def align_face(face_crop, keypoints):
    """
    Aligns a face by rotating it so that the eyes are horizontal.
    
    This corrects for head tilt, ensuring that faces tilted during scanning
    match the upright enrollment photos. Alignment is applied to both
    enrollment and recognition paths to maintain consistency.
    
    Args:
        face_crop: BGR image containing a cropped face
        keypoints: Dictionary with 'left_eye' and 'right_eye' coordinates from MTCNN
                   Format: {'left_eye': (x, y), 'right_eye': (x, y), ...}
    
    Returns:
        Aligned face image (BGR) with eyes horizontal, or original crop if
        keypoints are missing/invalid.
    """
    if face_crop is None or face_crop.size == 0:
        return face_crop
    
    if not keypoints or 'left_eye' not in keypoints or 'right_eye' not in keypoints:
        # No keypoints available - return unaligned (fallback for edge cases)
        return face_crop
    
    left_eye = keypoints['left_eye']
    right_eye = keypoints['right_eye']
    
    # Calculate the angle between the eyes
    delta_x = right_eye[0] - left_eye[0]
    delta_y = right_eye[1] - left_eye[1]
    
    # Angle in degrees (counterclockwise from horizontal)
    angle = np.degrees(np.arctan2(delta_y, delta_x))
    
    # Calculate the center point between the eyes for rotation pivot
    eye_center_x = (left_eye[0] + right_eye[0]) / 2.0
    eye_center_y = (left_eye[1] + right_eye[1]) / 2.0
    
    # Get the rotation matrix
    # Note: OpenCV's coordinate system has origin at top-left, so we rotate
    # in the opposite direction of the calculated angle to make eyes horizontal
    h, w = face_crop.shape[:2]
    rotation_matrix = cv2.getRotationMatrix2D(
        (eye_center_x, eye_center_y),
        angle,
        scale=1.0
    )
    
    # Apply the rotation with border padding to avoid cropping
    aligned = cv2.warpAffine(
        face_crop,
        rotation_matrix,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )
    
    return aligned


def draw_detections(frame_bgr, detections, label="", color=(0, 255, 0)):
    display = frame_bgr.copy()
    for det in detections:
        x, y, w, h = det['box']
        conf = det['confidence']

        cv2.rectangle(display, (x, y), (x + w, y + h), color, 2)
        cv2.putText(display, f"{label} {conf:.2f}", (x, y - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # Draw keypoints
        for point in det['keypoints'].values():
            cv2.circle(display, point, 3, (0, 200, 255), -1)
    return display


if __name__ == "__main__":
    print("=" * 60)
    print("MTCNN Face Detector Test")
    print("=" * 60)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open webcam!")
        exit(1)

    print("Camera opened. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        detections = detect_faces(frame)
        display = draw_detections(frame, detections, label="Face")

        count_text = f"Faces detected: {len(detections)}"
        color = (0, 255, 0) if detections else (0, 0, 255)
        cv2.putText(display, count_text, (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

        cv2.imshow("MTCNN Detector Test - Press Q to quit", display)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Test finished.")
