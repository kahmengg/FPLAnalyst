# routes/player_trends.py
from flask import Blueprint, jsonify, request
import json
import os

player_trends_bp = Blueprint('player_trends', __name__)

def load_json_data(filename):
    """Helper function to load JSON data"""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

@player_trends_bp.route('/player-search')
def get_player_search():
    """Get list of all players for search"""
    data = load_json_data('data/player_trends/all_players.json')
    if data is None:
        return jsonify({"error": "Player data not found"}), 404
    return jsonify(data)

@player_trends_bp.route('/player-trends')
def get_player_trends():
    """
    Get gameweek-by-gameweek trends for player(s)
    Query params:
    - players: comma-separated player names (optional, if empty returns list of all players)
    - limit_gws: number of recent gameweeks to return (optional, default all)
    """
    try:
        # Get query parameters
        players_param = request.args.get('players', '')
        limit_gws = request.args.get('limit_gws', None)
        
        # If no players specified, return list of unique players from all_players.json
        if not players_param:
            data = load_json_data('data/player_trends/all_players.json')
            if data is None:
                return jsonify({"error": "Player data not found"}), 404
            
            # Return just the player names list for backwards compatibility
            return jsonify({
                "players": [player["name"] for player in data["players"]],
                "total_count": data["count"]
            })
        
        # Load detailed player data
        all_player_data = load_json_data('data/player_trends/player_data.json')
        if all_player_data is None:
            return jsonify({"error": "Player data not found"}), 404
        
        # Parse player names
        player_names = [p.strip() for p in players_param.split(',')]
        
        # Get data for requested players
        result = {}
        for player_name in player_names:
            if player_name in all_player_data:
                player_data = all_player_data[player_name]
                
                # Apply gameweek limit if specified
                if limit_gws:
                    gameweeks = player_data["gameweeks"]
                    limited_gameweeks = gameweeks[-int(limit_gws):] if len(gameweeks) > int(limit_gws) else gameweeks
                    player_data = player_data.copy()
                    player_data["gameweeks"] = limited_gameweeks
                
                result[player_name] = player_data
        
        if not result:
            return jsonify({"error": "No data found for specified players"}), 404
            
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in get_player_trends: {str(e)}")
        return jsonify({"error": str(e)}), 500
