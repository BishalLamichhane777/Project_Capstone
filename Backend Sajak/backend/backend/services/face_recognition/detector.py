import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import cv2
import numpy as np
from mtcnn import MTCNN

MIN_DETECTION_CONFIDENCE = 0.80

_detector = None

def get_detector():
    global _detector
    if _detector is None:
        print("Loading MTCNN detector (this may take a few seconds first time)...")
        _detector = MTCNN()
    return _detector


def detect_faces(frame_bgr):
    if frame_bgr is None or frame_bgr.size == 0:
        return []
    
    detector = get_detector()
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    
    try:
        results = detector.detect_faces(frame_rgb)
        # Filter low confidence detections
        return [r for r in results if r.get('confidence', 0) >= MIN_DETECTION_CONFIDENCE]
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
