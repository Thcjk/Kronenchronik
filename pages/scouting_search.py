import streamlit as st

from analytics.similarity import find_similar_players
from components.cards import empty_state, player_card, result_banner, section_header
from components.filters import scouting_search_filters
from components.search_presets import PRESET_LABELS, apply_search_preset
from components.tables import display_table
from components.theme import apply_theme, page_header
from database.db import get_connection
from database.shortlists import add_to_shortlist
from utils.data_service import get_scouting_data, refresh_data
from utils.formatters import format_currency
from utils.pages import page_path

st.set_page_config(page_title="Scouting-Suche", layout="wide")
apply_theme()
df = get_scouting_data()

page_header("Scouting-Suche", "Presets · Filter · Spielerkarten · Shortlist")

section_header("Preset-Suchen", "Schnellfilter für typische Scouting-Szenarien")
preset = st.selectbox("Preset", PRESET_LABELS, label_visibility="collapsed")
base = apply_search_preset(df, preset)
filtered = scouting_search_filters(base)

if preset != "Keine Vorgabe":
    result_banner(len(filtered), f"Treffer · Preset: {preset}")
else:
    result_banner(len(filtered))

sort_options = {
    "Gesamt-Score": "overall_score",
    "Marktwert": "market_value_eur",
    "Alter": "age",
    "Playmaking-Score": "playmaking_score",
    "Preis-Leistung": "value_score",
}
sort_label = st.selectbox("Sortierung", list(sort_options.keys()))
sort_col = sort_options[sort_label]
if sort_col in filtered.columns and not filtered.empty:
    ascending = sort_col in ("age", "market_value_eur")
    filtered = filtered.sort_values(sort_col, ascending=ascending)

display_cols = [
    "name", "age", "nationality", "position", "team", "league", "country",
    "minutes", "shot_pct", "goals", "assists", "playmaking_score",
    "overall_score", "value_score", "market_value_eur", "contract_until",
]

if filtered.empty:
    empty_state("Keine Treffer", "Passe Preset oder Filter an.")
else:
    section_header("Ergebnisse – Spielerkarten", f"Top 8 nach {sort_label}")
    top = filtered.head(8)
    cols = st.columns(4)
    for i, (_, row) in enumerate(top.iterrows()):
        with cols[i % 4]:
            player_card(
                row["name"],
                f"{row['position']} · {row['team']} · {row['league']}",
                row["overall_score"],
                [
                    (format_currency(row["market_value_eur"]), ""),
                    (f"PM {row['playmaking_score']:.0f}", "amber"),
                    (f"Value {row.get('value_score', 0):.0f}", "green"),
                ],
            )
            bc1, bc2, bc3 = st.columns(3)
            with bc1:
                if st.button("Profil", key=f"prof_{row['name']}", width="stretch"):
                    st.session_state["profile_player"] = row["name"]
                    st.switch_page(page_path("player_profile"))
            with bc2:
                if st.button("Vergleich", key=f"cmp_{row['name']}", width="stretch"):
                    existing = st.session_state.get("compare_players", [])
                    if row["name"] not in existing:
                        existing = (existing + [row["name"]])[-4:]
                    st.session_state["compare_players"] = existing
                    st.switch_page(page_path("player_compare"))
            with bc3:
                if st.button("Shortlist", key=f"sl_{row['name']}", width="stretch"):
                    st.session_state["shortlist_player"] = row["name"]

    if st.session_state.get("shortlist_player"):
        pname = st.session_state["shortlist_player"]
        conn = get_connection()
        lists = conn.execute("SELECT id, name FROM shortlists ORDER BY name").fetchall()
        sl = st.selectbox("Shortlist wählen", [r["name"] for r in lists], key="quick_sl")
        if st.button(f"{pname} hinzufügen", type="primary"):
            list_id = next(r["id"] for r in lists if r["name"] == sl)
            player_id = int(df[df["name"] == pname].iloc[0]["id"])
            add_to_shortlist(list_id, player_id, status="Interessant", notes="Scouting-Suche")
            del st.session_state["shortlist_player"]
            conn.close()
            refresh_data()
            st.success(f"{pname} zu '{sl}' hinzugefügt.")
        else:
            conn.close()

    section_header("Ergebnisse – Tabelle")
    view = filtered[display_cols].copy()
    view["market_value_eur"] = view["market_value_eur"].apply(format_currency)
    display_table(view)

    section_header("Export")
    st.download_button(
        "Ergebnisse als CSV exportieren",
        filtered.to_csv(index=False).encode("utf-8"),
        "scouting_ergebnisse.csv",
        "text/csv",
        type="primary",
    )

    section_header("Ähnlichkeitssuche", "Top 20 · Cosine Similarity")
    player = st.selectbox("Referenzspieler", sorted(filtered["name"].unique()))
    similar = find_similar_players(df, player, top_n=20)
    if not similar.empty:
        display_table(
            similar[
                ["name", "team", "league", "position", "similarity_pct", "overall_score", "common_traits", "differences"]
            ],
        )
