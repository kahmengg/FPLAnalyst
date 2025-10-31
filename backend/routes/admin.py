# routes/admin.py
from flask import Blueprint, request, jsonify
from config.config import Config
import pandas as pd
import os
import json
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

# Admin endpoints

@admin_bp.route('/admin/upload', methods=['POST'])
def upload_csv():
    """
    Upload and override the fpl-data-stats.csv file
    Expects a file in the request with key 'file'
    """
    try:
        # Check if file is present in request
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        # Check if file is CSV
        if not file.filename.endswith('.csv'):
            return jsonify({
                'success': False,
                'message': 'Invalid file format. Please upload a CSV file'
            }), 400
        
        # Validate CSV content before saving
        try:
            # Read the uploaded file to validate it's a proper CSV
            df = pd.read_csv(file)
            
            # Check if dataframe is empty
            if df.empty:
                return jsonify({
                    'success': False,
                    'message': 'Uploaded CSV file is empty'
                }), 400
            
            # Reset file pointer to beginning for saving
            file.seek(0)
            
            # Save the file, overwriting the existing one
            file.save(Config.FPL_DATA_CSV)
            
            return jsonify({
                'success': True,
                'message': f'Successfully uploaded and processed {len(df)} rows of data',
                'rows': len(df),
                'columns': len(df.columns)
            }), 200
            
        except pd.errors.EmptyDataError:
            return jsonify({
                'success': False,
                'message': 'Uploaded file is empty or invalid CSV format'
            }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error validating CSV: {str(e)}'
            }), 400
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error uploading file: {str(e)}'
        }), 500


@admin_bp.route('/admin/gameweeks', methods=['GET'])
def get_gameweeks():
    """
    Get list of all available game weeks with fixture counts
    Reads from fixtures.json in the data directory
    """
    try:
        fixtures_file = os.path.join(Config.DATA_DIR, 'fixture_analysis', 'fixtures.json')
        
        # Check if fixtures file exists
        if not os.path.exists(fixtures_file):
            return jsonify({
                'success': True,
                'gameweeks': [],
                'message': 'No fixture data found'
            }), 200
        
        # Read fixtures data
        with open(fixtures_file, 'r') as f:
            fixtures_data = json.load(f)
        
        # Count fixtures per gameweek
        gameweek_counts = {}
        
        # Check if fixtures_data is a dict with 'fixtures' key or a list
        fixtures_list = fixtures_data.get('fixtures', fixtures_data) if isinstance(fixtures_data, dict) else fixtures_data
        
        for fixture in fixtures_list:
            gw = fixture.get('gameweek', fixture.get('GW'))
            if gw:
                gameweek_counts[gw] = gameweek_counts.get(gw, 0) + 1
        
        # Convert to list and sort by gameweek (descending)
        gameweeks = [
            {'gameweek': gw, 'count': count}
            for gw, count in gameweek_counts.items()
        ]
        gameweeks.sort(key=lambda x: x['gameweek'], reverse=True)
        
        return jsonify({
            'success': True,
            'gameweeks': gameweeks,
            'total_gameweeks': len(gameweeks)
        }), 200
    
    except json.JSONDecodeError:
        return jsonify({
            'success': False,
            'message': 'Error reading fixtures data: Invalid JSON format'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching game weeks: {str(e)}'
        }), 500


