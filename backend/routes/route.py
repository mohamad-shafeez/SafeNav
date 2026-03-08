from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import math
from services.route_engine import (
    build_route, 
    route_engine,
    get_multiple_routes,
    analyze_route_safety,
    calculate_environmental_impact,
    get_route_statistics,
    calculate_risk
)
import json
from services.planner_engine import generate_itinerary_ai # Added AI Engine
import logging # Added for error tracking

route_bp = Blueprint("route", __name__)

@route_bp.route("/calculate", methods=["POST"])
def calculate_route():
    """
    Calculate enhanced route with comprehensive analytics
    Handles both 'lon' and 'lng' for 100% accuracy from any frontend source.
    """
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400

    start = data.get("start")
    end = data.get("end")
    preferences = data.get("preferences", {})
    speed = data.get("speed", 40)

    if not start or not end:
        return jsonify({"success": False, "error": "Start and End coordinates required"}), 400

    # ACCURACY FIX: Support both 'lon' (TomTom/OSRM) and 'lng' (Leaflet/JS)
    start_lat = start.get('lat')
    start_lon = start.get('lon') or start.get('lng')
    
    end_lat = end.get('lat')
    end_lon = end.get('lon') or end.get('lng')

    # Validate that we actually have numbers for all 4 points
    if None in [start_lat, start_lon, end_lat, end_lon]:
        return jsonify({
            "success": False, 
            "error": "Coordinates must contain 'lat' and either 'lon' or 'lng'"
        }), 400

    # Standardize for the RouteEngine
    start_clean = {"lat": start_lat, "lon": start_lon}
    end_clean = {"lat": end_lat, "lon": end_lon}

    try:
        # 1. 🛡️ EXTRACT USER WEIGHTS FROM SLIDERS
        aqi_weight = preferences.get('aqi_weight', 2)
        heat_weight = preferences.get('heat_weight', 2)
        hazard_weight = 3 if preferences.get('avoid_hazards', True) else 1
        
        tolerance_map = {"conservative": 1.0, "balanced": 0.7, "aggressive": 0.4}
        risk_multiplier = tolerance_map.get(preferences.get('risk_tolerance', 'balanced').lower(), 0.7)

        # 2. CALCULATE BASE ROUTE
        route_data = build_route(start_clean, end_clean, preferences)
        
        if "error" in route_data:
            return jsonify({"success": False, "error": route_data["error"]}), 400

        # 3. 🔥 THE EXPOSURESCORE FORMULA
        base_risk = calculate_risk(route_data.get("distance_km", 0), speed)
        weighted_factor = (aqi_weight + heat_weight + hazard_weight) / 6 
        exposure_score = (base_risk * weighted_factor) * risk_multiplier
        
        # Inject for frontend UI color coding
        if "analytics" not in route_data: 
            route_data["analytics"] = {}
            
        final_score = round(min(150, exposure_score))
        route_data["analytics"]["safety_score"] = final_score
        route_data["analytics"]["safety_description"] = f"Risk Level: {'High' if final_score > 100 else 'Moderate' if final_score > 50 else 'Low'}"

        # 4. RUN ANALYTICS
        safety_analysis = analyze_route_safety(route_data)
        environmental_impact = calculate_environmental_impact(route_data.get("distance_km", 0))
        statistics = get_route_statistics(route_data, speed)
        weather_info = route_engine.get_weather_along_route(route_data.get("geometry", {}))
        traffic_info = route_engine.get_traffic_conditions(route_data.get("geometry", {}))
        
        # Updated risk dictionary for the JSON response
        risk = {
            "score": final_score, 
            "weighted_factor": weighted_factor,
            "multiplier": risk_multiplier
        }
        
        # 5. GENERATE AI RECOMMENDATIONS (Risk-focused)
        recommendations = generate_route_recommendations(route_data, speed, weather_info, preferences)
        
        # 6. TIME ANALYSIS (Restored!)
        departure_time = data.get("departure_time")
        if not departure_time:
            departure_time = datetime.now()
        elif isinstance(departure_time, str):
            departure_time = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
        
        time_analysis = calculate_time_analysis(route_data.get("duration_min", 0), departure_time)
        
        # 7. RETURN FULL PAYLOAD (Restored!)
        return jsonify({
            "success": True,
            "route": route_data,
            "analysis": {
                "safety": safety_analysis,
                "environmental": environmental_impact,
                "statistics": statistics,
                "risk": risk,
                "weather": weather_info,
                "traffic": traffic_info,
                "time": time_analysis
            },
            "recommendations": recommendations,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "engine": "SafeNav Pro Enhanced",
                "version": "2.0.0",
                "route_hash": route_data.get("route_hash", "")
            }
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Route calculation failed: {str(e)}"
        }), 500
        
        # Calculate estimated arrival time
        departure_time = data.get("departure_time")
        if not departure_time:
            departure_time = datetime.now()
        elif isinstance(departure_time, str):
            departure_time = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
        
        time_analysis = calculate_time_analysis(route_data["duration_min"], departure_time)
        
        return jsonify({
            "success": True,
            "route": route_data,
            "analysis": {
                "safety": safety_analysis,
                "environmental": environmental_impact,
                "statistics": statistics,
                "risk": risk,
                "weather": weather_info,
                "traffic": traffic_info,
                "time": time_analysis
            },
            "recommendations": recommendations,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "engine": "SafeNav Pro Enhanced",
                "version": "2.0.0",
                "route_hash": route_data.get("route_hash", "")
            }
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Route calculation failed: {str(e)}"
        }), 500


