"""Notification admin view — read-only system notifications."""

from admin.base_views import ReadOnlyAdminView


class NotificationAdmin(ReadOnlyAdminView):
    """Read-only view for ``Notification`` entries.

    Notifications are created by the system (excuse submissions,
    attendance alerts, etc.) and should not be manually created
    or edited through the admin panel.
    """

    # ── List view ─────────────────────────────────────────────────────
    column_list = [
        "notif_id",
        "user",
        "type",
        "message",
        "is_read",
        "sent_at",
    ]
    column_sortable_list = [
        "notif_id",
        "type",
        "is_read",
        "sent_at",
    ]
    column_filters = ["type", "is_read", "sent_at"]
    column_default_sort = ("sent_at", True)

    # ── Labels ────────────────────────────────────────────────────────
    column_labels = {
        "notif_id": "Notification ID",
        "user": "User",
        "type": "Type",
        "message": "Message",
        "is_read": "Read?",
        "sent_at": "Sent At",
    }

    # ── Relationship display ──────────────────────────────────────────
    column_formatters = {
        "user": lambda v, c, m, n: (
            m.user.fullname if m.user else "—"
        ),
        "sent_at": lambda v, c, m, n: (
            m.sent_at.strftime("%Y-%m-%d %H:%M") if m.sent_at else ""
        ),
    }
