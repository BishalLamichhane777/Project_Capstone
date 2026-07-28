"""Student routes — list, detail, enrol, unenrol, delete, notifications."""

import logging

from flask import Blueprint, g, jsonify, request

from database import db
from models.attendance import AttendanceLog, AttendanceRecord
from models.class_model import Enrollment
from models.excuse import WaiverRequest
from models.notification import Notification
from models.student import Student
from models.user import User
from middleware.auth_middleware import require_role

logger = logging.getLogger(__name__)

student_bp = Blueprint("student_routes", __name__)


@student_bp.route("/list", methods=["GET"])
@require_role("admin", "teacher")
def list_students():
    """Return all students with user info, including is_active status."""
    students = Student.query.all()
    results = []
    for s in students:
        d = s.to_dict()
        # Include is_active from the linked User so the frontend can
        # show deactivated students differently without a separate request.
        d["is_active"] = s.user.is_active if s.user else True
        # Also expose user_id so the frontend can call deactivate/reactivate
        # routes which operate on user_id, not student_id.
        d["user_id"] = s.user_id
        results.append(d)
    return jsonify(results), 200


@student_bp.route("/classes", methods=["GET"])
@require_role("student", "teacher", "admin")
def get_student_classes():
    """Return classes the logged-in student is enrolled in with active sessions."""
    student = Student.query.filter_by(user_id=g.current_user["user_id"]).first()
    if not student:
        return jsonify({"error": "Student profile not found", "status": 404}), 404

    from models.session import Session
    enrollments = Enrollment.query.filter_by(student_id=student.student_id).all()
    
    results = []
    for enrollment in enrollments:
        cls = enrollment.class_
        if cls:
            active_session = Session.query.filter_by(class_id=cls.class_id, status="ACTIVE").first()
            d = cls.to_dict()
            d["active_session_id"] = active_session.session_id if active_session else None
            results.append(d)
            
    return jsonify(results), 200


@student_bp.route("/<int:student_id>", methods=["GET"])
@require_role("admin", "teacher")
def get_student(student_id):
    """Return single student profile with enrollment info."""
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found", "status": 404}), 404

    result = student.to_dict()

    # Include enrollments
    enrollments = Enrollment.query.filter_by(student_id=student_id).all()
    result["enrollments"] = [e.to_dict() for e in enrollments]

    return jsonify(result), 200


@student_bp.route("/enrol/<int:student_id>", methods=["PUT"])
@require_role("admin")
def enrol_student(student_id):
    """Enrol a student in a class."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    class_id = data.get("class_id")
    if not class_id:
        return jsonify({"error": "class_id is required", "status": 400}), 400

    # Verify student exists
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found", "status": 404}), 404

    # Check for existing enrollment
    existing = Enrollment.query.filter_by(
        student_id=student_id, class_id=class_id
    ).first()
    if existing:
        return (
            jsonify({"error": "Student is already enrolled in this class", "status": 409}),
            409,
        )

    enrollment = Enrollment(student_id=student_id, class_id=class_id)
    db.session.add(enrollment)
    db.session.commit()

    return jsonify({"message": "Student enrolled"}), 201


@student_bp.route("/unenrol", methods=["DELETE"])
@require_role("admin")
def unenrol_student():
    """Remove a student from a class."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    student_id = data.get("student_id")
    class_id = data.get("class_id")

    if not student_id or not class_id:
        return (
            jsonify({"error": "student_id and class_id are required", "status": 400}),
            400,
        )

    enrollment = Enrollment.query.filter_by(
        student_id=student_id, class_id=class_id
    ).first()
    if not enrollment:
        return jsonify({"error": "Enrollment not found", "status": 404}), 404

    db.session.delete(enrollment)
    db.session.commit()

    return jsonify({"message": "Student unenrolled"}), 200


