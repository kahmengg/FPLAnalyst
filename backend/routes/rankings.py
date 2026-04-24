# routes/rankings.py
from flask import Blueprint, jsonify
from utils.supabase_client import query_team_rankings

rankings_bp = Blueprint('rankings', __name__)

@rankings_bp.route('/attack_rankings')
def get_attack_rankings():
    data = query_team_rankings('attack')
    return jsonify(data)

@rankings_bp.route('/defense_rankings')
def get_defense_rankings():
    data = query_team_rankings('defense')
    return jsonify(data)

@rankings_bp.route('/overall_rankings')
def get_overall_rankings():
    data = query_team_rankings('overall')
    return jsonify(data)