@route_bp.route("/multiple-routes", methods=["POST"])
def get_multiple_route_options():
    """
    Get multiple route alternatives with different characteristics
    """
    data = request.json

    start = data.get("start")
    end = data.get("end")
    count = data.get("count", 4)
    preferences = data.get("preferences", {})

    if not start or not end:
        return jsonify({"error": "Start and End coordinates required"}), 400

    try:
        # Get multiple route alternatives
        routes = route_engine.get_multiple_routes(start, end, count)
        
        if not routes:
            return jsonify({"error": "No routes found"}), 404
        
        # Enhance each route with additional analytics
        enhanced_routes = []
        for i, route in enumerate(routes):
            if "error" not in route:
                # Get weather and traffic for each route
                weather_info = route_engine.get_weather_along_route(route.get("geometry", {}))
                traffic_info = route_engine.get_traffic_conditions(route.get("geometry", {}))
                
                enhanced_routes.append({
                    "id": i + 1,
                    "route_data": route,
                    "weather": weather_info,
                    "traffic": traffic_info,
                    "summary": {
                        "distance": f"{route.get('distance_km', 0):.1f} km",
                        "duration": f"{route.get('duration_min', 0):.0f} min",
                        "type": get_route_type_description(i),
                        "complexity": "Simple" if i == 0 else "Moderate" if i == 1 else "Complex"
                    }
                })
        
        # Sort by duration (fastest first)
        enhanced_routes.sort(key=lambda x: x["route_data"].get("duration_min", float('inf')))
        
        # Mark the recommended route
        recommended_index = 0  # Fastest by default
        if preferences.get('priority') == 'eco_friendly':
            # Find most eco-friendly
            recommended_index = min(range(len(enhanced_routes)), 
                                  key=lambda i: enhanced_routes[i]["route_data"].get("analytics", {}).get("co2_emissions_kg", float('inf')))
        elif preferences.get('priority') == 'safest':
            # Find safest
            recommended_index = max(range(len(enhanced_routes)), 
                                  key=lambda i: enhanced_routes[i]["route_data"].get("analytics", {}).get("safety_score", 0))
        
        enhanced_routes[recommended_index]["recommended"] = True
        
        return jsonify({
            "success": True,
            "routes": enhanced_routes,
            "count": len(enhanced_routes),
            "recommended_index": recommended_index,
            "comparison_metrics": {
                "fastest": enhanced_routes[0],
                "shortest": min(enhanced_routes, key=lambda x: x["route_data"].get("distance_km", float('inf'))),
                "safest": max(enhanced_routes, key=lambda x: x["route_data"].get("analytics", {}).get("safety_score", 0))
            }
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Multiple routes calculation failed: {str(e)}"
        }), 500


@route_bp.route("/route-analytics", methods=["POST"])
def get_detailed_analytics():
    """
    Get detailed analytics for a specific route
    """
    data = request.json
    
    route_data = data.get("route")
    
    if not route_data:
        return jsonify({"error": "Route data required"}), 400
    
    try:
        # Comprehensive analysis
        safety_analysis = analyze_route_safety(route_data)
        environmental_impact = calculate_environmental_impact(route_data.get("distance_km", 0))
        
        # Extract analytics from route data
        analytics = route_data.get("analytics", {})
        
        # Calculate cost breakdown in detail
        cost_breakdown = calculate_detailed_cost_breakdown(route_data)
        
        # Time-based analysis
        departure_time = data.get("departure_time")
        if departure_time:
            if isinstance(departure_time, str):
                departure_time = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
        else:
            departure_time = datetime.now()
        
        time_analysis = calculate_time_analysis(
            route_data.get("duration_min", 0), 
            departure_time
        )
        
        # Weather impact analysis
        weather_impact = analyze_weather_impact(route_data)
        
        # Traffic pattern analysis
        traffic_patterns = analyze_traffic_patterns(route_data)
        
        # Fuel efficiency analysis
        fuel_analysis = analyze_fuel_efficiency(route_data)
        
        # Safety improvement suggestions
        safety_improvements = generate_safety_improvements(route_data)
        
        return jsonify({
            "success": True,
            "analytics": {
                "comprehensive": analytics,
                "safety": safety_analysis,
                "environmental": environmental_impact,
                "cost_breakdown": cost_breakdown,
                "time_analysis": time_analysis,
                "weather_impact": weather_impact,
                "traffic_patterns": traffic_patterns,
                "fuel_efficiency": fuel_analysis
            },
            "recommendations": {
                "safety": safety_improvements,
                "efficiency": generate_efficiency_recommendations(route_data),
                "timing": generate_timing_recommendations(time_analysis),
                "weather": generate_weather_recommendations(weather_impact)
            },
            "key_indicators": {
                "overall_score": calculate_overall_route_score(route_data),
                "cost_per_km": calculate_cost_per_km(route_data),
                "time_per_km": calculate_time_per_km(route_data),
                "safety_rating": safety_analysis.get("rating", "Unknown"),
                "eco_rating": calculate_eco_rating(environmental_impact)
            }
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Route analytics failed: {str(e)}"
        }), 500


