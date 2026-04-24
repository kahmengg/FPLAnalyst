#!/usr/bin/env python3
"""
Migration script to load existing JSON analytics data into Supabase.
Run this once to populate the database from your current JSON files.
"""
import json
import os
from datetime import datetime

import pandas as pd
from config.config import Config
from utils.supabase_client import supabase


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


def load_json_file(filename):
    """Load a JSON file from the data directory."""
    filepath = os.path.join(Config.DATA_DIR, filename)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  File not found: {filepath}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error in {filename}: {e}")
        return None


def chunk_records(records, chunk_size=500):
    for index in range(0, len(records), chunk_size):
        yield records[index:index + chunk_size]


def load_csv_file():
    """Load the latest FPL CSV export."""
    if not os.path.exists(Config.FPL_DATA_CSV):
        print(f"⚠️  CSV file not found: {Config.FPL_DATA_CSV}")
        return None

    try:
        return pd.read_csv(Config.FPL_DATA_CSV)
    except Exception as e:
        print(f"❌ Error reading CSV file: {e}")
        return None


def to_bool(value):
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "t", "yes", "y"}


def to_float(value):
    try:
        if pd.isna(value):
            return None
        return float(value)
    except Exception:
        return None


def to_int(value):
    try:
        if pd.isna(value):
            return None
        return int(value)
    except Exception:
        return None


def migrate_csv_stats():
    """Migrate the raw per-gameweek CSV export into Supabase tables."""
    print("\n📈 Migrating raw CSV stats...")

    df = load_csv_file()
    if df is None or df.empty:
        print("⚠️  No CSV stats found")
        return

    required_columns = {"id", "web_name", "team_name", "gameweek"}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        print(f"❌ CSV is missing required columns: {', '.join(sorted(missing_columns))}")
        return

    # Normalize field names so we can safely upsert into PostgreSQL.
    df = df.copy()
    df["team_name"] = df["team_name"].fillna("").astype(str)
    df["web_name"] = df["web_name"].fillna("").astype(str)
    df["now_cost"] = pd.to_numeric(df.get("now_cost"), errors="coerce")
    df["selected_by_percent"] = pd.to_numeric(df.get("selected_by_percent"), errors="coerce")
    df["gameweek"] = pd.to_numeric(df["gameweek"], errors="coerce").fillna(0).astype(int)
    df["was_home"] = df.get("was_home", False).astype(str).str.lower().isin(["true", "1", "t", "yes"])

    season_key = setup_current_season()

    team_names = sorted({team for team in df["team_name"].tolist() if team})
    if not team_names:
        print("⚠️  No teams found in CSV")
        return

    teams_to_insert = [{"name": team, "short_name": TEAM_SHORT_NAMES.get(team, team[:3].upper())} for team in team_names]
    try:
        supabase.table("teams").upsert(teams_to_insert, ignore_duplicates=True).execute()
        print(f"✅ Migrated {len(teams_to_insert)} teams from CSV")
    except Exception as e:
        print(f"❌ Error migrating CSV teams: {e}")
        return

    teams_result = supabase.table("teams").select("id, name, short_name").execute()
    team_map = {team["name"]: team["id"] for team in (teams_result.data or [])}

    player_records = []
    for _, row in df.drop_duplicates(subset=["id"]).iterrows():
        player_records.append({
            "fpl_id": int(row["id"]),
            "player_name": str(row["web_name"]),
            "web_name": str(row["web_name"]),
            "team_id": team_map.get(str(row["team_name"])),
            "position": int(row.get("element_type", 1) or 1),
            "cost": float(row.get("now_cost", 0) or 0),
            "ownership": float(row.get("selected_by_percent", 0) or 0),
            "is_active": True,
        })

    if player_records:
        try:
            for chunk in chunk_records(player_records, 500):
                supabase.table("players").upsert(chunk, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(player_records)} players from CSV")
        except Exception as e:
            print(f"❌ Error migrating CSV players: {e}")
            return

    players_result = supabase.table("players").select("id, fpl_id").execute()
    player_map = {int(player["fpl_id"]): player["id"] for player in (players_result.data or []) if player.get("fpl_id") is not None}

    gameweek_records = []
    for _, row in df.iterrows():
        fpl_id = int(row["id"])
        player_id = player_map.get(fpl_id)
        if not player_id:
            continue

        gameweek_records.append({
            "season_key": season_key,
            "player_id": player_id,
            "gameweek": int(row["gameweek"]),
            "opponent": row.get("opponent_team_name"),
            "was_home": to_bool(row.get("was_home", False)),
            "now_cost": to_float(row.get("now_cost")),
            "selected_by_percent": to_float(row.get("selected_by_percent")),
            "total_points": to_float(row.get("total_points")),
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
            "clearances_blocks_interceptions": to_int(row.get("clearances_blocks_interceptions")),
            "recoveries": to_int(row.get("recoveries")),
            "tackles": to_int(row.get("tackles")),
            "expected_goals_conceded": to_float(row.get("expected_goals_conceded")),
            "expected_goal_involvements": to_float(row.get("expected_goal_involvements")),
            "non_penalty_expected_goal_involvements": to_float(row.get("non_penalty_expected_goal_involvements")),
            "non_penalty_expected_goals": to_float(row.get("non_penalty_expected_goals")),
            "non_penalty_goals": to_int(row.get("non_penalty_goals")),
            "clean_sheet": to_bool(row.get("clean_sheet", False))
        })

    if gameweek_records:
        try:
            for chunk in chunk_records(gameweek_records, 500):
                supabase.table("player_gameweeks").upsert(chunk, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(gameweek_records)} player gameweek rows from CSV")
        except Exception as e:
            print(f"❌ Error migrating CSV gameweeks: {e}")


