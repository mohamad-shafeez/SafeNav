import logging
import json
from flask import Blueprint, request, jsonify
from services.planner_engine import generate_itinerary_ai

planner_bp = Blueprint('planner', __name__)

@planner_bp.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        
        # 1. Grab data from frontend
        destination = data.get('destination', 'Unknown')
        origin = data.get('origin', 'Not specified')
        start_date = data.get('start_date', 'Soon')
        duration_days = int(data.get('duration_hours', 3)) 
        user_profile = data.get('user_profile', 'standard').lower()
        full_profile = data.get('full_profile', {})
        
        # Extract deep profile details
        trip_style = full_profile.get('tripStyle', 'Adventure')
        budget = full_profile.get('budget', 'Moderate')
        companions = full_profile.get('companions', 'Solo')
        transport = full_profile.get('transport', 'Public Transit')
        food = full_profile.get('food', 'Any')

        # ---------------------------------------------------------
        # LAYER 1: ENVIRONMENTAL SAFETY LOGIC
        # ---------------------------------------------------------
        # We assume AQI is 120 here to force the engine to demonstrate its indoor-safety 
        # capability for your pitch video. You can wire this to your live weather API later.
        aqi = 120 
        is_environment_hazardous = aqi > 70 if user_profile in ['asthma', 'respiratory', 'heart disease'] else aqi > 150

        if is_environment_hazardous:
            safety_context = f"High-risk environment (AQI {aqi}). Forcing indoor, filtered-air venues only."
        else:
            safety_context = f"Safe environment (AQI {aqi}). Outdoor activities are permitted."

        # ---------------------------------------------------------
        # LAYER 2: THE STRICT AI PROMPT
        # ---------------------------------------------------------
        strict_prompt = f"""
        You are an expert travel planner and safety analyst API for SafeNav. 
        Create a {duration_days}-day itinerary to {destination} starting on {start_date}. Origin City: {origin}.
        
        USER INTELLIGENCE PROFILE:
        - Health Condition: {user_profile}
        - Companions: {companions}
        - Budget: {budget}
        - Trip Style: {trip_style}
        - Transport: {transport}
        - Dietary: {food}
        
        ENVIRONMENTAL STATUS: {safety_context}
        
        STRICT RULES:
        1. If it is high-risk, ONLY suggest indoor locations like museums, art galleries, or shopping malls with good HVAC.
        2. Provide a realistic cost breakdown in INR.
        3. Provide a Risk/Safety score for EACH day ('Low', 'Moderate', 'High').
        
        You MUST return ONLY a valid JSON object. Do not use markdown blocks like ```json.
        Use this EXACT structure:
        {{
            "trip_overview": {{
                "destination": "{destination}",
                "why_this_plan": "Short explanation based on health profile and weather.",
                "cost_breakdown": {{
                    "stay": 4000, "food": 1500, "activities": 1000, "transport": 500, "total": 7000
                }},
                "transit_logistics": {{
                    "has_transit": true,
                    "route_advice": "Flight/Train advice",
                    "departure_recommendation": "Leave on date/time",
                    "estimated_transit_cost": 2000
                }}
            }},
            "itinerary": [
                {{
                    "day": 1,
                    "theme": "Theme Name",
                    "risk_level": "Low",
                    "risk_reason": "Reasoning here",
                    "activities": [
                        {{
                            "time": "10:00 AM",
                            "place": "Specific Place Name",
                            "type": "activity", 
                            "estimated_cost_inr": 500
                        }}
                    ]
                }}
            ]
        }}
        """

        # ---------------------------------------------------------
        # LAYER 3: THE LIVE AI ENGINE
        # ---------------------------------------------------------
        result = generate_itinerary_ai(strict_prompt)
        
        if not result:
             return jsonify({"error": "AI Engine failed to generate an itinerary."}), 500
             
        # Clean the output in case the AI added markdown backticks
        if result.startswith("```json"):
            result = result.replace("```json", "").replace("```", "").strip()
        elif result.startswith("```"):
            result = result.replace("```", "").strip()

        return jsonify({"result": result})

    except Exception as e:
        logging.error(f"🚨 Planner Route Crash: {str(e)}")
        return jsonify({"error": str(e)}), 500