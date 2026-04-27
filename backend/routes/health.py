from flask import Blueprint, jsonify
from utils.supabase_client import supabase

health_bp = Blueprint("health", __name__)


@health_bp.route("/health")
def health():
    """
    GET /api/health
    Basic liveness check + dashboard summary cards.
    Returns: total_players, total_teams, latest_gameweek, last_updated
    """
    try:
        res = supabase.table("dashboard_summary").select("*").execute()
        row = res.data[0] if res.data else {}
        return jsonify({"status": "ok", **row})
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500