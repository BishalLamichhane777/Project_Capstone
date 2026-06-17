"""Main entry point for the Flask-Admin module."""

import os
from flask_admin import Admin
from flask_wtf.csrf import CSRFProtect

from database import db
from admin.auth import init_login, AdminLoginView


def init_admin(app):
    """Initialize the Flask-Admin panel and all model views."""
    
    # ── WTForms 3.0+ Compatibility Monkeypatch ──
    # flask-admin built-in validators use a tuple for `field_flags` which crashes
    # WTForms 3+ (which expects a dictionary). We patch them globally here.
    from flask_admin.contrib.sqla import validators as sqla_validators
    from flask_admin.form import validators as form_validators
    
    if hasattr(sqla_validators, 'Unique'):
        sqla_validators.Unique.field_flags = {'unique': True}
    if hasattr(form_validators, 'Required'):
        form_validators.Required.field_flags = {'required': True}

    # 1. Initialize CSRF protection (required for Flask-Admin forms)
    csrf = CSRFProtect(app)

    # Exempt API blueprints from CSRF protection (since they use JWT, not cookies)
    from routes.auth import auth_bp
    from routes.session import session_bp
    from routes.attendance import attendance_bp
    from routes.excuse import excuse_bp
    from routes.student import student_bp
    from routes.admin import admin_bp

    csrf.exempt(auth_bp)
    csrf.exempt(session_bp)
    csrf.exempt(attendance_bp)
    csrf.exempt(excuse_bp)
    csrf.exempt(student_bp)
    csrf.exempt(admin_bp)

    # Exempt batch blueprint (uses JWT auth, not cookies)
    from routes.batch import batch_bp
    csrf.exempt(batch_bp)

    try:
        from health import health_bp
        csrf.exempt(health_bp)
    except ImportError:
        pass


    # 2. Initialize Flask-Login (session-based auth for admin)
    init_login(app)

    # 3. Create the Admin instance
    admin = Admin(
        app,
        name="myTIMeS Admin",
        index_view=AdminLoginView(name="Dashboard", endpoint="admin", url="/admin"),
    )

    # 4. Import models here to avoid circular imports
    from models.user import User
    from models.student import Student
    from models.class_model import Class, Enrollment
    from models.session import Session
    from models.attendance import AttendanceLog, AttendanceRecord
    from models.excuse import WaiverRequest
    from models.notification import Notification

    # 5. Import model views
    from admin.model_views.user_admin import UserAdmin
    from admin.model_views.student_admin import StudentAdmin
    from admin.model_views.class_admin import ClassAdmin, EnrollmentAdmin
    from admin.model_views.session_admin import SessionAdmin
    from admin.model_views.attendance_admin import AttendanceLogAdmin, AttendanceRecordAdmin
    from admin.model_views.excuse_admin import WaiverRequestAdmin
    from admin.model_views.notification_admin import NotificationAdmin

    # 6. Register all model views
    admin.add_view(UserAdmin(User, db.session, name="Users", category="Users & Roles"))
    admin.add_view(StudentAdmin(Student, db.session, name="Students", category="Users & Roles"))
    
    admin.add_view(ClassAdmin(Class, db.session, name="Classes", category="Academics"))
    admin.add_view(EnrollmentAdmin(Enrollment, db.session, name="Enrollments", category="Academics"))
    
    admin.add_view(SessionAdmin(Session, db.session, name="Sessions", category="Attendance"))
    admin.add_view(AttendanceLogAdmin(AttendanceLog, db.session, name="Raw Logs", category="Attendance"))
    admin.add_view(AttendanceRecordAdmin(AttendanceRecord, db.session, name="Final Records", category="Attendance"))
    
    admin.add_view(WaiverRequestAdmin(WaiverRequest, db.session, name="Excuses / Waivers", category="System"))
    admin.add_view(NotificationAdmin(Notification, db.session, name="Notifications", category="System"))
