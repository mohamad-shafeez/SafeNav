import logging
from flask import Blueprint, request, jsonify
from services.planner_engine import generate_itinerary_ai

planner_bp = Blueprint('planner', __name__)

@planner_bp.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        prompt = data.get('prompt')
        
        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400
            
        # Call your secure service!
        result = generate_itinerary_ai(prompt)
        
        # Check if the engine failed internally
        if not result:
             return jsonify({"error": "AI Engine returned nothing"}), 500
             
        return jsonify({"result": result})
        
    except Exception as e:
        logging.error(f"🚨 Planner Route Crash: {str(e)}")
        return jsonify({"error": str(e)}), 500