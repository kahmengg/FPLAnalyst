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
import os
import sys
from datetime import datetime
from typing import Optional

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


def chunk_records(records: list, chunk_size: int = 500):
    """Yield successive chunks of records."""
    for index in range(0, len(records), chunk_size):
        yield records[index : index + chunk_size]


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
        print(f"❌ CSV file not found: {csv_path}")
        return None

    try:
        df = pd.read_csv(csv_path)
        print(f"✅ Loaded CSV with {len(df)} rows and {len(df.columns)} columns")
        return df
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return None


def setup_season(season_key: str) -> str:
    """Validate and set season key."""
    # Store in environment for child functions
    os.environ["FPL_SEASON_KEY"] = season_key
    print(f"📅 Season: {season_key}")
    return season_key


def upsert_teams(df: pd.DataFrame) -> dict:
    """Extract unique teams from CSV and upsert to Supabase."""
    print("\n📊 Processing teams...")

    teams_df = df[["team_name"]].drop_duplicates().copy()
    teams_df.columns = ["name"]

    # Add short codes
    teams_df["short_name"] = teams_df["name"].map(
        lambda x: TEAM_SHORT_NAMES.get(x, x[:3].upper())
    )

    teams_to_insert = teams_df.to_dict("records")

    if teams_to_insert:
        try:
            for chunk in chunk_records(teams_to_insert, 100):
                supabase.table("teams").upsert(chunk, ignore_duplicates=True).execute()
            print(f"✅ Upserted {len(teams_to_insert)} teams")
        except Exception as e:
            print(f"❌ Error upserting teams: {e}")
            return {}

    # Return team_id lookup map
    teams_result = supabase.table("teams").select("id, short_name").execute()
    team_map = {t["short_name"]: t["id"] for t in (teams_result.data or [])}
    return team_map


def upsert_players(df: pd.DataFrame, team_map: dict) -> dict:
    """Extract unique players from CSV and upsert to Supabase."""
    print("\n👥 Processing players...")

    players_df = df[["id", "web_name", "team_name", "element_type"]].drop_duplicates().copy()
    players_df.columns = ["player_id", "name", "team_name", "position_code"]

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
                "id": int(row["player_id"]),
                "player_name": str(row["name"]),
                "web_name": str(row["name"]),
                "team_id": int(row["team_id"]),
                "position": int(row["position"]),
                "is_active": True,
            }
        )

    if players_to_insert:
        try:
            for chunk in chunk_records(players_to_insert, 500):
                supabase.table("players").upsert(chunk, ignore_duplicates=True).execute()
            print(f"✅ Upserted {len(players_to_insert)} players")
        except Exception as e:
            print(f"❌ Error upserting players: {e}")
            return {}

    # Return player_id lookup map
    return {p["id"]: p["player_name"] for p in players_to_insert}


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

    gameweek_records = []
    for _, row in df_stats.iterrows():
        player_id = to_int(row.get("id"))
        gameweek = to_int(row.get("gameweek"))

        if not player_id or not gameweek:
            continue

        gameweek_records.append(
            {
                "season_key": season_key,
                "player_id": player_id,
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
        try:
            for chunk in chunk_records(gameweek_records, 500):
                supabase.table("player_gameweeks").upsert(chunk, ignore_duplicates=True).execute()
            print(f"✅ Upserted {len(gameweek_records)} gameweek stat records")
        except Exception as e:
            print(f"❌ Error upserting gameweek stats: {e}")


def calculate_and_upsert_insights(df: pd.DataFrame, season_key: str) -> None:
    """Calculate player insights and upsert to Supabase."""
    print("\n💡 Calculating player insights...")

    insights = []

    # Group by player for season stats
    player_stats = (
        df.groupby("web_name")
        .agg(
            {
                "total_points": "sum",
                "goals": "sum",
                "assists": "sum",
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
    player_stats["is_overperforming"] = player_stats["xg"] > 0
    player_stats["overperformance"] = player_stats["goals"] - player_stats["xg"]

    # Create insights for top performers
    for _, row in player_stats.nlargest(30, "goals").iterrows():
        insights.append(
            {
                "season_key": season_key,
                "player_name": row["player_name"],
                "team_short": row["team_short"],
                "insight_type": "goal_scorers",
                "rank": None,  # Will be set by query
                "total_points": int(row["total_points"]),
                "goals": int(row["goals"]),
                "assists": int(row["assists"]),
                "expected_goals": float(row["xg"]),
                "expected_assists": float(row["xa"]),
                "price": float(row["price"]),
                "ownership": float(row["ownership"]),
                "points_per_million": float(row["points_per_million"]),
                "created_at": datetime.utcnow().isoformat(),
            }
        )

    if insights:
        try:
            for chunk in chunk_records(insights, 500):
                supabase.table("player_insights").upsert(chunk, ignore_duplicates=True).execute()
            print(f"✅ Upserted {len(insights)} player insights")
        except Exception as e:
            print(f"❌ Error upserting insights: {e}")


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

    # Step 5: Gameweek Statistics
    upsert_gameweek_stats(df, season_key)

    # Step 6: Insights (optional, for analytics)
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
