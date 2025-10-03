#!/usr/bin/env python3
"""
FPL Data API Server
Serves processed FPL data as JSON endpoints for frontend consumption
"""

import pandas as pd
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Global variables to store data
df = None
team_stats = None
data_loaded = False

def load_fpl_data():
    """Load and process FPL data from CSV"""
    global df, team_stats, data_loaded
    
    try:
        # Load the CSV file
        csv_path = os.path.join(os.path.dirname(__file__), 'fpl-data-stats.csv')
        df = pd.read_csv(csv_path)
        
        print(f"Loaded {len(df)} records from {csv_path}")
        
        # Create team statistics
        team_stats = df.groupby('team_name').agg({
            'total_points': ['count', 'sum', 'mean'],
            'now_cost': 'mean',
            'selected_by_percent': 'mean',
            'G': 'sum',
            'A': 'sum',
            'minutes': 'sum'
        })
        
        # Flatten column names
        team_stats.columns = ['_'.join(col).strip() for col in team_stats.columns.values]
        
        print(f"Created team stats for {len(team_stats)} teams")
        data_loaded = True
        
    except Exception as e:
        print(f"Error loading FPL data: {e}")
        data_loaded = False

def export_team_rankings():
    """Export team rankings data for frontend"""
    try:
        if not data_loaded or team_stats is None:
            return {"teams": []}
        
        teams_data = []
        
        # Add ranking based on total points (descending order)
        team_stats_ranked = team_stats.copy()
        team_stats_ranked['overall_rank'] = team_stats_ranked['total_points_sum'].rank(method='dense', ascending=False)
        team_stats_ranked['attack_rank'] = team_stats_ranked['G_sum'].rank(method='dense', ascending=False)
        team_stats_ranked['defense_rank'] = team_stats_ranked['total_points_sum'].rank(method='dense', ascending=False)
        
        for team_name, row in team_stats_ranked.iterrows():
            # Calculate more realistic metrics
            total_player_records = max(row['total_points_count'], 1)
            avg_games_per_player = total_player_records / 25  # Roughly 25 players per team
            
            team_data = {
                "name": team_name,
                "code": team_name[:3].upper(),
                "attackRank": int(row['attack_rank']),
                "defenseRank": int(row['defense_rank']),
                "goalsPerGame": float(row['G_sum']) / max(avg_games_per_player, 1),
                "xGPerGame": float(row['G_sum']) * 1.1 / max(avg_games_per_player, 1),  # Estimated xG
                "cleanSheetPct": max(0, min(100, 50 - (row['attack_rank'] - 10) * 2)),  # Estimated
                "goalsConceded": max(0.5, 2.0 - (21 - row['defense_rank']) * 0.1),  # Estimated
                "attackScore": float(row['G_sum']) * 5,  # Scaled attack score
                "defenseScore": float(row['total_points_sum']) / 20,  # Scaled defense score  
                "overallRank": int(row['overall_rank']),
                "totalPoints": int(row['total_points_sum']),
                "avgCost": float(row['now_cost_mean']),
                "avgOwnership": float(row['selected_by_percent_mean']),
                "totalGoals": int(row['G_sum']),
                "totalAssists": int(row['A_sum'])
            }
            teams_data.append(team_data)
        
        teams_data.sort(key=lambda x: x['totalPoints'], reverse=True)
        return {"teams": teams_data}
        
    except Exception as e:
        print(f"Error exporting team rankings: {e}")
        import traceback
        traceback.print_exc()
        return {"teams": []}

