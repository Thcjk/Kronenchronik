"""Reusable scouting search filters – UI grouped, logic unchanged."""

from __future__ import annotations

import pandas as pd
import streamlit as st

from components.cards import section_header
from models.leagues import league_display_name


def scouting_search_filters(df: pd.DataFrame) -> pd.DataFrame:
    section_header("Filter", "Kombiniere Kriterien für europaweite Spielersuche")

    with st.expander("Basisdaten", expanded=True):
        c1, c2, c3 = st.columns(3)
        with c1:
            positions = st.multiselect("Position", sorted(df["position"].unique()), default=None)
            roles = st.multiselect("Typ", sorted(df["role"].unique()), default=None)
        with c2:
            nationalities = st.multiselect("Nationalität", sorted(df["nationality"].unique()), default=None)
            countries = st.multiselect("Land", sorted(df["country"].unique()), default=None)
        with c3:
            league_codes = sorted(df["league"].unique())
            league_labels = {c: f"{league_display_name(c)} ({c})" for c in league_codes}
            leagues = st.multiselect(
                "Liga",
                league_codes,
                default=None,
                format_func=lambda c: league_labels.get(c, c),
            )
            teams = st.multiselect("Verein", sorted(df["team"].unique()), default=None)

    with st.expander("Leistung", expanded=False):
        c1, c2, c3 = st.columns(3)
        with c1:
            age = st.slider("Alter", int(df["age"].min()), int(df["age"].max()), (20, 25))
        with c2:
            minutes = st.slider(
                "Minuten (min)",
                int(df["minutes"].min()),
                int(df["minutes"].max()),
                (500, int(df["minutes"].max())),
            )
        with c3:
            height = st.slider(
                "Größe (cm)",
                int(df["height_cm"].min()),
                int(df["height_cm"].max()),
                (int(df["height_cm"].min()), int(df["height_cm"].max())),
            )
        shot_pct_min = st.number_input("Wurfquote min. (%)", 0.0, 100.0, 58.0)

    with st.expander("Vertrag & Marktwert", expanded=False):
        market_max = st.number_input("Marktwert max. (€)", 0, 2_000_000, 250_000, step=10_000)

    with st.expander("Advanced Scores", expanded=False):
        playmaking_min = st.slider("Playmaking-Score min.", 0, 100, 60)

    result = df.copy()
    if positions:
        result = result[result["position"].isin(positions)]
    if roles:
        result = result[result["role"].isin(roles)]
    if nationalities:
        result = result[result["nationality"].isin(nationalities)]
    if leagues:
        result = result[result["league"].isin(leagues)]
    if countries:
        result = result[result["country"].isin(countries)]
    if teams:
        result = result[result["team"].isin(teams)]

    result = result[
        result["age"].between(age[0], age[1])
        & (result["minutes"] >= minutes[0])
        & result["height_cm"].between(height[0], height[1])
        & (result["shot_pct"] >= shot_pct_min)
        & (result["playmaking_score"] >= playmaking_min)
        & (result["market_value_eur"] <= market_max)
    ]
    return result
