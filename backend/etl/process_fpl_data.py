#!/usr/bin/env python3
"""
FPL ETL Pipeline
CSV → Supabase (teams / players / player_gameweeks / player_season_stats / team_rankings / fixtures)

Usage:
    python -m backend.etl.process_fpl_data --season 2026_27
"""

import argparse
import os
import sys
from datetime import datetime
from typing import Optional

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import numpy as np
import pandas as pd
from config.config import Config
from utils.supabase_client import get_admin_client

# Keep CLI output portable on Windows terminals that otherwise default to CP-1252.
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

# ── Constants ────────────────────────────────────────────────────────────────

TEAM_SHORT = {
    "Arsenal": "ARS", "Aston Villa": "AVL", "Bournemouth": "BOU",
    "Brentford": "BRE", "Brighton": "BHA", "Burnley": "BUR",
    "Chelsea": "CHE", "Coventry": "COV", "Crystal Palace": "CRY", "Everton": "EVE",
    "Fulham": "FUL", "Hull": "HUL", "Leeds": "LEE", "Leicester": "LEI",
    "Liverpool": "LIV", "Man City": "MCI", "Man Utd": "MUN",
    "Newcastle": "NEW", "Nott'm Forest": "NFO", "Sunderland": "SUN",
    "Spurs": "TOT", "West Ham": "WHU", "Wolves": "WOL",
    "Ipswich": "IPS", "Southampton": "SOU",
}

CHUNK       = 500
FORM_GWS    = 5   # number of recent GWs used to calculate form
LAST_5_GWS  = 5   # rolling window for form-based attack/defense rankings
LAST_10_GWS = 10  # rolling window for home/away strength modifiers
DEFAULT_SEASON = os.getenv("FPL_DATA_SEASON", "2026_27")

# Analytical model configuration. Composite strengths are stored on a 0-100
# scale so unlike raw xG/goals/shots they can be weighted meaningfully.
ATTACK_WEIGHTS = {"xg": 0.40, "goals": 0.30, "shots": 0.15, "chances": 0.15}
DEFENSE_WEIGHTS = {"xgc": 0.55, "gc": 0.35, "cs": 0.10}
OPPONENT_ADJUSTMENT_MIN = 0.85
OPPONENT_ADJUSTMENT_MAX = 1.15
PLAYER_INSIGHT_SCORE_VERSION = "role-v1"
POSITION_NAMES = {1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward"}

# Initialized in main() so importing validation helpers never opens a write
# client. All ETL writes require the Supabase service-role key.
supabase = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def chunks(lst: list, n: int = CHUNK):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def short(team_name: str) -> str:
    return TEAM_SHORT.get(str(team_name).strip(), str(team_name)[:3].upper())


def safe_float(v) -> Optional[float]:
    """Return float or None — handles NaN, empty string, None."""
    if v is None:
        return None
    if isinstance(v, float) and np.isnan(v):
        return None
    try:
        s = str(v).strip()
        return None if s == "" else float(s)
    except (ValueError, TypeError):
        return None


def safe_int(v) -> Optional[int]:
    """Return int or None — handles NaN, empty string, None."""
    f = safe_float(v)
    return None if f is None else int(f)


def safe_bool(v) -> bool:
    if v is None:
        return False
    if isinstance(v, bool):
        return v
    if isinstance(v, float) and np.isnan(v):
        return False
    return str(v).strip().lower() in {"true", "1", "t", "yes", "y"}


def r3(v) -> Optional[float]:
    """Round to 3dp, return None if invalid."""
    f = safe_float(v)
    return None if f is None else round(f, 3)


def upsert(table: str, records: list, conflict: str):
    if not records:
        return
    if supabase is None:
        raise RuntimeError("Supabase admin client has not been initialized")
    for chunk in chunks(records):
        supabase.table(table).upsert(chunk, on_conflict=conflict).execute()


def normalized_score(series: pd.Series, higher_is_better: bool = True) -> pd.Series:
    """Standardize a league-wide metric to a stable 0-100 strength score.

    A clipped z-score preserves meaningful gaps between teams while preventing a
    single outlier from dominating the composite. 50 is league average; roughly
    +/- 1 standard deviation maps to 70/30.
    """
    values = pd.to_numeric(series, errors="coerce").astype(float)
    if values.empty:
        return values
    mean = values.mean()
    std = values.std(ddof=0)
    if not np.isfinite(std) or std < 1e-9:
        score = pd.Series(50.0, index=values.index)
    else:
        z = ((values - mean) / std).clip(-2.5, 2.5)
        score = 50.0 + 20.0 * z
    if not higher_is_better:
        score = 100.0 - score
    return score.clip(0.0, 100.0)


def weighted_strength(frame: pd.DataFrame, specs: list[tuple[str, float, bool]]) -> pd.Series:
    """Combine normalized metrics; specs are (column, weight, higher_is_better)."""
    total = pd.Series(0.0, index=frame.index)
    weight_sum = 0.0
    for column, weight, higher_is_better in specs:
        if column not in frame.columns or weight <= 0:
            continue
        total += normalized_score(frame[column], higher_is_better) * weight
        weight_sum += weight
    if weight_sum <= 0:
        return pd.Series(50.0, index=frame.index)
    return (total / weight_sum).clip(0.0, 100.0)


def recent_weight(latest_gw: int) -> float:
    """How much rolling form should influence current strength.

    Through GW5 the recent window is identical to the season sample, so adding a
    separate form weight would double-count the same matches.
    """
    if latest_gw <= 5:
        return 0.0
    if latest_gw <= 9:
        return 0.25
    return 0.35


def opponent_multiplier(strength_0_100: pd.Series) -> pd.Series:
    """Mild schedule adjustment: weak opponent 0.85x, elite opponent 1.15x."""
    s = pd.to_numeric(strength_0_100, errors="coerce").fillna(50.0).clip(0, 100)
    return OPPONENT_ADJUSTMENT_MIN + (
        (OPPONENT_ADJUSTMENT_MAX - OPPONENT_ADJUSTMENT_MIN) * (s / 100.0)
    )


# ── Stage 1: Load & clean CSV ────────────────────────────────────────────────

def load_csv() -> Optional[pd.DataFrame]:
    path = Config.FPL_DATA_CSV
    if not os.path.exists(path):
        print(f"❌ CSV not found: {path}")
        return None

    df = pd.read_csv(path, dtype=str)   # load everything as str first
    df.columns = [c.strip() for c in df.columns]
    required = {
        "id", "element_type", "web_name", "team_name",
        "opponent_team_name", "was_home", "gameweek",
    }
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"FPL CSV is missing required columns: {', '.join(missing)}")
    print(f"✅ Loaded {len(df):,} rows, {len(df.columns)} columns")

    # Strip whitespace from all string cells
    df = df.map(lambda x: x.strip() if isinstance(x, str) else x)

    # Replace empty strings with NaN so downstream helpers work uniformly
    df.replace("", np.nan, inplace=True)

    # Remove byte-for-byte duplicate source rows, but do not silently choose
    # between conflicting rows for the same player/gameweek. Those would make
    # the gameweek and season aggregates disagree.
    before = len(df)
    df = df.drop_duplicates().copy()
    exact_dupes = before - len(df)

    key_df = df.copy()
    key_df["_id_num"] = pd.to_numeric(key_df["id"], errors="coerce")
    key_df["_gw_num"] = pd.to_numeric(key_df["gameweek"], errors="coerce")
    valid_keys = key_df["_id_num"].notna() & key_df["_gw_num"].notna()
    conflicting = valid_keys & key_df.duplicated(["_id_num", "_gw_num"], keep=False)
    if conflicting.any():
        sample = (
            key_df.loc[conflicting, ["id", "web_name", "gameweek", "team_name"]]
            .head(10)
            .to_dict(orient="records")
        )
        raise ValueError(
            "Conflicting duplicate player/gameweek rows found in the source CSV. "
            f"Sample: {sample}"
        )

    if exact_dupes:
        print(f"ℹ️  Removed {exact_dupes} exact duplicate source rows")

    return df