@route_bp.route("/route-safety", methods=["POST"])
def get_route_safety_details():
    """
    Get detailed safety information for a route
    """
    data = request.json
    
    route_data = data.get("route")
    
    if not route_data:
        return jsonify({"error": "Route data required"}), 400
    
    try:
        # Comprehensive safety analysis
        safety_analysis = analyze_route_safety(route_data)
        analytics = route_data.get("analytics", {})
        
        # Identify potential hazards
        hazards = identify_potential_hazards(route_data)
        
        # Get road condition information
        road_conditions = analyze_road_conditions(route_data)
        
        # Lighting conditions based on time
        departure_time = data.get("departure_time", datetime.now())
        if isinstance(departure_time, str):
            departure_time = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
        
        lighting_conditions = analyze_lighting_conditions(departure_time, route_data)
        
        # Emergency services along route
        emergency_services = identify_emergency_services(route_data)
        
        # Safety equipment recommendations
        safety_equipment = recommend_safety_equipment(route_data)
        
        return jsonify({
            "success": True,
            "safety_info": {
                "overall_score": safety_analysis.get("overall_score", 0),
                "rating": safety_analysis.get("rating", "Unknown"),
                "detailed_scores": {
                    "road_quality": analytics.get("safety_score", 0),
                    "traffic_safety": calculate_traffic_safety_score(route_data),
                    "weather_safety": calculate_weather_safety_score(route_data),
                    "time_safety": calculate_time_safety_score(departure_time)
                }
            },
            "hazards": hazards,
            "conditions": {
                "road": road_conditions,
                "lighting": lighting_conditions,
                "weather": route_data.get("analysis", {}).get("weather", {})
            },
            "emergency_info": {
                "services": emergency_services,
                "hospitals": identify_hospitals_along_route(route_data),
                "police_stations": identify_police_stations(route_data),
                "tow_services": identify_tow_services(route_data)
            },
            "preparations": {
                "equipment": safety_equipment,
                "precautions": generate_safety_precautions(route_data),
                "emergency_plan": generate_emergency_plan(route_data)
            },
            "safety_tips": generate_safety_tips(route_data, departure_time)
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Safety analysis failed: {str(e)}"
        }), 500


