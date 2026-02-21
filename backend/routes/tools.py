from flask import Blueprint, request, jsonify
import google.generativeai as genai
import PIL.Image
import io
import os
import PyPDF2
from services.image_service import get_destination_image

tools_bp = Blueprint("tools", __name__)

# Configure Google Gemini
GENAI_API_KEY = os.environ.get("GOOGLE_API_KEY")

if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

# Use the model that we KNOW works for you
MODEL_NAME = 'gemini-flash-latest'

# ==========================================
# 1. SMART CHAT
# ==========================================
@tools_bp.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.json
        user_message = data.get("message")

        if not user_message:
            return jsonify({"error": "Message is required"}), 400

        system_prompt = "You are TravelMate, a helpful and witty AI travel assistant. Keep answers concise."
        full_prompt = f"{system_prompt}\n\nUser: {user_message}"

        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(full_prompt)

        return jsonify({"success": True, "reply": response.text})

    except Exception as e:
        print(f"Chat Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# 2. TRANSLATOR
# ==========================================
@tools_bp.route("/translate", methods=["POST"])
def translate():
    try:
        data = request.json
        text = data.get("text")
        target_lang = data.get("targetLang")

        if not text:
            return jsonify({"error": "Text is required"}), 400

        prompt = f"""
        Translate the following text into language code '{target_lang}'.
        Only return the translated text, nothing else.
        Text: "{text}"
        """

        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)

        return jsonify({"success": True, "translation": response.text.strip()})

    except Exception as e:
        print(f"Translate Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# 3. IMAGE ANALYSIS (OCR)
# ==========================================
@tools_bp.route("/analyze-image", methods=["POST"])
def analyze_image():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400

        file = request.files['image']
        target_lang = request.form.get('targetLang', 'en')
        
        # Open Image
        image_bytes = file.read()
        image = PIL.Image.open(io.BytesIO(image_bytes))

        prompt = f"""
        Extract all text from this image.
        Then translate it into language code '{target_lang}'.
        Return ONLY the translated text.
        """

        # Try to use the same model (Flash supports images usually)
        # If this fails, we might need 'gemini-pro-vision', but let's try Flash first.
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content([prompt, image])

        return jsonify({"success": True, "result": response.text})

    except Exception as e:
        print(f"Image Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# 4. PLANNER (Updated for clean HTML)
# ==========================================
@tools_bp.route("/generate-itinerary", methods=["POST"])
def generate_itinerary():
    try:
        data = request.json
        destination = data.get("destination")
        days = data.get("days")
        budget = data.get("budget")
        vibe = data.get("vibe")
        food_pref = data.get("foodPref")

        # Stronger prompt to force Gemini to act like a real API
        prompt = f"""
        Act as an expert travel planner. Plan a highly detailed {days}-day trip to {destination}.
        Budget: {budget}, Vibe: {vibe}, Food: {food_pref}.
        
        CRITICAL INSTRUCTIONS:
        - Provide the output ONLY in raw, clean HTML.
        - Do NOT wrap the response in ```html markdown blocks.
        - Do NOT include <html>, <head>, or <body> tags.
        - Use <h3> tags for Day headers (e.g., <h3>Day 1: Arrival</h3>).
        - Use <ul> and <li> for activities.
        - Include specific hotel and restaurant names with estimated INR prices.
        """

        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        
        # CRITICAL FIX: Clean up markdown backticks if Gemini accidentally adds them anyway
        clean_html = response.text.replace('```html', '').replace('```', '').strip()
        
        return jsonify({"success": True, "itinerary": clean_html})

    except Exception as e:
        print(f"Planner Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    # ==========================================
# 5. DOCUMENT TRANSLATOR (MISSING PART)
# ==========================================
@tools_bp.route("/translate-doc", methods=["POST"])
def translate_document():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        target_lang = request.form.get('targetLang', 'en')
        
        text_content = ""

        # Handle PDF files
        if file.filename.endswith('.pdf'):
            try:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text_content += extracted + "\n"
            except Exception as e:
                return jsonify({"error": "Could not read PDF file"}), 400
        
        # Handle Text files
        elif file.filename.endswith('.txt'):
            text_content = file.read().decode('utf-8')
        
        else:
            return jsonify({"error": "Only PDF and TXT files are supported"}), 400

        if not text_content.strip():
             return jsonify({"error": "The document appears to be empty or unreadable."}), 400

        # Limit text length to avoid timeouts (approx 10k words)
        text_content = text_content[:30000] 

        prompt = f"""
        Translate the following document text into language code '{target_lang}'.
        Maintain the original structure/paragraphs as much as possible.
        
        Document Text:
        {text_content}
        """

        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)

        return jsonify({"success": True, "translation": response.text})

    except Exception as e:
        print(f"Doc Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@tools_bp.route("/test")
def test_tools():
    return {"tools": "ok"}

# ==========================================
# 🆕 6. SECURE IMAGE FETCHING (UNSPLASH)
# ==========================================
@tools_bp.route("/get-image", methods=["GET"])
def fetch_image():
    """
    Securely fetches a travel image from Unsplash via our service.
    Usage: /api/get-image?query=Paris
    """
    query = request.args.get('query', 'travel destination')
    try:
        # This calls the service we created in services/image_service.py
        image_url = get_destination_image(query)
        return jsonify({"url": image_url})
    except Exception as e:
        print(f"Image Route Error: {e}")
        return jsonify({"url": "https://images.unsplash.com/photo-1488646953014-85cb44e25828"}), 200