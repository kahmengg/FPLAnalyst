\
from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd

REQUIRED_STATS = {
    "id", "team_name", "opponent_team_name", "gameweek", "was_home",
    "minutes", "goals", "assists", "expected_goals", "expected_assists",
    "total_shots", "chances_created", "expected_goals_conceded",
    "goals_conceded",
}
REQUIRED_FIXTURES = {"gameweek", "home_team", "away_team"}

NUMERIC = [
    "gameweek", "minutes", "goals", "assists", "expected_goals",
    "expected_assists", "total_shots", "chances_created",
    "expected_goals_conceded", "goals_conceded",
]


def _boolish(v) -> int:
    if isinstance(v, bool):
        return int(v)
    return int(str(v).strip().lower() in {"true", "1", "t", "yes", "y"})


def load_stats(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Stats CSV not found: {path}")

    df = pd.read_csv(path, dtype=str)
    df.columns = [c.strip() for c in df.columns]

    missing = sorted(REQUIRED_STATS - set(df.columns))
    if missing:
        raise ValueError(f"Stats CSV missing columns: {', '.join(missing)}")

    df = df.map(lambda x: x.strip() if isinstance(x, str) else x)
    df = df.drop_duplicates().copy()

    for col in NUMERIC:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df["gameweek"] = df["gameweek"].astype(int)
    df["was_home"] = df["was_home"].map(_boolish)

    # Hard fail if one player has multiple conflicting rows for one GW.
    key = ["id", "gameweek"]
    if df.duplicated(key).any():
        sample = df.loc[df.duplicated(key, keep=False), key + ["team_name"]].head(10)
        raise ValueError(
            "Conflicting duplicate player/gameweek rows found. Sample:\\n"
            + sample.to_string(index=False)
        )
    return df


def load_fixtures(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Fixture CSV not found: {path}")

    fx = pd.read_csv(path, dtype=str)
    fx.columns = [c.strip() for c in fx.columns]

    missing = sorted(REQUIRED_FIXTURES - set(fx.columns))
    if missing:
        raise ValueError(f"Fixture CSV missing columns: {', '.join(missing)}")

    fx = fx[["gameweek", "home_team", "away_team"]].copy()
    fx["gameweek"] = pd.to_numeric(fx["gameweek"], errors="raise").astype(int)
    fx["home_team"] = fx["home_team"].astype(str).str.strip()
    fx["away_team"] = fx["away_team"].astype(str).str.strip()

    if fx.duplicated().any():
        raise ValueError("Fixture CSV contains duplicate rows.")
    return fx.sort_values(["gameweek", "home_team", "away_team"]).reset_index(drop=True)


def build_team_matches(stats: pd.DataFrame) -> pd.DataFrame:
    """
    Convert one-row-per-player-per-GW input into one-row-per-team-per-GW.

    Attack is summed from players with minutes > 0.
    Defensive outcomes are reconstructed from the opponent's attacking totals
    whenever both sides are present, avoiding player-level defensive leakage.
    """
    active = stats[stats["minutes"] > 0].copy()

    att = (
        active.groupby(["team_name", "gameweek"], as_index=False)
        .agg(
            goals=("goals", "sum"),
            xg=("expected_goals", "sum"),
            assists=("assists", "sum"),
            xa=("expected_assists", "sum"),
            shots=("total_shots", "sum"),
            chances_created=("chances_created", "sum"),
        )
    )

    context = (
        stats.sort_values(["team_name", "gameweek", "minutes"], ascending=[True, True, False])
        .drop_duplicates(["team_name", "gameweek"])
        [["team_name", "gameweek", "opponent_team_name", "was_home"]]
    )

    tm = context.merge(att, on=["team_name", "gameweek"], how="left").fillna(0)

    # opponent lookup lets us define GC/xGC directly from the other team's attack
    opp = tm[["team_name", "gameweek", "goals", "xg", "shots", "chances_created"]].rename(
        columns={
            "team_name": "opponent_team_name",
            "goals": "goals_conceded",
            "xg": "xgc",
            "shots": "shots_conceded",
            "chances_created": "chances_conceded",
        }
    )
    tm = tm.merge(opp, on=["opponent_team_name", "gameweek"], how="left")

    # Fallback only if an opponent row is absent.
    if tm["goals_conceded"].isna().any() or tm["xgc"].isna().any():
        fallback = (
            stats.sort_values(["team_name", "gameweek", "minutes"], ascending=[True, True, False])
            .drop_duplicates(["team_name", "gameweek"])
            [["team_name", "gameweek", "goals_conceded", "expected_goals_conceded"]]
            .rename(columns={"expected_goals_conceded": "fallback_xgc"})
        )
        tm = tm.merge(fallback, on=["team_name", "gameweek"], how="left")
        tm["goals_conceded"] = tm["goals_conceded"].fillna(tm["goals_conceded_y"] if "goals_conceded_y" in tm else 0)
        if "goals_conceded_x" in tm:
            tm["goals_conceded"] = tm["goals_conceded_x"].fillna(tm["goals_conceded_y"])
        tm["xgc"] = tm["xgc"].fillna(tm["fallback_xgc"])
        drop_cols = [c for c in ["goals_conceded_x", "goals_conceded_y", "fallback_xgc"] if c in tm.columns]
        tm = tm.drop(columns=drop_cols)

    tm["clean_sheet"] = (tm["goals_conceded"].fillna(0) == 0).astype(int)
    return tm.sort_values(["gameweek", "team_name"]).reset_index(drop=True)
