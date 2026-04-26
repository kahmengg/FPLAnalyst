#!/usr/bin/env python3
"""
Simplified FPL ETL Pipeline
Direct CSV → Supabase (eliminates JSON intermediate files)

One-stage processing:
1. Load CSV from project root
2. Process with Pandas (transformations, calculations, insights)
3. Write directly to Supabase in chunks
4. No temporary JSON files needed

Usage:
    python -m backend.etl.process_fpl_data --season 2025_26
"""

import argparse
import base64
import json
import os
import sys
from datetime import datetime
from typing import Optional
import urllib.request

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pandas as pd
from config.config import Config
from utils.supabase_client import supabase


# Define position mapping
POSITION_MAP = {
    "Goalkeeper": 1,
    "GK": 1,
    "Defender": 2,
    "DEF": 2,
    "Midfielder": 3,
    "MID": 3,
    "Forward": 4,
    "FWD": 4,
    "ST": 4,
}

# Team short codes (standardized)
TEAM_SHORT_NAMES = {
    "Arsenal": "ARS",
    "Aston Villa": "AVL",
    "Bournemouth": "BOU",
    "Brentford": "BRE",
    "Brighton": "BHA",
    "Burnley": "BUR",
    "Chelsea": "CHE",
    "Crystal Palace": "CRY",
    "Everton": "EVE",
    "Fulham": "FUL",
    "Leeds": "LEE",
    "Liverpool": "LIV",
    "Man City": "MCI",
    "Man Utd": "MUN",
    "Newcastle": "NEW",
    "Nott'm Forest": "NFO",
    "Sunderland": "SUN",
    "Spurs": "TOT",
    "West Ham": "WHU",
    "Wolves": "WOL",
}

FPL_DASH_URL = "https://www.fpl-data.co.uk/_dash-update-component"


def chunk_records(records: list, chunk_size: int = 500):
    """Yield successive chunks of records."""
    for index in range(0, len(records), chunk_size):
        yield records[index : index + chunk_size]


def load_json_file(relative_path: str):
    """Load a JSON file from backend/data."""
    file_path = os.path.join(Config.DATA_DIR, relative_path)
    if not os.path.exists(file_path):
        return None

    try:
        with open(file_path, "r", encoding="utf-8") as file_handle:
            return json.load(file_handle)
    except Exception:
        return None


def to_bool(value) -> bool:
    """Convert value to boolean."""
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "t", "yes", "y"}


def to_float(value) -> Optional[float]:
    """Convert value to float, return None if invalid."""
    try:
        if pd.isna(value):
            return None
        return float(value)
    except (ValueError, TypeError):
        return None


def to_int(value) -> Optional[int]:
    """Convert value to int, return None if invalid."""
    try:
        if pd.isna(value):
            return None
        return int(value)
    except (ValueError, TypeError):
        return None


def load_csv() -> Optional[pd.DataFrame]:
    """Load FPL CSV file from project root."""
    csv_path = Config.FPL_DATA_CSV
    if not os.path.exists(csv_path):
        print(f"⚠️  CSV file not found: {csv_path}")
        fetched = fetch_csv_from_dash(os.getenv("FPL_DATA_SEASON", "2025_26"))
        if fetched:
            save_csv(fetched)
            print(f"✅ Downloaded CSV to {csv_path}")
        else:
            print("❌ Unable to download CSV automatically.")
            return None

    try:
        df = pd.read_csv(csv_path)
        print(f"✅ Loaded CSV with {len(df)} rows and {len(df.columns)} columns")
        return df
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return None


