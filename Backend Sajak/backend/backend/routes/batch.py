"""Batch routes — create and manage student batches for bulk class enrollment."""

import logging

from flask import Blueprint, jsonify, request
from sqlalchemy import func, case
from sqlalchemy.exc import IntegrityError

from database import db
from models.attendance import AttendanceRecord
from models.batch import Batch, BatchStudent
from models.batch_class_link import BatchClassLink
from models.class_model import Class, Enrollment
from models.session import Session
from models.student import Student
from middleware.auth_middleware import require_role

logger = logging.getLogger(__name__)

# At-risk threshold — matches the 75% threshold used in routes/attendance.py
AT_RISK_THRESHOLD = 75.0

batch_bp = Blueprint("batch", __name__)


# ── Pure-logic helpers (no DB, no Flask) — importable for unit tests ─────────


def is_at_risk(attendance_percent: float) -> bool:
    """Return True when *attendance_percent* is strictly below AT_RISK_THRESHOLD.

    Pure function — no I/O, no side-effects.  Extracted so the exact boundary
    condition (< not <=) can be unit-tested independently of any DB query.

    Args:
        attendance_percent: value in [0, 100], e.g. 74.9 or 75.0.

    Returns:
        True  if attendance_percent < 75.0  (student is at risk)
        False if attendance_percent >= 75.0 (student is not at risk)
    """
    return attendance_percent < AT_RISK_THRESHOLD


def pick_worst_class(student_classes: list) -> dict:
    """Return the entry with the lowest attendance_percent that is below the threshold.

    Given a list of dicts, each with at minimum:
        {"class_id": int, "attendance_percent": float}

    Returns the dict whose attendance_percent is the lowest AND strictly below
    AT_RISK_THRESHOLD, or None if no entry qualifies (all are safe, or the
    list is empty).

    For students enrolled in multiple classes this selects the "worst-case"
    class to surface on the at-risk dashboard.

    Pure function — no I/O, no side-effects.

    Args:
        student_classes: list of dicts, each representing one (student, class)
                         attendance record.

    Returns:
        The dict with the minimum attendance_percent below AT_RISK_THRESHOLD,
        or None if no such entry exists.
    """
    worst = None
    for entry in student_classes:
        pct = entry["attendance_percent"]
        if pct >= AT_RISK_THRESHOLD:
            continue  # safe class — not at risk here
        if worst is None or pct < worst["attendance_percent"]:
            worst = entry
    return worst


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


