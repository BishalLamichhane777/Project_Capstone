"""Firebase Realtime Database synchronization service.

All operations are wrapped in try/except so Firebase being offline
or misconfigured never crashes the API.
"""

import logging

logger = logging.getLogger(__name__)

_db_ref = None


def _get_db():
    """Lazy-load the Firebase Realtime Database reference."""
    global _db_ref
    if _db_ref is None:
        try:
            from firebase_admin import db as firebase_db

            _db_ref = firebase_db
        except Exception as exc:
            logger.error("Failed to import Firebase DB module: %s", exc)
    return _db_ref


def sync_session_start(session_id: str, data: dict) -> bool:
    """Push session start data to /sessions/{session_id}.

    Data pushed: {status, class_id, mode, liveCount: 0}

    Returns True on success, False on failure.
    """
    try:
        db = _get_db()
        if db is None:
            return False
        ref = db.reference(f"/sessions/{session_id}")
        ref.set(
            {
                "status": data.get("status", "ACTIVE"),
                "class_id": data.get("class_id"),
                "mode": data.get("mode"),
                "liveCount": 0,
            }
        )
        logger.info("Firebase: session %s start synced", session_id)
        return True
    except Exception as exc:
        logger.error("Firebase sync_session_start failed: %s", exc)
        return False


def sync_session_end(session_id: str, summary: dict) -> bool:
    """Update /sessions/{session_id} with CLOSED status and summary.

    Returns True on success, False on failure.
    """
    try:
        db = _get_db()
        if db is None:
            return False
        ref = db.reference(f"/sessions/{session_id}")
        ref.update(
            {
                "status": "CLOSED",
                "summary": {
                    "present": summary.get("present", 0),
                    "absent": summary.get("absent", 0),
                    "total": summary.get("total", 0),
                },
            }
        )
        logger.info("Firebase: session %s end synced", session_id)
        return True
    except Exception as exc:
        logger.error("Firebase sync_session_end failed: %s", exc)
        return False


def sync_attendance_summary(session_id: str, student_summaries: list) -> bool:
    """Push per-student attendance results under /sessions/{session_id}/attendance/.

    Each item in student_summaries: {student_id, status, total_duration_seconds}

    Returns True on success, False on failure.
    """
    try:
        db = _get_db()
        if db is None:
            return False
        for entry in student_summaries:
            student_id = entry.get("student_id")
            ref = db.reference(
                f"/sessions/{session_id}/attendance/{student_id}"
            )
            ref.set(
                {
                    "status": entry.get("status"),
                    "total_duration_seconds": entry.get("total_duration_seconds", 0),
                }
            )
        logger.info(
            "Firebase: attendance summary synced for session %s (%d students)",
            session_id,
            len(student_summaries),
        )
        return True
    except Exception as exc:
        logger.error("Firebase sync_attendance_summary failed: %s", exc)
        return False


def sync_excuse_decision(
    request_id: int, student_id: int, decision: str, session_id: str
) -> bool:
    """Update /excuse/{request_id} with the decision.

    Returns True on success, False on failure.
    """
    try:
        db = _get_db()
        if db is None:
            return False
        ref = db.reference(f"/excuse/{request_id}")
        ref.update(
            {
                "decision": decision,
                "student_id": student_id,
                "session_id": session_id,
            }
        )
        logger.info("Firebase: excuse %d decision synced", request_id)
        return True
    except Exception as exc:
        logger.error("Firebase sync_excuse_decision failed: %s", exc)
        return False


def sync_manual_override(
    student_id: int, session_id: str, new_status: str
) -> bool:
    """Update /sessions/{session_id}/attendance/{student_id}/status.

    Returns True on success, False on failure.
    """
    try:
        db = _get_db()
        if db is None:
            return False
        ref = db.reference(
            f"/sessions/{session_id}/attendance/{student_id}"
        )
        ref.update({"status": new_status})
        logger.info(
            "Firebase: manual override synced for student %d session %s",
            student_id,
            session_id,
        )
        return True
    except Exception as exc:
        logger.error("Firebase sync_manual_override failed: %s", exc)
        return False


def sync_attendance_log(student_id: int, session_id: str, event_type: str) -> bool:
    """Update /sessions/{session_id}/logs/{student_id}.
    
    Returns True on success, False on failure.
    """
    try:
        db = _get_db()
        if db is None:
            return False
        import time
        ref = db.reference(f"/sessions/{session_id}/logs/{student_id}")
        ref.push({
            "event_type": event_type,
            "timestamp": int(time.time() * 1000)
        })
        logger.info(
            "Firebase: %s log synced for student %d session %s",
            event_type,
            student_id,
            session_id,
        )
        return True
    except Exception as exc:
        logger.error("Firebase sync_attendance_log failed: %s", exc)
        return False