def fetch_csv_from_dash(season_value: str) -> Optional[str]:
    """Fetch CSV from the FPL Data Dash callback endpoint."""
    payload = {
        "output": "download-dataframe-csv.data",
        "outputs": {"id": "download-dataframe-csv", "property": "data"},
        "inputs": [{"id": "btn_csv", "property": "n_clicks", "value": 1}],
        "changedPropIds": ["btn_csv.n_clicks"],
        "parsedChangedPropsIds": ["btn_csv.n_clicks"],
        "state": [{"id": "input-year", "property": "value", "value": season_value}],
    }

    request = urllib.request.Request(
        FPL_DASH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://www.fpl-data.co.uk",
            "Referer": "https://www.fpl-data.co.uk/statistics",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read().decode("utf-8")
        data = json.loads(body)
        download_payload = data["response"]["download-dataframe-csv"]["data"]
        csv_content = download_payload["content"]
        if download_payload.get("base64"):
            csv_content = base64.b64decode(csv_content).decode("utf-8")
        return csv_content
    except Exception as exc:
        print(f"❌ Error fetching CSV from Dash: {exc}")
        return None


def save_csv(csv_content: str) -> None:
    """Persist the CSV to the canonical project location."""
    with open(Config.FPL_DATA_CSV, "w", encoding="utf-8", newline="") as file_handle:
        file_handle.write(csv_content)


def setup_season(season_key: str) -> str:
    """Validate and set season key."""
    # Store in environment for child functions
    os.environ["FPL_SEASON_KEY"] = season_key
    print(f"📅 Season: {season_key}")
    return season_key


def setup_current_season() -> str:
    """Return the active season key for helper functions."""
    return os.getenv("FPL_SEASON_KEY", "2025_26")


def upsert_teams(df: pd.DataFrame) -> dict:
    """Extract unique teams from CSV and upsert to Supabase."""
    print("\n📊 Processing teams...")

    teams_df = df[["team_name"]].dropna().drop_duplicates().copy()
    teams_df.columns = ["name"]

    # Add short codes
    teams_df["short_name"] = teams_df["name"].map(
        lambda x: TEAM_SHORT_NAMES.get(x, x[:3].upper())
    )

    teams_to_insert = teams_df.to_dict("records")

    if teams_to_insert:
        try:
            for chunk in chunk_records(teams_to_insert, 100):
                supabase.table("teams").upsert(chunk, on_conflict="name").execute()
            print(f"✅ Upserted {len(teams_to_insert)} teams")
        except Exception as e:
            print(f"❌ Error upserting teams: {e}")
            return {}

    # Return team_id lookup map
    teams_result = supabase.table("teams").select("id, name, short_name").execute()
    team_map = {t["short_name"]: t["id"] for t in (teams_result.data or [])}
    return team_map


def upsert_players(df: pd.DataFrame, team_map: dict) -> dict:
    """Extract unique players from CSV and upsert to Supabase."""
    print("\n👥 Processing players...")

    players_df = df[["id", "web_name", "team_name", "element_type", "now_cost", "selected_by_percent"]].drop_duplicates(subset=["id"], keep="last").copy()
    players_df.columns = ["fpl_id", "name", "team_name", "position_code", "now_cost", "selected_by_percent"]

    # Map team names to team IDs
    players_df["team_id"] = players_df["team_name"].map(
        lambda x: team_map.get(TEAM_SHORT_NAMES.get(x, x[:3].upper()))
    )

    # Map position codes
    players_df["position"] = players_df["position_code"].map(
        lambda x: int(x) if pd.notna(x) else 1
    )

    players_to_insert = []
    for _, row in players_df.iterrows():
        if pd.isna(row["team_id"]):
            continue

        players_to_insert.append(
            {
                "fpl_id": int(row["fpl_id"]),
                "player_name": str(row["name"]),
                "web_name": str(row["name"]),
                "team_id": row["team_id"],
                "position": int(row["position"]),
                "cost": to_float(row.get("now_cost")) or 0,
                "ownership": to_float(row.get("selected_by_percent")),
                "is_active": True,
            }
        )

    if players_to_insert:
        try:
            for chunk in chunk_records(players_to_insert, 500):
                supabase.table("players").upsert(chunk, on_conflict="fpl_id").execute()
            print(f"✅ Upserted {len(players_to_insert)} players")
        except Exception as e:
            print(f"❌ Error upserting players: {e}")
            return {}

    # Return player_id lookup map
    players_result = supabase.table("players").select("id, fpl_id, player_name").execute()
    return {int(player["fpl_id"]): player["id"] for player in (players_result.data or []) if player.get("fpl_id") is not None}


def upsert_fixtures(team_map: dict) -> None:
    """Populate fixture rows from existing JSON analytics if available."""
    print("\n🎯 Processing fixtures...")

    fixtures_data = load_json_file("fixture_analysis/fixtures.json")
    if not fixtures_data:
        print("⚠️  No fixture JSON found; skipping fixtures")
        return

    fixtures_to_insert = []
    for fixture in fixtures_data:
        home_team = fixture.get("home_team", {}) or {}
        away_team = fixture.get("away_team", {}) or {}
        home_team_short = home_team.get("short_name") or TEAM_SHORT_NAMES.get(home_team.get("name", ""), home_team.get("name", "")[:3].upper())
        away_team_short = away_team.get("short_name") or TEAM_SHORT_NAMES.get(away_team.get("name", ""), away_team.get("name", "")[:3].upper())
        home_team_id = team_map.get(home_team_short)
        away_team_id = team_map.get(away_team_short)

        if not home_team_id or not away_team_id:
            continue

        fixtures_to_insert.append({
            "season_key": setup_current_season(),
            "gameweek": to_int(fixture.get("gameweek")) or 0,
            "home_team_id": home_team_id,
            "away_team_id": away_team_id,
            "fixture_label": f"{home_team.get('name', '')} vs {away_team.get('name', '')}",
            "home_attacking_fixture_rating": to_float(home_team.get("attacking_fixture_rating")),
            "home_defensive_fixture_rating": to_float(home_team.get("defensive_fixture_rating")),
            "home_attack_rank": to_int(home_team.get("rank", {}).get("attack")) if isinstance(home_team.get("rank"), dict) else None,
            "home_defense_rank": to_int(home_team.get("rank", {}).get("defense")) if isinstance(home_team.get("rank"), dict) else None,
            "home_attack_fdr": to_float(home_team.get("fdr", {}).get("attack")) if isinstance(home_team.get("fdr"), dict) else None,
            "home_defense_fdr": to_float(home_team.get("fdr", {}).get("defense")) if isinstance(home_team.get("fdr"), dict) else None,
            "home_overall_fdr": to_float(home_team.get("fdr", {}).get("overall")) if isinstance(home_team.get("fdr"), dict) else None,
            "away_attacking_fixture_rating": to_float(away_team.get("attacking_fixture_rating")),
            "away_defensive_fixture_rating": to_float(away_team.get("defensive_fixture_rating")),
            "away_attack_rank": to_int(away_team.get("rank", {}).get("attack")) if isinstance(away_team.get("rank"), dict) else None,
            "away_defense_rank": to_int(away_team.get("rank", {}).get("defense")) if isinstance(away_team.get("rank"), dict) else None,
            "away_attack_fdr": to_float(away_team.get("fdr", {}).get("attack")) if isinstance(away_team.get("fdr"), dict) else None,
            "away_defense_fdr": to_float(away_team.get("fdr", {}).get("defense")) if isinstance(away_team.get("fdr"), dict) else None,
            "away_overall_fdr": to_float(away_team.get("fdr", {}).get("overall")) if isinstance(away_team.get("fdr"), dict) else None,
        })

    if fixtures_to_insert:
        try:
            for chunk in chunk_records(fixtures_to_insert, 500):
                supabase.table("fixtures").upsert(chunk, on_conflict="season_key,gameweek,home_team_id,away_team_id").execute()
            print(f"✅ Upserted {len(fixtures_to_insert)} fixtures")
        except Exception as e:
            print(f"❌ Error upserting fixtures: {e}")


def upsert_team_fixture_summary(team_map: dict) -> None:
    """Populate team fixture summary rows from JSON analytics if available."""
    print("\n🏆 Processing team fixture summary...")

    summary_data = load_json_file("fixture_analysis/team_fixture_summary.json")
    if not summary_data:
        print("⚠️  No team fixture summary JSON found; skipping")
        return

    rankings_data = load_json_file("rankings/overall_rankings.json") or []
    team_short_lookup = {row.get("team"): row.get("team_short") for row in rankings_data if row.get("team")}

    summaries_to_insert = []
    for team in summary_data:
        team_name = team.get("team", "")
        team_short = team_short_lookup.get(team_name) or TEAM_SHORT_NAMES.get(team_name, team_name[:3].upper())
        team_id = team_map.get(team_short)
        if not team_id:
            continue

        summaries_to_insert.append({
            "season_key": setup_current_season(),
            "team_id": team_id,
            "avg_attack_difficulty": to_float(team.get("avg_attack_difficulty")),
            "avg_defense_difficulty": to_float(team.get("avg_defense_difficulty")),
            "overall_difficulty": to_float(team.get("overall_difficulty")),
            "near_term_home_fixtures": to_int(team.get("near_term_home_fixtures")),
            "medium_term_home_fixtures": to_int(team.get("medium_term_home_fixtures")),
            "near_term_rating": to_float(team.get("near_term_rating")),
            "medium_term_rating": to_float(team.get("medium_term_rating")),
            "fixture_swing": to_float(team.get("fixture_swing")),
            "swing_category": team.get("swing_category", ""),
            "form_context": team.get("form_context", ""),
        })

    if summaries_to_insert:
        try:
            supabase.table("team_fixture_summary").upsert(summaries_to_insert, on_conflict="season_key,team_id").execute()
            print(f"✅ Upserted {len(summaries_to_insert)} team fixture summaries")
        except Exception as e:
            print(f"❌ Error upserting team fixture summaries: {e}")


def upsert_gameweek_stats(df: pd.DataFrame, season_key: str) -> None:
    """Upsert per-gameweek player statistics to Supabase."""
    print("\n📈 Processing gameweek statistics...")

    df_stats = df.copy()

    # Normalize required columns
    df_stats = df_stats.fillna(
        {
            "gameweek": 0,
            "web_name": "",
            "team_name": "",
        }
    )

    # Convert gameweek to int
    df_stats["gameweek"] = pd.to_numeric(df_stats["gameweek"], errors="coerce").fillna(0).astype(int)

    players_result = supabase.table("players").select("id, fpl_id").execute()
    player_lookup = {int(player["fpl_id"]): player["id"] for player in (players_result.data or []) if player.get("fpl_id") is not None}

    gameweek_records = []
    for _, row in df_stats.iterrows():
        player_id = to_int(row.get("id"))
        gameweek = to_int(row.get("gameweek"))

        if not player_id or not gameweek:
            continue

        player_uuid = player_lookup.get(player_id)
        if not player_uuid:
            continue

        gameweek_records.append(
            {
                "season_key": season_key,
                "player_id": player_uuid,
                "gameweek": gameweek,
                "opponent": str(row.get("opponent_team_name", "")),
                "was_home": to_bool(row.get("was_home", False)),
                "now_cost": to_float(row.get("now_cost")),
                "selected_by_percent": to_float(row.get("selected_by_percent")),
                "total_points": to_int(row.get("total_points")),
                "minutes": to_int(row.get("minutes")),
                "goals": to_int(row.get("goals")),
                "assists": to_int(row.get("assists")),
                "clean_sheets": to_int(row.get("clean_sheet")),
                "xg": to_float(row.get("expected_goals")),
                "xa": to_float(row.get("expected_assists")),
                "xgi": to_float(row.get("expected_goal_involvements")),
                "xp": to_float(row.get("expected_points")),
                "expected_points": to_float(row.get("expected_points")),
                "pvsxp": to_float(row.get("PvsxP")),
                "shots": to_int(row.get("total_shots")),
                "shots_on_target": to_int(row.get("shots_on_target")),
                "shots_in_box": to_int(row.get("shots_in_box")),
                "key_passes": to_int(row.get("chances_created")),
                "chances_created": to_int(row.get("chances_created")),
                "touches": to_int(row.get("touches")),
                "touches_opp_box": to_int(row.get("touches_opp_box")),
                "defensive_contribution": to_float(row.get("defensive_contribution")),
                "xgc": to_float(row.get("expected_goals_conceded")),
                "goals_conceded": to_int(row.get("goals_conceded")),
                "expected_clean_sheet": to_float(row.get("expected_clean_sheet")),
                "clearances_blocks_interceptions": to_int(
                    row.get("clearances_blocks_interceptions")
                ),
                "recoveries": to_int(row.get("recoveries")),
                "tackles": to_int(row.get("tackles")),
                "expected_goals_conceded": to_float(row.get("expected_goals_conceded")),
                "expected_goal_involvements": to_float(row.get("expected_goal_involvements")),
                "non_penalty_expected_goal_involvements": to_float(
                    row.get("non_penalty_expected_goal_involvements")
                ),
                "non_penalty_expected_goals": to_float(row.get("non_penalty_expected_goals")),
                "non_penalty_goals": to_int(row.get("non_penalty_goals")),
                "clean_sheet": to_bool(row.get("clean_sheet", False)),
            }
        )

    if gameweek_records:
        unique_gameweeks = {}
        for record in gameweek_records:
            key = (record["season_key"], record["player_id"], record["gameweek"])
            unique_gameweeks[key] = record

        try:
            for chunk in chunk_records(list(unique_gameweeks.values()), 500):
                supabase.table("player_gameweeks").upsert(chunk, on_conflict="season_key,player_id,gameweek").execute()
            print(f"✅ Upserted {len(unique_gameweeks)} gameweek stat records")
        except Exception as e:
            print(f"❌ Error upserting gameweek stats: {e}")


def calculate_and_upsert_insights(df: pd.DataFrame, season_key: str) -> None:
    """Calculate player insights and upsert to Supabase."""
    print("\n💡 Calculating player insights...")

    insights = []

    players_result = supabase.table("players").select("id, fpl_id, player_name, web_name, team_id, position, cost, ownership").execute()
    player_lookup = {
        row["player_name"]: row
        for row in (players_result.data or [])
        if row.get("player_name")
    }
    teams_result = supabase.table("teams").select("id, name, short_name").execute()
    team_lookup = {row["name"]: row for row in (teams_result.data or []) if row.get("name")}

    # Group by player for season stats
    player_stats = (
        df.groupby("web_name")
        .agg(
            {
                "total_points": "sum",
                "goals": "sum",
                "assists": "sum",
                "clean_sheet": "sum",
                "defensive_contribution": "sum",
                "tackles": "sum",
                "expected_goals": "sum",
                "expected_assists": "sum",
                "selected_by_percent": "first",
                "now_cost": "first",
                "team_name": "first",
            }
        )
        .reset_index()
    )

    player_stats.columns = [
        "player_name",
        "total_points",
        "goals",
        "assists",
        "clean_sheets",
        "defensive_contribution",
        "tackles",
        "xg",
        "xa",
        "ownership",
        "price",
        "team_name",
    ]

    # Add derived metrics
    player_stats["team_short"] = player_stats["team_name"].map(
        lambda x: TEAM_SHORT_NAMES.get(x, x[:3].upper())
    )
    player_stats["points_per_million"] = (
        player_stats["total_points"] / player_stats["price"]
    )
    player_stats["overperformance"] = player_stats["goals"] - player_stats["xg"]

    def build_insight(player_row, insight_type: str, rank: int, sort_metric: float, secondary_metric: float | None = None):
        player_name = player_row["player_name"]
        player_info = player_lookup.get(player_name, {})
        team_info = team_lookup.get(player_row["team_name"], {})
        payload = {
            "player": player_name,
            "team": player_row["team_name"],
            "team_short": player_row["team_short"],
            "goals": int(player_row["goals"]),
            "assists": int(player_row["assists"]),
            "cleanSheets": int(player_row.get("clean_sheets", 0)),
            "clean_sheet_rate": float(player_row.get("clean_sheets", 0)),
            "csRate": float(player_row.get("clean_sheets", 0)),
            "defensiveContributions": float(player_row.get("defensive_contribution", 0)),
            "tackles": float(player_row.get("tackles", 0)),
            "xG": float(player_row["xg"]),
            "xA": float(player_row["xa"]),
            "points": float(player_row["total_points"]),
            "price": float(player_row["price"]),
            "ownership": float(player_row["ownership"]),
            "form": 0,
            "pointsPerMillion": float(player_row["points_per_million"]),
        }

        return {
            "season_key": season_key,
            "insight_type": insight_type,
            "player_id": player_info.get("id"),
            "player_name": player_info.get("web_name") or player_name,
            "team_id": team_info.get("id"),
            "team_name": player_row["team_name"],
            "team_short": player_row["team_short"],
            "position": player_info.get("position"),
            "rank": rank,
            "sort_metric": sort_metric,
            "secondary_metric": secondary_metric,
            "payload": payload,
        }

    # Create insights for the current dashboard endpoints.
    goal_scorers = player_stats.nlargest(30, "goals")
    assists = player_stats.nlargest(30, "assists")
    season_performers = player_stats.nlargest(30, "total_points")
    value_players = player_stats.nlargest(30, "points_per_million")
    hidden_gems = player_stats.sort_values(["ownership", "points_per_million"], ascending=[True, False]).head(30)
    overperformers = player_stats.sort_values("overperformance", ascending=False).head(30)
    underperformers = player_stats.sort_values("overperformance", ascending=True).head(30)

    for rank, (_, row) in enumerate(goal_scorers.iterrows(), start=1):
        insights.append(build_insight(row, "goal_scorers", rank, float(row["goals"]), float(row["xg"])))

    for rank, (_, row) in enumerate(assists.iterrows(), start=1):
        insights.append(build_insight(row, "assist_providers", rank, float(row["assists"]), float(row["xa"])))

    defensive_leaders = player_stats.sort_values(
        ["clean_sheets", "defensive_contribution", "tackles"],
        ascending=[False, False, False],
    ).head(30)
    for rank, (_, row) in enumerate(defensive_leaders.iterrows(), start=1):
        insights.append(build_insight(row, "defensive_leaders", rank, float(row["clean_sheets"]), float(row["defensive_contribution"])))

    for rank, (_, row) in enumerate(season_performers.iterrows(), start=1):
        insights.append(build_insight(row, "season_performers", rank, float(row["total_points"]), float(row["points_per_million"])))

    for rank, (_, row) in enumerate(value_players.iterrows(), start=1):
        insights.append(build_insight(row, "value_players", rank, float(row["points_per_million"]), float(row["total_points"])))

    for rank, (_, row) in enumerate(hidden_gems.iterrows(), start=1):
        insights.append(build_insight(row, "hidden_gems", rank, float(row["points_per_million"]), float(row["ownership"])))

    for rank, (_, row) in enumerate(overperformers.iterrows(), start=1):
        insights.append(build_insight(row, "overperformers", rank, float(row["overperformance"]), float(row["xg"])))

    for rank, (_, row) in enumerate(underperformers.iterrows(), start=1):
        insights.append(build_insight(row, "underperformers", rank, float(row["overperformance"]), float(row["xg"])))

    # Prefer low-ownership high-output forwards/ mids as sustainable scorers.
    sustainable = player_stats.sort_values(["goals", "points_per_million"], ascending=[False, False]).head(30)
    for rank, (_, row) in enumerate(sustainable.iterrows(), start=1):
        insights.append(build_insight(row, "sustainable_scorers", rank, float(row["goals"]), float(row["xg"])))

    if insights:
        try:
            supabase.table("player_insights").delete().eq("season_key", season_key).execute()
            for chunk in chunk_records(insights, 500):
                supabase.table("player_insights").insert(chunk).execute()
            print(f"✅ Upserted {len(insights)} player insights")
        except Exception as e:
            print(f"❌ Error upserting insights: {e}")


def migrate_json_rankings(team_map: dict) -> None:
    """Populate team rankings from existing JSON if available."""
    print("\n🏆 Processing team rankings...")

    rankings_data = load_json_file("rankings/overall_rankings.json")
    if not rankings_data:
        print("⚠️  No rankings JSON found; skipping team rankings")
        return

    teams_result = supabase.table("teams").select("id, name, short_name").execute()
    team_lookup = {row["name"]: row for row in (teams_result.data or []) if row.get("name")}

    rankings_to_insert = []
    for team in rankings_data:
        team_name = team.get("team", "")
        team_info = team_lookup.get(team_name)
        if not team_info:
            continue

        rankings_to_insert.append({
            "season_key": setup_current_season(),
            "team_id": team_info["id"],
            "ranking_type": "overall",
            "overall_rank": to_int(team.get("overall_rank")),
            "attack_rank": to_int(team.get("attack_rank")),
            "defense_rank": to_int(team.get("defense_rank")),
            "overall_strength": to_float(team.get("overall_strength")),
            "attack_strength": to_float(team.get("attack_strength")),
            "defense_strength": to_float(team.get("defense_strength")),
            "goals_per_game": to_float(team.get("goals_per_game")),
            "expected_goals_per_game": to_float(team.get("expected_goals_per_game")),
            "goals_conceded_per_game": to_float(team.get("goals_conceded_per_game")),
            "clean_sheet_rate": to_float(team.get("clean_sheet_rate")),
            "defensive_contribution": to_float(team.get("defensive_contribution")),
        })

    if rankings_to_insert:
        try:
            supabase.table("team_rankings").upsert(rankings_to_insert, on_conflict="season_key,team_id,ranking_type").execute()
            print(f"✅ Upserted {len(rankings_to_insert)} team rankings")
        except Exception as e:
            print(f"❌ Error upserting team rankings: {e}")


def main(season_key: str = "2025_26"):
    """Run the complete ETL pipeline."""
    print("\n" + "=" * 60)
    print("🚀 FPL ETL PIPELINE (SIMPLIFIED)")
    print("=" * 60)

    start_time = datetime.now()

    # Step 1: Setup
    setup_season(season_key)

    # Step 2: Load CSV
    df = load_csv()
    if df is None or df.empty:
        print("\n❌ Failed to load CSV. Aborting.")
        return False

    # Step 3: Teams
    team_map = upsert_teams(df)
    if not team_map:
        print("\n⚠️  Warning: No teams processed, continuing anyway...")

    # Step 4: Players
    player_map = upsert_players(df, team_map)
    if not player_map:
        print("\n⚠️  Warning: No players processed")

    # Step 5: Fixtures and fixture summaries (from JSON cache if present)
    upsert_fixtures(team_map)
    upsert_team_fixture_summary(team_map)

    # Step 6: Gameweek Statistics
    upsert_gameweek_stats(df, season_key)

    # Step 7: Analytics and dashboard insights
    migrate_json_rankings(team_map)
    calculate_and_upsert_insights(df, season_key)

    # Summary
    elapsed = (datetime.now() - start_time).total_seconds()
    print("\n" + "=" * 60)
    print(f"✅ ETL Pipeline completed in {elapsed:.1f} seconds")
    print("=" * 60 + "\n")

    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FPL ETL Pipeline")
    parser.add_argument(
        "--season",
        type=str,
        default="2025_26",
        help="Season key (default: 2025_26)",
    )

    args = parser.parse_args()

    try:
        success = main(args.season)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
