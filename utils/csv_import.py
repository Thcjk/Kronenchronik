"""CSV import utilities."""

from __future__ import annotations

import pandas as pd

COLUMN_ALIASES = {
    "player": "name",
    "spieler": "name",
    "verein": "team",
    "club": "team",
    "wurfquote": "shot_pct",
    "paraden": "saves",
    "paradenquote": "save_pct",
    "gegentore": "goals_conceded",
    "marktwert": "market_value_eur",
    "nationalitaet": "nationality",
    "groesse": "height_cm",
    "gewicht": "weight_kg",
}

REQUIRED = {"name", "team", "league", "age", "position", "minutes"}

OPTIONAL_COLUMNS = [
    "nationality", "country", "role", "goals", "shots", "assists", "turnovers",
    "steals", "blocks", "saves", "save_pct", "goals_conceded", "market_value_eur",
    "contract_until", "height_cm", "weight_kg", "birth_date", "games", "starts",
    "fastbreak_goals", "seven_meter_goals", "seven_meter_shots", "key_passes",
    "technical_errors", "defensive_actions", "shots_faced",
]


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    result.columns = [c.strip().lower().replace(" ", "_") for c in result.columns]
    result = result.rename(columns={k: v for k, v in COLUMN_ALIASES.items() if k in result.columns})
    if "name" not in result.columns and "player" in result.columns:
        result = result.rename(columns={"player": "name"})
    return result


def validate_import(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str], list[str]]:
    from utils.data_validation import analyze_data_quality

    df = normalize_columns(df)
    report = analyze_data_quality(df)
    missing = report.missing_required
    warnings = list(report.warnings)

    if "role" not in df.columns:
        df["role"] = df["position"].apply(lambda p: "TW" if str(p).upper() == "TW" else "Feld")
    for col in ("goals", "shots", "assists", "turnovers", "steals", "blocks", "saves", "save_pct", "goals_conceded"):
        if col not in df.columns:
            df[col] = 0
            if col not in [w.split("'")[1] for w in warnings if "fehlte" in w]:
                warnings.append(f"Spalte '{col}' fehlte – mit 0 ergänzt.")

    return df, missing, warnings
