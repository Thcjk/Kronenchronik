"""Configurable scouting scores (0–100). Weights in config/score_weights.py."""

from __future__ import annotations

import pandas as pd

from config.score_weights import (
    DEFAULT_FIELD_OVERALL,
    FIELD_WEIGHTS,
    KEEPER_WEIGHTS,
    POSITION_OVERALL,
    TRANSFER_SCORE_WEIGHTS,
    VALUE_SCORE_WEIGHTS,
)

SCORE_WEIGHTS = {**FIELD_WEIGHTS, "overall_field": DEFAULT_FIELD_OVERALL, **KEEPER_WEIGHTS}


def _weighted_rank_score(
    df: pd.DataFrame,
    weights: dict[str, float],
    invert: set[str] | None = None,
) -> pd.Series:
    invert = invert or set()
    score = pd.Series(0.0, index=df.index)
    for col, weight in weights.items():
        if col not in df.columns:
            continue
        ranked = df[col].rank(pct=True, ascending=col not in invert)
        if col in invert or weight < 0:
            ranked = 1 - ranked
        score += abs(weight) * ranked
    total = sum(abs(w) for w in weights.values()) or 1
    return (score / total) * 100


def _position_overall_weights(position: str) -> dict[str, float]:
    base = dict(DEFAULT_FIELD_OVERALL)
    base.update(POSITION_OVERALL.get(position, {}))
    total = sum(base.values())
    return {k: v / total for k, v in base.items()}


def compute_scores(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()

    if "seven_meter_rate" not in result.columns:
        if "seven_meter_goals" in result.columns and "seven_meter_attempts" in result.columns:
            result["seven_meter_rate"] = result["seven_meter_goals"] / result["seven_meter_attempts"].clip(lower=1)
        else:
            result["seven_meter_rate"] = 0.0

    field_mask = result["role"] == "Feld"
    keeper_mask = result["role"] == "TW"

    score_cols = [
        "offensive_score", "defensive_score", "playmaking_score", "finishing_score",
        "decision_score", "ball_security_score", "transition_score", "consistency_score",
        "development_potential", "potential_score", "overall_score",
        "value_score", "transfer_score", "goalkeeper_score",
    ]
    for col in score_cols:
        result[col] = 0.0

    if field_mask.any():
        field = result[field_mask].copy()
        field["offensive_score"] = _weighted_rank_score(field, FIELD_WEIGHTS["offensive"])
        field["defensive_score"] = _weighted_rank_score(field, FIELD_WEIGHTS["defensive"], invert={"turnovers_per_60"})
        field["playmaking_score"] = _weighted_rank_score(field, FIELD_WEIGHTS["playmaking"])
        field["finishing_score"] = _weighted_rank_score(field, FIELD_WEIGHTS["finishing"])
        field["decision_score"] = _weighted_rank_score(field, FIELD_WEIGHTS["decision"], invert={"turnovers_per_60"})
        field["ball_security_score"] = _weighted_rank_score(
            field, FIELD_WEIGHTS["ball_security"], invert={"turnovers_per_60", "technical_fouls"}
        )
        field["transition_score"] = _weighted_rank_score(field, FIELD_WEIGHTS["transition"])
        field["consistency_score"] = _weighted_rank_score(field, FIELD_WEIGHTS["consistency"])

        if "development_index" in field.columns:
            field["development_potential"] = field["development_index"].clip(0, 100)
        else:
            field["development_potential"] = (100 - field["age"].rank(pct=True) * 40).clip(0, 100)
        field["potential_score"] = field["development_potential"]

        overall = pd.Series(0.0, index=field.index)
        for pos in field["position"].unique():
            pos_mask = field["position"] == pos
            overall.loc[pos_mask] = _weighted_rank_score(field.loc[pos_mask], _position_overall_weights(str(pos)))
        field["overall_score"] = overall
        field["value_score"] = _weighted_rank_score(field, VALUE_SCORE_WEIGHTS, invert={"market_value_eur"})
        field["transfer_score"] = _weighted_rank_score(field, TRANSFER_SCORE_WEIGHTS)

        for col in score_cols:
            if col != "goalkeeper_score":
                result.loc[field_mask, col] = field[col].values

    if keeper_mask.any():
        keepers = result[keeper_mask].copy()
        save_score = _weighted_rank_score(keepers, KEEPER_WEIGHTS["save"])
        distribution = _weighted_rank_score(keepers, KEEPER_WEIGHTS["distribution"])
        keeper_def = _weighted_rank_score(keepers, KEEPER_WEIGHTS["keeper_defense"], invert={"goals_conceded_per_60"})
        keepers["save_score"] = save_score
        keepers["distribution_score"] = distribution
        keepers["keeper_defense_score"] = keeper_def
        keepers["goalkeeper_score"] = _weighted_rank_score(keepers, KEEPER_WEIGHTS["overall_keeper"])
        keepers["offensive_score"] = save_score
        keepers["defensive_score"] = keeper_def
        keepers["playmaking_score"] = distribution
        keepers["finishing_score"] = save_score
        keepers["decision_score"] = keeper_def
        keepers["ball_security_score"] = keeper_def
        keepers["transition_score"] = distribution
        keepers["consistency_score"] = _weighted_rank_score(keepers, FIELD_WEIGHTS["consistency"])
        keepers["development_potential"] = keepers["development_index"].clip(0, 100) if "development_index" in keepers.columns else 50.0
        keepers["potential_score"] = keepers["development_potential"]
        keepers["overall_score"] = keepers["goalkeeper_score"]
        keepers["value_score"] = _weighted_rank_score(keepers, VALUE_SCORE_WEIGHTS, invert={"market_value_eur"})
        keepers["transfer_score"] = _weighted_rank_score(keepers, TRANSFER_SCORE_WEIGHTS)
        for col in score_cols:
            result.loc[keeper_mask, col] = keepers[col].values

    return result
