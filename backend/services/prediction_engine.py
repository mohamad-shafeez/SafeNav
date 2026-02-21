import os
import requests
import google.generativeai as genai

# ✅ FIX 1: Use GOOGLE_API_KEY to match your environment
GENAI_API_KEY = os.environ.get("GOOGLE_API_KEY") 
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

# ✅ FIX 2: Use the stable flash model
MODEL_NAME = 'gemini-flash-latest'

def calculate_risk(lat, lng, time="day", travel_mode="cab", user_profile="standard"):
    # 1. SETTINGS & KEYS
    WEATHER_KEY = "2e698fd333a893b698fb23ac8de09b7f"
    AQI_TOKEN = "demo" 
    
    score = 0 
    reasons = []
    threats = set() 
    aqi_value = 0
    forecast_trend = "stable"
    real_feel = 0
    temp = 0

    try:
        # --- 📡 STEP 1: WEATHER DATA ---
        w_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={WEATHER_KEY}&units=metric"
        w_res = requests.get(w_url, timeout=5).json()
        
        if w_res.get("cod") == 200:
            main_data = w_res.get("main", {})
            temp = main_data.get("temp", 0)
            humidity = main_data.get("humidity", 0)
            visibility = w_res.get("visibility", 10000)
            weather_main = w_res["weather"][0]["main"]
            
            # 🌡️ HEAT INDEX / REALFEEL CALCULATION
            real_feel = temp + (0.55 * (humidity / 100) * (temp - 14.5))
            
            reasons.append(f"📊 LIVE: {temp}°C (Feels {round(real_feel, 1)}°C), {weather_main}")

            # 🧬 ADAPTIVE THRESHOLDS (Personalization)
            heat_limit = 38 if user_profile != "elderly" else 32
            
            if real_feel > heat_limit:
                score += 50
                threats.add("extreme_heat")
                reasons.append(f"🚨 PROFILE ALERT: High risk of heatstroke for {user_profile}")
            elif real_feel > 30:
                score += 20
                reasons.append("⚠️ MUGGY: High humidity discomfort")

            if visibility < 1000:
                score += 45
                threats.add("fog")
                reasons.append(f"⚠️ Heavy Fog: Visibility {visibility}m")
            
            if "Rain" in weather_main or "Drizzle" in weather_main:
                score += 40
                threats.add("rain")
                reasons.append("⚠️ Active Precipitation Detected")

            if w_res.get("wind"):
                wind_speed = w_res['wind']['speed']
                if wind_speed > 4.1: forecast_trend = "improving"
                elif wind_speed < 1.5: forecast_trend = "worsening"

        # --- 🏭 STEP 2: AIR QUALITY DATA ---
        a_url = f"https://api.waqi.info/feed/geo:{lat};{lng}/?token={AQI_TOKEN}"
        a_res = requests.get(a_url, timeout=5).json()
        
        if a_res.get("status") == "ok":
            aqi_value = a_res['data']['aqi']
            
            # 🧬 ADAPTIVE AQI (Personalization)
            aqi_limit = 150 if user_profile != "respiratory" else 70
            
            if aqi_value > 300:
                score += 60 
                reasons.append(f"🚨 AIR EMERGENCY: AQI {aqi_value}")
            elif aqi_value > aqi_limit:
                score += 35 
                # ✅ FIX 3: Make the wording better for the UI
                reasons.append(f"😷 TOXIC ALERT: AQI {aqi_value} is dangerous for {user_profile} travelers")
            elif aqi_value > 50:
                reasons.append(f"🟡 Moderate Air (AQI {aqi_value})")

    except Exception as e:
        print(f"Engine Error: {e}")
        return {
            "risk_level": "ERROR", 
            "score": 0, 
            "factors": [f"❌ Sync Error: {str(e)}"], 
            "advice": "Unable to connect to satellite data.",
            "aqi": 0,
            "trend": "stable"
        }

    # --- 🏃 STEP 3: BEHAVIORAL FACTORS ---
    if time == "night": score += 10
    if travel_mode == "walking": score += 5

   # --- 🧠 STEP 4: FINAL RISK & AI ADVICE GENERATION ---
    risk = "LOW RISK"
    if score >= 65: risk = "HIGH RISK"
    elif score >= 25: risk = "MEDIUM RISK"

    advice = "" # Start empty
    
    if GENAI_API_KEY:
        try:
            model = genai.GenerativeModel(MODEL_NAME)
            prompt = f"""
            Act as a highly protective travel safety AI. Write a concise, 1-to-2 sentence safety advisory for a tourist.
            
            Context:
            - Risk Level: {risk}
            - Weather: {temp}°C, feels like {round(real_feel, 1)}°C.
            - Air Quality (AQI): {aqi_value}
            - Travel Mode: {travel_mode}
            - Time of Day: {time}
            - User's Health Profile: {user_profile}
            
            CRITICAL: Do not use markdown. Speak directly to the user. Make it highly personalized to their specific health profile and travel mode.
            """
            ai_response = model.generate_content(prompt)
            if ai_response and ai_response.text:
                advice = ai_response.text.strip()
        except Exception as ai_error:
            # THIS WILL TELL US EXACTLY WHY GEMINI IS FAILING
            print(f"\n🚨 GEMINI CRASHED: {ai_error}\n")

    # 🛡️ BULLETPROOF FALLBACK LOGIC (If Gemini is slow or crashes)
    if not advice:
        if risk == "HIGH RISK":
            if "extreme_heat" in threats:
                advice = f"Heat Alert: Feels like {round(real_feel, 1)}°C. Avoid sun and stay hydrated."
            elif aqi_value > 70 and user_profile == "respiratory":
                advice = f"Health Alert: Air is toxic for your profile. Stay indoors or use an N95 mask."
            elif "fog" in threats:
                advice = "Danger: Extreme Fog. Visibility is dangerously low."
            else:
                advice = "High Risk detected. Please exercise extreme caution."
                
        elif risk == "MEDIUM RISK":
            if aqi_value > 50:
                advice = f"Moderate Risk: AQI is {aqi_value}. Sensitive individuals should wear a mask."
            else:
                advice = "Moderate Risk: Please stay alert and monitor weather conditions."
                
        else:
            advice = "Conditions are clear. Safe to travel."

    return {
        "risk_level": risk,
        "score": score,
        "factors": reasons,
        "advice": advice,
        "aqi": aqi_value,
        "trend": forecast_trend
    }