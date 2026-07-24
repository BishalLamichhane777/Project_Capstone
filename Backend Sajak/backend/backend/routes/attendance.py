"""Attendance routes — history, reports, manual override."""

import logging
import threading
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from database import db, utc_iso
from models.attendance import AttendanceLog, AttendanceRecord
from models.class_model import Class, Enrollment
from models.session import Session
from models.student import Student
from middleware.auth_middleware import require_role
from services import firebase_sync
from services.face_recognition import recognize_student

logger = logging.getLogger(__name__)

attendance_bp = Blueprint("attendance", __name__)


@attendance_bp.route("/log", methods=["POST"])
@require_role("student")
def log_attendance():
    """Log an ENTRY or EXIT event for an active session."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    session_id = data.get("session_id", "").strip()
    event_type = data.get("event_type", "").strip()

    if not session_id or not event_type:
        return jsonify({"error": "session_id and event_type are required", "status": 400}), 400

    if event_type not in ("ENTRY", "EXIT"):
        return jsonify({"error": "event_type must be ENTRY or EXIT", "status": 422}), 422

    student = Student.query.filter_by(user_id=g.current_user["user_id"]).first()
    if not student:
        return jsonify({"error": "Student profile not found", "status": 404}), 404

    session = Session.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found", "status": 404}), 404
    if session.status != "ACTIVE":
        return jsonify({"error": "Session is not active", "status": 400}), 400

    enrollment = Enrollment.query.filter_by(
        student_id=student.student_id, class_id=session.class_id
    ).first()
    if not enrollment:
        return jsonify({"error": "You are not enrolled in this class", "status": 403}), 403

    log_entry = AttendanceLog(
        student_id=student.student_id,
        session_id=session_id,
        event_type=event_type,
        timestamp=datetime.now(timezone.utc),
    )
    db.session.add(log_entry)
    
    record = AttendanceRecord.query.filter_by(
        student_id=student.student_id, session_id=session_id
    ).first()
    if not record:
        record = AttendanceRecord(
            student_id=student.student_id,
            session_id=session_id,
            total_duration_seconds=0,
            status="Absent"
        )
        db.session.add(record)
        
    db.session.commit()
    return jsonify({"message": f"Attendance {event_type} logged"}), 201


@attendance_bp.route("/status", methods=["GET"])
@require_role("student")
def current_status():
    """Return the student's current attendance status for a session."""
    session_id = request.args.get("session_id", "").strip()
    if not session_id:
        return jsonify({"error": "session_id is required", "status": 400}), 400
        
    student = Student.query.filter_by(user_id=g.current_user["user_id"]).first()
    if not student:
        return jsonify({"error": "Student profile not found", "status": 404}), 404

    last_log = AttendanceLog.query.filter_by(
        student_id=student.student_id, session_id=session_id
    ).order_by(AttendanceLog.timestamp.desc()).first()

    if not last_log:
        return jsonify({"status": "not_joined"}), 200

    if last_log.event_type == "ENTRY":
        return jsonify({"status": "joined"}), 200
        
    return jsonify({"status": "left"}), 200


@attendance_bp.route("/history", methods=["GET"])
@require_role("student")
def my_attendance_history():
    """Return attendance records for the currently logged-in student."""
    student = Student.query.filter_by(user_id=g.current_user["user_id"]).first()
    if not student:
        return jsonify({"error": "Student profile not found", "status": 404}), 404

    records = (
        AttendanceRecord.query.filter_by(student_id=student.student_id)
        .order_by(AttendanceRecord.record_id.desc())
        .all()
    )

    results = []
    for record in records:
        session = Session.query.get(record.session_id)
        class_name = session.class_.class_name if session and session.class_ else "Unknown"
        session_date = session.start_time.isoformat() if session and session.start_time else None

        logs = (
            AttendanceLog.query.filter_by(
                student_id=student.student_id, session_id=record.session_id
            )
            .order_by(AttendanceLog.timestamp.asc())
            .all()
        )

        results.append(
            {
                "session_id": record.session_id,
                "class_name": class_name,
                "date": utc_iso(session.start_time) if session and session.start_time else None,
                "status": record.status,
                "total_duration_seconds": record.total_duration_seconds,
                "logs": [
                    {
                        "event_type": log.event_type,
                        "timestamp": utc_iso(log.timestamp),
                    }
                    for log in logs
                ],
            }
        )

    return jsonify(results), 200


