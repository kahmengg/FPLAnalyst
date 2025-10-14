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
        "data_dir": Config.DATA_DIR,
        "data_dir_exists": os.path.exists(Config.DATA_DIR)
    })

@health_bp.route('/health')
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "data_files": {
            "fixtures": os.path.exists(os.path.join(Config.DATA_DIR, 'fixture_analysis/fixtures.json')),
            "fixture_opportunities": os.path.exists(os.path.join(Config.DATA_DIR, 'fixture_analysis/fixture_opportunities.json')),
            "team_fixtures": os.path.exists(os.path.join(Config.DATA_DIR, 'fixture_analysis/team_fixture_summary.json')),
            "attacking_qp": os.path.exists(os.path.join(Config.DATA_DIR, 'quick_picks/attackingpicks.json')),
            "defensive_qp": os.path.exists(os.path.join(Config.DATA_DIR, 'quick_picks/defensivepicks.json')),
            "attack_rankings": os.path.exists(os.path.join(Config.DATA_DIR, 'rankings/attack_rankings.json')),
            "defense_rankings": os.path.exists(os.path.join(Config.DATA_DIR, 'rankings/defense_rankings.json')),
            "overall_rankings": os.path.exists(os.path.join(Config.DATA_DIR, 'rankings/overall_rankings.json')),
            "assist_providers": os.path.exists(os.path.join(Config.DATA_DIR, 'top_performers/assist_providers.json')),
            "defensive_leaders": os.path.exists(os.path.join(Config.DATA_DIR, 'top_performers/defensive_leaders.json')),
            "goal_scorer_picks": os.path.exists(os.path.join(Config.DATA_DIR, 'top_performers/goal_scorer_picks.json')),
            "hidden_gems": os.path.exists(os.path.join(Config.DATA_DIR, 'top_performers/hidden_gems.json')),
            "overperformers": os.path.exists(os.path.join(Config.DATA_DIR, 'top_performers/overperformers.json')),
            "season_performers": os.path.exists(os.path.join(Config.DATA_DIR, 'top_performers/season_performers.json')),
            "sustainable_scorers": os.path.exists(os.path.join(Config.DATA_DIR, 'top_performers/sustainable_scorers.json')),
            "value_players": os.path.exists(os.path.join(Config.DATA_DIR, 'top_performers/value_players.json'))
        }
    })