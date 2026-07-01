"""Automated scouting report generation."""

from __future__ import annotations

import pandas as pd

from analytics.insights import generate_profile_insights
from analytics.similarity import find_similar_players


def generate_scouting_report(df: pd.DataFrame, player_name: str) -> dict:
    player = df[df["name"] == player_name]
    if player.empty:
        return {"summary": "Spieler nicht gefunden.", "recommendation": "—", "grade": "C"}

    p = player.iloc[0]
    similar = find_similar_players(df, player_name, top_n=5)
    profile = generate_profile_insights(df, player_name)

    strengths = _strengths(p, profile)
    weaknesses = _weaknesses(p, profile)
    risks = _risk_factors(p)
    role = _role_description(p)
    grade = profile.transfer_grade if profile else "C"
    recommendation = profile.transfer_recommendation if profile else _recommendation(p)
    market = profile.market_assessment if profile else ""

    summary = (
        f"{p['name']} ({int(p['age'])}, {p.get('nationality', '—')}) spielt als {p['position']} "
        f"bei {p['team']} ({p.get('league', '—')}, {p.get('country', '—')}). "
        f"Gesamtbewertung: {p.get('overall_score', 0):.0f}/100. "
        f"Marktwert: {int(p.get('market_value_eur', 0)):,} €.".replace(",", ".")
    )

    return {
        "summary": summary,
        "role": role,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "risk_factors": risks,
        "statistical_rating": _stat_rating(p),
        "scores": _score_block(p),
        "similar_players": similar["name"].tolist() if not similar.empty else [],
        "development": _development_text(p),
        "recommendation": recommendation,
        "grade": grade,
        "market_assessment": market,
        "markdown": _build_markdown(
            player_name, summary, role, strengths, weaknesses, risks,
            _stat_rating(p), _score_block(p), _development_text(p),
            recommendation, grade, market,
            similar["name"].tolist() if not similar.empty else [],
        ),
    }


def _strengths(p: pd.Series, profile) -> list[str]:
    if profile and profile.strengths:
        return profile.strengths
    items = []
    mapping = [
        ("offensive_score", "Starke Offensive"),
        ("playmaking_score", "Exzellentes Playmaking"),
        ("finishing_score", "Effizienter Abschluss"),
        ("defensive_score", "Solide Defensive"),
        ("value_score", "Attraktives Preis-Leistungs-Verhältnis"),
    ]
    for key, label in mapping:
        if p.get(key, 0) >= 70:
            items.append(label)
    return items or ["Ausgewogenes Leistungsprofil"]


def _weaknesses(p: pd.Series, profile) -> list[str]:
    if profile and profile.weaknesses:
        return profile.weaknesses
    items = []
    mapping = [
        ("ball_security_score", "Ballverluste"),
        ("defensive_score", "Defensive Präsenz"),
        ("finishing_score", "Abschlussquote"),
    ]
    for key, label in mapping:
        if p.get(key, 100) <= 40:
            items.append(label)
    return items or ["Keine klaren Schwächen im Datensatz"]


def _risk_factors(p: pd.Series) -> list[str]:
    risks = []
    if p.get("minutes", 0) < 600:
        risks.append("Geringe Spielzeit – statistische Aussagekraft eingeschränkt")
    if p.get("age", 25) >= 32:
        risks.append("Hohes Alter – begrenzte Restlaufzeit")
    if p.get("ball_security_score", 100) <= 45:
        risks.append("Erhöhte Ballverluste im Vergleich zum Feld")
    if p.get("consistency_score", 100) <= 45:
        risks.append("Inkonsistente Leistungsdaten")
    if p.get("market_value_eur", 0) > 500_000 and p.get("overall_score", 0) < 65:
        risks.append("Hoher Marktwert bei unterdurchschnittlichem Score")
    if p.get("turnovers", 0) > p.get("assists", 0) * 1.5 and p.get("role") == "Feld":
        risks.append("Negatives Assist/Turnover-Verhältnis")
    return risks or ["Keine signifikanten Risikofaktoren identifiziert"]