def load_fixture_csv() -> pd.DataFrame:
    """Load and validate the full-season fixture schedule."""
    path = Config.FIXTURE_TEMPLATE_CSV
    if not os.path.exists(path):
        raise FileNotFoundError(f"Fixture CSV not found: {path}")

    fixtures = pd.read_csv(path, dtype=str)
    fixtures.columns = [c.strip() for c in fixtures.columns]
    required = ["gameweek", "home_team", "away_team"]
    result_columns = ["home_score", "away_score", "finished"]
    valid_columns = [required, required + result_columns]
    if list(fixtures.columns) not in valid_columns:
        raise ValueError(
            f"Fixture CSV columns must be {required} or {required + result_columns}; "
            f"got {list(fixtures.columns)}"
        )

    # Legacy checked-in schedules remain processable; the daily sync supplies
    # these result fields before every production ETL run.
    for column in result_columns:
        if column not in fixtures.columns:
            fixtures[column] = None

    fixtures = fixtures.map(lambda x: x.strip() if isinstance(x, str) else x)
    fixtures["gameweek"] = pd.to_numeric(fixtures["gameweek"], errors="coerce")
    if fixtures[required].isna().any().any():
        raise ValueError("Fixture CSV contains blank or invalid required values")
    fixtures["gameweek"] = fixtures["gameweek"].astype(int)

    if fixtures.duplicated(required).any():
        raise ValueError("Fixture CSV contains duplicate fixture rows")
    if len(fixtures) != 380:
        raise ValueError(f"Expected 380 Premier League fixtures; found {len(fixtures)}")
    if not fixtures["gameweek"].between(1, 38).all():
        raise ValueError("Fixture gameweeks must be between 1 and 38")

    teams = set(fixtures["home_team"]) | set(fixtures["away_team"])
    if len(teams) != 20:
        raise ValueError(f"Expected 20 fixture teams; found {len(teams)}")

    appearances = pd.concat([fixtures["home_team"], fixtures["away_team"]]).value_counts()
    if not (appearances == 38).all():
        bad = appearances[appearances != 38].to_dict()
        raise ValueError(f"Every team must have 38 fixtures; invalid counts: {bad}")
    if set(fixtures["gameweek"]) != set(range(1, 39)):
        raise ValueError("Fixture CSV must contain gameweeks 1 through 38")
    if not fixtures.groupby("gameweek").size().eq(10).all():
        raise ValueError("Each fixture gameweek must contain exactly 10 matches")

    per_gameweek = pd.concat([
        fixtures[["gameweek", "home_team"]].rename(columns={"home_team": "team"}),
        fixtures[["gameweek", "away_team"]].rename(columns={"away_team": "team"}),
    ])
    if per_gameweek.duplicated(["gameweek", "team"]).any():
        raise ValueError("A team appears more than once in a fixture gameweek")

    print(f"✅ Loaded {len(fixtures)} fixtures for {len(teams)} teams")
    return fixtures.sort_values(["gameweek", "home_team", "away_team"]).reset_index(drop=True)


def completed_gameweeks(fixtures: pd.DataFrame) -> set[int]:
    """Return only rounds whose ten official fixtures have all finished."""
    if "finished" not in fixtures.columns:
        return set()

    completion = fixtures.assign(
        _finished=fixtures["finished"].map(safe_bool)
    ).groupby("gameweek")["_finished"].all()
    return {int(gameweek) for gameweek, finished in completion.items() if bool(finished)}


# ── Stage 2: Teams ───────────────────────────────────────────────────────────

def upsert_teams(df: pd.DataFrame) -> dict[str, str]:
    """Returns {short_name: team_uuid}"""
    print("\n📊 Teams...")

    names = df["team_name"].dropna().unique()
    rows  = [{"name": n, "short_name": short(n)} for n in names]
    upsert("teams", rows, "name")

    res = supabase.table("teams").select("id, short_name").execute()
    mapping = {r["short_name"]: r["id"] for r in (res.data or [])}
    print(f"   {len(mapping)} teams")
    return mapping


# ── Stage 3: Players ─────────────────────────────────────────────────────────

def upsert_players(df: pd.DataFrame, team_map: dict) -> dict[int, str]:
    """Returns {fpl_id (int): player_uuid}"""
    print("\n👥 Players...")

    # Keep the most recent GW snapshot per player
    df_num = df.copy()
    df_num["gameweek"] = pd.to_numeric(df_num["gameweek"], errors="coerce")
    latest = (
        df_num.sort_values("gameweek")
        .drop_duplicates(subset=["id"], keep="last")
    )

    rows = []
    for _, r in latest.iterrows():
        fpl_id  = safe_int(r.get("id"))
        team_id = team_map.get(short(str(r.get("team_name", ""))))
        pos     = safe_int(r.get("element_type")) or 1
        if fpl_id is None or team_id is None:
            continue
        rows.append({
            "fpl_id":      fpl_id,
            "player_name": str(r.get("web_name", "")),
            "web_name":    str(r.get("web_name", "")),
            "team_id":     team_id,
            "position":    max(1, min(4, pos)),
            "cost":        safe_float(r.get("now_cost")) or 0.0,
            "ownership":   safe_float(r.get("selected_by_percent")),
            "is_active":   True,
        })

    upsert("players", rows, "fpl_id")

    # Players absent from the current source must not remain visible as active
    # after a season rollover or transfer out of the league.
    current_fpl_ids = {row["fpl_id"] for row in rows}
    existing = supabase.table("players").select("fpl_id").eq("is_active", True).execute()
    stale_ids = [
        int(row["fpl_id"])
        for row in (existing.data or [])
        if row.get("fpl_id") is not None and int(row["fpl_id"]) not in current_fpl_ids
    ]
    for stale_chunk in chunks(stale_ids):
        supabase.table("players").update({"is_active": False}).in_(
            "fpl_id", stale_chunk
        ).execute()

    res = supabase.table("players").select("id, fpl_id").execute()
    mapping = {
        int(r["fpl_id"]): r["id"]
        for r in (res.data or [])
        if r.get("fpl_id") is not None
    }
    print(f"   {len(mapping)} players")
    return mapping


# ── Stage 4: Gameweek stats ──────────────────────────────────────────────────

