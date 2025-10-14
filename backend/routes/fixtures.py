# routes/fixtures.py
from flask import Blueprint, jsonify, request
from utils.data_loader import load_json_data
from datetime import datetime

fixtures_bp = Blueprint('fixtures', __name__)

@fixtures_bp.route('/')
def home():
    return jsonify({
        "message": "FPL Analyst API",
        "endpoints": {
            "fixtures_opportunity": "/api/fixtures_opportunity",
            "fixtures": "/api/fixtures",
            "team_fixtures": "/api/team_fixtures",
            # ... (list other endpoints as in original)
        }
    })

@fixtures_bp.route('/layout')
def get_layout():
    data = load_json_data('layout.json')
    if isinstance(data, dict) and "error" in data:
        return jsonify(data), 404
    return jsonify(data)

@fixtures_bp.route('/fixtures')
def get_fixtures():
    print("📊 Fetching fixtures data...")
    data = load_json_data('fixture_analysis/fixtures.json')
    if isinstance(data, dict) and "error" in data:
        return jsonify(data), 404
    gameweek_param = request.args.get('gameweek', type=int)
    gw_param = request.args.get('gw', type=int)
    target_gw = gameweek_param or gw_param
    if target_gw is not None:
        filtered = []
        for fixture in data:
            fixture_gw = fixture.get('gameweek') or fixture.get('gw')
            if fixture_gw and int(fixture_gw) == target_gw:
                filtered.append(fixture)
        if filtered:
            return jsonify(filtered)
        else:
            return jsonify({"error": f"No fixtures found for gameweek {target_gw}"}), 404
    return jsonify(data)

@fixtures_bp.route('/fixtures_opportunity')
def get_fixtures_opportunity():
    print("📊 Fetching fixture opportunities data...")
    data = load_json_data('fixture_analysis/fixture_opportunities.json')
    if isinstance(data, dict) and "error" in data:
        return jsonify(data), 404
    return jsonify(data)

@fixtures_bp.route('/team_fixtures')
def get_team_fixtures():
    print("📊 Fetching team fixtures data...")
    data = load_json_data('fixture_analysis/team_fixture_summary.json')
    if isinstance(data, dict) and "error" in data:
        return jsonify(data), 404
    return jsonify(data)