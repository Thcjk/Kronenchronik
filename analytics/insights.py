"""Automatic scouting insights for compare and profile views."""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from config.score_weights import SCORE_LABELS_DE

COMPARE_SCORES = [
    "offensive_score", "defensive_score", "playmaking_score", "finishing_score",
    "ball_security_score", "transition_score", "potential_score",
]

STAT_INSIGHTS = [
    ("finishing_score", "Abschluss"),
    ("playmaking_score", "Playmaking"),
    ("defensive_score", "Defensive"),
    ("offensive_score", "Offensive"),
    ("value_score", "Preis-Leistungs-Verhältnis"),
    ("potential_score", "Entwicklungspotenzial"),
]


@dataclass
class CompareInsights:
    player_lines: list[str] = field(default_factory=list)
    pairwise: list[str] = field(default_factory=list)
    best_immediate: str = ""
    best_development: str = ""
    best_value: str = ""
    risk_player: str = ""


def _label(metric: str) -> str:
    return SCORE_LABELS_DE.get(metric, metric.replace("_score", "").replace("_", " ").title())


def _best_player(compare: pd.DataFrame, col: str) -> str:
    if col not in compare.columns or compare.empty:
        return ""
    return str(compare.loc[compare[col].idxmax(), "name"])


def _weakest_player(compare: pd.DataFrame, col: str) -> str:
    if col not in compare.columns or compare.empty:
        return ""
    return str(compare.loc[compare[col].idxmin(), "name"])


def generate_compare_insights(compare: pd.DataFrame) -> CompareInsights:
    out = CompareInsights()
    if len(compare) < 2:
        return out

    avg_overall = compare["overall_score"].mean()

    for _, row in compare.iterrows():
        strengths: list[str] = []
        weaknesses: list[str] = []
        for metric, label in STAT_INSIGHTS:
            if metric not in compare.columns:
                continue
            val = row[metric]
            best = compare[metric].max()
            worst = compare[metric].min()
            if val >= best and best > worst:
                strengths.append(label)
            elif val <= worst and best > worst:
                weaknesses.append(label)

        delta = row["overall_score"] - avg_overall
        trend = f"{abs(delta):.0f} Pkt. über dem Gruppenschnitt" if delta > 0 else f"{abs(delta):.0f} Pkt. unter dem Gruppenschnitt"
        strength_txt = ", ".join(strengths[:2]) if strengths else "ausgewogenes Profil"
        weak_txt = f" Schwächer: {', '.join(weaknesses[:2])}." if weaknesses else ""
        out.player_lines.append(
            f"**{row['name']}** – Gesamt {row['overall_score']:.0f}/100 ({trend}). "
            f"Stärken: {strength_txt}.{weak_txt}"
        )

    for metric, label in STAT_INSIGHTS[:4]:
        if metric not in compare.columns:
            continue
        best = _best_player(compare, metric)
        others = [n for n in compare["name"] if n != best]
        if best and others:
            out.pairwise.append(f"**{best}** ist stärker im Bereich **{label}**.")

    out.best_immediate = _best_player(compare, "overall_score")
    out.best_development = _best_player(compare, "potential_score")
    out.best_value = _best_player(compare, "value_score")

    risk_col = "ball_security_score" if "ball_security_score" in compare.columns else "overall_score"
    out.risk_player = _weakest_player(compare, risk_col)

    return out


def score_tier(score: float) -> tuple[str, str]:
    """Return (label, css_class) for score coloring."""
    if score >= 90:
        return "Elite", "elite"
    if score >= 80:
        return "Sehr gut", "great"
    if score >= 70:
        return "Gut", "good"
    if score >= 60:
        return "Durchschnitt", "avg"
    return "Risiko", "risk"


PROFILE_SCORES = [
    "offensive_score", "defensive_score", "playmaking_score", "finishing_score",
    "ball_security_score", "transition_score", "potential_score",
]


@dataclass
class ProfileInsights:
    strengths: list[str]
    weaknesses: list[str]
    position_rank: int
    position_total: int
    position_label: str
    transfer_recommendation: str
    transfer_grade: str
    market_assessment: str


