import streamlit as st

from analytics.similarity import find_similar_players
from components.cards import insight_panel, recommendation_card, section_header
from components.tables import display_table
from components.theme import apply_theme, page_header
from reports.generator import generate_scouting_report
from utils.data_service import get_scouting_data
from utils.formatters import format_currency

st.set_page_config(page_title="Scoutingberichte", layout="wide")
apply_theme()
df = get_scouting_data()

page_header("Scoutingberichte", "Automatischer Profi-Bericht · Note A/B/C · Markdown-Export")

default = st.session_state.get("profile_player", "")
names = sorted(df["name"].unique())
idx = names.index(default) if default in names else 0
player = st.selectbox("Spieler", names, index=idx)
report = generate_scouting_report(df, player)

grade = report.get("grade", "C")
grade_color = {"A": "#22c55e", "B": "#f59e0b", "C": "#64748b"}.get(grade, "#64748b")
grade_label = {"A": "Verpflichten", "B": "Weiter beobachten", "C": "Nicht priorisieren"}.get(grade, grade)

section_header("Zusammenfassung")
st.markdown(
    f'<div style="background:#111827;border:1px solid #1e293b;border-radius:10px;padding:1rem;color:#cbd5e1;">'
    f'{report["summary"]}</div>',
    unsafe_allow_html=True,
)

r1, r2, r3 = st.columns(3)
with r1:
    recommendation_card("Empfehlung", f"Note {grade}", grade_label, grade_color)
with r2:
    recommendation_card("Rolle", player, report.get("role", "")[:60], "#3b82f6")
with r3:
    p = df[df["name"] == player].iloc[0]
    recommendation_card("Marktwert", format_currency(p["market_value_eur"]), report.get("market_assessment", "")[:50], "#a855f7")

section_header("Rolle & Profil")
st.info(report.get("role", "—"))

col1, col2 = st.columns(2)
with col1:
    section_header("Stärken")
    for item in report["strengths"]:
        st.markdown(f"- :green[{item}]")
with col2:
    section_header("Schwächen")
    for item in report["weaknesses"]:
        st.markdown(f"- :orange[{item}]")

section_header("Risikofaktoren")
for risk in report.get("risk_factors", []):
    insight_panel("Risiko", risk, "#ef4444")

section_header("Statistische Bewertung")
st.info(report["statistical_rating"])

section_header("Scouting-Scores")
st.code(report["scores"], language="text")

section_header("Entwicklungspotenzial")
st.write(report["development"])

section_header("Empfehlung")
st.markdown(
    f'<div style="background:#111827;border-left:4px solid {grade_color};border:1px solid #1e293b;'
    f'border-radius:10px;padding:1rem;color:#e2e8f0;">'
    f'<strong>Note {grade}</strong> – {grade_label}<br><br>{report["recommendation"]}</div>',
    unsafe_allow_html=True,
)

section_header("Ähnliche Spieler")
similar = find_similar_players(df, player, top_n=10)
if not similar.empty:
    display_table(similar[["name", "team", "similarity_pct", "overall_score", "common_traits"]])

section_header("Bericht exportieren")
st.markdown(report.get("markdown", ""))
st.download_button(
    "Bericht als Markdown exportieren",
    report.get("markdown", ""),
    f"bericht_{player.replace(' ', '_')}.md",
    type="primary",
)
st.caption("PDF-Export geplant – siehe reports/pdf_export.py")
