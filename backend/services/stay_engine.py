import os
import requests

def get_weather_risk(lat, lng):
    """Fetches real-time weather and calculates a risk penalty."""
    API_KEY = os.environ.get("OPENWEATHER_API_KEY")
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={API_KEY}"
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            weather_main = data['weather'][0]['main'].lower()
            
            # Logic: If it is raining or storming, add to the risk score
            if "thunderstorm" in weather_main:
                return 40, "Extreme Caution: Thunderstorm and flood risk detected."
            if "rain" in weather_main or "drizzle" in weather_main:
                return 20, "Moderate Risk: Heavy rain may cause road blockages."
            return 0, "Weather is clear."
        return 0, "Weather data unavailable."
    except Exception:
        return 0, "Connection to weather service failed."

def calculate_stay_risk(lat, lng):
    """Combines regional heuristics and weather to create a final safety score."""
    lat = float(lat)
    lng = float(lng)
    
    # Start with your base score
    score = 30
    notes = []

    # 1. Weather Analysis (Next Level Feature)
    weather_penalty, weather_note = get_weather_risk(lat, lng)
    score += weather_penalty
    if weather_penalty > 0:
        notes.append(weather_note)

    # 2. Your Regional heuristic (Example: South of 13° Lat)
    if lat < 13:
        score += 20
        notes.append("Region prone to seasonal risks")

    # 3. Static Safety Features
    notes.append("Nearby police station within 500m")
    notes.append("Low street lighting around stay")

    # 4. Classification & Advice Generation
    if score >= 70:
        risk = "high"
        advice = "Consider alternate stay."
        alert_msg = f"Warning. Destination is in a high risk area. {advice} {notes[0] if notes else ''}"
    elif score >= 45:
        risk = "medium"
        advice = "Good to stay, prefer daylight check-in."
        alert_msg = f"Caution. This area has moderate risk. {advice}"
    else:
        risk = "low"
        advice = "Safe to stay."
        alert_msg = f"Verified Safe. {advice}"
    
    # Return the dictionary formatted for your JS/Routes
    return {
        "risk_level": risk,
        "score": score,
        "advice": advice,
        "alert": alert_msg,
        "factors": notes
    }