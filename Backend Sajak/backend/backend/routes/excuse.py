"""Excuse / waiver routes — submit, pending, history, decide.

Two waiver types are supported:
  retroactive — student was already marked Absent; session_id required.
  prior       — student requesting advance excuse; session_id is NULL.
                class_id is OPTIONAL (null = general leave / all classes).
                start_date is required; end_date defaults to start_date.
"""

import logging
import os
import uuid
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from werkzeug.utils import secure_filename

from database import db, utc_iso
from models.attendance import AttendanceRecord
from models.class_model import Class
from models.excuse import WaiverRequest
from models.session import Session
from models.student import Student
from models.user import User
from middleware.auth_middleware import require_role
from services import notifications

logger = logging.getLogger(__name__)

excuse_bp = Blueprint("excuse", __name__)

# ─── Upload helpers ───────────────────────────────────────────────────────────
_ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
_MAX_FILE_BYTES     = 5 * 1024 * 1024  # 5 MB

def _uploads_dir() -> str:
    base    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # /app
    uploads = os.path.join(base, "uploads", "waivers")
    os.makedirs(uploads, exist_ok=True)
    return uploads

def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in _ALLOWED_EXTENSIONS

def _save_document(file_storage) -> str:
    if not _allowed(file_storage.filename):
        raise ValueError(
            f"File type not allowed. Accepted: {', '.join(sorted(_ALLOWED_EXTENSIONS)).upper()}"
        )
    data = file_storage.read()
    if len(data) > _MAX_FILE_BYTES:
        raise ValueError("File exceeds the 5 MB limit.")
    ext       = file_storage.filename.rsplit(".", 1)[1].lower()
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    dest      = os.path.join(_uploads_dir(), safe_name)
    with open(dest, "wb") as fh:
        fh.write(data)
    return os.path.join("uploads", "waivers", safe_name)


# ─── Helper: build a rich dict for a single waiver ───────────────────────────

def _waiver_dict(w: WaiverRequest, student=None, include_student=False) -> dict:
    """Return a frontend-ready dict for a WaiverRequest."""
    if w.waiver_type == "prior":
        cls        = w.class_
        class_name = cls.class_name if cls else "All Classes"
        session_date = w.effective_start   # start_date or legacy target_date
    else:
        session_obj  = w.session
        class_name   = (
            session_obj.class_.class_name
            if session_obj and session_obj.class_ else None
        )
        session_date = (
            utc_iso(session_obj.start_time)
            if session_obj and session_obj.start_time else None
        )

    result = {
        "request_id":          w.request_id,
        "student_id":          w.student_id,
        "waiver_type":         w.waiver_type,
        "session_id":          w.session_id,
        "class_id":            w.class_id,
        "class_name":          class_name,
        "start_date":          w.effective_start,
        "end_date":            w.effective_end,
        "session_date":        session_date,   # kept for backward compat
        "reason":              w.reason,
        "supporting_doc_path": w.supporting_doc_path,
        "status":              w.status,
        "submitted_at":        utc_iso(w.submitted_at),
        "reviewed_at":         utc_iso(w.reviewed_at),
    }

    if include_student and student:
        result["student_name"] = student.user.fullname if student.user else None
        result["roll_number"]  = student.roll_number

    return result


# ─── Routes ───────────────────────────────────────────────────────────────────

