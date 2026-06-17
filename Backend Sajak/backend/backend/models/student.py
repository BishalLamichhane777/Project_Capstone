"""Student model — extended profile linked to a User."""

from datetime import datetime, timezone

from database import db


class Student(db.Model):
    __tablename__ = "students"

    student_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False
    )
    roll_number = db.Column(db.String(50), unique=True, nullable=False)
    program = db.Column(db.String(100), nullable=False)
    year_of_study = db.Column(db.Integer, nullable=True)
    face_label = db.Column(db.String(50), unique=True, nullable=True)

    # Relationships
    user = db.relationship("User", back_populates="student_profile")
    enrollments = db.relationship(
        "Enrollment", back_populates="student", cascade="all, delete-orphan"
    )
    attendance_logs = db.relationship(
        "AttendanceLog", back_populates="student", cascade="all, delete-orphan"
    )
    attendance_records = db.relationship(
        "AttendanceRecord", back_populates="student", cascade="all, delete-orphan"
    )
    waiver_requests = db.relationship(
        "WaiverRequest", back_populates="student", cascade="all, delete-orphan"
    )
    batches = db.relationship(
        "BatchStudent", back_populates="student", cascade="all, delete-orphan"
    )

    def to_dict(self):
        """Serialize student profile with user info."""
        user_data = self.user.to_dict() if self.user else {}
        return {
            "student_id": self.student_id,
            "user_id": self.user_id,
            "roll_number": self.roll_number,
            "program": self.program,
            "year_of_study": self.year_of_study,
            "face_label": self.face_label,
            "fullname": user_data.get("fullname"),
            "email": user_data.get("email"),
            "phone": user_data.get("phone"),
        }
