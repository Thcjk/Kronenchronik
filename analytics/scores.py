"""Backward-compatible re-export – prefer analytics.scoring."""

from analytics.scoring import SCORE_WEIGHTS, compute_scores

__all__ = ["SCORE_WEIGHTS", "compute_scores"]
