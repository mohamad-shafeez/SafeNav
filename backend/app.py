import os

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS

from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.prediction import prediction_bp
from routes.route import route_bp
from routes.stays import stays_bp
from routes.tools import tools_bp
from routes.voice import voice_bp
from routes.documents_routes import documents_bp
from routes.planner import planner_bp
from utils.firebase_admin import ensure_firebase_app


def _allowed_origins():
    configured = os.environ.get("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return origins or [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-later")

    # Credentials are optional at import time so health checks and unit tests
    # work on a clean checkout. Protected routes fail closed without them.
    try:
        ensure_firebase_app()
    except Exception as error:
        app.logger.warning("Firebase Admin is not configured: %s", error)

    CORS(app, resources={r"/api/*": {"origins": _allowed_origins()}})

    @app.route("/api/health")
    def health():
        return {
            "status": "OK",
            "service": "SafeNav API",
            "engine": "AI Intelligence System",
        }

    @app.route("/api/proxy/geocode")
    def proxy_geocode():
        import requests
        from routes.dashboard import track_system_event

        location = request.args.get("q", "").strip()
        if not location:
            return jsonify({"error": "No location provided"}), 400

        headers = {"User-Agent": "SafeNav_Travel_App/1.0"}
        try:
            response = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": location, "format": "json", "limit": 1},
                headers=headers,
                timeout=10,
            )
            response.raise_for_status()
            track_system_event("nominatim")
            return jsonify(response.json())
        except Exception as error:
            return jsonify({"error": str(error)}), 502

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


app = create_app()

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", port=5000)
