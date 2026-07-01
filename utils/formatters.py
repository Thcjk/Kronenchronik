"""Formatting helpers."""

from __future__ import annotations


def format_currency(value: int | float) -> str:
    return f"{int(value):,} €".replace(",", ".")


def format_percent(value: float) -> str:
    return f"{value:.1f} %"