def export_attacking_picks():
    """Export attacking picks data by team strength"""
    try:
        if not data_loaded or df is None or team_stats is None:
            return {"attackingPicks": []}
        
        # Get top attacking teams by total goals scored
        top_attacking_teams = team_stats.nlargest(5, 'G_sum')
        attacking_data = []
        
        for team_name, team_row in top_attacking_teams.iterrows():
            # Get all players from this team
            team_players = df[df['team_name'] == team_name].copy()
            
            # Filter for attacking players (element_type 3=MID, 4=FWD)
            attacking_players = team_players[team_players['element_type'].isin([3, 4])]
            
            if len(attacking_players) > 0:
                # Group by player and sum their stats across gameweeks
                player_totals = attacking_players.groupby(['web_name', 'element_type']).agg({
                    'G': 'sum',
                    'A': 'sum', 
                    'total_points': 'sum',
                    'now_cost': 'first',  # Price should be consistent
                    'selected_by_percent': 'first',  # Ownership should be consistent
                    'gameweek': 'count'  # Number of gameweeks played
                }).reset_index()
                
                # Get top 3 players by total points
                top_players = player_totals.nlargest(3, 'total_points')
                
                players_data = []
                for _, player in top_players.iterrows():
                    gameweeks_played = max(player['gameweek'], 1)
                    player_data = {
                        "name": player['web_name'],
                        "position": "MID" if player['element_type'] == 3 else "FWD",
                        "price": float(player['now_cost']) / 10,
                        "goals_pg": float(player['G']) / gameweeks_played,
                        "assists_pg": float(player['A']) / gameweeks_played,
                        "points_pg": float(player['total_points']) / gameweeks_played,
                        "ownership": float(player['selected_by_percent']),
                        "form": float(player['total_points']) / 10,  # Simplified form
                        "total_points": int(player['total_points'])
                    }
                    players_data.append(player_data)
                
                team_data = {
                    "team": team_name,
                    "teamCode": team_name[:3].upper(),
                    "attackRank": len(attacking_data) + 1,
                    "attackStrength": float(team_row['G_sum']),
                    "difficulty": "easy" if team_row['G_sum'] > 10 else "moderate" if team_row['G_sum'] > 8 else "hard",
                    "players": players_data
                }
                attacking_data.append(team_data)
        
        return {"attackingPicks": attacking_data}
        
    except Exception as e:
        print(f"Error exporting attacking picks: {e}")
        import traceback
        traceback.print_exc()
        return {"attackingPicks": []}

def export_defensive_picks():
    """Export defensive picks data by team strength"""
    try:
        if not data_loaded or df is None or team_stats is None:
            return {"defensivePicks": []}
        
        # Get top defensive teams by lowest goals conceded (or highest total points as proxy)
        top_defensive_teams = team_stats.nlargest(4, 'total_points_sum')
        defensive_data = []
        
        for team_name, team_row in top_defensive_teams.iterrows():
            # Get all players from this team
            team_players = df[df['team_name'] == team_name].copy()
            
            # Filter for defensive players (element_type 1=GK, 2=DEF)
            defensive_players = team_players[team_players['element_type'].isin([1, 2])]
            
            if len(defensive_players) > 0:
                # Group by player and sum their stats across gameweeks
                player_totals = defensive_players.groupby(['web_name', 'element_type']).agg({
                    'CS': 'sum',  # Clean sheets
                    'total_points': 'sum',
                    'now_cost': 'first',
                    'selected_by_percent': 'first',
                    'gameweek': 'count'  # Number of gameweeks played
                }).reset_index()
                
                # Get top 3 players by total points
                top_players = player_totals.nlargest(3, 'total_points')
                
                players_data = []
                for _, player in top_players.iterrows():
                    gameweeks_played = max(player['gameweek'], 1)
                    cs_rate = float(player['CS']) / gameweeks_played
                    
                    player_data = {
                        "name": player['web_name'],
                        "position": "GK" if player['element_type'] == 1 else "DEF",
                        "price": float(player['now_cost']) / 10,
                        "cs_rate": cs_rate,
                        "points_pg": float(player['total_points']) / gameweeks_played,
                        "ownership": float(player['selected_by_percent']),
                        "clean_sheets": int(player['CS']),
                        "total_points": int(player['total_points'])
                    }
                    players_data.append(player_data)
                
                team_data = {
                    "team": team_name,
                    "teamCode": team_name[:3].upper(),
                    "defenseRank": len(defensive_data) + 1,
                    "defenseStrength": float(team_row['total_points_sum']) / 100,
                    "difficulty": "easy" if team_row['total_points_sum'] > 300 else "moderate" if team_row['total_points_sum'] > 250 else "hard",
                    "players": players_data
                }
                defensive_data.append(team_data)
        
        return {"defensivePicks": defensive_data}
        
    except Exception as e:
        print(f"Error exporting defensive picks: {e}")
        import traceback
        traceback.print_exc()
        return {"defensivePicks": []}

