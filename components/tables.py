"""German column labels and table display helpers."""

from __future__ import annotations

import pandas as pd
import streamlit as st

COLUMN_LABELS: dict[str, str] = {
    "name": "Spieler",
    "team": "Verein",
    "league": "Liga",
    "country": "Land",
    "nationality": "Nationalität",
    "age": "Alter",
    "position": "Position",
    "role": "Typ",
    "minutes": "Minuten",
    "games": "Spiele",
    "goals": "Tore",
    "shots": "Würfe",
    "shot_pct": "Wurfquote %",
    "assists": "Assists",
    "turnovers": "Ballverluste",
    "steals": "Steals",
    "blocks": "Blocks",
    "saves": "Paraden",
    "save_pct": "Paradenquote %",
    "goals_conceded": "Gegentore",
    "market_value_eur": "Marktwert €",
    "contract_until": "Vertrag bis",
    "height_cm": "Größe cm",
    "weight_kg": "Gewicht kg",
    "overall_score": "Gesamt-Score",
    "offensive_score": "Offensiv-Score",
    "defensive_score": "Defensiv-Score",
    "playmaking_score": "Playmaking-Score",
    "finishing_score": "Abschluss-Score",
    "decision_score": "Entscheidungs-Score",
    "ball_security_score": "Ballsicherheit",
    "transition_score": "Transition-Score",
    "consistency_score": "Konstanz-Score",
    "development_potential": "Entwicklung",
    "potential_score": "Potenzial",
    "transfer_score": "Transfer-Score",
    "value_score": "Preis-Leistung",
    "goalkeeper_score": "Torhüter-Score",
    "goal_contribution_per_60": "Torbeitrag/60",
    "goals_per_60": "Tore/60",
    "assists_per_60": "Assists/60",
    "turnovers_per_60": "Ballverluste/60",
    "steals_per_60": "Steals/60",
    "blocks_per_60": "Blocks/60",
    "saves_per_60": "Paraden/60",
    "scoring_efficiency": "Abschlusseffizienz",
    "playmaking_efficiency": "Spielmachereffizienz",
    "error_rate": "Fehlerquote",
    "similarity_pct": "Ähnlichkeit %",
    "common_traits": "Gemeinsamkeiten",
    "differences": "Unterschiede",
    "priority": "Priorität",
    "rating": "Bewertung",
    "status": "Status",
    "notes": "Notizen",
    "player_id": "Spieler-ID",
}


def rename_columns_de(df: pd.DataFrame, columns: list[str] | None = None) -> pd.DataFrame:
    cols = columns or list(df.columns)
    mapping = {c: COLUMN_LABELS.get(c, c.replace("_", " ").title()) for c in cols if c in df.columns}
    return df[list(mapping.keys())].rename(columns=mapping)


def display_table(
    df: pd.DataFrame,
    columns: list[str] | None = None,
    round_cols: int | None = 1,
    hide_index: bool = True,
) -> None:
    view = df.copy()
    if columns:
        view = view[[c for c in columns if c in view.columns]]
    if round_cols is not None:
        num = view.select_dtypes(include="number").columns
        view[num] = view[num].round(round_cols)
    view = rename_columns_de(view)
    st.dataframe(view, width="stretch", hide_index=hide_index)
