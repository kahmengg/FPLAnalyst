from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd

LOGGER = logging.getLogger(__name__)

REQUIRED_STATS = {
    "id", "team_name", "opponent_team_name", "gameweek", "was_home",
    "minutes", "goals", "assists", "expected_goals", "expected_assists",
    "total_shots", "chances_created", "expected_goals_conceded",
    "goals_conceded",
}
REQUIRED_FIXTURES = {"gameweek", "home_team", "away_team"}
REQUIRED_TABLE = {"team", "position", "points"}

NUMERIC = [
    "gameweek", "minutes", "goals", "assists", "expected_goals",
    "expected_assists", "total_shots", "chances_created",
    "expected_goals_conceded", "goals_conceded",
]

# Canonicalise known source aliases once, at the CSV boundary.
TEAM_ALIASES = {
    "Tottenham": "Spurs",
    "Nottm Forest": "Nott'm Forest",
}


def _normalise_team_names(series: pd.Series) -> pd.Series:
    return series.astype(str).str.strip().replace(TEAM_ALIASES)


def _boolish(v: object) -> int:
    text = str(v).strip().lower()
    if text in {"true", "1", "t", "yes", "y"}:
        return 1
    if text in {"false", "0", "f", "no", "n"}:
        return 0
    raise ValueError(f"Unrecognised was_home value: {v!r}")


def _numeric_diagnostics(df: pd.DataFrame, columns: list[str], label: str) -> None:
    nulls = {c: int(df[c].isna().sum()) for c in columns if df[c].isna().any()}
    infs = {
        c: int(np.isinf(df[c].to_numpy(dtype=float)).sum())
        for c in columns
        if np.isinf(df[c].to_numpy(dtype=float)).any()
    }
    LOGGER.info("%s numeric null counts: %s", label, nulls or "none")
    LOGGER.info("%s numeric inf counts: %s", label, infs or "none")
    if nulls or infs:
        raise ValueError(
            f"{label} contains invalid required numeric values; "
            f"null/non-numeric={nulls or 'none'}, inf={infs or 'none'}"
        )


