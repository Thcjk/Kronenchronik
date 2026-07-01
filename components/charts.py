"""Plotly chart components – dark, interactive, reusable."""

from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from config.score_weights import SCORE_LABELS_DE

DARK_LAYOUT = dict(
    paper_bgcolor="#0a0e14",
    plot_bgcolor="#111827",
    font=dict(color="#e2e8f0", size=12, family="Inter, Segoe UI, sans-serif"),
    margin=dict(l=48, r=32, t=56, b=44),
    colorway=["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"],
    legend=dict(bgcolor="rgba(17,24,39,0.8)", bordercolor="#1e293b", borderwidth=1),
)

AXIS = dict(gridcolor="#1e293b", zerolinecolor="#334155", tickfont=dict(color="#94a3b8"))


def _label(metric: str) -> str:
    return SCORE_LABELS_DE.get(metric, metric.replace("_per_60", "/60").replace("_", " ").title())


def _apply_dark(fig: go.Figure, title: str = "") -> go.Figure:
    fig.update_layout(**DARK_LAYOUT, title=dict(text=title, font=dict(size=14, color="#f1f5f9")))
    fig.update_xaxes(**AXIS)
    fig.update_yaxes(**AXIS)
    return fig


def radar_chart(df: pd.DataFrame, metrics: list[str], title: str) -> go.Figure:
    """Multi-player radar with filled areas and German labels."""
    labels = [_label(m) for m in metrics]
    fig = go.Figure()
    colors = DARK_LAYOUT["colorway"]

    for i, (_, row) in enumerate(df.iterrows()):
        values = [row.get(m, 0) for m in metrics]
        values_closed = values + [values[0]]
        labels_closed = labels + [labels[0]]
        color = colors[i % len(colors)]
        fig.add_trace(
            go.Scatterpolar(
                r=values_closed,
                theta=labels_closed,
                fill="toself",
                fillcolor=f"rgba({int(color[1:3], 16)},{int(color[3:5], 16)},{int(color[5:7], 16)},0.12)",
                line=dict(color=color, width=2),
                name=str(row["name"]),
            )
        )

    fig.update_layout(
        **DARK_LAYOUT,
        title=dict(text=title, font=dict(size=14, color="#f1f5f9")),
        polar=dict(
            bgcolor="#111827",
            radialaxis=dict(visible=True, range=[0, 100], gridcolor="#1e293b", tickfont=dict(color="#64748b")),
            angularaxis=dict(tickfont=dict(color="#cbd5e1", size=11), gridcolor="#1e293b"),
        ),
        showlegend=True,
    )
    return fig


def bar_comparison(df: pd.DataFrame, metrics: list[str], title: str) -> go.Figure:
    """Grouped bar chart for score comparison."""
    rows = []
    for _, player in df.iterrows():
        for m in metrics:
            if m in player.index:
                rows.append({"Spieler": player["name"], "Metrik": _label(m), "Wert": player[m]})
    chart_df = pd.DataFrame(rows)
    fig = px.bar(chart_df, x="Metrik", y="Wert", color="Spieler", barmode="group", text_auto=".0f")
    fig.update_traces(textposition="outside", textfont=dict(size=10))
    return _apply_dark(fig, title)


def pro60_comparison(df: pd.DataFrame, metrics: list[str], title: str) -> go.Figure:
    """Horizontal grouped bars for per-60 stats."""
    rows = []
    for _, player in df.iterrows():
        for m in metrics:
            if m in player.index:
                rows.append({"Spieler": player["name"], "Statistik": _label(m), "Wert": round(player[m], 2)})
    chart_df = pd.DataFrame(rows)
    fig = px.bar(
        chart_df, y="Statistik", x="Wert", color="Spieler",
        barmode="group", orientation="h", text="Wert",
    )
    fig.update_traces(textposition="outside")
    return _apply_dark(fig, title)


def raw_stats_comparison(df: pd.DataFrame, metrics: list[str], title: str) -> go.Figure:
    """Grouped bars for raw counting stats."""
    labels = {
        "minutes": "Minuten", "goals": "Tore", "assists": "Assists", "shot_pct": "Wurfquote %",
        "turnovers": "Ballverluste", "steals": "Steals", "blocks": "Blocks",
        "market_value_eur": "Marktwert €",
    }
    rows = []
    for _, player in df.iterrows():
        for m in metrics:
            if m in player.index:
                val = player[m]
                if m == "market_value_eur":
                    val = val / 1000
                    lbl = "Marktwert (k€)"
                else:
                    lbl = labels.get(m, m)
                rows.append({"Spieler": player["name"], "Statistik": lbl, "Wert": val})
    chart_df = pd.DataFrame(rows)
    fig = px.bar(chart_df, x="Statistik", y="Wert", color="Spieler", barmode="group", text_auto=".1f")
    fig.update_traces(textposition="outside")
    return _apply_dark(fig, title)


