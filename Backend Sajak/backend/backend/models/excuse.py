"""Waiver / excuse request model."""

from datetime import datetime, timezone

from database import db, utc_iso


class WaiverRequest(db.Model):
    __tablename__ = "waiver_requests"

    request_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.student_id"), nullable=False
    )
    session_id = db.Column(
        db.String(36), db.ForeignKey("sessions.session_id"), nullable=False
    )
    reason = db.Column(db.Text, nullable=False)
    supporting_doc_path = db.Column(db.String(512), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="Pending")
    submitted_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    reviewed_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    student = db.relationship("Student", back_populates="waiver_requests")
    session = db.relationship("Session")

    def to_dict(self):
        return {
            "request_id": self.request_id,
            "student_id": self.student_id,
            "session_id": self.session_id,
            "reason": self.reason,
            "supporting_doc_path": self.supporting_doc_path,
            "status": self.status,
            "submitted_at": utc_iso(self.submitted_at),
            "reviewed_at": utc_iso(self.reviewed_at),
        }
