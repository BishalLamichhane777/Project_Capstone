"""FCM push notification service.

Uses the Expo Push Notification API (https://exp.host/--/exponent-push-api/v2/push/send)
which works with ExponentPushToken values registered by expo-notifications on the client.
All operations wrapped in try/except — failures are logged, never crash the API.
"""

import logging

import requests as _requests

logger = logging.getLogger(__name__)

_EXPO_PUSH_URL = "https://exp.host/--/exponent-push-api/v2/push/send"
_EXPO_HEADERS  = {
    "Accept":       "application/json",
    "Content-Type": "application/json",
}


def _send_fcm(device_token: str, title: str, body: str) -> bool:
    """Send a single Expo push notification.

    Accepts an ExponentPushToken (e.g. "ExponentPushToken[xxxxxx]").
    Returns True on success, False on failure.
    """
    try:
        payload = {"to": device_token, "title": title, "body": body}
        response = _requests.post(
            _EXPO_PUSH_URL, json=payload, headers=_EXPO_HEADERS, timeout=10
        )
        response.raise_for_status()
        data = response.json()
        # Expo returns a "data" array; each entry has a "status" field
        statuses = [item.get("status") for item in data.get("data", [])]
        if "error" in statuses:
            logger.error("Expo push error response (token=%s): %s", device_token, data)
            return False
        logger.info("Expo push sent successfully to token=%s", device_token)
        return True
    except Exception as exc:
        logger.error("Expo push failed (token=%s): %s", device_token, exc)
        return False


def _send_fcm_multicast(device_tokens: list, title: str, body: str) -> bool:
    """Send Expo push notification to multiple devices in one request.

    Returns True if the request succeeded and at least one message was
    accepted (status != 'error').
    """
    if not device_tokens:
        return False
    try:
        payload = {"to": device_tokens, "title": title, "body": body}
        response = _requests.post(
            _EXPO_PUSH_URL, json=payload, headers=_EXPO_HEADERS, timeout=10
        )
        response.raise_for_status()
        data = response.json()
        statuses  = [item.get("status") for item in data.get("data", [])]
        ok_count  = statuses.count("ok")
        err_count = statuses.count("error")
        logger.info(
            "Expo multicast: %d ok, %d error (of %d tokens)",
            ok_count, err_count, len(device_tokens),
        )
        return ok_count > 0
    except Exception as exc:
        logger.error("Expo multicast failed: %s", exc)
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
