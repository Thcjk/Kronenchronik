"""Professional dark theme – layout, sidebar, buttons, tables."""

from __future__ import annotations

import streamlit as st

BRAND = "Handball Scout Pro"
ACCENT = "#3b82f6"
ACCENT_SOFT = "#1e3a5f"
SUCCESS = "#22c55e"
WARNING = "#f59e0b"
DANGER = "#ef4444"


def apply_theme() -> None:
    st.markdown(
        f"""
        <style>
        /* ── Base & spacing ── */
        .stApp {{
            background: #0a0e14;
            color: #e2e8f0;
        }}
        .block-container {{
            padding-top: 1.25rem !important;
            padding-bottom: 2rem !important;
            max-width: 96rem !important;
        }}
        header[data-testid="stHeader"] {{
            background: transparent;
        }}
        #MainMenu, footer {{ visibility: hidden; }}

        /* ── Typography ── */
        h1 {{ font-size: 1.75rem !important; font-weight: 700 !important; letter-spacing: -0.02em; margin-bottom: 0.15rem !important; }}
        h2, h3 {{ font-weight: 600 !important; letter-spacing: -0.01em; }}
        .page-subtitle {{ color: #94a3b8; font-size: 0.95rem; margin: 0 0 1.25rem 0; }}

        /* ── Sidebar ── */
        [data-testid="stSidebar"] {{
            background: linear-gradient(180deg, #070b10 0%, #0d1219 100%);
            border-right: 1px solid #1e293b;
        }}
        [data-testid="stSidebar"] > div:first-child {{
            padding-top: 0.75rem;
        }}
        [data-testid="stSidebarNav"] {{
            padding-top: 0.5rem;
        }}
        [data-testid="stSidebarNav"] ul {{
            gap: 2px;
        }}
        [data-testid="stSidebarNav"] a {{
            border-radius: 8px !important;
            padding: 0.45rem 0.75rem !important;
            font-size: 0.875rem !important;
            font-weight: 500 !important;
            color: #94a3b8 !important;
            border: 1px solid transparent !important;
        }}
        [data-testid="stSidebarNav"] a:hover {{
            background: #1e293b !important;
            color: #f1f5f9 !important;
        }}
        [data-testid="stSidebarNav"] a[aria-current="page"] {{
            background: {ACCENT_SOFT} !important;
            color: #60a5fa !important;
            border-color: #2563eb !important;
            font-weight: 600 !important;
        }}
        [data-testid="stSidebarNav"] span {{
            color: #64748b !important;
            font-size: 0.7rem !important;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 600 !important;
        }}

        /* ── KPI cards (native metric override) ── */
        [data-testid="stMetric"] {{
            background: linear-gradient(145deg, #111827 0%, #0f172a 100%);
            border: 1px solid #1e293b;
            border-radius: 10px;
            padding: 0.85rem 1rem !important;
            box-shadow: 0 1px 2px rgba(0,0,0,.35);
        }}
        [data-testid="stMetricLabel"] {{
            color: #94a3b8 !important;
            font-size: 0.75rem !important;
            font-weight: 600 !important;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }}
        [data-testid="stMetricValue"] {{
            color: #f8fafc !important;
            font-size: 1.5rem !important;
            font-weight: 700 !important;
        }}
        [data-testid="stMetricDelta"] {{
            font-size: 0.75rem !important;
        }}

        /* ── Custom scout cards ── */
        .scout-kpi {{
            background: linear-gradient(145deg, #111827 0%, #0f172a 100%);
            border: 1px solid #1e293b;
            border-left: 3px solid {ACCENT};
            border-radius: 10px;
            padding: 1rem 1.1rem;
            margin-bottom: 0.5rem;
            min-height: 96px;
        }}
        .scout-kpi.accent-green {{ border-left-color: {SUCCESS}; }}
        .scout-kpi.accent-amber {{ border-left-color: {WARNING}; }}
        .scout-kpi.accent-red {{ border-left-color: {DANGER}; }}
        .scout-kpi-label {{
            color: #94a3b8;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.35rem;
        }}
        .scout-kpi-value {{
            color: #f8fafc;
            font-size: 1.65rem;
            font-weight: 700;
            line-height: 1.1;
        }}
        .scout-kpi-hint {{
            color: #64748b;
            font-size: 0.78rem;
            margin-top: 0.35rem;
        }}

        .scout-player-card {{
            background: #111827;
            border: 1px solid #1e293b;
            border-radius: 10px;
            padding: 0.9rem 1rem;
            margin-bottom: 0.65rem;
        }}
        .scout-player-card .name {{
            color: #f1f5f9;
            font-weight: 600;
            font-size: 0.95rem;
        }}
        .scout-player-card .meta {{
            color: #64748b;
            font-size: 0.8rem;
            margin-top: 0.2rem;
        }}
        .scout-player-card .scores {{
            display: flex;
            gap: 0.75rem;
            margin-top: 0.55rem;
            flex-wrap: wrap;
        }}
        .scout-badge {{
            display: inline-block;
            padding: 0.15rem 0.5rem;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 600;
            background: #1e293b;
            color: #93c5fd;
            border: 1px solid #334155;
        }}
        .scout-badge.green {{ background: #14532d; color: #86efac; border-color: #166534; }}
        .scout-badge.amber {{ background: #422006; color: #fcd34d; border-color: #854d0e; }}

        .compare-player-card {{
            background: linear-gradient(145deg, #111827 0%, #0f172a 100%);
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 1rem 1.1rem;
            margin-bottom: 0.65rem;
            min-height: 130px;
        }}
        .compare-player-card .cpc-name {{
            color: #f8fafc;
            font-weight: 700;
            font-size: 1rem;
        }}
        .compare-player-card .cpc-meta {{
            color: #64748b;
            font-size: 0.78rem;
            margin-top: 0.25rem;
        }}
        .compare-player-card .cpc-market {{
            color: #94a3b8;
            font-size: 0.82rem;
            margin-top: 0.35rem;
        }}
        .compare-player-card .cpc-scores {{
            display: flex;
            gap: 0.5rem;
            margin-top: 0.65rem;
            flex-wrap: wrap;
        }}
        .score-tier {{
            display: inline-block;
            padding: 0.2rem 0.55rem;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 700;
            border: 1px solid transparent;
        }}
        .score-tier.elite {{ background: #312e81; color: #a5b4fc; border-color: #4338ca; }}
        .score-tier.great {{ background: #14532d; color: #86efac; border-color: #166534; }}
        .score-tier.good {{ background: #1e3a5f; color: #93c5fd; border-color: #2563eb; }}
        .score-tier.avg {{ background: #422006; color: #fcd34d; border-color: #854d0e; }}
        .score-tier.risk {{ background: #450a0a; color: #fca5a5; border-color: #991b1b; }}
        .score-tier.transfer {{ background: #1e293b; color: #cbd5e1; border-color: #334155; }}

        .section-header {{
            margin: 1.5rem 0 0.85rem 0;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #1e293b;
        }}
        .section-header h3 {{
            margin: 0 !important;
            font-size: 1.05rem !important;
            color: #f1f5f9 !important;
        }}
        .section-header p {{
            margin: 0.2rem 0 0 0;
            color: #64748b;
            font-size: 0.82rem;
        }}

        .empty-state {{
            text-align: center;
            padding: 2.5rem 1.5rem;
            background: #111827;
            border: 1px dashed #334155;
            border-radius: 12px;
            color: #94a3b8;
        }}
        .empty-state strong {{ color: #e2e8f0; display: block; margin-bottom: 0.35rem; font-size: 1rem; }}

        .filter-panel {{
            background: #111827;
            border: 1px solid #1e293b;
            border-radius: 10px;
            padding: 0.25rem 0.75rem 0.75rem;
            margin-bottom: 1rem;
        }}

        /* ── Expanders (filter groups) ── */
        div[data-testid="stExpander"] {{
            background: #111827;
            border: 1px solid #1e293b;
            border-radius: 10px;
            overflow: hidden;
        }}
        div[data-testid="stExpander"] summary {{
            font-weight: 600 !important;
            color: #e2e8f0 !important;
            font-size: 0.875rem !important;
        }}

        /* ── Buttons ── */
        .stButton > button {{
            border-radius: 8px !important;
            font-weight: 600 !important;
            font-size: 0.875rem !important;
            border: 1px solid #334155 !important;
            background: #1e293b !important;
            color: #f1f5f9 !important;
            padding: 0.45rem 1rem !important;
            transition: all 0.15s ease;
        }}
        .stButton > button:hover {{
            border-color: #3b82f6 !important;
            background: #1e3a5f !important;
            color: #fff !important;
        }}
        .stButton > button[kind="primary"] {{
            background: {ACCENT} !important;
            border-color: #2563eb !important;
            color: #fff !important;
        }}

        /* ── Dataframes ── */
        [data-testid="stDataFrame"] {{
            border: 1px solid #1e293b;
            border-radius: 10px;
            overflow: hidden;
        }}
        [data-testid="stDataFrame"] div[data-testid="glideDataEditor"] {{
            font-size: 0.85rem;
        }}

        /* ── Alerts ── */
        [data-testid="stAlert"] {{
            border-radius: 10px !important;
            border: 1px solid #1e293b !important;
        }}

        /* ── Select / inputs ── */
        [data-testid="stSelectbox"], [data-testid="stMultiSelect"] {{
            margin-bottom: 0.25rem;
        }}
        label[data-testid="stWidgetLabel"] {{
            font-size: 0.8rem !important;
            font-weight: 600 !important;
            color: #94a3b8 !important;
        }}

        hr {{
            border-color: #1e293b !important;
            margin: 1.25rem 0 !important;
        }}

        /* ── Tabs ── */
        [data-testid="stTabs"] button {{
            font-weight: 600 !important;
            font-size: 0.85rem !important;
            color: #94a3b8 !important;
        }}
        [data-testid="stTabs"] button[aria-selected="true"] {{
            color: #60a5fa !important;
            border-bottom-color: #3b82f6 !important;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )
    _render_sidebar_brand()


def _render_sidebar_brand() -> None:
    with st.sidebar:
        st.markdown(
            f"""
            <div style="padding:0.5rem 0.25rem 1rem 0.25rem;border-bottom:1px solid #1e293b;margin-bottom:0.75rem;">
                <div style="font-size:0.65rem;font-weight:700;color:#64748b;
                    text-transform:uppercase;letter-spacing:0.12em;">European Scouting</div>
                <div style="font-size:1.05rem;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">
                    {BRAND}
                </div>
                <div style="font-size:0.72rem;color:#475569;margin-top:0.15rem;">HBL · LNH · EHF · Europa</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def page_header(title: str, subtitle: str = "") -> None:
    st.markdown(f"## {title}")
    if subtitle:
        st.markdown(f'<p class="page-subtitle">{subtitle}</p>', unsafe_allow_html=True)