@batch_bp.route("/batches/summary", methods=["GET"])
@require_role("admin")
def batch_summary():
    """Return an attendance summary for every batch.

    For each batch:
      - student_count              — members in batch_students
      - class_count                — classes linked via batch_class_links
      - average_attendance_percent — mean per-student attendance rate across
                                     all sessions in this batch's linked classes
                                     (SQL aggregation, not Python loops)
      - at_risk_count              — students whose individual rate < AT_RISK_THRESHOLD (75%)

    The attendance rate for a student in a batch is:
        (# AttendanceRecords with status='Present' for that student
         in sessions belonging to the batch's linked classes)
        ÷ (# AttendanceRecords total for that student in those sessions)
        × 100

    Students who have zero attendance records in the batch's classes are
    counted as 0 % (and therefore at-risk if the batch has any linked classes).
    Students in batches with no linked classes at all are excluded from the
    rate calculation, and at_risk_count is 0 for that batch.
    """
    batches = Batch.query.order_by(Batch.created_at.desc()).all()

    results = []
    for batch in batches:
        # ── student_count ────────────────────────────────────────────
        student_count = db.session.query(func.count(BatchStudent.student_id)).filter(
            BatchStudent.batch_id == batch.batch_id
        ).scalar() or 0

        # ── class_count ──────────────────────────────────────────────
        class_count = db.session.query(func.count(BatchClassLink.class_id)).filter(
            BatchClassLink.batch_id == batch.batch_id
        ).scalar() or 0

        # ── per-student attendance rates via SQL ─────────────────────
        # Get all class_ids linked to this batch
        linked_class_ids = [
            row.class_id
            for row in BatchClassLink.query.filter_by(batch_id=batch.batch_id).all()
        ]

        # Get all student_ids in this batch
        batch_student_ids = [
            row.student_id
            for row in BatchStudent.query.filter_by(batch_id=batch.batch_id).all()
        ]

        avg_attendance_percent = None
        at_risk_count = 0

        if linked_class_ids and batch_student_ids:
            # Sessions that belong to any of the batch's linked classes
            session_ids_subq = (
                db.session.query(Session.session_id)
                .filter(Session.class_id.in_(linked_class_ids))
                .subquery()
            )

            # One row per student: total records and present records
            per_student = (
                db.session.query(
                    AttendanceRecord.student_id,
                    func.count(AttendanceRecord.record_id).label("total"),
                    func.sum(
                        case((AttendanceRecord.status == "Present", 1), else_=0)
                    ).label("present"),
                )
                .filter(
                    AttendanceRecord.student_id.in_(batch_student_ids),
                    AttendanceRecord.session_id.in_(session_ids_subq),
                )
                .group_by(AttendanceRecord.student_id)
                .all()
            )

            # Build a lookup: student_id → attendance_rate
            rate_by_student = {}
            for row in per_student:
                rate = (row.present / row.total * 100.0) if row.total > 0 else 0.0
                rate_by_student[row.student_id] = rate

            # Students with no records at all default to 0 %
            all_rates = []
            for sid in batch_student_ids:
                all_rates.append(rate_by_student.get(sid, 0.0))

            if all_rates:
                avg_attendance_percent = round(sum(all_rates) / len(all_rates), 1)
                at_risk_count = sum(1 for r in all_rates if r < AT_RISK_THRESHOLD)

        results.append({
            "batch_id":                  batch.batch_id,
            "batch_name":                batch.batch_name,
            "description":               batch.description,
            "student_count":             student_count,
            "class_count":               class_count,
            # None when the batch has no linked classes yet (not enough data)
            "average_attendance_percent": avg_attendance_percent,
            "at_risk_count":             at_risk_count,
            "at_risk_threshold_percent": AT_RISK_THRESHOLD,
        })

    return jsonify(results), 200