def setup_current_season():
    """Return a stable season key for partitioning records."""
    return os.getenv("FPL_SEASON_KEY", "2025_26")


def migrate_teams():
    """Migrate team data from rankings JSON."""
    print("\n📊 Migrating teams...")
    
    # Extract teams from various data sources
    teams_set = set()
    
    # From rankings
    rankings_data = load_json_file('rankings/overall_rankings.json')
    if rankings_data and isinstance(rankings_data, list):
        for team in rankings_data:
            if 'team' in team and 'team_short' in team:
                teams_set.add((team['team'], team['team_short']))
    
    # From quick picks / other sources
    for root, dirs, files in os.walk(os.path.join(Config.DATA_DIR)):
        for file in files:
            if file.endswith('.json'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    if isinstance(data, list):
                        for item in data:
                            if 'team_short' in item and 'team' in item:
                                teams_set.add((item['team'], item['team_short']))
                except:
                    pass
    
    # Insert teams
    teams_to_insert = [{"name": name, "short_name": code} for name, code in teams_set]
    
    if teams_to_insert:
        try:
            result = supabase.table("teams").upsert(teams_to_insert, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(teams_to_insert)} teams")
        except Exception as e:
            print(f"❌ Error migrating teams: {e}")


def migrate_players():
    """Migrate player data."""
    print("\n👥 Migrating players...")
    
    season_key = setup_current_season()
    
    all_players_data = load_json_file('player_trends/all_players.json')
    if not all_players_data or 'players' not in all_players_data:
        print("⚠️  No player data found")
        return
    
    # Get team IDs for lookup
    teams_result = supabase.table("teams").select("id, short_name").execute()
    team_map = {t['short_name']: t['id'] for t in (teams_result.data or [])}
    
    players_to_insert = []
    for player in all_players_data['players']:
        team_short = player.get('team', '')
        team_id = team_map.get(team_short)
        
        player_record = {
            "fpl_id": player.get('id'),
            "player_name": player.get('name', ''),
            "web_name": player.get('name', ''),
            "team_id": team_id,
            "position": player.get('position', 1),
            "cost": float(player.get('cost', 0)),
            "ownership": float(player.get('ownership', 0)),
            "is_active": True
        }
        players_to_insert.append(player_record)
    
    if players_to_insert:
        try:
            # Upsert by fpl_id
            result = supabase.table("players").upsert(players_to_insert, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(players_to_insert)} players")
        except Exception as e:
            print(f"❌ Error migrating players: {e}")


def migrate_fixtures():
    """Migrate fixture data."""
    print("\n🎯 Migrating fixtures...")
    
    season_key = setup_current_season()
    
    fixtures_data = load_json_file('fixture_analysis/fixtures.json')
    if not fixtures_data or not isinstance(fixtures_data, list):
        print("⚠️  No fixture data found")
        return
    
    # Get team IDs for lookup
    teams_result = supabase.table("teams").select("id, short_name").execute()
    team_map = {t['short_name']: t['id'] for t in (teams_result.data or [])}
    
    fixtures_to_insert = []
    for fixture in fixtures_data:
        home_team_short = fixture.get('home_team', {}).get('short_name', '')
        away_team_short = fixture.get('away_team', {}).get('short_name', '')
        
        home_team_id = team_map.get(home_team_short)
        away_team_id = team_map.get(away_team_short)
        
        if not home_team_id or not away_team_id:
            continue
        
        fixture_record = {
            "season_key": season_key,
            "gameweek": fixture.get('gameweek', 0),
            "home_team_id": home_team_id,
            "away_team_id": away_team_id,
            "fixture_label": f"{fixture.get('home_team', {}).get('name', '')} vs {fixture.get('away_team', {}).get('name', '')}",
            "home_attacking_fixture_rating": float(fixture.get('home_team', {}).get('attacking_fixture_rating', 0)),
            "home_defensive_fixture_rating": float(fixture.get('home_team', {}).get('defensive_fixture_rating', 0)),
            "home_attack_rank": fixture.get('home_team', {}).get('rank', {}).get('attack', 0),
            "home_defense_rank": fixture.get('home_team', {}).get('rank', {}).get('defense', 0),
            "home_attack_fdr": float(fixture.get('home_team', {}).get('fdr', {}).get('attack', 0)),
            "home_defense_fdr": float(fixture.get('home_team', {}).get('fdr', {}).get('defense', 0)),
            "home_overall_fdr": float(fixture.get('home_team', {}).get('fdr', {}).get('overall', 0)),
            "away_attacking_fixture_rating": float(fixture.get('away_team', {}).get('attacking_fixture_rating', 0)),
            "away_defensive_fixture_rating": float(fixture.get('away_team', {}).get('defensive_fixture_rating', 0)),
            "away_attack_rank": fixture.get('away_team', {}).get('rank', {}).get('attack', 0),
            "away_defense_rank": fixture.get('away_team', {}).get('rank', {}).get('defense', 0),
            "away_attack_fdr": float(fixture.get('away_team', {}).get('fdr', {}).get('attack', 0)),
            "away_defense_fdr": float(fixture.get('away_team', {}).get('fdr', {}).get('defense', 0)),
            "away_overall_fdr": float(fixture.get('away_team', {}).get('fdr', {}).get('overall', 0)),
        }
        fixtures_to_insert.append(fixture_record)
    
    if fixtures_to_insert:
        try:
            result = supabase.table("fixtures").upsert(fixtures_to_insert, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(fixtures_to_insert)} fixtures")
        except Exception as e:
            print(f"❌ Error migrating fixtures: {e}")


def migrate_player_insights():
    """Migrate top performers data into player_insights table."""
    print("\n⭐ Migrating player insights...")
    
    season_key = setup_current_season()
    
    # Get team IDs for lookup
    teams_result = supabase.table("teams").select("id, short_name").execute()
    team_map = {t['short_name']: t['id'] for t in (teams_result.data or [])}
    
    insight_files = {
        'goal_scorers': 'top_performers/goal_scorers.json',
        'assist_providers': 'top_performers/assist_providers.json',
        'defensive_leaders': 'top_performers/defensive_leaders.json',
        'value_players': 'top_performers/value_players.json',
        'hidden_gems': 'top_performers/hidden_gems.json',
        'season_performers': 'top_performers/season_performers.json',
        'overperformers': 'performance_analysis/overperformers.json',
        'underperformers': 'performance_analysis/underperformers.json',
        'sustainable_scorers': 'performance_analysis/sustainable_scorers.json',
    }
    
    insights_to_insert = []
    
    for insight_type, file_path in insight_files.items():
        data = load_json_file(file_path)
        if not data:
            continue
        
        # Handle nested structures (e.g., all_insights.json)
        if isinstance(data, dict):
            data = data.get(insight_type, [])
        
        if not isinstance(data, list):
            continue
        
        for rank, player in enumerate(data, start=1):
            team_short = player.get('team_short', '')
            team_id = team_map.get(team_short)
            
            insight = {
                "season_key": season_key,
                "insight_type": insight_type,
                "player_name": player.get('player', ''),
                "team_name": player.get('team', ''),
                "team_short": team_short,
                "team_id": team_id,
                "position": player.get('position'),
                "rank": rank,
                "sort_metric": player.get('points') or player.get('pointsPerMillion') or 0,
                "secondary_metric": None,
                "payload": json.dumps(player)
            }
            insights_to_insert.append(insight)
    
    if insights_to_insert:
        try:
            result = supabase.table("player_insights").upsert(insights_to_insert, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(insights_to_insert)} player insights")
        except Exception as e:
            print(f"❌ Error migrating player insights: {e}")


def migrate_team_rankings():
    """Migrate team ranking data."""
    print("\n🏆 Migrating team rankings...")
    
    season_key = setup_current_season()
    
    # Get team IDs for lookup
    teams_result = supabase.table("teams").select("id, short_name").execute()
    team_map = {t['short_name']: t['id'] for t in (teams_result.data or [])}
    
    rankings_data = load_json_file('rankings/overall_rankings.json')
    if not rankings_data or not isinstance(rankings_data, list):
        print("⚠️  No rankings data found")
        return
    
    rankings_to_insert = []
    for team in rankings_data:
        team_id = team_map.get(team.get('team_short'))
        if not team_id:
            continue
        
        ranking = {
            "season_key": season_key,
            "team_id": team_id,
            "ranking_type": "overall",
            "overall_rank": team.get('overall_rank'),
            "attack_rank": team.get('attack_rank'),
            "defense_rank": team.get('defense_rank'),
            "overall_strength": float(team.get('overall_strength', 0)),
            "attack_strength": float(team.get('attack_strength', 0)),
            "defense_strength": float(team.get('defense_strength', 0)),
            "goals_per_game": float(team.get('goals_per_game', 0)),
            "expected_goals_per_game": float(team.get('expected_goals_per_game', 0)),
            "goals_conceded_per_game": float(team.get('goals_conceded_per_game', 0)),
            "clean_sheet_rate": float(team.get('clean_sheet_rate', 0)),
            "defensive_contribution": float(team.get('defensive_contribution', 0)),
        }
        rankings_to_insert.append(ranking)
    
    if rankings_to_insert:
        try:
            result = supabase.table("team_rankings").upsert(rankings_to_insert, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(rankings_to_insert)} team rankings")
        except Exception as e:
            print(f"❌ Error migrating team rankings: {e}")


def main():
    """Run all migrations."""
    print("🚀 Starting Supabase migration from JSON files...")
    print(f"📁 Data directory: {Config.DATA_DIR}")
    
    try:
        migrate_csv_stats()
        migrate_teams()
        migrate_players()
        migrate_fixtures()
        migrate_player_insights()
        migrate_team_rankings()
        
        print("\n✅ Migration complete! Your data is now in Supabase.")
        print("📝 Next step: Update your backend routes to use the Supabase client.")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")


if __name__ == "__main__":
    main()