def upsert_gameweek_stats(df: pd.DataFrame, player_map: dict[int, str], season: str):
    print("\n📈 Gameweek stats...")

    rows    = []
    skipped = 0

    for _, r in df.iterrows():
        fpl_id   = safe_int(r.get("id"))
        gameweek = safe_int(r.get("gameweek"))
        if fpl_id is None or not gameweek:
            skipped += 1
            continue
        player_uuid = player_map.get(fpl_id)
        if not player_uuid:
            skipped += 1
            continue

        rows.append({
            "season_key": season,
            "player_id":  player_uuid,
            "gameweek":   gameweek,

            # context
            "opponent": str(r.get("opponent_team_name") or ""),
            "was_home": safe_bool(r.get("was_home")),

            # snapshot
            "now_cost":            safe_float(r.get("now_cost")),
            "selected_by_percent": safe_float(r.get("selected_by_percent")),

            # output
            "total_points": safe_int(r.get("total_points")),
            "minutes":      safe_int(r.get("minutes")),
            "goals":        safe_int(r.get("goals")),
            "assists":      safe_int(r.get("assists")),
            "clean_sheet":  bool(safe_int(r.get("clean_sheet")) or 0),

            # attacking
            "xg":              r3(r.get("expected_goals")),
            "xa":              r3(r.get("expected_assists")),
            "xgi":             r3(r.get("expected_goal_involvements")),
            "shots":           safe_int(r.get("total_shots")),
            "shots_on_target": safe_int(r.get("shots_on_target")),
            "shots_in_box":    safe_int(r.get("shots_in_box")),
            "chances_created": safe_int(r.get("chances_created")),
            "touches":         safe_int(r.get("touches")),
            "touches_opp_box": safe_int(r.get("touches_opp_box")),
            "non_penalty_goals": safe_int(r.get("non_penalty_goals")),
            "non_penalty_xg":    r3(r.get("non_penalty_expected_goals")),
            "non_penalty_xgi":   r3(r.get("non_penalty_expected_goal_involvements")),

            # defensive
            "xgc":              r3(r.get("expected_goals_conceded")),
            "goals_conceded":   safe_int(r.get("goals_conceded")),
            "expected_clean_sheet": r3(r.get("expected_clean_sheet")),
            "clearances_blocks_interceptions": safe_int(r.get("clearances_blocks_interceptions")),
            "recoveries":             safe_int(r.get("recoveries")),
            "tackles":                safe_int(r.get("tackles")),
            "defensive_contribution": r3(r.get("defensive_contribution")),

            # model
            "xp":    r3(r.get("expected_points")),
            "pvsxp": r3(r.get("PvsxP")),
        })

    keys = [(r["season_key"], r["player_id"], r["gameweek"]) for r in rows]
    if len(keys) != len(set(keys)):
        raise ValueError(
            "Duplicate player/gameweek records reached the ETL after source validation"
        )

    for chunk in chunks(rows):
        supabase.table("player_gameweeks").upsert(
            chunk, on_conflict="season_key,player_id,gameweek"
        ).execute()

    print(f"   {len(rows)} records  ({skipped} skipped)")


# ── Stage 5: Season stats ────────────────────────────────────────────────────

def upsert_season_stats(df: pd.DataFrame, player_map: dict[int, str], season: str):
    """Aggregate player_gameweeks → player_season_stats entirely in Pandas."""
    print("\n📊 Season stats...")

    df = df.copy()

    # Map fpl_id → uuid
    df["_pid"] = df["id"].apply(lambda x: player_map.get(safe_int(x)))
    df = df[df["_pid"].notna()].copy()

    # Numeric columns we need — all arrive as strings, coerce safely
    num = {
        "gameweek":                              "int",
        "total_points":                          "float",
        "minutes":                               "float",
        "goals":                                 "float",
        "assists":                               "float",
        "clean_sheet":                           "float",
        "expected_goals":                        "float",
        "expected_assists":                      "float",
        "expected_goal_involvements":            "float",
        "total_shots":                           "float",
        "shots_on_target":                       "float",
        "chances_created":                       "float",
        "touches_opp_box":                       "float",
        "non_penalty_goals":                     "float",
        "non_penalty_expected_goals":            "float",
        "expected_goals_conceded":               "float",
        "goals_conceded":                        "float",
        "clearances_blocks_interceptions":       "float",
        "recoveries":                            "float",
        "tackles":                               "float",
        "defensive_contribution":                "float",
        "expected_points":                       "float",
        "PvsxP":                                 "float",
        "now_cost":                              "float",
    }
    for col, _ in num.items():
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # The source uses True/False strings. Numeric coercion turns both into NaN,
    # which previously classified every appearance as away.
    df["was_home"] = df["was_home"].map(lambda value: int(safe_bool(value)))

    if df.duplicated(subset=["_pid", "gameweek"]).any():
        raise ValueError(
            "Duplicate player/gameweek rows reached season aggregation after source validation"
        )

    latest_gw = int(df["gameweek"].max())

    # ── Overall aggregation ──
    grp = df.groupby("_pid")

    agg = grp.agg(
        gameweeks_played = ("gameweek",                          "nunique"),
        total_minutes    = ("minutes",                           "sum"),
        total_points     = ("total_points",                      "sum"),
        goals            = ("goals",                             "sum"),
        assists          = ("assists",                           "sum"),
        xg               = ("expected_goals",                    "sum"),
        xa               = ("expected_assists",                  "sum"),
        xgi              = ("expected_goal_involvements",        "sum"),
        shots            = ("total_shots",                       "sum"),
        shots_on_target  = ("shots_on_target",                   "sum"),
        chances_created  = ("chances_created",                   "sum"),
        touches_opp_box  = ("touches_opp_box",                   "sum"),
        non_penalty_goals= ("non_penalty_goals",                 "sum"),
        non_penalty_xg   = ("non_penalty_expected_goals",        "sum"),
        clean_sheets     = ("clean_sheet",                       "sum"),
        goals_conceded   = ("goals_conceded",                    "sum"),
        xgc              = ("expected_goals_conceded",           "sum"),
        defensive_contribution = ("defensive_contribution",      "sum"),
        tackles          = ("tackles",                           "sum"),
        cbi              = ("clearances_blocks_interceptions",   "sum"),
        xp_total         = ("expected_points",                   "sum"),
        pvsxp_total      = ("PvsxP",                             "sum"),
        cost_latest      = ("now_cost",                          "last"),
    ).reset_index()

    # ── Per-90 ──
    mins = agg["total_minutes"].clip(lower=1)
    agg["xg_per90"]     = (agg["xg"]           / mins * 90).round(3)
    agg["xa_per90"]     = (agg["xa"]            / mins * 90).round(3)
    agg["xgi_per90"]    = (agg["xgi"]           / mins * 90).round(3)
    agg["shots_per90"]  = (agg["shots"]         / mins * 90).round(3)
    agg["points_per90"] = (agg["total_points"]  / mins * 90).round(3)

    # ── Value ──
    agg["points_per_million"] = (
        agg["total_points"] / agg["cost_latest"].clip(lower=0.1)
    ).round(3)

    # ── Form: avg pts over last FORM_GWS gameweeks ──
    form_window = min(FORM_GWS, latest_gw)
    form_start = max(1, latest_gw - form_window + 1)
    form_df = (
        df[df["gameweek"] >= form_start]
        .groupby("_pid")["total_points"]
        .mean().round(2)
        .rename("form")
        .reset_index()
    )
    last_gw_df = (
        df[df["gameweek"] == latest_gw]
        .groupby("_pid")["total_points"]
        .sum().astype(int)
        .rename("last_gw_points")
        .reset_index()
    )
    agg = agg.merge(form_df,    on="_pid", how="left")
    agg = agg.merge(last_gw_df, on="_pid", how="left")
    agg["form"]           = agg["form"].fillna(0).round(2)
    agg["last_gw_points"] = agg["last_gw_points"].fillna(0).astype(int)

    # ── Home / away splits ──
    home_df = (
        df[df["was_home"] == 1].groupby("_pid").agg(
            home_points = ("total_points",   "sum"),
            home_goals  = ("goals",          "sum"),
            home_xg     = ("expected_goals", "sum"),
        ).round(3).reset_index()
    )
    away_df = (
        df[df["was_home"] == 0].groupby("_pid").agg(
            away_points = ("total_points",   "sum"),
            away_goals  = ("goals",          "sum"),
            away_xg     = ("expected_goals", "sum"),
        ).round(3).reset_index()
    )
    agg = agg.merge(home_df, on="_pid", how="left")
    agg = agg.merge(away_df, on="_pid", how="left")
    for col in ["home_points","home_goals","home_xg","away_points","away_goals","away_xg"]:
        agg[col] = agg[col].fillna(0)

    # ── Build records ──
    rows = []
    for _, r in agg.iterrows():
        rows.append({
            "season_key": season,
            "player_id":  r["_pid"],

            "gameweeks_played":  int(r["gameweeks_played"]),
            "total_minutes":     int(r["total_minutes"]),
            "total_points":      int(r["total_points"]),
            "goals":             int(r["goals"]),
            "assists":           int(r["assists"]),
            "xg":                round(float(r["xg"]),  3),
            "xa":                round(float(r["xa"]),  3),
            "xgi":               round(float(r["xgi"]), 3),
            "shots":             int(r["shots"]),
            "shots_on_target":   int(r["shots_on_target"]),
            "chances_created":   int(r["chances_created"]),
            "touches_opp_box":   int(r["touches_opp_box"]),
            "non_penalty_goals": int(r["non_penalty_goals"]),
            "non_penalty_xg":    round(float(r["non_penalty_xg"]), 3),
            "clean_sheets":      int(r["clean_sheets"]),
            "goals_conceded":    int(r["goals_conceded"]),
            "xgc":               round(float(r["xgc"]), 3),
            "defensive_contribution": round(float(r["defensive_contribution"]), 3),
            "tackles":           int(r["tackles"]),
            "clearances_blocks_interceptions": int(r["cbi"]),
            "xp_total":          round(float(r["xp_total"]),    3),
            "pvsxp_total":       round(float(r["pvsxp_total"]), 3),

            "xg_per90":           float(r["xg_per90"]),
            "xa_per90":           float(r["xa_per90"]),
            "xgi_per90":          float(r["xgi_per90"]),
            "shots_per90":        float(r["shots_per90"]),
            "points_per90":       float(r["points_per90"]),
            "points_per_million": float(r["points_per_million"]),

            "form":            float(r["form"]),
            "last_gw_points":  int(r["last_gw_points"]),

            "home_points":  int(r["home_points"]),
            "home_goals":   int(r["home_goals"]),
            "home_xg":      round(float(r["home_xg"]), 3),
            "away_points":  int(r["away_points"]),
            "away_goals":   int(r["away_goals"]),
            "away_xg":      round(float(r["away_xg"]), 3),

            "updated_at": datetime.utcnow().isoformat(),
        })

    upsert("player_season_stats", rows, "season_key,player_id")
    print(f"   {len(rows)} player season records")


