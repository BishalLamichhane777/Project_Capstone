"""Attendance calculation engine.

Processes raw entry/exit logs and determines final attendance
status for each student in a given session.

Datetime convention (important):
  All timestamps in this module are treated as **naive UTC**.
  - AttendanceLog.timestamp  — written by the scan route as datetime.now(timezone.utc);
    SQLite strips tzinfo on storage, returning a naive value that represents UTC.
  - Session.start_time       — written by start_session as datetime.now(timezone.utc);
    same stripping applies, result is naive UTC.
  - Session.end_time         — written by end_session as datetime.now(timezone.utc);
    same stripping applies, result is naive UTC.
  Never mix these with datetime.now() (local time) or timezone-aware values.
"""

import logging
from datetime import datetime, timezone

from database import db
from models.attendance import AttendanceLog, AttendanceRecord
from models.class_model import Enrollment
from models.session import Session

logger = logging.getLogger(__name__)


def get_student_duration(student_id: int, session_id: str) -> float:
    """Calculate total attendance duration in seconds for a student in a session.

    Pairs ENTRY→EXIT events chronologically. If the last ENTRY has no matching
    EXIT, the session end_time is used as the closing timestamp.

    All timestamps are treated as naive UTC (see module docstring).

    Returns:
        Total duration in seconds.
    """
    session = Session.query.get(session_id)
    if not session:
        return 0.0

    logs = (
        AttendanceLog.query.filter_by(student_id=student_id, session_id=session_id)
        .order_by(AttendanceLog.timestamp.asc())
        .all()
    )

    if not logs:
        return 0.0

    total_seconds = 0.0
    entry_time = None

    for log in logs:
        # Strip tzinfo defensively — SQLite normally returns naive values, but
        # guard against any future code path that attaches tzinfo before saving.
        ts = log.timestamp.replace(tzinfo=None) if log.timestamp.tzinfo else log.timestamp

        if log.event_type == "ENTRY":
            entry_time = ts
        elif log.event_type == "EXIT" and entry_time is not None:
            delta = (ts - entry_time).total_seconds()
            total_seconds += max(delta, 0)
            entry_time = None

    # Trailing ENTRY with no matching EXIT — close at session end_time.
    # Strip tzinfo from end_time for the same defensive reason as above.
    if entry_time is not None and session.end_time is not None:
        session_end = session.end_time.replace(tzinfo=None) if session.end_time.tzinfo else session.end_time
        delta = (session_end - entry_time).total_seconds()
        total_seconds += max(delta, 0)

    return total_seconds


def _determine_status(
    total_duration: float,
    session_duration_seconds: float,
    threshold_percent: float,
) -> str:
    """Determine attendance status based on duration vs. threshold.

    Args:
        threshold_percent: Decimal fraction (e.g. 0.80), NOT a percentage (80).

    Returns:
        'Present' if threshold met, otherwise 'Absent'.
    """
    if session_duration_seconds <= 0:
        return "Absent"

    threshold_seconds = threshold_percent * session_duration_seconds
    if total_duration >= threshold_seconds:
        return "Present"
    return "Absent"


def calculate_all(session_id: str) -> dict:
    """Finalize attendance for every enrolled student in a session.

    Steps:
    1. Fetch session metadata (mode, times, threshold).
    2. Fetch all students enrolled in the session's class.
    3. For each student, compute total duration from logs.
    4. Determine status and update the attendance_records row.

    Returns:
        Summary dict: {present, absent, total, details: [...]}.
    """
    session = Session.query.get(session_id)
    if not session:
        logger.error("Session %s not found", session_id)
        return {"present": 0, "absent": 0, "total": 0, "details": []}

    # All session datetimes are naive UTC after SQLite round-trip.
    # Strip tzinfo defensively in case a timezone-aware value was passed in.
    session_start = session.start_time.replace(tzinfo=None) if session.start_time.tzinfo else session.start_time

    if session.end_time is not None:
        session_end = session.end_time.replace(tzinfo=None) if session.end_time.tzinfo else session.end_time
    else:
        # Session still open — use current UTC time as the closing boundary.
        session_end = datetime.now(timezone.utc).replace(tzinfo=None)

    session_duration_seconds = (session_end - session_start).total_seconds()

    # threshold_percent is stored as a decimal fraction (e.g. 0.80, 0.55).
    # Guard against the env-var being mistakenly set as a whole number (e.g. 80)
    # by normalising values > 1 down to a fraction.
    threshold_percent = session.threshold_percent or 0.80
    if threshold_percent > 1.0:
        logger.warning(
            "Session %s has threshold_percent=%.4f which looks like a percentage "
            "rather than a fraction — dividing by 100 to normalise.",
            session_id, threshold_percent,
        )
        threshold_percent = threshold_percent / 100.0

    # Get all enrolled student IDs for this class
    enrolled = Enrollment.query.filter_by(class_id=session.class_id).all()
    enrolled_student_ids = [e.student_id for e in enrolled]

    present_count = 0
    absent_count = 0
    details = []

    for student_id in enrolled_student_ids:
        total_duration = get_student_duration(student_id, session_id)
        status = _determine_status(
            total_duration, session_duration_seconds, threshold_percent
        )

        threshold_required_seconds = threshold_percent * session_duration_seconds

        # Update or create the attendance record
        record = AttendanceRecord.query.filter_by(
            student_id=student_id, session_id=session_id
        ).first()

        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)

        if record:
            record.total_duration_seconds = total_duration
            record.threshold_required = threshold_required_seconds
            record.status = status
            record.finalized_at = now_naive
        else:
            record = AttendanceRecord(
                student_id=student_id,
                session_id=session_id,
                total_duration_seconds=total_duration,
                threshold_required=threshold_required_seconds,
                status=status,
                finalized_at=now_naive,
            )
            db.session.add(record)

        if status == "Present":
            present_count += 1
        else:
            absent_count += 1

        details.append(
            {
                "student_id": student_id,
                "total_duration_seconds": total_duration,
                "status": status,
            }
        )

    db.session.commit()

    return {
        "present": present_count,
        "absent": absent_count,
        "total": len(enrolled_student_ids),
        "details": details,
    }


def get_session_summary(session_id: str) -> dict:
    """Retrieve the current attendance summary for a session.

    Returns:
        {present, absent, total, details: [{student_id, status, total_duration_seconds}]}
    """
    records = AttendanceRecord.query.filter_by(session_id=session_id).all()

    present = sum(1 for r in records if r.status == "Present")
    absent = sum(1 for r in records if r.status != "Present")

    details = [
        {
            "student_id": r.student_id,
            "status": r.status,
            "total_duration_seconds": r.total_duration_seconds,
        }
        for r in records
    ]

    return {
        "present": present,
        "absent": absent,
        "total": len(records),
        "details": details,
    }
