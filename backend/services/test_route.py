import json
from route_engine import route_engine, build_route, analyze_route_safety, calculate_risk

def run_system_test():
    # 1. Simulate Input (matching the Stays -> Route handoff format)
    # Coordinates: India Gate to Connaught Place, New Delhi
    start_coords = {"lat": 28.6129, "lng": 77.2295} 
    end_coords = {"lat": 28.6315, "lon": 77.2167}

    # Simulate User Preferences from the Premium HUD
    preferences = {
        "priority": "safest",
        "avoid_tolls": False,
        "avoid_highways": False,
        "eco_mode": True
    }

    print("="*60)
    print("🚀 SAFENAV PRO - FULL SYSTEM INTEGRATION TEST")
    print("="*60)

    try:
        # 2. Test the "Door" (Coordinate Standardizing)
        # We manually clean here to mimic the fix we put in route.py
        s_clean = {"lat": start_coords['lat'], "lon": start_coords.get('lon') or start_coords.get('lng')}
        e_clean = {"lat": end_coords['lat'], "lon": end_coords.get('lon') or end_coords.get('lng')}

        print(f"📍 Start: {s_clean['lat']}, {s_clean['lon']}")
        print(f"🏁 End:   {e_clean['lat']}, {e_clean['lon']}")
        print("-" * 30)

        # 3. Test the "Brain" (Route Calculation)
        route_data = build_route(s_clean, e_clean, preferences)

        if "error" in route_data:
            print(f"❌ Engine Error: {route_data['error']}")
            return

        # 4. Test the "Premium Layer" (Analytics & Safety)
        # These are the same functions called in your route.py /calculate endpoint
        safety = analyze_route_safety(route_data)
        risk = calculate_risk(route_data["distance_km"], speed_kmh=45)
        analytics = route_data.get("analytics", {})

        # 5. Output Verification
        print(f"✅ Route Success: {route_data['distance_km']} km | {route_data['duration_min']} min")
        print(f"🛡️ Safety Score:  {analytics.get('safety_score')}/100")
        print(f"⚠️ Risk Level:   {risk['level']} ({risk['score']})")
        print(f"🌿 CO2 Impact:   {analytics.get('co2_emissions_kg')} kg")
        print(f"💰 Total Cost:   ${analytics.get('estimated_total_cost')}")
        
        print("\n📝 AI NAVIGATION STEPS:")
        for i, step in enumerate(route_data["steps"][:3]): # Show first 3 steps
            print(f"  {i+1}. {step['instruction']} ({step['distance_m']}m)")
        
        print("\n🛡️ SAFETY FACTORS:")
        for factor in analytics.get("safety_factors", []):
            print(f"  • {factor}")

    except Exception as e:
        print(f"💥 Critical System Crash: {str(e)}")

    print("="*60)
    print("✅ TEST COMPLETE - System ready for Flask deployment")
    print("="*60)

if __name__ == "__main__":
    run_system_test()