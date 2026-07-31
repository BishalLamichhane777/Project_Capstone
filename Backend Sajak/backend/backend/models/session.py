"""Session model — represents a live or closed attendance session."""

from database import db, utc_iso


class Session(db.Model):
    __tablename__ = "sessions"

    session_id = db.Column(db.String(36), primary_key=True)  # UUID
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.class_id"), nullable=False
    )
    teacher_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )
    mode = db.Column(db.String(20), nullable=False)  # 'Strict' | 'Activity'
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(10), nullable=False, default="ACTIVE")
    threshold_percent = db.Column(db.Float, nullable=True)
    ended_reason = db.Column(db.String(20), nullable=True)  # 'manual' | 'auto_expired'

    # Relationships
    class_ = db.relationship("Class", back_populates="sessions")
    teacher = db.relationship("User", foreign_keys=[teacher_id])
    attendance_logs = db.relationship(
        "AttendanceLog", back_populates="session", cascade="all, delete-orphan"
    )
    attendance_records = db.relationship(
        "AttendanceRecord", back_populates="session", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "class_id": self.class_id,
            "teacher_id": self.teacher_id,
            "mode": self.mode,
            "start_time": utc_iso(self.start_time),
            "end_time": utc_iso(self.end_time),
            "status": self.status,
            "threshold_percent": self.threshold_percent,
            "ended_reason": self.ended_reason,
            "class_name": self.class_.class_name if self.class_ else None,
        }
