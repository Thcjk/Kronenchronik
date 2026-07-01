"""Player domain model."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class PlayerProfile:
    id: int
    name: str
    age: int
    nationality: str
    position: str
    role: str
    team: str
    league: str
    country: str
    minutes: float
    market_value_eur: int

    @classmethod
    def from_row(cls, row: dict[str, Any] | Any) -> "PlayerProfile":
        data = dict(row) if not isinstance(row, dict) else row
        return cls(
            id=int(data["id"]),
            name=str(data["name"]),
            age=int(data.get("age", 0)),
            nationality=str(data.get("nationality", "")),
            position=str(data.get("position", "")),
            role=str(data.get("role", "Feld")),
            team=str(data.get("team", "")),
            league=str(data.get("league", "")),
            country=str(data.get("country", "")),
            minutes=float(data.get("minutes", 0)),
            market_value_eur=int(data.get("market_value_eur", 0)),
        )
