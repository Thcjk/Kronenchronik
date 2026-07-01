import streamlit as st

from components.cards import kpi_row, player_card, section_header
from components.charts import bubble_chart, distribution_bar, scatter_scores
from components.leagues import render_league_overview
from components.tables import display_table
from components.theme import apply_theme, page_header
from database.db import get_connection
from models.leagues import league_display_name
from utils.data_service import get_scouting_data
from utils.formatters import format_currency

st.set_page_config(page_title="Dashboard", layout="wide")
apply_theme()
df = get_scouting_data()

page_header("Dashboard", "KPIs, Highlights, Rankings und Verteilungen")

conn = get_connection()
last_import = conn.execute(
    "SELECT rows_imported, imported_at FROM import_log ORDER BY id DESC LIMIT 1"
).fetchone()
conn.close()

kpi_row([
    ("Spieler gesamt", str(len(df)), "Datenbank", "blue"),
    ("Teams", str(df["team"].nunique()), "Vereine", "blue"),
    ("Ligen", str(df["league"].nunique()), "Wettbewerbe", "green"),
    ("Importiert", str(last_import["rows_imported"] if last_import else 0), "letzter Lauf", "amber"),
    ("Feld / TW", f"{len(df[df.role=='Feld'])} / {len(df[df.role=='TW'])}", "Spielertypen", "blue"),
])

section_header("Datenverteilung", "Spieler nach Position, Liga und Land")
d1, d2, d3 = st.columns(3)
field = df[df["role"] == "Feld"]
with d1:
    st.plotly_chart(distribution_bar(field, "position", "Spieler nach Position"), width="stretch")
with d2:
    league_df = df.copy()
    league_df["liga_name"] = league_df["league"].apply(lambda c: league_display_name(c)[:12])
    st.plotly_chart(distribution_bar(league_df, "liga_name", "Spieler nach Liga"), width="stretch")
with d3:
    st.plotly_chart(distribution_bar(df, "country", "Spieler nach Land"), width="stretch")

section_header("Scouting-Matrix", "Marktwert · Alter · Potenzial · Tore vs. Assists")
m1, m2 = st.columns(2)
with m1:
    st.plotly_chart(bubble_chart(df, "Marktwert · Alter · Gesamt-Score"), width="stretch")
with m2:
    if "potential_score" in df.columns:
        st.plotly_chart(
            scatter_scores(field, "age", "potential_score", "overall_score", "Alter vs. Potenzial"),
            width="stretch",
        )

if "goals_per_60" in field.columns and "assists_per_60" in field.columns:
    st.plotly_chart(
        scatter_scores(field, "goals_per_60", "assists_per_60", "overall_score", "Tore/60 vs. Assists/60"),
        width="stretch",
    )

left, right = st.columns(2)
with left:
    section_header("Top Performer", "Top 10 nach Gesamt-Score")
    top10 = df.nlargest(10, "overall_score")
    for _, row in top10.head(4).iterrows():
        player_card(
            row["name"],
            f"{row['position']} · {row['team']}",
            row["overall_score"],
            [(f"Off {row['offensive_score']:.0f}", "green"), (f"PM {row['playmaking_score']:.0f}", "")],
        )
    display_table(top10[["name", "position", "team", "overall_score", "offensive_score", "playmaking_score"]])

    section_header("Top Talente U23", "≤23 Jahre · hohes Potenzial")
    talents = df[(df["age"] <= 23) & (df["potential_score"] >= 65)].nlargest(8, "potential_score")
    display_table(talents[["name", "age", "position", "team", "potential_score", "overall_score"]])

with right:
    section_header("Transferkandidaten", "Top-Score · Marktwert ≤300k €")
    transfers = df[
        (df["overall_score"] >= 65) & (df["market_value_eur"] <= 300_000) & (df["role"] == "Feld")
    ].nlargest(8, "overall_score").copy()
    transfers["market_value_eur"] = transfers["market_value_eur"].apply(format_currency)
    display_table(transfers[["name", "team", "overall_score", "market_value_eur", "contract_until"]])

    section_header("Best Value", "Höchster Preis-Leistungs-Score")
    if "value_score" in df.columns:
        display_table(
            df.nlargest(8, "value_score")[
                ["name", "team", "position", "value_score", "overall_score", "market_value_eur"]
            ],
        )

section_header("Beste Spieler je Position")
positions = sorted(field["position"].unique())
pos_cols = st.columns(min(len(positions), 4))
for i, pos in enumerate(positions):
    top_pos = field[field["position"] == pos].nlargest(3, "overall_score")
    with pos_cols[i % len(pos_cols)]:
        st.markdown(
            f'<div style="background:#111827;border:1px solid #1e293b;border-radius:10px;padding:0.75rem 1rem;">'
            f'<div style="font-weight:600;color:#60a5fa;font-size:0.8rem;margin-bottom:0.5rem;">{pos}</div>',
            unsafe_allow_html=True,
        )
        for _, row in top_pos.iterrows():
            st.markdown(
                f'<div style="color:#e2e8f0;font-size:0.85rem;padding:0.15rem 0;">'
                f'{row["name"]} <span style="color:#64748b;">({row["overall_score"]:.0f})</span></div>',
                unsafe_allow_html=True,
            )
        st.markdown("</div>", unsafe_allow_html=True)

section_header("Statistische Highlights")
h1, h2, h3 = st.columns(3)
h1.metric("Beste Wurfquote", f"{df['shot_pct'].max():.1f} %", df.loc[df["shot_pct"].idxmax(), "name"])
h2.metric("Meiste Assists", int(df["assists"].max()), df.loc[df["assists"].idxmax(), "name"])
h3.metric("Meiste Tore", int(df["goals"].max()), df.loc[df["goals"].idxmax(), "name"])

section_header("Score-Verteilung", "Offensiv vs. Playmaking")
st.plotly_chart(
    scatter_scores(field, "offensive_score", "playmaking_score", "defensive_score", "Offense vs. Playmaking"),
    width="stretch",
)
render_league_overview(df)