@route_bp.route("/route-cost", methods=["POST"])
def calculate_route_cost():
    """
    Calculate detailed cost breakdown for a route
    """
    data = request.json
    
    route_data = data.get("route")
    vehicle_type = data.get("vehicle_type", "standard_car")
    fuel_price = data.get("fuel_price", 1.20)  # USD per liter
    toll_information = data.get("toll_information", {})
    
    if not route_data:
        return jsonify({"error": "Route data required"}), 400
    
    try:
        # Get base cost from analytics
        analytics = route_data.get("analytics", {})
        
        # Calculate detailed costs
        distance = route_data.get("distance_km", 0)
        duration = route_data.get("duration_min", 0)
        
        # Vehicle-specific calculations
        vehicle_factors = {
            "standard_car": {"fuel_rate": 8.0, "depreciation": 0.10},
            "suv": {"fuel_rate": 10.0, "depreciation": 0.12},
            "truck": {"fuel_rate": 12.0, "depreciation": 0.15},
            "electric": {"fuel_rate": 2.5, "depreciation": 0.08},
            "hybrid": {"fuel_rate": 5.0, "depreciation": 0.09}
        }
        
        vehicle = vehicle_factors.get(vehicle_type, vehicle_factors["standard_car"])
        
        # Fuel cost
        fuel_consumption_l = (distance / 100) * vehicle["fuel_rate"]
        fuel_cost = fuel_consumption_l * fuel_price
        
        # Toll cost (use provided or estimate)
        toll_cost = toll_information.get("estimated_cost", 0)
        if toll_cost == 0:
            toll_cost = distance * 0.05  # Default estimate
        
        # Maintenance cost
        maintenance_cost = distance * 0.05
        
        # Depreciation cost
        depreciation_cost = distance * vehicle["depreciation"]
        
        # Time cost (based on average hourly wage)
        hourly_wage = data.get("hourly_wage", 25)  # USD per hour
        time_cost = (duration / 60) * hourly_wage
        
        # Other costs
        parking_cost = data.get("parking_cost", 0)
        other_costs = data.get("other_costs", 0)
        
        # Total cost
        total_cost = sum([
            fuel_cost, toll_cost, maintenance_cost, 
            depreciation_cost, time_cost, parking_cost, other_costs
        ])
        
        cost_breakdown = {
            "fuel": {
                "amount": round(fuel_cost, 2),
                "breakdown": {
                    "consumption_l": round(fuel_consumption_l, 1),
                    "price_per_l": fuel_price,
                    "rate_per_100km": vehicle["fuel_rate"]
                }
            },
            "tolls": {
                "amount": round(toll_cost, 2),
                "details": toll_information
            },
            "maintenance": {
                "amount": round(maintenance_cost, 2),
                "rate_per_km": 0.05
            },
            "depreciation": {
                "amount": round(depreciation_cost, 2),
                "rate_per_km": vehicle["depreciation"]
            },
            "time": {
                "amount": round(time_cost, 2),
                "hourly_rate": hourly_wage,
                "hours": round(duration / 60, 2)
            },
            "parking": {
                "amount": round(parking_cost, 2)
            },
            "other": {
                "amount": round(other_costs, 2)
            }
        }
        
        # Cost per km
        cost_per_km = total_cost / distance if distance > 0 else 0
        
        # Cost comparisons
        alternative_costs = calculate_alternative_costs(distance, duration, vehicle_type)
        
        # Savings opportunities
        savings_opportunities = identify_savings_opportunities(cost_breakdown, route_data)
        
        return jsonify({
            "success": True,
            "cost_analysis": {
                "total_cost": round(total_cost, 2),
                "cost_per_km": round(cost_per_km, 2),
                "cost_per_minute": round(total_cost / duration, 2) if duration > 0 else 0,
                "breakdown": cost_breakdown,
                "currency": "USD"
            },
            "comparisons": {
                "alternative_transport": alternative_costs,
                "average_for_distance": calculate_average_cost_for_distance(distance),
                "potential_savings": savings_opportunities
            },
            "recommendations": {
                "cost_saving": generate_cost_saving_recommendations(cost_breakdown),
                "efficiency": generate_efficiency_recommendations_based_on_cost(cost_breakdown)
            }
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Cost calculation failed: {str(e)}"
        }), 500


@route_bp.route("/route-weather", methods=["POST"])
def get_route_weather():
    """
    Get weather information along the route
    """
    data = request.json
    
    route_data = data.get("route")
    
    if not route_data:
        return jsonify({"error": "Route data required"}), 400
    
    try:
        # Get weather information from route engine
        weather_info = route_engine.get_weather_along_route(route_data.get("geometry", {}))
        
        # Calculate weather impact on route
        impact_analysis = calculate_weather_impact(route_data, weather_info)
        
        # Weather advisories
        advisories = generate_weather_advisories(weather_info, route_data)
        
        # Alternative route suggestions based on weather
        alternatives_for_weather = suggest_weather_alternatives(route_data, weather_info)
        
        # Preparation recommendations
        preparations = generate_weather_preparations(weather_info, route_data)
        
        return jsonify({
            "success": True,
            "weather_info": weather_info,
            "impact_analysis": impact_analysis,
            "advisories": advisories,
            "alternatives": alternatives_for_weather,
            "preparations": preparations,
            "forecast_timeline": generate_weather_timeline(route_data)
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Weather analysis failed: {str(e)}"
        }), 500


@route_bp.route("/route-history", methods=["POST"])
def manage_route_history():
    """
    Manage route history (save, retrieve, clear)
    """
    data = request.json
    action = data.get("action", "get")  # get, save, clear
    
    try:
        if action == "get":
            # Get route history
            history = route_engine.get_route_history()
            return jsonify({
                "success": True,
                "history": history,
                "count": len(history)
            })
        
        elif action == "save":
            # Save route to history
            route_data = data.get("route")
            if not route_data:
                return jsonify({"error": "Route data required for save"}), 400
            
            # The route engine automatically saves routes during calculation
            # This endpoint is for manual saves if needed
            return jsonify({
                "success": True,
                "message": "Route saved to history",
                "route_id": route_data.get("route_hash", "")
            })
        
        elif action == "clear":
            # Clear route history
            route_engine.clear_route_history()
            return jsonify({
                "success": True,
                "message": "Route history cleared"
            })
        
        else:
            return jsonify({"error": "Invalid action"}), 400
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"History operation failed: {str(e)}"
        }), 500


