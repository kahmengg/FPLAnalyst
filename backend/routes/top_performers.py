# routes/top_performers.py
from flask import Blueprint, jsonify
from utils.data_loader import load_json_data

top_performers_bp = Blueprint('top_performers', __name__)

@top_performers_bp.route('/assist-gems')
def get_assist_providers():
    data = load_json_data('top_performers/assist_providers.json')
    return jsonify(data)

@top_performers_bp.route('/def_lead')
def get_def_lead():
    data = load_json_data('top_performers/defensive_leaders.json')
    return jsonify(data)

@top_performers_bp.route('/goal_scorer-picks')
def get_goal_scorer_picks():
    data = load_json_data('top_performers/goal_scorers.json')
    return jsonify(data)

@top_performers_bp.route('/hidden-gems')
def get_hidden_gems():
    data = load_json_data('top_performers/hidden_gems.json')
    return jsonify(data)

@top_performers_bp.route('/overperformers')
def get_top_overperformers():
    data = load_json_data('performance_analysis/overperformers.json')
    return jsonify(data)

@top_performers_bp.route('/season-performers')
def get_season_performers():
    data = load_json_data('top_performers/season_performers.json')
    return jsonify(data)

@top_performers_bp.route('/sustainable-scorers')
def get_sustainable_scorers():
    data = load_json_data('performance_analysis/sustainable_scorers.json')
    return jsonify(data)

@top_performers_bp.route('/underperformers')
def get_underperformers():
    data = load_json_data('performance_analysis/underperformers.json')
    return jsonify(data)

@top_performers_bp.route('/value-players')
def get_value_players():
    data = load_json_data('top_performers/value_players.json')
    return jsonify(data)