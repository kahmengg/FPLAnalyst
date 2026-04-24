# routes/player_trends.py
from flask import Blueprint, jsonify, request
from utils.supabase_client import query_all_players, query_player_gameweeks

player_trends_bp = Blueprint('player_trends', __name__)

@player_trends_bp.route('/player-search')
def get_player_search():
    """Get list of all players for search."""
    players = query_all_players(limit=1000)
    
    if not players:
        return jsonify({"error": "Player data not found", "players": [], "count": 0}), 404
    
    return jsonify({
        "players": players,
        "count": len(players)
    })

@player_trends_bp.route('/player-trends')
def get_player_trends():
    """
    Get gameweek-by-gameweek trends for player(s)
    Query params:
    - players: comma-separated player names (optional, if empty returns list of all players)
    - limit_gws: number of recent gameweeks to return (optional, default all)
    """
    try:
        players_param = request.args.get('players', '')
        limit_gws = request.args.get('limit_gws', None)
        
        # If no players specified, return list of all players
        if not players_param:
            players = query_all_players(limit=1000)
            if not players:
                return jsonify({"error": "Player data not found"}), 404
            
            return jsonify({
                "players": [player["player_name"] for player in players],
                "total_count": len(players)
            })
        
        # Parse player names
        player_names = [p.strip() for p in players_param.split(',')]
        
        # Get data for requested players
        result = {}
        for player_name in player_names:
            player_gameweeks = query_player_gameweeks(player_name, limit_gws=limit_gws)
            if player_gameweeks:
                result[player_name] = {
                    "gameweeks": player_gameweeks
                }
        
        if not result:
            return jsonify({"error": "No data found for specified players"}), 404
            
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in get_player_trends: {str(e)}")
        return jsonify({"error": str(e)}), 500
