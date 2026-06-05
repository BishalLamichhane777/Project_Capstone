"""Flask-Login setup and admin login / logout views.

Integrates with the existing ``User`` model and reuses the same
bcrypt password-verification logic used by the API auth routes.
"""

import logging

import bcrypt
from flask import flash, redirect, request, url_for
from flask_admin import AdminIndexView, expose
from flask_login import LoginManager, current_user, login_user, logout_user

from admin.permissions import is_admin

logger = logging.getLogger(__name__)

login_manager = LoginManager()


@login_manager.user_loader
def load_user(user_id: str):
    """Load a user by ID — called on every request with an active session."""
    from models.user import User

    return User.query.get(int(user_id))


def init_login(app):
    """Initialize Flask-Login on the application."""
    login_manager.init_app(app)
    login_manager.login_view = "admin_login.login"
    login_manager.login_message = "Please log in to access the admin panel."
    login_manager.login_message_category = "warning"


class AdminLoginView(AdminIndexView):
    """Custom admin index view with built-in login / logout.

    Unauthenticated users see a login form; authenticated admins see
    the dashboard.
    """

    @expose("/")
    def index(self):
        if not current_user.is_authenticated or not is_admin(current_user):
            return redirect(url_for(".login"))

        # Import here to avoid circular imports
        from models.user import User
        from models.student import Student
        from models.class_model import Class
        from models.session import Session
        from models.excuse import WaiverRequest

        stats = {
            "total_users": User.query.count(),
            "total_students": Student.query.count(),
            "total_teachers": User.query.filter_by(role="teacher").count(),
            "total_admins": User.query.filter_by(role="admin").count(),
            "total_classes": Class.query.count(),
            "active_sessions": Session.query.filter_by(status="ACTIVE").count(),
            "closed_sessions": Session.query.filter_by(status="CLOSED").count(),
            "pending_excuses": WaiverRequest.query.filter_by(status="Pending").count(),
        }
        return self.render("admin/dashboard.html", stats=stats)

    @expose("/login", methods=["GET", "POST"])
    def login(self):
        if current_user.is_authenticated and is_admin(current_user):
            return redirect(url_for(".index"))

        if request.method == "POST":
            email = request.form.get("email", "").strip()
            password = request.form.get("password", "")

            if not email or not password:
                flash("Email and password are required.", "danger")
                return self.render("admin/login.html")

            from models.user import User

            user = User.query.filter_by(email=email).first()

            if not user:
                flash("Invalid credentials.", "danger")
                return self.render("admin/login.html")

            if not bcrypt.checkpw(
                password.encode("utf-8"),
                user.password_hash.encode("utf-8"),
            ):
                flash("Invalid credentials.", "danger")
                return self.render("admin/login.html")

            if not is_admin(user):
                flash("Access denied — admin privileges required.", "danger")
                return self.render("admin/login.html")

            login_user(user)
            logger.info("Admin user '%s' logged in to admin panel", email)
            flash("Welcome back, {}!".format(user.fullname), "success")
            return redirect(url_for(".index"))

        return self.render("admin/login.html")

    @expose("/logout")
    def logout(self):
        logout_user()
        flash("You have been logged out.", "info")
        return redirect(url_for(".login"))
