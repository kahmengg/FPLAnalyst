# ── routes/health.py ─────────────────────────────────────────────────────────
from flask import Blueprint, jsonify
from utils.supabase_client import supabase

health_bp = Blueprint("health", __name__)

@health_bp.route("/health")
def health():
    try:
        res = supabase.table("players").select("id", count="exact").execute()
        return jsonify({
            "status": "ok",
            "players": res.count,
        })
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500


# ── routes/players.py ─────────────────────────────────────────────────────────
#
# GET /api/players
#   Query params:
#     position  = 1|2|3|4          filter by position
#     team      = short_name        e.g. ARS
#     min_mins  = int               minimum total_minutes (default 90)
#     sort      = total_points|form|xgi_per90|points_per_million|...
#     order     = asc|desc          (default desc)
#     limit     = int               (default 100)
#     offset    = int               (default 0)
#
# GET /api/players/<player_id>/gameweeks
#   Query params:
#     last = int   how many recent GWs to return (default 8)
#
# GET /api/players/summary
#   Dashboard cards: total players, avg form, latest GW

from flask import Blueprint, jsonify, request
from utils.supabase_client import supabase

players_bp = Blueprint("players", __name__)

SEASON = "2025_26"

SORTABLE = {
    "total_points", "form", "last_gw_points",
    "xg", "xa", "xgi", "xgi_per90", "xg_per90",
    "goals", "assists", "shots", "chances_created", "touches_opp_box",
    "clean_sheets", "goals_conceded", "defensive_contribution",
    "points_per_million", "points_per90", "pvsxp_total",
    "cost", "ownership", "total_minutes",
}


@players_bp.route("/players")
def get_players():
    position  = request.args.get("position",  type=int)
    team      = request.args.get("team")                   # short_name e.g. ARS
    min_mins  = request.args.get("min_mins",  default=90,  type=int)
    sort_col  = request.args.get("sort",      default="total_points")
    order     = request.args.get("order",     default="desc")
    limit     = request.args.get("limit",     default=100, type=int)
    offset    = request.args.get("offset",    default=0,   type=int)

    if sort_col not in SORTABLE:
        sort_col = "total_points"
    descending = order != "asc"

    try:
        # player_overview view joins players + teams + player_season_stats
        q = (
            supabase.table("player_overview")
            .select("*")
        )

        if position:
            q = q.eq("position", position)
        if team:
            q = q.eq("team_short", team.upper())
        if min_mins:
            q = q.gte("total_minutes", min_mins)

        q = q.order(sort_col, desc=descending).range(offset, offset + limit - 1)
        res = q.execute()
        return jsonify({"players": res.data or [], "count": len(res.data or [])})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@players_bp.route("/players/summary")
def players_summary():
    """Dashboard card data."""
    try:
        res = supabase.table("dashboard_summary").select("*").execute()
        row = res.data[0] if res.data else {}
        return jsonify(row)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@players_bp.route("/players/<player_id>/gameweeks")
def player_gameweeks(player_id: str):
    """GW history popup — last N gameweeks for one player."""
    last = request.args.get("last", default=8, type=int)
    try:
        res = (
            supabase.table("player_gw_history")
            .select("*")
            .eq("player_id", player_id)
            .order("gameweek", desc=True)
            .limit(last)
            .execute()
        )
        rows = list(reversed(res.data or []))   # chronological order for charts
        return jsonify({"gameweeks": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── routes/teams.py ───────────────────────────────────────────────────────────
#
# GET /api/teams
#   All teams with rankings + home/away splits
#
# GET /api/teams/<team_id>/players
#   Players for a specific team (for the team detail modal)
#   Query params: sort, position

from flask import Blueprint, jsonify, request
from utils.supabase_client import supabase

teams_bp = Blueprint("teams", __name__)

SEASON = "2025_26"


@teams_bp.route("/teams")
def get_teams():
    sort_col   = request.args.get("sort",  default="overall_rank")
    order      = request.args.get("order", default="asc")
    descending = order == "desc"
    try:
        res = (
            supabase.table("team_overview")
            .select("*")
            .order(sort_col, desc=descending)
            .execute()
        )
        return jsonify({"teams": res.data or []})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@teams_bp.route("/teams/<team_id>/players")
def team_players(team_id: str):
    """Players for team detail modal — sorted by form by default."""
    position = request.args.get("position", type=int)
    sort_col = request.args.get("sort", default="form")
    try:
        q = (
            supabase.table("player_overview")
            .select("*")
            .eq("team_short",    # resolve via team_id join
                supabase.table("teams").select("short_name").eq("id", team_id)
                .execute().data[0]["short_name"]
            )
            .order(sort_col, desc=True)
        )
        if position:
            q = q.eq("position", position)
        res = q.execute()
        return jsonify({"players": res.data or []})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── routes/fixtures.py ────────────────────────────────────────────────────────
#
# GET /api/fixtures
#   All fixtures for the season, ordered by GW
#   Query params:
#     gw     = int     filter single gameweek
#     team   = short   filter by team (home or away)
#
# GET /api/fixtures/grid
#   Pivoted structure: {team: {gw: {fdr, favorability}}}
#   Used by the fixture difficulty grid on the Fixture Analysis page

from flask import Blueprint, jsonify, request
from utils.supabase_client import supabase
from collections import defaultdict

fixtures_bp = Blueprint("fixtures", __name__)

SEASON = "2025_26"


@fixtures_bp.route("/fixtures")
def get_fixtures():
    gw   = request.args.get("gw",   type=int)
    team = request.args.get("team")

    try:
        q = supabase.table("fixture_grid").select("*").order("gameweek")
        if gw:
            q = q.eq("gameweek", gw)
        if team:
            t = team.upper()
            # Supabase doesn't do OR filters cleanly in the SDK, fetch all then filter
            res = q.execute()
            rows = [
                r for r in (res.data or [])
                if r["home_short"] == t or r["away_short"] == t
            ]
            return jsonify({"fixtures": rows})

        res = q.execute()
        return jsonify({"fixtures": res.data or []})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@fixtures_bp.route("/fixtures/grid")
def fixtures_grid():
    """
    Returns a nested structure for the fixture difficulty colour grid.
    {
      "gameweeks": [1,2,3,...],
      "teams": {
        "ARS": {
          1: {"opponent":"MUN","home":true,"attack_fdr":2.1,"defense_fdr":3.4,...},
          ...
        }
      }
    }
    """
    try:
        res = supabase.table("fixture_grid").select("*").order("gameweek").execute()
        rows = res.data or []

        gameweeks = sorted({r["gameweek"] for r in rows})
        teams: dict = defaultdict(dict)

        for r in rows:
            gw = r["gameweek"]
            # Home team perspective
            teams[r["home_short"]][gw] = {
                "opponent":    r["away_short"],
                "home":        True,
                "attack_fdr":  r["home_attack_fdr"],
                "defense_fdr": r["home_defense_fdr"],
                "attack_fav":  r["home_attacking_favorability"],
                "defense_fav": r["home_defensive_favorability"],
            }
            # Away team perspective
            teams[r["away_short"]][gw] = {
                "opponent":    r["home_short"],
                "home":        False,
                "attack_fdr":  r["away_attack_fdr"],
                "defense_fdr": r["away_defense_fdr"],
                "attack_fav":  r["away_attacking_favorability"],
                "defense_fav": r["away_defensive_favorability"],
            }

        return jsonify({"gameweeks": gameweeks, "teams": teams})
    except Exception as e:
        return jsonify({"error": str(e)}), 500