# ── Stage 5b: Role-based player insights ───────────────────────────────────

def _assign_composite_score(
    frame: pd.DataFrame,
    indexes: pd.Index,
    target: str,
    specs: list[tuple[str, float]],
) -> None:
    """Assign a position-relative 0-100 score to eligible rows only."""
    eligible = [idx for idx in indexes if bool(frame.at[idx, "is_eligible"])]
    if not eligible:
        return
    total = pd.Series(0.0, index=eligible, dtype=float)
    weight_sum = 0.0
    for column, weight in specs:
        total += normalized_score(frame.loc[eligible, column]) * weight
        weight_sum += weight
    frame.loc[eligible, target] = (total / weight_sum).clip(0, 100).round(3)


def build_player_role_insights(
    df: pd.DataFrame,
    player_map: dict[int, str],
    season: str,
    team_defense_scores: Optional[dict[str, float]] = None,
) -> list[dict]:
    """Build season and rolling-five player archetype metrics."""
    source = df.copy()
    source["_pid"] = source["id"].apply(lambda value: player_map.get(safe_int(value)))
    source = source[source["_pid"].notna()].copy()
    if source.empty:
        return []

    numeric_columns = [
        "gameweek", "element_type", "minutes", "total_points", "goals", "assists",
        "clean_sheet", "expected_goals", "expected_assists",
        "expected_goal_involvements", "total_shots", "shots_in_box",
        "shots_on_target", "chances_created", "touches_opp_box",
        "defensive_contribution", "expected_goals_conceded",
    ]
    for column in numeric_columns:
        if column not in source.columns:
            source[column] = 0
        source[column] = pd.to_numeric(source[column], errors="coerce").fillna(0)

    available_gameweeks = sorted(source["gameweek"].astype(int).unique().tolist())
    windows = {"season": available_gameweeks, "last_5": available_gameweeks[-LAST_5_GWS:]}
    raw_rows: list[dict] = []

    for window_key, gameweeks in windows.items():
        window = source[source["gameweek"].astype(int).isin(gameweeks)]
        minimum_minutes = min(450, max(90, 60 * len(gameweeks)))

        for _, group in window.groupby("_pid"):
            position_id = max(1, min(4, int(group["element_type"].iloc[-1] or 1)))
            appearances = int((group["minutes"] > 0).sum())
            sixty_rows = group[group["minutes"] >= 60]
            sixty_appearances = int(len(sixty_rows))
            total_minutes = int(group["minutes"].sum())
            denominator_90 = max(total_minutes / 90, 1e-9)
            threshold = 10 if position_id == 2 else 12 if position_id in (3, 4) else None
            dc_returns = int((sixty_rows["defensive_contribution"] >= threshold).sum()) if threshold else 0
            dc_points = int(((group["defensive_contribution"] >= threshold).sum()) * 2) if threshold else 0
            clean_sheets = int(group["clean_sheet"].sum())
            team_code = short(str(group["team_name"].iloc[-1]))

            raw_rows.append({
                "season_key": season,
                "player_id": group["_pid"].iloc[0],
                "window_key": window_key,
                "window_gameweeks": len(gameweeks),
                "score_version": PLAYER_INSIGHT_SCORE_VERSION,
                "position": POSITION_NAMES[position_id],
                "team_code": team_code,
                "is_eligible": total_minutes >= minimum_minutes,
                "appearances": appearances,
                "sixty_minute_appearances": sixty_appearances,
                "total_minutes": total_minutes,
                "total_points": int(group["total_points"].sum()),
                "goals": int(group["goals"].sum()),
                "assists": int(group["assists"].sum()),
                "clean_sheets": clean_sheets,
                "xg": float(group["expected_goals"].sum()),
                "xa": float(group["expected_assists"].sum()),
                "xgi": float(group["expected_goal_involvements"].sum()),
                "shots": int(group["total_shots"].sum()),
                "shots_in_box": int(group["shots_in_box"].sum()),
                "shots_on_target": int(group["shots_on_target"].sum()),
                "chances_created": int(group["chances_created"].sum()),
                "touches_opp_box": int(group["touches_opp_box"].sum()),
                "defensive_contribution": float(group["defensive_contribution"].sum()),
                "xgc": float(group["expected_goals_conceded"].sum()),
                "points_per90": float(group["total_points"].sum()) / denominator_90,
                "goals_per90": float(group["goals"].sum()) / denominator_90,
                "assists_per90": float(group["assists"].sum()) / denominator_90,
                "xg_per90": float(group["expected_goals"].sum()) / denominator_90,
                "xa_per90": float(group["expected_assists"].sum()) / denominator_90,
                "xgi_per90": float(group["expected_goal_involvements"].sum()) / denominator_90,
                "shots_in_box_per90": float(group["shots_in_box"].sum()) / denominator_90,
                "shots_on_target_per90": float(group["shots_on_target"].sum()) / denominator_90,
                "chances_created_per90": float(group["chances_created"].sum()) / denominator_90,
                "touches_opp_box_per90": float(group["touches_opp_box"].sum()) / denominator_90,
                "defensive_contribution_per90": float(group["defensive_contribution"].sum()) / denominator_90,
                "clean_sheet_rate": clean_sheets / max(sixty_appearances, 1),
                "minute_security": sixty_appearances / max(appearances, 1),
                "dc_opportunities": sixty_appearances if threshold else 0,
                "dc_returns": dc_returns,
                "dc_points": dc_points,
                "dc_return_rate": dc_returns / max(sixty_appearances, 1) if threshold else 0,
                "team_defense_strength": float((team_defense_scores or {}).get(team_code, 50)),
                "goal_threat_score": np.nan,
                "creation_score": np.nan,
                "attack_score": np.nan,
                "defensive_floor_score": np.nan,
                "hybrid_score": np.nan,
                "complete_score": np.nan,
                "goalkeeper_score": np.nan,
            })

    insights = pd.DataFrame(raw_rows)
    if insights.empty:
        return []

    for (_, position), indexes in insights.groupby(["window_key", "position"]).groups.items():
        if position != "Goalkeeper":
            _assign_composite_score(insights, indexes, "goal_threat_score", [
                ("xg_per90", 0.40), ("shots_in_box_per90", 0.25),
                ("shots_on_target_per90", 0.20), ("touches_opp_box_per90", 0.15),
            ])
            _assign_composite_score(insights, indexes, "creation_score", [
                ("xa_per90", 0.50), ("chances_created_per90", 0.30),
                ("assists_per90", 0.20),
            ])
            attack_weights = {
                "Forward": (0.70, 0.30),
                "Midfielder": (0.50, 0.50),
                "Defender": (0.45, 0.55),
            }[position]
            eligible = [idx for idx in indexes if bool(insights.at[idx, "is_eligible"])]
            insights.loc[eligible, "attack_score"] = (
                insights.loc[eligible, "goal_threat_score"] * attack_weights[0]
                + insights.loc[eligible, "creation_score"] * attack_weights[1]
            ).round(3)
            _assign_composite_score(insights, indexes, "defensive_floor_score", [
                ("dc_return_rate", 0.60),
                ("defensive_contribution_per90", 0.25),
                ("minute_security", 0.15),
            ])

            if position == "Midfielder":
                attack = insights.loc[eligible, "attack_score"]
                floor = insights.loc[eligible, "defensive_floor_score"]
                insights.loc[eligible, "hybrid_score"] = (
                    2 * attack * floor / (attack + floor).replace(0, np.nan)
                ).fillna(0).round(3)
            elif position == "Defender":
                insights.loc[eligible, "complete_score"] = (
                    insights.loc[eligible, "attack_score"] * 0.40
                    + insights.loc[eligible, "defensive_floor_score"] * 0.35
                    + insights.loc[eligible, "team_defense_strength"] * 0.25
                ).round(3)
        else:
            eligible = [idx for idx in indexes if bool(insights.at[idx, "is_eligible"])]
            if eligible:
                clean_score = normalized_score(insights.loc[eligible, "clean_sheet_rate"])
                points_score = normalized_score(insights.loc[eligible, "points_per90"])
                insights.loc[eligible, "goalkeeper_score"] = (
                    insights.loc[eligible, "team_defense_strength"] * 0.50
                    + clean_score * 0.25
                    + points_score * 0.25
                ).round(3)

    persisted_columns = [
        "season_key", "player_id", "window_key", "window_gameweeks", "score_version",
        "is_eligible", "appearances", "sixty_minute_appearances", "total_minutes",
        "total_points", "goals", "assists", "clean_sheets", "xg", "xa", "xgi",
        "shots", "shots_in_box", "shots_on_target", "chances_created",
        "touches_opp_box", "defensive_contribution", "xgc", "points_per90",
        "goals_per90", "assists_per90", "xg_per90", "xa_per90", "xgi_per90",
        "shots_in_box_per90", "shots_on_target_per90", "chances_created_per90",
        "touches_opp_box_per90", "defensive_contribution_per90", "clean_sheet_rate",
        "minute_security", "dc_opportunities", "dc_returns", "dc_points",
        "dc_return_rate", "goal_threat_score", "creation_score", "attack_score",
        "defensive_floor_score", "hybrid_score", "complete_score", "goalkeeper_score",
    ]
    insights["updated_at"] = datetime.utcnow().isoformat()
    persisted_columns.append("updated_at")
    clean = insights[persisted_columns].replace([np.inf, -np.inf], np.nan)
    clean = clean.astype(object).where(pd.notna(clean), None)
    return clean.to_dict(orient="records")


