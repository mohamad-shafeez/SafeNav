import logging
from flask import Blueprint, request, jsonify
from flask_cors import CORS
from services.prediction_engine import calculate_risk

prediction_bp = Blueprint("prediction", __name__)

# SECURITY: Replace "*" with your actual frontend URL (e.g., your-app.vercel.app)
CORS(prediction_bp, resources={r"/predict": {"origins": "*"}})

@prediction_bp.route("/predict", methods=["POST"])
def predict():
    # 1. Check if the request is actually JSON
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # 2. Extract and provide defaults
    lat = data.get("lat")
    lng = data.get("lng")
    time = data.get("time", "day")
    mode = data.get("travel_mode", "walking")
    user_profile = data.get("user_profile", "standard")

    # 3. Defensive Validation: Ensure lat/lng exist and are numbers
    if lat is None or lng is None:
        return jsonify({"error": "Latitude and Longitude are required"}), 400

    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (TypeError, ValueError):
        return jsonify({"error": "Latitude and Longitude must be valid numbers"}), 400

    # 4. Global Error Handling for the Engine
    try:
        result = calculate_risk(lat_f, lng_f, time, mode, user_profile)
        return jsonify(result), 200
    except Exception as e:
        # logging.error records the error with a timestamp and details
        logging.error(f"Prediction engine failed for {user_profile}: {e}") 
        return jsonify({
            "error": "The AI service is temporarily busy. Please try again in a moment.",
            "status": "fail"
        }), 500