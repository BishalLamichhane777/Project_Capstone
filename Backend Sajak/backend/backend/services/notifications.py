"""Notification service — in-app DB rows + Android FCM push.

Strategy (decided, do not change):
  ALL platforms  → insert a Notification row into SQLite (universal fallback).
  Android only   → also send a native FCM push via firebase_admin.messaging.send()
                   using the native device token from users.device_token.
  iOS            → in-app only (no APNs — no Apple Developer account).

All push operations are wrapped in try/except.
A failed push NEVER blocks the in-app notification or crashes session-end.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


# ─── FCM push (Android only) ─────────────────────────────────────────────────

def _send_android_fcm(device_token: str, title: str, body: str) -> bool:
    """Send a single native FCM push to an Android device token.

    Uses firebase_admin.messaging.send() — requires the Firebase Admin SDK
    to be already initialised (done in app.py _init_firebase).
    Returns True on success, False on any failure.
    """
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=device_token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    sound="default",
                    channel_id="default",
                ),
            ),
        )
        response = messaging.send(message)
        logger.info("FCM push sent: message_id=%s token=%s", response, device_token[:20])
        return True
    except Exception as exc:
        logger.error("FCM push failed (token=%s): %s", device_token[:20] if device_token else "None", exc)
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
    Also sends Android FCM push if platform == 'android' and token present.
    """
    title   = "Attendance Alert"
    message = f"You were marked absent from {class_name}"

    # Step 1 — in-app row (all platforms)
    _create_inapp_notification(user_id, "Absent", message)

    # Step 2 — Android FCM push
    if platform == "android" and device_token:
        _send_android_fcm(device_token, title, message)

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

    Always creates in-app row. Android gets FCM push too.
    """
    if decision == "Approved":
        title   = "Excuse Approved"
        message = f"Your excuse for {class_name} has been approved"
    else:
        title   = "Excuse Rejected"
        message = f"Your excuse for {class_name} was not approved"

    _create_inapp_notification(user_id, "Waiver", message)

    if platform == "android" and device_token:
        _send_android_fcm(device_token, title, message)

    return True


def notify_admins_new_waiver(
    admin_users: list,
    student_name: str,
    class_name: str,
) -> None:
    """Notify all admin users of a new waiver request.

    admin_users: list of User ORM objects with role == 'admin'.
    Creates in-app row for every admin.
    Sends Android FCM push to any admin on Android with a device token.
    """
    title   = "New Excuse Request"
    message = f"{student_name} submitted an excuse for {class_name}"

    for admin in admin_users:
        try:
            _create_inapp_notification(admin.id, "Waiver", message)
            if (admin.platform or "") == "android" and admin.device_token:
                _send_android_fcm(admin.device_token, title, message)
        except Exception as exc:
            logger.error(
                "notify_admins_new_waiver: failed for admin_id=%s error=%s",
                admin.id, exc,
            )
