from flask import Blueprint, request, jsonify
from services.planner_engine import generate_itinerary_ai

planner_bp = Blueprint('planner', __name__)

@planner_bp.route('/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt')
    
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
        
    # Call your secure service!
    result = generate_itinerary_ai(prompt)
    return jsonify({"result": result})