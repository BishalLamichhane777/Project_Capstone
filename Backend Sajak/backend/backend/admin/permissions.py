"""Role constants and permission helpers for the admin panel."""

ADMIN_ROLES = {"admin"}


def is_admin(user):
    """Return True if *user* has an admin role.

    Works with both the ORM ``User`` model and the ``g.current_user``
    dict used by the API middleware.
    """
    if user is None:
        return False

    # ORM User object
    role = getattr(user, "role", None)
    if role is None and isinstance(user, dict):
        role = user.get("role")

    return role in ADMIN_ROLES
