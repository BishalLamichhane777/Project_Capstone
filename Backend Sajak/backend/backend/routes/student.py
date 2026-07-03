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
    """Return all students with user info."""
    students = Student.query.all()
    return jsonify([s.to_dict() for s in students]), 200


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


@student_bp.route("/<int:student_id>", methods=["DELETE"])
@require_role("admin")
def delete_student(student_id):
    """Delete a student and all associated data.

    Cascade deletes: enrollments, attendance_logs, attendance_records,
    waiver_requests, notifications, student profile, and user account.
    Also removes user from Firebase Auth.
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

    # Remove from Firebase Auth (best-effort)
    try:
        from firebase_admin import auth as firebase_auth

        firebase_auth.delete_user(str(user_id))
        logger.info("Firebase Auth user %s deleted", user_id)
    except Exception as exc:
        logger.warning("Firebase Auth deletion failed for user %s: %s", user_id, exc)

    return jsonify({"message": "Student deleted"}), 200


@student_bp.route("/notifications", methods=["GET"])
@require_role("student")
def student_notifications():
    """Return notifications for the logged-in student. Marks them as read."""
    user_id = g.current_user["user_id"]

    notifs = (
        Notification.query.filter_by(user_id=user_id)
        .order_by(Notification.sent_at.desc())
        .all()
    )

    results = [n.to_dict() for n in notifs]

    # Mark all as read
    for n in notifs:
        if not n.is_read:
            n.is_read = True

    db.session.commit()

    return jsonify(results), 200
