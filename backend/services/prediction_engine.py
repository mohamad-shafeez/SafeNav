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

def calculate_risk(lat, lng, time="day", travel_mode="walking", user_profile="standard", duration_mins=30):
    score = 0 
    reasons = []
    threats = set() 
    aqi_value = 0
    temp = 0
    real_feel = 0
    weather_main = "Clear"
    
    # Normalize profile for consistent matching
    profile = user_profile.lower().strip()

    # 👉 STEP 0: DURATION MATH
    # We use a multiplier: 30m = 1x, 60m = 1.5x, 120m+ = 2x
    # This represents "Cumulative Exposure Strain"
    duration_multiplier = min(2.0, max(1.0, duration_mins / 30))

    # --- 📡 STEP 1: WEATHER DATA ---
    try:
        w_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={WEATHER_KEY}&units=metric"
        w_res = requests.get(w_url, timeout=5).json()
        
        if w_res.get("cod") == 200:
            main_data = w_res.get("main", {})
            temp = main_data.get("temp", 0)
            humidity = main_data.get("humidity", 0)
            weather_main = w_res["weather"][0]["main"]
            real_feel = temp + (0.55 * (humidity / 100) * (temp - 14.5))
            reasons.append(f"📊 LIVE: {temp}°C (Feels {round(real_feel, 1)}°C), {weather_main}")

            # Adaptive Heat Thresholds
            heat_limit = 31 if profile in ["heart disease", "cardiovascular", "elderly"] else 38
            
            if real_feel > heat_limit:
                # Penalty scales with duration!
                score += (50 * duration_multiplier)
                threats.add("extreme_heat")
                reasons.append(f"🚨 PROFILE ALERT: Prolonged cardiac/heat strain for {profile}")
            elif real_feel > 28:
                score += 15
                reasons.append("⚠️ MUGGY: High humidity discomfort")

    except Exception as e:
        logging.error(f"Weather API Error: {e}")
        reasons.append("⚠️ Satellite weather data unavailable.")

    # --- 🏭 STEP 2: AIR QUALITY DATA ---
    try:
        a_url = f"https://api.waqi.info/feed/geo:{lat};{lng}/?token={AQI_TOKEN}"
        a_res = requests.get(a_url, timeout=5).json()
        
        if a_res.get("status") == "ok":
            aqi_value = a_res['data']['aqi']
            aqi_limit = 55 if profile in ["heart disease", "respiratory", "asthma"] else 100
            
            if aqi_value > 300:
                score += 70 
                reasons.append(f"🚨 AIR EMERGENCY: AQI {aqi_value}")
            elif aqi_value > aqi_limit:
                # AQI risk also scales with how long you breathe it in!
                score += (40 * duration_multiplier) 
                reasons.append(f"😷 HEALTH ALERT: {duration_mins}m exposure to AQI {aqi_value} is risky for {profile}")
            elif aqi_value > 50:
                reasons.append(f"🟡 Moderate Air (AQI {aqi_value})")
                
    except Exception as e:
        logging.error(f"AQI API Error: {e}")
        reasons.append("⚠️ Air quality monitoring offline.")

    # --- 🏃 STEP 3: BEHAVIORAL & RISK SUMMARY ---
    if time == "night": score += 10
    if travel_mode == "walking" and (temp > 30 or aqi_value > 70):
        # Physical exertion + conditions + duration = Heart Risk
        exertion_penalty = 15 * duration_multiplier
        score += exertion_penalty
        reasons.append(f"🫀 Strain: {duration_mins}m of physical exertion increases heart risk.")

    risk = "LOW RISK"
    if score >= 65: risk = "HIGH RISK"
    elif score >= 25: risk = "MEDIUM RISK"

    # --- 🤖 STEP 4: AI GUIDANCE ---
    advice = "Conditions are clear. Safe to travel." 
    if ai_model:
        try:
            # We explicitly tell the AI the duration so it gives better advice!
            prompt = f"""
            Act as a protective travel assistant. User Profile: {profile}.
            Context: {temp}C, AQI: {aqi_value}, Mode: {travel_mode}, Duration: {duration_mins} mins, Risk: {risk}.
            Task: 1-sentence personalized safety advice for this specific profile and duration. 
            No markdown. Speak directly to the user.
            """
            response = ai_model.generate_content(prompt)
            advice = response.text.strip()
        except Exception as ai_e:
            logging.error(f"Gemini Error: {ai_e}")
            if risk == "HIGH RISK": advice = "Extreme conditions. Please limit outdoor exposure."

    return {
        "risk_level": risk,
        "score": round(score, 1),
        "factors": reasons,
        "advice": advice,
        "aqi": aqi_value,
        "temp": temp,
        "real_feel": round(real_feel, 1),
        "exposure_mins": duration_mins
    }