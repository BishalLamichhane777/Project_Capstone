"""pure_logic.py — Pure calculation helpers extracted from route handlers.

Every function in this module:
  • Takes only plain Python values (int, float, list, dict)
  • Returns only plain Python values
  • Has no side effects, no I/O, no database queries, no Flask context
  • Can be imported and called in unit tests with zero setup

These are extracted so they can be tested independently of the HTTP layer.
The route handlers in batch.py and admin.py import and call these directly.
"""

from __future__ import annotations

# At-risk threshold — single source of truth used by batch.py and admin.py.
# Defined here (not in batch.py) so pure_logic.py has no Flask/SQLAlchemy
# dependencies at all.
AT_RISK_THRESHOLD = 75.0


def compute_attendance_rate(present: int, total: int) -> float:
    """Compute attendance percentage as a plain float.

    Args:
        present: number of Present records
        total:   total number of attendance records (present + absent)

    Returns:
        Percentage in [0.0, 100.0].  Returns 0.0 when total == 0 rather
        than raising ZeroDivisionError, because a student with no records
        is treated as 0 % attendance throughout the application.

    Examples:
        compute_attendance_rate(8, 10)  → 80.0
        compute_attendance_rate(10, 10) → 100.0
        compute_attendance_rate(0, 10)  → 0.0
        compute_attendance_rate(0, 0)   → 0.0
    """
    if total <= 0:
        return 0.0
    return round(present / total * 100.0, 1)


def is_at_risk(rate: float, threshold: float = AT_RISK_THRESHOLD) -> bool:
    """Return True when a student's attendance rate is strictly below threshold.

    The boundary is EXCLUSIVE — a student at exactly 75.0 % is NOT at risk.

    Args:
        rate:      attendance percentage (0–100)
        threshold: at-risk cutoff (default AT_RISK_THRESHOLD = 75.0)

    Returns:
        True  if rate < threshold
        False if rate >= threshold
    """
    return rate < threshold


def select_worst_class(
    student_class_rates: list[dict],
    threshold: float = AT_RISK_THRESHOLD,
) -> dict | None:
    """Find the class where a student's attendance is lowest, if below threshold.

    Used by the dashboard at-risk endpoint: for a student enrolled in multiple
    classes we surface the one with the worst attendance (worst-case exposure).

    Args:
        student_class_rates: list of dicts, each with:
            {
              "student_id": int,
              "class_id":   int,
              "rate":       float   ← attendance percentage for that class
            }
        threshold: at-risk cutoff (default 75.0)

    Returns:
        The dict entry with the lowest "rate" that is strictly below threshold,
        or None if no entry is below the threshold (student is not at risk
        in any class).

    Examples:
        # One class, below threshold
        select_worst_class([{"student_id":1,"class_id":10,"rate":60.0}])
        → {"student_id":1,"class_id":10,"rate":60.0}

        # Multiple classes — returns the lowest
        select_worst_class([
            {"student_id":1,"class_id":10,"rate":60.0},
            {"student_id":1,"class_id":20,"rate":40.0},
            {"student_id":1,"class_id":30,"rate":80.0},
        ])
        → {"student_id":1,"class_id":20,"rate":40.0}

        # Exactly at threshold — NOT at risk, returns None
        select_worst_class([{"student_id":1,"class_id":10,"rate":75.0}])
        → None

        # Empty list
        select_worst_class([])
        → None
    """
    worst: dict | None = None
    for entry in student_class_rates:
        rate = entry["rate"]
        if rate >= threshold:
            continue  # not at risk in this class
        if worst is None or rate < worst["rate"]:
            worst = entry
    return worst