@excuse_bp.route("/submit", methods=["POST"])
@require_role("student")
def submit_excuse():
    """Submit an excuse request — retroactive or prior.

    Accepts multipart/form-data (with optional file) or application/json.

    Retroactive fields:
      session_id  (str, required)
      reason      (str, required)
      document    (file, optional) — PDF/JPG/PNG ≤ 5 MB

    Prior fields:
      waiver_type = 'prior'  (str, required to trigger this path)
      class_id    (int, required)
      target_date (str, required) — ISO date 'YYYY-MM-DD', must be today or future
      reason      (str, required)
      document    (file, optional)
    """
    is_multipart = request.content_type and "multipart/form-data" in request.content_type

    if is_multipart:
        get = lambda k: (request.form.get(k) or "").strip()
        doc_file = request.files.get("document")
    else:
        _body = request.get_json(silent=True) or {}
        get  = lambda k: (_body.get(k) or "")
        doc_file = None

    waiver_type = (get("waiver_type") or "retroactive").strip().lower()
    reason      = get("reason").strip()

    if not reason:
        return jsonify({"error": "reason is required", "status": 400}), 400

    # ── Save document if provided ─────────────────────────────────────
    supporting_doc_path = None
    if doc_file and doc_file.filename:
        try:
            supporting_doc_path = _save_document(doc_file)
        except ValueError as exc:
            return jsonify({"error": str(exc), "status": 400}), 400
        except Exception as exc:
            logger.exception("Failed to save waiver document: %s", exc)
            return jsonify({"error": "Failed to save document.", "status": 500}), 500

    # ── Resolve student ───────────────────────────────────────────────
    student = Student.query.filter_by(user_id=g.current_user["user_id"]).first()
    if not student:
        return jsonify({"error": "Student profile not found", "status": 404}), 404

    student_name = student.user.fullname if student.user else "Unknown"

    # ══════════════════════════════════════════════════════════════════
    # PATH A — Prior waiver
    # ══════════════════════════════════════════════════════════════════
    if waiver_type == "prior":
        from datetime import date as _date

        class_id_raw = get("class_id")   # optional — empty string or absent = all classes
        start_date   = get("start_date").strip()
        end_date     = get("end_date").strip()

        # start_date is required
        if not start_date:
            return jsonify({"error": "start_date is required for a prior waiver (YYYY-MM-DD)", "status": 400}), 400

        # Validate start_date
        try:
            parsed_start = _date.fromisoformat(start_date)
        except ValueError:
            return jsonify({"error": "start_date must be YYYY-MM-DD", "status": 422}), 422

        if parsed_start < datetime.now(timezone.utc).date():
            return jsonify({"error": "start_date must be today or a future date", "status": 400}), 400

        # end_date: optional, defaults to start_date (single day)
        if end_date:
            try:
                parsed_end = _date.fromisoformat(end_date)
            except ValueError:
                return jsonify({"error": "end_date must be YYYY-MM-DD", "status": 422}), 422
            if parsed_end < parsed_start:
                return jsonify({"error": "end_date cannot be before start_date", "status": 400}), 400
        else:
            end_date   = start_date
            parsed_end = parsed_start

        # class_id: optional
        class_id  = None
        cls       = None
        class_name = "All Classes"
        if class_id_raw:
            try:
                class_id = int(class_id_raw)
            except (ValueError, TypeError):
                return jsonify({"error": "class_id must be an integer", "status": 422}), 422

            cls = Class.query.get(class_id)
            if not cls:
                return jsonify({"error": "Class not found", "status": 404}), 404

            # Only check enrollment when a specific class is given
            from models.class_model import Enrollment
            enrollment = Enrollment.query.filter_by(
                student_id=student.student_id, class_id=class_id
            ).first()
            if not enrollment:
                return jsonify({"error": "You are not enrolled in this class", "status": 403}), 403

            class_name = cls.class_name

        # Duplicate check: same student, same class (or both null), overlapping dates
        # Simple check: exact same start_date + class_id combination
        dup_query = WaiverRequest.query.filter_by(
            student_id  = student.student_id,
            waiver_type = "prior",
            class_id    = class_id,
            start_date  = start_date,
        ).first()
        if dup_query:
            return jsonify({
                "error": "A prior waiver for this class and start date already exists",
                "status": 409,
            }), 409

        waiver = WaiverRequest(
            student_id          = student.student_id,
            waiver_type         = "prior",
            session_id          = None,
            class_id            = class_id,
            target_date         = None,
            start_date          = start_date,
            end_date            = end_date,
            reason              = reason,
            supporting_doc_path = supporting_doc_path,
            status              = "Pending",
        )
        db.session.add(waiver)

        admin_users = User.query.filter_by(role="admin").all()
        db.session.commit()

        notifications.notify_admins_new_waiver(
            admin_users=admin_users,
            student_name=student_name,
            class_name=class_name,
        )

        return jsonify({"request_id": waiver.request_id, "message": "Prior excuse submitted"}), 201

    # ══════════════════════════════════════════════════════════════════
    # PATH B — Retroactive waiver (existing flow)
    # ══════════════════════════════════════════════════════════════════
    session_id = get("session_id").strip()
    if not session_id:
        return jsonify({"error": "session_id is required for a retroactive waiver", "status": 400}), 400

    record = AttendanceRecord.query.filter_by(
        student_id=student.student_id, session_id=session_id
    ).first()
    if not record:
        return jsonify({"error": "No attendance record found for this session", "status": 404}), 404

    if record.status != "Absent":
        return jsonify({
            "error": "You can only submit a retroactive excuse for sessions where you were marked Absent",
            "status": 400,
        }), 400

    existing = WaiverRequest.query.filter_by(
        student_id=student.student_id, session_id=session_id
    ).first()
    if existing:
        return jsonify({"error": "An excuse has already been submitted for this session", "status": 409}), 409

    waiver = WaiverRequest(
        student_id          = student.student_id,
        waiver_type         = "retroactive",
        session_id          = session_id,
        class_id            = None,
        target_date         = None,
        reason              = reason,
        supporting_doc_path = supporting_doc_path,
        status              = "Pending",
    )
    db.session.add(waiver)

    admin_users = User.query.filter_by(role="admin").all()
    session_obj = Session.query.get(session_id)
    class_name  = (
        session_obj.class_.class_name if session_obj and session_obj.class_ else "Unknown"
    )

    db.session.commit()

    notifications.notify_admins_new_waiver(
        admin_users=admin_users,
        student_name=student_name,
        class_name=class_name,
    )

    return jsonify({"request_id": waiver.request_id, "message": "Excuse submitted"}), 201


