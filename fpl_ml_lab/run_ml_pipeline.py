\
#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import sys
import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.config import HISTORICAL, CURRENT, BACKTEST_DIR, PREDICTION_DIR, MODEL_DIR
from src.data import load_stats, load_fixtures, build_team_matches
from src.features import make_training_rows, make_future_fixture_rows
from src.evaluate import walk_forward_backtest
from src.predict import fit_best_model, predict_fixtures


def main():
    parser = argparse.ArgumentParser(description="Isolated FPL ML experiment pipeline")
    parser.add_argument("--historical-stats", type=Path, default=HISTORICAL.stats_csv)
    parser.add_argument("--historical-fixtures", type=Path, default=HISTORICAL.fixtures_csv)
    parser.add_argument("--current-stats", type=Path, default=CURRENT.stats_csv)
    parser.add_argument("--current-fixtures", type=Path, default=CURRENT.fixtures_csv)
    parser.add_argument("--min-train-gw", type=int, default=8)
    parser.add_argument("--skip-current-predictions", action="store_true")
    args = parser.parse_args()

    BACKTEST_DIR.mkdir(parents=True, exist_ok=True)
    PREDICTION_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    print("\n=== 1) Load historical season ===")
    hist_stats = load_stats(args.historical_stats)
    hist_fixtures = load_fixtures(args.historical_fixtures)
    hist_matches = build_team_matches(hist_stats)
    train_rows = make_training_rows(hist_matches)

    # Exclude rows with no prior history.
    train_rows = train_rows[train_rows["matches_prior"] >= 1].copy()
    print(f"Historical team-match rows: {len(hist_matches)}")
    print(f"Training rows: {len(train_rows)}")
    print(f"Historical GW range: {hist_matches.gameweek.min()}-{hist_matches.gameweek.max()}")

    print("\n=== 2) Walk-forward backtest ===")
    metrics, preds = walk_forward_backtest(train_rows, min_train_gw=args.min_train_gw)
    metrics_path = BACKTEST_DIR / "model_metrics.csv"
    preds_path = BACKTEST_DIR / "walk_forward_predictions.csv"
    metrics.to_csv(metrics_path, index=False)
    preds.to_csv(preds_path, index=False)

    print(metrics.to_string(index=False, float_format=lambda x: f"{x:.4f}"))
    print(f"\nSaved: {metrics_path}")
    print(f"Saved: {preds_path}")

    best = metrics.iloc[0]["model"]
    if best == "baseline":
        # We need a fitted model for future predictions; use best non-baseline model.
        non_base = metrics[metrics["model"] != "baseline"]
        best = non_base.iloc[0]["model"]
    print(f"\nBest fitted ML model by MAE: {best}")

    if args.skip_current_predictions:
        return

    print("\n=== 3) Load current season ===")
    current_stats = load_stats(args.current_stats)
    current_fixtures = load_fixtures(args.current_fixtures)
    current_matches = build_team_matches(current_stats)
    current_rows = make_training_rows(current_matches)
    current_rows = current_rows[current_rows["matches_prior"] >= 1].copy()

    # Training pool = full historical season + completed current-season games.
    combined = pd.concat([train_rows, current_rows], ignore_index=True, sort=False)

    model, feature_cols = fit_best_model(combined, best)
    model_path = MODEL_DIR / f"{best}.joblib"
    joblib.dump({"model": model, "feature_cols": feature_cols}, model_path)

    print("\n=== 4) Predict remaining current-season fixtures ===")
    future_rows = make_future_fixture_rows(current_matches, current_fixtures)

    # Align missing columns expected by training.
    for c in feature_cols:
        if c not in future_rows.columns:
            future_rows[c] = 0

    fixture_predictions = predict_fixtures(model, feature_cols, future_rows)
    pred_path = PREDICTION_DIR / "current_fixture_predictions.csv"
    fixture_predictions.to_csv(pred_path, index=False)

    print(f"Predicted fixtures: {len(fixture_predictions)}")
    print(f"Saved model: {model_path}")
    print(f"Saved predictions: {pred_path}")
    if not fixture_predictions.empty:
        print("\nPreview:")
        print(fixture_predictions.head(10).to_string(index=False))


if __name__ == "__main__":
    main()