@attendance_bp.route("/history/<int:student_id>", methods=["GET"])
@require_role("student", "admin", "teacher")
def attendance_history(student_id):
    """Return all attendance records for a student with entry/exit logs.

    Students can only view their own records.
    """
    current_user = g.current_user

    # Students may only access their own records
    if current_user["role"] == "student":
        student = Student.query.filter_by(user_id=current_user["user_id"]).first()
        if not student or student.student_id != student_id:
            return (
                jsonify({"error": "You can only view your own attendance", "status": 403}),
                403,
            )

    # Verify student exists
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found", "status": 404}), 404

    records = (
        AttendanceRecord.query.filter_by(student_id=student_id)
        .order_by(AttendanceRecord.record_id.desc())
        .all()
    )

    results = []
    for record in records:
        session = Session.query.get(record.session_id)
        class_name = session.class_.class_name if session and session.class_ else "Unknown"

        # Fetch entry/exit logs for this student+session
        logs = (
            AttendanceLog.query.filter_by(
                student_id=student_id, session_id=record.session_id
            )
            .order_by(AttendanceLog.timestamp.asc())
            .all()
        )

        results.append(
            {
                "session_id": record.session_id,
                "class_name": class_name,
                "date": utc_iso(session.start_time) if session and session.start_time else None,
                "status": record.status,
                "total_duration_seconds": record.total_duration_seconds,
                "logs": [
                    {
                        "event_type": log.event_type,
                        "timestamp": utc_iso(log.timestamp),
                    }
                    for log in logs
                ],
            }
        )

    return jsonify(results), 200


@attendance_bp.route("/report/<int:class_id>", methods=["GET"])
@require_role("teacher", "admin")
def attendance_report(class_id):
    """Per-student attendance summary for a class.

    Includes total sessions, sessions present, percentage, and at-risk flag.
    """
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({"error": "Class not found", "status": 404}), 404

    # Get all sessions for this class
    sessions = Session.query.filter_by(class_id=class_id).all()
    total_sessions = len(sessions)
    session_ids = [s.session_id for s in sessions]

    # Get all enrolled students
    enrollments = Enrollment.query.filter_by(class_id=class_id).all()

    students_data = []
    for enrollment in enrollments:
        student = enrollment.student
        if not student:
            continue

        # Count present sessions
        present_count = (
            AttendanceRecord.query.filter(
                AttendanceRecord.student_id == student.student_id,
                AttendanceRecord.session_id.in_(session_ids),
                AttendanceRecord.status == "Present",
            ).count()
            if session_ids
            else 0
        )

        attendance_percentage = (
            round((present_count / total_sessions) * 100, 2)
            if total_sessions > 0
            else 0.0
        )

        students_data.append(
            {
                "student_id": student.student_id,
                "fullname": student.user.fullname if student.user else None,
                "roll_number": student.roll_number,
                "total_sessions": total_sessions,
                "sessions_present": present_count,
                "attendance_percentage": attendance_percentage,
                "at_risk": attendance_percentage < 75.0,
            }
        )

    return (
        jsonify(
            {
                "class_name": cls.class_name,
                "class_id": class_id,
                "total_sessions": total_sessions,
                "students": students_data,
                "generated_at": utc_iso(datetime.now(timezone.utc)),
            }
        ),
        200,
    )


