# routes/fixtures.py
from flask import Blueprint, jsonify, request
from utils.supabase_client import query_fixtures_by_gameweek, query_team_fixture_summary, get_dashboard_summary
from datetime import datetime

fixtures_bp = Blueprint('fixtures', __name__)

@fixtures_bp.route('/')
def home():
    return jsonify({
        "message": "FPL Analyst API",
        "endpoints": {
            "fixtures": "/api/fixtures",
            "team_fixtures": "/api/team_fixtures",
            "layout": "/api/layout"
        }
    })

@fixtures_bp.route('/layout')
def get_layout():
    summary = get_dashboard_summary()
    if not summary:
        return jsonify({"error": "Dashboard summary not available"}), 404
    
    layout_data = [
        {
            "number_of_players": summary.get('total_players', 0),
            "total_teams": summary.get('total_teams', 0),
            "total_gameweeks": summary.get('total_gameweeks', 0),
            "generated_at": summary.get('generated_at', datetime.now().isoformat())
        }
    ]
    return jsonify(layout_data)

@fixtures_bp.route('/fixtures')
def get_fixtures():
    print("📊 Fetching fixtures data from Supabase...")
    gameweek_param = request.args.get('gameweek', type=int)
    gw_param = request.args.get('gw', type=int)
    target_gw = gameweek_param or gw_param
    
    data = query_fixtures_by_gameweek(gameweek=target_gw)
    
    if not data and target_gw:
        return jsonify({"error": f"No fixtures found for gameweek {target_gw}"}), 404
    
    return jsonify(data)

@fixtures_bp.route('/team_fixtures')
def get_team_fixtures():
    print("📊 Fetching team fixtures data from Supabase...")
    data = query_team_fixture_summary()
    if not data:
        return jsonify({"error": "Team fixture summary not available"}), 404
    return jsonify(data)