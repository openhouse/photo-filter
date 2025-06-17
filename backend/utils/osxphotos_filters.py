"""
osxphotos custom filter:  **to_utc**

Apple Photos writes capture dates in the computer’s local zone.
osxphotos’ template engine (≤ 0.72.x) has *no* built‑in way to coerce a
`datetime` to UTC, so we supply one.

Usage inside an osxphotos template string::

    {created|to_utc.strftime,"%Y%m%dT%H%M%S%fZ"}

The CLI then needs:

    --filter "to_utc:backend.utils.osxphotos_filters:to_utc"
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def to_utc(value: Any) -> Any:
    """
    Convert a :pyclass:`datetime.datetime` to timezone‑aware **UTC**.

    * If *value* is not a ``datetime`` (e.g. it’s a string or None) we leave it
      untouched so other filters in the chain can decide what to do.
    * Naïve datetimes are assumed to be in the **local** zone before conversion.

    Parameters
    ----------
    value
        The incoming template value.

    Returns
    -------
    datetime | Any
        A timezone‑aware UTC datetime, or *value* if conversion is impossible.
    """
    if not isinstance(value, datetime):
        return value

    if value.tzinfo is None:
        # Treat naïve time as “local” and convert
        value = value.astimezone()  # local → local‑aware

    return value.astimezone(timezone.utc)
