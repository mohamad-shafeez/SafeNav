import os
import time
import logging
import random
from google import genai
from dotenv import load_dotenv 

# Load your .env file
load_dotenv() 

# Setup Logging
logging.basicConfig(level=logging.INFO)

# --- THE 2-KEY LOAD BALANCER ---
# Grab the two specific keys you put in your .env file
key1 = os.environ.get("GEMINI_API_KEY")
key2 = os.environ.get("PLANNER_API_KEY")

# Create a list of the keys that actually exist
API_KEYS = [k for k in (key1, key2) if k]

def generate_itinerary_ai(prompt_text, max_retries=3):
    """Generates AI itinerary with automatic load-balancing and legal retries."""
    
    if not API_KEYS:
        logging.error("🚨 CRITICAL: No API Keys found in .env file!")
        return None

    # Loop to try multiple times if we hit a limit
    for attempt in range(max_retries):
        
        # 👉 THE MAGIC: Pick a random key for EVERY attempt. 
        # If Key 1 hits a quota, Attempt 2 will likely pick Key 2 and succeed instantly!
        selected_key = random.choice(API_KEYS)
        
        try:
            # Initialize the modern 2026 client with the selected key
            client = genai.Client(api_key=selected_key)

            # Modern API call forcing JSON output
            response = client.models.generate_content(
                model='gemini-2.5-flash', # Upgraded to the faster model
                contents=prompt_text,
                config={"response_mime_type": "application/json"}
            )
            
            return response.text
            
        except Exception as e:
            error_msg = str(e)
            
            # Check if the error is a Quota/429 error
            if "429" in error_msg or "Quota" in error_msg:
                wait_time = (attempt + 1) * 15  # Wait 15s, then 30s
                logging.warning(f"⚠️ Quota hit on key ending in ...{selected_key[-4:]}! Waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
                time.sleep(wait_time)
            else:
                # If it's a different error, stop immediately
                logging.error(f"🚨 AI Generation Error: {error_msg}")
                return None
                
    logging.error("🚨 Max retries reached across all keys. Google AI is currently overwhelmed.")
    return None