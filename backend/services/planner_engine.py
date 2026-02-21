import os
import google.generativeai as genai

# Load key from environment variable ONLY
GEMINI_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

def generate_itinerary_ai(prompt_text):
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        # Ensure it returns JSON to keep the frontend happy
        response = model.generate_content(prompt_text)
        return response.text
    except Exception as e:
        print(f"AI Error: {e}")
        return None