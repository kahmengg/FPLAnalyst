#!/usr/bin/env python3
"""
FPL ETL Pipeline
CSV → Supabase (teams / players / player_gameweeks / player_season_stats / team_rankings / fixtures)

Usage:
    python -m backend.etl.process_fpl_data --season 2025_26
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
from utils.supabase_client import supabase

# ── Constants ────────────────────────────────────────────────────────────────

TEAM_SHORT = {
    "Arsenal": "ARS", "Aston Villa": "AVL", "Bournemouth": "BOU",
    "Brentford": "BRE", "Brighton": "BHA", "Burnley": "BUR",
    "Chelsea": "CHE", "Crystal Palace": "CRY", "Everton": "EVE",
    "Fulham": "FUL", "Leeds": "LEE", "Leicester": "LEI",
    "Liverpool": "LIV", "Man City": "MCI", "Man Utd": "MUN",
    "Newcastle": "NEW", "Nott'm Forest": "NFO", "Sunderland": "SUN",
    "Spurs": "TOT", "West Ham": "WHU", "Wolves": "WOL",
    "Ipswich": "IPS", "Southampton": "SOU",
}

CHUNK       = 500
FORM_GWS    = 5   # number of recent GWs used to calculate form
LAST_5_GWS  = 5   # rolling window for form-based attack/defense rankings
LAST_10_GWS = 10  # rolling window for home/away strength modifiers
LAST_5_GWS = 5  # recent gameweeks for form-based rankings
LAST_10_GWS = 10 # recent gameweeks for home/away strength


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
    for chunk in chunks(records):
        supabase.table(table).upsert(chunk, on_conflict=conflict).execute()


# ── Stage 1: Load & clean CSV ────────────────────────────────────────────────

def load_csv() -> Optional[pd.DataFrame]:
    path = Config.FPL_DATA_CSV
    if not os.path.exists(path):
        print(f"❌ CSV not found: {path}")
        return None

    df = pd.read_csv(path, dtype=str)   # load everything as str first
    df.columns = [c.strip() for c in df.columns]
    print(f"✅ Loaded {len(df):,} rows, {len(df.columns)} columns")

    # Strip whitespace from all string cells
    df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)

    # Replace empty strings with NaN so downstream helpers work uniformly
    df.replace("", np.nan, inplace=True)

    return df


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

    # Deduplicate within batch — same player+GW can appear multiple times in CSV
    seen: dict = {}
    for record in rows:
        key = (record["season_key"], record["player_id"], record["gameweek"])
        seen[key] = record
    deduped = list(seen.values())

    for chunk in chunks(deduped):
        supabase.table("player_gameweeks").upsert(
            chunk, on_conflict="season_key,player_id,gameweek"
        ).execute()

    print(f"   {len(deduped)} records  ({skipped} skipped, {len(rows) - len(deduped)} dupes dropped)")


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
        "was_home":                              "float",   # 0/1 for split sums
    }
    for col, _ in num.items():
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # One row per player per GW (deduplicate)
    df = df.drop_duplicates(subset=["_pid", "gameweek"])

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
    form_start = max(1, latest_gw - FORM_GWS + 1)
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


# ── Stage 6: Team rankings ───────────────────────────────────────────────────

def upsert_team_rankings(df: pd.DataFrame, team_map: dict[str, str], season: str):
    """
    Compute team-level metrics from the CSV with form-based rankings.

    Key insight: the CSV has ONE ROW PER PLAYER PER GW, not one row per match.
    To get team-level per-game stats we must first reduce to one row per
    (team, gameweek) before aggregating — otherwise every stat gets multiplied
    by squad size (~15 players per team per GW).

    We take the MATCH-LEVEL values that are the same for every player in a
    team in a given GW:
        - expected_goals_conceded  (same for all players on same team/GW)
        - goals_conceded
        - clean_sheet
        - was_home

    And sum the PLAYER-LEVEL attacking stats only for outfield starters
    (minutes > 0) to approximate team attacking output per match.
    
    NEW: Calculate form-based rankings (last 5 GWs) and home/away strength
    (last 10 GWs) for fixture difficulty prediction.
    """
    print("\n🏆 Team rankings (including form-based rankings)...")

    df = df.copy()
    num_cols = [
        "expected_goals", "goals", "total_shots",
        "expected_goals_conceded", "goals_conceded",
        "clean_sheet", "was_home", "minutes",
        "expected_goal_involvements", "assists",
    ]
    for c in num_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    df["gameweek"] = pd.to_numeric(df["gameweek"], errors="coerce")
    df = df.dropna(subset=["gameweek"])
    df["gameweek"] = df["gameweek"].astype(int)

    # Get latest gameweek for form calculations
    latest_gw = int(df["gameweek"].max())
    form_5_start = max(1, latest_gw - LAST_5_GWS + 1)
    form_10_start = max(1, latest_gw - LAST_10_GWS + 1)

    # ── Step 1: Match-level defensive stats (one row per team+GW) ──
    match_level = (
        df.drop_duplicates(subset=["team_name", "gameweek"])
        [["team_name", "gameweek", "was_home",
          "expected_goals_conceded", "goals_conceded", "clean_sheet"]]
        .copy()
    )

    # ── Step 2: Player-level attacking stats (sum per team+GW, starters only) ──
    starters = df[df["minutes"] > 0].copy()
    attack_per_match = (
        starters.groupby(["team_name", "gameweek"])
        .agg(
            team_xg    = ("expected_goals",            "sum"),
            team_goals = ("goals",                     "sum"),
            team_shots = ("total_shots",               "sum"),
            team_assists = ("assists",                 "sum"),
        )
        .reset_index()
    )

    # ── Step 3: Merge match data ──
    match_df = match_level.merge(attack_per_match, on=["team_name", "gameweek"], how="left")
    match_df = match_df.fillna(0)

    # ── OVERALL SEASON AGGREGATION ──
    overall = match_df.groupby("team_name").agg(
        n_matches  = ("gameweek",                "nunique"),
        total_xg   = ("team_xg",                 "sum"),
        total_goals= ("team_goals",              "sum"),
        total_shots= ("team_shots",              "sum"),
        total_xgc  = ("expected_goals_conceded", "sum"),
        total_gc   = ("goals_conceded",          "sum"),
        total_cs   = ("clean_sheet",             "sum"),
    ).reset_index()

    # ── HOME/AWAY SPLITS (SEASON) ──
    home_agg = (
        match_df[match_df["was_home"] == 1]
        .groupby("team_name")
        .agg(
            home_m     = ("gameweek",    "nunique"),
            home_xg    = ("team_xg",    "sum"),
            home_goals = ("team_goals", "sum"),
            home_cs    = ("clean_sheet","sum"),
        ).reset_index()
    )
    away_agg = (
        match_df[match_df["was_home"] == 0]
        .groupby("team_name")
        .agg(
            away_m     = ("gameweek",    "nunique"),
            away_xg    = ("team_xg",    "sum"),
            away_goals = ("team_goals", "sum"),
            away_cs    = ("clean_sheet","sum"),
        ).reset_index()
    )

    agg = overall.merge(home_agg, on="team_name", how="left")
    agg = agg.merge(away_agg,    on="team_name", how="left")
    agg = agg.fillna(0)

    # ── LAST 5 GAMEWEEKS (FORM-BASED RANKINGS) ──
    match_df_5 = match_df[match_df["gameweek"] >= form_5_start]
    form_5_agg = match_df_5.groupby("team_name").agg(
        n_matches_5   = ("gameweek",                "nunique"),
        total_goals_5 = ("team_goals",              "sum"),
        total_assists_5 = ("team_assists",          "sum"),
        total_gc_5    = ("goals_conceded",          "sum"),
        total_cs_5    = ("clean_sheet",             "sum"),
    ).reset_index()
    agg = agg.merge(form_5_agg, on="team_name", how="left")
    for col in ["n_matches_5", "total_goals_5", "total_assists_5", "total_gc_5", "total_cs_5"]:
        agg[col] = agg[col].fillna(0)

    # ── LAST 10 GAMEWEEKS (HOME/AWAY STRENGTH) ──
    match_df_10 = match_df[match_df["gameweek"] >= form_10_start]
    
    # Home splits for last 10
    home_10_agg = (
        match_df_10[match_df_10["was_home"] == 1]
        .groupby("team_name")
        .agg(
            home_m_10     = ("gameweek",    "nunique"),
            home_goals_10 = ("team_goals", "sum"),
            home_cs_10    = ("clean_sheet","sum"),
        ).reset_index()
    )
    
    # Away splits for last 10
    away_10_agg = (
        match_df_10[match_df_10["was_home"] == 0]
        .groupby("team_name")
        .agg(
            away_m_10     = ("gameweek",    "nunique"),
            away_goals_10 = ("team_goals", "sum"),
            away_cs_10    = ("clean_sheet","sum"),
        ).reset_index()
    )
    
    agg = agg.merge(home_10_agg, on="team_name", how="left")
    agg = agg.merge(away_10_agg, on="team_name", how="left")
    for col in ["home_m_10", "home_goals_10", "home_cs_10", "away_m_10", "away_goals_10", "away_cs_10"]:
        agg[col] = agg[col].fillna(0)

    # ── SEASON-LEVEL CALCULATIONS ──
    m  = agg["n_matches"].clip(lower=1)
    hm = agg["home_m"].clip(lower=1)
    am = agg["away_m"].clip(lower=1)

    agg["goals_pg"]      = agg["total_goals"] / m
    agg["xg_pg"]         = agg["total_xg"]    / m
    agg["shots_pg"]      = agg["total_shots"] / m
    agg["gc_pg"]         = agg["total_gc"]    / m
    agg["xgc_pg"]        = agg["total_xgc"]   / m
    agg["cs_rate"]       = agg["total_cs"]    / m
    agg["home_goals_pg"] = agg["home_goals"]  / hm
    agg["away_goals_pg"] = agg["away_goals"]  / am
    agg["home_xg_pg"]    = agg["home_xg"]     / hm
    agg["away_xg_pg"]    = agg["away_xg"]     / am
    agg["home_cs_rate"]  = agg["home_cs"]     / hm
    agg["away_cs_rate"]  = agg["away_cs"]     / am

    agg["attack_strength"] = (
        agg["xg_pg"]    * 0.4 +
        agg["goals_pg"] * 0.3 +
        agg["shots_pg"] * 0.3
    ).round(4)
    agg["defense_strength"] = (
        agg["cs_rate"] * 0.4 +
        (1 / (agg["xgc_pg"] + 0.1)) * 0.6
    ).round(4)
    agg["overall_strength"] = (
        (agg["attack_strength"] + agg["defense_strength"]) / 2
    ).round(4)

    agg["attack_rank"]  = agg["attack_strength"].rank(ascending=False, method="min").astype(int)
    agg["defense_rank"] = agg["defense_strength"].rank(ascending=False, method="min").astype(int)
    agg["overall_rank"] = agg["overall_strength"].rank(ascending=False, method="min").astype(int)

    # ── FORM-BASED RANKINGS (LAST 5 GWS) ──
    # Attack form: weighted combination of goals and assists from starters
    m_5 = agg["n_matches_5"].clip(lower=1)
    agg["goals_pg_5"] = agg["total_goals_5"] / m_5
    agg["assists_pg_5"] = agg["total_assists_5"] / m_5
    
    # Attack rank 5: weighted by goals (60%) and assists (40%)
    agg["attack_score_5"] = (
        agg["goals_pg_5"] * 0.6 +
        agg["assists_pg_5"] * 0.4
    ).round(4)
    
    # Defense rank 5: clean sheet rate and goals conceded
    agg["cs_rate_5"] = agg["total_cs_5"] / m_5
    agg["gc_pg_5"] = agg["total_gc_5"] / m_5
    agg["defense_score_5"] = (
        agg["cs_rate_5"] * 0.6 +
        (1 / (agg["gc_pg_5"] + 0.1)) * 0.4
    ).round(4)
    
    agg["attack_rank_5"] = agg["attack_score_5"].rank(ascending=False, method="min").astype(int)
    agg["defense_rank_5"] = agg["defense_score_5"].rank(ascending=False, method="min").astype(int)

    # ── HOME/AWAY STRENGTH (LAST 10 GWS) ──
    # This is a 0-100 modifier: positive if team stronger at home, negative if weaker
    hm_10 = agg["home_m_10"].clip(lower=1)
    am_10 = agg["away_m_10"].clip(lower=1)
    
    agg["home_goals_pg_10"] = agg["home_goals_10"] / hm_10
    agg["away_goals_pg_10"] = agg["away_goals_10"] / am_10
    agg["home_cs_rate_10"] = agg["home_cs_10"] / hm_10
    agg["away_cs_rate_10"] = agg["away_cs_10"] / am_10
    
    # Home strength: positive if home is better, ranges -100 to +100
    # Attack modifier: if home goals > away goals, boost attacking rating at home
    agg["home_strength_10"] = (
        ((agg["home_goals_pg_10"] - agg["away_goals_pg_10"]) / 
         (agg["home_goals_pg_10"] + agg["away_goals_pg_10"] + 0.1) * 50)
        .clip(lower=-50, upper=50)
        .round(2)
    )
    
    # Away strength: if away is stronger, this is positive; if weaker, negative
    # This becomes a penalty to away-team attacking/defending
    agg["away_strength_10"] = -agg["home_strength_10"]

    # Build records with all new fields
    rows = []
    for _, r in agg.iterrows():
        team_id = team_map.get(short(r["team_name"]))
        if not team_id:
            print(f"   ⚠️  No team_id for '{r['team_name']}' — skipping")
            continue
        rows.append({
            "season_key":   season,
            "team_id":      team_id,

            # Overall season rankings
            "overall_rank":  int(r["overall_rank"]),
            "attack_rank":   int(r["attack_rank"]),
            "defense_rank":  int(r["defense_rank"]),

            "overall_strength":  float(r["overall_strength"]),
            "attack_strength":   float(r["attack_strength"]),
            "defense_strength":  float(r["defense_strength"]),

            # Season-level per-game stats
            "goals_per_game":          round(float(r["goals_pg"]),  3),
            "xg_per_game":             round(float(r["xg_pg"]),     3),
            "shots_per_game":          round(float(r["shots_pg"]),  3),
            "goals_conceded_per_game": round(float(r["gc_pg"]),     3),
            "xgc_per_game":            round(float(r["xgc_pg"]),    3),
            "clean_sheet_rate":        round(float(r["cs_rate"]),   3),
            "defensive_contribution":  round(float(r["total_cs"]),  3),

            # Season home/away splits
            "home_goals_per_game":   round(float(r["home_goals_pg"]), 3),
            "away_goals_per_game":   round(float(r["away_goals_pg"]), 3),
            "home_xg_per_game":      round(float(r["home_xg_pg"]),    3),
            "away_xg_per_game":      round(float(r["away_xg_pg"]),    3),
            "home_clean_sheet_rate": round(float(r["home_cs_rate"]),  3),
            "away_clean_sheet_rate": round(float(r["away_cs_rate"]),  3),

            # NEW: Form-based rankings (last 5 gameweeks)
            "last_5_goals":         round(float(r["total_goals_5"]), 2),
            "last_5_assists":       round(float(r["total_assists_5"]), 2),
            "last_5_clean_sheets":  int(r["total_cs_5"]),
            "last_5_goals_conceded": int(r["total_gc_5"]),
            "attack_rank_5":        int(r["attack_rank_5"]),
            "defense_rank_5":       int(r["defense_rank_5"]),
            "attack_score_5":       float(r["attack_score_5"]),
            "defense_score_5":      float(r["defense_score_5"]),

            # NEW: Home/Away strength (last 10 gameweeks) - 0-100 modifier
            "last_10_home_goals":   round(float(r["home_goals_10"]), 2),
            "last_10_away_goals":   round(float(r["away_goals_10"]), 2),
            "last_10_home_clean_sheets": int(r["home_cs_10"]),
            "last_10_away_clean_sheets": int(r["away_cs_10"]),
            "home_strength_10":     float(r["home_strength_10"]),  # -50 to +50
            "away_strength_10":     float(r["away_strength_10"]),  # -50 to +50

            "updated_at": datetime.utcnow().isoformat(),
        })

    upsert("team_rankings", rows, "season_key,team_id")
    print(f"   {len(rows)} team ranking records (with form-based & home/away strength)")



# ── Stage 7: Fixtures ────────────────────────────────────────────────────────

def upsert_fixtures(df: pd.DataFrame, team_map: dict[str, str], season: str):
    """
    Derive fixtures from the CSV (home team rows only).
    FDR is computed from team rankings already written to Supabase.
    """
    print("\n🎯 Fixtures...")

    # Fetch rankings
    res = (
        supabase.table("team_rankings")
        .select("team_id, attack_rank, defense_rank")
        .eq("season_key", season)
        .execute()
    )
    rank_by_tid = {r["team_id"]: r for r in (res.data or [])}

    # team name → uuid
    teams_res = supabase.table("teams").select("id, name, short_name").execute()
    name_to_id = {}
    for t in (teams_res.data or []):
        name_to_id[t["name"]]       = t["id"]
        name_to_id[t["short_name"]] = t["id"]

    df = df.copy()
    df["gameweek"] = pd.to_numeric(df["gameweek"], errors="coerce")
    df["was_home"] = df["was_home"].apply(safe_bool)
    df = df.dropna(subset=["gameweek"])
    df["gameweek"] = df["gameweek"].astype(int)

    # One row per fixture — use home team's perspective
    home_rows = (
        df[df["was_home"] == True]
        [["gameweek", "team_name", "opponent_team_name"]]
        .drop_duplicates()
    )

    n_teams = max(len(team_map), 20)

    rows = []
    for _, r in home_rows.iterrows():
        home_id = name_to_id.get(r["team_name"])
        away_id = name_to_id.get(r["opponent_team_name"])
        if not home_id or not away_id:
            continue

        h = rank_by_tid.get(home_id, {})
        a = rank_by_tid.get(away_id, {})

        h_att = h.get("attack_rank",  10)
        h_def = h.get("defense_rank", 10)
        a_att = a.get("attack_rank",  10)
        a_def = a.get("defense_rank", 10)

        # +ve = easier for attacking team
        home_att_fav = round((a_def - h_att) / n_teams * 10, 3)
        home_def_fav = round((a_att - h_def) / n_teams * 10, 3)
        away_att_fav = round((h_def - a_att) / n_teams * 10, 3)
        away_def_fav = round((h_att - a_def) / n_teams * 10, 3)

        def to_fdr(fav: float) -> float:
            # map [-10,10] → [1,5] inverted (higher fav = lower/easier FDR)
            clamped = max(-10.0, min(10.0, fav))
            return round(5 - ((clamped + 10) / 20 * 4), 2)

        rows.append({
            "season_key":   season,
            "gameweek":     int(r["gameweek"]),
            "home_team_id": home_id,
            "away_team_id": away_id,

            "home_attack_fdr":  to_fdr(home_att_fav),
            "home_defense_fdr": to_fdr(home_def_fav),
            "away_attack_fdr":  to_fdr(away_att_fav),
            "away_defense_fdr": to_fdr(away_def_fav),

            "home_attacking_favorability": home_att_fav,
            "home_defensive_favorability": home_def_fav,
            "away_attacking_favorability": away_att_fav,
            "away_defensive_favorability": away_def_fav,
        })

    upsert("fixtures", rows, "season_key,gameweek,home_team_id,away_team_id")
    print(f"   {len(rows)} fixture records")


# ── Main ─────────────────────────────────────────────────────────────────────

def main(season: str = "2025_26") -> bool:
    print("\n" + "=" * 60)
    print("🚀 FPL ETL PIPELINE")
    print("=" * 60)
    t0 = datetime.now()

    df = load_csv()
    if df is None or df.empty:
        print("❌ No data — aborting.")
        return False

    team_map   = upsert_teams(df)
    player_map = upsert_players(df, team_map)

    upsert_gameweek_stats(df, player_map, season)
    upsert_season_stats(df, player_map, season)
    upsert_team_rankings(df, team_map, season)
    upsert_fixtures(df, team_map, season)

    elapsed = (datetime.now() - t0).total_seconds()
    print(f"\n✅ Done in {elapsed:.1f}s\n" + "=" * 60)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", default="2025_26")
    args = parser.parse_args()
    sys.exit(0 if main(args.season) else 1)