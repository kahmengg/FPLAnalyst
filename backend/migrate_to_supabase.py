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
    print("\n📈 Migrating raw CSV stats (gameweek data only)...")

    df = load_csv_file()
    if df is None or df.empty:
        print("⚠️  No CSV stats found")
        return

    required_columns = {"id", "web_name", "team_name", "gameweek"}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        print(f"❌ CSV is missing required columns: {', '.join(sorted(missing_columns))}")
        return

    # Normalize field names
    df = df.copy()
    df["team_name"] = df["team_name"].fillna("").astype(str)
    df["web_name"] = df["web_name"].fillna("").astype(str)
    df["gameweek"] = pd.to_numeric(df["gameweek"], errors="coerce").fillna(0).astype(int)

    season_key = setup_current_season()
    
    # Get existing player IDs from database
    players_result = supabase.table("players").select("id, player_name").execute()
    player_map = {p['player_name']: p['id'] for p in (players_result.data or [])}

    gameweek_records = []
    for _, row in df.iterrows():
        player_name = str(row["web_name"])
        player_id = player_map.get(player_name)
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
    
    rankings_data = load_json_file('rankings/overall_rankings.json')
    if not rankings_data or not isinstance(rankings_data, list):
        print("⚠️  No rankings data found for teams")
        return
    
    teams_to_insert = [
        {"name": team['team'], "short_name": team.get('team_short', team['team'][:3].upper())} 
        for team in rankings_data
    ]
    
    if teams_to_insert:
        try:
            supabase.table("teams").upsert(teams_to_insert, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(teams_to_insert)} teams from rankings")
        except Exception as e:
            print(f"❌ Error migrating teams: {e}")


def migrate_players():
    """Migrate player data from top performers JSON."""
    print("\n👥 Migrating players...")
    
    # Get team IDs for lookup
    teams_result = supabase.table("teams").select("id, short_name").execute()
    team_map = {t['short_name']: t['id'] for t in (teams_result.data or [])}
    
    players_to_insert = []
    insight_files = ['top_performers/goal_scorers.json', 'top_performers/assist_providers.json', 
                     'top_performers/defensive_leaders.json', 'top_performers/value_players.json',
                     'top_performers/hidden_gems.json', 'top_performers/season_performers.json']
    
    seen_players = set()
    
    for file_path in insight_files:
        data = load_json_file(file_path)
        if not data or not isinstance(data, list):
            continue
        
        for player in data:
            player_key = (player.get('player', ''), player.get('team_short', ''))
            if player_key in seen_players:
                continue
            seen_players.add(player_key)
            
            team_short = player.get('team_short', '')
            team_id = team_map.get(team_short)
            
            players_to_insert.append({
                "player_name": player.get('player', ''),
                "web_name": player.get('player', ''),
                "team_id": team_id,
                "position": 1,  # Default to 1, CSV will override
                "cost": float(player.get('price', 0)),
                "ownership": float(player.get('ownership', 0)),
                "is_active": True,
            })
    
    if players_to_insert:
        try:
            for chunk in chunk_records(players_to_insert, 500):
                supabase.table("players").upsert(chunk, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(players_to_insert)} players from top performers")
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