@route_bp.route("/optimize-route", methods=["POST"])
def optimize_route():
    """
    Optimize route based on specific criteria
    """
    data = request.json
    
    route_data = data.get("route")
    optimization_criteria = data.get("criteria", "balanced")
    constraints = data.get("constraints", {})
    
    if not route_data:
        return jsonify({"error": "Route data required"}), 400
    
    try:
        # Apply different optimization strategies
        if optimization_criteria == "fastest":
            optimized = optimize_for_speed(route_data, constraints)
        elif optimization_criteria == "safest":
            optimized = optimize_for_safety(route_data, constraints)
        elif optimization_criteria == "cheapest":
            optimized = optimize_for_cost(route_data, constraints)
        elif optimization_criteria == "eco_friendly":
            optimized = optimize_for_eco_friendliness(route_data, constraints)
        else:  # balanced
            optimized = optimize_balanced(route_data, constraints)
        
        # Calculate improvements
        improvements = calculate_optimization_improvements(route_data, optimized)
        
        return jsonify({
            "success": True,
            "optimized_route": optimized,
            "original_route": route_data,
            "improvements": improvements,
            "optimization_applied": optimization_criteria,
            "constraints_respected": check_constraints(optimized, constraints)
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Route optimization failed: {str(e)}"
        }), 500


@route_bp.route("/real-time-update", methods=["POST"])
def get_real_time_updates():
    """
    Get real-time updates for a route (traffic, weather, incidents)
    """
    data = request.json
    
    route_data = data.get("route")
    position = data.get("position")  # Current position along route
    
    if not route_data:
        return jsonify({"error": "Route data required"}), 400
    
    try:
        # Get updated weather
        weather_update = route_engine.get_weather_along_route(route_data.get("geometry", {}))
        
        # Get updated traffic
        traffic_update = route_engine.get_traffic_conditions(route_data.get("geometry", {}))
        
        # Check for incidents along route
        incidents = check_for_incidents(route_data, position)
        
        # Calculate updated ETA
        original_duration = route_data.get("duration_min", 0)
        updated_duration = calculate_updated_duration(original_duration, traffic_update, weather_update)
        
        # Generate alerts
        alerts = generate_real_time_alerts(route_data, position, traffic_update, weather_update, incidents)
        
        # Suggest alternatives if significant delays
        alternatives = []
        if updated_duration > original_duration * 1.3:  # 30% delay
            alternatives = get_alternative_routes_for_delay(route_data, position)
        
        return jsonify({
            "success": True,
            "updates": {
                "weather": weather_update,
                "traffic": traffic_update,
                "incidents": incidents,
                "alerts": alerts
            },
            "timing": {
                "original_eta_minutes": original_duration,
                "updated_eta_minutes": updated_duration,
                "delay_minutes": max(0, updated_duration - original_duration),
                "delay_percentage": ((updated_duration / original_duration) - 1) * 100 if original_duration > 0 else 0
            },
            "alternatives": alternatives,
            "recommendations": generate_real_time_recommendations(alerts, updated_duration)
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Real-time update failed: {str(e)}"
        }), 500


@route_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "route-planner-enhanced",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "features": [
            "enhanced-route-calculation",
            "multiple-routes",
            "comprehensive-analytics",
            "safety-analysis",
            "cost-calculation",
            "weather-integration",
            "real-time-updates",
            "route-history",
            "optimization"
        ],
        "engine": "SafeNav Pro Enhanced"
    })


# ============================
# HELPER FUNCTIONS
# ============================

def generate_route_recommendations(route_data, speed, weather_info, preferences):
    """
    Generates advice based on the ExposureScore and AI Briefing.
    Traffic is intentionally excluded to focus on health/safety.
    """
    recommendations = []
    score = route_data.get("analytics", {}).get("safety_score", 0)
    
    # 1. Risk-Based Logic
    if score > 100:
        recommendations.append({
            "type": "risk_alert", "priority": "high", 
            "message": "High Environmental Exposure Detected.", 
            "action": "Consider switching to a 'Conservative' route or waiting."
        })
    elif score > 50:
        recommendations.append({
            "type": "risk_warning", "priority": "medium", 
            "message": "Moderate Exposure Risk.", 
            "action": "Keep windows closed and AC on internal recirculation."
        })

    # 2. Weather Logic
    if weather_info.get("condition") in ["rain", "storm", "fog"]:
        recommendations.append({
            "type": "weather", "priority": "high", 
            "message": f"Weather Alert: {weather_info.get('message', 'Poor conditions')}", 
            "action": "Reduce speed and increase following distance."
        })

    # 3. 🔥 THE AI BRAIN
    try:
        briefing = generate_ai_safety_briefing(route_data, weather_info, preferences)
        recommendations.append({
            "type": "ai_insight", "priority": "premium", 
            "message": "SafeNav AI Analyst", 
            "action": briefing
        })
    except Exception as e:
        logging.warning(f"AI Briefing failed: {e}")

    return recommendations

