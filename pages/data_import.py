import streamlit as st

from analytics.metrics import enrich_player_dataframe
from analytics.scoring import compute_scores
from components.cards import insight_panel, kpi_row, section_header
from components.tables import display_table
from components.theme import apply_theme, page_header
from database.db import get_connection, import_players_dataframe, init_database, load_players_dataframe
from utils.csv_import import validate_import
from utils.data_service import refresh_data
from utils.data_validation import analyze_data_quality

st.set_page_config(page_title="Datenimport", layout="wide")
apply_theme()
init_database()

page_header("Datenimport", "CSV importieren · Datenqualität · Scores berechnen")

tab_import, tab_quality = st.tabs(["CSV Import", "Datenbank-Qualität"])

with tab_quality:
    section_header("Aktuelle Datenbank", "Qualitätsprüfung der geladenen Spielerdaten")
    db_df = load_players_dataframe()
    db_report = analyze_data_quality(db_df)

    kpi_row([
        ("Spieler", str(db_report.total_rows), "in DB", "blue"),
        ("Spalten", str(db_report.total_columns), "erkannt", "blue"),
        ("Datenqualität", f"{db_report.quality_pct:.0f} %", "Gesamtscore", "green" if db_report.quality_pct >= 80 else "amber"),
        ("Duplikate", str(len(db_report.duplicate_players)), "Name+Team", "amber" if db_report.duplicate_players else "blue"),
        ("Warnungen", str(len(db_report.warnings)), "Hinweise", "amber" if db_report.warnings else "green"),
    ])

    q1, q2 = st.columns(2)
    with q1:
        section_header("Erkannte Spalten", f"{len(db_report.detected_columns)} Spalten")
        st.code(", ".join(db_report.detected_columns), language="text")
        if db_report.missing_required:
            st.error(f"Fehlende Pflichtspalten: {', '.join(db_report.missing_required)}")
    with q2:
        section_header("Score-Berechnung")
        st.markdown("**Zuverlässig berechenbar:**")
        for s in db_report.scores_ok:
            st.markdown(f"- :green[{s}]")
        if db_report.scores_uncertain:
            st.markdown("**Unsicher (fehlende Daten):**")
            for s in db_report.scores_uncertain:
                st.markdown(f"- :orange[{s}]")

    if db_report.null_counts:
        import pandas as pd
        section_header("Fehlende Werte")
        null_df = [{"Spalte": k, "Anzahl": v} for k, v in sorted(db_report.null_counts.items(), key=lambda x: -x[1])]
        display_table(pd.DataFrame(null_df), round_cols=None)

    if db_report.duplicate_players:
        section_header("Doppelte Spieler")
        insight_panel("Duplikate erkannt", ", ".join(db_report.duplicate_players[:15]), "#f59e0b")

    if db_report.invalid_rows:
        section_header("Ungültige Werte")
        for issue in db_report.invalid_rows:
            st.markdown(f"- :red[{issue}]")

    for w in db_report.warnings:
        st.warning(w)

    conn = get_connection()
    last = conn.execute("SELECT filename, rows_imported, imported_at FROM import_log ORDER BY id DESC LIMIT 3").fetchall()
    conn.close()
    if last:
        import pandas as pd
        section_header("Import-Historie")
        display_table(pd.DataFrame([dict(r) for r in last]), round_cols=None)

with tab_import:
    uploaded = st.file_uploader("CSV hochladen", type=["csv"])

    if uploaded:
        import pandas as pd

        raw = pd.read_csv(uploaded)
        upload_report = analyze_data_quality(raw)

        section_header("Datenqualität (Upload)", f"{upload_report.quality_pct:.0f} % vor Import")
        kpi_row([
            ("Zeilen", str(upload_report.total_rows), "hochgeladen", "blue"),
            ("Spalten", str(upload_report.total_columns), "erkannt", "blue"),
            ("Qualität", f"{upload_report.quality_pct:.0f} %", "Bewertung", "green" if upload_report.quality_pct >= 75 else "amber"),
            ("Duplikate", str(len(upload_report.duplicate_players)), "im File", "amber"),
            ("Pflicht fehlt", str(len(upload_report.missing_required)), "Spalten", "red" if upload_report.missing_required else "green"),
        ])

        for w in upload_report.warnings:
            st.warning(w)

        section_header("Vorschau", "Erste 10 Zeilen")
        display_table(raw.head(10), round_cols=None)

        cleaned, missing, warnings = validate_import(raw)
        if missing:
            st.error(f"Import blockiert – Pflichtspalten fehlen: {', '.join(missing)}")
        else:
            if upload_report.duplicate_players:
                st.info(f"Doppelte Spieler im Upload: {', '.join(upload_report.duplicate_players[:10])}")

            cleaned = enrich_player_dataframe(cleaned)
            cleaned = compute_scores(cleaned)

            section_header("Berechnete Kennzahlen (Auszug)", "Pro-60-Werte und Scores")
            preview_cols = [c for c in cleaned.columns if c.endswith("_per_60") or c.endswith("_score")]
            display_table(cleaned[preview_cols[:10]].head(), round_cols=2)

            post_report = analyze_data_quality(cleaned)
            section_header("Scores nach Berechnung")
            c_ok, c_bad = st.columns(2)
            with c_ok:
                st.markdown("**Berechnet:** " + ", ".join(post_report.scores_ok) if post_report.scores_ok else "—")
            with c_bad:
                if post_report.scores_uncertain:
                    st.markdown("**Unsicher:** " + ", ".join(post_report.scores_uncertain))

            if st.button("In Datenbank importieren", type="primary"):
                count = import_players_dataframe(cleaned, uploaded.name)
                refresh_data()
                st.success(f"{count} Spieler importiert · Datenqualität {upload_report.quality_pct:.0f} %")

    st.markdown("---")
    section_header("Erwartete Spalten")
    st.code(
        """Pflicht: name, team, league, age, position, minutes
Optional: goals, shots, assists, turnovers, steals, blocks, saves, save_pct,
market_value_eur, nationality, country, role, contract_until, height_cm, ...""",
        language="text",
    )

    if st.button("Datenbank aus CSV neu laden"):
        init_database(force_reseed=True)
        refresh_data()
        st.success("Datenbank neu initialisiert.")
