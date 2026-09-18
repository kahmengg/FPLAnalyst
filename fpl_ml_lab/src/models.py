\
from __future__ import annotations

import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import PoissonRegressor, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

CATEGORICAL = ["team_name", "opponent_team_name"]

def feature_columns(df):
    excluded = {"target_goals", "gameweek", "was_home"}
    return [c for c in df.columns if c not in excluded]


def _preprocessor(df):
    features = feature_columns(df)
    cats = [c for c in CATEGORICAL if c in features]
    nums = [c for c in features if c not in cats]

    numeric = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    categorical = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore")),
    ])
    return ColumnTransformer([
        ("num", numeric, nums),
        ("cat", categorical, cats),
    ])


def build_models(df):
    pre = _preprocessor(df)

    return {
        "poisson": Pipeline([
            ("prep", pre),
            ("model", PoissonRegressor(alpha=0.25, max_iter=2000)),
        ]),
        "ridge": Pipeline([
            ("prep", pre),
            ("model", Ridge(alpha=2.0)),
        ]),
        "random_forest": Pipeline([
            ("prep", pre),
            ("model", RandomForestRegressor(
                n_estimators=350,
                max_depth=8,
                min_samples_leaf=4,
                random_state=42,
                n_jobs=-1,
            )),
        ]),
        "hist_gradient_boosting": Pipeline([
            ("prep", pre),
            ("model", HistGradientBoostingRegressor(
                max_iter=250,
                learning_rate=0.05,
                max_leaf_nodes=15,
                l2_regularization=1.0,
                random_state=42,
            )),
        ]),
    }