def generate_ai_safety_briefing(route_data, weather, weights):
    """Triggers Gemini API for a human-readable risk summary."""
    score = route_data["analytics"]["safety_score"]
    risk_level = "High" if score > 100 else "Moderate" if score > 50 else "Low"
    
    prompt = f"""
    You are the SafeNav AI Safety Analyst. Analyze this route:
    - Calculated Risk: {score}/150 ({risk_level})
    - Weather Condition: {weather.get('condition', 'Unknown')}
    - User Sensitivities: AQI Weight {weights.get('aqi_weight')}, Heat Weight {weights.get('heat_weight')}.
    
    Generate a concise, 2-sentence safety briefing. Focus purely on environmental hazards and user health. 
    Do not mention traffic or itineraries.
    """
    
    briefing = generate_itinerary_ai(prompt)
    return briefing or "Proceed with caution. Conditions are stable."

def calculate_time_analysis(duration_min, departure_time):
    """Calculate time-based analysis"""
    estimated_arrival = departure_time + timedelta(minutes=duration_min)
    
    # Add buffers based on time of day
    hour_of_day = departure_time.hour
    if 7 <= hour_of_day <= 9 or 16 <= hour_of_day <= 18:  # Rush hours
        time_buffer = duration_min * 0.2
        traffic_condition = "Heavy traffic expected"
    elif 12 <= hour_of_day <= 14:  # Lunch time
        time_buffer = duration_min * 0.1
        traffic_condition = "Moderate traffic expected"
    else:
        time_buffer = duration_min * 0.05
        traffic_condition = "Light traffic expected"
    
    arrival_with_buffer = estimated_arrival + timedelta(minutes=time_buffer)
    
    return {
        "departure_time": departure_time.isoformat(),
        "estimated_arrival": estimated_arrival.isoformat(),
        "arrival_with_buffer": arrival_with_buffer.isoformat(),
        "base_duration_minutes": duration_min,
        "recommended_buffer_minutes": round(time_buffer),
        "total_recommended_duration": round(duration_min + time_buffer),
        "traffic_condition": traffic_condition,
        "time_of_day_analysis": get_time_of_day_analysis(hour_of_day)
    }

def get_time_of_day_analysis(hour):
    """Analyze travel time based on time of day"""
    if 5 <= hour < 9:
        return "Morning commute hours - Expect moderate to heavy traffic"
    elif 9 <= hour < 15:
        return "Midday - Generally lighter traffic"
    elif 15 <= hour < 19:
        return "Evening commute hours - Expect heavy traffic"
    elif 19 <= hour < 22:
        return "Evening - Moderate traffic"
    else:
        return "Night - Light traffic but reduced visibility"

def get_route_type_description(index):
    """Get description for route type based on index"""
    types = [
        "Fastest (Highway Preferred)",
        "Shortest (Distance Optimized)",
        "Balanced (Speed & Safety)",
        "Eco-Friendly (Fuel Efficient)",
        "Scenic (Visual Appeal)"
    ]
    return types[index] if index < len(types) else f"Route Option {index + 1}"

def calculate_detailed_cost_breakdown(route_data):
    """Calculate detailed cost breakdown"""
    analytics = route_data.get("analytics", {})
    cost_breakdown = analytics.get("cost_breakdown", {})
    
    # Add additional details
    detailed = {
        "fuel": {
            "amount": cost_breakdown.get("fuel", 0),
            "percentage": (cost_breakdown.get("fuel", 0) / cost_breakdown.get("total", 1)) * 100 if cost_breakdown.get("total", 0) > 0 else 0
        },
        "tolls": {
            "amount": cost_breakdown.get("tolls", 0),
            "percentage": (cost_breakdown.get("tolls", 0) / cost_breakdown.get("total", 1)) * 100 if cost_breakdown.get("total", 0) > 0 else 0
        },
        "maintenance": {
            "amount": cost_breakdown.get("maintenance", 0),
            "percentage": (cost_breakdown.get("maintenance", 0) / cost_breakdown.get("total", 1)) * 100 if cost_breakdown.get("total", 0) > 0 else 0
        },
        "depreciation": {
            "amount": cost_breakdown.get("depreciation", 0),
            "percentage": (cost_breakdown.get("depreciation", 0) / cost_breakdown.get("total", 1)) * 100 if cost_breakdown.get("total", 0) > 0 else 0
        },
        "total": cost_breakdown.get("total", 0)
    }
    
    return detailed

def analyze_weather_impact(route_data):
    """Analyze weather impact on route"""
    # This would integrate with weather API
    # For now, return simulated data
    return {
        "impact_level": "moderate",
        "visibility_impact": "Good",
        "road_condition_impact": "Normal",
        "speed_reduction_percentage": 10,
        "recommended_actions": ["Maintain safe distance", "Use headlights if needed"]
    }

def analyze_traffic_patterns(route_data):
    """Analyze traffic patterns"""
    steps = route_data.get("steps", [])
    
    # Count different types of roads and maneuvers
    highway_steps = sum(1 for step in steps if step.get("road_type") == "highway")
    urban_steps = sum(1 for step in steps if step.get("road_type") in ["local", "residential"])
    
    complex_maneuvers = sum(1 for step in steps if any(
        word in step.get("instruction", "").lower() 
        for word in ["merge", "fork", "roundabout"]
    ))
    
    return {
        "highway_percentage": (highway_steps / len(steps)) * 100 if steps else 0,
        "urban_percentage": (urban_steps / len(steps)) * 100 if steps else 0,
        "complex_maneuvers": complex_maneuvers,
        "traffic_density": "Medium",  # Would come from traffic API
        "peak_hours_affected": check_peak_hours_affected(route_data)
    }