def percentile_chart(df: pd.DataFrame, player_name: str, metrics: list[str]) -> go.Figure:
    """Single-player percentile bars."""
    player = df[df["name"] == player_name]
    if player.empty:
        return go.Figure()
    rows = []
    for m in metrics:
        if m not in df.columns:
            continue
        pct = (df[m] <= player.iloc[0][m]).mean() * 100
        rows.append({"Metrik": _label(m), "Perzentil": pct})
    chart_df = pd.DataFrame(rows)
    fig = px.bar(
        chart_df, x="Perzentil", y="Metrik", orientation="h",
        color="Perzentil", color_continuous_scale=["#ef4444", "#f59e0b", "#22c55e"],
        range_color=[0, 100], text="Perzentil",
    )
    fig.update_traces(texttemplate="%{x:.0f}%", textposition="outside")
    fig.update_layout(coloraxis_showscale=False)
    return _apply_dark(fig, f"Perzentile – {player_name}")


def percentile_compare(df: pd.DataFrame, compare: pd.DataFrame, metrics: list[str], title: str) -> go.Figure:
    """Multi-player percentile comparison (grouped horizontal bars)."""
    rows = []
    for _, player in compare.iterrows():
        name = player["name"]
        for m in metrics:
            if m not in df.columns:
                continue
            pct = (df[m] <= player[m]).mean() * 100
            rows.append({"Spieler": name, "Metrik": _label(m), "Perzentil": pct})
    chart_df = pd.DataFrame(rows)
    fig = px.bar(
        chart_df, x="Perzentil", y="Metrik", color="Spieler",
        barmode="group", orientation="h", text="Perzentil",
    )
    fig.update_traces(texttemplate="%{x:.0f}", textposition="outside")
    return _apply_dark(fig, title)


def scatter_scores(df: pd.DataFrame, x: str, y: str, size: str, title: str) -> go.Figure:
    fig = px.scatter(
        df, x=x, y=y, size=size,
        color="position" if "position" in df.columns else "league",
        hover_name="name",
        hover_data=["team", "overall_score"],
        labels={x: _label(x), y: _label(y), size: _label(size)},
    )
    return _apply_dark(fig, title)


def bubble_chart(df: pd.DataFrame, title: str = "Marktwert · Alter · Gesamt-Score") -> go.Figure:
    fig = px.scatter(
        df,
        x="age",
        y="overall_score",
        size="market_value_eur",
        color="position",
        hover_name="name",
        hover_data=["team", "league", "market_value_eur"],
        labels={"age": "Alter", "overall_score": "Gesamt-Score", "market_value_eur": "Marktwert"},
        size_max=40,
    )
    return _apply_dark(fig, title)


def distribution_bar(df: pd.DataFrame, column: str, title: str) -> go.Figure:
    counts = df[column].value_counts().reset_index()
    counts.columns = [column, "Anzahl"]
    fig = px.bar(counts, x=column, y="Anzahl", text="Anzahl", color="Anzahl", color_continuous_scale="Blues")
    fig.update_traces(textposition="outside")
    fig.update_layout(coloraxis_showscale=False)
    return _apply_dark(fig, title)


def position_ranking_chart(df: pd.DataFrame, position: str, title: str) -> go.Figure:
    subset = df[(df["position"] == position) & (df["role"] == "Feld")].nlargest(10, "overall_score")
    fig = px.bar(
        subset, x="overall_score", y="name", orientation="h",
        color="overall_score", color_continuous_scale="Blues",
        text="overall_score", labels={"overall_score": "Gesamt-Score", "name": "Spieler"},
    )
    fig.update_traces(texttemplate="%{x:.0f}", textposition="outside")
    fig.update_layout(coloraxis_showscale=False, yaxis=dict(categoryorder="total ascending"))
    return _apply_dark(fig, title)


def goalkeeper_chart(df: pd.DataFrame, title: str = "Torhüter – Paradenquote & Paraden/60") -> go.Figure:
    keepers = df[df["role"] == "TW"].copy()
    if keepers.empty:
        return go.Figure()
    fig = px.scatter(
        keepers, x="save_pct", y="saves_per_60" if "saves_per_60" in keepers.columns else "saves",
        size="overall_score", color="team", hover_name="name",
        labels={"save_pct": "Paradenquote %", "saves_per_60": "Paraden/60"},
    )
    return _apply_dark(fig, title)
