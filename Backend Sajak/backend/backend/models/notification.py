"""Notification model for in-app alerts and push tracking."""

from datetime import datetime, timezone

from database import db


class Notification(db.Model):
    __tablename__ = "notifications"

    notif_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # 'Absent' | 'Waiver' | 'General'
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    sent_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = db.relationship("User", back_populates="notifications")

    def to_dict(self):
        return {
            "notif_id": self.notif_id,
            "user_id": self.user_id,
            "type": self.type,
            "message": self.message,
            "is_read": self.is_read,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
        }