def position_rank(df: pd.DataFrame, player_name: str) -> tuple[int, int, str]:
    player = df[df["name"] == player_name]
    if player.empty:
        return 0, 0, ""
    p = player.iloc[0]
    pool = df[(df["position"] == p["position"]) & (df["role"] == p["role"])].sort_values(
        "overall_score", ascending=False
    )
    pool = pool.reset_index(drop=True)
    idx = pool.index[pool["name"] == player_name]
    rank = int(idx[0]) + 1 if len(idx) else 0
    return rank, len(pool), str(p["position"])


def _profile_strengths(p: pd.Series, df: pd.DataFrame) -> list[str]:
    items: list[str] = []
    for metric, label in STAT_INSIGHTS:
        if metric not in p.index:
            continue
        pct = (df[metric] <= p[metric]).mean() * 100
        if pct >= 80:
            items.append(f"{label} (Top {100 - pct:.0f} %)")
    if not items:
        for metric, label in STAT_INSIGHTS[:4]:
            if metric in p.index and p[metric] >= 70:
                items.append(label)
    return items[:5] or ["Ausgewogenes Leistungsprofil"]


def _profile_weaknesses(p: pd.Series, df: pd.DataFrame) -> list[str]:
    items: list[str] = []
    for metric, label in [
        ("ball_security_score", "Ballsicherheit"),
        ("defensive_score", "Defensive"),
        ("finishing_score", "Abschluss"),
        ("decision_score", "Entscheidungsfindung"),
    ]:
        if metric not in p.index:
            continue
        pct = (df[metric] <= p[metric]).mean() * 100
        if pct <= 25 or p[metric] <= 45:
            items.append(label)
    if p.get("minutes", 0) < 600:
        items.append("Geringe Spielzeit (Sample Size)")
    return items[:4] or ["Keine klaren Schwächen"]


def _transfer_grade(p: pd.Series) -> tuple[str, str]:
    overall = p.get("overall_score", 0)
    value = p.get("value_score", 0)
    potential = p.get("potential_score", 0)
    transfer = p.get("transfer_score", 0)

    if overall >= 80 and transfer >= 75:
        return "A", "Verpflichten – Top-Performer mit starkem Transferprofil."
    if overall >= 70 or (potential >= 75 and value >= 65):
        return "B", "Weiter beobachten – interessantes Profil, Live-Scouting empfohlen."
    if transfer >= 60 or value >= 70:
        return "B", "Weiter beobachten – attraktives Preis-Leistungs-Verhältnis."
    return "C", "Nicht priorisieren – Performance oder Profil derzeit nicht überzeugend."


def _market_assessment(p: pd.Series, df: pd.DataFrame) -> str:
    mv = p.get("market_value_eur", 0)
    pct = (df["market_value_eur"] <= mv).mean() * 100
    overall = p.get("overall_score", 0)
    if overall >= 75 and pct <= 40:
        return f"Unterbewertet – starker Score bei Marktwert im unteren Drittel ({format_currency_short(mv)})."
    if overall <= 55 and pct >= 70:
        return f"Überbewertet – hoher Marktwert ({format_currency_short(mv)}) relativ zur Performance."
    return f"Marktkonform – {format_currency_short(mv)} entspricht dem Leistungsprofil."


def format_currency_short(value: int | float) -> str:
    v = int(value)
    if v >= 1_000_000:
        return f"{v / 1_000_000:.1f} Mio. €"
    return f"{v // 1000} k€"


def generate_profile_insights(df: pd.DataFrame, player_name: str) -> ProfileInsights | None:
    player = df[df["name"] == player_name]
    if player.empty:
        return None
    p = player.iloc[0]
    rank, total, pos = position_rank(df, player_name)
    grade, rec = _transfer_grade(p)
    return ProfileInsights(
        strengths=_profile_strengths(p, df),
        weaknesses=_profile_weaknesses(p, df),
        position_rank=rank,
        position_total=total,
        position_label=pos,
        transfer_recommendation=rec,
        transfer_grade=grade,
        market_assessment=_market_assessment(p, df),
    )
