# routes/quick_picks.py
from flask import Blueprint, jsonify
from utils.supabase_client import query_player_insights_by_type, query_team_rankings

quick_picks_bp = Blueprint('quick_picks', __name__)


def _group_quick_picks_by_team(players, ranking_type):
    rankings = query_team_rankings(ranking_type) or []
    ranking_map = {}
    for ranking in rankings:
        team_name = ranking.get("team") or ranking.get("team_name")
        if not team_name and isinstance(ranking.get("teams"), dict):
            team_name = ranking["teams"].get("name")
        if team_name:
            ranking_map[team_name] = ranking

    grouped = {}
    for player in players:
        team_name = player.get("team") or player.get("team_name") or "Unknown"
        team_short = player.get("team_short") or "UNK"
        team_bucket = grouped.setdefault(
            team_name,
            {
                "team": team_name,
                "short_name": team_short,
                "attack_rank": None,
                "attack_strength": 0,
                "defense_rank": None,
                "defense_strength": 0,
                "players": [],
            },
        )

        team_bucket["short_name"] = team_bucket.get("short_name") or team_short
        team_bucket["players"].append(
            {
                "web_name": player.get("web_name") or player.get("player_name") or player.get("player"),
                "position_name": player.get("position_name") or player.get("position") or "Midfielder",
                "now_cost": player.get("now_cost") or player.get("price") or 0,
                "goals_per_game": player.get("goalsPerGame") or 0,
                "assists_per_game": player.get("assistsPerGame") or 0,
                "points_per_game": player.get("ppg") or player.get("points_per_game") or 0,
                "selected_by_percent": player.get("selected_by_percent") or player.get("ownership") or 0,
                "clean_sheet_rate": player.get("clean_sheet_rate") or player.get("csRate") or 0,
                "attacker_score": player.get("attacker_score") or 0,
                "defender_score": player.get("defender_score") or 0,
                "form": player.get("form") or 0,
            }
        )

    for team_name, team_bucket in grouped.items():
        ranking = ranking_map.get(team_name, {})
        if ranking_type == "attack":
            team_bucket["attack_rank"] = ranking.get("attack_rank")
            team_bucket["attack_strength"] = ranking.get("attack_strength") or 0
        if ranking_type == "defense":
            team_bucket["defense_rank"] = ranking.get("defense_rank")
            team_bucket["defense_strength"] = ranking.get("defense_strength") or 0

        # Sort top players first by relevant score.
        if ranking_type == "attack":
            team_bucket["players"].sort(key=lambda p: (p.get("attacker_score", 0), p.get("points_per_game", 0)), reverse=True)
        else:
            team_bucket["players"].sort(key=lambda p: (p.get("defender_score", 0), p.get("points_per_game", 0)), reverse=True)

    # Stable sorting by rank first, then strength.
    grouped_teams = list(grouped.values())
    if ranking_type == "attack":
        grouped_teams.sort(key=lambda t: (t.get("attack_rank") is None, t.get("attack_rank") or 9999, -(t.get("attack_strength") or 0)))
    else:
        grouped_teams.sort(key=lambda t: (t.get("defense_rank") is None, t.get("defense_rank") or 9999, -(t.get("defense_strength") or 0)))

    return grouped_teams

@quick_picks_bp.route('/top-attacking_qp')
def get_top_attacking_qp():
    data = query_player_insights_by_type('goal_scorers', limit=200)
    return jsonify(_group_quick_picks_by_team(data, "attack"))

@quick_picks_bp.route('/top-defensive_qp')
def get_top_defensive_qp():
    data = query_player_insights_by_type('defensive_leaders', limit=200)
    return jsonify(_group_quick_picks_by_team(data, "defense"))