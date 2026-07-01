"""Central page registry for st.navigation (Streamlit 1.58+).

Paths are relative to the project root (where app.py lives).
"""

from __future__ import annotations

import streamlit as st

# Relative to app.py – required by st.Page on Windows
PAGE_FILES = {
    "dashboard": "pages/dashboard.py",
    "scouting_search": "pages/scouting_search.py",
    "player_profile": "pages/player_profile.py",
    "player_compare": "pages/player_compare.py",
    "shortlists": "pages/shortlists.py",
    "reports": "pages/reports.py",
    "data_import": "pages/data_import.py",
    "leagues": "pages/leagues.py",
}


def build_navigation() -> st.navigation:
    return st.navigation(
        {
            "Start": [
                st.Page("Home.py", title="Start", default=True),
            ],
            "Scouting": [
                st.Page(PAGE_FILES["dashboard"], title="Dashboard"),
                st.Page(PAGE_FILES["scouting_search"], title="Scouting-Suche"),
                st.Page(PAGE_FILES["player_profile"], title="Spielerprofil"),
                st.Page(PAGE_FILES["player_compare"], title="Spielervergleich"),
                st.Page(PAGE_FILES["shortlists"], title="Shortlists"),
                st.Page(PAGE_FILES["reports"], title="Scoutingberichte"),
            ],
            "Daten": [
                st.Page(PAGE_FILES["data_import"], title="Datenimport"),
                st.Page(PAGE_FILES["leagues"], title="Europäische Ligen"),
            ],
        }
    )
