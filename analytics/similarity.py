"""Player similarity engine – cosine similarity on standardized features."""

from __future__ import annotations

import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler

FIELD_FEATURES = [
    "goals_per_60", "assists_per_60", "turnovers_per_60", "steals_per_60",
    "blocks_per_60", "shot_pct", "fastbreak_goals_per_60", "assist_to_turnover",
]

KEEPER_FEATURES = ["saves_per_60", "save_pct", "assists_per_60", "goals_conceded_per_60"]

POSITION_PROFILES = {
    "RL": {"goals_per_60": 0.8, "assists_per_60": 0.9, "steals_per_60": 0.6},
    "RM": {"goals_per_60": 0.85, "assists_per_60": 1.0, "steals_per_60": 0.5},
    "RR": {"goals_per_60": 0.9, "assists_per_60": 0.85, "steals_per_60": 0.55},
    "LA": {"goals_per_60": 1.0, "assists_per_60": 0.5, "steals_per_60": 0.7},
    "RA": {"goals_per_60": 0.95, "assists_per_60": 0.45, "steals_per_60": 0.75},
    "KM": {"goals_per_60": 0.75, "blocks_per_60": 1.0, "steals_per_60": 0.4},
    "TW": {"saves_per_60": 1.0, "save_pct": 1.0, "assists_per_60": 0.3},
}


def find_similar_players(
    df: pd.DataFrame,
    player_name: str,
    top_n: int = 20,
    same_position: bool = True,
) -> pd.DataFrame:
    target = df[df["name"] == player_name]
    if target.empty:
        return pd.DataFrame()
    target_row = target.iloc[0]
    role = target_row["role"]
    pool = df[df["role"] == role].copy()

    if same_position and role == "Feld":
        pool = pool[pool["position"] == target_row["position"]]
    if len(pool) < 2:
        pool = df[df["role"] == role].copy()

    features = KEEPER_FEATURES if role == "TW" else FIELD_FEATURES
    available = [f for f in features if f in pool.columns]
    matrix = pool[available].fillna(0)
    scaled = StandardScaler().fit_transform(matrix)
    sims = cosine_similarity(scaled)

    idx = pool.index[pool["name"] == player_name][0]
    local_idx = pool.index.get_loc(idx)
    pool = pool.reset_index(drop=True)
    pool["similarity"] = sims[local_idx]
    pool["similarity_pct"] = (pool["similarity"] * 100).round(1)

    similar = pool[pool["name"] != player_name].sort_values("similarity", ascending=False).head(top_n)
    similar["common_traits"] = similar.apply(lambda r: _common_traits(target_row, r, available), axis=1)
    similar["differences"] = similar.apply(lambda r: _differences(target_row, r, available), axis=1)
    return similar


def _common_traits(a: pd.Series, b: pd.Series, features: list[str]) -> str:
    traits = []
    for f in features[:5]:
        if f not in a.index or f not in b.index:
            continue
        if abs(float(a[f]) - float(b[f])) <= max(float(a[f]), float(b[f]), 1) * 0.15:
            traits.append(f.replace("_per_60", "/60").replace("_", " "))
    return ", ".join(traits[:4]) or "Ähnliches Profil"


def _differences(a: pd.Series, b: pd.Series, features: list[str]) -> str:
    diffs = []
    for f in features[:5]:
        if f not in a.index or f not in b.index:
            continue
        delta = float(b[f]) - float(a[f])
        if abs(delta) > max(float(a[f]), 1) * 0.2:
            label = f.replace("_per_60", "/60")
            direction = "höher" if delta > 0 else "niedriger"
            diffs.append(f"{label} {direction}")
    return ", ".join(diffs[:3]) or "Keine großen Abweichungen"
