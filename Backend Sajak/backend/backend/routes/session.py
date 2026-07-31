"""Session routes — start, end, status, class sessions."""

import logging
import threading
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from database import db, utc_iso
from models.attendance import AttendanceRecord
from models.class_model import Class, Enrollment
from models.session import Session
from models.user import User
from middleware.auth_middleware import require_role
from services import attendance_engine, notifications

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
@require_role("student", "teacher", "admin")
def get_teacher_classes():
    """Return all classes assigned to the current teacher (or all classes for admin)."""
    try:
        user_id = g.current_user["user_id"]
        role = g.current_user.get("role", "")
        # Admins see all classes; teachers see only their own
        if role == "admin":
            classes = Class.query.all()
        else:
            classes = Class.query.filter_by(teacher_id=user_id).all()

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


# ─── Session auto-expiry helper ──────────────────────────────────────────────

def _auto_expire_stale_session(session: "Session") -> bool:
    """Auto-close an ACTIVE session that has outlived its scheduled window.

    A session is considered stale when ALL of the following are true:
      1. The linked class has both scheduled_date and scheduled_end_time set.
      2. The current local time is > scheduled_end_time + STALE_GRACE_MINUTES
         on the *same date* the session started.  (Sessions that started on a
         different calendar day are always considered stale regardless of time.)

    Sets ended_reason='auto_expired' when closing.

    Returns True if the session was closed (caller should commit), False if it
    is still within its valid window and should be resumed.
    """
    from flask import current_app
    from zoneinfo import ZoneInfo

    STALE_GRACE_MINUTES = 60  # extra leniency after scheduled end

    cls = session.class_
    if cls is None:
        return False

    tz_name = current_app.config.get("SERVER_TIMEZONE", "Asia/Kathmandu")
    tz = ZoneInfo(tz_name)
    now_local = datetime.now(tz)
    today_local = now_local.date()

    # Normalise session start_time to local date for comparison
    start_aware = session.start_time
    if start_aware.tzinfo is None:
        start_aware = start_aware.replace(tzinfo=timezone.utc)
    session_date_local = start_aware.astimezone(tz).date()

    # Session started on a previous calendar day — always stale
    if session_date_local < today_local:
        logger.info(
            "Auto-expiring stale session %s (started %s, today is %s)",
            session.session_id[:8], session_date_local, today_local,
        )
        session.end_time = start_aware.astimezone(timezone.utc).replace(
            hour=23, minute=59, second=59, microsecond=0
        )
        session.status = "CLOSED"
        session.ended_reason = "auto_expired"
        return True

    # Session started today — only expire if past scheduled_end_time + grace
    if cls.scheduled_end_time is not None:
        end_dt = datetime.combine(today_local, cls.scheduled_end_time).replace(tzinfo=tz)
        cutoff = end_dt + timedelta(minutes=STALE_GRACE_MINUTES)
        if now_local > cutoff:
            logger.info(
                "Auto-expiring stale session %s (scheduled end %s + %d min grace passed)",
                session.session_id[:8],
                cls.scheduled_end_time.strftime("%H:%M"),
                STALE_GRACE_MINUTES,
            )
            session.end_time = end_dt.astimezone(timezone.utc)
            session.status = "CLOSED"
            session.ended_reason = "auto_expired"
            return True

    # Still within valid window
    return False


