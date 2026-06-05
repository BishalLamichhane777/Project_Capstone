"""FCM push notification service.

Uses Firebase Admin SDK messaging.
All operations wrapped in try/except — failures are logged, never crash the API.
"""

import logging

logger = logging.getLogger(__name__)


def _send_fcm(device_token: str, title: str, body: str) -> bool:
    """Send a single FCM push notification.

    Returns True on success, False on failure.
    """
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=device_token,
        )
        response = messaging.send(message)
        logger.info("FCM sent successfully: %s", response)
        return True
    except Exception as exc:
        logger.error("FCM send failed (token=%s): %s", device_token, exc)
        return False


def _send_fcm_multicast(device_tokens: list, title: str, body: str) -> bool:
    """Send FCM push to multiple devices.

    Returns True if at least one message was sent successfully.
    """
    if not device_tokens:
        return False
    try:
        from firebase_admin import messaging

        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            tokens=device_tokens,
        )
        response = messaging.send_each_for_multicast(message)
        logger.info(
            "FCM multicast: %d success, %d failure",
            response.success_count,
            response.failure_count,
        )
        return response.success_count > 0
    except Exception as exc:
        logger.error("FCM multicast failed: %s", exc)
        return False


def send_absence_notification(
    device_token: str,
    student_name: str,
    session_id: str,
    class_name: str,
) -> bool:
    """Notify a student they were marked absent.

    Title: "Attendance Alert"
    Body: "You were marked absent from {class_name}"
    """
    if not device_token:
        logger.warning(
            "No device token for student %s — skipping absence push", student_name
        )
        return False

    return _send_fcm(
        device_token=device_token,
        title="Attendance Alert",
        body=f"You were marked absent from {class_name}",
    )


def send_excuse_approved_notification(
    device_token: str, class_name: str
) -> bool:
    """Notify a student their excuse was approved.

    Title: "Excuse Approved"
    Body: "Your excuse for {class_name} has been approved"
    """
    if not device_token:
        return False
    return _send_fcm(
        device_token=device_token,
        title="Excuse Approved",
        body=f"Your excuse for {class_name} has been approved",
    )


def send_excuse_rejected_notification(
    device_token: str, class_name: str
) -> bool:
    """Notify a student their excuse was rejected.

    Title: "Excuse Rejected"
    Body: "Your excuse for {class_name} was not approved"
    """
    if not device_token:
        return False
    return _send_fcm(
        device_token=device_token,
        title="Excuse Rejected",
        body=f"Your excuse for {class_name} was not approved",
    )


def send_waiver_request_notification(
    admin_tokens_list: list,
    student_name: str,
    class_name: str,
) -> bool:
    """Notify admin users about a new excuse request.

    Title: "New Excuse Request"
    Body: "{student_name} submitted an excuse for {class_name}"
    """
    valid_tokens = [t for t in admin_tokens_list if t]
    if not valid_tokens:
        logger.warning("No admin device tokens available for waiver push")
        return False

    return _send_fcm_multicast(
        device_tokens=valid_tokens,
        title="New Excuse Request",
        body=f"{student_name} submitted an excuse for {class_name}",
    )
