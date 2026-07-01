"""Central scoring weights – adjust here without touching compute logic."""

from __future__ import annotations

# ── Sub-scores (field players) ──────────────────────────────────────────────

FIELD_WEIGHTS = {
    "offensive": {"goals_per_60": 0.45, "shot_pct": 0.35, "fastbreak_goals_per_60": 0.20},
    "defensive": {"steals_per_60": 0.45, "blocks_per_60": 0.35, "turnovers_per_60": -0.20},
    "playmaking": {"assists_per_60": 0.65, "assist_to_turnover": 0.35},
    "finishing": {"shot_pct": 0.55, "seven_meter_rate": 0.45},
    "decision": {"assist_to_turnover": 0.50, "turnovers_per_60": -0.50},
    "ball_security": {"turnovers_per_60": -0.70, "technical_fouls": -0.30},
    "transition": {"fastbreak_goals_per_60": 0.60, "steals_per_60": 0.40},
    "consistency": {"minutes": 0.50, "games": 0.50},
}

KEEPER_WEIGHTS = {
    "save": {"saves_per_60": 0.55, "save_pct": 0.45},
    "distribution": {"assists_per_60": 1.0},
    "keeper_defense": {"save_pct": 0.60, "goals_conceded_per_60": -0.40},
    "overall_keeper": {"save_score": 0.50, "distribution_score": 0.20, "keeper_defense_score": 0.30},
}

DEFAULT_FIELD_OVERALL = {
    "offensive_score": 0.25,
    "defensive_score": 0.15,
    "playmaking_score": 0.20,
    "finishing_score": 0.15,
    "decision_score": 0.10,
    "ball_security_score": 0.10,
    "transition_score": 0.05,
}

# Position-specific overall weight overrides (merged with DEFAULT_FIELD_OVERALL)
POSITION_OVERALL: dict[str, dict[str, float]] = {
    "RR": {"finishing_score": 0.28, "offensive_score": 0.28, "playmaking_score": 0.12},
    "RM": {"playmaking_score": 0.30, "decision_score": 0.15, "finishing_score": 0.10},
    "RL": {"finishing_score": 0.25, "offensive_score": 0.25, "playmaking_score": 0.15},
    "LA": {"finishing_score": 0.22, "offensive_score": 0.28, "transition_score": 0.10},
    "RA": {"finishing_score": 0.22, "offensive_score": 0.28, "transition_score": 0.10},
    "KM": {"finishing_score": 0.30, "offensive_score": 0.22, "ball_security_score": 0.12},
}

TRANSFER_SCORE_WEIGHTS = {
    "overall_score": 0.35,
    "value_score": 0.30,
    "potential_score": 0.20,
    "consistency_score": 0.15,
}

VALUE_SCORE_WEIGHTS = {
    "overall_score": 0.55,
    "market_value_eur": -0.45,
}

SCORE_LABELS_DE: dict[str, str] = {
    "overall_score": "Gesamt",
    "offensive_score": "Offensive",
    "defensive_score": "Defensive",
    "playmaking_score": "Playmaking",
    "finishing_score": "Abschluss",
    "ball_security_score": "Ballsicherheit",
    "transition_score": "Transition",
    "decision_score": "Entscheidung",
    "consistency_score": "Konstanz",
    "potential_score": "Potenzial",
    "transfer_score": "Transfer",
    "value_score": "Preis-Leistung",
    "goalkeeper_score": "Torhüter",
    "development_potential": "Entwicklung",
}