def export_top_performers():
    """Export top performers data"""
    try:
        if not data_loaded or df is None:
            return {"topPerformers": []}
        
        # Aggregate player stats across all gameweeks first
        player_totals = df.groupby(['web_name', 'team_name', 'element_type']).agg({
            'G': 'sum',  # Total goals
            'A': 'sum',  # Total assists  
            'total_points': 'sum',  # Total points
            'now_cost': 'first',  # Price (should be consistent)
            'selected_by_percent': 'first',  # Ownership (should be consistent)
            'gameweek': 'count'  # Games played
        }).reset_index()
        
        # Get top performers
        top_scorers = player_totals.nlargest(10, 'G')
        top_assisters = player_totals.nlargest(10, 'A') 
        top_points = player_totals.nlargest(10, 'total_points')
        
        def position_map(element_type):
            if element_type == 1:
                return "GK"
            elif element_type == 2:
                return "DEF"
            elif element_type == 3:
                return "MID"
            elif element_type == 4:
                return "FWD"
            else:
                return "UNK"
        
        performers_data = {
            "topScorers": [{
                "name": row['web_name'],
                "team": row['team_name'],
                "position": position_map(row['element_type']),
                "goals": int(row['G']),
                "price": float(row['now_cost']) / 10,
                "ownership": float(row['selected_by_percent']),
                "games_played": int(row['gameweek'])
            } for _, row in top_scorers.iterrows()],
            
            "topAssisters": [{
                "name": row['web_name'],
                "team": row['team_name'],
                "position": position_map(row['element_type']),
                "assists": int(row['A']),
                "price": float(row['now_cost']) / 10,
                "ownership": float(row['selected_by_percent']),
                "games_played": int(row['gameweek'])
            } for _, row in top_assisters.iterrows()],
            
            "topPoints": [{
                "name": row['web_name'],
                "team": row['team_name'],
                "position": position_map(row['element_type']),
                "points": int(row['total_points']),
                "price": float(row['now_cost']) / 10,
                "ownership": float(row['selected_by_percent']),
                "form": float(row['total_points']) / max(row['gameweek'], 1),  # Points per game
                "games_played": int(row['gameweek'])
            } for _, row in top_points.iterrows()]
        }
        
        return performers_data
        
    except Exception as e:
        print(f"Error exporting top performers: {e}")
        import traceback
        traceback.print_exc()
        return {"topPerformers": []}

# API Routes
@app.route('/api/team-rankings', methods=['GET'])
def get_team_rankings():
    """API endpoint for team rankings"""
    data = export_team_rankings()
    return jsonify(data)

@app.route('/api/attacking-picks', methods=['GET'])
def get_attacking_picks():
    """API endpoint for attacking picks"""
    data = export_attacking_picks()
    return jsonify(data)

@app.route('/api/defensive-picks', methods=['GET'])
def get_defensive_picks():
    """API endpoint for defensive picks"""
    data = export_defensive_picks()
    return jsonify(data)

@app.route('/api/top-performers', methods=['GET'])
def get_top_performers():
    """API endpoint for top performers"""
    data = export_top_performers()
    return jsonify(data)

@app.route('/api/quick-picks', methods=['GET'])
def get_quick_picks():
    """API endpoint for quick picks (combines attacking and defensive)"""
    attacking = export_attacking_picks()
    defensive = export_defensive_picks()
    
    return jsonify({
        "attacking": attacking.get("attackingPicks", []),
        "defensive": defensive.get("defensivePicks", [])
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy", 
        "message": "FPL API is running",
        "data_loaded": data_loaded,
        "total_records": len(df) if df is not None else 0,
        "total_teams": len(team_stats) if team_stats is not None else 0
    })

@app.route('/', methods=['GET'])
def root():
    """Root endpoint with API information"""
    return jsonify({
        "name": "FPL Data API",
        "version": "1.0.0",
        "endpoints": [
            "/api/health",
            "/api/team-rankings", 
            "/api/attacking-picks",
            "/api/defensive-picks",
            "/api/top-performers",
            "/api/quick-picks"
        ]
    })

if __name__ == '__main__':
    print("🏈 FPL Data API Server Starting...")
    
    # Load data on startup
    load_fpl_data()
    
    if data_loaded:
        print("✅ Data loaded successfully!")
        print("\n🚀 Available endpoints:")
        print("  - http://localhost:5000/api/health")
        print("  - http://localhost:5000/api/team-rankings")
        print("  - http://localhost:5000/api/attacking-picks")
        print("  - http://localhost:5000/api/defensive-picks")
        print("  - http://localhost:5000/api/top-performers")
        print("  - http://localhost:5000/api/quick-picks")
        print("\n⚡ Server running on http://localhost:5000")
    else:
        print("❌ Failed to load data. Check the CSV file path.")
    
    # Start the Flask server
app.run(host='127.0.0.1', port=5000, debug=True)
