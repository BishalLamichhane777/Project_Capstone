"""Waiver / excuse request model."""

from datetime import datetime, timezone

from database import db, utc_iso


class WaiverRequest(db.Model):
    __tablename__ = "waiver_requests"

    request_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.student_id"), nullable=False
    )

    # ── Waiver type ────────────────────────────────────────────────────
    # 'retroactive' — student was already marked Absent; session_id is set.
    # 'prior'       — student requesting advance excuse; session_id is NULL.
    #                 class_id is optional (NULL = all classes / general leave).
    #                 start_date is required; end_date defaults to start_date.
    waiver_type = db.Column(db.String(20), nullable=False, default="retroactive")

    # Retroactive: required. Prior: NULL.
    session_id = db.Column(
        db.String(36), db.ForeignKey("sessions.session_id"), nullable=True
    )

    # Prior only — all optional/nullable.
    class_id    = db.Column(db.Integer, db.ForeignKey("classes.class_id"), nullable=True)
    target_date = db.Column(db.String(10), nullable=True)  # kept for old rows
    start_date  = db.Column(db.String(10), nullable=True)  # ISO 'YYYY-MM-DD'
    end_date    = db.Column(db.String(10), nullable=True)  # ISO 'YYYY-MM-DD'

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
    class_  = db.relationship("Class", foreign_keys=[class_id])

    @property
    def effective_start(self):
        """Return the start date, falling back to target_date for old rows."""
        return self.start_date or self.target_date

    @property
    def effective_end(self):
        """Return the end date, falling back to start_date / target_date."""
        return self.end_date or self.start_date or self.target_date

    def to_dict(self):
        return {
            "request_id":          self.request_id,
            "student_id":          self.student_id,
            "waiver_type":         self.waiver_type,
            "session_id":          self.session_id,
            "class_id":            self.class_id,
            "target_date":         self.target_date,
            "start_date":          self.effective_start,
            "end_date":            self.effective_end,
            "reason":              self.reason,
            "supporting_doc_path": self.supporting_doc_path,
            "status":              self.status,
            "submitted_at":        utc_iso(self.submitted_at),
            "reviewed_at":         utc_iso(self.reviewed_at),
        }
