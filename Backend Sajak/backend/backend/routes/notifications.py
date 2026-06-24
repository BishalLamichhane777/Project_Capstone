"""Notification routes — any authenticated user can read their own notifications."""

import logging

from flask import Blueprint, g, jsonify, request

from database import db
from models.notification import Notification
from middleware.auth_middleware import authenticate

logger = logging.getLogger(__name__)

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/my-notifications", methods=["GET"])
def my_notifications():
    """Return all notifications for the current user, newest first.

    Works for any role (student, teacher, admin).
    Does NOT auto-mark as read — call /mark-read separately.
    """
    auth_error = authenticate()
    if auth_error:
        return auth_error

    user_id = g.current_user["user_id"]

    notifs = (
        Notification.query
        .filter_by(user_id=user_id)
        .order_by(Notification.sent_at.desc())
        .all()
    )

    return jsonify([n.to_dict() for n in notifs]), 200


@notifications_bp.route("/mark-read", methods=["PUT"])
def mark_all_read():
    """Mark notifications as read for the current user.

    Body (JSON, all optional):
      { "notification_id": 42 }   — marks only that one notification as read
      {}                          — marks ALL unread notifications as read
    """
    auth_error = authenticate()
    if auth_error:
        return auth_error

    user_id = g.current_user["user_id"]

    data = request.get_json(silent=True) or {}
    notification_id = data.get("notification_id")

    if notification_id is not None:
        # Mark a single specific notification as read
        notif = Notification.query.filter_by(
            notif_id=int(notification_id), user_id=user_id
        ).first()
        if not notif:
            return jsonify({"error": "Notification not found", "status": 404}), 404
        if notif.is_read:
            return jsonify({"marked_read": 0}), 200
        notif.is_read = True
        count = 1
    else:
        # Mark all unread as read (backward-compatible behaviour)
        updated = (
            Notification.query
            .filter_by(user_id=user_id, is_read=False)
            .all()
        )
        count = len(updated)
        for n in updated:
            n.is_read = True

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.exception("mark-read: DB commit failed for user_id=%s: %s", user_id, exc)
        return jsonify({"error": "Failed to mark notifications as read", "status": 500}), 500

    logger.info("mark-read: %d notification(s) marked read for user_id=%s", count, user_id)
    return jsonify({"marked_read": count}), 200


@notifications_bp.route("/unread-count", methods=["GET"])
def unread_count():
    """Return the count of unread notifications for the current user.

    Used by dashboard headers to drive the badge number.
    """
    auth_error = authenticate()
    if auth_error:
        return auth_error

    user_id = g.current_user["user_id"]
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({"unread_count": count}), 200
