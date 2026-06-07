import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS

# 🚀 NEW: Import Firebase Admin
import firebase_admin
from firebase_admin import credentials

# Absolute imports
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.prediction import prediction_bp
from routes.route import route_bp
from routes.stays import stays_bp
from routes.tools import tools_bp 
from routes.voice import voice_bp
from routes.documents_routes import documents_bp
from routes.planner import planner_bp

def create_app():
    # Initialize app
    app = Flask(__name__, static_folder='static', template_folder='templates')
    
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-later')
    
# 🚀 THE FINAL FIX: Initialize Firebase with Identity (Service Account)
    if not firebase_admin._apps:
        try:
            # Look for the ID Card we just downloaded
            cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
            
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("[Firebase] Admin SDK initialized with Service Account.")
            else:
                # Fallback to Project ID if file is missing
                firebase_project_id = os.environ.get('FIREBASE_PROJECT_ID', 'my-diaster-project-95132-a577c')
                firebase_admin.initialize_app(options={'projectId': firebase_project_id})
                print("[Firebase] Warning: serviceAccountKey.json not found. Using Project ID fallback.")
        except Exception as e:
            print(f"[Firebase] Initialization Error: {e}")

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    @app.route("/api/health")
    def health():
        return {
            "status": "OK",
            "service": "TravelMate Vault Pro",
            "engine": "AI Intelligence System"
        }

# --- THE PROXY ROUTE (Fixed Indentation & Tracking) ---
    @app.route('/api/proxy/geocode')
    def proxy_geocode():
        import requests
        from routes.dashboard import track_system_event # 🚀 NEW: Import your tracker

        location = request.args.get('q')
        if not location:
            return jsonify({"error": "No location provided"}), 400

        headers = {'User-Agent': 'SafeNav_Travel_App/1.0'}
        url = f"https://nominatim.openstreetmap.org/search?q={location}&format=json&limit=1"
        
        try:
            response = requests.get(url, headers=headers)
            
            # 🚀 NEW: Track the Nominatim API call!
            if response.status_code == 200:
                track_system_event("nominatim")
                
            return jsonify(response.json())
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(prediction_bp, url_prefix="/api/prediction")
    app.register_blueprint(route_bp, url_prefix="/api/route")
    app.register_blueprint(stays_bp, url_prefix="/api/stays")
    app.register_blueprint(voice_bp, url_prefix="/api/voice")
    app.register_blueprint(documents_bp, url_prefix="/api/documents")
    app.register_blueprint(tools_bp, url_prefix="/api") 
    app.register_blueprint(planner_bp, url_prefix="/api/planner")
    app.register_blueprint(dashboard_bp, url_prefix="/api/admin")
    return app

# Expose app for Gunicorn
app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)