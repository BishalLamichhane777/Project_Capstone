"""Admin routes — class CRUD, session delete, user management, notifications."""

import logging
import datetime as dt
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from database import db
from models.attendance import AttendanceLog, AttendanceRecord
from models.class_model import Class, Enrollment
from models.notification import Notification
from models.session import Session
from models.student import Student
from models.user import User
from models.excuse import WaiverRequest
from middleware.auth_middleware import require_role

logger = logging.getLogger(__name__)

admin_bp = Blueprint("api_admin", __name__)


# ── Class Management ──────────────────────────────────────────────────────


@admin_bp.route("/class/create", methods=["POST"])
@require_role("admin")
def create_class():
    """Create a new class."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    class_name = data.get("class_name", "").strip()
    subject = data.get("subject", "").strip()
    room = data.get("room", "").strip() if data.get("room") else None
    teacher_id = data.get("teacher_id")
    schedule_time_str = data.get("schedule_time")
    duration_minutes = data.get("duration_minutes")

    if not class_name or not subject or duration_minutes is None:
        return (
            jsonify(
                {
                    "error": "class_name, subject, and duration_minutes are required",
                    "status": 400,
                }
            ),
            400,
        )

    try:
        duration_minutes = int(duration_minutes)
    except (ValueError, TypeError):
        return (
            jsonify({"error": "duration_minutes must be an integer", "status": 422}),
            422,
        )

    # Validate teacher exists if provided
    if teacher_id:
        teacher = User.query.get(teacher_id)
        if not teacher or teacher.role != "teacher":
            return (
                jsonify({"error": "Invalid teacher_id — user not found or not a teacher", "status": 404}),
                404,
            )

    schedule_time = None
    if schedule_time_str:
        try:
            schedule_time = datetime.fromisoformat(schedule_time_str)
        except ValueError:
            return (
                jsonify(
                    {"error": "schedule_time must be a valid ISO 8601 datetime", "status": 422}
                ),
                422,
            )

    # ── New fine-grained schedule fields (all optional) ───────────────
    scheduled_date_str     = data.get("scheduled_date")      # "YYYY-MM-DD"
    scheduled_time_str2    = data.get("scheduled_time")      # "HH:MM" or "HH:MM:SS"
    scheduled_end_time_str = data.get("scheduled_end_time")  # "HH:MM" or "HH:MM:SS"

    scheduled_date     = None
    scheduled_time_val = None
    scheduled_end_time = None

    if scheduled_date_str:
        try:
            scheduled_date = dt.date.fromisoformat(scheduled_date_str)
        except ValueError:
            return jsonify({"error": "scheduled_date must be YYYY-MM-DD", "status": 422}), 422

    if scheduled_time_str2:
        try:
            scheduled_time_val = dt.time.fromisoformat(scheduled_time_str2)
        except ValueError:
            return jsonify({"error": "scheduled_time must be HH:MM or HH:MM:SS", "status": 422}), 422

    if scheduled_end_time_str:
        try:
            scheduled_end_time = dt.time.fromisoformat(scheduled_end_time_str)
        except ValueError:
            return jsonify({"error": "scheduled_end_time must be HH:MM or HH:MM:SS", "status": 422}), 422

    if scheduled_time_val and scheduled_end_time and scheduled_end_time <= scheduled_time_val:
        return jsonify({"error": "scheduled_end_time must be after scheduled_time", "status": 422}), 422

    cls = Class(
        class_name=class_name,
        subject=subject,
        room=room,
        teacher_id=teacher_id,
        schedule_time=schedule_time,
        duration_minutes=duration_minutes,
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time_val,
        scheduled_end_time=scheduled_end_time,
    )
    db.session.add(cls)
    db.session.commit()

    # Optional batch auto-enrollment
    batch_id = data.get("batch_id")
    auto_enrolled = 0
    if batch_id:
        from models.batch import Batch, BatchStudent
        batch = Batch.query.get(batch_id)
        if batch:
            for bs in batch.batch_students:
                existing = Enrollment.query.filter_by(
                    student_id=bs.student_id, class_id=cls.class_id
                ).first()
                if not existing:
                    db.session.add(Enrollment(
                        student_id=bs.student_id, class_id=cls.class_id
                    ))
                    auto_enrolled += 1
            db.session.commit()

    return jsonify({
        "class_id":     cls.class_id,
        "message":      "Class created",
        "auto_enrolled": auto_enrolled,
    }), 201


@admin_bp.route("/class/list", methods=["GET"])
@require_role("admin", "teacher")
def list_classes():
    """Return all classes with teacher name and enrolled student count."""
    classes = Class.query.all()

    results = []
    for cls in classes:
        enrolled_count = Enrollment.query.filter_by(class_id=cls.class_id).count()
        class_data = cls.to_dict()
        class_data["enrolled_count"] = enrolled_count
        results.append(class_data)

    return jsonify(results), 200


@admin_bp.route("/class/<int:class_id>", methods=["PUT"])
@require_role("admin")
def update_class(class_id):
    """Update class fields."""
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({"error": "Class not found", "status": 404}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    if "class_name" in data:
        cls.class_name = data["class_name"].strip()
    if "subject" in data:
        cls.subject = data["subject"].strip()
    if "room" in data:
        cls.room = data["room"].strip() if data["room"] else None
    if "teacher_id" in data:
        teacher_id = data["teacher_id"]
        if teacher_id:
            teacher = User.query.get(teacher_id)
            if not teacher or teacher.role != "teacher":
                return (
                    jsonify({"error": "Invalid teacher_id", "status": 404}),
                    404,
                )
        cls.teacher_id = teacher_id
    if "schedule_time" in data:
        if data["schedule_time"]:
            try:
                cls.schedule_time = datetime.fromisoformat(data["schedule_time"])
            except ValueError:
                return (
                    jsonify({"error": "schedule_time must be ISO 8601", "status": 422}),
                    422,
                )
        else:
            cls.schedule_time = None
    if "duration_minutes" in data:
        try:
            cls.duration_minutes = int(data["duration_minutes"])
        except (ValueError, TypeError):
            return (
                jsonify({"error": "duration_minutes must be an integer", "status": 422}),
                422,
            )

    # Fine-grained schedule fields
    if "scheduled_date" in data:
        if data["scheduled_date"]:
            try:
                cls.scheduled_date = dt.date.fromisoformat(data["scheduled_date"])
            except ValueError:
                return jsonify({"error": "scheduled_date must be YYYY-MM-DD", "status": 422}), 422
        else:
            cls.scheduled_date = None
    if "scheduled_time" in data:
        if data["scheduled_time"]:
            try:
                cls.scheduled_time = dt.time.fromisoformat(data["scheduled_time"])
            except ValueError:
                return jsonify({"error": "scheduled_time must be HH:MM or HH:MM:SS", "status": 422}), 422
        else:
            cls.scheduled_time = None
    if "scheduled_end_time" in data:
        if data["scheduled_end_time"]:
            try:
                cls.scheduled_end_time = dt.time.fromisoformat(data["scheduled_end_time"])
            except ValueError:
                return jsonify({"error": "scheduled_end_time must be HH:MM or HH:MM:SS", "status": 422}), 422
        else:
            cls.scheduled_end_time = None
    if cls.scheduled_time and cls.scheduled_end_time and cls.scheduled_end_time <= cls.scheduled_time:
        return jsonify({"error": "scheduled_end_time must be after scheduled_time", "status": 422}), 422

    db.session.commit()

    return jsonify({"message": "Class updated"}), 200


@admin_bp.route("/class/<int:class_id>/schedule", methods=["PUT"])
@require_role("admin")
def set_class_schedule(class_id):
    """Set or update the schedule for a class.

    Body (all fields optional — omit a field to clear it):
      { "scheduled_date": "YYYY-MM-DD",
        "scheduled_time": "HH:MM",
        "scheduled_end_time": "HH:MM" }
    """
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({"error": "Class not found", "status": 404}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    if "scheduled_date" in data:
        if data["scheduled_date"]:
            try:
                cls.scheduled_date = dt.date.fromisoformat(data["scheduled_date"])
            except ValueError:
                return jsonify({"error": "scheduled_date must be YYYY-MM-DD", "status": 422}), 422
        else:
            cls.scheduled_date = None

    if "scheduled_time" in data:
        if data["scheduled_time"]:
            try:
                cls.scheduled_time = dt.time.fromisoformat(data["scheduled_time"])
            except ValueError:
                return jsonify({"error": "scheduled_time must be HH:MM or HH:MM:SS", "status": 422}), 422
        else:
            cls.scheduled_time = None

    if "scheduled_end_time" in data:
        if data["scheduled_end_time"]:
            try:
                cls.scheduled_end_time = dt.time.fromisoformat(data["scheduled_end_time"])
            except ValueError:
                return jsonify({"error": "scheduled_end_time must be HH:MM or HH:MM:SS", "status": 422}), 422
        else:
            cls.scheduled_end_time = None

    if cls.scheduled_time and cls.scheduled_end_time and cls.scheduled_end_time <= cls.scheduled_time:
        return jsonify({"error": "scheduled_end_time must be after scheduled_time", "status": 422}), 422

    db.session.commit()
    logger.info(
        "Schedule updated for class_id=%s: date=%s time=%s end=%s",
        class_id, cls.scheduled_date, cls.scheduled_time, cls.scheduled_end_time,
    )

    enrolled_count = Enrollment.query.filter_by(class_id=class_id).count()
    class_data = cls.to_dict()
    class_data["enrolled_count"] = enrolled_count
    return jsonify(class_data), 200


@admin_bp.route("/class/<int:class_id>", methods=["DELETE"])
@require_role("admin")
def delete_class(class_id):
    """Delete a class if no ACTIVE sessions exist.

    Also deletes associated sessions, logs, records, and enrollments.
    """
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({"error": "Class not found", "status": 404}), 404

    # Check for active sessions
    active_sessions = Session.query.filter_by(
        class_id=class_id, status="ACTIVE"
    ).count()
    if active_sessions > 0:
        return (
            jsonify(
                {
                    "error": "Cannot delete class with active sessions. End all sessions first.",
                    "status": 400,
                }
            ),
            400,
        )

    # Delete all related data
    sessions = Session.query.filter_by(class_id=class_id).all()
    for s in sessions:
        AttendanceLog.query.filter_by(session_id=s.session_id).delete()
        AttendanceRecord.query.filter_by(session_id=s.session_id).delete()
        db.session.delete(s)

    Enrollment.query.filter_by(class_id=class_id).delete()
    db.session.delete(cls)
    db.session.commit()

    return jsonify({"message": "Class deleted"}), 200


# ── Session Management ────────────────────────────────────────────────────


@admin_bp.route("/session/<session_id>", methods=["DELETE"])
@require_role("admin")
def delete_session(session_id):
    """Delete a session and all its attendance data."""
    session = Session.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found", "status": 404}), 404

    AttendanceLog.query.filter_by(session_id=session_id).delete()
    AttendanceRecord.query.filter_by(session_id=session_id).delete()
    db.session.delete(session)
    db.session.commit()

    return jsonify({"message": "Session deleted"}), 200


# ── User Management ──────────────────────────────────────────────────────


@admin_bp.route("/users", methods=["GET"])
@require_role("admin")
def list_users():
    """Return all users with optional role filter (?role=teacher|student|admin)."""
    role_filter = request.args.get("role", "").strip()

    query = User.query
    if role_filter and role_filter in User.VALID_ROLES:
        query = query.filter_by(role=role_filter)

    users = query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@admin_bp.route("/user/<int:user_id>", methods=["PUT"])
@require_role("admin")
def update_user(user_id):
    """Update user fields (not password, not role)."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    if "fullname" in data:
        user.fullname = data["fullname"].strip()
    if "phone" in data:
        user.phone = data["phone"].strip() if data["phone"] else None
    if "device_token" in data:
        user.device_token = data["device_token"].strip() if data["device_token"] else None

    db.session.commit()

    return jsonify({"message": "User updated"}), 200


