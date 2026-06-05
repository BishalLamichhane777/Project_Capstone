"""Routes package — registers all API blueprints."""

from routes.auth import auth_bp
from routes.session import session_bp
from routes.attendance import attendance_bp
from routes.excuse import excuse_bp
from routes.student import student_bp
from routes.admin import admin_bp

__all__ = [
    "auth_bp",
    "session_bp",
    "attendance_bp",
    "excuse_bp",
    "student_bp",
    "admin_bp",
]
