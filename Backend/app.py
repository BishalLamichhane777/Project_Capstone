# app.py
# Flask REST API — connects everything together.
# Updated for DeepFace + MTCNN pipeline.
#
# CHANGES FROM OLD VERSION:
#   - load_all_models()  →  load_all_embeddings()
#   - recognize_face() still returns same dict shape (status/student_id/confidence)
#     so attendance.py and database.py are UNCHANGED
#   - /enroll route now triggers enroll.py instead of train_model.py
#   - confidence field now represents 0–100 score (was LBPH distance, now cosine-based)

from flask import Flask, request, jsonify
import cv2
import numpy as np
import os
import sys
import uuid
from datetime import datetime

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

from recognize  import load_all_embeddings, recognize_face
from attendance import (begin_session,
                        process_recognition,
                        finish_session)
from database   import create_tables, add_student

app = Flask(__name__)

# Global in-memory state
loaded_embeddings = {}   # { student_id: np.array }
active_sessions   = {}   # { session_id: session_info_dict }

# STARTUP
print("Setting up database...")
create_tables()
print("Flask server ready!\n")


# ─────────────────────────────────────────────────────────
# ROUTE 1 — Health Check
# ─────────────────────────────────────────────────────────
@app.route('/ping', methods=['GET'])
def ping():
    """Test if server is running"""
    return jsonify({
        "status" : "ok",
        "message": "Attendance System Server Running",
        "model"  : "DeepFace + MTCNN",
        "time"   : datetime.now().isoformat()
    })


# ─────────────────────────────────────────────────────────
# ROUTE 2 — Enroll Student
# ─────────────────────────────────────────────────────────
@app.route('/enroll', methods=['POST'])
def enroll():
    """
    Admin uploads student photos to generate DeepFace embeddings.
    Report Section FR3:
    'Administration posts student photos, face is learned using model'

    Accepts:
        JSON: { "student_id": "Student_1", "name": "John Doe" }
        FILES: one or more image files (multipart/form-data key = "photos")

    Flow:
        1. Save photos to Dataset/student_id/
        2. Run enroll.py to generate embeddings
        3. Add student to database
    """
    student_id = request.form.get('student_id') \
                 or (request.json or {}).get('student_id')
    name       = request.form.get('name') \
                 or (request.json or {}).get('name', student_id)

    if not student_id:
        return jsonify({
            "status" : "error",
            "message": "student_id required"
        }), 400

    # Save uploaded photos to Dataset folder
    photos_saved = 0
    if 'photos' in request.files:
        student_dir = os.path.join(
            BACKEND_DIR, "Dataset", student_id
        )
        os.makedirs(student_dir, exist_ok=True)

        for photo in request.files.getlist('photos'):
            fname    = f"{student_id}_{photos_saved+1}.jpg"
            savepath = os.path.join(student_dir, fname)
            photo.save(savepath)
            photos_saved += 1

    # Run enrollment to generate embeddings
    from enroll import enroll_student, get_all_photos, DATASET_FOLDER
    student_dir   = os.path.join(DATASET_FOLDER, student_id)
    photo_paths   = []

    if os.path.exists(student_dir):
        from preprocess import get_all_photos as gap
        all_photos  = gap(DATASET_FOLDER)
        photo_paths = all_photos.get(student_id, [])

    if not photo_paths:
        # No photos to process, just register in DB
        add_student(student_id, name)
        return jsonify({
            "status"    : "success",
            "message"   : f"Student {student_id} registered "
                          f"(no photos uploaded yet)",
            "student_id": student_id
        })

    success, failed = enroll_student(student_id, photo_paths)

    if success == 0:
        return jsonify({
            "status" : "error",
            "message": f"No valid faces found in uploaded photos "
                       f"for {student_id}"
        }), 400

    # Add student to database
    emb_path = os.path.join(
        BACKEND_DIR, "embeddings", f"{student_id}_mean.npy"
    )
    add_student(student_id, name,
                model_path=emb_path)

    # Reload embeddings so new student is immediately active
    global loaded_embeddings
    loaded_embeddings = load_all_embeddings()

    return jsonify({
        "status"        : "success",
        "message"       : f"Student {student_id} enrolled",
        "student_id"    : student_id,
        "photos_used"   : success,
        "photos_skipped": failed
    })


# ─────────────────────────────────────────────────────────
# ROUTE 3 — Start Session
# ─────────────────────────────────────────────────────────
@app.route('/session/start', methods=['POST'])
def session_start():
    """
    Teacher starts attendance session.
    Loads all student embeddings into memory.
    Report Section FR5:
    'Teacher decides class, start/end time, mode'
    """
    global loaded_embeddings

    data       = request.json or {}
    class_name = data.get('class_name', 'Unknown Class')
    teacher_id = data.get('teacher_id', 'teacher_001')
    mode       = data.get('mode', 'strict')

    session_id = "session_" + str(uuid.uuid4())[:8]

    # Load embeddings into memory for this session
    print(f"\nLoading embeddings for session {session_id}...")
    loaded_embeddings = load_all_embeddings()

    if not loaded_embeddings:
        return jsonify({
            "status" : "error",
            "message": "No student embeddings found. "
                       "Run enroll.py first."
        }), 500

    # Create session in database
    begin_session(session_id, class_name, teacher_id, mode)

    active_sessions[session_id] = {
        "class_name": class_name,
        "teacher_id": teacher_id,
        "mode"      : mode,
        "start_time": datetime.now().isoformat()
    }

    return jsonify({
        "status"          : "success",
        "session_id"      : session_id,
        "class_name"      : class_name,
        "mode"            : mode,
        "students_loaded" : len(loaded_embeddings),
        "message"         : (f"Session started with "
                             f"{len(loaded_embeddings)} students")
    })


