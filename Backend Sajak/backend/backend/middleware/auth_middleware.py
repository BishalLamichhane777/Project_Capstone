"""Authentication and authorization middleware.

Provides:
- Firebase ID token verification
- JWT token verification (fallback / primary for this API)
- Role-based access control decorator
"""

import functools
import logging
from datetime import datetime, timezone

import jwt
from flask import current_app, g, jsonify, request

logger = logging.getLogger(__name__)


def _extract_token() -> str | None:
    """Extract Bearer token from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def verify_firebase_token(token: str) -> dict | None:
    """Decode a Firebase ID token using the Admin SDK.

    Returns decoded claims dict or None on failure.
    """
    try:
        from firebase_admin import auth as firebase_auth

        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception as exc:
        logger.warning("Firebase token verification failed: %s", exc)
        return None


def _decode_jwt(token: str) -> dict | None:
    """Decode an application-issued JWT.

    Returns payload dict or None on failure.
    """
    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"],
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT expired")
        return None
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid JWT: %s", exc)
        return None


def authenticate():
    """Authenticate the current request.

    Tries application JWT first, then Firebase ID token.
    On success sets ``g.current_user`` with ``user_id``, ``role``, ``email``.

    Returns an error response tuple if authentication fails, else None.
    """
    token = _extract_token()
    if not token:
        return jsonify({"error": "Authorization token is missing", "status": 401}), 401

    # Try application JWT first
    payload = _decode_jwt(token)
    if payload:
        g.current_user = {
            "user_id": payload["user_id"],
            "role": payload["role"],
            "email": payload.get("email", ""),
        }
        return None

    # Fallback: Firebase ID token
    fb_claims = verify_firebase_token(token)
    if fb_claims:
        g.current_user = {
            "user_id": fb_claims.get("uid"),
            "role": fb_claims.get("role", "student"),
            "email": fb_claims.get("email", ""),
        }
        return None

    return jsonify({"error": "Invalid or expired token", "status": 401}), 401


def require_role(*allowed_roles: str):
    """Decorator factory for role-based access control.

    Usage::

        @require_role("admin")
        def admin_only_view(): ...

        @require_role("teacher", "admin")
        def teacher_or_admin_view(): ...
    """

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            # Authenticate first
            auth_error = authenticate()
            if auth_error:
                return auth_error

            user_role = g.current_user.get("role", "")
            if user_role not in allowed_roles:
                return (
                    jsonify(
                        {
                            "error": f"Forbidden: requires one of {list(allowed_roles)}",
                            "status": 403,
                        }
                    ),
                    403,
                )

            return fn(*args, **kwargs)

        return wrapper

    return decorator
