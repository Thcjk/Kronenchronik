"""Data quality analysis for imports and database checks."""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from utils.csv_import import OPTIONAL_COLUMNS, REQUIRED, normalize_columns

SCORE_DEPENDENCIES: dict[str, list[str]] = {
    "offensive_score": ["goals", "minutes", "shots"],
    "defensive_score": ["steals", "turnovers", "minutes"],
    "playmaking_score": ["assists", "turnovers", "minutes"],
    "finishing_score": ["goals", "shots"],
    "goalkeeper_score": ["saves", "save_pct", "minutes"],
    "value_score": ["market_value_eur"],
    "potential_score": ["age"],
}


@dataclass
class DataQualityReport:
    total_rows: int = 0
    total_columns: int = 0
    detected_columns: list[str] = field(default_factory=list)
    missing_required: list[str] = field(default_factory=list)
    optional_present: list[str] = field(default_factory=list)
    optional_missing: list[str] = field(default_factory=list)
    null_counts: dict[str, int] = field(default_factory=dict)
    duplicate_players: list[str] = field(default_factory=list)
    invalid_rows: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    quality_pct: float = 0.0
    scores_ok: list[str] = field(default_factory=list)
    scores_uncertain: list[str] = field(default_factory=list)


def _find_duplicates(df: pd.DataFrame) -> list[str]:
    if "name" not in df.columns:
        return []
    key_cols = ["name", "team"] if "team" in df.columns else ["name"]
    dupes = df[df.duplicated(subset=key_cols, keep=False)]
    if dupes.empty:
        return []
    return sorted(dupes["name"].astype(str).unique().tolist())


def _find_invalid(df: pd.DataFrame) -> list[str]:
    issues: list[str] = []
    for i, row in df.iterrows():
        name = str(row.get("name", f"Zeile {i}"))
        if "age" in df.columns:
            age = row.get("age")
            if pd.notna(age) and (float(age) < 16 or float(age) > 45):
                issues.append(f"{name}: unplausibles Alter ({age})")
        if "minutes" in df.columns:
            mins = row.get("minutes")
            if pd.notna(mins) and float(mins) < 0:
                issues.append(f"{name}: negative Minuten")
        if "shots" in df.columns and "goals" in df.columns:
            if pd.notna(row.get("shots")) and pd.notna(row.get("goals")):
                if float(row["goals"]) > float(row["shots"]) and float(row["shots"]) > 0:
                    issues.append(f"{name}: Tore > Würfe")
        if "market_value_eur" in df.columns:
            mv = row.get("market_value_eur")
            if pd.notna(mv) and float(mv) < 0:
                issues.append(f"{name}: negativer Marktwert")
    return issues[:20]


def _score_readiness(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    ok, uncertain = [], []
    for score, deps in SCORE_DEPENDENCIES.items():
        missing = [d for d in deps if d not in df.columns]
        null_deps = [d for d in deps if d in df.columns and df[d].isnull().any()]
        if missing or null_deps:
            reason = missing or null_deps
            uncertain.append(f"{score} ({', '.join(reason)})")
        else:
            ok.append(score)
    return ok, uncertain


def _quality_pct(df: pd.DataFrame, missing_required: list[str], dupes: list[str], invalid: list[str]) -> float:
    if df.empty:
        return 0.0
    score = 100.0
    score -= len(missing_required) * 15
    total_cells = df.shape[0] * df.shape[1]
    null_cells = int(df.isnull().sum().sum())
    if total_cells:
        score -= (null_cells / total_cells) * 30
    score -= min(len(dupes) * 3, 15)
    score -= min(len(invalid) * 2, 20)
    return max(0.0, min(100.0, round(score, 1)))


def analyze_data_quality(raw_df: pd.DataFrame) -> DataQualityReport:
    df = normalize_columns(raw_df)
    report = DataQualityReport(
        total_rows=len(df),
        total_columns=len(df.columns),
        detected_columns=sorted(df.columns.tolist()),
    )

    report.missing_required = sorted(REQUIRED - set(df.columns))
    report.optional_present = sorted(set(OPTIONAL_COLUMNS) & set(df.columns))
    report.optional_missing = sorted(set(OPTIONAL_COLUMNS) - set(df.columns))

    nulls = df.isnull().sum()
    report.null_counts = {col: int(c) for col, c in nulls.items() if c > 0}

    report.duplicate_players = _find_duplicates(df)
    report.invalid_rows = _find_invalid(df)
    report.scores_ok, report.scores_uncertain = _score_readiness(df)
    report.quality_pct = _quality_pct(df, report.missing_required, report.duplicate_players, report.invalid_rows)

    if report.missing_required:
        report.warnings.append(f"Pflichtspalten fehlen: {', '.join(report.missing_required)}")
    if report.duplicate_players:
        report.warnings.append(f"{len(report.duplicate_players)} doppelte Spieler (Name+Team).")
    if report.null_counts:
        top = sorted(report.null_counts.items(), key=lambda x: -x[1])[:5]
        report.warnings.append(f"Fehlende Werte: {', '.join(f'{c} ({n})' for c, n in top)}")
    if report.invalid_rows:
        report.warnings.append(f"{len(report.invalid_rows)} ungültige/unplausible Werte erkannt.")
    if report.scores_uncertain:
        report.warnings.append(f"Unsichere Scores: {len(report.scores_uncertain)} von {len(SCORE_DEPENDENCIES)}")

    return report
