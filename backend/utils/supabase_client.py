"""Supabase client initialization and helper methods."""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Prefer the anon key so the project can run without a separate service-role secret.
SUPABASE_KEY = SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY
SEASON_KEY = os.getenv("FPL_SEASON_KEY", "2025_26")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_KEY) must be set in environment variables")

# Initialize Supabase client.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_current_season():
    """Return the configured season key."""
    return SEASON_KEY


def query_player_insights_by_type(insight_type: str, limit: int = 100):
    """Query player insights by type (e.g., 'goal_scorers', 'value_players')."""
    try:
        season_id = get_current_season()
        if not season_id:
            return []
        
        result = (
            supabase.table("player_insights")
            .select("*")
            .eq("season_key", season_id)
            .eq("insight_type", insight_type)
            .order("rank")
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"Error querying player insights ({insight_type}): {e}")
        return []


def query_fixtures_by_gameweek(gameweek: int = None):
    """Query fixtures, optionally filtered by gameweek."""
    try:
        season_id = get_current_season()
        if not season_id:
            return []
        
        query = supabase.table("fixtures").select("*").eq("season_id", season_id)
        query = supabase.table("fixtures").select("*").eq("season_key", season_id)
        
        if gameweek:
            query = query.eq("gameweek", gameweek)
        
        result = query.order("gameweek").execute()
        return result.data or []
    except Exception as e:
        print(f"Error querying fixtures: {e}")
        return []


def query_team_rankings(ranking_type: str = "overall"):
    """Query team rankings by type (overall, attack, defense)."""
    try:
        season_id = get_current_season()
        if not season_id:
            return []
        
        result = (
            supabase.table("team_rankings")
            .select("*, teams!inner(name, short_name)")
            .eq("season_key", season_id)
            .eq("ranking_type", ranking_type)
            .order("overall_rank")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"Error querying team rankings: {e}")
        return []


def query_team_fixture_summary():
    """Query team fixture summary data."""
    try:
        season_id = get_current_season()
        if not season_id:
            return []
        
        result = (
            supabase.table("team_fixture_summary")
            .select("*, teams!inner(name, short_name)")
            .eq("season_key", season_id)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"Error querying team fixture summary: {e}")
        return []


def query_player_gameweeks(player_name: str, limit_gws: int = None):
    """Query gameweek-by-gameweek data for a player."""
    try:
        season_id = get_current_season()
        if not season_id:
            return None
        
        # First find the player
        player_result = (
            supabase.table("players")
            .select("id")
            .ilike("player_name", f"%{player_name}%")
            .limit(1)
            .execute()
        )
        
        if not player_result.data:
            return None
        
        player_id = player_result.data[0]["id"]
        
        # Query gameweek data
        query = (
            supabase.table("player_gameweeks")
            .select("*")
            .eq("season_key", season_id)
            .eq("player_id", player_id)
            .order("gameweek")
        )
        
        result = query.execute()
        data = result.data or []
        
        if limit_gws and len(data) > limit_gws:
            data = data[-limit_gws:]
        
        return data
    except Exception as e:
        print(f"Error querying player gameweeks: {e}")
        return None


def query_all_players(limit: int = 1000):
    """Query all active players for search."""
    try:
        result = (
            supabase.table("players")
            .select("id, fpl_id, player_name, web_name, position, cost, ownership, teams!inner(name, short_name)")
            .eq("is_active", True)
            .order("player_name")
            .limit(limit)
            .execute()
        )
        
        # Flatten the response
        players = []
        for p in result.data or []:
            team = p.pop("teams", {})
            players.append({
                **p,
                "team": team.get("name", ""),
                "team_short": team.get("short_name", "")
            })
        return players
    except Exception as e:
        print(f"Error querying all players: {e}")
        return []


def query_player_by_name(player_name: str):
    """Query a single player by name."""
    try:
        result = (
            supabase.table("players")
            .select("*")
            .ilike("player_name", f"%{player_name}%")
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Error querying player by name: {e}")
        return None


def get_dashboard_summary():
    """Get summary stats for dashboard."""
    try:
        result = supabase.rpc("dashboard_summary").execute()
        if result.data:
            return result.data[0] if isinstance(result.data, list) else result.data
        return {}
    except Exception as e:
        print(f"Error getting dashboard summary: {e}")
        return {}
