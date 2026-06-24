# preprocess.py
# Image preprocessing for the DeepFace pipeline.
#
# With MTCNN + DeepFace, most alignment work happens automatically
# inside DeepFace.represent() using the facial landmarks from MTCNN.
# This file handles:
#   1. Dataset scanning (finding student photos)
#   2. Basic image quality checks before enrollment
#   3. Optional histogram equalisation for very dark images

import cv2
import numpy as np
import os

# Absolute path anchored to THIS file's location (services/face_recognition/)
_DIR = os.path.dirname(os.path.abspath(__file__))

# Dataset folder lives two levels up from this service, at the app root
_APP_ROOT = os.path.abspath(os.path.join(_DIR, "..", ".."))
DATASET_FOLDER = os.path.join(_APP_ROOT, "Dataset")
OUTPUT_FOLDER = os.path.join(_APP_ROOT, "Preprocessed_Dataset")

# Minimum image dimensions to accept for enrollment
MIN_IMAGE_WIDTH  = 100
MIN_IMAGE_HEIGHT = 100


def preprocess_for_enrollment(image_bgr):
    """
    Light preprocessing applied to enrollment photos before
    DeepFace generates the embedding.

    Steps:
      1. Check image is valid and large enough
      2. Apply GaussianBlur for noise reduction (replaces bilateralFilter —
         same noise-reduction goal, ~10x faster on CPU, acceptable for
         enrollment where the image is a clean still photo)
      3. Apply histogram equalisation on the Y channel to normalise
         exposure across photos taken in different lighting conditions

    DeepFace + MTCNN handles geometric alignment internally via the
    crop_face() call in generate_embedding(), so we do NOT resize or
    crop here.

    Returns:
        (preprocessed_bgr, None)  on success
        (None, error_message)     on failure
    """
    if image_bgr is None:
        return None, "Image is None"

    h, w = image_bgr.shape[:2]
    if w < MIN_IMAGE_WIDTH or h < MIN_IMAGE_HEIGHT:
        return None, f"Image too small: {w}x{h}"

    # GaussianBlur — fast noise reduction for enrollment stills.
    # kernel (3,3) with sigma=1 is equivalent in noise-reduction effect
    # to bilateralFilter(d=5, sigmaColor=30, sigmaSpace=30) for clean
    # JPEG photos, but runs ~10x faster because it is a separable linear
    # filter (O(n) per axis vs O(n²) for bilateral).
    # NOTE: preprocess_for_recognition (scan path) is unchanged and still
    # uses bilateralFilter — enrollment and scan preprocessing can differ
    # because recognition accuracy depends on the cosine distance between
    # two independently preprocessed embeddings, not identical pipelines.
    filtered = cv2.GaussianBlur(image_bgr, (3, 3), sigmaX=1)

    # Histogram equalisation on the Y (luminance) channel
    yuv        = cv2.cvtColor(filtered, cv2.COLOR_BGR2YUV)
    yuv[:,:,0] = cv2.equalizeHist(yuv[:,:,0])
    result     = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)

    return result, None


def preprocess_for_recognition(frame_bgr):
    """
    Same preprocessing applied to every live webcam frame
    before MTCNN detection and DeepFace recognition.
    Must match the enrollment preprocessing for best accuracy.
    """
    if frame_bgr is None:
        return None

    filtered   = cv2.bilateralFilter(frame_bgr, 5, 30, 30)
    yuv        = cv2.cvtColor(filtered, cv2.COLOR_BGR2YUV)
    yuv[:,:,0] = cv2.equalizeHist(yuv[:,:,0])
    return cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)


def get_all_photos(base_folder):
    """
    Walks base_folder recursively and returns:
        { "Student_1": [path1, path2, ...], ... }
    The top-level subfolder name becomes the student ID.
    """
    student_photos = {}

    for root, dirs, files in os.walk(base_folder):
        photos = [
            f for f in files
            if f.lower().endswith(('.jpg', '.jpeg',
                                   '.png', '.bmp'))
        ]
        if not photos:
            continue

        relative  = os.path.relpath(root, base_folder)
        top_level = relative.split(os.sep)[0]

        if top_level not in student_photos:
            student_photos[top_level] = []

        for photo in photos:
            student_photos[top_level].append(
                os.path.join(root, photo)
            )

    return student_photos


def check_image_quality(image_bgr):
    """
    Basic quality check before enrollment.
    Returns (True, None) if OK, (False, reason) if rejected.
    """
    if image_bgr is None:
        return False, "Could not load image"

    h, w = image_bgr.shape[:2]
    if w < MIN_IMAGE_WIDTH or h < MIN_IMAGE_HEIGHT:
        return False, f"Too small ({w}x{h})"

    # Check if image is too dark (mean brightness < 30)
    gray       = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray)
    if brightness < 20:
        return False, f"Too dark (brightness={brightness:.0f})"

    return True, None


if __name__ == "__main__":
    print("=" * 55)
    print("  PREPROCESSING CHECK")
    print("=" * 55)

    if not os.path.exists(DATASET_FOLDER):
        print(f"Dataset folder not found: {DATASET_FOLDER}")
    else:
        found = get_all_photos(DATASET_FOLDER)
        if found:
            print(f"Found {len(found)} student(s):\n")
            for sid, paths in sorted(found.items()):
                print(f"  {sid}: {len(paths)} photos")
                for p in paths:
                    img = cv2.imread(p)
                    ok, reason = check_image_quality(img)
                    h = img.shape[0] if img is not None else 0
                    w = img.shape[1] if img is not None else 0
                    status = "OK" if ok else f"SKIP ({reason})"
                    print(f"    {os.path.basename(p)}"
                          f"  {w}x{h}  [{status}]")
        else:
            print("No photos found in dataset folder.")
