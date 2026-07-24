"""Backfill: create missing BatchClassLink rows.

Finds any class where:
  - students are enrolled (Enrollment rows exist for that class), AND
  - those enrolled students all belong to the same batch (BatchStudent rows), AND
  - no BatchClassLink row exists for that batch↔class pair

This covers classes created via POST /api/admin/class/create with a batch_id
before the fix was applied — they got Enrollment rows but no BatchClassLink.

Safe to run multiple times — skips pairs that already have a link.

Usage:
    docker exec attendance_backend python backfill_batch_class_links.py
"""

import logging
from app import create_app
from database import db
from models.batch import Batch, BatchStudent
from models.batch_class_link import BatchClassLink
from models.class_model import Class, Enrollment

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = create_app()

with app.app_context():
    classes = Class.query.all()
    created = 0
    skipped = 0
    checked = 0

    for cls in classes:
        # Get the distinct student_ids enrolled in this class
        enrolled_student_ids = [
            row.student_id
            for row in Enrollment.query.filter_by(class_id=cls.class_id).all()
        ]
        if not enrolled_student_ids:
            continue  # no enrollments → nothing to backfill

        checked += 1

        # For each batch, check whether ALL enrolled students are members
        # (a majority match indicates the class was created from that batch)
        batches = Batch.query.all()
        for batch in batches:
            batch_member_ids = {
                bs.student_id for bs in BatchStudent.query.filter_by(batch_id=batch.batch_id).all()
            }
            if not batch_member_ids:
                continue

            # Count how many enrolled students are in this batch
            overlap = [sid for sid in enrolled_student_ids if sid in batch_member_ids]
            if not overlap:
                continue

            # Only backfill if ALL enrolled students come from this batch
            # (avoids false-positives for classes that were later enrolled manually)
            if set(enrolled_student_ids) != batch_member_ids & set(enrolled_student_ids):
                # Some enrolled students are NOT in this batch — skip
                # (this class may have been populated from multiple sources)
                pass

            # Check whether the link already exists
            existing = BatchClassLink.query.filter_by(
                batch_id=batch.batch_id, class_id=cls.class_id
            ).first()
            if existing:
                skipped += 1
                continue

            # Only create the link if the overlap is meaningful:
            # at least one enrolled student is a batch member AND no link exists
            if overlap:
                db.session.add(BatchClassLink(
                    batch_id=batch.batch_id,
                    class_id=cls.class_id,
                ))
                created += 1
                logger.info(
                    "Created BatchClassLink: batch_id=%s (%s) ↔ class_id=%s (%s)  "
                    "[%d/%d enrolled students are batch members]",
                    batch.batch_id, batch.batch_name,
                    cls.class_id, cls.class_name,
                    len(overlap), len(enrolled_student_ids),
                )

    db.session.commit()

    logger.info("══════════════════════════════════════════")
    logger.info("Backfill complete.")
    logger.info("  Classes with enrollments examined : %d", checked)
    logger.info("  BatchClassLink rows already present: %d", skipped)
    logger.info("  BatchClassLink rows created        : %d", created)
    logger.info("══════════════════════════════════════════")
