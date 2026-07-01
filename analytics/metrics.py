"""Per-60 and derived performance metrics."""

from __future__ import annotations

import pandas as pd

PER_60_COLS = [
    "goals", "shots", "assists", "turnovers", "steals", "blocks",
    "fastbreak_goals", "saves", "key_passes", "defensive_actions",
]

OPTIONAL_NUMERIC = [
    "key_passes", "technical_errors", "penalties_drawn",
    "seven_meter_goals", "seven_meter_shots", "shots_faced",
    "seven_meter_saves", "fouls", "suspensions_2min", "starts", "matches",
    "secondary_position",
]


def per_60(series: pd.Series, minutes: pd.Series) -> pd.Series:
    return (series / minutes.clip(lower=1)) * 60


def _ensure_column(df: pd.DataFrame, col: str, default: float | int | str = 0) -> pd.DataFrame:
    if col not in df.columns:
        df[col] = default
    return df


def enrich_player_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()

    for col in OPTIONAL_NUMERIC:
        _ensure_column(result, col, 0 if col != "secondary_position" else "")

    if "dominant_hand" not in result.columns and "throwing_hand" in result.columns:
        result["dominant_hand"] = result["throwing_hand"]
    _ensure_column(result, "dominant_hand", "Rechts")

    minutes = result["minutes"].astype(float)

    for col in PER_60_COLS:
        if col in result.columns:
            result[f"{col}_per_60"] = per_60(result[col].astype(float), minutes)

    if "goals" in result.columns and "assists" in result.columns:
        result["goal_contribution_per_60"] = per_60(
            result["goals"].astype(float) + result["assists"].astype(float), minutes
        )

    if "goals" in result.columns and "shots" in result.columns:
        result["shot_pct"] = (result["goals"] / result["shots"].clip(lower=1)) * 100
        result["scoring_efficiency"] = result["goals"] / result["shots"].clip(lower=1)

    if "seven_meter_goals" in result.columns:
        if "seven_meter_shots" in result.columns:
            denom = result["seven_meter_shots"]
        elif "seven_meter_attempts" in result.columns:
            denom = result["seven_meter_attempts"]
        else:
            denom = 1
        result["seven_meter_rate"] = result["seven_meter_goals"] / pd.Series(denom).clip(lower=1)
    else:
        result["seven_meter_rate"] = 0.0

    if "saves" in result.columns:
        result["saves_per_60"] = per_60(result["saves"].astype(float), minutes)
    if "goals_conceded" in result.columns:
        result["goals_conceded_per_60"] = per_60(result["goals_conceded"].astype(float), minutes)

    if "shots_faced" in result.columns and "saves" in result.columns:
        faced = result["shots_faced"].astype(float)
        mask = faced > 0
        if "save_pct" not in result.columns or result["save_pct"].sum() == 0:
            result.loc[mask, "save_pct"] = (result.loc[mask, "saves"] / faced[mask]) * 100

    result["assist_to_turnover"] = result["assists"] / result["turnovers"].clip(lower=1)
    result["playmaking_efficiency"] = result["assist_to_turnover"]

    denom = (result["goals"] + result["assists"] + result["turnovers"]).clip(lower=1)
    result["error_rate"] = result["turnovers"] / denom

    max_to = max(float(result["turnovers_per_60"].max()) if "turnovers_per_60" in result.columns else 1.0, 1.0)
    if "turnovers_per_60" in result.columns:
        result["ball_security"] = 1 - (result["turnovers_per_60"] / max_to)

    return result