def upsert_player_role_insights(
    df: pd.DataFrame,
    player_map: dict[int, str],
    team_map: dict[str, str],
    season: str,
) -> None:
    print("\n🧭 Player role insights...")
    rankings = (
        supabase.table("team_rankings")
        .select("team_id, defense_strength")
        .eq("season_key", season)
        .execute()
    )
    by_team_id = {
        row["team_id"]: float(row.get("defense_strength") or 50)
        for row in (rankings.data or [])
    }
    defense_by_code = {
        code: by_team_id.get(team_id, 50.0)
        for code, team_id in team_map.items()
    }
    rows = build_player_role_insights(df, player_map, season, defense_by_code)
    upsert("player_role_insights", rows, "season_key,player_id,window_key")
    print(f"   {len(rows)} role insight records | score {PLAYER_INSIGHT_SCORE_VERSION}")


# ── Stage 6: Team rankings ───────────────────────────────────────────────────

def upsert_team_rankings(df: pd.DataFrame, team_map: dict[str, str], season: str):
    """Build reliable 0-100 team strengths from match-level data.

    Principles:
      * reduce player rows to one team-match before any team aggregation;
      * normalize metrics before weighting so 40% really means 40%;
      * favour underlying xG/xGC over noisy finishing/clean-sheet outcomes;
      * use only a mild (+/-15%) opponent adjustment for recent form;
      * suppress home/away effects until both splits have enough matches.
    """
    print("\n🏆 Team rankings (normalized model)...")

    df = df.copy()
    num_cols = [
        "expected_goals", "goals", "total_shots", "chances_created", "total_points",
        "expected_goals_conceded", "goals_conceded", "clean_sheet", "minutes",
        "expected_goal_involvements", "assists", "defensive_contribution",
    ]
    for c in num_cols:
        if c not in df.columns:
            df[c] = 0.0
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)

    df["was_home"] = df["was_home"].map(lambda value: int(safe_bool(value)))
    df["gameweek"] = pd.to_numeric(df["gameweek"], errors="coerce")
    df = df.dropna(subset=["gameweek", "team_name", "opponent_team_name"]).copy()
    df["gameweek"] = df["gameweek"].astype(int)

    latest_gw = int(df["gameweek"].max())
    form_window = min(LAST_5_GWS, latest_gw)
    form_5_start = max(1, latest_gw - form_window + 1)
    form_10_start = max(1, latest_gw - LAST_10_GWS + 1)

    # Context/defensive source: prefer a full-match player because the upstream
    # xGC/GC fields are player-level and substitutes may only cover part of a game.
    context = (
        df.sort_values(["team_name", "gameweek", "minutes"], ascending=[True, True, False])
        .drop_duplicates(["team_name", "gameweek"], keep="first")
        [["team_name", "gameweek", "was_home", "opponent_team_name",
          "expected_goals_conceded", "goals_conceded", "minutes"]]
        .rename(columns={
            "expected_goals_conceded": "source_xgc",
            "goals_conceded": "source_gc",
            "minutes": "context_minutes",
        })
        .copy()
    )

    # Team attacking totals come from summing only players who actually played.
    played = df[df["minutes"] > 0].copy()
    attack = (
        played.groupby(["team_name", "gameweek"], as_index=False)
        .agg(
            team_xg=("expected_goals", "sum"),
            team_goals=("goals", "sum"),
            team_shots=("total_shots", "sum"),
            team_chances=("chances_created", "sum"),
            team_assists=("assists", "sum"),
            team_points=("total_points", "sum"),
            team_defensive_contribution=("defensive_contribution", "sum"),
        )
    )

    match_df = context.merge(attack, on=["team_name", "gameweek"], how="left").fillna(0)

    # Cross-check defensive data against the opponent's attacking totals. For a
    # normal match the best-minute player provides authoritative full-match GC/xGC;
    # if coverage is poor, the opponent aggregates are a safer fallback.
    opponent_attack = attack.rename(columns={
        "team_name": "opponent_team_name",
        "team_goals": "opp_team_goals",
        "team_xg": "opp_team_xg",
        "team_shots": "opp_team_shots",
        "team_chances": "opp_team_chances",
    })[["opponent_team_name", "gameweek", "opp_team_goals", "opp_team_xg",
        "opp_team_shots", "opp_team_chances"]]
    match_df = match_df.merge(opponent_attack, on=["opponent_team_name", "gameweek"], how="left")

    full_context = match_df["context_minutes"] >= 80
    match_df["goals_conceded"] = np.where(
        full_context,
        match_df["source_gc"],
        match_df["opp_team_goals"].fillna(match_df["source_gc"]),
    )
    match_df["expected_goals_conceded"] = np.where(
        full_context,
        match_df["source_xgc"],
        match_df["opp_team_xg"].fillna(match_df["source_xgc"]),
    )
    match_df["clean_sheet"] = (match_df["goals_conceded"] == 0).astype(int)

    low_coverage = int((~full_context).sum())
    if low_coverage:
        print(f"   ⚠️  {low_coverage} team-match rows used opponent-derived defensive fallback")

    # Diagnostic only: own goals or source differences can explain occasional GC
    # mismatches, so report rather than overwrite authoritative full-match values.
    comparable = full_context & match_df["opp_team_goals"].notna()
    gc_mismatches = int((
        match_df.loc[comparable, "source_gc"].round(3)
        != match_df.loc[comparable, "opp_team_goals"].round(3)
    ).sum())
    if gc_mismatches:
        print(f"   ℹ️  {gc_mismatches} GC rows differ from summed opponent player goals (possible own goals/source nuance)")

    print(
        f"   Latest GW: {latest_gw} | recent window: {form_window} | "
        f"teams: {match_df['team_name'].nunique()} | team-match rows: {len(match_df)}"
    )

    def aggregate_matches(data: pd.DataFrame, suffix: str = "") -> pd.DataFrame:
        out = (
            data.groupby("team_name", as_index=False)
            .agg(
                n_matches=("gameweek", "nunique"),
                total_points=("team_points", "sum"),
                total_xg=("team_xg", "sum"),
                total_goals=("team_goals", "sum"),
                total_shots=("team_shots", "sum"),
                total_chances=("team_chances", "sum"),
                total_xgc=("expected_goals_conceded", "sum"),
                total_gc=("goals_conceded", "sum"),
                total_cs=("clean_sheet", "sum"),
                total_defensive_contribution=("team_defensive_contribution", "sum"),
            )
        )
        n = out["n_matches"].clip(lower=1)
        out["xg_pg"] = out["total_xg"] / n
        out["goals_pg"] = out["total_goals"] / n
        out["shots_pg"] = out["total_shots"] / n
        out["chances_pg"] = out["total_chances"] / n
        out["xgc_pg"] = out["total_xgc"] / n
        out["gc_pg"] = out["total_gc"] / n
        out["cs_rate"] = out["total_cs"] / n
        if suffix:
            out = out.rename(columns={c: f"{c}{suffix}" for c in out.columns if c != "team_name"})
        return out

    # Season metrics and normalized strengths.
    agg = aggregate_matches(match_df)
    agg["attack_strength"] = weighted_strength(agg, [
        ("xg_pg", ATTACK_WEIGHTS["xg"], True),
        ("goals_pg", ATTACK_WEIGHTS["goals"], True),
        ("shots_pg", ATTACK_WEIGHTS["shots"], True),
        ("chances_pg", ATTACK_WEIGHTS["chances"], True),
    ]).round(3)
    agg["defense_strength"] = weighted_strength(agg, [
        ("xgc_pg", DEFENSE_WEIGHTS["xgc"], False),
        ("gc_pg", DEFENSE_WEIGHTS["gc"], False),
        ("cs_rate", DEFENSE_WEIGHTS["cs"], True),
    ]).round(3)
    agg["overall_strength"] = (
        agg["attack_strength"] * 0.50 + agg["defense_strength"] * 0.50
    ).round(3)
    agg["attack_rank"] = agg["attack_strength"].rank(ascending=False, method="min").astype(int)
    agg["defense_rank"] = agg["defense_strength"].rank(ascending=False, method="min").astype(int)
    agg["overall_rank"] = agg["overall_strength"].rank(ascending=False, method="min").astype(int)

    # Build unadjusted recent opponent quality from the same rolling window.
    recent = match_df[match_df["gameweek"] >= form_5_start].copy()
    recent_raw = aggregate_matches(recent)
    recent_raw["raw_attack"] = weighted_strength(recent_raw, [
        ("xg_pg", ATTACK_WEIGHTS["xg"], True),
        ("goals_pg", ATTACK_WEIGHTS["goals"], True),
        ("shots_pg", ATTACK_WEIGHTS["shots"], True),
        ("chances_pg", ATTACK_WEIGHTS["chances"], True),
    ])
    recent_raw["raw_defense"] = weighted_strength(recent_raw, [
        ("xgc_pg", DEFENSE_WEIGHTS["xgc"], False),
        ("gc_pg", DEFENSE_WEIGHTS["gc"], False),
        ("cs_rate", DEFENSE_WEIGHTS["cs"], True),
    ])
    raw_att_map = recent_raw.set_index("team_name")["raw_attack"].to_dict()
    raw_def_map = recent_raw.set_index("team_name")["raw_defense"].to_dict()

    recent["opp_attack_strength"] = recent["opponent_team_name"].map(raw_att_map).fillna(50.0)
    recent["opp_defense_strength"] = recent["opponent_team_name"].map(raw_def_map).fillna(50.0)
    attack_mult = opponent_multiplier(recent["opp_defense_strength"])
    defense_mult = opponent_multiplier(recent["opp_attack_strength"])

    # Better attacking performance against a strong defense gets up to +15%; a
    # weak defense discounts it by at most 15%. Defense uses the inverse for GC/xGC.
    recent["adj_xg"] = recent["team_xg"] * attack_mult
    recent["adj_goals"] = recent["team_goals"] * attack_mult
    recent["adj_shots"] = recent["team_shots"] * attack_mult
    recent["adj_chances"] = recent["team_chances"] * attack_mult
    recent["adj_xgc"] = recent["expected_goals_conceded"] / defense_mult
    recent["adj_gc"] = recent["goals_conceded"] / defense_mult
    recent["adj_cs"] = recent["clean_sheet"] * defense_mult

    recent_agg = (
        recent.groupby("team_name", as_index=False)
        .agg(
            n_matches_5=("gameweek", "nunique"),
            total_goals_5=("team_goals", "sum"),
            total_assists_5=("team_assists", "sum"),
            total_gc_5=("goals_conceded", "sum"),
            total_cs_5=("clean_sheet", "sum"),
            adj_xg=("adj_xg", "sum"),
            adj_goals=("adj_goals", "sum"),
            adj_shots=("adj_shots", "sum"),
            adj_chances=("adj_chances", "sum"),
            adj_xgc=("adj_xgc", "sum"),
            adj_gc=("adj_gc", "sum"),
            adj_cs=("adj_cs", "sum"),
        )
    )
    n5 = recent_agg["n_matches_5"].clip(lower=1)
    recent_agg["adj_xg_pg"] = recent_agg["adj_xg"] / n5
    recent_agg["adj_goals_pg"] = recent_agg["adj_goals"] / n5
    recent_agg["adj_shots_pg"] = recent_agg["adj_shots"] / n5
    recent_agg["adj_chances_pg"] = recent_agg["adj_chances"] / n5
    recent_agg["adj_xgc_pg"] = recent_agg["adj_xgc"] / n5
    recent_agg["adj_gc_pg"] = recent_agg["adj_gc"] / n5
    recent_agg["adj_cs_rate"] = recent_agg["adj_cs"] / n5
    recent_agg["attack_score_5"] = weighted_strength(recent_agg, [
        ("adj_xg_pg", ATTACK_WEIGHTS["xg"], True),
        ("adj_goals_pg", ATTACK_WEIGHTS["goals"], True),
        ("adj_shots_pg", ATTACK_WEIGHTS["shots"], True),
        ("adj_chances_pg", ATTACK_WEIGHTS["chances"], True),
    ]).round(3)
    recent_agg["defense_score_5"] = weighted_strength(recent_agg, [
        ("adj_xgc_pg", DEFENSE_WEIGHTS["xgc"], False),
        ("adj_gc_pg", DEFENSE_WEIGHTS["gc"], False),
        ("adj_cs_rate", DEFENSE_WEIGHTS["cs"], True),
    ]).round(3)
    recent_agg["attack_rank_5"] = recent_agg["attack_score_5"].rank(ascending=False, method="min").astype(int)
    recent_agg["defense_rank_5"] = recent_agg["defense_score_5"].rank(ascending=False, method="min").astype(int)
    agg = agg.merge(recent_agg, on="team_name", how="left")

    # Season home/away splits used by the UI.
    def split_agg(home_value: int, prefix: str) -> pd.DataFrame:
        split = match_df[match_df["was_home"] == home_value]
        out = (
            split.groupby("team_name", as_index=False)
            .agg(
                matches=("gameweek", "nunique"),
                goals=("team_goals", "sum"),
                xg=("team_xg", "sum"),
                cs=("clean_sheet", "sum"),
            )
        )
        n = out["matches"].clip(lower=1)
        out[f"{prefix}_goals_pg"] = out["goals"] / n
        out[f"{prefix}_xg_pg"] = out["xg"] / n
        out[f"{prefix}_cs_rate"] = out["cs"] / n
        return out[["team_name", f"{prefix}_goals_pg", f"{prefix}_xg_pg", f"{prefix}_cs_rate"]]

    agg = agg.merge(split_agg(1, "home"), on="team_name", how="left")
    agg = agg.merge(split_agg(0, "away"), on="team_name", how="left")

    # Rolling home/away effect. Do not trust it until each split has >=3 matches;
    # then shrink progressively until >=6 home and >=6 away matches.
    rolling10 = match_df[match_df["gameweek"] >= form_10_start].copy()
    home10 = (
        rolling10[rolling10["was_home"] == 1].groupby("team_name", as_index=False)
        .agg(home_m_10=("gameweek", "nunique"), home_goals_10=("team_goals", "sum"),
             home_xg_10=("team_xg", "sum"), home_cs_10=("clean_sheet", "sum"))
    )
    away10 = (
        rolling10[rolling10["was_home"] == 0].groupby("team_name", as_index=False)
        .agg(away_m_10=("gameweek", "nunique"), away_goals_10=("team_goals", "sum"),
             away_xg_10=("team_xg", "sum"), away_cs_10=("clean_sheet", "sum"))
    )
    agg = agg.merge(home10, on="team_name", how="left").merge(away10, on="team_name", how="left")
    for col in ["home_m_10", "away_m_10", "home_goals_10", "away_goals_10",
                "home_xg_10", "away_xg_10", "home_cs_10", "away_cs_10"]:
        agg[col] = pd.to_numeric(agg.get(col, 0), errors="coerce").fillna(0)

    hm10 = agg["home_m_10"].clip(lower=1)
    am10 = agg["away_m_10"].clip(lower=1)
    home_attack_rate = 0.60 * (agg["home_xg_10"] / hm10) + 0.40 * (agg["home_goals_10"] / hm10)
    away_attack_rate = 0.60 * (agg["away_xg_10"] / am10) + 0.40 * (agg["away_goals_10"] / am10)
    raw_home = ((home_attack_rate - away_attack_rate) / (home_attack_rate + away_attack_rate + 0.1) * 50).clip(-50, 50)
    split_sample = np.minimum(agg["home_m_10"], agg["away_m_10"])
    reliability = ((split_sample - 2) / 4).clip(0, 1)
    agg["home_strength_10"] = (raw_home * reliability).round(2)
    agg["away_strength_10"] = (-agg["home_strength_10"]).round(2)

    # Fill any missing numeric outputs before persistence.
    agg = agg.replace([np.inf, -np.inf], np.nan).fillna(0)

    rows = []
    for _, r in agg.iterrows():
        team_id = team_map.get(short(r["team_name"]))
        if not team_id:
            print(f"   ⚠️  No team_id for '{r['team_name']}' — skipping")
            continue
        rows.append({
            "season_key": season,
            "team_id": team_id,
            "overall_rank": int(r["overall_rank"]),
            "attack_rank": int(r["attack_rank"]),
            "defense_rank": int(r["defense_rank"]),
            "overall_strength": float(r["overall_strength"]),
            "attack_strength": float(r["attack_strength"]),
            "defense_strength": float(r["defense_strength"]),
            "goals_per_game": round(float(r["goals_pg"]), 3),
            "xg_per_game": round(float(r["xg_pg"]), 3),
            "shots_per_game": round(float(r["shots_pg"]), 3),
            "goals_conceded_per_game": round(float(r["gc_pg"]), 3),
            "xgc_per_game": round(float(r["xgc_pg"]), 3),
            "clean_sheet_rate": round(float(r["cs_rate"]), 3),
            "defensive_contribution": round(float(r["total_defensive_contribution"]), 3),
            "home_goals_per_game": round(float(r["home_goals_pg"]), 3),
            "away_goals_per_game": round(float(r["away_goals_pg"]), 3),
            "home_xg_per_game": round(float(r["home_xg_pg"]), 3),
            "away_xg_per_game": round(float(r["away_xg_pg"]), 3),
            "home_clean_sheet_rate": round(float(r["home_cs_rate"]), 3),
            "away_clean_sheet_rate": round(float(r["away_cs_rate"]), 3),
            # Existing schema names retained for compatibility. Until GW5 these
            # fields represent all available GWs rather than literally five.
            "last_5_goals": round(float(r["total_goals_5"]), 2),
            "last_5_assists": round(float(r["total_assists_5"]), 2),
            "last_5_clean_sheets": int(r["total_cs_5"]),
            "last_5_goals_conceded": int(round(float(r["total_gc_5"]))),
            "attack_rank_5": int(r["attack_rank_5"]),
            "defense_rank_5": int(r["defense_rank_5"]),
            "attack_score_5": float(r["attack_score_5"]),
            "defense_score_5": float(r["defense_score_5"]),
            "last_10_home_goals": round(float(r["home_goals_10"]), 2),
            "last_10_away_goals": round(float(r["away_goals_10"]), 2),
            "last_10_home_clean_sheets": int(r["home_cs_10"]),
            "last_10_away_clean_sheets": int(r["away_cs_10"]),
            "home_strength_10": float(r["home_strength_10"]),
            "away_strength_10": float(r["away_strength_10"]),
            "updated_at": datetime.utcnow().isoformat(),
        })

    upsert("team_rankings", rows, "season_key,team_id")
    print(
        f"   {len(rows)} team ranking records | strengths normalized 0-100 | "
        f"recent form uses {form_window} GW(s)"
    )


