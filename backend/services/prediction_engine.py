import os
import requests
import logging
import google.generativeai as genai

# Setup Logging for production tracking
logging.basicConfig(level=logging.INFO)

# --- CONFIGURATION & INITIALIZATION ---
# 👉 FIX: Check for GOOGLE_API_KEY or GEMINI_API_KEY
GENAI_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
WEATHER_KEY = os.environ.get("OPENWEATHER_API_KEY")
AQI_TOKEN = os.environ.get("AQI_TOKEN", "demo")

if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
    # Pro Tip: Initialize the model ONCE at the top level to save time per request
    ai_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    logging.error("🚨 CRITICAL: No Gemini API Key found in prediction engine!")
    ai_model = None

def calculate_risk(lat, lng, time="day", travel_mode="walking", user_profile="standard"):
    score = 0 
    reasons = []
    threats = set() 
    aqi_value = 0
    temp = 0
    real_feel = 0
    weather_main = "Clear"
    
    # Normalize profile for consistent matching
    profile = user_profile.lower().strip()

    # --- 📡 STEP 1: WEATHER DATA (Isolated) ---
    try:
        w_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={WEATHER_KEY}&units=metric"
        w_res = requests.get(w_url, timeout=5).json()
        
        if w_res.get("cod") == 200:
            main_data = w_res.get("main", {})
            temp = main_data.get("temp", 0)
            humidity = main_data.get("humidity", 0)
            weather_main = w_res["weather"][0]["main"]
            
            # 🌡️ HEAT INDEX: Using the simplified Heat Index formula
            real_feel = temp + (0.55 * (humidity / 100) * (temp - 14.5))
            reasons.append(f"📊 LIVE: {temp}°C (Feels {round(real_feel, 1)}°C), {weather_main}")

            # 🧬 ADAPTIVE HEAT THRESHOLDS
            heat_limit = 31 if profile in ["heart disease", "cardiovascular", "elderly"] else 38
            
            if real_feel > heat_limit:
                score += 50
                threats.add("extreme_heat")
                reasons.append(f"🚨 PROFILE ALERT: High cardiac/heat strain for {profile}")
            elif real_feel > 28:
                score += 15
                reasons.append("⚠️ MUGGY: High humidity discomfort")

    except Exception as e:
        logging.error(f"Weather API Error: {e}")
        reasons.append("⚠️ Satellite weather data unavailable.")

    # --- 🏭 STEP 2: AIR QUALITY DATA (Isolated) ---
    try:
        a_url = f"https://api.waqi.info/feed/geo:{lat};{lng}/?token={AQI_TOKEN}"
        a_res = requests.get(a_url, timeout=5).json()
        
        if a_res.get("status") == "ok":
            aqi_value = a_res['data']['aqi']
            
            # 🧬 ADAPTIVE AQI THRESHOLDS
            aqi_limit = 55 if profile in ["heart disease", "respiratory", "asthma"] else 100
            
            if aqi_value > 300:
                score += 70 
                reasons.append(f"🚨 AIR EMERGENCY: AQI {aqi_value}")
            elif aqi_value > aqi_limit:
                score += 40 
                reasons.append(f"😷 HEALTH ALERT: AQI {aqi_value} is risky for {profile}")
            elif aqi_value > 50:
                reasons.append(f"🟡 Moderate Air (AQI {aqi_value})")
                
    except Exception as e:
        logging.error(f"AQI API Error: {e}")
        reasons.append("⚠️ Air quality monitoring offline.")

    # --- 🏃 STEP 3: BEHAVIORAL & RISK SUMMARY ---
    if time == "night": score += 10
    if travel_mode == "walking" and (temp > 30 or aqi_value > 70):
        score += 15
        reasons.append("🫀 Strain: Physical exertion in these conditions increases heart risk.")

    risk = "LOW RISK"
    if score >= 65: risk = "HIGH RISK"
    elif score >= 25: risk = "MEDIUM RISK"

    # --- 🤖 STEP 4: AI GUIDANCE ---
    advice = "Conditions are clear. Safe to travel." # Default fallback
    if ai_model:
        try:
            prompt = f"""
            Act as a protective travel assistant. User Profile: {profile}.
            Context: {temp}C (feels like {real_feel}C), AQI: {aqi_value}, Mode: {travel_mode}, Risk: {risk}.
            Task: 1-sentence personalized safety advice for this specific profile. 
            No markdown. Speak directly to the user.
            """
            response = ai_model.generate_content(prompt)
            advice = response.text.strip()
        except Exception as ai_e:
            logging.error(f"Gemini Error: {ai_e}")
            # Dynamic fallback if AI fails
            if risk == "HIGH RISK": advice = "Extreme conditions. Please limit outdoor exposure."

    return {
        "risk_level": risk,
        "score": score,
        "factors": reasons,
        "advice": advice,
        "aqi": aqi_value,
        "temp": temp,
        "real_feel": round(real_feel, 1)
    }