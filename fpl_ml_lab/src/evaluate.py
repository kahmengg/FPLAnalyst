from __future__ import annotations

import numpy as np
import pandas as pd

from .elo import RESULT_LABELS, RESULTS, validate_probabilities

PROB_COLS = ["prob_home", "prob_draw", "prob_away"]


def _prediction_rows(fixtures: pd.DataFrame, model: str, probabilities: np.ndarray) -> pd.DataFrame:
    predictions = fixtures[[
        "gameweek", "home_team", "away_team", "actual_result", "home_goals", "away_goals"
    ]].copy()
    predictions.insert(0, "model", model)
    predictions[PROB_COLS] = probabilities
    predictions["predicted_result"] = np.asarray(RESULTS)[np.argmax(probabilities, axis=1)]
    predictions["predicted_label"] = predictions["predicted_result"].map(RESULT_LABELS)
    predictions["actual_label"] = predictions["actual_result"].map(RESULT_LABELS)
    predictions["correct"] = predictions["predicted_result"] == predictions["actual_result"]
    validate_probabilities(predictions)
    return predictions


def build_baseline_predictions(fixtures: pd.DataFrame) -> pd.DataFrame:
    """Always-home and expanding frequency baselines, frozen before each GW."""
    rows = []
    counts = np.array([44.0, 27.0, 29.0])
    for _, gameweek in fixtures.groupby("gameweek", sort=True):
        rows.append(_prediction_rows(
            gameweek, "always_home",
            np.tile(np.array([0.999, 0.0005, 0.0005]), (len(gameweek), 1)),
        ))
        rows.append(_prediction_rows(
            gameweek, "league_frequency",
            np.tile(counts / counts.sum(), (len(gameweek), 1)),
        ))
        observed = gameweek["actual_result"].value_counts()
        counts += np.array([observed.get(label, 0) for label in RESULTS])
    return pd.concat(rows, ignore_index=True)


def prediction_metrics(predictions: pd.DataFrame, *, window: str) -> pd.DataFrame:
    rows = []
    for model, group in predictions.groupby("model"):
        actual = group["actual_result"].to_numpy()
        predicted = group["predicted_result"].to_numpy()
        probabilities = group[PROB_COLS].to_numpy(dtype=float)
        one_hot = np.column_stack([actual == label for label in RESULTS]).astype(float)
        observed = probabilities[
            np.arange(len(group)), [RESULTS.index(value) for value in actual]
        ]
        row = {
            "window": window, "model": model, "rows": len(group),
            "correct": int(np.sum(actual == predicted)),
            "accuracy": float(np.mean(actual == predicted)),
            "log_loss": float(-np.mean(np.log(np.clip(observed, 1e-15, 1.0)))),
            "brier_score": float(np.mean(np.sum((probabilities - one_hot) ** 2, axis=1))),
        }
        for label, name in zip(RESULTS, ["home", "draw", "away"]):
            mask = actual == label
            row[f"{name}_recall"] = float(np.mean(predicted[mask] == label)) if mask.any() else np.nan
        rows.append(row)
    return pd.DataFrame(rows).sort_values(["log_loss", "accuracy"], ascending=[True, False])


def gameweek_accuracy(predictions: pd.DataFrame) -> pd.DataFrame:
    return (
        predictions.groupby(["model", "gameweek"], as_index=False)
        .agg(predictions=("correct", "size"), correct=("correct", "sum"), accuracy=("correct", "mean"))
        .sort_values(["model", "gameweek"])
    )


def confusion_rows(predictions: pd.DataFrame, window: str) -> pd.DataFrame:
    rows = []
    for model, group in predictions.groupby("model"):
        matrix = np.zeros((len(RESULTS), len(RESULTS)), dtype=int)
        for actual, predicted in zip(group["actual_result"], group["predicted_result"]):
            matrix[RESULTS.index(actual), RESULTS.index(predicted)] += 1
        for actual_index, actual in enumerate(RESULTS):
            for predicted_index, predicted in enumerate(RESULTS):
                rows.append({
                    "window": window, "model": model, "actual": actual,
                    "predicted": predicted, "count": int(matrix[actual_index, predicted_index]),
                })
    return pd.DataFrame(rows)


def elo_vs_baseline_summary(metrics: pd.DataFrame, window: str) -> pd.DataFrame:
    selected = metrics[metrics["window"] == window].set_index("model")
    elo = selected.loc["elo_default"]
    baseline = selected.loc["league_frequency"]
    return pd.DataFrame([{
        "window": window,
        "elo_correct": int(elo["correct"]),
        "baseline_correct": int(baseline["correct"]),
        "correct_improvement": int(elo["correct"] - baseline["correct"]),
        "elo_accuracy": elo["accuracy"],
        "baseline_accuracy": baseline["accuracy"],
        "accuracy_improvement": elo["accuracy"] - baseline["accuracy"],
        "elo_log_loss": elo["log_loss"],
        "baseline_log_loss": baseline["log_loss"],
        "log_loss_improvement": baseline["log_loss"] - elo["log_loss"],
        "elo_beats_baseline_accuracy": bool(elo["accuracy"] > baseline["accuracy"]),
        "elo_beats_baseline_log_loss": bool(elo["log_loss"] < baseline["log_loss"]),
    }])
