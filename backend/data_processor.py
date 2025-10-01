"""
FPL Data Processor - Extract and format data from analysis notebook
"""
import pandas as pd
import json
import os
from typing import Dict, List, Any

class FPLDataProcessor:
    def __init__(self, data_dir: str = "../data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.raw_df = None  # Will store the raw dataframe for form calculations
    
    def process_and_export_all(self, 
                              df: pd.DataFrame, 
                              season_stats: pd.DataFrame,
                              team_rankings: pd.DataFrame = None,
                              analyzer = None):
        """Process all data and export to JSON files"""
        
        print("🔄 Processing FPL data for export...")
        
        # Store raw dataframe for form calculations
        self.raw_df = df
        
        # Export player data
        self.export_players(season_stats)
        
        # Export team data
        if team_rankings is not None:
            self.export_teams(team_rankings)
        
        # Export top performers
        self.export_top_performers(season_stats)
        
        # Export hidden gems
        self.export_hidden_gems(season_stats)
        
        # Export fixture data if analyzer available
        if analyzer is not None:
            self.export_fixtures(analyzer)
            self.export_transfer_recommendations(analyzer)
        
        print("✅ All data exported successfully!")
        print(f"📁 Files saved to: {os.path.abspath(self.data_dir)}")
    
    def export_players(self, season_stats: pd.DataFrame):
        """Export all player data"""
        players_data = []
        
        for _, player in season_stats.iterrows():
            player_dict = {
                "id": int(player.get('element', 0)),
                "web_name": player.get('web_name', ''),
                "full_name": player.get('first_name', '') + ' ' + player.get('second_name', ''),
                "team_name": player.get('team_name', ''),
                "position": player.get('element_type', 0),
                "position_name": player.get('position_name', ''),
                "now_cost": float(player.get('now_cost', 0)),
                "selected_by_percent": float(player.get('selected_by_percent', 0)),
                "total_points": int(player.get('season_points', 0)),
                "points_per_game": round(float(player.get('season_points', 0)) / max(float(player.get('games_played', 1)), 1), 2),
                "games_played": int(player.get('games_played', 0)),
                "minutes": int(player.get('season_minutes', 0)),
                "goals": int(player.get('season_goals', 0)),
                "assists": int(player.get('season_assists', 0)),
                "clean_sheets": int(player.get('season_CS', 0)),
                "goals_conceded": int(player.get('season_GC', 0)),
                "expected_goals": round(float(player.get('season_xG', 0)), 2),
                "expected_assists": round(float(player.get('season_xA', 0)), 2),
                "expected_clean_sheets": round(float(player.get('season_xCS', 0)), 2),
                "value_score": round(float(player.get('points_per_million', 0)), 2),
                "form_score": self._calculate_player_form(player, season_stats)
            }
            players_data.append(player_dict)
        
        self.save_json(players_data, 'players.json')
        print(f"📊 Exported {len(players_data)} players")
    
    def export_teams(self, team_rankings: pd.DataFrame):
        """Export team rankings and statistics"""
        teams_data = []
        
        for team_name, team_data in team_rankings.iterrows():
            team_dict = {
                "name": team_name,
                "attack_strength": round(float(team_data.get('attack_strength', 0)), 3),
                "defense_strength": round(float(team_data.get('defense_strength', 0)), 3),
                "attack_rank": int(team_data.get('attack_rank', 0)),
                "defense_rank": int(team_data.get('defense_rank', 0)),
                "overall_strength": round(float(team_data.get('overall_strength', 0)), 3),
                "overall_rank": int(team_data.get('overall_rank', 0))
            }
            teams_data.append(team_dict)
        
        # Sort by overall rank
        teams_data.sort(key=lambda x: x['overall_rank'])
        
        self.save_json(teams_data, 'teams.json')
        print(f"🏆 Exported {len(teams_data)} teams")
    
    def export_top_performers(self, season_stats: pd.DataFrame):
        """Export top performers data"""
        
        # Goal leaders
        goal_leaders = season_stats[season_stats['season_goals'] > 0].nlargest(10, 'season_goals')
        goal_leaders_data = []
        for _, player in goal_leaders.iterrows():
            goal_leaders_data.append({
                "web_name": player.get('web_name', ''),
                "team_name": player.get('team_name', ''),
                "goals": int(player.get('season_goals', 0)),
                "games_played": int(player.get('games_played', 0)),
                "goals_per_game": round(float(player.get('season_goals', 0)) / max(float(player.get('games_played', 1)), 1), 2),
                "total_points": int(player.get('season_points', 0)),
                "now_cost": float(player.get('now_cost', 0))
            })
        
        # Value players
        value_players = season_stats[(season_stats['season_points'] >= 20) & (season_stats['points_per_million'] > 0)].nlargest(10, 'points_per_million')
        value_players_data = []
        for _, player in value_players.iterrows():
            value_players_data.append({
                "web_name": player.get('web_name', ''),
                "team_name": player.get('team_name', ''),
                "position_name": player.get('position_name', ''),
                "points_per_million": round(float(player.get('points_per_million', 0)), 2),
                "total_points": int(player.get('season_points', 0)),
                "now_cost": float(player.get('now_cost', 0)),
                "selected_by_percent": float(player.get('selected_by_percent', 0))
            })
        
        # Season stars (highest points)
        season_stars = season_stats.nlargest(10, 'season_points')
        season_stars_data = []
        for _, player in season_stars.iterrows():
            season_stars_data.append({
                "web_name": player.get('web_name', ''),
                "team_name": player.get('team_name', ''),
                "position_name": player.get('position_name', ''),
                "total_points": int(player.get('season_points', 0)),
                "points_per_game": round(float(player.get('season_points', 0)) / max(float(player.get('games_played', 1)), 1), 2),
                "games_played": int(player.get('games_played', 0)),
                "now_cost": float(player.get('now_cost', 0))
            })
        
        top_performers = {
            "goal_leaders": goal_leaders_data,
            "value_players": value_players_data,
            "season_stars": season_stars_data
        }
        
        self.save_json(top_performers, 'top_performers.json')
        print(f"🔥 Exported top performers data")
    
    def export_hidden_gems(self, season_stats: pd.DataFrame):
        """Export hidden gems and differential picks"""
        
        # Hidden gems
        hidden_gems = season_stats[
            (season_stats['season_points'] >= 30) & 
            (season_stats['season_points'] <= 60) &
            (season_stats['selected_by_percent'] < 5) & 
            (season_stats['selected_by_percent'] > 0) &
            (season_stats['games_played'] >= 3)
        ].copy()
        
        if len(hidden_gems) > 0:
            # Calculate underlying score
            hidden_gems = hidden_gems.copy()
            hidden_gems['underlying_score'] = (
                hidden_gems['season_xG'] * 0.3 + 
                hidden_gems['season_xA'] * 0.25 + 
                hidden_gems['season_xCS'] * 0.2 + 
                hidden_gems['season_key_passes'] * 0.1 + 
                hidden_gems['season_shots'] * 0.05 +
                (hidden_gems['season_minutes'] / (hidden_gems['games_played'] * 90)) * 0.1
            )
            
            hidden_gems = hidden_gems.nlargest(10, 'underlying_score')
        
        hidden_gems_data = []
        for _, player in hidden_gems.iterrows():
            hidden_gems_data.append({
                "web_name": player.get('web_name', ''),
                "team_name": player.get('team_name', ''),
                "position_name": player.get('position_name', ''),
                "total_points": int(player.get('season_points', 0)),
                "selected_by_percent": float(player.get('selected_by_percent', 0)),
                "now_cost": float(player.get('now_cost', 0)),
                "expected_goals": round(float(player.get('season_xG', 0)), 2),
                "expected_assists": round(float(player.get('season_xA', 0)), 2),
                "expected_clean_sheets": round(float(player.get('season_xCS', 0)), 2),
                "underlying_score": round(float(player.get('underlying_score', 0)), 2)
            })
        
        # Differential picks
        differential_picks = season_stats[
            (season_stats['season_points'] >= 40) & 
            (season_stats['selected_by_percent'] < 3) & 
            (season_stats['selected_by_percent'] > 0) &
            (season_stats['games_played'] >= 4)
        ].nlargest(10, 'season_points')
        
        differential_data = []
        for _, player in differential_picks.iterrows():
            differential_data.append({
                "web_name": player.get('web_name', ''),
                "team_name": player.get('team_name', ''),
                "position_name": player.get('position_name', ''),
                "total_points": int(player.get('season_points', 0)),
                "points_per_game": round(float(player.get('season_points', 0)) / max(float(player.get('games_played', 1)), 1), 2),
                "selected_by_percent": float(player.get('selected_by_percent', 0)),
                "now_cost": float(player.get('now_cost', 0))
            })
        
        hidden_gems_export = {
            "hidden_gems": hidden_gems_data,
            "differential_picks": differential_data
        }
        
        self.save_json(hidden_gems_export, 'hidden_gems.json')
        print(f"💎 Exported hidden gems and differentials")
    
    def export_fixtures(self, analyzer):
        """Export fixture analysis data"""
        try:
            # Get fixture data for available gameweeks
            fixtures_data = []
            
            for gw in range(7, 16):  # Gameweeks 7-15
                try:
                    gw_fixtures = analyzer.get_fixture_difficulty_matrix(gw, gw)
                    if not gw_fixtures.empty:
                        for _, fixture in gw_fixtures.iterrows():
                            fixture_dict = {
                                "gameweek": gw,
                                "home_team": fixture.get('home_team', ''),
                                "away_team": fixture.get('away_team', ''),
                                "home_attack_difficulty": round(float(fixture.get('attack_difficulty', 0)), 2),
                                "home_defense_difficulty": round(float(fixture.get('defense_difficulty', 0)), 2),
                                "home_team_attack_rank": int(fixture.get('home_attack_rank', 0)) if 'home_attack_rank' in fixture else 0,
                                "home_team_defense_rank": int(fixture.get('home_defense_rank', 0)) if 'home_defense_rank' in fixture else 0,
                                "away_team_attack_rank": int(fixture.get('away_attack_rank', 0)) if 'away_attack_rank' in fixture else 0,
                                "away_team_defense_rank": int(fixture.get('away_defense_rank', 0)) if 'away_defense_rank' in fixture else 0
                            }
                            fixtures_data.append(fixture_dict)
                except:
                    continue
            
            self.save_json(fixtures_data, 'fixtures.json')
            print(f"⚽ Exported {len(fixtures_data)} fixtures")
            
        except Exception as e:
            print(f"⚠️ Could not export fixtures: {e}")
            self.save_json([], 'fixtures.json')
    
    def export_transfer_recommendations(self, analyzer):
        """Export transfer recommendations"""
        try:
            # This would need to be implemented based on your analyzer's methods
            transfers_data = {
                "transfers_in": [],
                "transfers_out": [],
                "gameweek_targets": [],
                "long_term_holds": []
            }
            
            self.save_json(transfers_data, 'transfers.json')
            print(f"📈 Exported transfer recommendations")
            
        except Exception as e:
            print(f"⚠️ Could not export transfers: {e}")
            self.save_json({"transfers_in": [], "transfers_out": []}, 'transfers.json')
    
    def _calculate_player_form(self, player: pd.Series, season_stats: pd.DataFrame) -> float:
        """Calculate player form from last 5 gameweeks performance"""
        if self.raw_df is None:
            return 0.0
            
        try:
            player_name = player.get('web_name', '')
            if not player_name:
                return 0.0
            
            # Get player's recent gameweek data
            player_data = self.raw_df[self.raw_df['web_name'] == player_name]
            
            if player_data.empty:
                return 0.0
            
            # Get last 5 gameweeks or all available gameweeks if less than 5
            recent_data = player_data.nlargest(5, 'gameweek')
            
            if recent_data.empty:
                return 0.0
            
            # Calculate form as average points per game in recent gameweeks
            total_points = recent_data['total_points'].sum()
            games_count = len(recent_data[recent_data['minutes'] > 0])  # Only count games played
            
            if games_count == 0:
                return 0.0
            
            form_score = total_points / games_count
            return round(float(form_score), 1)
            
        except Exception as e:
            print(f"⚠️ Could not calculate form for {player.get('web_name', 'unknown')}: {e}")
            return 0.0
    
    def save_json(self, data: Any, filename: str):
        """Save data to JSON file"""
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)