from flask import Blueprint, request, jsonify
from services.stay_engine import calculate_stay_risk

stays_bp = Blueprint("stays", __name__)

@stays_bp.route("/analyze", methods=["POST"])
def stay_score():
    data = request.get_json()
    
    # Handle single stay or list
    stays = data if isinstance(data, list) else [data]
    results = []

    for stay in stays:
        lat = stay.get("lat")
        lng = stay.get("lng")
        stay_id = stay.get("stay_id") or stay.get("id")
        
        if lat is None or lng is None:
            continue
        
        # Calls the engine to check disaster/safety data
        risk_info = calculate_stay_risk(lat, lng)
        risk_info["stay_id"] = stay_id
        results.append(risk_info)
    
    return jsonify({
        "status": "success",
        "stays": results
    })
