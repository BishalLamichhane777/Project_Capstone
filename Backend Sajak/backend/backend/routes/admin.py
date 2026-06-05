"""Admin routes — class CRUD, session delete, user management, notifications."""

import logging
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from database import db
from models.attendance import AttendanceLog, AttendanceRecord
from models.class_model import Class, Enrollment
from models.notification import Notification
from models.session import Session
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

    cls = Class(
        class_name=class_name,
        subject=subject,
        room=room,
        teacher_id=teacher_id,
        schedule_time=schedule_time,
        duration_minutes=duration_minutes,
    )
    db.session.add(cls)
    db.session.commit()

    return jsonify({"class_id": cls.class_id, "message": "Class created"}), 201


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

    db.session.commit()

    return jsonify({"message": "Class updated"}), 200


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
