from datetime import date as date_cls, timedelta
from typing import Optional, Tuple


def is_weekday(date: str) -> bool:
    """Whether `date` ("YYYY-MM-DD") falls on Monday-Friday."""
    return date_cls.fromisoformat(date).weekday() < 5  # Mon=0 .. Sun=6


def period_bounds(frequency: str, date: str) -> Optional[Tuple[str, str]]:
    """Inclusive (start, end) date-string bounds for the period containing
    `date`, for frequencies that only allow one completion per period.

    Weekly uses the real ISO calendar week (Monday-Sunday) — weekly habits
    are only checkable Monday-Friday (see is_weekday), so the period must
    span the actual week those weekdays belong to. Returns None for
    "daily", which has no period restriction.
    """
    if frequency == "monthly":
        month = date[:7]
        return f"{month}-01", f"{month}-32"
    if frequency == "weekly":
        d = date_cls.fromisoformat(date)
        monday = d - timedelta(days=d.weekday())
        sunday = monday + timedelta(days=6)
        return monday.isoformat(), sunday.isoformat()
    return None
