"""Shortlist database helpers."""

from __future__ import annotations

from datetime import datetime

from database.db import get_connection
from models.shortlist_status import DEFAULT_STATUS


def add_to_shortlist(
    shortlist_id: int,
    player_id: int,
    *,
    status: str = DEFAULT_STATUS,
    priority: int = 3,
    rating: float = 7.0,
    notes: str = "",
) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT OR REPLACE INTO shortlist_items
        (shortlist_id, player_id, priority, status, rating, notes, added_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (shortlist_id, player_id, priority, status, rating, notes, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()


def update_shortlist_item(
    item_id: int,
    *,
    status: str | None = None,
    priority: int | None = None,
    rating: float | None = None,
    notes: str | None = None,
) -> None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM shortlist_items WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        return
    conn.execute(
        """
        UPDATE shortlist_items
        SET status = ?, priority = ?, rating = ?, notes = ?
        WHERE id = ?
        """,
        (
            status if status is not None else row["status"],
            priority if priority is not None else row["priority"],
            rating if rating is not None else row["rating"],
            notes if notes is not None else row["notes"],
            item_id,
        ),
    )
    conn.commit()
    conn.close()


def remove_shortlist_item(item_id: int) -> None:
    conn = get_connection()
    conn.execute("DELETE FROM shortlist_items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
