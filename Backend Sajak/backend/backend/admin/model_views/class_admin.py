"""Class and Enrollment admin views."""

from admin.base_views import SecureModelView
from models.user import User


class ClassAdmin(SecureModelView):
    """Admin view for the ``Class`` model.

    Manages classes, their assigned teachers, and schedule details.
    """

    # ── List view ─────────────────────────────────────────────────────
    column_list = [
        "class_id",
        "class_name",
        "subject",
        "room",
        "teacher",
        "duration_minutes",
        "schedule_time",
    ]
    column_sortable_list = [
        "class_id",
        "class_name",
        "subject",
        "duration_minutes",
        "schedule_time",
    ]
    column_searchable_list = ["class_name", "subject"]
    column_filters = ["subject", "teacher_id"]
    column_default_sort = ("class_id", True)

    # ── Labels ────────────────────────────────────────────────────────
    column_labels = {
        "class_id": "Class ID",
        "class_name": "Class Name",
        "subject": "Subject",
        "room": "Room",
        "teacher": "Teacher",
        "teacher_id": "Teacher ID",
        "duration_minutes": "Duration (min)",
        "schedule_time": "Schedule",
    }

    # ── Relationship display ──────────────────────────────────────────
    column_formatters = {
        "teacher": lambda v, c, m, n: (
            m.teacher.fullname if m.teacher else "—"
        ),
        "schedule_time": lambda v, c, m, n: (
            m.schedule_time.strftime("%Y-%m-%d %H:%M") if m.schedule_time else "—"
        ),
    }

    # ── Form ──────────────────────────────────────────────────────────
    form_args = {
        "teacher": {
            "query_factory": lambda: User.query.filter(User.role == "teacher")
        }
    }
    form_excluded_columns = ["enrollments", "sessions"]


class EnrollmentAdmin(SecureModelView):
    """Admin view for the ``Enrollment`` model.

    Shows which students are enrolled in which classes.
    """

    # ── List view ─────────────────────────────────────────────────────
    column_list = [
        "enrollment_id",
        "student",
        "class_",
        "enrolled_at",
    ]
    column_sortable_list = ["enrollment_id", "enrolled_at"]
    column_filters = ["class_id", "enrolled_at"]
    column_default_sort = ("enrolled_at", True)

    # ── Labels ────────────────────────────────────────────────────────
    column_labels = {
        "enrollment_id": "Enrollment ID",
        "student": "Student",
        "class_": "Class",
        "class_id": "Class ID",
        "student_id": "Student ID",
        "enrolled_at": "Enrolled At",
    }

    # ── Relationship display ──────────────────────────────────────────
    column_formatters = {
        "student": lambda v, c, m, n: (
            m.student.roll_number if m.student else "—"
        ),
        "class_": lambda v, c, m, n: (
            m.class_.class_name if m.class_ else "—"
        ),
        "enrolled_at": lambda v, c, m, n: (
            m.enrolled_at.strftime("%Y-%m-%d %H:%M") if m.enrolled_at else ""
        ),
    }

    # ── Form ──────────────────────────────────────────────────────────
    form_widget_args = {
        "enrollment_id": {"disabled": True},
        "enrolled_at": {"disabled": True},
    }
