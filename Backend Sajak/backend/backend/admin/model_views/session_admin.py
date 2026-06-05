"""Session admin view — attendance session management."""

from admin.base_views import SecureModelView


class SessionAdmin(SecureModelView):
    """Admin view for the ``Session`` model.

    Sessions are created by teachers through the API (``POST /api/session/start``),
    so **create is disabled** here.  Admins can inspect, filter, and delete
    sessions through this view.
    """

    can_create = False

    # ── List view ─────────────────────────────────────────────────────
    column_list = [
        "session_id",
        "class_",
        "teacher",
        "mode",
        "status",
        "start_time",
        "end_time",
        "threshold_percent",
    ]
    column_sortable_list = [
        "session_id",
        "mode",
        "status",
        "start_time",
        "end_time",
    ]
    column_searchable_list = ["session_id"]
    column_filters = ["status", "mode", "class_id", "start_time"]
    column_default_sort = ("start_time", True)

    # ── Labels ────────────────────────────────────────────────────────
    column_labels = {
        "session_id": "Session ID",
        "class_": "Class",
        "class_id": "Class ID",
        "teacher": "Teacher",
        "teacher_id": "Teacher ID",
        "mode": "Mode",
        "status": "Status",
        "start_time": "Start Time",
        "end_time": "End Time",
        "threshold_percent": "Threshold %",
    }

    # ── Relationship display ──────────────────────────────────────────
    column_formatters = {
        "class_": lambda v, c, m, n: (
            m.class_.class_name if m.class_ else "—"
        ),
        "teacher": lambda v, c, m, n: (
            m.teacher.fullname if m.teacher else "—"
        ),
        "start_time": lambda v, c, m, n: (
            m.start_time.strftime("%Y-%m-%d %H:%M") if m.start_time else ""
        ),
        "end_time": lambda v, c, m, n: (
            m.end_time.strftime("%Y-%m-%d %H:%M") if m.end_time else "—"
        ),
    }

    # ── Form (edit only — create is disabled) ─────────────────────────
    form_excluded_columns = [
        "attendance_logs",
        "attendance_records",
    ]
    form_widget_args = {
        "session_id": {"disabled": True},
        "start_time": {"disabled": True},
        "end_time": {"disabled": True},
    }
