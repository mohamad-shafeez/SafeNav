import os
import logging
import google.generativeai as genai
from dotenv import load_dotenv 

# Load your .env file
load_dotenv() 

# Setup Logging
logging.basicConfig(level=logging.INFO)

# --- API KEYS ---
GENAI_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

# --- INITIALIZE AI ---
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
    ai_model = genai.GenerativeModel('gemini-2.0-flash')
else:
    logging.error("🚨 CRITICAL: No Gemini API Key found in planner engine!")
    ai_model = None

def generate_itinerary_ai(prompt_text):
    try:
        if not ai_model:
            raise ValueError("API Key is missing. Cannot call Gemini.")

        # Force Gemini to return RAW JSON
        response = ai_model.generate_content(
            prompt_text,
            generation_config={"response_mime_type": "application/json"}
        )
        
        return response.text
        
    except Exception as e:
        logging.error(f"🚨 AI Generation Error: {str(e)}")
        return None