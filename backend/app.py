# app.py
from flask import Flask
from flask_cors import CORS
from routes.fixtures import fixtures_bp
from routes.health import health_bp
from routes.players import players_bp
import os
from config.config import Config

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
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    print(f"🌐 API will be available at: http://localhost:{port}")
    print(f"🔧 Health check: http://localhost:{port}/api/health")
    app.run(debug=debug, host="0.0.0.0", port=port)
