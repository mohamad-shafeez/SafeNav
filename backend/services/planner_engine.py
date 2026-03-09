import os
import time
import logging
import random
import json
from flask import Blueprint, request, jsonify
from google import genai
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)

key1 = os.environ.get("GEMINI_API_KEY")
key2 = os.environ.get("PLANNER_API_KEY")

API_KEYS = [k for k in (key1, key2) if k]

planner_bp = Blueprint("planner", __name__)

def generate_itinerary_ai(prompt_text, max_retries=3):
    if not API_KEYS:
        return None

    for attempt in range(max_retries):
        selected_key = random.choice(API_KEYS)
        
        try:
            client = genai.Client(api_key=selected_key)
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt_text,
                config={"response_mime_type": "application/json"}
            )
            return response.text
            
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "Quota" in error_msg:
                wait_time = (attempt + 1) * 15
                time.sleep(wait_time)
            else:
                return None
                
    return None

@planner_bp.route("/generate", methods=["POST"])
def generate_trip():
    data = request.json
    
    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400

    destination = data.get("destination")
    days = data.get("days")
    origin = data.get("origin", "Not specified")
    start_date = data.get("start_date", "Unknown")
    health_profile = data.get("health_profile", "Standard")
    trip_vibe = data.get("trip_vibe", "Adventure")
    budget = data.get("budget", "Moderate")
    companions = data.get("companions", "Solo")
    transport = data.get("transport", "Public Transit")
    safety_mode = data.get("safety_mode", "Normal")

    prompt = f"""
    You are the SafeNav AI Trip Planner. Create a safe, optimized {days}-day itinerary for {destination}.
    Origin: {origin}
    Start Date: {start_date}
    Health Profile: {health_profile}
    Vibe: {trip_vibe}
    Budget: {budget}
    Companions: {companions}
    Transport: {transport}
    Safety Mode: {safety_mode}

    Return ONLY a valid JSON object matching this exact structure:
    {{
      "trip_overview": {{
        "why_this_plan": "A 2-sentence explanation of why this fits their vibe and health profile.",
        "cost_breakdown": {{ "total": 15000 }},
        "transit_logistics": {{ "route_advice": "Brief advice on local transit." }}
      }},
      "itinerary": [
        {{
          "day": 1,
          "theme": "Arrival & Exploration",
          "risk_level": "Low",
          "risk_reason": "Clear weather, low AQI.",
          "activities": [
            {{
              "place": "Exact Name of Place",
              "type": "stay", 
              "time": "10:00 AM",
              "estimated_cost_inr": 2000
            }}
          ]
        }}
      ]
    }}
    Ensure 'type' is exactly one of: 'stay', 'food', or 'activity'.
    """

    ai_result = generate_itinerary_ai(prompt)

    if not ai_result:
        return jsonify({"success": False, "error": "AI generation failed."}), 500

    try:
        parsed_json = json.loads(ai_result)
        return jsonify({"success": True, "result": parsed_json})
    except Exception as e:
        return jsonify({"success": False, "error": "Invalid AI output format."}), 500