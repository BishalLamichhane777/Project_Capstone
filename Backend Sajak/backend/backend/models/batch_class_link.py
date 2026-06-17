"""BatchClassLink model — permanent link between a batch and a class.

When a batch is enrolled into a class via POST /batches/<id>/enroll-batch,
a BatchClassLink row is created. This link drives automatic enrollment sync:
- Adding a student to a batch auto-enrolls them in all linked classes.
- Removing a student from a batch auto-unenrolls them from all linked classes.
"""

from datetime import datetime

from database import db


class BatchClassLink(db.Model):
    __tablename__ = "batch_class_links"

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(
        db.Integer, db.ForeignKey("batches.batch_id"), nullable=False
    )
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.class_id"), nullable=False
    )
    linked_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("batch_id", "class_id", name="uq_batch_class"),
    )

    def __repr__(self):
        return f"<BatchClassLink batch={self.batch_id} class={self.class_id}>"
