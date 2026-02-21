from flask import Blueprint, request, jsonify
from flask_cors import CORS
from services.prediction_engine import calculate_risk

# Initialize Blueprint
prediction_bp = Blueprint("prediction", __name__)

# Apply CORS specifically to this blueprint for cross-origin frontend requests
# In production, replace "*" with your specific Netlify/Vercel URL
CORS(prediction_bp)

@prediction_bp.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    lat = data.get("lat")
    lng = data.get("lng")
    time = data.get("time", "day")
    mode = data.get("travel_mode", "walking")
    
    # Catch the user's health profile sent from JS
    user_profile = data.get("user_profile", "standard") 

    if lat is None or lng is None:
        return jsonify({"error": "Location required"}), 400

    # Logic Engine Call
    result = calculate_risk(lat, lng, time, mode, user_profile)

    # Clean return: result now contains aqi, trend, and risk_level
    return jsonify(result)