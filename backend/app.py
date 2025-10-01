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
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"error": f"Data file {filename} not found"}
    except json.JSONDecodeError:
        return {"error": f"Invalid JSON in {filename}"}

@app.route('/')
def home():
    return jsonify({
        "message": "FPL Analyst API",
        "version": "1.0.0",
        "endpoints": {
            "players": "/api/players",
            "teams": "/api/teams", 
            "fixtures": "/api/fixtures",
            "top_performers": "/api/top-performers",
            "hidden_gems": "/api/hidden-gems",
            "transfer_recommendations": "/api/transfers"
        }
    })

@app.route('/api/players')
def get_players():
    """Get all player data"""
    data = load_json_data('players.json')
    return jsonify(data)

@app.route('/api/players/<position>')
def get_players_by_position(position):
    """Get players filtered by position (GK, DEF, MID, FWD)"""
    data = load_json_data('players.json')
    if 'error' not in data:
        filtered_players = [p for p in data if p.get('position_name', '').upper() == position.upper()]
        return jsonify(filtered_players)
    return jsonify(data)

@app.route('/api/teams')
def get_teams():
    """Get team rankings and statistics"""
    data = load_json_data('teams.json')
    return jsonify(data)

@app.route('/api/fixtures')
def get_fixtures():
    """Get fixture analysis data"""
    gameweek = request.args.get('gw')
    data = load_json_data('fixtures.json')
    
    if 'error' not in data and gameweek:
        # Filter by gameweek if specified
        filtered_fixtures = [f for f in data if f.get('gameweek') == int(gameweek)]
        return jsonify(filtered_fixtures)
    
    return jsonify(data)

@app.route('/api/top-performers')
def get_top_performers():
    """Get top performing players"""
    data = load_json_data('top_performers.json')
    return jsonify(data)

@app.route('/api/hidden-gems')
def get_hidden_gems():
    """Get hidden gems and differential picks"""
    data = load_json_data('hidden_gems.json')
    return jsonify(data)

@app.route('/api/transfers')
def get_transfer_recommendations():
    """Get transfer recommendations"""
    data = load_json_data('transfers.json')
    return jsonify(data)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "data_files": {
            "players.json": os.path.exists(os.path.join(DATA_DIR, 'players.json')),
            "teams.json": os.path.exists(os.path.join(DATA_DIR, 'teams.json')),
            "fixtures.json": os.path.exists(os.path.join(DATA_DIR, 'fixtures.json')),
            "top_performers.json": os.path.exists(os.path.join(DATA_DIR, 'top_performers.json')),
            "hidden_gems.json": os.path.exists(os.path.join(DATA_DIR, 'hidden_gems.json')),
            "transfers.json": os.path.exists(os.path.join(DATA_DIR, 'transfers.json'))
        }
    })

if __name__ == '__main__':
    print("🚀 Starting FPL Analyst API...")
    print(f"📁 Data directory: {DATA_DIR}")
    print("🌐 API will be available at: http://localhost:5000")
    print("\n📋 Available endpoints:")
    print("  - GET /                     - API information")
    print("  - GET /api/players          - All players")
    print("  - GET /api/players/{pos}    - Players by position")
    print("  - GET /api/teams            - Team rankings")
    print("  - GET /api/fixtures?gw=X    - Fixture analysis")
    print("  - GET /api/top-performers   - Top performers")
    print("  - GET /api/hidden-gems      - Hidden gems")
    print("  - GET /api/transfers        - Transfer recommendations")
    print("  - GET /api/health           - Health check")
    
    app.run(debug=True, host='0.0.0.0', port=5000)