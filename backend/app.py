from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import pandas as pd
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Data directory path
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

def load_json_data(filename):
    """Load JSON data from the data directory"""
    filepath = os.path.join(DATA_DIR, filename)
    print(f"🔍 Attempting to load: {filepath}")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"✅ Successfully loaded {filename} with {len(data) if isinstance(data, list) else 'N/A'} items")
            return data
    except FileNotFoundError:
        print(f"❌ File not found: {filepath}")
        return {"error": f"Data file {filename} not found at {filepath}"}
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error in {filename}: {e}")
        return {"error": f"Invalid JSON in {filename}: {str(e)}"}
    except UnicodeDecodeError as e:
        print(f"❌ Encoding error in {filename}: {e}")
        return {"error": f"Encoding error in {filename}: {str(e)}"}

@app.route('/api/test')
def test_endpoint():
    """Test endpoint to verify API is working"""
    return jsonify({
        "status": "API is working!",
        "timestamp": datetime.now().isoformat(),
        "data_dir": DATA_DIR,
        "data_dir_exists": os.path.exists(DATA_DIR)
    })

@app.route('/')
def home():
    return jsonify({
        "message": "FPL Analyst API",
        "endpoints": {
            "fixtures_opportunity": "/api/fixtures_opportunity",
            "fixtures": "/api/fixtures", 
            "team_fixtures": "/api/team_fixtures",
            "attacking_qp": "/api/top-attacking_qp",
            "defensive_qp": "/api/top-defensive_qp",
            "attack_rankings": "/api/attack_rankings",
            "defense_rankings": "/api/defense_rankings",
            "overall_rankings": "/api/overall_rankings",
            "assist": "/api/assist-gems",
            "def_lead": "/api/def_lead",
            "goal_scorer": "/api/goal_scorer-picks",
            "hidden": "/api/hidden-gems",
            "overperformers": "/api/top-overperformers",
            "season_performers": "/api/season-performers",
            "sustainable_scorers": "/api/sustainable-scorers",
            "value_players": "/api/value-players"
        }
    })
    
# Fixture Analysis
@app.route('/api/fixtures')
def get_fixtures():
    """
    Endpoint to retrieve fixtures.
    Optional query parameter: ?gameweek=<int> or ?gw=<int>
    Example: /api/fixtures?gameweek=7 or /api/fixtures?gw=7
    """
    print("📊 Fetching fixtures data...")
    data = load_json_data('fixture_analysis/fixtures.json')
    
    if isinstance(data, dict) and "error" in data:
        return jsonify(data), 404
    
    # Accept both 'gameweek' and 'gw' query parameters
    gameweek_param = request.args.get('gameweek', type=int)
    gw_param = request.args.get('gw', type=int)
    target_gw = gameweek_param or gw_param
    
    if target_gw is not None:
        filtered = []
        for fixture in data:
            # Check both possible field names in JSON
            fixture_gw = fixture.get('gameweek') or fixture.get('gw')
            if fixture_gw and int(fixture_gw) == target_gw:
                filtered.append(fixture)
        
        if filtered:
            return jsonify(filtered)
        else:
            return jsonify({
                "error": f"No fixtures found for gameweek {target_gw}"
            }), 404
    
    return jsonify(data)

@app.route('/api/fixtures_opportunity')
def get_fixtures_opportunity():
    """Get fixtures opportunity data"""
    print("📊 Fetching fixture opportunities data...")
    data = load_json_data('fixture_analysis/fixture_opportunities.json')
    
    if isinstance(data, dict) and "error" in data:
        return jsonify(data), 404
        
    return jsonify(data)

@app.route('/api/team_fixtures')
def get_team_fixtures():
    """Get team fixtures data"""
    print("📊 Fetching team fixtures data...")
    data = load_json_data('fixture_analysis/team_fixture_summary.json')
    
    if isinstance(data, dict) and "error" in data:
        return jsonify(data), 404
        
    return jsonify(data)

# Quick Picks
@app.route('/api/top-attacking_qp')
def get_top_attacking_qp():
    """Get top attacking quality points data"""
    data = load_json_data('quick_picks/attackingpicks.json')
    return jsonify(data)

@app.route('/api/top-defensive_qp')
def get_top_defensive_qp():
    """Get top defensive quality points data"""
    data = load_json_data('quick_picks/defensivepicks.json')
    return jsonify(data)

# Rankings
@app.route('/api/attack_rankings')
def get_attack_rankings():
    """Get attack rankings data"""
    data = load_json_data('rankings/attack_rankings.json')
    return jsonify(data)