# ─────────────────────────────────────────────────────────
# ROUTE 4 — Recognize Face (Main Route, called every frame)
# ─────────────────────────────────────────────────────────
@app.route('/recognize', methods=['POST'])
def recognize():
    """
    Receives a camera frame from React Native.
    Runs full MTCNN + DeepFace recognition pipeline.
    Logs ENTRY or EXIT event to database.
    Report Section FR6, FR7.
    """
    session_id = request.args.get('session_id')

    if not session_id:
        return jsonify({
            "status" : "error",
            "message": "session_id required"
        }), 400

    if session_id not in active_sessions:
        return jsonify({
            "status" : "error",
            "message": "Session not found or not active"
        }), 404

    if not loaded_embeddings:
        return jsonify({
            "status" : "error",
            "message": "No embeddings loaded"
        }), 500

    # Decode image from request
    if 'image' not in request.files:
        return jsonify({
            "status" : "error",
            "message": "No image in request"
        }), 400

    image_file  = request.files['image']
    image_bytes = image_file.read()
    np_array    = np.frombuffer(image_bytes, dtype=np.uint8)
    frame       = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    if frame is None:
        return jsonify({
            "status" : "error",
            "message": "Could not decode image"
        }), 400

    # Run recognition pipeline
    result = recognize_face(frame, loaded_embeddings)
    status = result["status"]

    if status == "no_face":
        return jsonify({
            "status" : "no_face",
            "message": "No face detected in frame"
        })

    if status == "unknown":
        return jsonify({
            "status"    : "unknown",
            "message"   : "Face not recognized",
            "confidence": result["confidence"],
            "distance"  : result["distance"]
        })

    if status == "recognized":
        student_id = result["student_id"]
        confidence = result["confidence"]

        # Log ENTRY or EXIT event
        event_type = process_recognition(
            student_id = student_id,
            session_id = session_id,
            confidence = confidence
        )

        if event_type is None:
            # Cooldown active — same student scanned again too quickly
            return jsonify({
                "status"    : "cooldown",
                "student_id": student_id,
                "message"   : "Cooldown active, ignoring duplicate"
            })

        return jsonify({
            "status"    : "success",
            "student_id": student_id,
            "event_type": event_type,
            "confidence": confidence,
            "distance"  : result["distance"],
            "message"   : f"{student_id} {event_type}"
        })

    return jsonify({
        "status" : "error",
        "message": "Unexpected recognition result"
    }), 500


# ─────────────────────────────────────────────────────────
# ROUTE 5 — End Session
# ─────────────────────────────────────────────────────────
@app.route('/session/end', methods=['POST'])
def session_end():
    """
    Teacher ends the session.
    Calculates final attendance for all students.
    Report Section FR8.
    """
    data       = request.json or {}
    session_id = data.get('session_id')

    if not session_id:
        return jsonify({
            "status" : "error",
            "message": "session_id required"
        }), 400

    if session_id not in active_sessions:
        return jsonify({
            "status" : "error",
            "message": "Session not found"
        }), 404

    session  = active_sessions[session_id]
    mode     = session["mode"]
    start    = datetime.fromisoformat(session["start_time"])
    duration = (datetime.now() - start).total_seconds() / 60

    results = finish_session(session_id, duration, mode)
    del active_sessions[session_id]

    return jsonify({
        "status"    : "success",
        "session_id": session_id,
        "duration"  : round(duration, 1),
        "results"   : results,
        "message"   : "Session ended successfully"
    })


# ─────────────────────────────────────────────────────────
# ROUTE 6 — Student Attendance History
# ─────────────────────────────────────────────────────────
@app.route('/student/<student_id>/attendance',
           methods=['GET'])
def student_attendance(student_id):
    """
    Student views their own attendance history.
    Report Section FR10.
    """
    from database import get_student_attendance

    rows    = get_student_attendance(student_id)
    history = []

    for row in rows:
        history.append({
            "session_id"   : row["session_id"],
            "class_name"   : row["class_name"],
            "mode"         : row["mode"],
            "date"         : row["start_time"],
            "total_minutes": row["total_minutes"],
            "required"     : row["required_minutes"],
            "status"       : row["status"]
        })

    return jsonify({
        "status"    : "success",
        "student_id": student_id,
        "history"   : history,
        "total"     : len(history)
    })


# ─────────────────────────────────────────────────────────
# RUN SERVER
# ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  ATTENDANCE SYSTEM SERVER")
    print("  DeepFace + MTCNN Pipeline")
    print("=" * 50)
    print("\nServer running at: http://localhost:5000")
    print("Test it: http://localhost:5000/ping")
    print("\nPress CTRL+C to stop\n")

    app.run(
        host  = "0.0.0.0",
        port  = 5000,
        debug = True
    )
