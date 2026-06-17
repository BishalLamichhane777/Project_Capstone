"""Session routes — start, end, status, class sessions."""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from database import db
from models.attendance import AttendanceRecord
from models.class_model import Class, Enrollment
from models.session import Session
from models.user import User
from middleware.auth_middleware import require_role
from services import attendance_engine, firebase_sync, notifications

logger = logging.getLogger(__name__)

session_bp = Blueprint("session_routes", __name__)

# How many minutes before scheduled_time a teacher may open a session.
# Mirrors Config.SESSION_START_BUFFER_MINUTES — used as fallback outside app context.
_DEFAULT_BUFFER = 15


# ─── Schedule status helper ───────────────────────────────────────────────────

def _compute_schedule_status(cls, active_session=None):
    """Compute a frontend-consumable schedule status string for a class.

    Returns one of:
        "ongoing"      — has an active session right now
        "unscheduled"  — no scheduled_date set
        "future_date"  — scheduled for a future date
        "not_started"  — today, but before the open window
        "ready"        — today, within the open window
        "ended"        — today, past scheduled_end_time, or past date
    """
    if active_session is not None:
        return "ongoing"

    if cls.scheduled_date is None:
        return "unscheduled"

    try:
        from flask import current_app
        from zoneinfo import ZoneInfo
        tz_name = current_app.config.get("SERVER_TIMEZONE", "Asia/Kathmandu")
        buffer_min = current_app.config.get("SESSION_START_BUFFER_MINUTES", _DEFAULT_BUFFER)
    except RuntimeError:
        from zoneinfo import ZoneInfo
        tz_name = "Asia/Kathmandu"
        buffer_min = _DEFAULT_BUFFER

    tz = ZoneInfo(tz_name)
    now_local = datetime.now(tz)
    today_local = now_local.date()

    if cls.scheduled_date > today_local:
        return "future_date"

    if cls.scheduled_date < today_local:
        return "ended"   # past date

    # scheduled_date == today
    if cls.scheduled_time is None:
        return "unscheduled"

    scheduled_start_dt = datetime.combine(today_local, cls.scheduled_time).replace(tzinfo=tz)
    earliest_open = scheduled_start_dt - timedelta(minutes=buffer_min)

    if now_local < earliest_open:
        return "not_started"

    if cls.scheduled_end_time is not None:
        scheduled_end_dt = datetime.combine(today_local, cls.scheduled_end_time).replace(tzinfo=tz)
        if now_local > scheduled_end_dt:
            return "ended_today"

    return "ready"


# ─── Routes ───────────────────────────────────────────────────────────────────

@session_bp.route("/classes", methods=["GET"])
@require_role("teacher")
def get_teacher_classes():
    """Return all classes assigned to the current teacher."""
    try:
        teacher_id = g.current_user["user_id"]
        classes = Class.query.filter_by(teacher_id=teacher_id).all()

        results = []
        for cls in classes:
            active_session = Session.query.filter_by(class_id=cls.class_id, status="ACTIVE").first()
            d = cls.to_dict()
            d["students_count"] = len(cls.enrollments)
            d["active_session_id"] = active_session.session_id if active_session else None
            d["schedule_status"] = _compute_schedule_status(cls, active_session)
            results.append(d)

        return jsonify(results), 200
    except Exception as e:
        logger.exception("Error fetching teacher classes")
        return jsonify({"error": str(e), "status": 500}), 500


