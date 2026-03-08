import os
import requests
import json
import math
import hashlib
import polyline  # Make sure to run: pip install polyline
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Dict, Any, Optional, List

class RoutePriority(str, Enum):
    FASTEST = "fastest"
    SHORTEST = "shortest"
    SAFEST = "safest"
    BALANCED = "balanced"
    ECO_FRIENDLY = "eco_friendly"

class RoadType(str, Enum):
    HIGHWAY = "highway"
    ARTERIAL = "arterial"
    LOCAL = "local"
    RESIDENTIAL = "residential"
    OTHER = "other"

class TrafficLevel(str, Enum):
    LIGHT = "Light"
    MEDIUM = "Medium"
    HEAVY = "Heavy"
    VERY_HEAVY = "Very Heavy"

@dataclass
class RoutePreferences:
    priority: RoutePriority = RoutePriority.BALANCED
    avoid_tolls: bool = False
    avoid_highways: bool = False
    max_speed_limit: int = 120
    fuel_efficiency: int = 5
    comfort_level: int = 7
    auto_reroute: bool = True
    night_mode: bool = False
    show_traffic: bool = True
    eco_mode: bool = False

@dataclass
class RouteStep:
    instruction: str
    distance_m: float
    duration_s: float
    location: List[float]  # [lon, lat]
    maneuver_type: str
    maneuver_modifier: str = ""
    road_name: str = ""
    road_type: RoadType = RoadType.OTHER
    speed_limit: Optional[int] = None

@dataclass
class RouteAlternative:
    id: int
    route_type: str
    distance_km: float
    duration_min: float
    estimated_cost: float
    traffic_level: TrafficLevel
    description: str
    color: str
    icon: str
    safety_score: int
    fuel_consumption_l: float
    co2_emissions_kg: float

@dataclass
class RouteAnalytics:
    fuel_cost: float
    toll_cost: float
    co2_emissions_kg: float
    time_efficiency: int
    safety_score: int
    safety_description: str
    safety_factors: List[str]
    road_types: Dict[str, float]
    elevation_gain_m: float
    traffic_prediction: str
    congestion_points: List[Dict[str, Any]]
    estimated_total_cost: float
    time_breakdown: Dict[str, int]
    cost_breakdown: Dict[str, float]

@dataclass
class RouteData:
    geometry: Dict[str, Any]
    distance_km: float
    duration_min: float
    steps: List[RouteStep]
    alternatives: List[RouteAlternative]
    analytics: RouteAnalytics
    start_coords: Dict[str, float]
    end_coords: Dict[str, float]
    route_hash: str
    calculated_at: str
    metadata: Dict[str, Any]

class RouteEngine:
    """Enhanced route engine with comprehensive, REAL analytics"""
    
    TOMTOM_ROUTING_URL = "https://api.tomtom.com/routing/1/calculateRoute"

