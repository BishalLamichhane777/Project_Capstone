"""Admin routes — class CRUD, session delete, user management, notifications."""

import logging
import datetime as dt
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, case, or_

from database import db, utc_iso
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
        from models.batch_class_link import BatchClassLink
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

            # Persist the permanent batch↔class link so:
            # (a) future batch membership changes auto-sync to this class, and
            # (b) batch analytics endpoints (which count classes via BatchClassLink)
            #     correctly include this class.
            # Mirrors the exact logic in enroll_batch_into_class (routes/batch.py).
            existing_link = BatchClassLink.query.filter_by(
                batch_id=batch_id, class_id=cls.class_id
            ).first()
            if not existing_link:
                db.session.add(BatchClassLink(batch_id=batch_id, class_id=cls.class_id))

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
    """Update user fields — fullname, email, phone, password, device_token.

    Returns the full updated user object so the frontend can update its
    local state without a separate fetch.
    """
    import bcrypt as _bcrypt

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    if "fullname" in data:
        fullname = (data["fullname"] or "").strip()
        if not fullname:
            return jsonify({"error": "fullname cannot be empty", "status": 400}), 400
        user.fullname = fullname

    if "email" in data:
        new_email = (data["email"] or "").strip().lower()
        if not new_email:
            return jsonify({"error": "email cannot be empty", "status": 400}), 400
        # Uniqueness check — ignore this user's own current email
        existing = User.query.filter(User.email == new_email, User.id != user_id).first()
        if existing:
            return jsonify({"error": "Email already in use", "status": 409}), 409
        user.email = new_email

    if "phone" in data:
        user.phone = data["phone"].strip() if data["phone"] else None

    if "password" in data:
        new_password = data["password"]
        if not new_password or len(str(new_password)) < 6:
            return jsonify({"error": "Password must be at least 6 characters", "status": 400}), 400
        salt = _bcrypt.gensalt()
        user.password_hash = _bcrypt.hashpw(
            str(new_password).encode("utf-8"), salt
        ).decode("utf-8")

    if "device_token" in data:
        user.device_token = data["device_token"].strip() if data["device_token"] else None

    db.session.commit()
    logger.info("Admin updated user_id=%s", user_id)
    return jsonify(user.to_dict()), 200


@admin_bp.route("/user/<int:user_id>/deactivate", methods=["PUT"])
@require_role("admin")
def deactivate_user(user_id):
    """Soft-delete a user by setting is_active = False.

    Does NOT delete any rows — classes, sessions, attendance records, and
    notifications are fully preserved. The user simply cannot log in.
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    if not user.is_active:
        return jsonify({"error": "User is already deactivated", "status": 409}), 409

    # Prevent an admin from accidentally deactivating themselves
    if g.current_user["user_id"] == user_id:
        return jsonify({"error": "You cannot deactivate your own account", "status": 400}), 400

    user.is_active = False
    db.session.commit()
    logger.info("Admin deactivated user_id=%s role=%s", user_id, user.role)
    return jsonify({
        "message": f"User '{user.fullname}' has been deactivated.",
        "user": user.to_dict(),
    }), 200


@admin_bp.route("/user/<int:user_id>/reactivate", methods=["PUT"])
@require_role("admin")
def reactivate_user(user_id):
    """Re-enable a previously deactivated user (sets is_active = True)."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    if user.is_active:
        return jsonify({"error": "User is already active", "status": 409}), 409

    user.is_active = True
    db.session.commit()
    logger.info("Admin reactivated user_id=%s role=%s", user_id, user.role)
    return jsonify({
        "message": f"User '{user.fullname}' has been reactivated.",
        "user": user.to_dict(),
    }), 200


# ── Send Notification ────────────────────────────────────────────────────


