"""Excuse / waiver routes — submit, pending, history, decide."""

import logging
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from database import db
from models.attendance import AttendanceRecord
from models.excuse import WaiverRequest
from models.notification import Notification
from models.session import Session
from models.student import Student
from models.user import User
from middleware.auth_middleware import require_role
from services import firebase_sync, notifications

logger = logging.getLogger(__name__)

excuse_bp = Blueprint("excuse", __name__)


@excuse_bp.route("/submit", methods=["POST"])
@require_role("student")
def submit_excuse():
    """Submit an excuse request for a session where the student was absent."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    session_id = data.get("session_id", "").strip()
    reason = data.get("reason", "").strip()
    supporting_doc_path = data.get("supporting_doc_path", "").strip()

    if not session_id or not reason:
        return (
            jsonify({"error": "session_id and reason are required", "status": 400}),
            400,
        )

    # Get student profile from current user
    student = Student.query.filter_by(user_id=g.current_user["user_id"]).first()
    if not student:
        return jsonify({"error": "Student profile not found", "status": 404}), 404

    # Verify student was marked Absent for this session
    record = AttendanceRecord.query.filter_by(
        student_id=student.student_id, session_id=session_id
    ).first()
    if not record:
        return (
            jsonify(
                {"error": "No attendance record found for this session", "status": 404}
            ),
            404,
        )

    if record.status != "Absent":
        return (
            jsonify(
                {"error": "You can only submit an excuse for sessions where you were marked Absent", "status": 400}
            ),
            400,
        )

    # Check for duplicate waiver request
    existing = WaiverRequest.query.filter_by(
        student_id=student.student_id, session_id=session_id
    ).first()
    if existing:
        return (
            jsonify({"error": "An excuse has already been submitted for this session", "status": 409}),
            409,
        )

    # Create waiver request
    waiver = WaiverRequest(
        student_id=student.student_id,
        session_id=session_id,
        reason=reason,
        supporting_doc_path=supporting_doc_path or None,
        status="Pending",
    )
    db.session.add(waiver)

    # Create notifications for all admin users
    admin_users = User.query.filter_by(role="admin").all()
    student_name = student.user.fullname if student.user else "Unknown"
    session_obj = Session.query.get(session_id)
    class_name = (
        session_obj.class_.class_name if session_obj and session_obj.class_ else "Unknown"
    )

    for admin in admin_users:
        notif = Notification(
            user_id=admin.id,
            type="Waiver",
            message=f"{student_name} submitted an excuse for {class_name}",
        )
        db.session.add(notif)

    db.session.commit()

    # Push FCM notification to admins (best-effort)
    admin_tokens = [a.device_token for a in admin_users if a.device_token]
    notifications.send_waiver_request_notification(
        admin_tokens_list=admin_tokens,
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
        session_obj = Session.query.get(w.session_id)

        results.append(
            {
                "request_id": w.request_id,
                "student_id": w.student_id,
                "student_name": student.user.fullname if student and student.user else None,
                "roll_number": student.roll_number if student else None,
                "session_id": w.session_id,
                "class_name": (
                    session_obj.class_.class_name
                    if session_obj and session_obj.class_
                    else None
                ),
                "session_date": (
                    session_obj.start_time.isoformat()
                    if session_obj and session_obj.start_time
                    else None
                ),
                "reason": w.reason,
                "submitted_at": w.submitted_at.isoformat() if w.submitted_at else None,
            }
        )

    return jsonify(results), 200


@excuse_bp.route("/my-excuses", methods=["GET"])
@require_role("student")
def my_excuses():
    """Return all waiver requests for the logged in student."""
    current_user = g.current_user
    student = Student.query.filter_by(user_id=current_user["user_id"]).first()
    if not student:
        return jsonify({"error": "Student profile not found", "status": 404}), 404

    waivers = (
        WaiverRequest.query.filter_by(student_id=student.student_id)
        .order_by(WaiverRequest.submitted_at.desc())
        .all()
    )

    results = []
    for w in waivers:
        session_obj = Session.query.get(w.session_id)
        results.append(
            {
                "request_id": w.request_id,
                "session_id": w.session_id,
                "class_name": (
                    session_obj.class_.class_name
                    if session_obj and session_obj.class_
                    else None
                ),
                "session_date": (
                    session_obj.start_time.isoformat()
                    if session_obj and session_obj.start_time
                    else None
                ),
                "reason": w.reason,
                "supporting_doc_path": w.supporting_doc_path,
                "status": w.status,
                "submitted_at": w.submitted_at.isoformat() if w.submitted_at else None,
                "reviewed_at": w.reviewed_at.isoformat() if w.reviewed_at else None,
            }
        )

    return jsonify(results), 200


@excuse_bp.route("/history/<int:student_id>", methods=["GET"])
@require_role("student", "admin", "teacher")
def excuse_history(student_id):
    """Return all waiver requests for a student.

    Students can only view their own excuses.
    """
    current_user = g.current_user

    if current_user["role"] == "student":
        student = Student.query.filter_by(user_id=current_user["user_id"]).first()
        if not student or student.student_id != student_id:
            return (
                jsonify({"error": "You can only view your own excuses", "status": 403}),
                403,
            )

    waivers = (
        WaiverRequest.query.filter_by(student_id=student_id)
        .order_by(WaiverRequest.submitted_at.desc())
        .all()
    )

    return jsonify([w.to_dict() for w in waivers]), 200


@excuse_bp.route("/decide/<int:request_id>", methods=["PUT"])
@require_role("admin")
def decide_excuse(request_id):
    """Approve or reject a waiver request."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    decision = data.get("decision", "").strip()
    if decision not in ("Approved", "Rejected"):
        return (
            jsonify(
                {"error": "decision must be 'Approved' or 'Rejected'", "status": 422}
            ),
            422,
        )

    waiver = WaiverRequest.query.get(request_id)
    if not waiver:
        return jsonify({"error": "Waiver request not found", "status": 404}), 404

    waiver.status = decision
    waiver.reviewed_at = datetime.now(timezone.utc)

    # If approved, update attendance record to Present
    if decision == "Approved":
        record = AttendanceRecord.query.filter_by(
            student_id=waiver.student_id, session_id=waiver.session_id
        ).first()
        if record:
            record.status = "Present"
            record.finalized_at = datetime.now(timezone.utc)

        # Sync updated attendance to Firebase (best-effort)
        firebase_sync.sync_manual_override(
            waiver.student_id, waiver.session_id, "Present"
        )

    # Sync excuse decision to Firebase (best-effort)
    firebase_sync.sync_excuse_decision(
        request_id, waiver.student_id, decision, waiver.session_id
    )

    # Send FCM push notification to the student
    student = Student.query.get(waiver.student_id)
    session_obj = Session.query.get(waiver.session_id)
    class_name = (
        session_obj.class_.class_name if session_obj and session_obj.class_ else "Unknown"
    )

    if student and student.user:
        device_token = student.user.device_token

        if decision == "Approved":
            notifications.send_excuse_approved_notification(device_token, class_name)
        else:
            notifications.send_excuse_rejected_notification(device_token, class_name)

        # Create in-app notification for the student
        notif = Notification(
            user_id=student.user_id,
            type="Waiver",
            message=(
                f"Your excuse for {class_name} has been {decision.lower()}"
            ),
        )
        db.session.add(notif)

    db.session.commit()

    return jsonify({"message": "Decision recorded", "decision": decision}), 200