# ── Notifications ─────────────────────────────────────────────────────────


@admin_bp.route("/notifications", methods=["GET"])
@require_role("admin")
def admin_notifications():
    """Return all unread notifications for admin users. Marks them as read."""
    user_id = g.current_user["user_id"]

    notifs = (
        Notification.query.filter_by(user_id=user_id, is_read=False)
        .order_by(Notification.sent_at.desc())
        .all()
    )

    results = [n.to_dict() for n in notifs]

    # Mark as read
    for n in notifs:
        n.is_read = True

    db.session.commit()

    return jsonify(results), 200


# ── Dashboard Stats ───────────────────────────────────────────────────────

@admin_bp.route("/stats", methods=["GET"])
@require_role("admin")
def get_stats():
    """Return overall attendance stats for the dashboard."""
    from datetime import datetime, time
    
    total_students = User.query.filter_by(role='student').count()
    
    today_start = datetime.combine(datetime.today(), time.min)
    today_end = datetime.combine(datetime.today(), time.max)
    
    sessions_today = Session.query.filter(
        Session.start_time >= today_start, 
        Session.start_time <= today_end
    ).count()
    
    present_today = db.session.query(AttendanceRecord).join(Session).filter(
        Session.start_time >= today_start, 
        Session.start_time <= today_end,
        AttendanceRecord.status == 'present'
    ).count()
    
    absent_today = db.session.query(AttendanceRecord).join(Session).filter(
        Session.start_time >= today_start, 
        Session.start_time <= today_end,
        AttendanceRecord.status == 'absent'
    ).count()
    
    waivers_pending = WaiverRequest.query.filter_by(status='pending').count()
    
    total_today = present_today + absent_today
    attendance_rate = round((present_today / total_today * 100), 1) if total_today > 0 else 100

    return jsonify({
        "total_students": total_students,
        "sessions_today": sessions_today,
        "present_today": present_today,
        "absent_today": absent_today,
        "waivers_pending": waivers_pending,
        "attendance_rate": attendance_rate
    }), 200


