"""User admin view — manages admin, teacher, and student accounts."""

import bcrypt
from wtforms import PasswordField, validators

from admin.base_views import SecureModelView


class UserAdmin(SecureModelView):
    """Admin view for the ``User`` model.

    Provides full CRUD with password hashing on create,
    search by name/email, and role filtering.
    """

    # ── List view ─────────────────────────────────────────────────────
    column_list = [
        "id",
        "fullname",
        "email",
        "role",
        "phone",
        "created_at",
    ]
    column_sortable_list = [
        "id",
        "fullname",
        "email",
        "role",
        "created_at",
    ]
    column_searchable_list = ["fullname", "email"]
    column_filters = ["role", "created_at"]
    column_default_sort = ("created_at", True)

    # ── Detail / Labels ───────────────────────────────────────────────
    column_labels = {
        "id": "User ID",
        "fullname": "Full Name",
        "email": "Email",
        "role": "Role",
        "phone": "Phone",
        "device_token": "Device Token",
        "created_at": "Created At",
    }

    # ── Form ──────────────────────────────────────────────────────────
    form_excluded_columns = [
        "password_hash",
        "student_profile",
        "notifications",
    ]
    form_extra_fields = {
        "password": PasswordField(
            "Password",
            [validators.Optional(), validators.Length(min=6)],
        ),
    }
    form_widget_args = {
        "created_at": {"disabled": True},
    }

    # ── Column formatters ─────────────────────────────────────────────
    column_formatters = {
        "created_at": lambda v, c, m, n: (
            m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else ""
        ),
    }

    def on_model_change(self, form, model, is_created):
        """Hash password when creating or updating a user via the admin form."""
        password = form.password.data
        if password:
            salt = bcrypt.gensalt()
            model.password_hash = bcrypt.hashpw(
                password.encode("utf-8"), salt
            ).decode("utf-8")
        elif is_created:
            # New user must have a password
            raise ValueError(
                "Password is required when creating a new user."
            )
