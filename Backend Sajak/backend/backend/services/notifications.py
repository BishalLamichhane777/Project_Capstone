"""Notification service — in-app DB rows + Expo push notifications.

Strategy:
  ALL platforms  → insert a Notification row into SQLite (universal fallback).
  Any platform   → also send an Expo push notification if the user has a valid
                   Expo push token (starts with "ExponentPushToken[" or "ExpoPushToken[")
                   stored on users.device_token.

Push delivery uses the Expo Push API (https://exp.host/--/api/v2/push/send)
via a plain HTTPS POST — no SDK required, just the standard `requests` library.

All push operations are wrapped in try/except.
A failed push NEVER blocks the in-app notification or crashes session-end.
"""

import logging
from datetime import datetime, timezone

import requests

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _is_expo_token(token: str) -> bool:
    """Return True if the token looks like a valid Expo push token."""
    return bool(token) and (
        token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")
    )


# ─── Expo push ────────────────────────────────────────────────────────────────

def _send_expo_push(expo_token: str, title: str, body: str) -> bool:
    """Send a single push notification via the Expo Push API.

    Uses a plain HTTPS POST — no Firebase SDK required.
    Returns True on success (HTTP 200 with no delivery error), False otherwise.

    Expo push token format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
    Docs: https://docs.expo.dev/push-notifications/sending-notifications/
    """
    if not _is_expo_token(expo_token):
        logger.warning("_send_expo_push: invalid or missing Expo token: %s", expo_token)
        return False

    payload = {
        "to": expo_token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
    }

    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json=payload,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        response.raise_for_status()

        data = response.json()
        # Expo wraps results in {"data": [{"status": "ok"|"error", ...}]}
        results = data.get("data", [])
        if results and results[0].get("status") == "error":
            details = results[0].get("details", {})
            err_msg = results[0].get("message", "unknown error")
            logger.error(
                "Expo push delivery error (token=%s): %s %s",
                expo_token[:30],
                err_msg,
                details,
            )
            return False

        logger.info("Expo push sent: token=%s title=%r", expo_token[:30], title)
        return True

    except requests.exceptions.Timeout:
        logger.error("Expo push timed out (token=%s)", expo_token[:30])
        return False
    except Exception as exc:
        logger.error("Expo push failed (token=%s): %s", expo_token[:30] if expo_token else "None", exc)
        return False


# ─── In-app notification row ──────────────────────────────────────────────────

def _create_inapp_notification(user_id: int, notif_type: str, message: str) -> bool:
    """Insert a Notification row into SQLite for any platform.

    Called inside an active Flask app context (request or app.app_context).
    Returns True on success, False on failure.
    """
    try:
        from database import db
        from models.notification import Notification

        notif = Notification(
            user_id=user_id,
            type=notif_type,
            message=message,
            is_read=False,
            sent_at=datetime.now(timezone.utc),
        )
        db.session.add(notif)
        db.session.commit()
        logger.info("In-app notification created: user_id=%s type=%s", user_id, notif_type)
        return True
    except Exception as exc:
        logger.error("In-app notification failed: user_id=%s error=%s", user_id, exc)
        return False


# ─── Public API ───────────────────────────────────────────────────────────────

def notify_absent_student(
    user_id: int,
    platform: str,
    device_token: str,
    student_name: str,
    class_name: str,
) -> bool:
    """Notify a student they were marked absent.

    Always creates an in-app Notification row.
    Also sends an Expo push notification if device_token is a valid Expo token.
    """
    title   = "Attendance Alert"
    message = f"You were marked absent from {class_name}"

    # Step 1 — in-app row (all platforms)
    _create_inapp_notification(user_id, "Absent", message)

    # Step 2 — Expo push (any platform, token-gated)
    if _is_expo_token(device_token):
        _send_expo_push(device_token, title, message)

    return True


def notify_absent_students_bulk(absent_records, class_name: str) -> None:
    """Process all absent students after session end.

    absent_records: list of AttendanceRecord ORM objects.
    Each record must have record.student.user loaded (lazy load is fine).
    Runs the two-step notify_absent_student for each.

    NOTE: This version requires an active SQLAlchemy session (request context).
    Use notify_absent_students_bulk_plain() when calling from a background thread.
    """
    for record in absent_records:
        try:
            student = record.student
            if not student or not student.user:
                continue
            user = student.user
            notify_absent_student(
                user_id=user.id,
                platform=user.platform or "",
                device_token=user.device_token or "",
                student_name=user.fullname,
                class_name=class_name,
            )
        except Exception as exc:
            logger.error(
                "notify_absent_students_bulk: failed for record_id=%s error=%s",
                getattr(record, "record_id", "?"),
                exc,
            )


def notify_absent_students_bulk_plain(absent_data: list, class_name: str) -> None:
    """Process absent student notifications from pre-extracted plain dicts.

    This is the background-thread-safe version. It must be called inside a
    pushed Flask app context (app.app_context()) so that db.session works.

    absent_data: list of dicts, each with keys:
        user_id, platform, device_token, student_name
    """
    for entry in absent_data:
        try:
            notify_absent_student(
                user_id=entry["user_id"],
                platform=entry.get("platform", ""),
                device_token=entry.get("device_token", ""),
                student_name=entry.get("student_name", ""),
                class_name=class_name,
            )
        except Exception as exc:
            logger.error(
                "notify_absent_students_bulk_plain: failed for user_id=%s error=%s",
                entry.get("user_id", "?"),
                exc,
            )


def notify_excuse_decision(
    user_id: int,
    platform: str,
    device_token: str,
    decision: str,
    class_name: str,
) -> bool:
    """Notify student of waiver approval or rejection.

    Always creates in-app row. Sends Expo push if token is valid.
    """
    if decision == "Approved":
        title   = "Excuse Approved"
        message = f"Your excuse for {class_name} has been approved"
    else:
        title   = "Excuse Rejected"
        message = f"Your excuse for {class_name} was not approved"

    _create_inapp_notification(user_id, "Waiver", message)

    if _is_expo_token(device_token):
        _send_expo_push(device_token, title, message)

    return True


def notify_admins_new_waiver(
    admin_users: list,
    student_name: str,
    class_name: str,
) -> None:
    """Notify all admin users of a new waiver request.

    admin_users: list of User ORM objects with role == 'admin'.
    Creates in-app row for every admin.
    Sends Expo push to any admin with a valid Expo push token.
    """
    title   = "New Excuse Request"
    message = f"{student_name} submitted an excuse for {class_name}"

    for admin in admin_users:
        try:
            _create_inapp_notification(admin.id, "Waiver", message)
            if _is_expo_token(admin.device_token or ""):
                _send_expo_push(admin.device_token, title, message)
        except Exception as exc:
            logger.error(
                "notify_admins_new_waiver: failed for admin_id=%s error=%s",
                admin.id, exc,
            )