@admin_bp.route("/recent-sessions", methods=["GET"])
@require_role("admin")
def get_recent_sessions():
    """Return the most recent sessions."""
    sessions = Session.query.order_by(Session.start_time.desc()).limit(5).all()
    results = []
    for s in sessions:
        cls = Class.query.get(s.class_id)
        present = AttendanceRecord.query.filter_by(session_id=s.session_id, status='present').count()
        absent = AttendanceRecord.query.filter_by(session_id=s.session_id, status='absent').count()
        results.append({
            "session_id": s.session_id,
            "class_name": cls.class_name if cls else "Unknown",
            "subject": cls.subject if cls else "Unknown",
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "status": s.status,
            "present_count": present,
            "absent_count": absent
        })
    return jsonify(results), 200


# ── Unified Student Registration ─────────────────────────────────────────


@admin_bp.route("/register-student", methods=["POST"])
@require_role("admin")
def register_student():
    """Create a User, Student, and enroll their face in one atomic operation.

    Accepts multipart/form-data:
      - full_name   (string, required)
      - email       (string, required)
      - password    (string, required)
      - roll_number (string, required)
      - phone       (string, optional)
      - images      (multiple image files, required, min 3, max 10)

    The DB records are NOT committed until face enrollment succeeds.
    On any failure the session is rolled back so no partial state is left.
    """
    import bcrypt as _bcrypt
    from services.face_recognition.enroll import enroll_student_from_images
    from services.face_recognition import reload_embeddings

    # ── 1. Parse required text fields ────────────────────────────────
    full_name   = request.form.get("full_name",   "").strip()
    email       = request.form.get("email",       "").strip()
    password    = request.form.get("password",    "")
    roll_number = request.form.get("roll_number", "").strip()
    phone       = request.form.get("phone",       "").strip() or None

    # Validate all required text fields are present
    if not full_name or not email or not password or not roll_number:
        return (
            jsonify({
                "error": "full_name, email, password, and roll_number are all required",
                "status": 400,
            }),
            400,
        )

    # ── 2. Validate image files ───────────────────────────────────────
    images = request.files.getlist("images")
    # Filter out any empty file slots (browser sends empty entries sometimes)
    images = [f for f in images if f and f.filename != ""]

    if len(images) < 3:
        return (
            jsonify({
                "error": f"At least 3 face images are required (received {len(images)})",
                "status": 400,
            }),
            400,
        )

    if len(images) > 10:
        return (
            jsonify({
                "error": f"Maximum 10 images allowed (received {len(images)})",
                "status": 400,
            }),
            400,
        )

    # ── 3. Check for duplicate email ─────────────────────────────────
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists", "status": 409}), 409

    # ── 4. Check for duplicate roll_number ───────────────────────────
    if Student.query.filter_by(roll_number=roll_number).first():
        return jsonify({"error": "Roll number already exists", "status": 409}), 409

    # ── 5. Hash password (same method as existing register endpoint) ──
    salt          = _bcrypt.gensalt()
    password_hash = _bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    try:
        # ── 6. Create User record (role = 'student') ──────────────────
        user = User(
            fullname=full_name,
            email=email,
            password_hash=password_hash,
            role="student",
            phone=phone,
        )
        db.session.add(user)
        # flush to get user.id without committing yet
        db.session.flush()

        # ── 7. Create Student record linked to the new user ───────────
        # face_label is set to roll_number — used as the embedding file key
        student = Student(
            user_id=user.id,
            roll_number=roll_number,
            program="",          # program not collected here; update separately if needed
            face_label=roll_number,
        )
        db.session.add(student)
        # flush to get student.student_id without committing yet
        db.session.flush()

        logger.info(
            "register-student: user_id=%s student_id=%s roll=%s — starting face enrollment",
            user.id, student.student_id, roll_number,
        )

        # ── 8. Run face enrollment — DB commit is withheld until this succeeds ──
        # enroll_student_from_images reads each FileStorage in-memory (no temp files).
        # Returns (success: bool, message: str, skip_reasons: list[str])
        success, message, skip_reasons = enroll_student_from_images(
            face_label=roll_number,
            image_files=images,
        )

        if not success:
            # Enrollment produced zero valid embeddings — roll back both records
            db.session.rollback()
            logger.warning(
                "register-student: face enrollment failed for roll=%s — rolled back. reason: %s",
                roll_number, message,
            )
            return (
                jsonify({
                    "error": f"Face enrollment failed: {message}",
                    "skip_reasons": skip_reasons,
                    "status": 500,
                }),
                500,
            )

        # ── 9. Commit DB only after enrollment has succeeded ──────────
        db.session.commit()

        # ── 10. Refresh the in-process embedding cache ────────────────
        # Must happen AFTER commit so the student row exists if anything
        # in reload_embeddings() queries the DB.
        reload_embeddings()

        images_processed = len(images) - len(skip_reasons)

        logger.info(
            "register-student: SUCCESS user_id=%s student_id=%s roll=%s images_processed=%s",
            user.id, student.student_id, roll_number, images_processed,
        )

        # ── 11. Return 201 with IDs and enrollment summary ────────────
        return (
            jsonify({
                "message":          "Student registered and face enrolled successfully",
                "user_id":          user.id,
                "student_id":       student.student_id,
                "face_label":       roll_number,
                "images_processed": images_processed,
            }),
            201,
        )

    except Exception as exc:
        # Catch any unexpected error (DB constraint, network, etc.) and roll back
        db.session.rollback()
        logger.exception(
            "register-student: unexpected error for roll=%s: %s",
            roll_number, exc,
        )
        return (
            jsonify({
                "error": f"Registration failed: {str(exc)}",
                "status": 500,
            }),
            500,
        )