def analyze_fuel_efficiency(route_data):
    """Analyze fuel efficiency"""
    analytics = route_data.get("analytics", {})
    distance = route_data.get("distance_km", 0)
    
    fuel_consumption = (distance / 100) * 8.0  # Base calculation
    optimal_fuel_consumption = (distance / 100) * 7.0
    
    efficiency_score = min(100, max(0, 100 - ((fuel_consumption - optimal_fuel_consumption) * 10)))
    
    return {
        "estimated_fuel_l": round(fuel_consumption, 1),
        "optimal_fuel_l": round(optimal_fuel_consumption, 1),
        "efficiency_score": round(efficiency_score),
        "efficiency_rating": "Excellent" if efficiency_score >= 90 else 
                           "Good" if efficiency_score >= 80 else 
                           "Average" if efficiency_score >= 70 else "Poor",
        "improvement_suggestions": generate_fuel_efficiency_suggestions(route_data)
    }

def generate_safety_improvements(route_data):
    """Generate safety improvement suggestions"""
    improvements = []
    analytics = route_data.get("analytics", {})
    safety_score = analytics.get("safety_score", 0)
    
    if safety_score < 80:
        improvements.append("Consider alternative route with higher safety rating")
    
    if analytics.get("road_types", {}).get("highway", 0) < 30:
        improvements.append("Route uses many local roads - extra caution advised")
    
    steps = route_data.get("steps", [])
    night_steps = sum(1 for step in steps if step.get("road_type") == "residential")
    if night_steps > len(steps) * 0.3:
        improvements.append("Route includes many residential areas - watch for pedestrians")
    
    return improvements

def generate_efficiency_recommendations(route_data):
    """Generate efficiency recommendations"""
    recommendations = []
    analytics = route_data.get("analytics", {})
    
    if analytics.get("time_efficiency", 0) < 70:
        recommendations.append("Consider faster route option for better time efficiency")
    
    fuel_cost = analytics.get("fuel_cost", 0)
    if fuel_cost > 10:
        recommendations.append("High fuel cost detected - consider eco-friendly alternative")
    
    return recommendations

def generate_timing_recommendations(time_analysis):
    """Generate timing recommendations"""
    recommendations = []
    
    if "Heavy traffic" in time_analysis.get("traffic_condition", ""):
        recommendations.append("Consider traveling during off-peak hours")
    
    buffer_minutes = time_analysis.get("recommended_buffer_minutes", 0)
    if buffer_minutes > 15:
        recommendations.append(f"Allow extra {buffer_minutes} minutes for potential delays")
    
    return recommendations

def generate_weather_recommendations(weather_impact):
    """Generate weather recommendations"""
    recommendations = []
    
    if weather_impact.get("impact_level") in ["high", "moderate"]:
        recommendations.append("Check weather forecast before departure")
    
    if weather_impact.get("visibility_impact") == "Poor":
        recommendations.append("Use fog lights if available and visibility is poor")
    
    return recommendations

def calculate_overall_route_score(route_data):
    """Calculate overall route score (0-100)"""
    analytics = route_data.get("analytics", {})
    
    safety_score = analytics.get("safety_score", 50)
    time_efficiency = analytics.get("time_efficiency", 50)
    fuel_efficiency = 100 - min(100, (analytics.get("fuel_cost", 0) / 20) * 100)  # Inverse of fuel cost
    
    # Weighted average
    overall = (safety_score * 0.4) + (time_efficiency * 0.3) + (fuel_efficiency * 0.3)
    return round(overall)

def calculate_cost_per_km(route_data):
    """Calculate cost per kilometer"""
    analytics = route_data.get("analytics", {})
    distance = route_data.get("distance_km", 1)
    total_cost = analytics.get("estimated_total_cost", 0)
    
    return round(total_cost / distance, 2) if distance > 0 else 0

def calculate_time_per_km(route_data):
    """Calculate time per kilometer"""
    distance = route_data.get("distance_km", 1)
    duration = route_data.get("duration_min", 0)
    
    return round(duration / distance, 2) if distance > 0 else 0

def calculate_eco_rating(environmental_impact):
    """Calculate eco-friendliness rating"""
    emissions = environmental_impact.get("co2_emissions_kg", 0)
    
    if emissions < 5:
        return "Excellent"
    elif emissions < 10:
        return "Good"
    elif emissions < 15:
        return "Average"
    elif emissions < 20:
        return "Poor"
    else:
        return "Very Poor"

# Additional helper functions would be implemented based on specific needs
# These are placeholder implementations for the comprehensive system

def identify_potential_hazards(route_data):
    """Identify potential hazards along route"""
    return []  # Would integrate with hazard database

