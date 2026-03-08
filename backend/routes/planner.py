import logging
import json
from flask import Blueprint, request, jsonify

# Import the modernized AI engine you just updated
from services.planner_engine import generate_itinerary_ai

planner_bp = Blueprint('planner', __name__)

@planner_bp.route('/generate', methods=['POST'])
def generate():
    try:
        # 1. Safely parse incoming payload
        data = request.json
        if not data:
            return jsonify({"error": "No data provided to the API."}), 400
            
        # 2. Extract Frontend Variables (Mapped perfectly to your new Phase 1 JS Architecture)
        destination = data.get('destination', 'Unknown')
        origin = data.get('origin', 'Not specified')
        start_date = data.get('start_date', 'Soon')
        days = data.get('days', 3) 
        
        # Deep Risk Profile Data Extraction
        health_profile = data.get('health_profile', 'Standard')
        trip_vibe = data.get('trip_vibe', 'Adventure')
        budget = data.get('budget', 'Moderate')
        companions = data.get('companions', 'Solo')
        transport = data.get('transport', 'Public Transit')
        food = data.get('food', 'Any')
        safety_mode = data.get('safety_mode', 'Normal')

        # ---------------------------------------------------------
        # 🛡️ LAYER 1: ENVIRONMENTAL SAFETY INTELLIGENCE
        # ---------------------------------------------------------
        # (Demo logic: Simulating an AQI check for your pitch)
        aqi = 120 
        is_environment_hazardous = aqi > 70 if health_profile.lower() in ['asthma', 'respiratory', 'heart disease'] else aqi > 150

        if is_environment_hazardous:
            safety_context = f"High-risk environment (AQI {aqi}). Forcing indoor, filtered-air venues only."
        else:
            safety_context = f"Safe environment (AQI {aqi}). Outdoor activities are permitted."

        # ---------------------------------------------------------
        # 🧠 LAYER 2: THE MASTER PROMPT (Built securely on the server)
        # ---------------------------------------------------------
        strict_prompt = f"""
        You are a high-end, expert travel planner and safety analyst API for SafeNav. 
        Create a {days}-day itinerary to {destination} starting on {start_date}. Origin City: {origin}.
        
        USER INTELLIGENCE PROFILE:
        - Health Conditions: {health_profile} (Crucial: Tailor physical strain and weather recommendations to this)
        - Companions: {companions}
        - Budget Level: {budget}
        - Trip Style: {trip_vibe}
        - Transport: {transport}
        - Dietary: {food}
        - Safety Alert Level: {safety_mode}
        
        ENVIRONMENTAL STATUS: {safety_context}
        
        STRICT RULES:
        1. If it is high-risk, ONLY suggest indoor locations like museums, art galleries, or shopping malls with good HVAC.
        2. Calculate realistic transit logistics from the Origin to the Destination. If Origin is "Not specified", leave transit empty but provide the rest.
        3. Provide a realistic cost breakdown in INR.
        4. Provide a Risk/Safety score for EACH day ('Low', 'Moderate', 'High') factoring in their Health Profile.
        
        You MUST return ONLY a valid JSON object. Do not use markdown blocks like ```json.
        Use this EXACT structure:
        {{
            "trip_overview": {{
                "destination": "{destination}",
                "why_this_plan": "Short explanation based on health profile, safety mode, and weather.",
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
                    "risk_reason": "Reasoning here based on health profile",
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
        # 🚀 LAYER 3: EXECUTE AI ENGINE
        # ---------------------------------------------------------
        raw_result = generate_itinerary_ai(strict_prompt)
        
        if not raw_result:
             return jsonify({"error": "AI Engine failed to generate an itinerary."}), 500
             
        # ---------------------------------------------------------
        # 🧹 LAYER 4: DATA SANITIZATION (The "Anti-Crash" logic)
        # ---------------------------------------------------------
        cleaned_result = raw_result.strip()
        if cleaned_result.startswith("```json"):
            cleaned_result = cleaned_result[7:]
        if cleaned_result.startswith("```"):
            cleaned_result = cleaned_result[3:]
        if cleaned_result.endswith("```"):
            cleaned_result = cleaned_result[:-3]
            
        cleaned_result = cleaned_result.strip()

        # Final verification: Ensure it's actually valid JSON before sending it to the frontend
        try:
            json.loads(cleaned_result)
        except json.JSONDecodeError:
            logging.error(f"🚨 Invalid JSON returned by AI: {cleaned_result}")
            return jsonify({"error": "AI returned malformed data."}), 500

        # Return the clean, validated JSON string to the frontend
        return jsonify({"result": cleaned_result})

    except Exception as e:
        logging.error(f"🚨 Planner Route Crash: {str(e)}")
        return jsonify({"error": str(e)}), 500