@app.route('/api/defense_rankings')
def get_defense_rankings():
    """Get defense rankings data"""
    data = load_json_data('rankings/defense_rankings.json')
    return jsonify(data)

@app.route('/api/overall_rankings')
def get_overall_rankings():
    """Get overall rankings data"""
    data = load_json_data('rankings/overall_rankings.json')
    return jsonify(data)

# Top Performers
@app.route('/api/assist-gems')
def get_assist_providers():
    """Get assist providers data"""
    data = load_json_data('top_performers/assist_providers.json')
    return jsonify(data)

@app.route('/api/def_lead')
def get_def_lead():
    """Get defensive lead data"""
    data = load_json_data('top_performers/defensive_leaders.json')
    return jsonify(data)

@app.route('/api/goal_scorer-picks')
def get_goal_scorer_picks():
    """Get goal scorer picks data"""
    data = load_json_data('top_performers/goal_scorers.json')
    return jsonify(data)

@app.route('/api/hidden-gems')
def get_hidden_gems():
    """Get hidden gems data"""
    data = load_json_data('top_performers/hidden_gems.json')
    return jsonify(data)

@app.route('/api/overperformers')
def get_top_overperformers():
    """Get top overperformers data"""
    data = load_json_data('top_performers/overperformers.json')
    return jsonify(data)

@app.route('/api/season-performers')
def get_season_performers():
    """Get season performers data"""
    data = load_json_data('top_performers/season_performers.json')
    return jsonify(data)

@app.route('/api/sustainable-scorers')
def get_sustainable_scorers():
    """Get sustainable scorers data"""
    data = load_json_data('top_performers/sustainable_scorers.json')
    return jsonify(data)

@app.route('/api/value-players')
def get_value_players():
    """Get value players data"""
    data = load_json_data('top_performers/value_players.json')
    return jsonify(data)

# Health Check
@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "data_files": {

            "fixtures": os.path.exists(os.path.join(DATA_DIR, 'fixture_analysis/fixtures.json')),
            "fixture_opportunities": os.path.exists(os.path.join(DATA_DIR, 'fixture_analysis/fixture_opportunities.json')),
            "team_fixtures": os.path.exists(os.path.join(DATA_DIR, 'fixture_analysis/team_fixture_summary.json')),
            "attacking_qp": os.path.exists(os.path.join(DATA_DIR, 'quick_picks/attackingpicks.json')),
            "defensive_qp": os.path.exists(os.path.join(DATA_DIR, 'quick_picks/defensivepicks.json')),
            "attack_rankings": os.path.exists(os.path.join(DATA_DIR, 'rankings/attack_rankings.json')),
            "defense_rankings": os.path.exists(os.path.join(DATA_DIR, 'rankings/defense_rankings.json')),
            "overall_rankings": os.path.exists(os.path.join(DATA_DIR, 'rankings/overall_rankings.json')),
            "assist_providers": os.path.exists(os.path.join(DATA_DIR, 'top_performers/assist_providers.json')),
            "defensive_leaders": os.path.exists(os.path.join(DATA_DIR, 'top_performers/defensive_leaders.json')),
            "goal_scorer_picks": os.path.exists(os.path.join(DATA_DIR, 'top_performers/goal_scorer_picks.json')),
            "hidden_gems": os.path.exists(os.path.join(DATA_DIR, 'top_performers/hidden_gems.json')),
            "overperformers": os.path.exists(os.path.join(DATA_DIR, 'top_performers/overperformers.json')),
            "season_performers": os.path.exists(os.path.join(DATA_DIR, 'top_performers/season_performers.json')),
            "sustainable_scorers": os.path.exists(os.path.join(DATA_DIR, 'top_performers/sustainable_scorers.json')),
            "value_players": os.path.exists(os.path.join(DATA_DIR, 'top_performers/value_players.json'))
        }
    })

if __name__ == '__main__':
    print("🚀 Starting FPL Analyst API...")
    print(f"📁 Data directory: {DATA_DIR}")
    print(f"📁 Data directory exists: {os.path.exists(DATA_DIR)}")
    if os.path.exists(DATA_DIR):
        print(f"📁 Contents: {os.listdir(DATA_DIR)}")
    print("🌐 API will be available at: http://localhost:5000")
    print("🔧 Test endpoint: http://localhost:5000/api/test")
    print("🔧 Health check: http://localhost:5000/api/health")
    app.run(debug=True, host='0.0.0.0', port=5000)