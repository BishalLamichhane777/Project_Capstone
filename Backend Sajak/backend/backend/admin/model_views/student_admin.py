"""Student admin view — extended student profiles."""

from admin.base_views import SecureModelView
from models.user import User


class StudentAdmin(SecureModelView):
    """Admin view for the ``Student`` model.

    Students are always linked to a ``User`` record.
    This view provides search by roll number and program filtering.
    """

    # ── List view ─────────────────────────────────────────────────────
    column_list = [
        "student_id",
        "user",
        "roll_number",
        "program",
        "year_of_study",
    ]
    column_sortable_list = [
        "student_id",
        "roll_number",
        "program",
        "year_of_study",
    ]
    column_searchable_list = ["roll_number", "program"]
    column_filters = ["program", "year_of_study"]
    column_default_sort = ("student_id", True)

    # ── Labels ────────────────────────────────────────────────────────
    column_labels = {
        "student_id": "Student ID",
        "user": "User Account",
        "roll_number": "Roll Number",
        "program": "Program",
        "year_of_study": "Year",
    }

    # ── Relationship display ──────────────────────────────────────────
    column_formatters = {
        "user": lambda v, c, m, n: (
            m.user.fullname if m.user else "—"
        ),
    }

    # ── Form ──────────────────────────────────────────────────────────
    form_args = {
        "user": {
            "query_factory": lambda: User.query.filter(User.role == "student")
        }
    }
    form_excluded_columns = [
        "enrollments",
        "attendance_logs",
        "attendance_records",
        "waiver_requests",
    ]
    form_widget_args = {
        "student_id": {"disabled": True},
    }