def analyze_road_conditions(route_data):
    """Analyze road conditions"""
    return {}  # Would integrate with road condition data

def analyze_lighting_conditions(departure_time, route_data):
    """Analyze lighting conditions based on departure time"""
    return {}  # Would calculate based on sunset/sunrise times

def identify_emergency_services(route_data):
    """Identify emergency services along route"""
    return []  # Would integrate with emergency services database

def recommend_safety_equipment(route_data):
    """Recommend safety equipment"""
    return []  # Based on route characteristics

def calculate_traffic_safety_score(route_data):
    """Calculate traffic safety score"""
    return 75  # Would use traffic data

def calculate_weather_safety_score(route_data):
    """Calculate weather safety score"""
    return 80  # Would use weather data

def calculate_time_safety_score(departure_time):
    """Calculate time-based safety score"""
    hour = departure_time.hour
    if 6 <= hour <= 18:
        return 90  # Daytime
    else:
        return 70  # Nighttime

def identify_hospitals_along_route(route_data):
    """Identify hospitals along route"""
    return []  # Would integrate with healthcare facilities database

def identify_police_stations(route_data):
    """Identify police stations along route"""
    return []  # Would integrate with law enforcement database

def identify_tow_services(route_data):
    """Identify tow services along route"""
    return []  # Would integrate with service provider database

def generate_safety_precautions(route_data):
    """Generate safety precautions"""
    return []  # Based on route analysis

def generate_emergency_plan(route_data):
    """Generate emergency plan"""
    return {}  # Comprehensive emergency plan

def generate_safety_tips(route_data, departure_time):
    """Generate safety tips"""
    return []  # Context-specific safety tips

def calculate_alternative_costs(distance, duration, vehicle_type):
    """Calculate costs for alternative transport methods"""
    return {}  # Would calculate public transport, taxi, etc. costs

def calculate_average_cost_for_distance(distance):
    """Calculate average cost for given distance"""
    return {}  # Based on historical data

def identify_savings_opportunities(cost_breakdown, route_data):
    """Identify potential savings opportunities"""
    return []  # Analyze costs for savings

def generate_cost_saving_recommendations(cost_breakdown):
    """Generate cost saving recommendations"""
    return []  # Based on cost analysis

def generate_efficiency_recommendations_based_on_cost(cost_breakdown):
    """Generate efficiency recommendations based on cost"""
    return []  # Based on cost breakdown

def calculate_weather_impact(route_data, weather_info):
    """Calculate weather impact"""
    return {}  # Detailed weather impact analysis

def generate_weather_advisories(weather_info, route_data):
    """Generate weather advisories"""
    return []  # Based on weather conditions

def suggest_weather_alternatives(route_data, weather_info):
    """Suggest alternative routes based on weather"""
    return []  # Weather-optimized alternatives

def generate_weather_preparations(weather_info, route_data):
    """Generate weather preparations"""
    return []  # Preparation recommendations

def generate_weather_timeline(route_data):
    """Generate weather timeline"""
    return []  # Weather forecast along route timeline

def optimize_for_speed(route_data, constraints):
    """Optimize route for speed"""
    return route_data  # Would implement speed optimization

def optimize_for_safety(route_data, constraints):
    """Optimize route for safety"""
    return route_data  # Would implement safety optimization

def optimize_for_cost(route_data, constraints):
    """Optimize route for cost"""
    return route_data  # Would implement cost optimization

def optimize_for_eco_friendliness(route_data, constraints):
    """Optimize route for eco-friendliness"""
    return route_data  # Would implement eco optimization

def optimize_balanced(route_data, constraints):
    """Optimize route with balanced criteria"""
    return route_data  # Would implement balanced optimization

def calculate_optimization_improvements(original, optimized):
    """Calculate improvements from optimization"""
    return {}  # Compare original vs optimized

def check_constraints(route, constraints):
    """Check if route respects constraints"""
    return True  # Validate against constraints

def check_for_incidents(route_data, position):
    """Check for incidents along route"""
    return []  # Would integrate with incident reporting systems

def calculate_updated_duration(original_duration, traffic_update, weather_update):
    """Calculate updated duration based on current conditions"""
    return original_duration  # Would adjust based on real-time conditions

def generate_real_time_alerts(route_data, position, traffic_update, weather_update, incidents):
    """Generate real-time alerts"""
    return []  # Based on current conditions

def get_alternative_routes_for_delay(route_data, position):
    """Get alternative routes when there's significant delay"""
    return []  # Would calculate alternative routes from current position

def generate_real_time_recommendations(alerts, updated_duration):
    """Generate real-time recommendations"""
    return []  # Based on current alerts and conditions

def check_peak_hours_affected(route_data):
    """Check if route is affected by peak hours"""
    return False  # Would analyze based on timing

def generate_fuel_efficiency_suggestions(route_data):
    """Generate fuel efficiency suggestions"""
    return []  # Based on route characteristics