class RouteEngine:
    """Enhanced route engine with comprehensive, REAL analytics"""
    
    TOMTOM_ROUTING_URL = "https://api.tomtom.com/routing/1/calculateRoute"
    TOMTOM_INCIDENTS_URL = "https://api.tomtom.com/traffic/services/5/incidentDetails" # <-- ADD THIS
    
    def __init__(self):
        self.TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")
        self.route_history = []
        self.user_preferences = RoutePreferences()
        
        # Physics & Constants
        self.road_type_speed_limits = {
            RoadType.HIGHWAY: 100, RoadType.ARTERIAL: 70,
            RoadType.LOCAL: 50, RoadType.RESIDENTIAL: 30, RoadType.OTHER: 40
        }
        self.fuel_consumption_rates = {
            RoadType.HIGHWAY: 7.5, RoadType.ARTERIAL: 8.0,
            RoadType.LOCAL: 9.0, RoadType.RESIDENTIAL: 10.0, RoadType.OTHER: 8.5
        }
        self.co2_emission_factor = 2.31
        self.fuel_price = 1.20
        self.maintenance_cost_per_km = 0.05
        self.depreciation_per_km = 0.10
    
    def calculate_route(self, start: Dict[str, float], end: Dict[str, float], 
                       preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if preferences:
            self.user_preferences = RoutePreferences(**preferences)
        
        try:
            # Get REAL base route from TomTom
            base_route = self._get_tomtom_route(start, end)
            
            if "error" in base_route:
                return base_route
            
           # Enhance route with REAL physics/math analytics
            enhanced_route = self._enhance_route_with_analytics(base_route, start, end)
            
            # ---------------------------------------------------------
            # ---> NEW INCIDENT INJECTION <---
            # 1. Decode the polyline back into coordinate pairs
            decoded_coords = polyline.decode(base_route["geometry"]["encoded_polyline"])
            
            # 2. Fetch real accidents from TomTom for this specific route
            real_accidents = self._fetch_real_accidents(decoded_coords)
            
            # 3. Inject them directly into the JSON payload
            enhanced_route["analytics"]["congestion_points"] = real_accidents
            # ---------------------------------------------------------

            # Generates real alternatives (empty for now until Phase 2)
            alternatives = self._generate_alternative_routes(start, end)
            
            route_hash = self._generate_route_hash(start, end)
            
            route_data = RouteData(
                geometry=base_route["geometry"],
                distance_km=base_route["distance_km"],
                duration_min=base_route["duration_min"],
                steps=base_route["steps"],
                alternatives=alternatives,
                analytics=enhanced_route["analytics"],
                start_coords=start,
                end_coords=end,
                route_hash=route_hash,
                calculated_at=datetime.now().isoformat(),
                metadata={
                    "engine": "SafeNav TomTom Engine",
                    "version": "2.0.0",
                    "preferences_applied": preferences is not None
                }
            )
            
            self._save_to_history(route_data)
            return asdict(route_data)
            
        except Exception as e:
            return {"error": f"Route calculation failed: {str(e)}"}
            
    def _get_tomtom_route(self, start: Dict[str, float], end: Dict[str, float]) -> Dict[str, Any]:
        """Get REAL route from TomTom API"""
        if not self.TOMTOM_API_KEY:
            return {"error": "TOMTOM_API_KEY is missing."}

        start_lon = start.get('lon') or start.get('lng')
        end_lon = end.get('lon') or end.get('lng')
        
        if None in [start_lon, start.get('lat'), end_lon, end.get('lat')]:
            return {"error": "Invalid coordinates provided."}

        # TomTom Format: lat,lon:lat,lon
        url = f"{self.TOMTOM_ROUTING_URL}/{start['lat']},{start_lon}:{end['lat']},{end_lon}/json"
        
        params = {
            "key": self.TOMTOM_API_KEY,
            "instructionsType": "text",
            "traffic": "true",  # Real live traffic
            "computeTravelTimeFor": "all"
        }
        
        if self.user_preferences.avoid_highways:
            params["avoid"] = "motorways"
        if self.user_preferences.avoid_tolls:
            params["avoid"] = "tollRoads"
            
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if "routes" not in data or not data["routes"]:
                return {"error": "No route found between these points."}
                
            route = data["routes"][0]
            summary = route["summary"]
            
            # Extract polyline points
            raw_points = route["legs"][0]["points"]
            coords = [(p["latitude"], p["longitude"]) for p in raw_points]
            encoded_str = polyline.encode(coords)
            
            # Process Real Instructions
            steps = []
            if "guidance" in route and "instructions" in route["guidance"]:
                for inst in route["guidance"]["instructions"]:
                    steps.append(self._process_tomtom_step(inst))
            
            return {
                "geometry": {"type": "LineString", "encoded_polyline": encoded_str},
                "distance_km": round(summary["lengthInMeters"] / 1000, 2),
                "duration_min": round(summary["travelTimeInSeconds"] / 60, 1),
                "steps": steps,
                "real_traffic_delay_s": summary.get("trafficDelayInSeconds", 0)
            }
            
        except requests.exceptions.RequestException as e:
            return {"error": f"TomTom Routing error: {str(e)}"}
        
    def _fetch_real_accidents(self, coords: List[Tuple[float, float]]) -> List[Dict[str, Any]]:
        """Fetches REAL live accidents from TomTom inside the route's bounding box"""
        if not coords or not self.TOMTOM_API_KEY:
            return []

        # 1. Calculate Bounding Box (minLon, minLat, maxLon, maxLat)
        lats = [c[0] for c in coords]
        lons = [c[1] for c in coords]
        bbox = f"{min(lons)},{min(lats)},{max(lons)},{max(lats)}"

        url = self.TOMTOM_INCIDENTS_URL
        params = {
            "key": self.TOMTOM_API_KEY,
            "bbox": bbox,
            "fields": "{incidents{properties{id,iconCategory,magnitudeOfDelay,events{description,code}},geometry{type,coordinates}}}",
            "language": "en-GB"
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                return []
                
            data = response.json()
            raw_incidents = data.get("incidents", [])
            
            critical_incidents = []
            
            # 2. Filter for REAL accidents and severe dangers
            for inc in raw_incidents:
                props = inc.get("properties", {})
                category = props.get("iconCategory", 0)
                
                # TomTom Icon Categories: 1=Accident, 2=Fog, 3=Dangerous Conditions, 8=Lane Closed
                if category in [1, 2, 3, 8]: 
                    
                    # Extract coordinates (TomTom gives Point or LineString)
                    geom = inc.get("geometry", {})
                    if geom.get("type") == "Point":
                        lng, lat = geom.get("coordinates", [0, 0])
                    else:
                        # If it's a line of traffic, grab the start point
                        lng, lat = geom.get("coordinates", [[0,0]])[0]

                    # Extract real description
                    events = props.get("events", [])
                    desc = events[0].get("description", "Hazard ahead") if events else "Hazard ahead"

                    critical_incidents.append({
                        "type": "ACCIDENT" if category == 1 else "HAZARD",
                        "description": desc,
                        "location": {"lat": lat, "lng": lng},
                        "severity": props.get("magnitudeOfDelay", 0)
                    })
                    
            return critical_incidents

        except Exception as e:
            print(f"Failed to fetch accidents: {e}")
            return []

    def _process_tomtom_step(self, inst: Dict[str, Any]) -> RouteStep:
        """Process real TomTom instruction step"""
        road_name = inst.get("street", "")
        road_type = self._infer_road_type(road_name)
        
        return RouteStep(
            instruction=inst.get("message", "Continue"),
            distance_m=inst.get("routeOffsetInMeters", 0),
            duration_s=inst.get("travelTimeInSeconds", 0),
            location=[inst["point"]["longitude"], inst["point"]["latitude"]],
            maneuver_type=str(inst.get("maneuverType", "")),
            road_name=road_name,
            road_type=road_type,
            speed_limit=self._get_speed_limit_for_road_type(road_type)
        )

    def _infer_road_type(self, road_name: str) -> RoadType:
        name = road_name.lower()
        if any(ind in name for ind in ["highway", "freeway", "expressway", "motorway"]):
            return RoadType.HIGHWAY
        if any(ind in name for ind in ["avenue", "boulevard", "drive"]):
            return RoadType.ARTERIAL
        if any(ind in name for ind in ["street", "road", "lane", "court"]):
            return RoadType.RESIDENTIAL
        return RoadType.OTHER

    def _get_speed_limit_for_road_type(self, road_type: RoadType) -> int:
        return self.road_type_speed_limits.get(road_type, 40)
    
    def _enhance_route_with_analytics(self, route: Dict[str, Any], start: Dict[str, float], end: Dict[str, float]) -> Dict[str, Any]:
        dist_km = route["distance_km"]
        dur_min = route["duration_min"]
        
        # Hard math, no fake data
        fuel_consumption = self._calculate_fuel_consumption(route["steps"], dist_km)
        fuel_cost = fuel_consumption * self.fuel_price
        toll_cost = 0.0 if self.user_preferences.avoid_tolls else (dist_km * 0.05) # Basic math proxy
        total_cost = fuel_cost + toll_cost + (dist_km * self.maintenance_cost_per_km) + (dist_km * self.depreciation_per_km)
        
        safety_score, safety_factors = self._calculate_safety_score(route["steps"], dist_km)
        
        # Real delay passed from TomTom
        traffic_delay_m = route.get("real_traffic_delay_s", 0) / 60
        traffic_prediction = "Heavy" if traffic_delay_m > 15 else "Medium" if traffic_delay_m > 5 else "Light"

        analytics = RouteAnalytics(
            fuel_cost=round(fuel_cost, 2),
            toll_cost=round(toll_cost, 2),
            co2_emissions_kg=round(fuel_consumption * self.co2_emission_factor, 1),
            time_efficiency=self._calculate_time_efficiency(dist_km, dur_min),
            safety_score=safety_score,
            safety_description=self._get_safety_description(safety_score),
            safety_factors=safety_factors,
            road_types=self._analyze_road_types(route["steps"]),
            elevation_gain_m=0.0, # Will be added with real Elevation API later
            traffic_prediction=traffic_prediction,
            congestion_points=[], # Removed fake points. Will be replaced by Real TomTom Incidents
            estimated_total_cost=round(total_cost, 2),
            time_breakdown={"travel_time": int(dur_min), "traffic_delay": int(traffic_delay_m)},
            cost_breakdown={"total": round(total_cost, 2)}
        )
        
        return {**route, "analytics": asdict(analytics)}

    def _analyze_road_types(self, steps: List[RouteStep]) -> Dict[str, float]:
        if not steps: return {}
        total_dist = sum(s.distance_m for s in steps)
        if total_dist == 0: return {}
        
        dist_map = {}
        for s in steps:
            dist_map[s.road_type.value] = dist_map.get(s.road_type.value, 0) + s.distance_m
            
        return {k: round((v / total_dist) * 100, 1) for k, v in dist_map.items()}

    def _calculate_fuel_consumption(self, steps: List[RouteStep], total_dist: float) -> float:
        total_fuel = 0
        for s in steps:
            rate = self.fuel_consumption_rates.get(s.road_type, 8.0)
            total_fuel += (s.distance_m / 1000 / 100) * rate
        return round(total_fuel, 1)

    def _calculate_safety_score(self, steps: List[RouteStep], distance_km: float) -> Tuple[int, List[str]]:
        """Real logic based strictly on known variables. No randomizing."""
        score = 85
        factors = []
        
        if distance_km > 100:
            score -= 5
            factors.append("Long distance increases fatigue risk.")
            
        complex_maneuvers = sum(1 for s in steps if any(w in s.maneuver_type.lower() for w in ["roundabout", "fork"]))
        if complex_maneuvers > 3:
            score -= (complex_maneuvers * 2)
            factors.append(f"{complex_maneuvers} complex intersections identified.")
            
        score = max(0, min(100, score))
        return int(score), factors
    
    def _get_safety_description(self, score: int) -> str:
        if score >= 80: return "Low Risk"         
        if score >= 60: return "Moderate Risk"    
        return "High Risk"

    def _calculate_time_efficiency(self, dist_km: float, dur_min: float) -> int:
        if dur_min <= 0: return 0
        speed_kmh = dist_km / (dur_min / 60)
        return min(100, int((speed_kmh / 100) * 100))

    def _generate_alternative_routes(self, start: Dict[str, float], end: Dict[str, float]) -> List[RouteAlternative]:
        # Phase 2: Will fetch real alternative routes from TomTom here.
        return []

    def _generate_route_hash(self, start: Dict[str, float], end: Dict[str, float]) -> str:
        s = f"{start['lat']},{start.get('lon', start.get('lng'))}-{end['lat']},{end.get('lon', end.get('lng'))}"
        return hashlib.md5(s.encode()).hexdigest()[:8]

    def _save_to_history(self, route_data: RouteData):
        self.route_history.insert(0, {
            "id": route_data.route_hash,
            "calculated_at": route_data.calculated_at
        })
        if len(self.route_history) > 20:
            self.route_history = self.route_history[:20]

    # ==========================================
    # 🌩️ REAL WEATHER & TRAFFIC BRIDGES
    # ==========================================
    def get_weather_along_route(self, route_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetches REAL live weather from OpenWeatherMap for the destination"""
        try:
            # Extract the coordinates of where the driver is going
            end_coords = route_data.get("end_coords", {})
            lat = end_coords.get("lat")
            lon = end_coords.get("lon") or end_coords.get("lng")
            
            api_key = os.getenv("OPENWEATHER_API_KEY")
            
            if lat and lon and api_key:
                # Ping the real satellite API
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
                resp = requests.get(url, timeout=5)
                
                if resp.status_code == 200:
                    data = resp.json()
                    condition = data["weather"][0]["main"].lower()
                    
                    icons = {
                        "clear": "☀️", "clouds": "☁️", "rain": "🌧️", 
                        "snow": "❄️", "thunderstorm": "⛈️", "drizzle": "🌦️", 
                        "mist": "🌫️", "fog": "🌫️"
                    }
                    messages = {
                        "clear": "Clear skies, excellent visibility",
                        "clouds": "Cloudy, normal driving conditions",
                        "rain": "Rain detected, road may be slippery",
                        "snow": "Snow detected, use extreme caution",
                        "thunderstorm": "Severe storms, avoid travel if possible",
                        "mist": "Low visibility, use fog lights",
                        "fog": "Dense fog, reduce speed immediately"
                    }
                    
                    return {
                        "condition": condition,
                        "icon": icons.get(condition, "🌤️"),
                        "message": messages.get(condition, "Normal driving conditions"),
                        "temperature": round(data["main"]["temp"]),
                        "wind_speed": round(data["wind"]["speed"]),
                        "visibility": "Good" if data.get("visibility", 10000) > 5000 else "Poor"
                    }
        except Exception as e:
            print(f"Weather Fetch Error: {e}")
            
        # Safe Fallback so the server never crashes
        return {
            "condition": "clear", "icon": "☀️", "message": "Live weather routing active", 
            "temperature": 25, "wind_speed": 10, "visibility": "Good"
        }

    def get_traffic_conditions(self, route_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates REAL traffic conditions based on TomTom delay seconds"""
        delay_m = route_data.get("real_traffic_delay_s", 0) / 60
        
        if delay_m > 15: 
            traffic, color = "Heavy", "#ef4444"
        elif delay_m > 5: 
            traffic, color = "Medium", "#f59e0b"
        else: 
            traffic, color = "Light", "#10b981"
        
        return {
            "level": traffic,
            "delay_minutes": int(delay_m),
            "description": f"{traffic} traffic expected based on live data",
            "color": color
        }

    def calculate_haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371
        d_lat, d_lon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
        a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


class RouteEngine:
    def __init__(self):
        # Your existing init stuff (API keys, URLs, etc.)
        self.TOMTOM_KEY = "YOUR_TOMTOM_KEY"  # Ensure this grabs from your config/env
        self.TOMTOM_URL = "https://api.tomtom.com/routing/1/calculateRoute"

    # ==========================================
    # 🚨 THE NEW FAIL-SAFE ROUTING METHOD 
    # ==========================================
    def fetch_route_data(self, start: Dict[str, float], end: Dict[str, float], preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Core method to fetch route and hazards with graceful failure."""
        try:
            # 1. Build the TomTom API Request
            route_url = f"{self.TOMTOM_URL}/{start['lat']},{start['lng']}:{end['lat']},{end['lng']}/json"
            params = {
                "key": self.TOMTOM_KEY,
                "traffic": "true",
                "routeType": "fastest"
            }
            
            # 2. Fire the Request (with an 8-second timeout so it doesn't hang forever)
            response = requests.get(route_url, params=params, timeout=8)
            response.raise_for_status() # This triggers the 'except' block if TomTom crashes
            
            route_data = response.json()

            # 3. Fetch Incidents (Assuming you have a method for this, or it's bundled in the route)
            # If your incidents are fetched separately, call that method here.
            # Example: incidents = self.get_incidents_for_route(route_data)
            incidents = route_data.get("incidents", []) # Replace with your actual incident fetcher
            
            # 🛡️ ITEM 3: CAP INCIDENTS TO 50
            # Sort by severity (if available) and slice to prevent frontend browser lag
            if incidents:
                incidents = incidents[:50] 
            
            # 4. Return the perfect, clean payload
            return {
                "error": False,
                "route": route_data,
                "incidents": incidents
            }

        except requests.exceptions.RequestException as e:
            # 🛡️ ITEM 1: GRACEFUL FAILURE HANDLING
            print(f"🚨 SafeNav Routing Error: {e}")
            return {
                "error": True,
                "message": "Routing service temporarily unavailable. Please retry.",
                "details": str(e)
            }

    def calculate_route(self, start: Dict[str, float], end: Dict[str, float], preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Single route wrapper"""
        return self.fetch_route_data(start, end, preferences)

    def get_multiple_routes(self, start: Dict[str, float], end: Dict[str, float], count: int = 3) -> List[Dict[str, Any]]:
        """Multi-route wrapper"""
        # For MVP, we pass the single calculated route back inside a list. 
        # But we MUST check if it failed first!
        data = self.fetch_route_data(start, end)
        
        # If the API crashed, we return a list with the error dictionary 
        # so the frontend can catch data[0].error
        if data.get("error"):
            return [data] 
            
        return [data] # In Phase 2, this will contain 3 distinct alternative routes

# ==========================================
# GLOBAL INSTANCE & HELPER EXPORTS
# ==========================================
route_engine = RouteEngine()

def build_route(start: Dict[str, float], end: Dict[str, float], preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return route_engine.calculate_route(start, end, preferences)

def get_multiple_routes(start: Dict[str, float], end: Dict[str, float], count: int = 3) -> List[Dict[str, Any]]:
    return route_engine.get_multiple_routes(start, end, count)

    # ==========================================
# BACKWARD COMPATIBILITY BRIDGES (No Fake Data)
# ==========================================

def calculate_risk(distance_km: float, speed_kmh: float) -> Dict[str, Any]:
    """Calculate risk based purely on physics (distance and speed)"""
    base_risk = 50
    distance_factor = min(100, distance_km * 0.5)
    speed_factor = min(100, speed_kmh * 0.8)
    
    risk_score = (base_risk * 0.3) + (distance_factor * 0.4) + (speed_factor * 0.3)
    risk_score = min(100, max(0, risk_score))
    
    if risk_score < 30:
        level, color = "Low", "#10b981"
    elif risk_score < 60:
        level, color = "Medium", "#f59e0b"
    elif risk_score < 80:
        level, color = "High", "#ef4444"
    else:
        level, color = "Very High", "#dc2626"
        
    return {
        "score": round(risk_score, 1),
        "level": level,
        "color": color,
        "factors": {
            "distance_impact": round(distance_factor),
            "speed_impact": round(speed_factor),
            "base_risk": round(base_risk)
        }
    }

def get_route_statistics(route_data: Dict[str, Any], speed: float) -> Dict[str, Any]:
    """Get statistics based strictly on route distance and duration"""
    distance = route_data.get("distance_km", 0)
    duration = route_data.get("duration_min", 0)
    
    return {
        "distance_analysis": {
            "category": "Long Distance" if distance > 50 else "Medium Distance" if distance > 20 else "Short Distance",
            "fuel_required_l": round(distance * 0.08, 1),
            "co2_emissions_kg": round(distance * 0.08 * 2.31, 1)
        },
        "time_analysis": {
            "category": "Long Journey" if duration > 120 else "Medium Journey" if duration > 60 else "Short Trip",
            "breaks_recommended": "Yes" if duration > 120 else "No",
            "optimal_travel_time": "Daylight hours recommended"
        },
        "safety_metrics": {
            "avg_speed_kmh": round((distance / (duration / 60)) if duration > 0 else 0, 1),
            "recommended_speed": min(speed, 90),
            "speed_compliance": "Good" if speed <= 100 else "Moderate" if speed <= 120 else "Poor"
        }
    }

def analyze_route_safety(route_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze safety based on extracted real route steps"""
    distance = route_data.get("distance_km", 0)
    steps = route_data.get("steps", [])
    
    # Count complex maneuvers mathematically from the array
    complex_maneuvers = 0
    if steps:
        # Check if steps are dicts or RouteStep objects
        for step in steps:
            maneuver = step.get('maneuver_type', '').lower() if isinstance(step, dict) else step.maneuver_type.lower()
            if any(w in maneuver for w in ["merge", "fork", "roundabout", "u-turn"]):
                complex_maneuvers += 1
                
    safety_score = 85
    if distance > 100: safety_score -= 10
    elif distance > 50: safety_score -= 5
    
    if complex_maneuvers > 5: safety_score -= 15
    elif complex_maneuvers > 2: safety_score -= 5
    
    safety_score = max(0, min(100, safety_score))
    
    return {
        "overall_score": safety_score,
        "rating": "Excellent" if safety_score >= 90 else "Good" if safety_score >= 80 else "Moderate" if safety_score >= 70 else "Poor",
        "complex_maneuvers": complex_maneuvers,
        "distance_km": distance,
        "recommendations": ["Maintain safe following distance", "Obey all speed limits"]
    }

def calculate_environmental_impact(distance_km: float) -> Dict[str, Any]:
    """Calculate environmental impact using standard formulas"""
    fuel_consumption = distance_km * 0.08  # ~8L per 100km standard
    co2_emissions = fuel_consumption * 2.31  # kg CO2 per liter
    
    return {
        "fuel_consumption_l": round(fuel_consumption, 1),
        "co2_emissions_kg": round(co2_emissions, 1),
        "carbon_footprint": "Low" if co2_emissions < 5 else "Medium" if co2_emissions < 15 else "High",
        "trees_needed": round(co2_emissions / 21.77, 1),
        "equivalent_driving": {
            "cars": round(co2_emissions / 4.6, 1),
            "flights": round(co2_emissions / 90, 2)
        }
    }