"""Flask application factory and entry point.

Creates the Flask app, registers blueprints, initializes extensions,
and configures global error handlers.
"""

import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from database import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _init_firebase(app: Flask) -> None:
    """Initialize Firebase Admin SDK if credentials are available."""
    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_path = app.config.get("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")

        if not os.path.isabs(cred_path):
            cred_path = os.path.join(os.path.dirname(__file__), cred_path)

        if os.path.exists(cred_path):
            if not firebase_admin._apps:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {
                    "databaseURL": os.getenv("FIREBASE_DATABASE_URL", ""),
                })
                logger.info("Firebase Admin SDK initialized")
        else:
            logger.warning(
                "Firebase credentials not found at %s — Firebase features disabled",
                cred_path,
            )
    except Exception as exc:
        logger.error("Firebase initialization failed: %s", exc)


def create_app(config_class=Config) -> Flask:
    """Application factory.

    Returns a fully configured Flask app with all blueprints,
    database, CORS, Firebase, and error handlers set up.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ── Extensions ─────────────────────────────────────────────────────
    db.init_app(app)
    CORS(app, origins=app.config.get("CORS_ORIGINS", ["*"]))

    # ── Firebase ───────────────────────────────────────────────────────
    _init_firebase(app)

    # ── Admin Panel ────────────────────────────────────────────────────
    from admin import init_admin
    init_admin(app)

    # ── Blueprints ─────────────────────────────────────────────────────
    from routes.auth import auth_bp
    from routes.session import session_bp
    from routes.attendance import attendance_bp
    from routes.excuse import excuse_bp
    from routes.student import student_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(session_bp, url_prefix="/api/session")
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(excuse_bp, url_prefix="/api/excuse")
    app.register_blueprint(student_bp, url_prefix="/api/student")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # Keep legacy health check if it exists
    try:
        from health import health_bp
        app.register_blueprint(health_bp, url_prefix="/health")
    except ImportError:
        pass

    # ── Database Tables ────────────────────────────────────────────────
    with app.app_context():
        import models  # noqa: F401 — triggers model registration
        db.create_all()
        logger.info("Database tables created / verified")

    # ── Global Error Handlers ──────────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "status": 400}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Unauthorized", "status": 401}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Forbidden", "status": 403}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found", "status": 404}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed", "status": 405}), 405

    @app.errorhandler(409)
    def conflict(e):
        return jsonify({"error": "Conflict", "status": 409}), 409

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"error": "Unprocessable entity", "status": 422}), 422

    @app.errorhandler(500)
    def internal_error(e):
        logger.exception("Unhandled server error")
        return (
            jsonify({"error": "Internal server error", "status": 500}),
            500,
        )

    @app.errorhandler(503)
    def service_unavailable(e):
        return jsonify({"error": "Service unavailable", "status": 503}), 503

    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.exception("Unhandled exception: %s", e)
        return (
            jsonify({"error": "An unexpected error occurred", "status": 500}),
            500,
        )

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
