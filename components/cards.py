"""KPI cards, player cards, section headers, empty states."""

from __future__ import annotations

import html

import streamlit as st


def section_header(title: str, subtitle: str = "") -> None:
    sub = f"<p>{html.escape(subtitle)}</p>" if subtitle else ""
    st.markdown(
        f'<div class="section-header"><h3>{html.escape(title)}</h3>{sub}</div>',
        unsafe_allow_html=True,
    )


def kpi_card(label: str, value: str, hint: str = "", accent: str = "blue") -> None:
    cls = {"blue": "", "green": " accent-green", "amber": " accent-amber", "red": " accent-red"}.get(
        accent, ""
    )
    st.markdown(
        f"""
        <div class="scout-kpi{cls}">
            <div class="scout-kpi-label">{html.escape(label)}</div>
            <div class="scout-kpi-value">{html.escape(value)}</div>
            <div class="scout-kpi-hint">{html.escape(hint)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def kpi_row(items: list[tuple[str, str, str, str]]) -> None:
    """Each item: (label, value, hint, accent)."""
    cols = st.columns(len(items))
    for col, (label, value, hint, accent) in zip(cols, items):
        with col:
            kpi_card(label, value, hint, accent)


def player_card(
    name: str,
    meta: str,
    overall: float,
    badges: list[tuple[str, str]] | None = None,
) -> None:
    badges = badges or []
    badge_html = "".join(
        f'<span class="scout-badge {html.escape(color)}">{html.escape(text)}</span>'
        for text, color in badges
    )
    st.markdown(
        f"""
        <div class="scout-player-card">
            <div class="name">{html.escape(name)}</div>
            <div class="meta">{html.escape(meta)}</div>
            <div class="scores">
                <span class="scout-badge green">Gesamt {overall:.0f}</span>
                {badge_html}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def empty_state(title: str, hint: str = "") -> None:
    st.markdown(
        f"""
        <div class="empty-state">
            <strong>{html.escape(title)}</strong>
            {html.escape(hint)}
        </div>
        """,
        unsafe_allow_html=True,
    )


def result_banner(count: int, label: str = "Spieler gefunden") -> None:
    st.markdown(
        f"""
        <div style="background:#0f172a;border:1px solid #1e293b;border-left:3px solid #3b82f6;
            border-radius:8px;padding:0.65rem 1rem;margin:0.75rem 0;color:#e2e8f0;font-size:0.9rem;">
            <strong style="color:#60a5fa;">{count}</strong> {html.escape(label)}
        </div>
        """,
        unsafe_allow_html=True,
    )


def score_badge(score: float) -> str:
    from analytics.insights import score_tier

    label, tier = score_tier(score)
    return f'<span class="score-tier {tier}">{score:.0f} · {html.escape(label)}</span>'


def compare_player_card(
    name: str,
    team: str,
    league: str,
    position: str,
    age: int,
    market_value: str,
    overall: float,
    transfer: float,
) -> None:
    st.markdown(
        f"""
        <div class="compare-player-card">
            <div class="cpc-name">{html.escape(name)}</div>
            <div class="cpc-meta">{html.escape(team)} · {html.escape(league)} · {html.escape(position)} · {age} J.</div>
            <div class="cpc-market">{html.escape(market_value)}</div>
            <div class="cpc-scores">
                {score_badge(overall)}
                <span class="score-tier transfer">Transfer {transfer:.0f}</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def insight_panel(title: str, body: str, accent: str = "#3b82f6") -> None:
    st.markdown(
        f"""
        <div style="background:#111827;border:1px solid #1e293b;border-left:3px solid {accent};
            border-radius:10px;padding:0.85rem 1rem;margin-bottom:0.5rem;color:#cbd5e1;font-size:0.9rem;">
            <strong style="color:#f1f5f9;display:block;margin-bottom:0.35rem;">{html.escape(title)}</strong>
            {body}
        </div>
        """,
        unsafe_allow_html=True,
    )


def recommendation_card(label: str, player: str, hint: str, color: str) -> None:
    st.markdown(
        f"""
        <div class="scout-kpi" style="border-left-color:{color};">
            <div class="scout-kpi-label">{html.escape(label)}</div>
            <div class="scout-kpi-value" style="font-size:1.15rem;">{html.escape(player)}</div>
            <div class="scout-kpi-hint">{html.escape(hint)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
