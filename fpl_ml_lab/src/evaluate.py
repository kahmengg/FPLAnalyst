\
from __future__ import annotations

import math
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_poisson_deviance

from .models import build_models, feature_columns


def _safe_pred(pred):
    return np.clip(np.asarray(pred, dtype=float), 0.05, 6.0)


def baseline_prediction(train, test):
    # Team rolling/season scoring baseline, shrunk toward league mean.
    league = train["target_goals"].mean()
    team_mean = train.groupby("team_name")["target_goals"].mean()
    pred = test["team_name"].map(team_mean).fillna(league)
    return np.clip(0.70 * pred.to_numpy() + 0.30 * league, 0.05, 6.0)


def walk_forward_backtest(rows: pd.DataFrame, min_train_gw: int = 8):
    rows = rows.sort_values("gameweek").copy()
    max_gw = int(rows["gameweek"].max())

    all_preds = []
    for gw in range(min_train_gw + 1, max_gw + 1):
        train = rows[rows["gameweek"] <= gw - 1].copy()
        test = rows[rows["gameweek"] == gw].copy()
        if train.empty or test.empty:
            continue

        X_cols = feature_columns(rows)

        # Baseline
        bp = baseline_prediction(train, test)
        for i, (_, r) in enumerate(test.iterrows()):
            all_preds.append({
                "model": "baseline",
                "gameweek": gw,
                "team_name": r["team_name"],
                "opponent_team_name": r["opponent_team_name"],
                "actual_goals": r["target_goals"],
                "pred_goals": float(bp[i]),
            })

        # ML models
        for name, model in build_models(train).items():
            model.fit(train[X_cols], train["target_goals"])
            pred = _safe_pred(model.predict(test[X_cols]))
            for i, (_, r) in enumerate(test.iterrows()):
                all_preds.append({
                    "model": name,
                    "gameweek": gw,
                    "team_name": r["team_name"],
                    "opponent_team_name": r["opponent_team_name"],
                    "actual_goals": r["target_goals"],
                    "pred_goals": float(pred[i]),
                })

    preds = pd.DataFrame(all_preds)
    metrics = []
    for model_name, g in preds.groupby("model"):
        y = g["actual_goals"].to_numpy()
        p = _safe_pred(g["pred_goals"].to_numpy())
        metrics.append({
            "model": model_name,
            "rows": len(g),
            "MAE": mean_absolute_error(y, p),
            "RMSE": mean_squared_error(y, p) ** 0.5,
            "PoissonDeviance": mean_poisson_deviance(y, p),
        })

    return pd.DataFrame(metrics).sort_values(["MAE", "RMSE"]), preds
