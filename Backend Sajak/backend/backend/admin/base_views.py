"""Reusable secure base classes for Flask-Admin views.

Every admin view should inherit from one of these instead of the
plain ``ModelView`` or ``BaseView`` so that authentication and
authorization are enforced consistently.
"""

from flask import flash, redirect, url_for
from flask_admin import BaseView, expose
from flask_admin.contrib.sqla import ModelView
from flask_login import current_user

from admin.permissions import is_admin


class SecureModelView(ModelView):
    """Full-CRUD model view restricted to authenticated admin users.

    Subclass this for any model where admins need list / create /
    edit / delete access.
    """

    page_size = 25
    can_set_page_size = True
    can_view_details = True
    can_export = True
    export_types = ["csv"]

    def is_accessible(self):
        return current_user.is_authenticated and is_admin(current_user)

    def inaccessible_callback(self, name, **kwargs):
        flash("Please log in as an admin to access this page.", "warning")
        return redirect(url_for("admin.login"))


class ReadOnlyAdminView(SecureModelView):
    """Read-only model view — list and detail only, no mutations.

    Use for tables whose data is system-generated and should not be
    edited through the admin panel (e.g., attendance logs, notifications).
    """

    can_create = False
    can_edit = False
    can_delete = False


class AdminOnlyView(BaseView):
    """Base class for custom (non-model) admin pages.

    Override the ``index`` method to render your page.
    """

    def is_accessible(self):
        return current_user.is_authenticated and is_admin(current_user)

    def inaccessible_callback(self, name, **kwargs):
        flash("Please log in as an admin to access this page.", "warning")
        return redirect(url_for("admin.login"))

    @expose("/")
    def index(self):
        return self.render("admin/custom_page.html")
