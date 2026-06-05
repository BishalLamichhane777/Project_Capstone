"""User model — admin, teacher, and student accounts."""

from datetime import datetime, timezone

from flask_login import UserMixin

from database import db


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fullname = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin' | 'teacher' | 'student'
    phone = db.Column(db.String(30), nullable=True)
    device_token = db.Column(db.String(512), nullable=True)  # FCM push token
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    student_profile = db.relationship(
        "Student", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    notifications = db.relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

    VALID_ROLES = {"admin", "teacher", "student"}

    def get_id(self):
        """Flask-Login requires a string identifier."""
        return str(self.id)

    def __repr__(self):
        return f"{self.fullname} ({self.email})"

    def to_dict(self):
        """Serialize user to dict — never includes password_hash."""
        return {
            "id": self.id,
            "fullname": self.fullname,
            "email": self.email,
            "role": self.role,
            "phone": self.phone,
            "device_token": self.device_token,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