@excuse_bp.route("/pending", methods=["GET"])
@require_role("admin")
def pending_excuses():
    """Return all pending waiver requests with student and class details."""
    waivers = WaiverRequest.query.filter_by(status="Pending").all()
    results = []
    for w in waivers:
        student = Student.query.get(w.student_id)
        results.append(_waiver_dict(w, student=student, include_student=True))
    return jsonify(results), 200


@excuse_bp.route("/my-excuses", methods=["GET"])
@require_role("student")
def my_excuses():
    """Return all waiver requests for the logged-in student."""
    student = Student.query.filter_by(user_id=g.current_user["user_id"]).first()
    if not student:
        return jsonify({"error": "Student profile not found", "status": 404}), 404

    waivers = (
        WaiverRequest.query.filter_by(student_id=student.student_id)
        .order_by(WaiverRequest.submitted_at.desc())
        .all()
    )
    return jsonify([_waiver_dict(w) for w in waivers]), 200


@excuse_bp.route("/history/<int:student_id>", methods=["GET"])
@require_role("student", "admin", "teacher")
def excuse_history(student_id):
    """Return all waiver requests for a student (students can only view their own)."""
    if g.current_user["role"] == "student":
        student = Student.query.filter_by(user_id=g.current_user["user_id"]).first()
        if not student or student.student_id != student_id:
            return jsonify({"error": "You can only view your own excuses", "status": 403}), 403

    waivers = (
        WaiverRequest.query.filter_by(student_id=student_id)
        .order_by(WaiverRequest.submitted_at.desc())
        .all()
    )
    return jsonify([w.to_dict() for w in waivers]), 200


@excuse_bp.route("/decide/<int:request_id>", methods=["PUT"])
@require_role("admin")
def decide_excuse(request_id):
    """Approve or reject a waiver request.

    Retroactive + Approved → flips the linked AttendanceRecord to Present.
    Prior + Approved       → no attendance record exists yet; Option A means
                             we just record the decision and let the teacher
                             handle it when the session runs.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    decision = data.get("decision", "").strip()
    if decision not in ("Approved", "Rejected"):
        return jsonify({"error": "decision must be 'Approved' or 'Rejected'", "status": 422}), 422

    waiver = WaiverRequest.query.get(request_id)
    if not waiver:
        return jsonify({"error": "Waiver request not found", "status": 404}), 404

    waiver.status      = decision
    waiver.reviewed_at = datetime.now(timezone.utc)

    # Only retroactive waivers with an existing attendance record get auto-updated
    if decision == "Approved" and waiver.waiver_type != "prior" and waiver.session_id:
        record = AttendanceRecord.query.filter_by(
            student_id=waiver.student_id, session_id=waiver.session_id
        ).first()
        if record:
            record.status       = "Present"
            record.finalized_at = datetime.now(timezone.utc)

    # Notify student
    student = Student.query.get(waiver.student_id)
    if waiver.waiver_type == "prior":
        cls        = Class.query.get(waiver.class_id) if waiver.class_id else None
        class_name = cls.class_name if cls else "All Classes"
    else:
        session_obj = Session.query.get(waiver.session_id)
        class_name  = (
            session_obj.class_.class_name
            if session_obj and session_obj.class_ else "Unknown"
        )

    if student and student.user:
        notifications.notify_excuse_decision(
            user_id=student.user_id,
            platform=student.user.platform or "",
            device_token=student.user.device_token or "",
            decision=decision,
            class_name=class_name,
        )

    db.session.commit()
    return jsonify({"message": "Decision recorded", "decision": decision}), 200
