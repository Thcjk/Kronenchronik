"""Spielerprofil – Detailseite pro Spieler."""

import streamlit as st

from analytics.insights import PROFILE_SCORES, generate_profile_insights, score_tier
from analytics.similarity import find_similar_players
from components.cards import insight_panel, kpi_row, recommendation_card, section_header
from components.charts import percentile_chart, radar_chart
from components.tables import display_table
from components.theme import apply_theme, page_header
from database.db import get_connection
from database.shortlists import add_to_shortlist
from models.shortlist_status import STATUS_OPTIONS
from utils.data_service import get_scouting_data, refresh_data
from utils.formatters import format_currency
from utils.pages import page_path

st.set_page_config(page_title="Spielerprofil", layout="wide")
apply_theme()
df = get_scouting_data()

page_header("Spielerprofil", "Radar · Perzentile · Ähnliche Spieler · Transferbewertung")

default_player = st.session_state.get("profile_player", "")
names = sorted(df["name"].unique())
default_idx = names.index(default_player) if default_player in names else 0

c_sel, c_actions = st.columns([3, 1])
with c_sel:
    player_name = st.selectbox("Spieler auswählen", names, index=default_idx, label_visibility="collapsed")
with c_actions:
    if st.button("Zum Vergleich", type="primary", width="stretch"):
        existing = st.session_state.get("compare_players", [])
        if player_name not in existing:
            existing = (existing + [player_name])[-4:]
        st.session_state["compare_players"] = existing
        st.session_state["profile_player"] = player_name
        st.switch_page(page_path("player_compare"))

player = df[df["name"] == player_name].iloc[0]
insights = generate_profile_insights(df, player_name)
tier_label, _ = score_tier(player["overall_score"])

st.markdown(
    f"""
    <div style="background:linear-gradient(145deg,#111827,#0f172a);border:1px solid #1e293b;
        border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1rem;">
        <div style="font-size:1.5rem;font-weight:700;color:#f8fafc;">{player_name}</div>
        <div style="color:#94a3b8;margin-top:0.35rem;font-size:0.95rem;">
            {player['team']} · {player.get('league', '')} · {player.get('country', '')} ·
            {player['position']} · {int(player['age'])} Jahre · {player.get('nationality', '')}
        </div>
        <div style="margin-top:0.5rem;color:#64748b;font-size:0.85rem;">
            Vertrag bis {player.get('contract_until', '—')} · {format_currency(player['market_value_eur'])}
            · {int(player.get('minutes', 0))} Min · {tier_label}
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

kpi_row([
    ("Gesamt-Score", f"{player['overall_score']:.0f}", tier_label, "blue"),
    ("Offensive", f"{player['offensive_score']:.0f}", "Angriff", "green"),
    ("Defensive", f"{player['defensive_score']:.0f}", "Defensive", "blue"),
    ("Playmaking", f"{player['playmaking_score']:.0f}", "Spielmacher", "amber"),
    ("Marktwert", format_currency(player["market_value_eur"]), "Transferwert", "green"),
])

section_header("Score-Profil", "Radar und Perzentile im europaweiten Vergleich")
c1, c2 = st.columns(2)
radar_metrics = [m for m in PROFILE_SCORES if m in player.index]
with c1:
    st.plotly_chart(radar_chart(df[df["name"] == player_name], radar_metrics, f"Profil – {player_name}"), width="stretch")
with c2:
    st.plotly_chart(
        percentile_chart(df, player_name, radar_metrics + ["overall_score", "value_score", "transfer_score"]),
        width="stretch",
    )

if insights:
    section_header("Position-Ranking", f"Platz {insights.position_rank} von {insights.position_total} ({insights.position_label})")
    r1, r2, r3 = st.columns(3)
    with r1:
        recommendation_card(
            "Transfer-Empfehlung", f"Note {insights.transfer_grade}", insights.transfer_recommendation,
            "#22c55e" if insights.transfer_grade == "A" else "#f59e0b" if insights.transfer_grade == "B" else "#64748b",
        )
    with r2:
        recommendation_card("Marktwert-Einschätzung", format_currency(player["market_value_eur"]), insights.market_assessment, "#3b82f6")
    with r3:
        recommendation_card("Transfer-Score", f"{player.get('transfer_score', 0):.0f}/100", "Value · Potenzial · Gesamt", "#a855f7")

    col_s, col_w = st.columns(2)
    with col_s:
        section_header("Stärken")
        for s in insights.strengths:
            st.markdown(f"- :green[{s}]")
    with col_w:
        section_header("Schwächen")
        for w in insights.weaknesses:
            st.markdown(f"- :orange[{w}]")

section_header("Leistungsdaten")
stat_cols = [c for c in [
    "minutes", "goals", "assists", "shot_pct", "goals_per_60", "assists_per_60",
    "turnovers", "steals", "blocks", "market_value_eur", "transfer_score", "value_score",
] if c in player.index]
row_df = df[df["name"] == player_name][stat_cols].copy()
if "market_value_eur" in row_df.columns:
    row_df["market_value_eur"] = row_df["market_value_eur"].apply(format_currency)
display_table(row_df)

section_header("Ähnliche Spieler", "Cosine Similarity · gleiche Position")
similar = find_similar_players(df, player_name, top_n=8)
if not similar.empty:
    display_table(similar[["name", "team", "league", "similarity_pct", "overall_score", "market_value_eur", "common_traits"]])
    for _, sim in similar.head(3).iterrows():
        if st.button(f"Profil: {sim['name']}", key=f"sim_{sim['name']}"):
            st.session_state["profile_player"] = sim["name"]
            st.rerun()
else:
    insight_panel("Keine ähnlichen Spieler", "Zu wenig Vergleichsdaten in der Datenbank.", "#64748b")

section_header("Zur Shortlist hinzufügen")
conn = get_connection()
lists = conn.execute("SELECT id, name FROM shortlists ORDER BY name").fetchall()
list_names = [r["name"] for r in lists]
sc1, sc2, sc3, sc4 = st.columns(4)
with sc1:
    sl_name = st.selectbox("Shortlist", list_names, key="profile_sl")
with sc2:
    sl_status = st.selectbox("Status", STATUS_OPTIONS, index=1, key="profile_status")
with sc3:
    sl_prio = st.selectbox("Priorität", [1, 2, 3, 4, 5], index=2, key="profile_prio")
with sc4:
    sl_rating = st.slider("Bewertung", 0.0, 10.0, 7.0, 0.5, key="profile_rating")

if st.button("Zur Shortlist hinzufügen", type="primary"):
    list_id = next(r["id"] for r in lists if r["name"] == sl_name)
    add_to_shortlist(
        list_id, int(player["id"]),
        status=sl_status, priority=sl_prio, rating=sl_rating,
        notes=f"Profil-Scouting {player_name}",
    )
    conn.close()
    refresh_data()
    st.success(f"{player_name} zu '{sl_name}' hinzugefügt ({sl_status}).")
else:
    conn.close()
