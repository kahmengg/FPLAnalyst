# routes/quick_picks.py
from flask import Blueprint, jsonify
from utils.data_loader import load_json_data

quick_picks_bp = Blueprint('quick_picks', __name__)

@quick_picks_bp.route('/top-attacking_qp')
def get_top_attacking_qp():
    data = load_json_data('quick_picks/attackingpicks.json')
    return jsonify(data)

@quick_picks_bp.route('/top-defensive_qp')
def get_top_defensive_qp():
    data = load_json_data('quick_picks/defensivepicks.json')
    return jsonify(data)