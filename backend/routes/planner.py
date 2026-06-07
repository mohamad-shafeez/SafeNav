import os
import time
import logging
import random
import json
import requests
from flask import Blueprint, request, jsonify
from google import genai
from dotenv import load_dotenv
from firebase_admin import firestore
from services.image_service import get_destination_image

def track_api_call(api_name):
    """Silently increments the API usage counter in Firestore"""
    try:
        db = firestore.client()
        db.collection('analytics').document('api_usage').set({
            api_name: firestore.Increment(1)
        }, merge=True)
    except Exception as e:
        print(f"Failed to track API: {e}")

load_dotenv()

logging.basicConfig(level=logging.INFO)

key1 = os.environ.get("GEMINI_API_KEY")
key2 = os.environ.get("PLANNER_API_KEY")

API_KEYS = [k for k in (key1, key2) if k]

planner_bp = Blueprint("planner", __name__)

def generate_itinerary_ai(prompt_text, max_retries=3):
    if not API_KEYS:
        logging.error("❌ No API Keys configured.")
        return None

    for attempt in range(max_retries):
        selected_key = random.choice(API_KEYS)
        
        try:
            # Clean standard initialization (No more v1 hacks)
            client = genai.Client(api_key=selected_key)
            
            # 🚀 THE REAL FIX: gemini-2.5-flash-lite
            # Massive free tier quota, no 404s, fully supported by the new SDK
            response = client.models.generate_content(
                model='gemini-2.5-flash-lite',
                contents=prompt_text,
                config={"response_mime_type": "application/json",
                "max_output_tokens": 8192
                }
            )
            return response.text
            
        except Exception as e:
            error_msg = str(e)
            logging.error(f"⚠️ AI Attempt {attempt + 1} failed: {error_msg}")
            
            # Shield against 429 (Quota) and 503 (Busy)
            if "429" in error_msg or "Quota" in error_msg or "503" in error_msg or "Service Unavailable" in error_msg:
                wait_time = (attempt + 1) * 15 
                logging.info(f"Retrying in {wait_time}s due to server limits...")
                time.sleep(wait_time)
                continue 
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

    # ✅ FIXED INDENTATION HERE
    prompt = f"""
    You are an elite, high-end travel agent for SafeNav. Create an exceptional, realistic {days}-day itinerary to {destination}.
    Origin City: {origin}
    Start Date: {start_date}
    Health Profile: {health_profile}
    Vibe: {trip_vibe}
    Budget: {budget}
    Companions: {companions}
    Transport: {transport}
    Safety Mode: {safety_mode}

    CRITICAL RULES:
    1. The Origin is {origin} and Destination is {destination}. If they are different cities/countries, your 'route_advice' MUST include realistic flight or train recommendations (e.g., "Fly from Mangalore (IXE) to Dubai (DXB)"). 
    2. Do NOT suggest taking a taxi or metro between different countries.
    3. Match the Budget ({budget}) and Vibe ({trip_vibe}) perfectly. If it's Luxury/Adventure, suggest skydiving, private safaris, or high-end experiences, not basic walking tours.
    4. Provide realistic INR costs.

    Return ONLY a valid JSON object matching this exact structure:
    {{
      "trip_overview": {{
        "why_this_plan": "A compelling 2-sentence pitch on why this specific plan fits their vibe.",
        "cost_breakdown": {{ "total": 150000 }},
        "transit_logistics": {{ "route_advice": "Flight/Train from Origin to Destination, PLUS advice on local transit." }}
      }},
      "itinerary": [
        {{
          "day": 1,
          "theme": "Arrival & High-End Exploration",
          "risk_level": "Low",
          "risk_reason": "Safe conditions, luxury transport.",
          "activities": [
            {{
              "place": "Exact Name of Place (e.g., Skydive Dubai)",
              "type": "activity", 
              "time": "10:00 AM",
              "estimated_cost_inr": 25000
            }}
          ]
        }}
      ]
    }}
    Ensure 'type' is exactly one of: 'stay', 'food', or 'activity'.
    """

    ai_result = generate_itinerary_ai(prompt)

    if not ai_result:
        return jsonify({"success": False, "error": "AI Engine is currently overloaded or out of quota. Please try again in a minute."}), 503

    try:
        parsed_json = json.loads(ai_result)
        
        # 🚀 NEW: Trigger the tracker because Gemini successfully built an itinerary!
        track_api_call("gemini")
        
        return jsonify({"success": True, "result": parsed_json})
    except Exception as e:
        logging.error(f"❌ JSON Parse Error: {ai_result}")
        return jsonify({"success": False, "error": "Invalid AI output format."}), 500
    
# ==========================================
# 📸 UNSPLASH IMAGE FETCH ROUTE
# ==========================================
@planner_bp.route("/get-image", methods=["GET"])
def get_image():
    query = request.args.get("query")
    unsplash_key = os.environ.get("UNSPLASH_API_KEY")
    
    if not unsplash_key:
        logging.error("❌ UNSPLASH_API_KEY is missing from .env file!")
        return jsonify({"error": "Unsplash key missing"}), 500
        
    try:
        # Ask Unsplash for a high-quality landscape photo
        url = f"https://api.unsplash.com/search/photos?page=1&query={query}&client_id={unsplash_key}&orientation=landscape"
        res = requests.get(url)
        data = res.json()
        
        if data and "results" in data and len(data["results"]) > 0:
            # Grab the URL of the first image result
            img_url = data["results"][0]["urls"]["regular"]
            return jsonify({"url": img_url})
        else:
            return jsonify({"error": "No image found"}), 404
            
    except Exception as e:
        logging.error(f"📸 Unsplash Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    