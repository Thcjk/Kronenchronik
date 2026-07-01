import streamlit as st

from analytics.insights import COMPARE_SCORES, generate_compare_insights
from components.cards import (
    compare_player_card,
    empty_state,
    insight_panel,
    recommendation_card,
    section_header,
)
from components.charts import (
    bar_comparison,
    percentile_chart,
    percentile_compare,
    pro60_comparison,
    radar_chart,
    raw_stats_comparison,
)
from components.tables import display_table
from components.theme import apply_theme, page_header
from utils.data_service import get_scouting_data
from utils.formatters import format_currency

st.set_page_config(page_title="Spielervergleich", layout="wide")
apply_theme()
df = get_scouting_data()

page_header("Spielervergleich", "2–4 Spieler · Radar · Scores · Pro-60 · Automatische Analyse")

default_names = st.session_state.get("compare_players", [])

section_header("Spielerauswahl", "Wähle zwei bis vier Spieler für den direkten Vergleich")
col_sel, col_hint = st.columns([3, 1])
with col_sel:
    names = st.multiselect(
        "Spieler",
        sorted(df["name"].unique()),
        default=[n for n in default_names if n in df["name"].values][:4],
        max_selections=4,
        placeholder="Spieler suchen und auswählen…",
        label_visibility="collapsed",
    )
with col_hint:
    st.caption(f"{len(names)}/4 ausgewählt")

if len(names) < 2:
    empty_state(
        "Mindestens 2 Spieler auswählen",
        "Wähle zwei bis vier Spieler aus der Liste, um Radar-Charts, Score-Vergleiche und automatische Empfehlungen zu sehen.",
    )
    st.stop()

compare = df[df["name"].isin(names)].copy()
score_metrics = [m for m in COMPARE_SCORES + ["overall_score", "transfer_score", "value_score"] if m in compare.columns]
radar_metrics = [m for m in COMPARE_SCORES if m in compare.columns]
pro60_metrics = [c for c in [
    "goals_per_60", "assists_per_60", "turnovers_per_60", "steals_per_60", "blocks_per_60",
] if c in compare.columns]
raw_metrics = [c for c in [
    "minutes", "goals", "assists", "shot_pct", "turnovers", "steals", "blocks", "market_value_eur",
] if c in compare.columns]

section_header("Vergleichsübersicht", "Spieler-Karten mit Gesamt- und Transfer-Score")
card_cols = st.columns(len(compare))
for col, (_, row) in zip(card_cols, compare.iterrows()):
    with col:
        compare_player_card(
            row["name"], row["team"], row.get("league", ""), row["position"],
            int(row["age"]), format_currency(row["market_value_eur"]),
            row["overall_score"], row.get("transfer_score", row["overall_score"]),
        )

section_header("Score-Profil", "Radar und Balkendiagramm aller Scouting-Scores")
c_radar, c_bars = st.columns([1, 1])
with c_radar:
    st.plotly_chart(radar_chart(compare, radar_metrics, "Radar – Scouting-Profil"), width="stretch")
with c_bars:
    st.plotly_chart(bar_comparison(compare, radar_metrics, "Score-Vergleich"), width="stretch")

display_table(compare[["name", "team", "position", "age", "league"] + score_metrics])

tab_raw, tab_pro60, tab_pct = st.tabs(["Rohdaten", "Pro-60", "Perzentile"])
with tab_raw:
    section_header("Rohdaten-Vergleich", "Tore, Assists, Wurfquote, Minuten, Marktwert")
    st.plotly_chart(raw_stats_comparison(compare, raw_metrics, "Rohstatistiken"), width="stretch")
    view = compare[["name"] + raw_metrics].copy()
    if "market_value_eur" in view.columns:
        view["market_value_eur"] = view["market_value_eur"].apply(format_currency)
    display_table(view)

with tab_pro60:
    section_header("Pro-60-Vergleich", "Pace-adjusted Leistungskennzahlen")
    if pro60_metrics:
        st.plotly_chart(pro60_comparison(compare, pro60_metrics, "Pro-60 Statistiken"), width="stretch")
        display_table(compare[["name"] + pro60_metrics])
    else:
        empty_state("Keine Pro-60-Daten", "Minuten und Statistikspalten werden für die Berechnung benötigt.")

with tab_pct:
    section_header("Perzentil-Ranking", "Position im europaweiten Spielerfeld")
    st.plotly_chart(
        percentile_compare(df, compare, radar_metrics + ["overall_score", "value_score"], "Perzentile im Vergleich"),
        width="stretch",
    )
    for name in names:
        st.plotly_chart(percentile_chart(df, name, radar_metrics + ["overall_score"]), width="stretch")

section_header("Automatische Analyse", "Stärken, Schwächen und Scouting-Empfehlungen")
insights = generate_compare_insights(compare)
for line in insights.player_lines:
    insight_panel("Spielerprofil", line.replace("**", ""))
if insights.pairwise:
    st.markdown("**Direktvergleich**")
    for line in insights.pairwise:
        st.markdown(f"- {line.replace('**', '')}")

section_header("Empfehlungen", "Automatisch aus Scores abgeleitet")
r1, r2, r3, r4 = st.columns(4)
with r1:
    recommendation_card("Bester Soforthelfer", insights.best_immediate, "Höchster Gesamt-Score", "#22c55e")
with r2:
    recommendation_card("Bester Entwicklungsspieler", insights.best_development, "Höchstes Potenzial", "#3b82f6")
with r3:
    recommendation_card("Bestes Preis-Leistungs-Verhältnis", insights.best_value, "Value Score", "#f59e0b")
with r4:
    recommendation_card("Risikospieler", insights.risk_player, "Niedrigste Ballsicherheit / Score", "#ef4444")

if insights.risk_player:
    risk_row = compare[compare["name"] == insights.risk_player].iloc[0]
    insight_panel(
        "Risikohinweis",
        f"{insights.risk_player} weist im Vergleich die schwächsten Werte bei Ballsicherheit "
        f"({risk_row.get('ball_security_score', 0):.0f}) auf. Genauere Prüfung empfohlen.",
        accent="#ef4444",
    )