@admin_bp.route('/admin/clear-gameweek', methods=['POST'])
def clear_gameweek():
    """
    Clear all fixtures for a specific game week
    Expects JSON body with 'gameweek' field
    """
    try:
        # Get gameweek from request
        data = request.get_json()
        
        if not data or 'gameweek' not in data:
            return jsonify({
                'success': False,
                'message': 'Gameweek number is required'
            }), 400
        
        gameweek = data['gameweek']
        
        # Validate gameweek is a number
        try:
            gameweek = int(gameweek)
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'message': 'Invalid gameweek number'
            }), 400
        
        fixtures_file = os.path.join(Config.DATA_DIR, 'fixture_analysis', 'fixtures.json')
        
        # Check if fixtures file exists
        if not os.path.exists(fixtures_file):
            return jsonify({
                'success': False,
                'message': 'No fixture data found'
            }), 404
        
        # Read fixtures data
        with open(fixtures_file, 'r') as f:
            fixtures_data = json.load(f)
        
        # Check if fixtures_data is a dict with 'fixtures' key or a list
        is_dict_format = isinstance(fixtures_data, dict) and 'fixtures' in fixtures_data
        fixtures_list = fixtures_data.get('fixtures', fixtures_data) if is_dict_format else fixtures_data
        
        # Count fixtures before deletion
        original_count = len(fixtures_list)
        
        # Filter out fixtures for the specified gameweek
        filtered_fixtures = [
            fixture for fixture in fixtures_list
            if fixture.get('gameweek', fixture.get('GW')) != gameweek
        ]
        
        deleted_count = original_count - len(filtered_fixtures)
        
        if deleted_count == 0:
            return jsonify({
                'success': False,
                'message': f'No fixtures found for Game Week {gameweek}'
            }), 404
        
        # Save the filtered fixtures back to file
        if is_dict_format:
            fixtures_data['fixtures'] = filtered_fixtures
            save_data = fixtures_data
        else:
            save_data = filtered_fixtures
        
        with open(fixtures_file, 'w') as f:
            json.dump(save_data, f, indent=2)
        
        # Also update related files if they exist
        update_related_files(gameweek)
        
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {deleted_count} fixture(s) from Game Week {gameweek}',
            'deleted_count': deleted_count,
            'remaining_fixtures': len(filtered_fixtures)
        }), 200
    
    except json.JSONDecodeError:
        return jsonify({
            'success': False,
            'message': 'Error reading fixtures data: Invalid JSON format'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error clearing game week: {str(e)}'
        }), 500


def update_related_files(gameweek):
    """
    Update related fixture analysis files after clearing a gameweek
    This ensures consistency across all fixture-related data
    """
    try:
        fixture_analysis_dir = os.path.join(Config.DATA_DIR, 'fixture_analysis')
        
        # Update fixture_opportunities.json
        opportunities_file = os.path.join(fixture_analysis_dir, 'fixture_opportunities.json')
        if os.path.exists(opportunities_file):
            with open(opportunities_file, 'r') as f:
                opportunities_data = json.load(f)
            
            # Filter out opportunities for the cleared gameweek
            if isinstance(opportunities_data, dict):
                for key in opportunities_data:
                    if isinstance(opportunities_data[key], list):
                        opportunities_data[key] = [
                            opp for opp in opportunities_data[key]
                            if opp.get('gameweek', opp.get('GW')) != gameweek
                        ]
            
            with open(opportunities_file, 'w') as f:
                json.dump(opportunities_data, f, indent=2)
        
        # Update team_fixture_summary.json
        summary_file = os.path.join(fixture_analysis_dir, 'team_fixture_summary.json')
        if os.path.exists(summary_file):
            with open(summary_file, 'r') as f:
                summary_data = json.load(f)
            
            # Update team summaries to exclude the cleared gameweek
            if isinstance(summary_data, dict):
                for team in summary_data:
                    if isinstance(summary_data[team], dict):
                        if 'fixtures' in summary_data[team] and isinstance(summary_data[team]['fixtures'], list):
                            summary_data[team]['fixtures'] = [
                                fix for fix in summary_data[team]['fixtures']
                                if fix.get('gameweek', fix.get('GW')) != gameweek
                            ]
            
            with open(summary_file, 'w') as f:
                json.dump(summary_data, f, indent=2)
        
    except Exception as e:
        # Log error but don't fail the main operation
        print(f"Warning: Error updating related files: {str(e)}")
