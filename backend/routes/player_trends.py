# routes/player_trends.py
from flask import Blueprint, jsonify, request
import pandas as pd
import os

player_trends_bp = Blueprint('player_trends', __name__)

# Load the full season stats CSV
DATA_FILE = os.path.join('..', 'fpl-data-stats.csv')

@player_trends_bp.route('/player-trends', methods=['GET'])
def get_player_trends():
    """
    Get gameweek-by-gameweek trends for player(s)
    Query params:
    - players: comma-separated player names (optional, if empty returns list of all players)
    - limit_gws: number of recent gameweeks to return (optional, default all)
    """
    try:
        # Load data
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Data file not found"}), 404
        
        df = pd.read_csv(DATA_FILE)
        
        # Get query parameters
        players_param = request.args.get('players', '')
        limit_gws = request.args.get('limit_gws', None)
        
        # If no players specified, return list of unique players
        if not players_param:
            # Get latest gameweek data for each player
            latest_gw = df.groupby('id')['gameweek'].max()
            unique_players_df = df[df.apply(lambda row: row['gameweek'] == latest_gw[row['id']], axis=1)]
            unique_players = unique_players_df['web_name'].dropna().unique().tolist()
            unique_players.sort()
            return jsonify({
                "players": unique_players,
                "total_count": len(unique_players)
            })
        
        # Parse player names
        player_names = [p.strip() for p in players_param.split(',')]
        
        # Filter data for selected players
        player_data = df[df['web_name'].isin(player_names)].copy()
        
        if player_data.empty:
            return jsonify({"error": "No data found for specified players"}), 404
        
        # Sort by gameweek
        player_data = player_data.sort_values(['web_name', 'gameweek'])
        
        # Limit gameweeks if specified
        if limit_gws:
            max_gw = player_data['gameweek'].max()
            min_gw = max_gw - int(limit_gws) + 1
            player_data = player_data[player_data['gameweek'] >= min_gw]
        
        # Prepare response data
        result = {}
        
        for player_name in player_names:
            player_gw_data = player_data[player_data['web_name'] == player_name]
            
            if player_gw_data.empty:
                continue
            
            # Calculate form (last 5 GWs)
            last_5_gws = player_gw_data.tail(5)
            form_stats = {
                "avg_points": round(float(last_5_gws['total_points'].mean()), 1) if 'total_points' in last_5_gws and not last_5_gws['total_points'].empty else 0,
                "avg_minutes": round(float(last_5_gws['minutes'].mean()), 0) if 'minutes' in last_5_gws and not last_5_gws['minutes'].empty else 0,
                "games_played": int(len(last_5_gws)),
            }
            
            # Gameweek-by-gameweek data
            gameweeks = []
            for _, row in player_gw_data.iterrows():
                gw_entry = {
                    "gameweek": int(row['gameweek'].item()) if 'gameweek' in row and pd.notna(row['gameweek']) else None,
                    "opponent": str(row['opponent_team_name']) if 'opponent_team_name' in row and pd.notna(row['opponent_team_name']) else "Unknown",
                    "was_home": bool(row['was_home'].item()) if 'was_home' in row and pd.notna(row['was_home']) else None,
                    "total_points": float(row['total_points'].item()) if 'total_points' in row and pd.notna(row['total_points']) else 0,
                    "minutes": int(row['minutes'].item()) if 'minutes' in row and pd.notna(row['minutes']) else 0,
                    "goals": int(row['G'].item()) if 'G' in row and pd.notna(row['G']) else 0,
                    "assists": int(row['A'].item()) if 'A' in row and pd.notna(row['A']) else 0,
                    "clean_sheets": int(row['CS'].item()) if 'CS' in row and pd.notna(row['CS']) else 0,
                    "xG": round(float(row['xG'].item()), 2) if 'xG' in row and pd.notna(row['xG']) else 0,
                    "xA": round(float(row['xA'].item()), 2) if 'xA' in row and pd.notna(row['xA']) else 0,
                    "xGI": round(float(row['xGI'].item()), 2) if 'xGI' in row and pd.notna(row['xGI']) else 0,
                    "xP": round(float(row['xP'].item()), 2) if 'xP' in row and pd.notna(row['xP']) else 0,
                    "shots": int(row['shots'].item()) if 'shots' in row and pd.notna(row['shots']) else 0,
                    "shots_on_target": int(row['SoT'].item()) if 'SoT' in row and pd.notna(row['SoT']) else 0,
                    "key_passes": int(row['key_passes'].item()) if 'key_passes' in row and pd.notna(row['key_passes']) else 0,
                    "touches": int(row['touches'].item()) if 'touches' in row and pd.notna(row['touches']) else 0,
                    "penalty_area_touches": int(row['penalty_area_touches'].item()) if 'penalty_area_touches' in row and pd.notna(row['penalty_area_touches']) else 0,
                    "carries_final_third": int(row['carries_final_third'].item()) if 'carries_final_third' in row and pd.notna(row['carries_final_third']) else 0,
                    "defensive_contribution": round(float(row['defensive_contribution'].item()), 2) if 'defensive_contribution' in row and pd.notna(row['defensive_contribution']) else 0,
                    "xGC": round(float(row['xGC'].item()), 2) if 'xGC' in row and pd.notna(row['xGC']) else 0,
                    "goals_conceded": int(row['GC'].item()) if 'GC' in row and pd.notna(row['GC']) else 0,
                }
                gameweeks.append(gw_entry)
            
            # Player summary
            player_info = player_gw_data.iloc[-1]  # Get most recent row for player info
            
            result[player_name] = {
                "player_name": str(player_name),
                "team": str(player_info['team_name']) if 'team_name' in player_info and pd.notna(player_info['team_name']) else "Unknown",
                "position": int(player_info['element_type'].item()) if 'element_type' in player_info and pd.notna(player_info['element_type']) else 0,
                "web_name": str(player_info['web_name']) if 'web_name' in player_info and pd.notna(player_info['web_name']) else str(player_name),
                "cost": float(player_info['now_cost'].item()) if 'now_cost' in player_info and pd.notna(player_info['now_cost']) else 0,
                "ownership": float(player_info['selected_by_percent'].item()) if 'selected_by_percent' in player_info and pd.notna(player_info['selected_by_percent']) else 0,
                "form": form_stats,
                "total_stats": {
                    "games_played": int(len(player_gw_data)),
                    "total_points": int(player_gw_data['total_points'].sum()) if 'total_points' in player_gw_data and not player_gw_data['total_points'].empty else 0,
                    "total_goals": int(player_gw_data['G'].sum()) if 'G' in player_gw_data and not player_gw_data['G'].empty else 0,
                    "total_assists": int(player_gw_data['A'].sum()) if 'A' in player_gw_data and not player_gw_data['A'].empty else 0,
                    "total_xG": round(float(player_gw_data['xG'].sum()), 2) if 'xG' in player_gw_data and not player_gw_data['xG'].empty else 0,
                    "total_xA": round(float(player_gw_data['xA'].sum()), 2) if 'xA' in player_gw_data and not player_gw_data['xA'].empty else 0,
                    "total_xGI": round(float(player_gw_data['xGI'].sum()), 2) if 'xGI' in player_gw_data and not player_gw_data['xGI'].empty else 0,
                    "total_xP": round(float(player_gw_data['xP'].sum()), 2) if 'xP' in player_gw_data and not player_gw_data['xP'].empty else 0,
                    "total_minutes": int(player_gw_data['minutes'].sum()) if 'minutes' in player_gw_data and not player_gw_data['minutes'].empty else 0,
                    "total_shots": int(player_gw_data['shots'].sum()) if 'shots' in player_gw_data and not player_gw_data['shots'].empty else 0,
                    "total_key_passes": int(player_gw_data['key_passes'].sum()) if 'key_passes' in player_gw_data and not player_gw_data['key_passes'].empty else 0,
                },
                "per90_stats": {
                    "points_per_90": round((float(player_gw_data['total_points'].sum()) * 90) / max(float(player_gw_data['minutes'].sum()), 1), 2) if 'total_points' in player_gw_data and 'minutes' in player_gw_data and not player_gw_data['total_points'].empty and not player_gw_data['minutes'].empty else 0,
                    "goals_per_90": round((float(player_gw_data['G'].sum()) * 90) / max(float(player_gw_data['minutes'].sum()), 1), 2) if 'G' in player_gw_data and 'minutes' in player_gw_data and not player_gw_data['G'].empty and not player_gw_data['minutes'].empty else 0,
                    "assists_per_90": round((float(player_gw_data['A'].sum()) * 90) / max(float(player_gw_data['minutes'].sum()), 1), 2) if 'A' in player_gw_data and 'minutes' in player_gw_data and not player_gw_data['A'].empty and not player_gw_data['minutes'].empty else 0,
                    "xG_per_90": round((float(player_gw_data['xG'].sum()) * 90) / max(float(player_gw_data['minutes'].sum()), 1), 2) if 'xG' in player_gw_data and 'minutes' in player_gw_data and not player_gw_data['xG'].empty and not player_gw_data['minutes'].empty else 0,
                    "xA_per_90": round((float(player_gw_data['xA'].sum()) * 90) / max(float(player_gw_data['minutes'].sum()), 1), 2) if 'xA' in player_gw_data and 'minutes' in player_gw_data and not player_gw_data['xA'].empty and not player_gw_data['minutes'].empty else 0,
                    "xGI_per_90": round((float(player_gw_data['xGI'].sum()) * 90) / max(float(player_gw_data['minutes'].sum()), 1), 2) if 'xGI' in player_gw_data and 'minutes' in player_gw_data and not player_gw_data['xGI'].empty and not player_gw_data['minutes'].empty else 0,
                    "shots_per_90": round((float(player_gw_data['shots'].sum()) * 90) / max(float(player_gw_data['minutes'].sum()), 1), 2) if 'shots' in player_gw_data and 'minutes' in player_gw_data and not player_gw_data['shots'].empty and not player_gw_data['minutes'].empty else 0,
                    "key_passes_per_90": round((float(player_gw_data['key_passes'].sum()) * 90) / max(float(player_gw_data['minutes'].sum()), 1), 2) if 'key_passes' in player_gw_data and 'minutes' in player_gw_data and not player_gw_data['key_passes'].empty and not player_gw_data['minutes'].empty else 0,
                },
                "gameweeks": gameweeks
            }
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in get_player_trends: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@player_trends_bp.route('/player-search', methods=['GET'])
def search_players():
    """
    Search for players by name
    Query params:
    - q: search query
    """
    try:
        query = request.args.get('q', '').lower()
        
        if not os.path.exists(DATA_FILE):
            return jsonify({"error": "Data file not found"}), 404
        
        df = pd.read_csv(DATA_FILE)
        
        # Get unique players with their info
        # Group by id to get latest info per player
        latest_gw = df.groupby('id')['gameweek'].max()
        unique_players = df[df.apply(lambda row: row['gameweek'] == latest_gw[row['id']], axis=1)]
        unique_players = unique_players[['id', 'web_name', 'team_name', 'element_type', 'now_cost', 'selected_by_percent']].copy()
        
        # Create full name from web_name (since full_name doesn't exist in your data)
        unique_players['full_name'] = unique_players['web_name']
        
        # Filter by query
        if query:
            mask = (unique_players['web_name'].str.lower().str.contains(query, na=False)) | \
                   (unique_players['team_name'].str.lower().str.contains(query, na=False))
            unique_players = unique_players[mask]
        
        # Convert to list of dicts
        players = []
        for _, row in unique_players.iterrows():
            players.append({
                "id": int(row['id'].item()) if pd.notna(row['id']) else 0,
                "name": str(row['web_name']) if pd.notna(row['web_name']) else "Unknown",
                "team": str(row['team_name']) if pd.notna(row['team_name']) else "Unknown",
                "position": int(row['element_type'].item()) if pd.notna(row['element_type']) else 0,
                "cost": float(row['now_cost'].item()) if pd.notna(row['now_cost']) else 0,
                "ownership": float(row['selected_by_percent'].item()) if pd.notna(row['selected_by_percent']) else 0,
            })
        
        players.sort(key=lambda x: x['name'])
        
        return jsonify({
            "players": players,
            "count": len(players)
        })
    
    except Exception as e:
        print(f"Error in search_players: {str(e)}")
        return jsonify({"error": str(e)}), 500
