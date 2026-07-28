"""Application configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Central configuration for the Flask application."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "SQLALCHEMY_DATABASE_URI", "sqlite:///attendance.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

    STRICT_MODE_THRESHOLD = float(os.getenv("STRICT_MODE_THRESHOLD", "0.80"))
    ACTIVITY_MODE_THRESHOLD = float(os.getenv("ACTIVITY_MODE_THRESHOLD", "0.55"))

    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:8081"
    ).split(",")

    # ── Flask-Admin ────────────────────────────────────────────────────
    FLASK_ADMIN_SWATCH = os.getenv("FLASK_ADMIN_SWATCH", "cosmo")

    # ── Face Recognition ──────────────────────────────────────────────
    # Minimum seconds between accepted scans for the same student in the
    # same session. Prevents rapid duplicate logs from a single pass.
    SCAN_COOLDOWN_SECONDS = int(os.getenv("SCAN_COOLDOWN_SECONDS", "15"))

    # ── Scheduling ────────────────────────────────────────────────────
    # Timezone used for all scheduling checks (is-today, time-window).
    # Must match the physical location of the server/school.
    SERVER_TIMEZONE = os.getenv("SERVER_TIMEZONE", "Asia/Kathmandu")

    # Minutes before scheduled_time that a teacher may start a session.
    SESSION_START_BUFFER_MINUTES = int(os.getenv("SESSION_START_BUFFER_MINUTES", "15"))

    # ── CSRF Protection (Flask-WTF) ───────────────────────────────────
    WTF_CSRF_ENABLED = True
