import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS

# Absolute imports
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.prediction import prediction_bp
from routes.route import route_bp
from routes.stays import stays_bp
from routes.tools import tools_bp 
from routes.voice import voice_bp
from routes.documents_routes import documents_bp

def create_app():
    # Initialize app
    app = Flask(__name__, static_folder='static', template_folder='templates')
    
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-later')

    # Enable CORS
    CORS(app) 

    @app.route("/api/health")
    def health():
        return {
            "status": "OK",
            "service": "TravelMate Vault Pro",
            "engine": "AI Intelligence System"
        }

    # --- THE PROXY ROUTE (Fixed Indentation) ---
    @app.route('/api/proxy/geocode')
    def proxy_geocode():
        import requests
        location = request.args.get('q')
        if not location:
            return jsonify({"error": "No location provided"}), 400

        headers = {'User-Agent': 'SafeNav_Travel_App/1.0'}
        url = f"https://nominatim.openstreetmap.org/search?q={location}&format=json&limit=1"
        
        try:
            response = requests.get(url, headers=headers)
            return jsonify(response.json())
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(prediction_bp, url_prefix="/api/prediction")
    app.register_blueprint(route_bp, url_prefix="/api/route")
    app.register_blueprint(stays_bp, url_prefix="/api/stays")
    app.register_blueprint(voice_bp, url_prefix="/api/voice")
    app.register_blueprint(documents_bp, url_prefix="/api/documents")
    app.register_blueprint(tools_bp, url_prefix="/api") 
    
    return app

# Expose app for Gunicorn
app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)