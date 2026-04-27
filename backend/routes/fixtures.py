from collections import defaultdict
from flask import Blueprint, jsonify, request
from utils.supabase_client import supabase

fixtures_bp = Blueprint("fixtures", __name__)

SEASON = "2025_26"


@fixtures_bp.route("/fixtures")
def get_fixtures():
    """
    GET /api/fixtures
    Returns fixture list, optionally filtered by gameweek or team.

    Query params:
        gw   = int          single gameweek (optional)
        team = short name   home or away team e.g. ARS (optional)
    """
    gw   = request.args.get("gw",   type=int)
    team = request.args.get("team", type=str)

    try:
        q = supabase.table("fixture_grid").select("*").order("gameweek")

        if gw:
            q = q.eq("gameweek", gw)

        res = q.execute()
        rows = res.data or []

        # Filter by team (home or away) after fetching —
        # Supabase SDK doesn't support OR across two different columns cleanly
        if team:
            t = team.upper()
            rows = [r for r in rows if r["home_short"] == t or r["away_short"] == t]

        return jsonify({"fixtures": rows, "count": len(rows)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@fixtures_bp.route("/fixtures/grid")
def fixtures_grid():
    """
    GET /api/fixtures/grid
    Returns a nested structure for the fixture difficulty colour grid.

    Response shape:
    {
      "gameweeks": [1, 2, 3, ...],
      "teams": {
        "ARS": {
          "1": { "opponent": "MUN", "home": true, "attack_fdr": 2.1, "defense_fdr": 3.4,
                 "attack_fav": 4.5, "defense_fav": -1.2 },
          "2": { ... },
          ...
        },
        ...
      }
    }

    attack_fdr  / defense_fdr  : 1 (easy) → 5 (hard)  for the fixture difficulty grid colours
    attack_fav / defense_fav   : raw favorability score, positive = good fixture
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
                "opponent":   r["away_short"],
                "home":       True,
                "attack_fdr": r["home_attack_fdr"],
                "defense_fdr":r["home_defense_fdr"],
                "attack_fav": r["home_attacking_favorability"],
                "defense_fav":r["home_defensive_favorability"],
            }
            # Away team perspective
            teams[r["away_short"]][gw] = {
                "opponent":   r["home_short"],
                "home":       False,
                "attack_fdr": r["away_attack_fdr"],
                "defense_fdr":r["away_defense_fdr"],
                "attack_fav": r["away_attacking_favorability"],
                "defense_fav":r["away_defensive_favorability"],
            }

        return jsonify({"gameweeks": gameweeks, "teams": dict(teams)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500