# ── Face Enrollment ───────────────────────────────────────────────────────


@admin_bp.route("/enroll-face", methods=["POST"])
@require_role("admin")
def enroll_face():
    """Enroll a student for face recognition from uploaded photos.

    Accepts multipart/form-data:
      - student_id  (int, form field, required)
      - photos      (one or more image files, required)

    The student's roll_number is used as the face_label / embedding key
    because it is already enforced UNIQUE on the students table, making it
    a safe and human-readable identifier in the embeddings folder.

    On success the student's face_label column is updated and the in-process
    embeddings cache is refreshed so subsequent scans immediately recognise
    the newly enrolled student.
    """
    from services.face_recognition.enroll import enroll_student_from_images
    from services.face_recognition import reload_embeddings

    # ── 1. Validate inputs ────────────────────────────────────────────
    student_id_raw = request.form.get("student_id", "").strip()
    if not student_id_raw:
        return jsonify({"error": "student_id is required", "status": 400}), 400

    try:
        student_id = int(student_id_raw)
    except ValueError:
        return jsonify({"error": "student_id must be an integer", "status": 422}), 422

    photo_files = request.files.getlist("photos")
    if not photo_files or all(f.filename == "" for f in photo_files):
        return jsonify({"error": "At least one photo file is required", "status": 400}), 400

    # ── 2. Resolve student ────────────────────────────────────────────
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found", "status": 404}), 404

    # roll_number is UNIQUE on the students table — safe as embedding key
    face_label = student.roll_number

    logger.info(
        "Face enrollment started for student_id=%s face_label=%s (%d photo(s))",
        student_id, face_label, len(photo_files),
    )

    # ── 3. Generate embeddings and save mean .npy ─────────────────────
    try:
        success, message, skip_reasons = enroll_student_from_images(
            face_label, photo_files
        )
    except Exception as exc:
        logger.exception(
            "Unexpected error during face enrollment for student_id=%s: %s",
            student_id, exc,
        )
        return (
            jsonify({"error": "Face enrollment failed unexpectedly", "status": 500}),
            500,
        )

    if not success:
        logger.warning(
            "Face enrollment produced no valid embeddings for student_id=%s: %s",
            student_id, message,
        )
        return (
            jsonify({
                "error"       : message,
                "skip_reasons": skip_reasons,
                "status"      : 422,
            }),
            422,
        )

    photos_used    = len(photo_files) - len(skip_reasons)
    photos_skipped = len(skip_reasons)

    # ── 4. Persist face_label on the student row ──────────────────────
    try:
        student.face_label = face_label
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.exception(
            "DB error updating face_label for student_id=%s: %s",
            student_id, exc,
        )
        return (
            jsonify({"error": "Failed to update student record", "status": 500}),
            500,
        )

    # ── 5. Refresh in-process embeddings cache ────────────────────────
    # Affects only the gunicorn worker handling this request. With
    # --preload + multiple workers other workers keep their old cache
    # until they are next restarted. Acceptable for low-traffic setups.
    reload_embeddings()

    logger.info(
        "Face enrollment complete for student_id=%s face_label=%s "
        "(used=%d skipped=%d)",
        student_id, face_label, photos_used, photos_skipped,
    )

    return (
        jsonify({
            "message"       : "Student enrolled for face recognition",
            "student_id"    : student_id,
            "face_label"    : face_label,
            "photos_used"   : photos_used,
            "photos_skipped": photos_skipped,
            "skip_reasons"  : skip_reasons,
        }),
        201,
    )
