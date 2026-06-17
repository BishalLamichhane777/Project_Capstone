# validate_embeddings.py
# Startup validation and migration utilities for face recognition embeddings.
#
# Invariant this module enforces:
#   For every student row with a non-null face_label,
#   there MUST be a file named {face_label}_mean.npy in EMBEDDINGS_FOLDER.
#
# Called from app.py at startup (read-only check, warnings only).
# Also runnable as a standalone script with an optional --fix flag that
# auto-updates DB face_label values when a unique match can be found.

import json
import logging
import os

logger = logging.getLogger(__name__)

_DIR              = os.path.dirname(os.path.abspath(__file__))
EMBEDDINGS_FOLDER = os.path.join(_DIR, "embeddings")


def _get_all_embedding_keys() -> set:
    """Return the set of keys for which a *_mean.npy file exists on disk."""
    if not os.path.isdir(EMBEDDINGS_FOLDER):
        return set()
    return {
        fname.replace("_mean.npy", "")
        for fname in os.listdir(EMBEDDINGS_FOLDER)
        if fname.endswith("_mean.npy")
    }


def validate_face_labels(app=None) -> dict:
    """Check that every enrolled student's face_label has a matching .npy file.

    Can be called with or without a Flask app context.

    Returns:
        {
          "ok":       bool,          # True = no mismatches found
          "missing":  [str],         # face_labels in DB with no .npy on disk
          "orphaned": [str],         # .npy keys on disk with no DB face_label
          "unset":    [int],         # student_ids whose face_label is NULL/empty
        }
    """
    disk_keys = _get_all_embedding_keys()

    # ── Pull DB values ────────────────────────────────────────────────
    db_labels   = set()
    unset_ids   = []

    def _query(session):
        from models.student import Student
        students = session.query(Student).all()
        for s in students:
            if s.face_label:
                db_labels.add(s.face_label)
            else:
                unset_ids.append(s.student_id)

    if app is not None:
        with app.app_context():
            from database import db
            _query(db.session)
    else:
        # Already inside an app context (called from app factory)
        from database import db
        _query(db.session)

    missing  = sorted(db_labels - disk_keys)   # in DB but no .npy
    orphaned = sorted(disk_keys - db_labels)   # .npy on disk but no DB row

    ok = not missing  # orphaned files are a warning, not a hard error

    if missing:
        logger.warning(
            "Face label mismatch — %d DB label(s) have no embedding file: %s",
            len(missing), missing,
        )
    if orphaned:
        logger.info(
            "Orphaned embeddings — %d .npy file(s) on disk with no matching DB face_label: %s",
            len(orphaned), orphaned,
        )
    if unset_ids:
        logger.info(
            "%d student(s) have no face_label set (not yet enrolled): student_ids=%s",
            len(unset_ids), unset_ids,
        )
    if ok and not orphaned:
        logger.info("Face embedding validation passed — all labels consistent.")

    return {
        "ok":       ok,
        "missing":  missing,
        "orphaned": orphaned,
        "unset":    unset_ids,
    }


# ─── Standalone migration script ──────────────────────────────────────────────

def run_migration(fix: bool = False):
    """Print a reconciliation report and optionally auto-fix mismatches.

    Auto-fix logic (only applied when fix=True):
      For each student whose face_label has no matching .npy:
        1. If their roll_number has a matching .npy  → update face_label to roll_number
        2. Else if exactly one orphaned .npy exists   → update face_label to that key
        3. Otherwise                                  → report as unresolvable

    This covers the common case where the DB still has the old manual
    Student_N label while the .npy was re-enrolled under roll_number, or
    vice-versa.
    """
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

    # Bootstrap a minimal Flask app context so SQLAlchemy works
    from app import create_app
    app = create_app()

    with app.app_context():
        from database import db
        from models.student import Student

        disk_keys = _get_all_embedding_keys()
        students  = Student.query.all()

        print("\n" + "=" * 60)
        print("  FACE EMBEDDING MIGRATION REPORT")
        print("=" * 60)
        print(f"\nEmbeddings on disk : {sorted(disk_keys)}")
        print(f"Students in DB     : {[(s.student_id, s.roll_number, s.face_label) for s in students]}")

        mismatches = [
            s for s in students
            if s.face_label and s.face_label not in disk_keys
        ]
        unset = [s for s in students if not s.face_label]

        if not mismatches and not unset:
            print("\n✓ All face_labels are consistent — nothing to do.")
            return

        if unset:
            print(f"\nStudents with no face_label (not enrolled): "
                  f"{[s.student_id for s in unset]}")

        if not mismatches:
            print("\n✓ No label mismatches found.")
            return

        print(f"\nMismatches found: {len(mismatches)}")
        orphaned = disk_keys - {s.face_label for s in students if s.face_label}

        fixed   = []
        skipped = []

        for s in mismatches:
            old_label = s.face_label
            resolution = None

            # Strategy 1: roll_number has a .npy
            if s.roll_number in disk_keys:
                resolution = s.roll_number

            # Strategy 2: exactly one orphaned .npy — likely belongs to this student
            elif len(orphaned) == 1:
                resolution = next(iter(orphaned))

            print(f"\n  student_id={s.student_id}  roll={s.roll_number}")
            print(f"    face_label in DB : '{old_label}'")
            print(f"    .npy on disk     : NOT FOUND")
            if resolution:
                print(f"    → Resolution     : update face_label to '{resolution}'")
                if fix:
                    s.face_label = resolution
                    fixed.append((s.student_id, old_label, resolution))
                    if resolution in orphaned:
                        orphaned.discard(resolution)
                else:
                    print(f"      (run with --fix to apply)")
            else:
                print(f"    → Unresolvable   : re-enroll this student via POST /api/admin/enroll-face")
                skipped.append(s.student_id)

        if fix and fixed:
            db.session.commit()
            print(f"\n✓ Fixed {len(fixed)} label(s):")
            for sid, old, new in fixed:
                print(f"    student_id={sid}: '{old}' → '{new}'")

        if skipped:
            print(f"\n✗ {len(skipped)} student(s) could not be auto-fixed: {skipped}")
            print("  Re-enroll them via POST /api/admin/enroll-face")

        print("\n" + "=" * 60)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(
        description="Validate and optionally repair face_label ↔ embedding file consistency."
    )
    parser.add_argument(
        "--fix", action="store_true",
        help="Auto-update DB face_label values where a unique resolution can be found."
    )
    args = parser.parse_args()
    run_migration(fix=args.fix)
