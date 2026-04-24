# routes/quick_picks.py
from flask import Blueprint, jsonify
from utils.supabase_client import query_player_insights_by_type

quick_picks_bp = Blueprint('quick_picks', __name__)

@quick_picks_bp.route('/top-attacking_qp')
def get_top_attacking_qp():
    # Query all attacking-oriented insights: goal_scorers, season_performers, overperformers
    data = query_player_insights_by_type('goal_scorers', limit=100)
    return jsonify(data)

@quick_picks_bp.route('/top-defensive_qp')
def get_top_defensive_qp():
    # Query all defensive-oriented insights: defensive_leaders
    data = query_player_insights_by_type('defensive_leaders', limit=100)
    return jsonify(data)