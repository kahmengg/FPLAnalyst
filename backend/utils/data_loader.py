# utils/data_loader.py
import json
import os
from config.config import Config

def load_json_data(filename):
    """Load JSON data from the data directory"""
    filepath = os.path.join(Config.DATA_DIR, filename)
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