def migrate_team_fixture_summary():
    """Migrate team fixture summary data."""
    print("\n🏆 Migrating team fixture summaries...")
    
    season_key = setup_current_season()
    
    # Get team IDs for lookup
    teams_result = supabase.table("teams").select("id, short_name").execute()
    team_map = {t['short_name']: t['id'] for t in (teams_result.data or [])}
    
    summary_data = load_json_file('fixture_analysis/team_fixture_summary.json')
    if not summary_data or not isinstance(summary_data, list):
        print("⚠️  No team fixture summary data found")
        return
    
    summaries_to_insert = []
    for team in summary_data:
        team_name = team.get('team', '')
        # Find team_short by matching team name to rankings
        team_short = None
        rankings_data = load_json_file('rankings/overall_rankings.json')
        if rankings_data and isinstance(rankings_data, list):
            for r in rankings_data:
                if r.get('team', '') == team_name:
                    team_short = r.get('team_short')
                    break
        
        if not team_short:
            team_short = team_name[:3].upper()
        
        team_id = team_map.get(team_short)
        if not team_id:
            continue
        
        summary = {
            "season_key": season_key,
            "team_id": team_id,
            "avg_attack_difficulty": float(team.get('avg_attack_difficulty', 0)),
            "avg_defense_difficulty": float(team.get('avg_defense_difficulty', 0)),
            "overall_difficulty": float(team.get('overall_difficulty', 0)),
            "near_term_home_fixtures": int(team.get('near_term_home_fixtures', 0)),
            "medium_term_home_fixtures": int(team.get('medium_term_home_fixtures', 0)),
            "near_term_rating": float(team.get('near_term_rating', 0)),
            "medium_term_rating": float(team.get('medium_term_rating', 0)),
            "fixture_swing": float(team.get('fixture_swing', 0)),
            "swing_category": team.get('swing_category', ''),
            "form_context": team.get('form_context', ''),
        }
        summaries_to_insert.append(summary)
    
    if summaries_to_insert:
        try:
            supabase.table("team_fixture_summary").upsert(summaries_to_insert, ignore_duplicates=True).execute()
            print(f"✅ Migrated {len(summaries_to_insert)} team fixture summaries")
        except Exception as e:
            print(f"❌ Error migrating team fixture summaries: {e}")


def migrate_player_insights():
    """Migrate top performers data into player_insights table."""
    print("\n⭐ Migrating player insights...")
    
    season_key = setup_current_season()
    
    # Get player IDs for lookup
    players_result = supabase.table("players").select("id, player_name").execute()
    player_name_map = {p['player_name']: p['id'] for p in (players_result.data or [])}
    
    # Get team IDs for lookup
    teams_result = supabase.table("teams").select("id, short_name").execute()
    team_map = {t['short_name']: t['id'] for t in (teams_result.data or [])}
    
    # FPL Position mapping: 1=GK, 2=DEF, 3=MID, 4=FWD
    position_map = {
        'goal_scorers': 4,
        'assist_providers': 3,
        'defensive_leaders': 2,
        'value_players': None,
        'hidden_gems': None,
        'season_performers': 4,
        'overperformers': 4,
        'underperformers': None,
        'sustainable_scorers': 4,
    }
    
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
        
        if not isinstance(data, list):
            continue
        
        for rank, player in enumerate(data, start=1):
            player_name = player.get('player', '')
            team_short = player.get('team_short', '')
            
            player_id = player_name_map.get(player_name)
            team_id = team_map.get(team_short)
            
            # Get position: use mapping if available, otherwise None
            position = position_map.get(insight_type)
            
            insight = {
                "season_key": season_key,
                "insight_type": insight_type,
                "player_name": player_name,
                "team_name": player.get('team', ''),
                "team_short": team_short,
                "team_id": team_id,
                "player_id": player_id,
                "position": position,
                "rank": rank,
                "sort_metric": float(player.get('points') or player.get('pointsPerMillion') or player.get('goals') or 0),
                "secondary_metric": float(player.get('xG') or player.get('xA') or 0) if player.get('xG') or player.get('xA') else None,
                "payload": json.dumps(player)
            }
            insights_to_insert.append(insight)
    
    if insights_to_insert:
        try:
            for chunk in chunk_records(insights_to_insert, 500):
                supabase.table("player_insights").upsert(chunk, ignore_duplicates=True).execute()
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
    """Run all migrations in clean order: teams → players → fixtures → CSV data → analytics."""
    print("🚀 Starting Supabase migration (clean ETL)...")
    print(f"📁 Data directory: {Config.DATA_DIR}")
    
    try:
        # Step 1: Base data from analytics JSON (teams, players)
        migrate_teams()
        migrate_players()
        
        # Step 2: Fixtures and fixture-based analytics
        migrate_fixtures()
        migrate_team_fixture_summary()
        
        # Step 3: Raw gameweek data from CSV
        migrate_csv_stats()
        
        # Step 4: Analytics (rankings, insights)
        migrate_team_rankings()
        migrate_player_insights()
        
        print("\n✅ ETL complete! All data is now in Supabase.")
        print("📊 Check your Supabase dashboard to verify data population.")
        
    except Exception as e:
        print(f"\n❌ ETL failed: {e}")


if __name__ == "__main__":
    main()
