"""SQLAlchemy database instance shared across the application."""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utc_iso(dt: datetime | None) -> str | None:
    """Serialize a datetime to a UTC ISO 8601 string ending in 'Z'.

    SQLite + SQLAlchemy stores naive datetimes (no tzinfo).  Plain
    ``.isoformat()`` on a naive value produces ``"2026-07-11T15:29:38"``
    — no timezone marker — which JavaScript parses as *local* device time
    instead of UTC, causing timestamps to appear off by the local UTC
    offset (e.g. +5:45 for Nepal).

    This helper normalises both naive *and* aware datetimes to UTC and
    always appends ``Z``, which every JS engine unambiguously treats as UTC.
    """
    if dt is None:
        return None
    # If SQLAlchemy stripped tzinfo (naive), treat it as UTC — that is
    # what we always store.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    # Normalise any non-UTC aware datetime to UTC, then format.
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"