@batch_bp.route("/batches/<int:batch_id>/classes/summary", methods=["GET"])
@require_role("admin")
def batch_classes_summary(batch_id):
    """Return a per-class attendance summary for every class linked to this batch.

    For each class linked via BatchClassLink:
      - class_id, class_name, subject
      - session_count    — sessions held for this class so far
      - student_count    — batch members actually enrolled in this class
                           (intersection of batch_students and enrollments)
      - average_attendance_percent — mean per-student rate for batch members
                                     in this class; null if no sessions yet
      - at_risk_count    — batch members in this class below AT_RISK_THRESHOLD

    Returns 404 if batch_id does not exist.
    Returns [] if the batch has no linked classes.
    """
    # ── 1. Validate batch exists ─────────────────────────────────────────
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({"error": f"Batch {batch_id} not found", "status": 404}), 404

    # ── 2. Fetch all student_ids that belong to this batch ───────────────
    batch_student_ids = [
        row.student_id
        for row in BatchStudent.query.filter_by(batch_id=batch_id).all()
    ]

    # ── 3. Fetch all classes linked to this batch ────────────────────────
    links = BatchClassLink.query.filter_by(batch_id=batch_id).all()
    if not links:
        return jsonify([]), 200

    linked_class_ids = [lnk.class_id for lnk in links]

    # ── 4. Bulk-load all needed data in as few queries as possible ───────

    # session_count per class — one GROUP BY query for all linked classes
    session_counts_rows = (
        db.session.query(
            Session.class_id,
            func.count(Session.session_id).label("session_count"),
        )
        .filter(Session.class_id.in_(linked_class_ids))
        .group_by(Session.class_id)
        .all()
    )
    session_count_by_class = {row.class_id: row.session_count for row in session_counts_rows}

    # student_count per class = batch members who are enrolled in that class
    # (intersection of batch_students and enrollments for this batch)
    if batch_student_ids:
        enrolled_counts_rows = (
            db.session.query(
                Enrollment.class_id,
                func.count(Enrollment.student_id).label("enrolled_count"),
            )
            .filter(
                Enrollment.class_id.in_(linked_class_ids),
                Enrollment.student_id.in_(batch_student_ids),
            )
            .group_by(Enrollment.class_id)
            .all()
        )
    else:
        enrolled_counts_rows = []
    enrolled_count_by_class = {row.class_id: row.enrolled_count for row in enrolled_counts_rows}

    # Per-student, per-class attendance totals — one query for all classes at once
    # Only run if there are batch students with sessions to look at
    per_student_per_class = []
    if batch_student_ids:
        # Sessions scoped to the linked classes
        session_ids_subq = (
            db.session.query(Session.session_id, Session.class_id)
            .filter(Session.class_id.in_(linked_class_ids))
            .subquery()
        )

        per_student_per_class = (
            db.session.query(
                session_ids_subq.c.class_id,
                AttendanceRecord.student_id,
                func.count(AttendanceRecord.record_id).label("total"),
                func.sum(
                    case((AttendanceRecord.status == "Present", 1), else_=0)
                ).label("present"),
            )
            .join(
                AttendanceRecord,
                AttendanceRecord.session_id == session_ids_subq.c.session_id,
            )
            .filter(AttendanceRecord.student_id.in_(batch_student_ids))
            .group_by(session_ids_subq.c.class_id, AttendanceRecord.student_id)
            .all()
        )

    # Organise into: rates_by_class[class_id][student_id] = attendance_rate
    rates_by_class: dict[int, dict[int, float]] = {}
    for row in per_student_per_class:
        rate = (row.present / row.total * 100.0) if row.total > 0 else 0.0
        rates_by_class.setdefault(row.class_id, {})[row.student_id] = rate

    # ── 5. Fetch class metadata ──────────────────────────────────────────
    classes_by_id = {
        cls.class_id: cls
        for cls in Class.query.filter(Class.class_id.in_(linked_class_ids)).all()
    }

    # ── 6. Build result list ─────────────────────────────────────────────
    results = []
    for class_id in linked_class_ids:
        cls = classes_by_id.get(class_id)
        if not cls:
            continue  # class was deleted after the link was created — skip

        session_count  = session_count_by_class.get(class_id, 0)
        student_count  = enrolled_count_by_class.get(class_id, 0)

        # Enrolled batch members for this class (to default missing ones to 0 %)
        enrolled_sids = [
            sid for sid in batch_student_ids
            if Enrollment.query.filter_by(student_id=sid, class_id=class_id).first()
        ] if batch_student_ids else []

        avg_attendance_percent = None
        at_risk_count = 0

        class_rates = rates_by_class.get(class_id, {})

        if enrolled_sids and session_count > 0:
            all_rates = [class_rates.get(sid, 0.0) for sid in enrolled_sids]
            avg_attendance_percent = round(sum(all_rates) / len(all_rates), 1)
            at_risk_count = sum(1 for r in all_rates if r < AT_RISK_THRESHOLD)

        results.append({
            "class_id":                   class_id,
            "class_name":                 cls.class_name,
            "subject":                    cls.subject,
            "room":                       cls.room,
            "session_count":              session_count,
            "student_count":              student_count,
            "average_attendance_percent": avg_attendance_percent,
            "at_risk_count":              at_risk_count,
            "at_risk_threshold_percent":  AT_RISK_THRESHOLD,
        })

    # Sort by class_name for stable ordering
    results.sort(key=lambda r: r["class_name"].lower())

    logger.info(
        "batch_classes_summary: batch_id=%s returned %d classes",
        batch_id, len(results),
    )
    return jsonify(results), 200


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
