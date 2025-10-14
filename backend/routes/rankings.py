# routes/rankings.py
from flask import Blueprint, jsonify
from utils.data_loader import load_json_data

rankings_bp = Blueprint('rankings', __name__)

@rankings_bp.route('/attack_rankings')
def get_attack_rankings():
    data = load_json_data('rankings/attack_rankings.json')
    return jsonify(data)

@rankings_bp.route('/defense_rankings')
def get_defense_rankings():
    data = load_json_data('rankings/defense_rankings.json')
    return jsonify(data)

@rankings_bp.route('/overall_rankings')
def get_overall_rankings():
    data = load_json_data('rankings/overall_rankings.json')
    return jsonify(data)