@session_bp.route("/start", methods=["POST"])
@require_role("teacher")
def start_session():
    """Start a new attendance session for a class.

    Enforces schedule checks when the class has a scheduled_date set:
      1. scheduled_time must also be set
      2. scheduled_date must be today (Nepal local time)
      3. Current time >= scheduled_time - SESSION_START_BUFFER_MINUTES
      4. Current time <= scheduled_end_time (if set)
    Classes without a scheduled_date are unrestricted (backward compat).
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    class_id = data.get("class_id")
    mode = data.get("mode", "").strip()
    start_time_str = data.get("start_time")

    if not class_id or not mode:
        return (
            jsonify({"error": "class_id and mode are required", "status": 400}),
            400,
        )

    if mode not in ("Strict", "Activity"):
        return (
            jsonify({"error": "mode must be 'Strict' or 'Activity'", "status": 422}),
            422,
        )

    # Validate class exists and teacher owns it
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({"error": "Class not found", "status": 404}), 404

    teacher_id = g.current_user["user_id"]
    if cls.teacher_id != teacher_id:
        return (
            jsonify({"error": "You are not the teacher of this class", "status": 403}),
            403,
        )

    # ── Schedule enforcement ──────────────────────────────────────────
    # Only enforced when a scheduled_date has been set by admin.
    # Classes with no scheduled_date are unrestricted (backward compat).
    if cls.scheduled_date is not None:
        from flask import current_app
        from zoneinfo import ZoneInfo

        tz_name = current_app.config.get("SERVER_TIMEZONE", "Asia/Kathmandu")
        buffer_min = current_app.config.get("SESSION_START_BUFFER_MINUTES", _DEFAULT_BUFFER)
        tz = ZoneInfo(tz_name)

        now_local = datetime.now(tz)
        today_local = now_local.date()

        # Check 1 — scheduled_time must also be set
        if cls.scheduled_time is None:
            return (
                jsonify({
                    "error": "Class schedule is incomplete. Admin must set a start time.",
                    "status": 403,
                }),
                403,
            )

        # Check 2 — date must be today (in local timezone)
        if cls.scheduled_date != today_local:
            return (
                jsonify({
                    "error": (
                        f"Class is not scheduled for today. "
                        f"Scheduled for {cls.scheduled_date.isoformat()}."
                    ),
                    "status": 403,
                }),
                403,
            )

        # Check 3 — not too early
        scheduled_start_dt = datetime.combine(today_local, cls.scheduled_time).replace(tzinfo=tz)
        earliest_open = scheduled_start_dt - timedelta(minutes=buffer_min)
        if now_local < earliest_open:
            return (
                jsonify({
                    "error": (
                        f"Class has not started yet. "
                        f"Starts at {cls.scheduled_time.strftime('%I:%M %p')}. "
                        f"You may open it {buffer_min} minutes early."
                    ),
                    "status": 403,
                }),
                403,
            )

        # Check 4 — not too late
        if cls.scheduled_end_time is not None:
            scheduled_end_dt = datetime.combine(today_local, cls.scheduled_end_time).replace(tzinfo=tz)
            if now_local > scheduled_end_dt:
                return (
                    jsonify({
                        "error": (
                            f"Class time has passed. "
                            f"Ended at {cls.scheduled_end_time.strftime('%I:%M %p')}."
                        ),
                        "status": 403,
                    }),
                    403,
                )

    # ── Parse start time ──────────────────────────────────────────────
    if start_time_str:
        try:
            start_time = datetime.fromisoformat(start_time_str)
        except ValueError:
            return (
                jsonify({"error": "start_time must be a valid ISO 8601 datetime", "status": 422}),
                422,
            )
    else:
        start_time = datetime.now(timezone.utc)

    # Determine threshold
    from flask import current_app

    if mode == "Strict":
        threshold = current_app.config.get("STRICT_MODE_THRESHOLD", 0.80)
    else:
        threshold = current_app.config.get("ACTIVITY_MODE_THRESHOLD", 0.55)

    # Create session
    session_id = str(uuid.uuid4())
    session = Session(
        session_id=session_id,
        class_id=class_id,
        teacher_id=teacher_id,
        mode=mode,
        start_time=start_time,
        status="ACTIVE",
        threshold_percent=threshold,
    )
    db.session.add(session)

    # Create attendance_records for all enrolled students (default Absent)
    enrollments = Enrollment.query.filter_by(class_id=class_id).all()
    for enrollment in enrollments:
        record = AttendanceRecord(
            student_id=enrollment.student_id,
            session_id=session_id,
            total_duration_seconds=0,
            threshold_required=None,
            status="Absent",
        )
        db.session.add(record)

    db.session.commit()

    # Sync to Firebase (best-effort)
    firebase_sync.sync_session_start(
        session_id,
        {"status": "ACTIVE", "class_id": class_id, "mode": mode},
    )

    return (
        jsonify(
            {
                "session_id": session_id,
                "threshold_percent": threshold,
                "enrolled_count": len(enrollments),
                "enrolled_students": [e.student.to_dict() for e in enrollments if e.student],
            }
        ),
        200,
    )


@session_bp.route("/end", methods=["POST"])
@require_role("teacher")
def end_session():
    """End an active session — finalize attendance and notify absent students."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    session_id = data.get("session_id", "").strip()
    if not session_id:
        return jsonify({"error": "session_id is required", "status": 400}), 400

    session = Session.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found", "status": 404}), 404

    teacher_id = g.current_user["user_id"]
    if session.teacher_id != teacher_id:
        return (
            jsonify({"error": "You are not the teacher of this session", "status": 403}),
            403,
        )

    if session.status != "ACTIVE":
        return (
            jsonify({"error": "Session is not active", "status": 400}),
            400,
        )

    session.end_time = datetime.now(timezone.utc)

    summary = attendance_engine.calculate_all(session_id)

    session.status = "CLOSED"
    db.session.commit()

    firebase_sync.sync_session_end(session_id, summary)
    firebase_sync.sync_attendance_summary(session_id, summary.get("details", []))

    absent_records = AttendanceRecord.query.filter_by(
        session_id=session_id, status="Absent"
    ).all()

    class_name = session.class_.class_name if session.class_ else "Unknown"

    for record in absent_records:
        student = record.student
        if student and student.user:
            device_token = student.user.device_token
            student_name = student.user.fullname
            notifications.send_absence_notification(
                device_token=device_token,
                student_name=student_name,
                session_id=session_id,
                class_name=class_name,
            )

    return (
        jsonify(
            {
                "session_id": session_id,
                "summary": {
                    "present": summary["present"],
                    "absent": summary["absent"],
                    "total": summary["total"],
                },
            }
        ),
        200,
    )


