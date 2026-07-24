"""Batch and BatchStudent models — group students for bulk class enrollment."""

from datetime import datetime, timezone
from database import db, utc_iso


class Batch(db.Model):
    __tablename__ = "batches"

    batch_id    = db.Column(db.Integer, primary_key=True, autoincrement=True)
    batch_name  = db.Column(db.String(150), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    created_at  = db.Column(db.DateTime, nullable=False,
                             default=lambda: datetime.now(timezone.utc))

    # Relationships
    batch_students = db.relationship(
        "BatchStudent", back_populates="batch", cascade="all, delete-orphan"
    )
    batch_class_links = db.relationship(
        "BatchClassLink", cascade="all, delete-orphan",
        primaryjoin="Batch.batch_id == BatchClassLink.batch_id",
        foreign_keys="[BatchClassLink.batch_id]",
    )

    @property
    def student_count(self):
        return len(self.batch_students)

    def to_dict(self, include_students=False):
        d = {
            "batch_id":      self.batch_id,
            "batch_name":    self.batch_name,
            "description":   self.description,
            "created_at":    utc_iso(self.created_at),
            "student_count": self.student_count,
        }
        if include_students:
            d["students"] = [bs.student.to_dict() for bs in self.batch_students if bs.student]
        return d


class BatchStudent(db.Model):
    __tablename__ = "batch_students"

    batch_id   = db.Column(db.Integer, db.ForeignKey("batches.batch_id"),
                            primary_key=True, nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.student_id"),
                            primary_key=True, nullable=False)
    added_at   = db.Column(db.DateTime, nullable=False,
                            default=lambda: datetime.now(timezone.utc))

    # Relationships
    batch   = db.relationship("Batch",   back_populates="batch_students")
    student = db.relationship("Student", back_populates="batches")
