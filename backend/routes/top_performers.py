# routes/top_performers.py
from flask import Blueprint, jsonify
from utils.supabase_client import query_player_insights_by_type

top_performers_bp = Blueprint('top_performers', __name__)

@top_performers_bp.route('/assist-gems')
def get_assist_providers():
    data = query_player_insights_by_type('assist_providers')
    return jsonify(data)

@top_performers_bp.route('/def_lead')
def get_def_lead():
    data = query_player_insights_by_type('defensive_leaders')
    return jsonify(data)

@top_performers_bp.route('/goal_scorer-picks')
def get_goal_scorer_picks():
    data = query_player_insights_by_type('goal_scorers')
    return jsonify(data)

@top_performers_bp.route('/hidden-gems')
def get_hidden_gems():
    data = query_player_insights_by_type('hidden_gems')
    return jsonify(data)

@top_performers_bp.route('/overperformers')
def get_top_overperformers():
    data = query_player_insights_by_type('overperformers')
    return jsonify(data)

@top_performers_bp.route('/season-performers')
def get_season_performers():
    data = query_player_insights_by_type('season_performers')
    return jsonify(data)

@top_performers_bp.route('/sustainable-scorers')
def get_sustainable_scorers():
    data = query_player_insights_by_type('sustainable_scorers')
    return jsonify(data)

@top_performers_bp.route('/underperformers')
def get_underperformers():
    data = query_player_insights_by_type('underperformers')
    return jsonify(data)

@top_performers_bp.route('/value-players')
def get_value_players():
    data = query_player_insights_by_type('value_players')
    return jsonify(data)