@session_bp.route("/start", methods=["POST"])
@require_role("teacher")
def start_session():
    """Start a new attendance session for a class.

    Enforces schedule checks when the class has a scheduled_date set:
      1. scheduled_time must also be set
      2. scheduled_date must be today (Nepal local time)
      3. Current time >= scheduled_time - SESSION_START_BUFFER_MINUTES
      4. Current time <= scheduled_end_time (if set)

    Also blocks restarting a class that was manually ended earlier today.
    If the teacher explicitly ended the session (ended_reason='manual'),
    starting again on the same calendar day is forbidden. Auto-expired
    sessions (ended_reason='auto_expired') may be restarted.

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

    # ── Resume check ──────────────────────────────────────────────────
    # If an ACTIVE session already exists for this class, return it
    # directly instead of creating a duplicate.  This handles teacher
    # phone crashes / app restarts without losing the session.
    existing = Session.query.filter_by(class_id=class_id, status="ACTIVE").first()
    if existing:
        # Check whether the session has outlived its scheduled window.
        stale = _auto_expire_stale_session(existing)
        if stale:
            # Commit the auto-close, then fall through to create a fresh session.
            db.session.commit()
            logger.info(
                "Stale session %s auto-closed; creating a new session for class %s",
                existing.session_id[:8], class_id,
            )
        else:
            # Valid session — return it so the teacher resumes where they left off.
            enrollments = Enrollment.query.filter_by(class_id=class_id).all()
            logger.info(
                "Resuming existing session %s for class %s",
                existing.session_id[:8], class_id,
            )
            return (
                jsonify(
                    {
                        "session_id":       existing.session_id,
                        "threshold_percent": existing.threshold_percent,
                        "enrolled_count":   len(enrollments),
                        "enrolled_students": [
                            e.student.to_dict() for e in enrollments if e.student
                        ],
                        "start_time":       utc_iso(existing.start_time),
                        "resumed":          True,
                    }
                ),
                200,
            )

    # ── Manual-end block check ────────────────────────────────────────
    # If this class was manually ended by a teacher earlier today, block
    # starting a new session. Auto-expired sessions are allowed to restart
    # (existing behavior preserved).
    from flask import current_app
    from zoneinfo import ZoneInfo

    tz_name = current_app.config.get("SERVER_TIMEZONE", "Asia/Kathmandu")
    tz = ZoneInfo(tz_name)
    now_local = datetime.now(tz)
    today_local = now_local.date()

    # Query for any CLOSED session with ended_reason='manual' whose start_time
    # falls on today's local date
    manually_ended_today = Session.query.filter_by(
        class_id=class_id,
        status="CLOSED",
        ended_reason="manual"
    ).all()

    for sess in manually_ended_today:
        # Convert session start_time to local date
        start_aware = sess.start_time
        if start_aware.tzinfo is None:
            start_aware = start_aware.replace(tzinfo=timezone.utc)
        session_date_local = start_aware.astimezone(tz).date()

        if session_date_local == today_local:
            return (
                jsonify({
                    "error": (
                        "This class was already ended earlier today and cannot be restarted. "
                        "Contact an admin if you need to reopen it."
                    ),
                    "status": 403,
                }),
                403,
            )

    # ── Schedule enforcement ──────────────────────────────────────────
    # Only enforced when a scheduled_date has been set by admin.
    # Classes with no scheduled_date are unrestricted (backward compat).
    if cls.scheduled_date is not None:
        buffer_min = current_app.config.get("SESSION_START_BUFFER_MINUTES", _DEFAULT_BUFFER)

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
    session.ended_reason = "manual"
    db.session.commit()

    absent_records = AttendanceRecord.query.filter_by(
        session_id=session_id, status="Absent"
    ).all()

    class_name = session.class_.class_name if session.class_ else "Unknown"

    # ── Notify all absent students ────────────────────────────────────
    # Pre-extract all data we need from the ORM objects NOW, while still
    # inside the request context and attached to the SQLAlchemy session.
    # The background thread cannot access lazy-loaded relationships or
    # db.session — both are tied to the request context that is torn down
    # before the thread runs.
    from flask import current_app
    absent_data = []
    for rec in absent_records:
        try:
            student = rec.student
            if not student or not student.user:
                continue
            user = student.user
            absent_data.append({
                "user_id":      user.id,
                "platform":     user.platform or "",
                "device_token": user.device_token or "",
                "student_name": user.fullname,
            })
        except Exception as exc:
            logger.error("Session %s: failed to pre-load absent record %s: %s",
                         session_id, getattr(rec, "record_id", "?"), exc)

    flask_app = current_app._get_current_object()

    def _notify_absent(data_list, name, app):
        with app.app_context():
            try:
                notifications.notify_absent_students_bulk_plain(data_list, name)
            except Exception as exc:
                logger.error("Session %s: bulk absence notification failed: %s",
                             session_id, exc)

    threading.Thread(
        target=_notify_absent,
        args=(absent_data, class_name, flask_app),
        daemon=True,
    ).start()

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
                    utc_iso(session.start_time) if session.start_time else None
                ),
                "end_time": (
                    utc_iso(session.end_time) if session.end_time else None
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
@require_role("student", "teacher", "admin")
def my_sessions():
    """Return active or upcoming classes for the current teacher (or all classes for admin)."""
    user_id = g.current_user["user_id"]
    role = g.current_user.get("role", "")
    # Admins see all classes; teachers see only their assigned classes
    if role == "admin":
        classes = Class.query.all()
    else:
        classes = Class.query.filter_by(teacher_id=user_id).all()
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
