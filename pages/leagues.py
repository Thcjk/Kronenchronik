import pandas as pd
import streamlit as st

from components.cards import kpi_row, section_header
from components.tables import display_table
from components.theme import apply_theme, page_header
from models.leagues import EUROPEAN_LEAGUES, domestic_leagues, international_leagues
from utils.data_service import get_scouting_data

st.set_page_config(page_title="Europäische Ligen", layout="wide")
apply_theme()
df = get_scouting_data()

page_header("Europäische Ligen", "Nationale Ligen & EHF-Wettbewerbe")

kpi_row([
    ("Ligen registriert", str(len(EUROPEAN_LEAGUES)), "im System", "blue"),
    ("Mit Spielern", str(df["league"].nunique()), "aktiv befüllt", "green"),
    ("Länder", str(df["country"].nunique()), "abgedeckt", "amber"),
    ("International", str(len([l for l in EUROPEAN_LEAGUES.values() if l.competition_type == "international"])), "EHF", "blue"),
])

tab1, tab2, tab3 = st.tabs(["Nationale Ligen", "EHF-Wettbewerbe", "Spieler pro Land"])

with tab1:
    section_header("Nationale Top-Ligen")
    rows = [
        {"Code": l.code, "Liga": l.name, "Land": l.country, "Region": l.region, "Spieler": len(df[df["league"] == l.code])}
        for l in sorted(domestic_leagues(), key=lambda x: x.country)
    ]
    display_table(pd.DataFrame(rows), round_cols=None)

with tab2:
    section_header("Internationale Wettbewerbe")
    rows = [
        {"Code": l.code, "Wettbewerb": l.name, "Spieler": len(df[df["league"] == l.code])}
        for l in international_leagues()
    ]
    display_table(pd.DataFrame(rows), round_cols=None)

with tab3:
    section_header("Abdeckung nach Land")
    by_country = (
        df.groupby("country")
        .agg(spieler=("name", "count"), ligen=("league", "nunique"), teams=("team", "nunique"))
        .reset_index()
        .sort_values("spieler", ascending=False)
    )
    display_table(by_country.rename(columns={
        "country": "Land", "spieler": "Spieler", "ligen": "Ligen", "teams": "Teams",
    }), round_cols=None)

st.caption(f"{len(EUROPEAN_LEAGUES)} Ligen in models/leagues.py registriert – erweiterbar.")