@admin_bp.route("/send-notification", methods=["POST"])
@require_role("admin")
def send_notification():
    """Send a push notification and persist Notification rows.

    Body (JSON):
      {
        "title":       "string (required)",
        "message":     "string (required)",
        "target_type": "all_students" | "all_teachers" | "specific_student"
                       | "specific_teacher" | "batch"  (required),
        "target_id":   int  -- required when target_type is specific_student,
                                specific_teacher, or batch
      }

    Returns:
      { "recipients": N, "push_sent": K, "message": "..." }
    """
    from services.notifications import _send_fcm_multicast

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    title       = (data.get("title") or "").strip()
    message_txt = (data.get("message") or "").strip()
    target_type = (data.get("target_type") or "").strip()
    target_id   = data.get("target_id")

    if not title or not message_txt:
        return jsonify({"error": "title and message are required", "status": 400}), 400

    valid_targets = {
        "all_students", "all_teachers",
        "specific_student", "specific_teacher", "batch",
    }
    if target_type not in valid_targets:
        return jsonify({
            "error": f"target_type must be one of: {', '.join(sorted(valid_targets))}",
            "status": 400,
        }), 400

    if target_type in ("specific_student", "specific_teacher", "batch") and not target_id:
        return jsonify({
            "error": f"target_id is required when target_type is '{target_type}'",
            "status": 400,
        }), 400

    # ── Resolve recipient users ───────────────────────────────────────
    recipient_users: list[User] = []

    if target_type == "all_students":
        recipient_users = User.query.filter_by(role="student").all()

    elif target_type == "all_teachers":
        recipient_users = User.query.filter_by(role="teacher").all()

    elif target_type == "specific_student":
        student = Student.query.get(int(target_id))
        if not student:
            return jsonify({"error": "Student not found", "status": 404}), 404
        user = User.query.get(student.user_id)
        if not user:
            return jsonify({"error": "User account not found for student", "status": 404}), 404
        recipient_users = [user]

    elif target_type == "specific_teacher":
        user = User.query.filter_by(id=int(target_id), role="teacher").first()
        if not user:
            return jsonify({"error": "Teacher not found", "status": 404}), 404
        recipient_users = [user]

    elif target_type == "batch":
        from models.batch import Batch, BatchStudent
        batch = Batch.query.get(int(target_id))
        if not batch:
            return jsonify({"error": "Batch not found", "status": 404}), 404
        for bs in batch.batch_students:
            student_user = User.query.get(bs.student.user_id) if bs.student else None
            if student_user:
                recipient_users.append(student_user)

    if not recipient_users:
        return jsonify({
            "recipients": 0,
            "push_sent":  0,
            "message":    "No recipients found for the selected target.",
        }), 200

    # ── Persist Notification rows ─────────────────────────────────────
    notif_type = "General"   # stored in the type column

    for user in recipient_users:
        db.session.add(Notification(
            user_id=user.id,
            type=notif_type,
            message=f"{title}: {message_txt}",
        ))

    # Also save a copy for the admin who sent it so it appears in their bell
    admin_user_id = g.current_user["user_id"]
    admin_ids_in_recipients = {u.id for u in recipient_users}
    if admin_user_id not in admin_ids_in_recipients:
        target_label = {
            "all_students":     "All Students",
            "all_teachers":     "All Teachers",
            "specific_student": "Specific Student",
            "specific_teacher": "Specific Teacher",
            "batch":            "Batch",
        }.get(target_type, target_type)
        db.session.add(Notification(
            user_id=admin_user_id,
            type="General",
            message=f"[Sent to {target_label}] {title}: {message_txt}",
        ))

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.exception("send-notification: DB commit failed: %s", exc)
        return jsonify({"error": "Failed to save notifications", "status": 500}), 500

    # ── Send push notifications to devices that have a token ──────────
    tokens = [u.device_token for u in recipient_users if u.device_token]
    push_sent = 0
    if tokens:
        success = _send_fcm_multicast(device_tokens=tokens, title=title, body=message_txt)
        push_sent = len(tokens) if success else 0

    logger.info(
        "send-notification: target=%s id=%s recipients=%d push_tokens=%d push_sent=%d",
        target_type, target_id, len(recipient_users), len(tokens), push_sent,
    )

    return jsonify({
        "recipients": len(recipient_users),
        "push_sent":  push_sent,
        "message":    (
            f"Notification sent to {len(recipient_users)} recipient(s). "
            f"{push_sent} push notification(s) delivered."
        ),
    }), 200


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
    today_end   = datetime.combine(datetime.today(), time.max)

    sessions_today = Session.query.filter(
        Session.start_time >= today_start,
        Session.start_time <= today_end
    ).count()

    # Status values are title-cased in the model: 'Present' / 'Absent' / 'Pending'
    present_today = db.session.query(AttendanceRecord).join(Session).filter(
        Session.start_time >= today_start,
        Session.start_time <= today_end,
        AttendanceRecord.status == 'Present'
    ).count()

    absent_today = db.session.query(AttendanceRecord).join(Session).filter(
        Session.start_time >= today_start,
        Session.start_time <= today_end,
        AttendanceRecord.status == 'Absent'
    ).count()

    waivers_pending = WaiverRequest.query.filter_by(status='Pending').count()

    total_today = present_today + absent_today
    attendance_rate = round((present_today / total_today * 100), 1) if total_today > 0 else 0

    return jsonify({
        "total_students":  total_students,
        "sessions_today":  sessions_today,
        "present_today":   present_today,
        "absent_today":    absent_today,
        "waivers_pending": waivers_pending,
        "attendance_rate": attendance_rate,
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
            "start_time": utc_iso(s.start_time),
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


# ── Class Student Roster ─────────────────────────────────────────────────


@admin_bp.route("/classes/<int:class_id>/students", methods=["GET"])
@require_role("admin")
def class_student_roster(class_id):
    """Return enrolled students for a class with per-student attendance stats.

    Query params:
      search     — partial match on fullname or roll_number (case-insensitive)
      risk       — 'all' (default) | 'at_risk' (< 75%) | 'good' (>= 75%)
      sort       — 'attendance_asc' (default) | 'attendance_desc' | 'name_asc'
      page       — 1-based page number (default 1)
      page_size  — results per page (default 25)

    Response:
      {
        "class_id":    int,
        "class_name":  str,
        "subject":     str,
        "session_count": int,
        "total_count": int,          # total matching students before pagination
        "page":        int,
        "page_size":   int,
        "students": [ { student_id, fullname, roll_number,
                        session_count, present_count, absent_count,
                        attendance_percent, is_at_risk }, ... ]
      }
    """
    # Reuse the same threshold defined in routes/batch.py to stay consistent
    from routes.batch import AT_RISK_THRESHOLD

    # ── 1. Validate class ────────────────────────────────────────────
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({"error": f"Class {class_id} not found", "status": 404}), 404

    # ── 2. Parse query params ────────────────────────────────────────
    search    = (request.args.get("search", "") or "").strip().lower()
    risk      = (request.args.get("risk",   "all") or "all").strip().lower()
    sort      = (request.args.get("sort",   "attendance_asc") or "attendance_asc").strip().lower()

    try:
        page      = max(1, int(request.args.get("page", 1)))
        page_size = max(1, min(100, int(request.args.get("page_size", 25))))
    except (ValueError, TypeError):
        return jsonify({"error": "page and page_size must be integers", "status": 400}), 400

    valid_risk = {"all", "at_risk", "good"}
    valid_sort = {"attendance_asc", "attendance_desc", "name_asc"}
    if risk not in valid_risk:
        return jsonify({"error": f"risk must be one of: {', '.join(sorted(valid_risk))}", "status": 400}), 400
    if sort not in valid_sort:
        return jsonify({"error": f"sort must be one of: {', '.join(sorted(valid_sort))}", "status": 400}), 400

    # ── 3. Session count for this class (same for every student) ─────
    session_count = db.session.query(
        func.count(Session.session_id)
    ).filter(Session.class_id == class_id).scalar() or 0

    # ── 4. Per-student attendance aggregation subquery ───────────────
    # sessions for this class → used to scope AttendanceRecord joins
    class_session_ids = db.session.query(Session.session_id).filter(
        Session.class_id == class_id
    ).subquery()

    # One row per student: present and absent counts from AttendanceRecord
    agg = (
        db.session.query(
            AttendanceRecord.student_id,
            func.sum(
                case((AttendanceRecord.status == "Present", 1), else_=0)
            ).label("present_count"),
            func.sum(
                case((AttendanceRecord.status == "Absent", 1), else_=0)
            ).label("absent_count"),
            func.count(AttendanceRecord.record_id).label("record_count"),
        )
        .filter(AttendanceRecord.session_id.in_(class_session_ids))
        .group_by(AttendanceRecord.student_id)
        .subquery()
    )

    # ── 5. Main query: Enrollment → Student → User → agg (left join) ─
    query = (
        db.session.query(
            Student.student_id,
            User.fullname,
            Student.roll_number,
            func.coalesce(agg.c.present_count, 0).label("present_count"),
            func.coalesce(agg.c.absent_count,  0).label("absent_count"),
            func.coalesce(agg.c.record_count,  0).label("record_count"),
        )
        .join(Enrollment, Enrollment.student_id == Student.student_id)
        .join(User,       User.id == Student.user_id)
        .outerjoin(agg,   agg.c.student_id == Student.student_id)
        .filter(Enrollment.class_id == class_id)
    )

    # ── 6. Search filter (SQL LIKE, case-insensitive via lower()) ────
    if search:
        query = query.filter(
            or_(
                func.lower(User.fullname).contains(search),
                func.lower(Student.roll_number).contains(search),
            )
        )

    # ── 7. Fetch all matching rows (needed for risk filter + total) ──
    # We compute attendance_percent in Python because SQLite doesn't support
    # CASE … / … in a way that plays nicely with the coalesce subquery alias
    # ordering — all rows fit easily in memory for a class roster.
    all_rows = query.all()

    # ── 8. Compute derived fields and apply risk filter ───────────────
    students_data = []
    for row in all_rows:
        rec_count = row.record_count or 0
        pres      = row.present_count or 0
        abs_      = row.absent_count  or 0

        if rec_count > 0:
            att_pct = round(pres / rec_count * 100.0, 1)
        else:
            # No records yet → treat as 0 % if sessions exist, else null
            att_pct = 0.0 if session_count > 0 else None

        is_at_risk = (att_pct is not None) and (att_pct < AT_RISK_THRESHOLD)

        # Risk filter
        if risk == "at_risk" and not is_at_risk:
            continue
        if risk == "good" and is_at_risk:
            continue

        students_data.append({
            "student_id":         row.student_id,
            "fullname":           row.fullname,
            "roll_number":        row.roll_number,
            "session_count":      session_count,
            "present_count":      pres,
            "absent_count":       abs_,
            "attendance_percent": att_pct,
            "is_at_risk":         is_at_risk,
        })

    # ── 9. Sort ───────────────────────────────────────────────────────
    if sort == "attendance_asc":
        # None sorts last (students with no sessions go to the bottom)
        students_data.sort(key=lambda s: (
            s["attendance_percent"] is None,
            s["attendance_percent"] if s["attendance_percent"] is not None else 0,
        ))
    elif sort == "attendance_desc":
        students_data.sort(key=lambda s: (
            s["attendance_percent"] is None,
            -(s["attendance_percent"] if s["attendance_percent"] is not None else 0),
        ))
    elif sort == "name_asc":
        students_data.sort(key=lambda s: s["fullname"].lower())

    # ── 10. Pagination ────────────────────────────────────────────────
    total_count  = len(students_data)
    offset       = (page - 1) * page_size
    page_results = students_data[offset: offset + page_size]

    logger.info(
        "class_student_roster: class_id=%s search=%r risk=%s sort=%s "
        "total=%d page=%d/%d",
        class_id, search, risk, sort,
        total_count, page, (total_count + page_size - 1) // page_size if page_size else 1,
    )

    return jsonify({
        "class_id":      class_id,
        "class_name":    cls.class_name,
        "subject":       cls.subject,
        "session_count": session_count,
        "total_count":   total_count,
        "page":          page,
        "page_size":     page_size,
        "at_risk_threshold_percent": AT_RISK_THRESHOLD,
        "students":      page_results,
    }), 200


# ── Student Detail ────────────────────────────────────────────────────────────


@admin_bp.route("/students/<int:student_id>/detail", methods=["GET"])
@require_role("admin")
def student_detail(student_id):
    """Return full attendance detail for a single student.

    Response shape:
      {
        student_id, fullname, roll_number, program, year_of_study,
        overall_attendance_percent,   # null if no sessions yet
        total_sessions, total_present, total_absent,
        classes: [
          { class_id, class_name, subject,
            session_count, present_count, absent_count,
            attendance_percent }   # null if no sessions for that class
        ],
        recent_sessions: [           # most recent 10 across all classes
          { session_id, class_name, date, status, waived }
        ]
      }
    """
    # ── 1. Validate student ──────────────────────────────────────────
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"error": f"Student {student_id} not found", "status": 404}), 404

    user = student.user

    # ── 2. All classes this student is enrolled in ───────────────────
    enrollments = Enrollment.query.filter_by(student_id=student_id).all()
    enrolled_class_ids = [e.class_id for e in enrollments]

    # ── 3. Aggregate attendance per class in one SQL query ────────────
    # Sessions scoped to enrolled classes
    class_session_ids_subq = (
        db.session.query(Session.session_id, Session.class_id)
        .filter(Session.class_id.in_(enrolled_class_ids))
        .subquery()
    ) if enrolled_class_ids else None

    per_class_agg = {}
    if enrolled_class_ids and class_session_ids_subq is not None:
        rows = (
            db.session.query(
                class_session_ids_subq.c.class_id,
                func.count(AttendanceRecord.record_id).label("total"),
                func.sum(
                    case((AttendanceRecord.status == "Present", 1), else_=0)
                ).label("present"),
                func.sum(
                    case((AttendanceRecord.status == "Absent", 1), else_=0)
                ).label("absent"),
            )
            .join(
                AttendanceRecord,
                AttendanceRecord.session_id == class_session_ids_subq.c.session_id,
            )
            .filter(AttendanceRecord.student_id == student_id)
            .group_by(class_session_ids_subq.c.class_id)
            .all()
        )
        for row in rows:
            per_class_agg[row.class_id] = {
                "total":   row.total,
                "present": row.present,
                "absent":  row.absent,
            }

    # Session counts per class (not just sessions the student attended)
    session_count_by_class = {}
    if enrolled_class_ids:
        sc_rows = (
            db.session.query(
                Session.class_id,
                func.count(Session.session_id).label("cnt"),
            )
            .filter(Session.class_id.in_(enrolled_class_ids))
            .group_by(Session.class_id)
            .all()
        )
        session_count_by_class = {r.class_id: r.cnt for r in sc_rows}

    # ── 4. Build per-class list ───────────────────────────────────────
    classes_by_id = {
        c.class_id: c
        for c in Class.query.filter(Class.class_id.in_(enrolled_class_ids)).all()
    } if enrolled_class_ids else {}

    classes_list = []
    for class_id in enrolled_class_ids:
        cls = classes_by_id.get(class_id)
        if not cls:
            continue
        agg        = per_class_agg.get(class_id, {})
        sess_count = session_count_by_class.get(class_id, 0)
        present    = agg.get("present", 0)
        absent     = agg.get("absent",  0)
        total_rec  = agg.get("total",   0)

        att_pct = round(present / total_rec * 100.0, 1) if total_rec > 0 else (
            0.0 if sess_count > 0 else None
        )

        classes_list.append({
            "class_id":           class_id,
            "class_name":         cls.class_name,
            "subject":            cls.subject,
            "session_count":      sess_count,
            "present_count":      present,
            "absent_count":       absent,
            "attendance_percent": att_pct,
        })

    classes_list.sort(key=lambda c: c["class_name"].lower())

    # ── 5. Overall totals ─────────────────────────────────────────────
    total_present = sum(c["present_count"] for c in classes_list)
    total_absent  = sum(c["absent_count"]  for c in classes_list)
    total_records = total_present + total_absent
    total_sessions = sum(c["session_count"] for c in classes_list)

    overall_pct = round(total_present / total_records * 100.0, 1) if total_records > 0 else (
        0.0 if total_sessions > 0 else None
    )

    # ── 6. Recent sessions (last 10 across all enrolled classes) ─────
    recent_records = []
    if enrolled_class_ids:
        recent_records = (
            db.session.query(
                AttendanceRecord.session_id,
                AttendanceRecord.status,
                Session.start_time,
                Session.class_id,
            )
            .join(Session, Session.session_id == AttendanceRecord.session_id)
            .filter(
                AttendanceRecord.student_id == student_id,
                Session.class_id.in_(enrolled_class_ids),
            )
            .order_by(Session.start_time.desc())
            .limit(10)
            .all()
        )

    # Build a set of session_ids where an approved waiver exists for this student
    waived_session_ids = set()
    if recent_records:
        rec_session_ids = [r.session_id for r in recent_records]
        waiver_rows = (
            db.session.query(WaiverRequest.session_id)
            .filter(
                WaiverRequest.student_id == student_id,
                WaiverRequest.session_id.in_(rec_session_ids),
                WaiverRequest.status == "Approved",
            )
            .all()
        )
        waived_session_ids = {w.session_id for w in waiver_rows}

    recent_sessions = []
    for rec in recent_records:
        cls = classes_by_id.get(rec.class_id)
        recent_sessions.append({
            "session_id": rec.session_id,
            "class_name": cls.class_name if cls else "Unknown",
            "date":       utc_iso(rec.start_time),
            "status":     rec.status,
            "waived":     rec.session_id in waived_session_ids,
        })

    logger.info("student_detail: student_id=%s classes=%d", student_id, len(classes_list))

    return jsonify({
        "student_id":                  student_id,
        "fullname":                    user.fullname if user else "",
        "roll_number":                 student.roll_number,
        "program":                     student.program,
        "year_of_study":               student.year_of_study,
        "overall_attendance_percent":  overall_pct,
        "total_sessions":              total_sessions,
        "total_present":               total_present,
        "total_absent":                total_absent,
        "classes":                     classes_list,
        "recent_sessions":             recent_sessions,
    }), 200

