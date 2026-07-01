"""Search preset definitions – apply on top of manual filters."""

from __future__ import annotations

import pandas as pd


PRESET_LABELS = [
    "Keine Vorgabe",
    "Top Talente U23",
    "Günstige Transferziele",
    "Rückraum-Shooter",
    "Spielmacher",
    "Defensive Spezialisten",
    "Top Torhüter",
    "Vertragsende bald",
    "Best Value Players",
]


def apply_search_preset(df: pd.DataFrame, preset: str) -> pd.DataFrame:
    if preset == "Keine Vorgabe" or not preset:
        return df.copy()

    result = df.copy()

    if preset == "Top Talente U23":
        return result[(result["age"] <= 23) & (result["potential_score"] >= 65)]

    if preset == "Günstige Transferziele":
        return result[
            (result["overall_score"] >= 65)
            & (result["market_value_eur"] <= 300_000)
            & (result["role"] == "Feld")
        ]

    if preset == "Rückraum-Shooter":
        return result[
            (result["position"].isin(["RR", "RL", "RM"]))
            & (result["finishing_score"] >= 65)
            & (result["role"] == "Feld")
        ]

    if preset == "Spielmacher":
        return result[(result["playmaking_score"] >= 70) & (result["role"] == "Feld")]

    if preset == "Defensive Spezialisten":
        return result[(result["defensive_score"] >= 70) & (result["role"] == "Feld")]

    if preset == "Top Torhüter":
        tw = result[result["role"] == "TW"]
        if tw.empty:
            return tw
        return tw.nlargest(min(20, len(tw)), "goalkeeper_score")

    if preset == "Vertragsende bald":
        return result[result["contract_until"].astype(str).str.startswith("2026")]

    if preset == "Best Value Players":
        return result[result["value_score"] >= 70]

    return result
