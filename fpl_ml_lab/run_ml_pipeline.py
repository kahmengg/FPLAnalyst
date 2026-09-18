#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import asdict
import json
import logging
from pathlib import Path
import sys

import pandas as pd

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.config import BACKTEST_DIR, CURRENT, HISTORICAL, MODEL_DIR, PREDICTION_DIR, PRIOR_TABLE
from src.data import (
    build_fixture_matches, build_team_matches, derive_final_table, load_final_table,
    load_fixtures, load_stats, validate_season,
)
from src.elo import EloConfig, predict_fixtures_from_ratings, run_elo_walk_forward
from src.evaluate import (
    build_baseline_predictions, confusion_rows, elo_vs_baseline_summary,
    gameweek_accuracy, prediction_metrics,
)

LOGGER = logging.getLogger("fpl_elo_pipeline")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Leakage-safe FPL Elo forecasting")
    parser.add_argument("--historical-stats", type=Path, default=HISTORICAL.stats_csv)
    parser.add_argument("--historical-fixtures", type=Path, default=HISTORICAL.fixtures_csv)
    parser.add_argument("--current-stats", type=Path, default=CURRENT.stats_csv)
    parser.add_argument("--current-fixtures", type=Path, default=CURRENT.fixtures_csv)
    parser.add_argument("--prior-table", type=Path, default=PRIOR_TABLE)
    parser.add_argument("--holdout-start-gw", type=int, default=20)
    parser.add_argument("--skip-current-predictions", action="store_true")
    return parser.parse_args()


def _save(frame: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index=False)
    LOGGER.info("Saved %d rows: %s", len(frame), path)


def _load_season(stats_path: Path, fixtures_path: Path, label: str, allow_rescheduled: bool):
    stats = load_stats(stats_path)
    schedule = load_fixtures(fixtures_path)
    validate_season(stats, schedule, label, allow_rescheduled=allow_rescheduled)
    completed = build_fixture_matches(build_team_matches(stats))
    return schedule, completed


def run(args: argparse.Namespace) -> None:
    if not 2 <= args.holdout_start_gw <= 38:
        raise ValueError("holdout-start-gw must be between 2 and 38")
    for directory in [BACKTEST_DIR, MODEL_DIR, PREDICTION_DIR]:
        directory.mkdir(parents=True, exist_ok=True)
    config = EloConfig()

    print("\n=== 1) Historical data and previous-season prior ===")
    _, historical_fixtures = _load_season(
        args.historical_stats, args.historical_fixtures,
        "Historical season", allow_rescheduled=True,
    )
    prior_table = load_final_table(args.prior_table)
    if len(historical_fixtures) != 380 or historical_fixtures["gameweek"].min() != 1:
        raise ValueError("Historical evaluation must contain all 380 fixtures from GW1")

    print("\n=== 2) Default Elo walk-forward evaluation ===")
    elo_predictions, _ = run_elo_walk_forward(
        historical_fixtures, prior_table, config, model_name="elo_default"
    )
    baseline_predictions = build_baseline_predictions(historical_fixtures)
    all_predictions = pd.concat([baseline_predictions, elo_predictions], ignore_index=True)
    holdout_window = f"headline_holdout_gw{args.holdout_start_gw}_38"
    holdout = all_predictions[all_predictions["gameweek"] >= args.holdout_start_gw]
    metrics = pd.concat([
        prediction_metrics(all_predictions, window="full_season_gw1_38"),
        prediction_metrics(holdout, window=holdout_window),
    ], ignore_index=True)
    summary = elo_vs_baseline_summary(metrics, holdout_window)

    _save(elo_predictions, BACKTEST_DIR / "elo_predictions.csv")
    _save(baseline_predictions, BACKTEST_DIR / "baseline_predictions.csv")
    _save(metrics, BACKTEST_DIR / "model_metrics.csv")
    _save(summary, BACKTEST_DIR / "improvement_summary.csv")
    _save(gameweek_accuracy(all_predictions), BACKTEST_DIR / "gameweek_accuracy.csv")
    _save(confusion_rows(holdout, holdout_window), BACKTEST_DIR / "confusion_matrix.csv")

    headline = metrics[metrics["window"] == holdout_window].sort_values("log_loss")
    print("\nHeadline results:")
    print(headline.to_string(index=False, float_format=lambda value: f"{value:.4f}"))
    print("\nDefault Elo improvement over the frequency baseline:")
    print(summary.to_string(index=False, float_format=lambda value: f"{value:.4f}"))

    model_path = MODEL_DIR / "elo_config.json"
    model_path.write_text(json.dumps(asdict(config), indent=2), encoding="utf-8")
    LOGGER.info("Saved Elo configuration: %s", model_path)
    if args.skip_current_predictions:
        return

    print("\n=== 3) Current-season next-GW prediction ===")
    current_schedule, current_completed = _load_season(
        args.current_stats, args.current_fixtures,
        "Current season", allow_rescheduled=False,
    )
    derived_table = derive_final_table(historical_fixtures)
    if len(derived_table) != 20 or not derived_table["played"].eq(38).all():
        raise ValueError("Cannot derive a complete 2025/26 prior table")
    _save(derived_table, ROOT / "data" / "historical" / "2025_26" / "final_table.csv")
    _, ratings = run_elo_walk_forward(
        current_completed, derived_table, config, model_name="elo_default"
    )
    completed_keys = current_completed[["gameweek", "home_team", "away_team"]]
    remaining = current_schedule.merge(
        completed_keys.assign(completed=True),
        on=["gameweek", "home_team", "away_team"], how="left",
    )
    remaining = remaining[remaining["completed"].isna()].drop(columns="completed")
    if remaining.empty:
        raise ValueError("Current schedule has no unplayed fixtures")
    next_gw = int(remaining["gameweek"].min())
    next_fixtures = remaining[remaining["gameweek"] == next_gw]
    next_predictions = predict_fixtures_from_ratings(
        next_fixtures, ratings, config, model_name="elo_default"
    )
    _save(next_predictions, PREDICTION_DIR / "next_gameweek_predictions.csv")
    print(f"\nNext GW: {next_gw}; fixtures: {len(next_predictions)}")
    print(next_predictions.to_string(index=False, float_format=lambda value: f"{value:.4f}"))


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    try:
        run(parse_args())
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        LOGGER.error("Pipeline failed: %s", exc)
        LOGGER.error("Fix the reported data/configuration issue and rerun the same command.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
