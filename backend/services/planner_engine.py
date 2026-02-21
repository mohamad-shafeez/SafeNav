import os
import logging
import google.generativeai as genai

# 👉 FIX 1: Check both variable names just to be safe
GEMINI_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
else:
    logging.error("🚨 CRITICAL: No Gemini API Key found in environment variables!")

def generate_itinerary_ai(prompt_text):
    try:
        if not GEMINI_KEY:
            raise ValueError("API Key is missing. Cannot call Gemini.")

        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # 👉 FIX 2: Force Gemini to return RAW JSON without markdown backticks!
        response = model.generate_content(
            prompt_text,
            generation_config={"response_mime_type": "application/json"}
        )
        
        return response.text
        
    except Exception as e:
        logging.error(f"🚨 AI Generation Error: {str(e)}")
        return None