def load_stats(path: Path) -> pd.DataFrame:
    path = Path(path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Stats CSV not found: {path}")

    LOGGER.info("Loading stats: %s", path)
    df = pd.read_csv(path, dtype=str)
    df.columns = [c.strip() for c in df.columns]
    LOGGER.info("Loaded stats rows=%d columns=%d", len(df), len(df.columns))

    missing = sorted(REQUIRED_STATS - set(df.columns))
    LOGGER.info("Missing required stats columns: %s", missing or "none")
    if missing:
        raise ValueError(f"Stats CSV missing columns: {', '.join(missing)}")

    df = df.map(lambda x: x.strip() if isinstance(x, str) else x)
    exact_duplicates = int(df.duplicated().sum())
    if exact_duplicates:
        LOGGER.warning("Dropping %d exact duplicate stats rows", exact_duplicates)
        df = df.drop_duplicates().copy()

    for col in NUMERIC:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    _numeric_diagnostics(df, NUMERIC, "Stats CSV")

    df["gameweek"] = df["gameweek"].astype(int)
    df["was_home"] = df["was_home"].map(_boolish)
    df["team_name"] = _normalise_team_names(df["team_name"])
    df["opponent_team_name"] = _normalise_team_names(df["opponent_team_name"])

    # A player can have two rows in a double gameweek. The true key includes
    # opponent and venue, rather than only player and gameweek.
    key = ["id", "gameweek", "opponent_team_name", "was_home"]
    duplicate_mask = df.duplicated(key, keep=False)
    LOGGER.info("Duplicate player/fixture keys: %d", int(duplicate_mask.sum()))
    if duplicate_mask.any():
        sample = df.loc[duplicate_mask, key + ["team_name"]].head(10)
        raise ValueError(
            "Conflicting duplicate player/fixture rows found. Sample:\n"
            + sample.to_string(index=False)
        )

    player_gw_duplicates = df.duplicated(["id", "gameweek"], keep=False)
    if player_gw_duplicates.any():
        double_gws = sorted(df.loc[player_gw_duplicates, "gameweek"].unique().tolist())
        LOGGER.info(
            "Detected legitimate double-gameweek player rows: rows=%d gameweeks=%s",
            int(player_gw_duplicates.sum()),
            double_gws,
        )

    LOGGER.info(
        "Stats GW range=%d-%d teams=%d: %s",
        df["gameweek"].min(), df["gameweek"].max(), df["team_name"].nunique(),
        sorted(df["team_name"].unique().tolist()),
    )
    return df


def load_fixtures(path: Path) -> pd.DataFrame:
    path = Path(path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Fixture CSV not found: {path}")

    LOGGER.info("Loading fixtures: %s", path)
    fx = pd.read_csv(path, dtype=str)
    fx.columns = [c.strip() for c in fx.columns]
    LOGGER.info("Loaded fixture rows=%d columns=%d", len(fx), len(fx.columns))

    missing = sorted(REQUIRED_FIXTURES - set(fx.columns))
    LOGGER.info("Missing required fixture columns: %s", missing or "none")
    if missing:
        raise ValueError(f"Fixture CSV missing columns: {', '.join(missing)}")

    fx = fx[["gameweek", "home_team", "away_team"]].copy()
    fx["gameweek"] = pd.to_numeric(fx["gameweek"], errors="coerce")
    if fx["gameweek"].isna().any() or np.isinf(fx["gameweek"]).any():
        raise ValueError("Fixture CSV has blank, non-numeric, or infinite gameweeks")
    fx["gameweek"] = fx["gameweek"].astype(int)
    fx["home_team"] = _normalise_team_names(fx["home_team"])
    fx["away_team"] = _normalise_team_names(fx["away_team"])

    if (fx["home_team"] == fx["away_team"]).any():
        raise ValueError("Fixture CSV contains a team playing itself")
    if fx.duplicated(["gameweek", "home_team", "away_team"]).any():
        raise ValueError("Fixture CSV contains duplicate fixture rows")

    teams = sorted(set(fx["home_team"]) | set(fx["away_team"]))
    LOGGER.info(
        "Fixture GW range=%d-%d teams=%d: %s",
        fx["gameweek"].min(), fx["gameweek"].max(), len(teams), teams,
    )
    return fx.sort_values(["gameweek", "home_team", "away_team"]).reset_index(drop=True)


def validate_season(
    stats: pd.DataFrame,
    fixtures: pd.DataFrame,
    label: str,
    *,
    allow_rescheduled: bool = False,
) -> None:
    """Validate stats and fixture alignment before feature engineering."""
    stats_teams = set(stats["team_name"]) | set(stats["opponent_team_name"])
    fixture_teams = set(fixtures["home_team"]) | set(fixtures["away_team"])
    stats_only = sorted(stats_teams - fixture_teams)
    fixtures_only = sorted(fixture_teams - stats_teams)
    LOGGER.info(
        "%s team-name mismatches: stats-only=%s fixtures-only=%s",
        label, stats_only or "none", fixtures_only or "none",
    )
    if stats_only or fixtures_only:
        raise ValueError(
            f"{label} team-name mismatch: stats-only={stats_only}, "
            f"fixtures-only={fixtures_only}"
        )

    stat_matches = stats[[
        "gameweek", "team_name", "opponent_team_name", "was_home"
    ]].drop_duplicates()
    home = fixtures.assign(was_home=1).rename(
        columns={"home_team": "team_name", "away_team": "opponent_team_name"}
    )
    away = fixtures.assign(was_home=0).rename(
        columns={"away_team": "team_name", "home_team": "opponent_team_name"}
    )
    scheduled = pd.concat([home, away], ignore_index=True)[stat_matches.columns]
    aligned = stat_matches.merge(scheduled, how="left", indicator=True)
    unmatched = aligned[aligned["_merge"] == "left_only"].drop(columns="_merge")
    LOGGER.info(
        "%s completed team-match contexts=%d unmatched-to-fixtures=%d",
        label, len(stat_matches), len(unmatched),
    )
    if not unmatched.empty:
        # A completed historical file may use actual rescheduled GWs while a
        # template retains the original GWs. Accept only when every home/away
        # pairing still exists in the schedule; otherwise this is a true mismatch.
        identity = ["team_name", "opponent_team_name", "was_home"]
        known_pair = unmatched.merge(
            scheduled[identity].drop_duplicates(), on=identity, how="left", indicator=True
        )
        rescheduled_only = bool((known_pair["_merge"] == "both").all())
        if allow_rescheduled and rescheduled_only:
            LOGGER.warning(
                "%s fixture template has %d team rows (%d fixtures) at original "
                "rather than actual rescheduled GWs. Stats GWs will be used for training.",
                label, len(unmatched), len(unmatched) // 2,
            )
            return
        raise ValueError(
            f"{label} stats contain matches absent from the fixture file. Sample:\n"
            + unmatched.head(10).to_string(index=False)
        )


def build_team_matches(stats: pd.DataFrame) -> pd.DataFrame:
    """Convert player/fixture rows into paired team/fixture rows."""
    match_key = ["team_name", "opponent_team_name", "gameweek", "was_home"]
    active = stats[stats["minutes"] > 0].copy()

    attack = (
        active.groupby(match_key, as_index=False)
        .agg(
            goals=("goals", "sum"), xg=("expected_goals", "sum"),
            assists=("assists", "sum"), xa=("expected_assists", "sum"),
            shots=("total_shots", "sum"),
            chances_created=("chances_created", "sum"),
        )
    )
    contexts = stats[match_key].drop_duplicates()
    team_matches = contexts.merge(attack, on=match_key, how="left")
    attack_cols = ["goals", "xg", "assists", "xa", "shots", "chances_created"]
    team_matches[attack_cols] = team_matches[attack_cols].fillna(0)

    # Join the exact reverse side. This stays one-to-one in double gameweeks.
    opponent = team_matches.rename(columns={
        "team_name": "opponent_team_name",
        "opponent_team_name": "team_name",
        "was_home": "opponent_was_home",
        "goals": "goals_conceded",
        "xg": "xgc",
        "shots": "shots_conceded",
        "chances_created": "chances_conceded",
    })[[
        "team_name", "opponent_team_name", "gameweek", "opponent_was_home",
        "goals_conceded", "xgc", "shots_conceded", "chances_conceded",
    ]]
    team_matches = team_matches.merge(
        opponent,
        on=["team_name", "opponent_team_name", "gameweek"],
        how="left",
        validate="one_to_one",
    )
    invalid_side = team_matches["opponent_was_home"] == team_matches["was_home"]
    missing_opponent = team_matches["goals_conceded"].isna() | invalid_side
    if missing_opponent.any():
        sample = team_matches.loc[missing_opponent, match_key].head(10)
        raise ValueError(
            "Could not pair both teams for some completed matches. Sample:\n"
            + sample.to_string(index=False)
        )

    team_matches = team_matches.drop(columns="opponent_was_home")
    team_matches["clean_sheet"] = (team_matches["goals_conceded"] == 0).astype(int)
    LOGGER.info(
        "Produced team-match rows=%d (%d fixtures)",
        len(team_matches), len(team_matches) // 2,
    )
    return team_matches.sort_values(
        ["gameweek", "team_name", "opponent_team_name"]
    ).reset_index(drop=True)


def build_fixture_matches(team_matches: pd.DataFrame) -> pd.DataFrame:
    """Pair team rows into one completed-fixture row with an H/D/A target."""
    metrics = [
        "goals", "xg", "shots", "chances_created", "goals_conceded", "xgc",
        "shots_conceded", "chances_conceded", "clean_sheet",
    ]
    home = team_matches[team_matches["was_home"] == 1][
        ["gameweek", "team_name", "opponent_team_name"] + metrics
    ].rename(columns={
        "team_name": "home_team",
        "opponent_team_name": "away_team",
        **{c: f"home_{c}" for c in metrics},
    })
    away = team_matches[team_matches["was_home"] == 0][
        ["gameweek", "team_name", "opponent_team_name"] + metrics
    ].rename(columns={
        "team_name": "away_team",
        "opponent_team_name": "home_team",
        **{c: f"away_{c}" for c in metrics},
    })
    fixtures = home.merge(
        away,
        on=["gameweek", "home_team", "away_team"],
        how="inner",
        validate="one_to_one",
    )
    if len(fixtures) * 2 != len(team_matches):
        raise ValueError(
            f"Completed fixture pairing failed: team rows={len(team_matches)}, "
            f"paired fixtures={len(fixtures)}"
        )
    for side in ("home", "away"):
        goals = fixtures[f"{side}_goals"]
        if (goals < 0).any() or not np.allclose(goals, goals.round()):
            raise ValueError(f"Completed fixtures contain impossible {side} goal values")
        fixtures[f"{side}_goals"] = goals.round().astype(int)
    fixtures["actual_result"] = np.select(
        [fixtures["home_goals"] > fixtures["away_goals"],
         fixtures["home_goals"] < fixtures["away_goals"]],
        ["H", "A"],
        default="D",
    )
    LOGGER.info(
        "Produced completed fixture rows=%d result_counts=%s",
        len(fixtures), fixtures["actual_result"].value_counts().to_dict(),
    )
    return fixtures.sort_values(
        ["gameweek", "home_team", "away_team"]
    ).reset_index(drop=True)


def load_final_table(path: Path) -> pd.DataFrame:
    """Load an auditable previous-season points table used only as an Elo prior."""
    path = Path(path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Previous-season final table not found: {path}")
    LOGGER.info("Loading previous-season table: %s", path)
    table = pd.read_csv(path)
    table.columns = table.columns.str.strip()
    missing = sorted(REQUIRED_TABLE - set(table.columns))
    if missing:
        raise ValueError(f"Final table missing columns: {', '.join(missing)}")
    table = table[["team", "position", "points"]].copy()
    table["team"] = _normalise_team_names(table["team"])
    for col in ["position", "points"]:
        table[col] = pd.to_numeric(table[col], errors="coerce")
    if table[["position", "points"]].isna().any().any():
        raise ValueError("Final table contains blank or non-numeric position/points")
    table[["position", "points"]] = table[["position", "points"]].astype(int)
    if table["team"].duplicated().any() or table["position"].duplicated().any():
        raise ValueError("Final table contains duplicate teams or positions")
    if set(table["position"]) != set(range(1, len(table) + 1)):
        raise ValueError("Final-table positions must be contiguous starting at 1")
    if (table["points"] < 0).any():
        raise ValueError("Final-table points cannot be negative")
    LOGGER.info(
        "Previous table rows=%d points_range=%d-%d",
        len(table), table["points"].min(), table["points"].max(),
    )
    return table.sort_values("position").reset_index(drop=True)


def derive_final_table(fixtures: pd.DataFrame) -> pd.DataFrame:
    """Derive a final points table from a complete fixture-result dataset."""
    home = fixtures[["home_team", "home_goals", "away_goals"]].rename(
        columns={"home_team": "team", "home_goals": "gf", "away_goals": "ga"}
    )
    away = fixtures[["away_team", "away_goals", "home_goals"]].rename(
        columns={"away_team": "team", "away_goals": "gf", "home_goals": "ga"}
    )
    rows = pd.concat([home, away], ignore_index=True)
    rows["points"] = np.select(
        [rows["gf"] > rows["ga"], rows["gf"] == rows["ga"]], [3, 1], default=0
    )
    table = rows.groupby("team", as_index=False).agg(
        played=("team", "size"), points=("points", "sum"), goals_for=("gf", "sum"),
    )
    goal_difference = rows.assign(gd=rows["gf"] - rows["ga"]).groupby("team")["gd"].sum()
    table["goal_difference"] = table["team"].map(goal_difference)
    table = table.sort_values(
        ["points", "goal_difference", "goals_for", "team"],
        ascending=[False, False, False, True],
    ).reset_index(drop=True)
    table["position"] = np.arange(1, len(table) + 1)
    return table[["team", "position", "points", "played", "goal_difference", "goals_for"]]