def _role_description(p: pd.Series) -> str:
    pos = str(p.get("position", ""))
    role_map = {
        "RM": "Spielmacher / Dirigent im Rückraum – organisiert Angriff und Tempo.",
        "RR": "Rechtsaußen – primär Abschluss und Durchbrüche über Außen.",
        "RL": "Linksaußen – schneller Abschluss, oft erste Wahl im Gegenstoß.",
        "LA": "Linksaußen (Feld) – variabler Abschluss, oft hohe Wurfquote.",
        "RA": "Rechtsaußen (Feld) – Abschlussstärke und Breite im Angriff.",
        "KM": "Kreisläufer – Raumgewinn, Abstaubertore, physische Präsenz.",
        "TW": "Torhüter – Rückhalt, Paradenquote und Spieleröffnung entscheidend.",
    }
    base = role_map.get(pos, f"Position {pos} – spezifisches Rollenprofil.")
    if p.get("playmaking_score", 0) >= 75:
        base += " Profil mit ausgeprägtem Playmaking."
    elif p.get("finishing_score", 0) >= 75:
        base += " Profil mit starkem Abschluss."
    return base


def _stat_rating(p: pd.Series) -> str:
    if p.get("role") == "TW":
        return (
            f"{int(p.get('saves', 0))} Paraden bei {p.get('save_pct', 0):.1f} % Quote, "
            f"{int(p.get('goals_conceded', 0))} Gegentore."
        )
    return (
        f"{int(p.get('goals', 0))} Tore / {int(p.get('assists', 0))} Assists bei "
        f"{p.get('shot_pct', 0):.1f} % Wurfquote in {int(p.get('minutes', 0))} Minuten."
    )


def _score_block(p: pd.Series) -> str:
    keys = [
        "overall_score", "offensive_score", "defensive_score", "playmaking_score",
        "finishing_score", "ball_security_score", "potential_score", "value_score", "transfer_score",
    ]
    return "\n".join(f"- {k.replace('_', ' ').title()}: {p.get(k, 0):.0f}" for k in keys if k in p.index)


def _development_text(p: pd.Series) -> str:
    dev = p.get("potential_score", p.get("development_potential", 50))
    if dev >= 75:
        return "Hohes Entwicklungspotenzial – ideal für langfristige Verpflichtung."
    if dev >= 55:
        return "Moderates Entwicklungspotenzial – weiter beobachten."
    return "Begrenztes Entwicklungspotenzial – Fokus auf Sofortnutzen."


def _recommendation(p: pd.Series) -> str:
    overall = p.get("overall_score", 50)
    if overall >= 80:
        return "Verpflichten – Top-Performer mit starkem Profil."
    if overall >= 65:
        return "Weiter beobachten – interessantes Profil für Shortlist."
    return "Nicht priorisieren – Performance oder Profil derzeit nicht überzeugend."


def _build_markdown(
    player: str, summary: str, role: str, strengths: list, weaknesses: list,
    risks: list, stats: str, scores: str, development: str,
    recommendation: str, grade: str, market: str, similar: list,
) -> str:
    grade_label = {"A": "Verpflichten", "B": "Weiter beobachten", "C": "Nicht priorisieren"}.get(grade, grade)
    return f"""# SCOUTINGBERICHT – {player}

## Zusammenfassung
{summary}

## Rolle
{role}

## Stärken
{chr(10).join('- ' + s for s in strengths)}

## Schwächen
{chr(10).join('- ' + s for s in weaknesses)}

## Risikofaktoren
{chr(10).join('- ' + r for r in risks)}

## Statistische Bewertung
{stats}

## Scores
{scores}

## Marktwert-Einschätzung
{market or '—'}

## Entwicklungspotenzial
{development}

## Empfehlung
**Note {grade}** – {grade_label}

{recommendation}

## Ähnliche Spieler
{', '.join(similar) if similar else '—'}

---
*PDF-Export geplant – Bericht als Markdown verfügbar.*
"""
