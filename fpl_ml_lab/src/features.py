\
from __future__ import annotations
import numpy as np
import pandas as pd

BASE_METRICS = [
    "goals", "xg", "shots", "chances_created",
    "goals_conceded", "xgc", "shots_conceded", "chances_conceded",
    "clean_sheet",
]


def _pre_match_rolling(team_matches: pd.DataFrame, window: int) -> pd.DataFrame:
    """
    Rolling features shifted by one match so GW N never sees GW N outcomes.
    """
    df = team_matches.sort_values(["team_name", "gameweek"]).copy()
    grouped = df.groupby("team_name", group_keys=False)

    for metric in BASE_METRICS:
        df[f"{metric}_r{window}"] = grouped[metric].transform(
            lambda s: s.shift(1).rolling(window, min_periods=1).mean()
        )

    # Expanding season-to-date form, also shifted.
    for metric in ["goals", "xg", "shots", "chances_created", "goals_conceded", "xgc"]:
        df[f"{metric}_season"] = grouped[metric].transform(
            lambda s: s.shift(1).expanding(min_periods=1).mean()
        )

    df["matches_prior"] = grouped.cumcount()
    return df


def make_training_rows(team_matches: pd.DataFrame) -> pd.DataFrame:
    """
    One row predicts one team's goals in one fixture.

    Features contain only information available BEFORE the target gameweek.
    """
    df = _pre_match_rolling(team_matches, 5)
    df = _pre_match_rolling(df, 10)

    own_cols = [
        "team_name", "gameweek", "opponent_team_name", "was_home", "goals",
        "matches_prior",
    ] + [c for c in df.columns if c.endswith("_r5") or c.endswith("_r10") or c.endswith("_season")]

    own = df[own_cols].copy()

    opp_feature_cols = [
        c for c in own.columns
        if c not in {"team_name", "gameweek", "opponent_team_name", "was_home", "goals"}
    ]
    opp = own[["team_name", "gameweek"] + opp_feature_cols].rename(
        columns={
            "team_name": "opponent_team_name",
            **{c: f"opp_{c}" for c in opp_feature_cols}
        }
    )

    rows = own.merge(opp, on=["opponent_team_name", "gameweek"], how="left")
    rows = rows.rename(columns={"goals": "target_goals"})
    rows["home"] = rows["was_home"].astype(int)

    # Early GWs naturally have NaNs; filling with league-neutral zero after standardization
    # would be misleading. Use the column median available from historical rows.
    numeric_cols = rows.select_dtypes(include=[np.number]).columns
    for c in numeric_cols:
        if c != "target_goals":
            rows[c] = rows[c].fillna(rows[c].median())
    return rows


def make_future_fixture_rows(team_matches: pd.DataFrame, fixtures: pd.DataFrame) -> pd.DataFrame:
    """
    Build pre-match features for fixtures later than the latest completed GW.
    """
    latest_completed = int(team_matches["gameweek"].max())
    feature_history = _pre_match_rolling(team_matches, 5)
    feature_history = _pre_match_rolling(feature_history, 10)

    # For future fixtures, derive latest known state from completed matches.
    feature_cols = [
        c for c in feature_history.columns
        if c.endswith("_r5") or c.endswith("_r10") or c.endswith("_season")
    ]

    # Recompute state including all completed games because shifted training features
    # represent the state before each historic match. For future rows, use trailing actuals.
    hist = team_matches.sort_values(["team_name", "gameweek"]).copy()
    latest_rows = []
    for team, g in hist.groupby("team_name"):
        g = g.sort_values("gameweek")
        row = {"team_name": team, "matches_prior": len(g)}
        for metric in BASE_METRICS:
            row[f"{metric}_r5"] = g[metric].tail(5).mean()
            row[f"{metric}_r10"] = g[metric].tail(10).mean()
        for metric in ["goals", "xg", "shots", "chances_created", "goals_conceded", "xgc"]:
            row[f"{metric}_season"] = g[metric].mean()
        latest_rows.append(row)

    state = pd.DataFrame(latest_rows)
    state_map = state.set_index("team_name").to_dict(orient="index")

    future = fixtures[fixtures["gameweek"] > latest_completed].copy()
    rows = []
    for _, fx in future.iterrows():
        for team, opp, home in [
            (fx["home_team"], fx["away_team"], 1),
            (fx["away_team"], fx["home_team"], 0),
        ]:
            own = state_map.get(team)
            other = state_map.get(opp)
            if not own or not other:
                continue
            row = {
                "team_name": team,
                "opponent_team_name": opp,
                "gameweek": int(fx["gameweek"]),
                "home": home,
                "matches_prior": own["matches_prior"],
                "opp_matches_prior": other["matches_prior"],
            }
            for k, v in own.items():
                if k != "matches_prior":
                    row[k] = v
            for k, v in other.items():
                if k != "matches_prior":
                    row[f"opp_{k}"] = v
            rows.append(row)

    return pd.DataFrame(rows)
