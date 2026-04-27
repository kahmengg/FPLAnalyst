# app.py
from flask import Flask
from flask_cors import CORS
from routes.fixtures import fixtures_bp
from routes.health import health_bp
from routes.players import players_bp
from config.config import Config
import os
app = Flask(__name__)
# API is public read-mostly data; allow cross-origin frontend access from
# Vercel previews/custom domains and local dev to avoid failed browser fetches.
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config.from_object(Config)
# CORS(app)
# Register blueprints
app.register_blueprint(fixtures_bp, url_prefix='/api')
app.register_blueprint(health_bp, url_prefix='/api')
app.register_blueprint(players_bp, url_prefix='/api')

if __name__ == '__main__':
    print("🚀 Starting FPL Analyst API...")
    print(f"📁 Data directory: {Config.DATA_DIR}")
    print(f"📁 Data directory exists: {os.path.exists(Config.DATA_DIR)}")
    if os.path.exists(Config.DATA_DIR):
        print(f"📁 Contents: {os.listdir(Config.DATA_DIR)}")
    print("🌐 API will be available at: http://localhost:5000")
    print("🔧 Test endpoint: http://localhost:5000/api/test")
    print("🔧 Health check: http://localhost:5000/api/health")
    app.run(debug=True, host='127.0.0.1', port=5000)