@attendance_bp.route("/manual-override", methods=["PUT"])
@require_role("admin")
def manual_override():
    """Allow admin to manually set a student's attendance status."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    student_id = data.get("student_id")
    session_id = data.get("session_id", "").strip()
    status = data.get("status", "").strip()

    if not student_id or not session_id or not status:
        return (
            jsonify(
                {"error": "student_id, session_id, and status are required", "status": 400}
            ),
            400,
        )

    if status not in ("Present", "Absent", "Partial"):
        return (
            jsonify(
                {"error": "status must be 'Present', 'Absent', or 'Partial'", "status": 422}
            ),
            422,
        )

    record = AttendanceRecord.query.filter_by(
        student_id=student_id, session_id=session_id
    ).first()

    if not record:
        return (
            jsonify({"error": "Attendance record not found", "status": 404}),
            404,
        )

    record.status = status
    record.finalized_at = datetime.now(timezone.utc)
    db.session.commit()

    # Sync to Firebase (best-effort)
    firebase_sync.sync_manual_override(student_id, session_id, status)

    return jsonify({"message": "Attendance updated"}), 200


@attendance_bp.route("/analytics", methods=["GET"])
@require_role("student", "admin", "teacher")
def attendance_analytics():
    student_id = request.args.get("student_id")
    
    if g.current_user["role"] == "student":
        student = Student.query.filter_by(user_id=g.current_user["user_id"]).first()
        if not student:
            return jsonify({"error": "Student profile not found", "status": 404}), 404
        student_id = student.student_id

    if student_id:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({"error": "Student not found", "status": 404}), 404
        
        records = AttendanceRecord.query.filter_by(student_id=student_id).all()
        total = len(records)
        present = sum(1 for r in records if r.status == "Present")
        absent = sum(1 for r in records if r.status == "Absent")
        late = sum(1 for r in records if r.status == "Partial")
        percentage = round((present / total * 100), 2) if total > 0 else 0
        
        classes_data = []
        enrollments = Enrollment.query.filter_by(student_id=student_id).all()
        for enr in enrollments:
            cls = Class.query.get(enr.class_id)
            if not cls: continue
            cls_sessions = [s.session_id for s in Session.query.filter_by(class_id=cls.class_id).all()]
            cls_records = [r for r in records if r.session_id in cls_sessions]
            c_tot = len(cls_records)
            c_pres = sum(1 for r in cls_records if r.status == "Present")
            classes_data.append({
                "id": str(cls.class_id),
                "course": cls.subject,
                "attendance": round(c_pres / c_tot * 100) if c_tot > 0 else 0,
                "present": c_pres,
                "absent": sum(1 for r in cls_records if r.status == "Absent"),
                "waivers": 0,
                "risk": "Low" if (c_pres/c_tot if c_tot else 1) > 0.75 else ("High" if (c_pres/c_tot if c_tot else 1) < 0.5 else "Mid")
            })

        return jsonify({
            "student_id": student_id,
            "name": student.user.fullname if student.user else "Unknown",
            "total": total,
            "present": present,
            "absent": absent,
            "late": late,
            "percentage": percentage,
            "classes": classes_data
        }), 200
    else:
        students = Student.query.all()
        results = []
        for s in students:
            records = AttendanceRecord.query.filter_by(student_id=s.student_id).all()
            total = len(records)
            present = sum(1 for r in records if r.status == "Present")
            absent = sum(1 for r in records if r.status == "Absent")
            percentage = round((present / total * 100)) if total > 0 else 0
            risk = "Low" if percentage >= 75 else ("High" if percentage < 50 else "Mid")
            
            results.append({
                "id": str(s.roll_number),
                "student_id": s.student_id,
                "name": s.user.fullname if s.user else "Unknown",
                "course": "General", 
                "attendance": percentage,
                "present": present,
                "absent": absent,
                "waivers": 0,
                "risk": risk,
                "initials": "".join([n[0] for n in (s.user.fullname.split() if s.user and s.user.fullname else ["U"])][:2]).upper()
            })
        return jsonify(results), 200


@attendance_bp.route("/scan", methods=["POST"])
@require_role("teacher", "admin")
def scan_attendance():
    """Scan a camera frame for faces and log attendance for every recognized student.

    Accepts multipart/form-data with:
      - session_id (str, required)
      - image     (file, required) — single JPEG/PNG frame from the camera

    Response shapes:
      No face detected:
        {"status": "no_face", "results": []}

      Single recognized student:
        {"status": "recognized", "student_id": 42, "student_name": "Jane",
         "event": "ENTRY", "confidence": 87.3, "message": "..."}

      Multiple recognized students:
        {"status": "multiple_recognized", "results": [
          {"student_id": 42, "student_name": "Jane", "event": "ENTRY", "confidence": 87.3},
          {"student_id": 17, "student_name": "Mark", "event": "ENTRY", "confidence": 91.2}
        ]}

      Non-recognition outcomes (cooldown, not_enrolled, error):
        {"status": "<reason>", "student_id": ..., "message": "..."}
    """
    from flask import current_app

    session_id = request.form.get("session_id", "").strip()
    if not session_id:
        return jsonify({"error": "session_id is required", "status": 400}), 400

    if "image" not in request.files:
        return jsonify({"error": "image file is required", "status": 400}), 400

    image_file = request.files["image"]
    if image_file.filename == "":
        return jsonify({"error": "No selected image file", "status": 400}), 400

    # ── 1. Validate active session ────────────────────────────────────
    session = Session.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found", "status": 404}), 404
    if session.status != "ACTIVE":
        return jsonify({"error": "Session is not active", "status": 400}), 400

    # ── 2. Read image bytes ───────────────────────────────────────────
    try:
        image_bytes = image_file.read()
    except Exception as e:
        logger.error("Failed to read scan image: %s", e)
        return jsonify({"error": f"Failed to read image: {str(e)}", "status": 400}), 400

    # ── 3. Face recognition — returns list of recognized hits ─────────
    rec_results = recognize_student(image_bytes)

    # Hard error from the recognition service
    if (
        len(rec_results) == 1
        and rec_results[0].get("status") == "error"
    ):
        return jsonify({
            "status"      : "error",
            "student_id"  : None,
            "student_name": None,
            "event"       : None,
            "confidence"  : None,
            "message"     : rec_results[0].get("message", "Recognition error"),
        }), 200

    # No face detected at all
    if not rec_results:
        return jsonify({
            "status" : "no_face",
            "results": [],
            "message": "No face detected",
        }), 200

    # ── 4. Process each recognized face ───────────────────────────────
    cooldown_seconds = current_app.config.get("SCAN_COOLDOWN_SECONDS", 15)
    now = datetime.now(timezone.utc)
    logged_results = []

    for hit in rec_results:
        student_id = hit.get("student_id")
        confidence = hit.get("confidence")

        if student_id is None:
            continue

        # ── 4a. Resolve student record ────────────────────────────────
        student = Student.query.get(student_id)
        if not student:
            logger.warning(
                "recognize_student returned student_id=%s but no DB row found",
                student_id,
            )
            continue

        student_name = student.user.fullname if student.user else "Unknown"

        # ── 4b. Enrollment check ──────────────────────────────────────
        enrollment = Enrollment.query.filter_by(
            student_id=student_id,
            class_id=session.class_id,
        ).first()
        if not enrollment:
            logger.warning(
                "Recognized student_id=%s (%s) is NOT enrolled in class_id=%s "
                "(session=%s) — attendance NOT logged.",
                student_id, student_name, session.class_id, session_id,
            )
            continue

        # ── 4c. Cooldown check ────────────────────────────────────────
        latest_log = (
            AttendanceLog.query
            .filter_by(student_id=student_id, session_id=session_id)
            .order_by(AttendanceLog.timestamp.desc())
            .first()
        )

        if latest_log:
            log_time = latest_log.timestamp
            if log_time.tzinfo is None:
                log_time = log_time.replace(tzinfo=timezone.utc)
            elapsed = (now - log_time).total_seconds()
            if elapsed < cooldown_seconds:
                # Still in cooldown — skip this student silently
                continue

        # ── 4d. Toggle ENTRY / EXIT ───────────────────────────────────
        if latest_log is None or latest_log.event_type == "EXIT":
            event_type = "ENTRY"
        else:
            event_type = "EXIT"

        # ── 4e. Persist attendance log ────────────────────────────────
        log_entry = AttendanceLog(
            student_id=student_id,
            session_id=session_id,
            event_type=event_type,
            timestamp=now,
            confidence_score=confidence,
        )
        db.session.add(log_entry)

        record = AttendanceRecord.query.filter_by(
            student_id=student_id, session_id=session_id
        ).first()
        if not record:
            record = AttendanceRecord(
                student_id=student_id,
                session_id=session_id,
                total_duration_seconds=0,
                status="Absent",
            )
            db.session.add(record)

        logged_results.append({
            "student_id"  : student_id,
            "student_name": student_name,
            "event"       : event_type,
            "confidence"  : confidence,
        })

    # Commit all logged entries in one shot
    if logged_results:
        db.session.commit()

        # ── 5. Firebase real-time sync (best-effort, non-blocking) ────
        def _firebase_sync_all(items, sid):
            for item in items:
                try:
                    firebase_sync.sync_attendance_log(
                        item["student_id"], sid, item["event"]
                    )
                except Exception as fb_exc:
                    logger.warning(
                        "Firebase sync failed for student=%s session=%s: %s",
                        item["student_id"], sid, fb_exc,
                    )

        threading.Thread(
            target=_firebase_sync_all,
            args=(list(logged_results), session_id),
            daemon=True,
        ).start()

    # ── 6. Response ───────────────────────────────────────────────────
    if not logged_results:
        # Faces were detected but all failed enrollment / cooldown checks
        return jsonify({
            "status" : "no_face",
            "results": [],
            "message": "No eligible students logged",
        }), 200

    if len(logged_results) == 1:
        # Preserve the original single-result shape so the frontend
        # doesn't need to change for the common one-person case.
        r = logged_results[0]
        return jsonify({
            "status"      : "recognized",
            "student_id"  : r["student_id"],
            "student_name": r["student_name"],
            "event"       : r["event"],
            "confidence"  : r["confidence"],
            "message"     : f"{r['student_name']} — {r['event']} logged",
        }), 200

    # Multiple students recognized in the same frame
    return jsonify({
        "status" : "multiple_recognized",
        "results": logged_results,
    }), 200

