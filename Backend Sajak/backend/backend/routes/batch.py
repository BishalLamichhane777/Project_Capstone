"""Batch routes — create and manage student batches for bulk class enrollment."""

import logging

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from database import db
from models.batch import Batch, BatchStudent
from models.class_model import Class, Enrollment
from models.student import Student
from middleware.auth_middleware import require_role

logger = logging.getLogger(__name__)

batch_bp = Blueprint("batch", __name__)


# ── Batch CRUD ────────────────────────────────────────────────────────────────


@batch_bp.route("/batches", methods=["POST"])
@require_role("admin")
def create_batch():
    """Create a new batch, optionally pre-populating with student_ids."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    batch_name = data.get("batch_name", "").strip()
    if not batch_name:
        return jsonify({"error": "batch_name is required", "status": 400}), 400

    description = (data.get("description") or "").strip() or None

    batch = Batch(batch_name=batch_name, description=description)
    db.session.add(batch)
    db.session.flush()  # get batch_id before adding students

    student_ids = data.get("student_ids", []) or []
    added = 0
    for sid in student_ids:
        student = Student.query.get(sid)
        if not student:
            continue
        existing = BatchStudent.query.filter_by(
            batch_id=batch.batch_id, student_id=sid
        ).first()
        if not existing:
            db.session.add(BatchStudent(batch_id=batch.batch_id, student_id=sid))
            added += 1

    db.session.commit()
    logger.info("Batch created: batch_id=%s name=%s students_added=%d",
                batch.batch_id, batch_name, added)

    return jsonify(batch.to_dict()), 201


@batch_bp.route("/batches", methods=["GET"])
@require_role("admin")
def list_batches():
    """Return all batches with student_count."""
    batches = Batch.query.order_by(Batch.created_at.desc()).all()
    return jsonify([b.to_dict() for b in batches]), 200


@batch_bp.route("/batches/<int:batch_id>", methods=["GET"])
@require_role("admin")
def get_batch(batch_id):
    """Return a single batch with full student list."""
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({"error": "Batch not found", "status": 404}), 404

    return jsonify(batch.to_dict(include_students=True)), 200


@batch_bp.route("/batches/<int:batch_id>", methods=["PUT"])
@require_role("admin")
def update_batch(batch_id):
    """Update batch_name and/or description."""
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({"error": "Batch not found", "status": 404}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    if "batch_name" in data:
        batch_name = data["batch_name"].strip()
        if not batch_name:
            return jsonify({"error": "batch_name cannot be empty", "status": 400}), 400
        batch.batch_name = batch_name
    if "description" in data:
        batch.description = data["description"].strip() or None

    db.session.commit()
    logger.info("Batch updated: batch_id=%s", batch_id)

    return jsonify({"message": "Batch updated"}), 200


@batch_bp.route("/batches/<int:batch_id>", methods=["DELETE"])
@require_role("admin")
def delete_batch(batch_id):
    """Delete batch and batch_students rows only — never touches enrollments table."""
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({"error": "Batch not found", "status": 404}), 404

    db.session.delete(batch)  # cascade="all, delete-orphan" removes batch_students
    db.session.commit()
    logger.info("Batch deleted: batch_id=%s", batch_id)

    return jsonify({"message": "Batch deleted"}), 200


# ── Batch Student Management ──────────────────────────────────────────────────


@batch_bp.route("/batches/<int:batch_id>/students", methods=["POST"])
@require_role("admin")
def add_students_to_batch(batch_id):
    """Add students to a batch, skipping already-present members."""
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({"error": "Batch not found", "status": 404}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    student_ids = data.get("student_ids", []) or []
    if not student_ids:
        return jsonify({"error": "student_ids is required", "status": 400}), 400

    added = 0
    skipped = 0
    added_student_ids = []  # track newly added IDs for auto-enrollment below
    for sid in student_ids:
        student = Student.query.get(sid)
        if not student:
            skipped += 1
            continue
        existing = BatchStudent.query.filter_by(
            batch_id=batch_id, student_id=sid
        ).first()
        if existing:
            skipped += 1
            continue
        db.session.add(BatchStudent(batch_id=batch_id, student_id=sid))
        added_student_ids.append(sid)
        added += 1

    # Auto-enroll newly added students into every class this batch is linked to
    from models.batch_class_link import BatchClassLink
    linked_classes = BatchClassLink.query.filter_by(batch_id=batch_id).all()
    for link in linked_classes:
        for sid in added_student_ids:
            existing_enrollment = Enrollment.query.filter_by(
                student_id=sid, class_id=link.class_id
            ).first()
            if not existing_enrollment:
                db.session.add(Enrollment(student_id=sid, class_id=link.class_id))

    db.session.commit()
    logger.info("Batch students added: batch_id=%s added=%d skipped=%d",
                batch_id, added, skipped)

    return jsonify({"added": added, "skipped": skipped}), 200


@batch_bp.route("/batches/<int:batch_id>/students/<int:student_id>", methods=["DELETE"])
@require_role("admin")
def remove_student_from_batch(batch_id, student_id):
    """Remove student from batch AND unenroll from every class this batch is linked to."""
    from models.batch_class_link import BatchClassLink

    bs = BatchStudent.query.filter_by(
        batch_id=batch_id, student_id=student_id
    ).first()
    if not bs:
        return jsonify({"error": "Student not found in batch", "status": 404}), 404

    # Unenroll from every class this batch is permanently linked to
    linked_classes = BatchClassLink.query.filter_by(batch_id=batch_id).all()
    unenrolled_count = 0
    for link in linked_classes:
        enrollment = Enrollment.query.filter_by(
            student_id=student_id, class_id=link.class_id
        ).first()
        if enrollment:
            db.session.delete(enrollment)
            unenrolled_count += 1

    db.session.delete(bs)
    db.session.commit()

    logger.info(
        "Student removed from batch and unenrolled: "
        "batch_id=%s student_id=%s classes_unenrolled=%s",
        batch_id, student_id, unenrolled_count,
    )

    return jsonify({
        "message": "Student removed from batch and unenrolled from linked classes",
        "unenrolled_from_classes": unenrolled_count,
    }), 200


# ── Batch Enrollment into Class ───────────────────────────────────────────────


@batch_bp.route("/classes/<int:class_id>/enroll-batch", methods=["POST"])
@require_role("admin")
def enroll_batch_into_class(class_id):
    """Bulk-enroll all students in a batch into a class, skipping duplicates."""
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({"error": "Class not found", "status": 404}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    batch_id = data.get("batch_id")
    if batch_id is None:
        return jsonify({"error": "batch_id is required", "status": 400}), 400

    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({"error": "Batch not found", "status": 404}), 404

    enrolled = 0
    skipped = 0

    for bs in batch.batch_students:
        try:
            existing = Enrollment.query.filter_by(
                student_id=bs.student_id, class_id=class_id
            ).first()
            if existing:
                skipped += 1
                continue
            db.session.add(Enrollment(
                student_id=bs.student_id, class_id=class_id
            ))
            db.session.flush()
            enrolled += 1
        except IntegrityError:
            db.session.rollback()
            skipped += 1

    db.session.commit()
    logger.info(
        "Batch enrolled into class: batch_id=%s class_id=%s enrolled=%d skipped=%d",
        batch_id, class_id, enrolled, skipped,
    )

    # Persist a permanent batch↔class link so future student additions/removals
    # automatically sync enrollment for this class.
    from models.batch_class_link import BatchClassLink
    existing_link = BatchClassLink.query.filter_by(
        batch_id=batch_id, class_id=class_id
    ).first()
    if not existing_link:
        db.session.add(BatchClassLink(batch_id=batch_id, class_id=class_id))
        db.session.commit()

    return jsonify({
        "enrolled": enrolled,
        "skipped":  skipped,
        "total":    enrolled + skipped,
    }), 200
