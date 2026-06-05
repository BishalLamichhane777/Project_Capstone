"""Attendance calculation engine.

Processes raw entry/exit logs and determines final attendance
status for each student in a given session.
"""

import logging
from datetime import datetime, timedelta, timezone

from database import db
from models.attendance import AttendanceLog, AttendanceRecord
from models.class_model import Enrollment
from models.session import Session

logger = logging.getLogger(__name__)


def get_student_duration(student_id: int, session_id: str) -> float:
    """Calculate total attendance duration in seconds for a student in a session.

    Pairs ENTRY→EXIT events chronologically. If the last ENTRY has no matching
    EXIT, the session end_time is used as the closing timestamp.

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
        if log.event_type == "ENTRY":
            entry_time = log.timestamp
        elif log.event_type == "EXIT" and entry_time is not None:
            delta = (log.timestamp - entry_time).total_seconds()
            total_seconds += max(delta, 0)
            entry_time = None

    # If the last event is an ENTRY with no matching EXIT, close at session end
    if entry_time is not None and session.end_time is not None:
        delta = (session.end_time - entry_time).total_seconds()
        total_seconds += max(delta, 0)

    return total_seconds


def _determine_status(
    total_duration: float,
    session_duration_seconds: float,
    threshold_percent: float,
) -> str:
    """Determine attendance status based on duration vs. threshold.

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

    NPT = timezone(timedelta(hours=5, minutes=45))

    session_start = session.start_time
    if session_start.tzinfo is None:
        session_start = session_start.replace(tzinfo=NPT)

    session_end = session.end_time or datetime.now(NPT)
    if session_end.tzinfo is None:
        session_end = session_end.replace(tzinfo=NPT)

    session_duration_seconds = (session_end - session_start).total_seconds()
    threshold_percent = session.threshold_percent or 0.80

    # Get all enrolled student IDs for this class
    enrolled = (
        Enrollment.query.filter_by(class_id=session.class_id)
        .all()
    )
    enrolled_student_ids = [e.student_id for e in enrolled]

    present_count = 0
    absent_count = 0
    details = []

    for student_id in enrolled_student_ids:
        total_duration = get_student_duration(student_id, session_id)
        status = _determine_status(
            total_duration, session_duration_seconds, threshold_percent
        )

        # Update or create the attendance record
        record = AttendanceRecord.query.filter_by(
            student_id=student_id, session_id=session_id
        ).first()

        if record:
            record.total_duration_seconds = total_duration
            record.threshold_required = threshold_percent * session_duration_seconds
            record.status = status
            record.finalized_at = datetime.now(NPT)
        else:
            record = AttendanceRecord(
                student_id=student_id,
                session_id=session_id,
                total_duration_seconds=total_duration,
                threshold_required=threshold_percent * session_duration_seconds,
                status=status,
                finalized_at=datetime.now(NPT),
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
