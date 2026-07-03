"""Authentication routes — login, register, profile."""

import logging
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from flask import Blueprint, current_app, g, jsonify, request

from database import db
from models.user import User
from models.student import Student
from middleware.auth_middleware import authenticate, require_role

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user with email + password and return a JWT."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required", "status": 400}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid credentials", "status": 401}), 401

    # Verify password
    if not bcrypt.checkpw(
        password.encode("utf-8"), user.password_hash.encode("utf-8")
    ):
        return jsonify({"error": "Invalid credentials", "status": 401}), 401

    # Generate JWT
    expiry_hours = current_app.config.get("JWT_EXPIRY_HOURS", 24)
    payload = {
        "user_id": user.id,
        "role": user.role,
        "email": user.email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
    }
    token = jwt.encode(
        payload, current_app.config["SECRET_KEY"], algorithm="HS256"
    )

    return (
        jsonify(
            {
                "token": token,
                "role": user.role,
                "user_id": user.id,
                "fullname": user.fullname,
            }
        ),
        200,
    )


@auth_bp.route("/register", methods=["POST"])
@require_role("admin")
def register():
    """Register a new user (admin-only).

    If role is 'student', also creates a Student profile.
    Optionally creates the user in Firebase Auth.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    fullname = data.get("fullname", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    role = data.get("role", "").strip()
    phone = data.get("phone", "").strip() if data.get("phone") else None

    # Validation
    if not fullname or not email or not password or not role:
        return (
            jsonify(
                {"error": "fullname, email, password, and role are required", "status": 400}
            ),
            400,
        )

    if role not in User.VALID_ROLES:
        return (
            jsonify(
                {
                    "error": f"Invalid role. Must be one of: {', '.join(User.VALID_ROLES)}",
                    "status": 422,
                }
            ),
            422,
        )

    # Check for duplicate email
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists", "status": 409}), 409

    # Hash password
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    # Create user
    user = User(
        fullname=fullname,
        email=email,
        password_hash=password_hash,
        role=role,
        phone=phone,
    )
    db.session.add(user)
    db.session.flush()  # get user.id before commit

    # If student, create student profile
    if role == "student":
        roll_number = data.get("roll_number", "").strip()
        program = data.get("program", "").strip()
        year_of_study = data.get("year_of_study")
        face_label = data.get("face_label", "").strip() if data.get("face_label") else None

        if not roll_number or not program:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "error": "roll_number and program are required for student role",
                        "status": 400,
                    }
                ),
                400,
            )

        if Student.query.filter_by(roll_number=roll_number).first():
            db.session.rollback()
            return (
                jsonify({"error": "Roll number already exists", "status": 409}),
                409,
            )

        student = Student(
            user_id=user.id,
            roll_number=roll_number,
            program=program,
            year_of_study=int(year_of_study) if year_of_study else None,
            face_label=face_label,
        )
        db.session.add(student)

    db.session.commit()

    # Post-commit verification for student role: confirm the students row
    # was actually persisted. In normal operation this will always pass, but
    # if a silent DB error or ORM edge-case caused the row to be dropped we
    # catch it here rather than leaving the user in a broken half-registered
    # state (user row exists, students row missing).
    if role == "student":
        saved_student = Student.query.filter_by(user_id=user.id).first()
        if not saved_student:
            logger.error(
                "register: user_id=%s was committed but students row is missing — "
                "possible DB constraint or ORM issue.",
                user.id,
            )
            return (
                jsonify(
                    {
                        "error": (
                            "User created but student profile failed to save. "
                            "Please contact admin."
                        ),
                        "status": 500,
                    }
                ),
                500,
            )

    # Create user in Firebase Auth (best-effort)
    try:
        from firebase_admin import auth as firebase_auth

        firebase_auth.create_user(
            uid=str(user.id),
            email=email,
            display_name=fullname,
            password=password,
        )
        logger.info("Firebase Auth user created for %s", email)
    except Exception as exc:
        logger.warning("Firebase Auth user creation failed: %s", exc)

    return jsonify({"user_id": user.id, "message": "User registered"}), 201


@auth_bp.route("/me", methods=["GET"])
def me():
    """Return the current user's profile based on their token."""
    auth_error = authenticate()
    if auth_error:
        return auth_error

    user_id = g.current_user["user_id"]
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    result = user.to_dict()

    # Include student profile if applicable
    if user.role == "student" and user.student_profile:
        result["student_profile"] = {
            "student_id": user.student_profile.student_id,
            "roll_number": user.student_profile.roll_number,
            "program": user.student_profile.program,
            "year_of_study": user.student_profile.year_of_study,
        }

    return jsonify(result), 200


@auth_bp.route("/me", methods=["PUT"])
def update_me():
    """Allow any authenticated user to update their own profile.

    Accepted fields (all optional):
      - fullname  (str)
      - phone     (str | null)
      - password  (str) — plain text; will be hashed before saving

    This endpoint is role-agnostic so students, teachers, and admins can
    all update their own credentials without needing admin privileges.
    """
    auth_error = authenticate()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    user_id = g.current_user["user_id"]
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    if "fullname" in data:
        fullname = data["fullname"].strip() if data["fullname"] else ""
        if not fullname:
            return jsonify({"error": "fullname cannot be empty", "status": 400}), 400
        user.fullname = fullname

    if "phone" in data:
        user.phone = data["phone"].strip() if data["phone"] else None

    if "password" in data:
        new_password = data["password"]
        if not new_password or len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters", "status": 400}), 400
        salt = bcrypt.gensalt()
        user.password_hash = bcrypt.hashpw(
            new_password.encode("utf-8"), salt
        ).decode("utf-8")

    db.session.commit()
    logger.info("User user_id=%s updated their own profile", user_id)
    return jsonify({"message": "Profile updated successfully"}), 200


@auth_bp.route("/device-token", methods=["POST"])
def register_device_token():
    """Save the caller's Expo push token to their user record.

    Requires a valid JWT in the Authorization header.
    Body: { "device_token": "<ExponentPushToken[...]>" }

    The token is stored on the users.device_token column and used by
    services/notifications.py to send FCM/Expo push notifications.
    """
    # Authenticate using the same pattern as /me
    auth_error = authenticate()
    if auth_error:
        return auth_error

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required", "status": 400}), 400

    device_token = data.get("device_token", "").strip()
    if not device_token:
        return jsonify({"error": "device_token is required", "status": 400}), 400

    user_id = g.current_user["user_id"]
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found", "status": 404}), 404

    user.device_token = device_token
    db.session.commit()

    logger.info("Device token saved for user_id=%s role=%s", user_id, user.role)

    return jsonify({"message": "Device token saved"}), 200
