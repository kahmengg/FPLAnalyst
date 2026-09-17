from flask import Blueprint, current_app, jsonify
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
    except Exception:
        current_app.logger.exception("Health query failed")
        return jsonify({"status": "error", "detail": "Database query failed"}), 503
