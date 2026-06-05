"""Waiver / excuse request admin view."""

from datetime import datetime, timezone

from admin.base_views import SecureModelView


class WaiverRequestAdmin(SecureModelView):
    """Admin view for ``WaiverRequest`` (excuse requests).

    Admins can change the ``status`` field (Pending → Approved / Rejected).
    When a request is approved, the linked ``AttendanceRecord`` is
    automatically updated to ``Present`` — reusing the same business
    logic as ``PUT /api/excuse/decide/:id``.
    """

    can_create = False

    # ── List view ─────────────────────────────────────────────────────
    column_list = [
        "request_id",
        "student",
        "session_id",
        "reason",
        "status",
        "submitted_at",
        "reviewed_at",
    ]
    column_sortable_list = [
        "request_id",
        "status",
        "submitted_at",
        "reviewed_at",
    ]
    column_filters = ["status", "submitted_at"]
    column_default_sort = ("submitted_at", True)

    # ── Labels ────────────────────────────────────────────────────────
    column_labels = {
        "request_id": "Request ID",
        "student": "Student",
        "session_id": "Session",
        "reason": "Reason",
        "status": "Status",
        "supporting_doc_path": "Doc Path",
        "submitted_at": "Submitted At",
        "reviewed_at": "Reviewed At",
    }

    # ── Relationship display ──────────────────────────────────────────
    column_formatters = {
        "student": lambda v, c, m, n: (
            m.student.roll_number if m.student else "—"
        ),
        "submitted_at": lambda v, c, m, n: (
            m.submitted_at.strftime("%Y-%m-%d %H:%M") if m.submitted_at else ""
        ),
        "reviewed_at": lambda v, c, m, n: (
            m.reviewed_at.strftime("%Y-%m-%d %H:%M") if m.reviewed_at else "—"
        ),
    }

    # ── Form ──────────────────────────────────────────────────────────
    form_widget_args = {
        "request_id": {"disabled": True},
        "submitted_at": {"disabled": True},
        "reviewed_at": {"disabled": True},
        "reason": {"disabled": True},
    }
    form_excluded_columns = ["student", "session"]

    def on_model_change(self, form, model, is_created):
        """When status changes to 'Approved', update the attendance record.

        This mirrors the logic in ``routes/excuse.py::decide_excuse``.
        """
        model.reviewed_at = datetime.now(timezone.utc)

        if model.status == "Approved":
            from models.attendance import AttendanceRecord

            record = AttendanceRecord.query.filter_by(
                student_id=model.student_id,
                session_id=model.session_id,
            ).first()
            if record:
                record.status = "Present"
                record.finalized_at = datetime.now(timezone.utc)
