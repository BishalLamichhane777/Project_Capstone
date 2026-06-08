# train_model.py
import cv2
import numpy as np
import os
import json
import sys

print("Script started...")  # test line

# Add Backend folder to path so preprocess.py can be found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from preprocess import preprocess_image, detect_face, get_all_photos, FACE_SIZE

print("Imports successful!")  # test line

# PATHS

DATASET_FOLDER = "Backend/Dataset"
MODELS_FOLDER  = "Backend/models"
LABELS_FILE    = "Backend/models/labels.json"

os.makedirs(MODELS_FOLDER, exist_ok=True)


def extract_faces_for_student(photo_paths):
    faces = []
    for photo_path in photo_paths:
        image = cv2.imread(photo_path)
        if image is None:
            print(f"    Could not load: {os.path.basename(photo_path)}")
            continue

        preprocessed, gray = preprocess_image(image)
        detected = detect_face(preprocessed)

        if len(detected) == 0:
            print(f"    No face: {os.path.basename(photo_path)}")
            continue

        best   = sorted(detected,
                        key=lambda f: f[2] * f[3],
                        reverse=True)[0]
        x, y, w, h = best
        face_crop  = preprocessed[y:y+h, x:x+w]
        face_final = cv2.resize(face_crop, FACE_SIZE,
                                interpolation=cv2.INTER_AREA)
        faces.append(face_final)
        print(f"    OK: {os.path.basename(photo_path)}")

    return faces


def train_single_student(student_id, faces):
    if len(faces) < 3:
        print(f"    ERROR: Only {len(faces)} faces found.")
        print(f"    Need at least 3. Skipping {student_id}.")
        return False

    recognizer = cv2.face.LBPHFaceRecognizer_create(
        radius=1,
        neighbors=8,
        grid_x=8,
        grid_y=8
    )

    labels = np.array([0] * len(faces))
    recognizer.train(faces, labels)

    model_path = os.path.join(MODELS_FOLDER, f"{student_id}.yml")
    recognizer.save(model_path)

    size_kb = os.path.getsize(model_path) / 1024
    print(f"    Saved: {model_path} ({size_kb:.1f} KB)")
    return True


def train_all_students():
    print("\n" + "="*55)
    print("  TRAINING LBPH MODELS")
    print("="*55)

    # Check dataset
    if not os.path.exists(DATASET_FOLDER):
        print(f"ERROR: Dataset not found!")
        print(f"Looking at: {os.path.abspath(DATASET_FOLDER)}")
        return

    # Get all photos
    student_photos = get_all_photos(DATASET_FOLDER)

    if not student_photos:
        print("ERROR: No photos found in dataset!")
        return

    print(f"\nStudents found: {len(student_photos)}")
    for sid, paths in sorted(student_photos.items()):
        print(f"  {sid}: {len(paths)} photos")

    labels_map    = {}
    trained_count = 0
    failed_count  = 0

    for idx, (student_id, photo_paths) in enumerate(
            sorted(student_photos.items())):

        print(f"\n--- Training: {student_id} ---")
        print(f"    Photos available: {len(photo_paths)}")

        faces   = extract_faces_for_student(photo_paths)
        print(f"    Valid faces: {len(faces)}")

        success = train_single_student(student_id, faces)

        if success:
            labels_map[student_id] = idx
            trained_count += 1
            print(f"    SUCCESS: {student_id} trained!")
        else:
            failed_count += 1

    # Save labels.json
    with open(LABELS_FILE, 'w') as f:
        json.dump(labels_map, f, indent=4)

    print("\n" + "="*55)
    print("TRAINING COMPLETE!")
    print(f"  Trained  : {trained_count} students")
    print(f"  Failed   : {failed_count} students")
    print(f"  Models in: {MODELS_FOLDER}")
    print("="*55)

    print("\nFiles created in models folder:")
    for fname in os.listdir(MODELS_FOLDER):
        fpath = os.path.join(MODELS_FOLDER, fname)
        size  = os.path.getsize(fpath) / 1024
        print(f"  {fname}  ({size:.1f} KB)")


# THIS MUST BE AT THE VERY LEFT EDGE - NO SPACES BEFORE IT
print("Reached main block...")
train_all_students()