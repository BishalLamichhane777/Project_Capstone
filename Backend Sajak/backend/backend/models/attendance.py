"""Attendance log and record models."""

from datetime import datetime, timezone

from database import db, utc_iso


class AttendanceLog(db.Model):
    """Individual entry/exit events captured during a session."""

    __tablename__ = "attendance_logs"

    log_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.student_id"), nullable=False
    )
    session_id = db.Column(
        db.String(36), db.ForeignKey("sessions.session_id"), nullable=False
    )
    event_type = db.Column(db.String(10), nullable=False)  # 'ENTRY' | 'EXIT'
    timestamp = db.Column(db.DateTime, nullable=False)
    confidence_score = db.Column(db.Float, nullable=True)

    # Relationships
    student = db.relationship("Student", back_populates="attendance_logs")
    session = db.relationship("Session", back_populates="attendance_logs")

    def to_dict(self):
        return {
            "log_id": self.log_id,
            "student_id": self.student_id,
            "session_id": self.session_id,
            "event_type": self.event_type,
            "timestamp": utc_iso(self.timestamp),
            "confidence_score": self.confidence_score,
        }


class AttendanceRecord(db.Model):
    """Finalized attendance summary per student per session."""

    __tablename__ = "attendance_records"

    record_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.student_id"), nullable=False
    )
    session_id = db.Column(
        db.String(36), db.ForeignKey("sessions.session_id"), nullable=False
    )
    total_duration_seconds = db.Column(db.Float, default=0)
    threshold_required = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(10), nullable=False, default="Absent")
    finalized_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint("student_id", "session_id", name="uq_student_session"),
    )

    # Relationships
    student = db.relationship("Student", back_populates="attendance_records")
    session = db.relationship("Session", back_populates="attendance_records")

    def to_dict(self):
        return {
            "record_id": self.record_id,
            "student_id": self.student_id,
            "session_id": self.session_id,
            "total_duration_seconds": self.total_duration_seconds,
            "threshold_required": self.threshold_required,
            "status": self.status,
            "finalized_at": utc_iso(self.finalized_at),
        }