def upsert_fixtures(
    fixtures: pd.DataFrame,
    team_map: dict[str, str],
    season: str,
    latest_gw: Optional[int] = None,
):
    """Compute fixture difficulty from strength differences, not rank gaps."""
    print("\n🎯 Fixtures...")

    res = (
        supabase.table("team_rankings")
        .select(
            "team_id, attack_strength, defense_strength, attack_score_5, "
            "defense_score_5, home_strength_10, away_strength_10"
        )
        .eq("season_key", season)
        .execute()
    )
    rank_by_tid = {r["team_id"]: r for r in (res.data or [])}

    teams_res = supabase.table("teams").select("id, name, short_name").execute()
    name_to_id = {}
    for t in (teams_res.data or []):
        name_to_id[t["name"]] = t["id"]
        name_to_id[t["short_name"]] = t["id"]

    if latest_gw is None:
        latest_gw = 0
    rw = recent_weight(int(latest_gw))

    def current_strength(row: dict, kind: str) -> float:
        season_value = float(row.get(f"{kind}_strength") or 50.0)
        recent_value = float(row.get(f"{kind}_score_5") or season_value)
        return season_value * (1.0 - rw) + recent_value * rw

    def fdr_from_difference(diff: float) -> float:
        # Strength difference is [-100,+100]. Map +100 (very favourable) to 1,
        # equal teams to 3, and -100 to 5.
        return round(float(np.clip(3.0 - diff / 50.0, 1.0, 5.0)), 2)

    rows = []
    missing_teams = set()
    for _, r in fixtures.iterrows():
        home_id = name_to_id.get(r["home_team"])
        away_id = name_to_id.get(r["away_team"])
        if not home_id or not away_id:
            if not home_id:
                missing_teams.add(r["home_team"])
            if not away_id:
                missing_teams.add(r["away_team"])
            continue

        h = rank_by_tid.get(home_id, {})
        a = rank_by_tid.get(away_id, {})
        h_att = current_strength(h, "attack")
        h_def = current_strength(h, "defense")
        a_att = current_strength(a, "attack")
        a_def = current_strength(a, "defense")

        # Home/away is deliberately a small modifier and remains zero early in
        # the season until the rolling split has enough observations.
        home_mod = float(h.get("home_strength_10") or 0.0) * 0.15
        away_mod = float(a.get("away_strength_10") or 0.0) * 0.15
        h_att = float(np.clip(h_att + home_mod, 0, 100))
        h_def = float(np.clip(h_def + home_mod * 0.5, 0, 100))
        a_att = float(np.clip(a_att + away_mod, 0, 100))
        a_def = float(np.clip(a_def + away_mod * 0.5, 0, 100))

        home_att_diff = h_att - a_def
        home_def_diff = h_def - a_att
        away_att_diff = a_att - h_def
        away_def_diff = a_def - h_att

        # Keep historical favorability field scale (-10..10) for frontend compatibility.
        home_att_fav = round(home_att_diff / 10.0, 3)
        home_def_fav = round(home_def_diff / 10.0, 3)
        away_att_fav = round(away_att_diff / 10.0, 3)
        away_def_fav = round(away_def_diff / 10.0, 3)

        rows.append({
            "season_key": season,
            "gameweek": int(r["gameweek"]),
            "home_team_id": home_id,
            "away_team_id": away_id,
            "home_attack_fdr": fdr_from_difference(home_att_diff),
            "home_defense_fdr": fdr_from_difference(home_def_diff),
            "away_attack_fdr": fdr_from_difference(away_att_diff),
            "away_defense_fdr": fdr_from_difference(away_def_diff),
            "home_attacking_favorability": home_att_fav,
            "home_defensive_favorability": home_def_fav,
            "away_attacking_favorability": away_att_fav,
            "away_defensive_favorability": away_def_fav,
            # Scores remain null for future fixtures. Store both sides once so
            # every player can see the result from their own team's perspective.
            "home_score": safe_int(r.get("home_score")),
            "away_score": safe_int(r.get("away_score")),
            "finished": safe_bool(r.get("finished")),
        })

    if missing_teams:
        raise ValueError(
            "Fixture teams are missing from the stats/team table: "
            + ", ".join(sorted(missing_teams))
        )
    if len(rows) != len(fixtures):
        raise ValueError(f"Prepared {len(rows)} of {len(fixtures)} fixture rows")

    upsert("fixtures", rows, "season_key,home_team_id,away_team_id")
    print(f"   {len(rows)} fixture records | recent blend weight: {rw:.0%}")


