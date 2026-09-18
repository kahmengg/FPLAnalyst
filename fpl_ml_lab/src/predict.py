\
from __future__ import annotations

import math
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

from .models import build_models, feature_columns


def poisson_pmf(k: int, lam: float) -> float:
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def outcome_probs(home_xg: float, away_xg: float, max_goals: int = 8):
    hp = [poisson_pmf(k, home_xg) for k in range(max_goals + 1)]
    ap = [poisson_pmf(k, away_xg) for k in range(max_goals + 1)]
    home = draw = away = 0.0
    for i, p_h in enumerate(hp):
        for j, p_a in enumerate(ap):
            p = p_h * p_a
            if i > j:
                home += p
            elif i == j:
                draw += p
            else:
                away += p
    total = home + draw + away
    if total > 0:
        home, draw, away = home / total, draw / total, away / total
    return home, draw, away


def fit_best_model(train_rows: pd.DataFrame, best_model_name: str):
    models = build_models(train_rows)
    if best_model_name not in models:
        raise ValueError(f"Unknown model: {best_model_name}")
    model = models[best_model_name]
    cols = feature_columns(train_rows)
    model.fit(train_rows[cols], train_rows["target_goals"])
    return model, cols


def predict_fixtures(model, feature_cols, future_rows: pd.DataFrame) -> pd.DataFrame:
    if future_rows.empty:
        return future_rows.copy()

    pred = np.clip(model.predict(future_rows[feature_cols]), 0.05, 6.0)
    out = future_rows[["gameweek", "team_name", "opponent_team_name", "home"]].copy()
    out["pred_goals"] = pred

    # Pair home and away rows back into fixtures.
    home = out[out["home"] == 1].rename(columns={
        "team_name": "home_team",
        "opponent_team_name": "away_team",
        "pred_goals": "home_pred_goals",
    })[["gameweek", "home_team", "away_team", "home_pred_goals"]]

    away = out[out["home"] == 0].rename(columns={
        "team_name": "away_team",
        "opponent_team_name": "home_team",
        "pred_goals": "away_pred_goals",
    })[["gameweek", "home_team", "away_team", "away_pred_goals"]]

    fx = home.merge(away, on=["gameweek", "home_team", "away_team"], how="inner")
    fx["home_clean_sheet_prob"] = np.exp(-fx["away_pred_goals"])
    fx["away_clean_sheet_prob"] = np.exp(-fx["home_pred_goals"])

    probs = fx.apply(
        lambda r: outcome_probs(float(r["home_pred_goals"]), float(r["away_pred_goals"])),
        axis=1,
    )
    fx["home_win_prob"] = [p[0] for p in probs]
    fx["draw_prob"] = [p[1] for p in probs]
    fx["away_win_prob"] = [p[2] for p in probs]

    for c in [
        "home_pred_goals", "away_pred_goals",
        "home_clean_sheet_prob", "away_clean_sheet_prob",
        "home_win_prob", "draw_prob", "away_win_prob",
    ]:
        fx[c] = fx[c].round(4)

    return fx.sort_values(["gameweek", "home_team"]).reset_index(drop=True)
