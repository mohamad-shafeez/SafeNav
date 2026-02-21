def calculate_risk(distance_km, speed):
    reasons = []

    if speed > 80:
        reasons.append("High average speed increases accident risk")

    if distance_km > 150:
        reasons.append("Long distance travel increases fatigue risk")

    if speed > 80 or distance_km > 150:
        level = "HIGH"
        details = "Route involves high speed or long travel distance"
    elif speed > 50 or distance_km > 80:
        level = "MEDIUM"
        details = "Moderate speed or distance detected"
    else:
        level = "LOW"
        details = "Route appears safe under normal conditions"

    return {
        "level": level,
        "details": details,
        "reasons": reasons if reasons else ["Normal driving conditions"]
    }