# ── Main ─────────────────────────────────────────────────────────────────────

def main(season: str = DEFAULT_SEASON) -> bool:
    global supabase

    print("\n" + "=" * 60)
    print("🚀 FPL ETL PIPELINE")
    print("=" * 60)
    t0 = datetime.now()

    # ETL writes bypass read-only public RLS with the server-side service role.
    supabase = get_admin_client()

    df = load_csv()
    if df is None or df.empty:
        print("❌ No data — aborting.")
        return False
    fixtures = load_fixture_csv()
    complete_rounds = completed_gameweeks(fixtures)
    gameweeks = pd.to_numeric(df["gameweek"], errors="coerce")
    analysis_df = df[gameweeks.isin(complete_rounds)].copy()

    team_map   = upsert_teams(df)
    player_map = upsert_players(df, team_map)

    # Preserve raw rows and match scores from the daily sync, but do not let a
    # partially played round bias cross-team rankings or player model scores.
    upsert_gameweek_stats(df, player_map, season)
    if analysis_df.empty:
        print("⚠️  No fully completed gameweeks yet; model aggregates were left unchanged.")
    else:
        upsert_season_stats(analysis_df, player_map, season)
        upsert_team_rankings(analysis_df, team_map, season)
        upsert_player_role_insights(analysis_df, player_map, team_map, season)

    latest_completed_gw = max(complete_rounds, default=0)
    upsert_fixtures(fixtures, team_map, season, latest_gw=latest_completed_gw)

    elapsed = (datetime.now() - t0).total_seconds()
    print(f"\n✅ Done in {elapsed:.1f}s\n" + "=" * 60)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", default=DEFAULT_SEASON)
    args = parser.parse_args()
    sys.exit(0 if main(args.season) else 1)
