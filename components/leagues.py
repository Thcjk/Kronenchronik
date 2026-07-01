"""League overview UI component."""

from __future__ import annotations

import pandas as pd
import plotly.express as px
import streamlit as st

from models.leagues import EUROPEAN_LEAGUES, league_display_name


def render_league_overview(df: pd.DataFrame) -> None:
    st.subheader("Ligen in Europa")

    league_stats = (
        df.groupby("league")
        .agg(players=("name", "count"), teams=("team", "nunique"), countries=("country", "first"))
        .reset_index()
    )
    league_stats["liga"] = league_stats["league"].apply(league_display_name)
    league_stats["typ"] = league_stats["league"].apply(
        lambda c: EUROPEAN_LEAGUES[c].competition_type if c in EUROPEAN_LEAGUES else "domestic"
    )

    c1, c2 = st.columns([1, 1])
    with c1:
        st.dataframe(
            league_stats.sort_values("players", ascending=False)[
                ["liga", "league", "typ", "players", "teams", "countries"]
            ],
            width="stretch",
            hide_index=True,
        )
    with c2:
        fig = px.bar(
            league_stats.sort_values("players", ascending=True),
            x="players",
            y="liga",
            orientation="h",
            color="typ",
            title="Spieler pro Liga",
            color_discrete_map={"domestic": "#58a6ff", "international": "#3fb950"},
        )
        fig.update_layout(
            paper_bgcolor="#0d1117",
            plot_bgcolor="#161b22",
            font=dict(color="#e6edf3"),
        )
        st.plotly_chart(fig, width="stretch")

    regions = df.copy()
    regions["region"] = regions["league"].apply(
        lambda c: EUROPEAN_LEAGUES[c].region if c in EUROPEAN_LEAGUES else "Europa"
    )
    region_counts = regions.groupby("region")["name"].count().reset_index(name="spieler")
    st.markdown("**Spieler nach Region**")
    st.dataframe(region_counts, width="stretch", hide_index=True)
