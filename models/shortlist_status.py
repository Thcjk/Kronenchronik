"""Shortlist scouting status definitions."""

from __future__ import annotations

STATUS_OPTIONS = [
    "Beobachten",
    "Interessant",
    "Priorität",
    "Verpflichten",
    "Ablehnen",
]

STATUS_COLORS: dict[str, str] = {
    "Beobachten": "#64748b",
    "Interessant": "#3b82f6",
    "Priorität": "#f59e0b",
    "Verpflichten": "#22c55e",
    "Ablehnen": "#ef4444",
}

STATUS_SORT: dict[str, int] = {
    "Verpflichten": 1,
    "Priorität": 2,
    "Interessant": 3,
    "Beobachten": 4,
    "Ablehnen": 5,
}

DEFAULT_STATUS = "Beobachten"