@student_bp.route("/<int:student_id>", methods=["PUT"])
@require_role("admin")
def update_student(student_id):
    """Admin: update a student's user info and/or student profile fields."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    student = Student.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found", "status": 404}), 404

    user = User.query.get(student.user_id)
    if not user:
        return jsonify({"error": "Associated user not found", "status": 404}), 404

    # ── User fields ──────────────────────────────────────────────────────────
    if "fullname" in data:
        fullname = (data["fullname"] or "").strip()
        if not fullname:
            return jsonify({"error": "fullname cannot be empty", "status": 400}), 400
        user.fullname = fullname

    if "phone" in data:
        user.phone = data["phone"].strip() if data["phone"] else None

    if "email" in data:
        new_email = (data["email"] or "").strip().lower()
        if not new_email:
            return jsonify({"error": "email cannot be empty", "status": 400}), 400
        # Check uniqueness (ignore current user)
        existing = User.query.filter(User.email == new_email, User.id != user.id).first()
        if existing:
            return jsonify({"error": "Email already in use", "status": 409}), 409
        user.email = new_email

    # ── Student profile fields ───────────────────────────────────────────────
    if "roll_number" in data:
        rn = (data["roll_number"] or "").strip().upper()
        if not rn:
            return jsonify({"error": "roll_number cannot be empty", "status": 400}), 400
        # Check uniqueness (ignore current student)
        existing_rn = Student.query.filter(
            Student.roll_number == rn, Student.student_id != student_id
        ).first()
        if existing_rn:
            return jsonify({"error": "Roll number already in use", "status": 409}), 409
        student.roll_number = rn

    if "program" in data:
        student.program = (data["program"] or "").strip() or None

    if "year_of_study" in data:
        yos = data["year_of_study"]
        student.year_of_study = int(yos) if yos is not None else None

    db.session.commit()
    logger.info("Admin updated student_id=%s", student_id)

    result = student.to_dict()
    result["email"] = user.email
    result["phone"] = user.phone
    return jsonify(result), 200



@student_bp.route("/<int:student_id>", methods=["DELETE"])
@require_role("admin")
def delete_student(student_id):
    """Delete a student and all associated data.

    Cascade deletes: enrollments, attendance_logs, attendance_records,
    waiver_requests, notifications, student profile, and user account.
    """
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found", "status": 404}), 404

    user_id = student.user_id
    user = User.query.get(user_id)

    # Delete related data explicitly (in case cascade isn't set up in all places)
    AttendanceLog.query.filter_by(student_id=student_id).delete()
    AttendanceRecord.query.filter_by(student_id=student_id).delete()
    WaiverRequest.query.filter_by(student_id=student_id).delete()
    Enrollment.query.filter_by(student_id=student_id).delete()

    if user:
        Notification.query.filter_by(user_id=user_id).delete()

    # Delete student profile
    db.session.delete(student)

    # Delete user account
    if user:
        db.session.delete(user)

    db.session.commit()

    return jsonify({"message": "Student deleted"}), 200


@student_bp.route("/notifications", methods=["GET"])
@require_role("student")
def student_notifications():
    """Return notifications for the logged-in student, newest first.

    Does NOT auto-mark as read — use PUT /notifications/<id>/read.
    """
    user_id = g.current_user["user_id"]

    notifs = (
        Notification.query.filter_by(user_id=user_id)
        .order_by(Notification.sent_at.desc())
        .all()
    )

    return jsonify([n.to_dict() for n in notifs]), 200


@student_bp.route("/notifications/<int:notif_id>/read", methods=["PUT"])
@require_role("student")
def mark_notification_read(notif_id):
    """Mark a single notification as read.

    Only the owning student can mark their own notification.
    Returns 404 if the notification does not exist or belongs to another user.
    """
    user_id = g.current_user["user_id"]

    notif = Notification.query.filter_by(
        notif_id=notif_id, user_id=user_id
    ).first()

    if not notif:
        return jsonify({"error": "Notification not found", "status": 404}), 404

    notif.is_read = True
    db.session.commit()

    return jsonify({"message": "Notification marked as read", "notif_id": notif_id}), 200
