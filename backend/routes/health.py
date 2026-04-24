# routes/health.py
from flask import Blueprint, jsonify
from datetime import datetime
import os
from config.config import Config

health_bp = Blueprint('health', __name__)

@health_bp.route('/test')
def test_endpoint():
    return jsonify({
        "status": "API is working!",
        "timestamp": datetime.now().isoformat(),
        "backend": "Supabase-powered",
        "database": "PostgreSQL (Supabase)"
    })

@health_bp.route('/health')
def health_check():
    """Check health status and data availability."""
    try:
        from utils.supabase_client import supabase, get_current_season
        
        # Try a simple query to check Supabase connectivity
        season_id = get_current_season()
        
        # Check table counts
        tables_status = {}
        tables = ["teams", "players", "fixtures", "player_gameweeks", "player_insights"]
        
        for table_name in tables:
            try:
                result = supabase.table(table_name).select("count", count="exact").execute()
                count = result.count if hasattr(result, 'count') else 'unknown'
                tables_status[table_name] = {"status": "ok", "count": count}
            except Exception as e:
                tables_status[table_name] = {"status": "error", "message": str(e)}
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": "Supabase PostgreSQL",
            "current_season": season_id,
            "tables": tables_status
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "message": "Could not connect to Supabase"
        }), 500