@session_bp.route("/status/<session_id>", methods=["GET"])
@require_role("teacher", "admin")
def session_status(session_id):
    """Return session details and current attendance summary."""
    session = Session.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found", "status": 404}), 404

    summary = attendance_engine.get_session_summary(session_id)

    records = AttendanceRecord.query.filter_by(session_id=session_id).all()
    students_list = []
    for r in records:
        if r.student:
            d = r.student.to_dict()
            d["attendance_status"] = r.status
            students_list.append(d)

    return (
        jsonify(
            {
                "session_id": session.session_id,
                "status": session.status,
                "mode": session.mode,
                "class_id": session.class_id,
                "class_name": session.class_.class_name if session.class_ else None,
                "start_time": (
                    session.start_time.isoformat() if session.start_time else None
                ),
                "end_time": (
                    session.end_time.isoformat() if session.end_time else None
                ),
                "liveCount": summary["present"],
                "present_count": summary["present"],
                "absent_count": summary["absent"],
                "total": summary["total"],
                "enrolled_students": students_list,
            }
        ),
        200,
    )


@session_bp.route("/class/<int:class_id>", methods=["GET"])
@require_role("teacher", "admin")
def sessions_by_class(class_id):
    """Return all sessions for a class with summaries."""
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({"error": "Class not found", "status": 404}), 404

    sessions = (
        Session.query.filter_by(class_id=class_id)
        .order_by(Session.start_time.desc())
        .all()
    )

    results = []
    for s in sessions:
        summary = attendance_engine.get_session_summary(s.session_id)
        session_data = s.to_dict()
        session_data["summary"] = {
            "present": summary["present"],
            "absent": summary["absent"],
            "total": summary["total"],
        }
        results.append(session_data)

    return jsonify({"class_id": class_id, "class_name": cls.class_name, "sessions": results}), 200


@session_bp.route("/my-sessions", methods=["GET"])
@require_role("teacher")
def my_sessions():
    """Return active or upcoming classes for the current teacher."""
    teacher_id = g.current_user["user_id"]
    classes = Class.query.filter_by(teacher_id=teacher_id).all()
    results = []

    for cls in classes:
        active_session = Session.query.filter_by(class_id=cls.class_id, status="ACTIVE").first()
        status = "ongoing" if active_session else "upcoming"

        time_str = "TBA"
        if cls.schedule_time:
            end_time = cls.schedule_time + timedelta(minutes=cls.duration_minutes or 60)
            time_str = f"{cls.schedule_time.strftime('%I:%M %p')} - {end_time.strftime('%I:%M %p')}"
        elif cls.scheduled_time:
            start_str = cls.scheduled_time.strftime('%I:%M %p')
            end_str = cls.scheduled_end_time.strftime('%I:%M %p') if cls.scheduled_end_time else ""
            time_str = f"{start_str}{' - ' + end_str if end_str else ''}"

        results.append({
            "id": str(cls.class_id),
            "class_id": cls.class_id,
            "subject": cls.subject,
            "code": cls.class_name,
            "dept": cls.room or "Room TBA",
            "time": time_str,
            "room": cls.room or "TBA",
            "students": len(cls.enrollments),
            "status": status,
            "month": cls.schedule_time.strftime('%b').upper() if cls.schedule_time else (
                cls.scheduled_date.strftime('%b').upper() if cls.scheduled_date else "TBA"
            ),
            "day": cls.schedule_time.strftime('%d') if cls.schedule_time else (
                str(cls.scheduled_date.day) if cls.scheduled_date else "TBA"
            ),
            "session_id": active_session.session_id if active_session else None,
            "schedule_status": _compute_schedule_status(cls, active_session),
            "scheduled_date": cls.scheduled_date.isoformat() if cls.scheduled_date else None,
            "scheduled_time": cls.scheduled_time.isoformat() if cls.scheduled_time else None,
            "scheduled_end_time": cls.scheduled_end_time.isoformat() if cls.scheduled_end_time else None,
            "color": '#2952e3' if status == 'ongoing' else '#f3eeff',
            "iconColor": '#7c3aed',
        })

    return jsonify(results), 200
