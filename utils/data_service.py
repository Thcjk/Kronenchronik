"""Shared data pipeline for all pages."""

from __future__ import annotations

import pandas as pd
import streamlit as st

from analytics.metrics import enrich_player_dataframe
from analytics.scoring import compute_scores
from database.db import init_database, load_players_dataframe


@st.cache_data(ttl=120)
def get_scouting_data() -> pd.DataFrame:
    init_database()
    df = load_players_dataframe()
    df = enrich_player_dataframe(df)
    df = compute_scores(df)
    return df


def refresh_data() -> pd.DataFrame:
    get_scouting_data.clear()
    return get_scouting_data()
