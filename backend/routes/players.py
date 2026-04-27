from flask import Blueprint, jsonify, request
from utils.supabase_client import supabase

players_bp = Blueprint("players", __name__)

SEASON = "2025_26"

# Columns the frontend is allowed to sort by
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
    """
    GET /api/players
    Returns all players with season stats joined.

    Query params:
        position  = 1 | 2 | 3 | 4          (GK / DEF / MID / FWD)
        team      = short name e.g. ARS
        min_mins  = int  minimum total_minutes played  (default 0)
        sort      = any column in SORTABLE  (default: total_points)
        order     = asc | desc              (default: desc)
        limit     = int                     (default: 200)
        offset    = int                     (default: 0)
    """
    position = request.args.get("position", type=int)
    team     = request.args.get("team",     type=str)
    min_mins = request.args.get("min_mins", default=0,   type=int)
    sort_col = request.args.get("sort",     default="total_points")
    order    = request.args.get("order",    default="desc")
    limit    = request.args.get("limit",    default=200, type=int)
    offset   = request.args.get("offset",  default=0,   type=int)

    if sort_col not in SORTABLE:
        sort_col = "total_points"
    descending = order != "asc"

    try:
        q = supabase.table("player_overview").select("*")

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


@players_bp.route("/players/<player_id>/gameweeks")
def player_gameweeks(player_id: str):
    """
    GET /api/players/<player_id>/gameweeks
    Returns recent gameweek-by-gameweek stats for one player.
    Used by the GW history popup on the Players page.

    Query params:
        last = int   how many recent GWs to return (default: 8)
    """
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
        # Reverse so the chart renders oldest → newest left to right
        rows = list(reversed(res.data or []))
        return jsonify({"gameweeks": rows, "player_id": player_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500