import pandas as pd
import streamlit as st

from components.cards import empty_state, kpi_row, section_header
from components.tables import display_table
from components.theme import apply_theme, page_header
from database.db import get_connection, init_database
from database.shortlists import add_to_shortlist, remove_shortlist_item, update_shortlist_item
from models.shortlist_status import STATUS_COLORS, STATUS_OPTIONS, STATUS_SORT
from utils.data_service import get_scouting_data, refresh_data
from utils.formatters import format_currency
from utils.pages import page_path

st.set_page_config(page_title="Shortlists", layout="wide")
apply_theme()
df = get_scouting_data()
init_database()

page_header("Shortlists", "Status · Priorität · Notizen · Bewertung · Export")

conn = get_connection()
lists = conn.execute("SELECT id, name FROM shortlists ORDER BY name").fetchall()
list_names = [r["name"] for r in lists]

c1, c2, c3 = st.columns([2, 1, 1])
with c1:
    selected = st.selectbox("Shortlist", list_names)
with c2:
    new_list = st.text_input("Neue Liste", placeholder="Listenname…")
with c3:
    if st.button("Liste erstellen", width="stretch") and new_list.strip():
        from datetime import datetime
        conn.execute(
            "INSERT OR IGNORE INTO shortlists (name, created_at) VALUES (?, ?)",
            (new_list.strip(), datetime.now().isoformat()),
        )
        conn.commit()
        st.rerun()

list_id = next(r["id"] for r in lists if r["name"] == selected)
items = conn.execute(
    """
    SELECT si.id, si.priority, si.status, si.rating, si.notes,
           p.name, p.team, p.position, p.league, p.id AS player_id
    FROM shortlist_items si
    JOIN players p ON p.id = si.player_id
    WHERE si.shortlist_id = ?
    ORDER BY si.priority, si.rating DESC
    """,
    (list_id,),
).fetchall()
conn.close()

scores = df[["id", "overall_score", "transfer_score", "value_score", "market_value_eur"]].rename(columns={"id": "player_id"})

if items:
    item_df = pd.DataFrame([dict(r) for r in items])
    item_df = item_df.merge(scores, on="player_id", how="left")
    item_df["status"] = item_df["status"].fillna("Beobachten")
    item_df["_sort"] = item_df["status"].map(STATUS_SORT).fillna(99)
    item_df = item_df.sort_values(["_sort", "rating"], ascending=[True, False])

    status_counts = item_df["status"].value_counts()
    kpi_row([
        ("Spieler", str(len(item_df)), selected, "blue"),
        ("Verpflichten", str(status_counts.get("Verpflichten", 0)), "Top-Priorität", "green"),
        ("Priorität", str(status_counts.get("Priorität", 0)), "Fokus", "amber"),
        ("Ø Bewertung", f"{item_df['rating'].mean():.1f}", "von 10", "blue"),
    ])

    section_header(f"Liste: {selected}", f"{len(item_df)} Spieler · farblich nach Status")
    for _, row in item_df.iterrows():
        color = STATUS_COLORS.get(str(row["status"]), "#64748b")
        st.markdown(
            f"""
            <div style="background:#111827;border:1px solid #1e293b;border-left:4px solid {color};
                border-radius:10px;padding:0.85rem 1rem;margin-bottom:0.5rem;">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div>
                        <div style="font-weight:600;color:#f1f5f9;">{row['name']}</div>
                        <div style="color:#64748b;font-size:0.8rem;">{row['team']} · {row['position']} · {row.get('league', '')}</div>
                    </div>
                    <span style="background:{color}22;color:{color};border:1px solid {color};
                        padding:0.15rem 0.55rem;border-radius:999px;font-size:0.72rem;font-weight:700;">{row['status']}</span>
                </div>
                <div style="margin-top:0.45rem;font-size:0.8rem;color:#94a3b8;">
                    Prio {int(row['priority'])} · Bewertung {row['rating']:.1f} · Score {row.get('overall_score', 0):.0f} ·
                    {format_currency(row.get('market_value_eur', 0))}
                    {(' · ' + str(row['notes'])) if row.get('notes') else ''}
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    section_header("Spieler bearbeiten")
    edit_name = st.selectbox("Spieler wählen", item_df["name"].tolist(), key="edit_player")
    edit_row = item_df[item_df["name"] == edit_name].iloc[0]
    ec1, ec2, ec3, ec4 = st.columns(4)
    with ec1:
        new_status = st.selectbox(
            "Status", STATUS_OPTIONS,
            index=STATUS_OPTIONS.index(str(edit_row["status"])) if str(edit_row["status"]) in STATUS_OPTIONS else 0,
        )
    with ec2:
        new_prio = st.selectbox("Priorität", [1, 2, 3, 4, 5], index=int(edit_row["priority"]) - 1)
    with ec3:
        new_rating = st.slider("Bewertung", 0.0, 10.0, float(edit_row["rating"]), 0.5)
    with ec4:
        new_notes = st.text_input("Notizen", str(edit_row.get("notes") or ""))

    bc1, bc2, bc3 = st.columns(3)
    with bc1:
        if st.button("Änderungen speichern", type="primary"):
            update_shortlist_item(int(edit_row["id"]), status=new_status, priority=new_prio, rating=new_rating, notes=new_notes)
            refresh_data()
            st.success(f"{edit_name} aktualisiert.")
            st.rerun()
    with bc2:
        if st.button("Zum Profil"):
            st.session_state["profile_player"] = edit_name
            st.switch_page(page_path("player_profile"))
    with bc3:
        if st.button("Entfernen"):
            remove_shortlist_item(int(edit_row["id"]))
            refresh_data()
            st.success(f"{edit_name} entfernt.")
            st.rerun()

    section_header("Tabelle & Export")
    export_df = item_df[["name", "team", "position", "league", "status", "priority", "rating", "overall_score", "transfer_score", "value_score", "notes"]].copy()
    display_table(export_df)
    st.download_button(
        "Shortlist als CSV exportieren",
        export_df.to_csv(index=False).encode("utf-8-sig"),
        f"shortlist_{selected.replace(' ', '_')}.csv",
        "text/csv",
        type="primary",
    )
else:
    empty_state("Shortlist leer", "Füge Spieler über das Formular oder die Scouting-Suche hinzu.")

section_header("Spieler hinzufügen")
ac1, ac2, ac3, ac4, ac5 = st.columns(5)
with ac1:
    player_name = st.selectbox("Spieler", sorted(df["name"].unique()))
with ac2:
    add_status = st.selectbox("Status", STATUS_OPTIONS, index=0)
with ac3:
    priority = st.selectbox("Priorität", [1, 2, 3, 4, 5], index=2)
with ac4:
    rating = st.slider("Bewertung", 0.0, 10.0, 7.0, 0.5)
with ac5:
    notes = st.text_input("Notizen", "")

if st.button("Zur Shortlist hinzufügen", type="primary"):
    player_id = int(df[df["name"] == player_name].iloc[0]["id"])
    add_to_shortlist(list_id, player_id, status=add_status, priority=priority, rating=rating, notes=notes)
    refresh_data()
    st.success(f"{player_name} zu '{selected}' hinzugefügt ({add_status}).")
    st.rerun()
