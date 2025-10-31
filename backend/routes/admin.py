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
        
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {deleted_count} fixture(s) from Game Week {gameweek}. Run "Process Data" to update analytics.',
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


@admin_bp.route('/admin/process-notebook', methods=['POST'])
def process_notebook():
    """
    Execute the Jupyter notebook to process CSV data and generate JSON files
    This runs the fpl.ipynb notebook which reads CSV and outputs analytics JSON
    """
    try:
        import subprocess
        import sys
        
        # Get the project root directory (where fpl.ipynb is located)
        notebook_path = os.path.join(Config.PROJECT_ROOT, 'fpl.ipynb')
        
        # Check if notebook exists
        if not os.path.exists(notebook_path):
            return jsonify({
                'success': False,
                'message': f'Notebook not found at {notebook_path}'
            }), 404
        
        # Check if CSV file exists
        if not os.path.exists(Config.FPL_DATA_CSV):
            return jsonify({
                'success': False,
                'message': 'CSV file not found. Please upload fpl-data-stats.csv first.'
            }), 404
        
        # Execute the notebook using nbconvert
        # This runs the notebook and generates all JSON outputs
        result = subprocess.run(
            [
                sys.executable, '-m', 'jupyter', 'nbconvert',
                '--to', 'notebook',
                '--execute',
                '--inplace',
                notebook_path
            ],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            error_message = result.stderr if result.stderr else 'Unknown error during notebook execution'
            return jsonify({
                'success': False,
                'message': f'Notebook execution failed: {error_message}'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Successfully processed data and updated all analytics files',
            'output': result.stdout if result.stdout else 'Notebook executed successfully'
        }), 200
    
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'message': 'Notebook execution timed out (exceeded 5 minutes)'
        }), 500
    except FileNotFoundError:
        return jsonify({
            'success': False,
            'message': 'Jupyter is not installed. Please install it with: pip install jupyter nbconvert'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error executing notebook: {str(e)}'
        }), 500
