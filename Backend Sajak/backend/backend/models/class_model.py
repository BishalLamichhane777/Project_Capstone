"""Class and Enrollment models."""

from datetime import datetime, timezone

from database import db

class Class(db.Model):
    __tablename__ = "classes"

    class_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_name = db.Column(db.String(150), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    room = db.Column(db.String(50), nullable=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    schedule_time = db.Column(db.DateTime, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=False)

    # Relationships
    teacher = db.relationship("User", foreign_keys=[teacher_id])
    enrollments = db.relationship(
        "Enrollment", back_populates="class_", cascade="all, delete-orphan"
    )
    sessions = db.relationship(
        "Session", back_populates="class_", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "class_id": self.class_id,
            "class_name": self.class_name,
            "subject": self.subject,
            "room": self.room,
            "teacher_id": self.teacher_id,
            "teacher_name": self.teacher.fullname if self.teacher else None,
            "schedule_time": (
                self.schedule_time.isoformat() if self.schedule_time else None
            ),
            "duration_minutes": self.duration_minutes,
        }


class Enrollment(db.Model):
    __tablename__ = "enrollments"

    enrollment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.student_id"), nullable=False
    )
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.class_id"), nullable=False
    )
    enrolled_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        db.UniqueConstraint("student_id", "class_id", name="uq_student_class"),
    )

    # Relationships
    student = db.relationship("Student", back_populates="enrollments")
    class_ = db.relationship("Class", back_populates="enrollments")

    def to_dict(self):
        return {
            "enrollment_id": self.enrollment_id,
            "student_id": self.student_id,
            "class_id": self.class_id,
            "enrolled_at": (
                self.enrolled_at.isoformat() if self.enrolled_at else None
            ),
        }
