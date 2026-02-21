import os
from dotenv import load_dotenv
load_dotenv()  # This loads the .env file (SECRET_KEY, GEMINI_API_KEY, etc.)

from flask import Flask
from flask_cors import CORS

# Absolute imports
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.prediction import prediction_bp
from routes.route import route_bp
from routes.stays import stays_bp
from routes.tools import tools_bp  # <--- This will handle your Images
from routes.voice import voice_bp
from routes.documents_routes import documents_bp
# 🆕 Import your Planner blueprint (create this if it doesn't exist yet)
# from routes.planner import planner_bp 

def create_app():
    # Initialize app
    app = Flask(__name__, static_folder='static', template_folder='templates')
    
    # ✅ SECURITY: Use the secret key from your .env file
    # If the .env is missing, it falls back to a temporary dev key
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

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(prediction_bp, url_prefix="/api/prediction")
    app.register_blueprint(route_bp, url_prefix="/api/route")
    app.register_blueprint(stays_bp, url_prefix="/api/stays")
    app.register_blueprint(voice_bp, url_prefix="/api/voice")
    app.register_blueprint(documents_bp, url_prefix="/api/documents")
    
    # ✅ This handles your /api/get-image requests
    app.register_blueprint(tools_bp, url_prefix="/api") 
    
    # 🆕 Register your Planner Blueprint
    # app.register_blueprint(planner_bp, url_prefix="/api/planner")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)