# ── Dashboard At-Risk Students ────────────────────────────────────────────────


@admin_bp.route("/dashboard/at-risk-students", methods=["GET"])
@require_role("admin")
def dashboard_at_risk_students():
    """Return the top at-risk students across ALL classes for the dashboard.

    A student is at-risk if their attendance in any enrolled class is below
    AT_RISK_THRESHOLD (75%).  For students enrolled in multiple classes we
    surface the class where attendance is lowest (worst-case exposure).

    Query params:
      limit  — max number of results to return (default 8, max 20)

    Response shape:
      {
        "at_risk_threshold_percent": 75.0,
        "students": [
          {
            "student_id": 1,
            "fullname": "...",
            "roll_number": "...",
            "attendance_percent": 54.3,   // their lowest across all classes
            "class_name": "...",          // the class where that low % was recorded
            "class_id": 5
          },
          ...
        ]
      }
    """
    from routes.batch import AT_RISK_THRESHOLD

    try:
        limit = min(int(request.args.get("limit", 8)), 20)
    except (ValueError, TypeError):
        limit = 8

    # ── Single SQL query: per (student, class) attendance aggregation ─────────
    # For each (student_id, class_id) pair, compute:
    #   session_count  = number of sessions held for that class
    #   present_count  = AttendanceRecord rows with status='Present' for that student
    #
    # We use a subquery for session counts per class (independent of student),
    # then left-join attendance records to get per-student counts.

    # Subquery: session count per class
    session_counts_sq = (
        db.session.query(
            Session.class_id.label("class_id"),
            func.count(Session.session_id).label("session_count"),
        )
        .group_by(Session.class_id)
        .subquery()
    )

    # Subquery: present record count per (student, session)
    present_counts_sq = (
        db.session.query(
            AttendanceRecord.student_id.label("student_id"),
            Session.class_id.label("class_id"),
            func.count(AttendanceRecord.record_id).label("present_count"),
        )
        .join(Session, Session.session_id == AttendanceRecord.session_id)
        .filter(AttendanceRecord.status == "Present")
        .group_by(AttendanceRecord.student_id, Session.class_id)
        .subquery()
    )

    # Main query: join Enrollment → session_counts → present_counts → Student → User → Class
    rows = (
        db.session.query(
            Enrollment.student_id,
            Enrollment.class_id,
            session_counts_sq.c.session_count,
            func.coalesce(present_counts_sq.c.present_count, 0).label("present_count"),
        )
        .join(
            session_counts_sq,
            session_counts_sq.c.class_id == Enrollment.class_id,
        )
        .outerjoin(
            present_counts_sq,
            (present_counts_sq.c.student_id == Enrollment.student_id)
            & (present_counts_sq.c.class_id == Enrollment.class_id),
        )
        .filter(session_counts_sq.c.session_count > 0)  # skip classes with no sessions
        .all()
    )

    # ── Compute attendance % per (student, class), keep only at-risk ─────────
    # For each student, keep only their worst (lowest) class
    worst_by_student: dict[int, dict] = {}
    for row in rows:
        pct = round(row.present_count / row.session_count * 100.0, 1)
        if pct >= AT_RISK_THRESHOLD:
            continue  # not at risk in this class

        existing = worst_by_student.get(row.student_id)
        if existing is None or pct < existing["attendance_percent"]:
            worst_by_student[row.student_id] = {
                "student_id":         row.student_id,
                "class_id":           row.class_id,
                "attendance_percent": pct,
            }

    if not worst_by_student:
        return jsonify({
            "at_risk_threshold_percent": AT_RISK_THRESHOLD,
            "students": [],
        }), 200

    # ── Enrich with student name, roll number, class name ─────────────────────
    student_ids = list(worst_by_student.keys())
    class_ids   = list({v["class_id"] for v in worst_by_student.values()})

    students_map = {
        s.student_id: s
        for s in Student.query.filter(Student.student_id.in_(student_ids)).all()
    }
    users_map = {}
    for s in students_map.values():
        if s.user_id:
            users_map[s.student_id] = User.query.get(s.user_id)

    classes_map = {
        c.class_id: c
        for c in Class.query.filter(Class.class_id.in_(class_ids)).all()
    }

    # Build result list, sort by lowest attendance first, take top `limit`
    results = []
    for student_id, entry in worst_by_student.items():
        student = students_map.get(student_id)
        user    = users_map.get(student_id)
        cls     = classes_map.get(entry["class_id"])
        if not student or not user or not cls:
            continue
        results.append({
            "student_id":         student_id,
            "fullname":           user.fullname,
            "roll_number":        student.roll_number,
            "attendance_percent": entry["attendance_percent"],
            "class_name":         cls.class_name,
            "class_id":           entry["class_id"],
        })

    results.sort(key=lambda x: x["attendance_percent"])
    results = results[:limit]

    logger.info("dashboard_at_risk_students: %d at-risk students found", len(results))

    return jsonify({
        "at_risk_threshold_percent": AT_RISK_THRESHOLD,
        "students": results,
    }), 200
