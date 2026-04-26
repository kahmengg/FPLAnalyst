"""Supabase client initialization and helper methods."""
import json
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


POSITION_NAME_MAP = {
    1: "Goalkeeper",
    2: "Defender",
    3: "Midfielder",
    4: "Forward",
}


def _safe_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_position_name(position_value):
    if isinstance(position_value, int):
        return POSITION_NAME_MAP.get(position_value, "Midfielder")

    if isinstance(position_value, str):
        normalized = position_value.strip().upper()
        if normalized == "GK":
            return "Goalkeeper"
        if normalized == "DEF":
            return "Defender"
        if normalized == "MID":
            return "Midfielder"
        if normalized in {"FWD", "FWD/STR", "ST"}:
            return "Forward"
        if position_value:
            return position_value

    return "Midfielder"


def _normalize_insight_row(row):
    payload = row.get("payload")
    parsed_payload = {}

    if isinstance(payload, dict):
        parsed_payload = payload
    elif isinstance(payload, str) and payload.strip():
        try:
            parsed_payload = json.loads(payload)
        except json.JSONDecodeError:
            parsed_payload = {}

    merged = {
        **row,
        **parsed_payload,
    }

    player_name = merged.get("player") or merged.get("player_name") or merged.get("web_name") or ""
    team_name = merged.get("team") or merged.get("team_name") or ""
    team_short = merged.get("team_short") or merged.get("short_name") or ""

    position_raw = merged.get("position_name") or merged.get("position")
    position_name = _to_position_name(position_raw)

    normalized = {
        "id": merged.get("id"),
        "season_key": merged.get("season_key"),
        "insight_type": merged.get("insight_type"),
        "created_at": merged.get("created_at"),
        "rank": _safe_int(merged.get("rank"), 9999),
        "player": player_name,
        "player_name": player_name,
        "web_name": merged.get("web_name") or player_name,
        "team": team_name,
        "team_name": team_name,
        "team_short": team_short,
        "position": position_name,
        "position_name": position_name,
        "price": _safe_float(merged.get("price") or merged.get("now_cost"), 0.0),
        "now_cost": _safe_float(merged.get("now_cost") or merged.get("price"), 0.0),
        "ownership": _safe_float(merged.get("ownership") or merged.get("selected_by_percent"), 0.0),
        "selected_by_percent": _safe_float(merged.get("selected_by_percent") or merged.get("ownership"), 0.0),
        "form": _safe_float(merged.get("form"), 0.0),
        "points": _safe_float(merged.get("points") or merged.get("totalPoints") or merged.get("total_points"), 0.0),
        "totalPoints": _safe_float(merged.get("totalPoints") or merged.get("total_points") or merged.get("points"), 0.0),
        "total_points": _safe_float(merged.get("total_points") or merged.get("totalPoints") or merged.get("points"), 0.0),
        "goals": _safe_float(merged.get("goals"), 0.0),
        "assists": _safe_float(merged.get("assists"), 0.0),
        "xG": _safe_float(merged.get("xG") or merged.get("xg") or merged.get("expected_goals"), 0.0),
        "xA": _safe_float(merged.get("xA") or merged.get("xa") or merged.get("expected_assists"), 0.0),
        "goalsPerGame": _safe_float(merged.get("goalsPerGame") or merged.get("goals_per_game"), 0.0),
        "assistsPerGame": _safe_float(merged.get("assistsPerGame") or merged.get("assists_per_game"), 0.0),
        "pointsPerMillion": _safe_float(merged.get("pointsPerMillion") or merged.get("points_per_million"), 0.0),
        "ppg": _safe_float(merged.get("ppg") or merged.get("points_per_game"), 0.0),
        "points_per_game": _safe_float(merged.get("points_per_game") or merged.get("ppg"), 0.0),
        "cleanSheets": _safe_float(merged.get("cleanSheets") or merged.get("clean_sheets"), 0.0),
        "csRate": _safe_float(merged.get("csRate") or merged.get("clean_sheet_rate"), 0.0),
        "clean_sheet_rate": _safe_float(merged.get("clean_sheet_rate") or merged.get("csRate"), 0.0),
        "defensiveContributions": _safe_float(merged.get("defensiveContributions") or merged.get("defensive_contribution"), 0.0),
        "tackles": _safe_float(merged.get("tackles"), 0.0),
        "overperformance": _safe_float(merged.get("overperformance"), 0.0),
        "overperformance_per_90": _safe_float(merged.get("overperformance_per_90"), 0.0),
        "sustainable": bool(merged.get("sustainable", False)),
    }

    normalized["attacker_score"] = normalized["goalsPerGame"] + normalized["assistsPerGame"]
    normalized["defender_score"] = normalized["csRate"] + (normalized["ppg"] * 0.2)

    return normalized


def _dedupe_insights(rows):
    deduped = {}

    for row in rows:
        key = (
            row.get("insight_type", ""),
            row.get("player_name", ""),
            row.get("team_short", ""),
            row.get("rank", 9999),
        )

        existing = deduped.get(key)
        if not existing:
            deduped[key] = row
            continue

        # Keep the newest record when duplicates exist.
        existing_created = str(existing.get("created_at") or "")
        candidate_created = str(row.get("created_at") or "")
        if candidate_created > existing_created:
            deduped[key] = row

    return list(deduped.values())


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
            .limit(max(limit * 5, limit))
            .execute()
        )
        raw_rows = result.data or []
        normalized_rows = [_normalize_insight_row(row) for row in raw_rows]
        deduped_rows = _dedupe_insights(normalized_rows)
        deduped_rows.sort(key=lambda r: (r.get("rank", 9999), -_safe_float(r.get("points", 0))))
        return deduped_rows[:limit]
    except Exception as e:
        print(f"Error querying player insights ({insight_type}): {e}")
        return []


def query_fixtures_by_gameweek(gameweek: int = None):
    """Query fixtures, optionally filtered by gameweek."""
    try:
        season_id = get_current_season()
        if not season_id:
            return []
        
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
        rows = []
        for row in result.data or []:
            team_obj = row.get("teams") if isinstance(row.get("teams"), dict) else {}
            rows.append(
                {
                    **row,
                    "team": row.get("team") or row.get("team_name") or team_obj.get("name", ""),
                    "team_name": row.get("team_name") or row.get("team") or team_obj.get("name", ""),
                    "team_short": row.get("team_short") or team_obj.get("short_name", ""),
                }
            )
        return rows
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
        rows = []
        for row in result.data or []:
            team_obj = row.get("teams") if isinstance(row.get("teams"), dict) else {}
            rows.append(
                {
                    **row,
                    "team": row.get("team") or row.get("team_name") or team_obj.get("name", ""),
                    "team_name": row.get("team_name") or row.get("team") or team_obj.get("name", ""),
                    "team_short": row.get("team_short") or team_obj.get("short_name", ""),
                }
            )
        return rows
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
        seen = set()
        for p in result.data or []:
            team = p.pop("teams", {})
            web_name = p.get("web_name") or p.get("player_name") or ""
            player_name = p.get("player_name") or web_name
            dedupe_key = (player_name, team.get("short_name", ""))
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            players.append(
                {
                    **p,
                    "name": web_name,
                    "player_name": player_name,
                    "web_name": web_name,
                    "team": team.get("name", ""),
                    "team_short": team.get("short_name", ""),
                }
            )
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
