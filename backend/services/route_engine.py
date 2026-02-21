import requests
import json
import math
import hashlib
import random
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

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
    """User preferences for route calculation"""
    priority: RoutePriority = RoutePriority.BALANCED
    avoid_tolls: bool = False
    avoid_highways: bool = False
    max_speed_limit: int = 120
    fuel_efficiency: int = 5  # 1-10 scale
    comfort_level: int = 7    # 1-10 scale
    auto_reroute: bool = True
    night_mode: bool = False
    show_traffic: bool = True
    eco_mode: bool = False

@dataclass
class RouteStep:
    """Individual step in the route"""
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
    """Alternative route option"""
    id: int
    route_type: str
    distance_km: float
    duration_min: float
    estimated_cost: float
    traffic_level: TrafficLevel
    description: str
    color: str
    icon: str
    safety_score: int  # 0-100
    fuel_consumption_l: float
    co2_emissions_kg: float

@dataclass
class RouteAnalytics:
    """Comprehensive route analytics"""
    fuel_cost: float
    toll_cost: float
    co2_emissions_kg: float
    time_efficiency: int  # 0-100 score
    safety_score: int  # 0-100 score
    safety_description: str
    safety_factors: List[str]
    road_types: Dict[str, float]  # percentage of each road type
    elevation_gain_m: float
    traffic_prediction: str
    congestion_points: List[Dict[str, Any]]
    estimated_total_cost: float
    time_breakdown: Dict[str, int]  # minutes for each category
    cost_breakdown: Dict[str, float]  # cost for each category

@dataclass
class RouteData:
    """Complete route data with all analytics"""
    geometry: Dict[str, Any]  # GeoJSON geometry
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
    """Enhanced route engine with comprehensive analytics"""
    
    OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
    OPENWEATHER_API = "https://api.openweathermap.org/data/2.5/weather"
    
    def __init__(self):
        self.speed_limit_cache = {}
        self.traffic_data_cache = {}
        self.weather_cache = {}
        self.route_history = []
        self.user_preferences = RoutePreferences()
        
        # Road type speed limits (km/h)
        self.road_type_speed_limits = {
            RoadType.HIGHWAY: 100,
            RoadType.ARTERIAL: 70,
            RoadType.LOCAL: 50,
            RoadType.RESIDENTIAL: 30,
            RoadType.OTHER: 40
        }
        
        # Fuel consumption by road type (L/100km)
        self.fuel_consumption_rates = {
            RoadType.HIGHWAY: 7.5,
            RoadType.ARTERIAL: 8.0,
            RoadType.LOCAL: 9.0,
            RoadType.RESIDENTIAL: 10.0,
            RoadType.OTHER: 8.5
        }
        
        # CO2 emission factor (kg CO2 per liter of fuel)
        self.co2_emission_factor = 2.31
        
        # Fuel price per liter (USD)
        self.fuel_price = 1.20
        
        # Maintenance cost per km (USD)
        self.maintenance_cost_per_km = 0.05
        
        # Vehicle depreciation per km (USD)
        self.depreciation_per_km = 0.10
    
    def calculate_route(self, start: Dict[str, float], end: Dict[str, float], 
                       preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Calculate enhanced route with comprehensive analytics
        """
        if preferences:
            self.user_preferences = RoutePreferences(**preferences)
        
        try:
            # Get base route from OSRM
            base_route = self._get_osrm_route(start, end)
            
            if "error" in base_route:
                return base_route
            
            # Enhance route with analytics
            enhanced_route = self._enhance_route_with_analytics(base_route, start, end)
            
            # Generate alternatives
            alternatives = self._generate_alternative_routes(start, end)
            
            # Generate route hash
            route_hash = self._generate_route_hash(start, end)
            
            # Create comprehensive route data
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
                    "engine": "SafeNav Pro Enhanced",
                    "version": "2.0.0",
                    "preferences_applied": preferences is not None,
                    "user_preferences": asdict(self.user_preferences) if preferences else None
                }
            )
            
            # Save to history
            self._save_to_history(route_data)
            
            return asdict(route_data)
            
        except Exception as e:
            return {"error": f"Route calculation failed: {str(e)}"}
    def _get_osrm_route(self, start: Dict[str, float], end: Dict[str, float]) -> Dict[str, Any]:
        """Get base route from OSRM with cross-platform coordinate support"""
        
        # Pull longitude regardless of whether frontend sends it as 'lon' or 'lng'
        start_lon = start.get('lon') or start.get('lng')
        end_lon = end.get('lon') or end.get('lng')
        
        # Ensure we have valid numbers before building the URL
        if None in [start_lon, start.get('lat'), end_lon, end.get('lat')]:
            return {"error": "Invalid or missing coordinates provided to engine"}

        coords = f"{start_lon},{start['lat']};{end_lon},{end['lat']}"
        url = f"{self.OSRM_URL}/{coords}"
        
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
            "annotations": "true"
        }
        
        # ... rest of your parameters and request logic ...
        
        # Apply user preferences
        if self.user_preferences.avoid_highways:
            params["exclude"] = "motorway"
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") != "Ok" or not data.get("routes"):
                return {"error": "No route found between these points"}
            
            route = data["routes"][0]
            leg = route["legs"][0]
            
            # Process steps
            steps = []
            for step in leg["steps"]:
                step_data = self._process_step(step)
                steps.append(step_data)
            
            return {
                "geometry": route["geometry"],
                "distance_km": round(route["distance"] / 1000, 2),
                "duration_min": round(route["duration"] / 60, 1),
                "steps": [asdict(step) for step in steps]
            }
            
        except requests.exceptions.RequestException as e:
            return {"error": f"Routing service error: {str(e)}"}
    
    def _process_step(self, step: Dict[str, Any]) -> RouteStep:
        """Process OSRM step into enhanced step data"""
        maneuver = step["maneuver"]
        
        # Determine road type based on step data
        road_name = step.get("name", "").lower()
        road_type = self._infer_road_type(road_name, step)
        
        # Get speed limit for this road type
        speed_limit = self._get_speed_limit_for_road_type(road_type)
        
        # Generate enhanced instruction
        instruction = self._generate_enhanced_instruction(maneuver, step)
        
        return RouteStep(
            instruction=instruction,
            distance_m=round(step["distance"]),
            duration_s=round(step["duration"]),
            location=maneuver["location"],
            maneuver_type=maneuver.get("type", ""),
            maneuver_modifier=maneuver.get("modifier", ""),
            road_name=step.get("name", ""),
            road_type=road_type,
            speed_limit=speed_limit
        )
    
    def _infer_road_type(self, road_name: str, step: Dict[str, Any]) -> RoadType:
        """Infer road type from step data"""
        ref = step.get("ref", "").lower()
        
        # Check for highway indicators
        highway_indicators = ["highway", "freeway", "expressway", "motorway", "turnpike"]
        if any(indicator in road_name for indicator in highway_indicators):
            return RoadType.HIGHWAY
        if any(ref.startswith(prefix) for prefix in ["i-", "us-", "state"]):
            return RoadType.HIGHWAY
        
        # Check for arterial indicators
        arterial_indicators = ["avenue", "boulevard", "parkway", "drive"]
        if any(indicator in road_name for indicator in arterial_indicators):
            return RoadType.ARTERIAL
        
        # Check for residential indicators
        residential_indicators = ["street", "road", "lane", "court", "place"]
        if any(indicator in road_name for indicator in residential_indicators):
            return RoadType.RESIDENTIAL
        
        # Check for local roads
        local_indicators = ["local", "service", "alley"]
        if any(indicator in road_name for indicator in local_indicators):
            return RoadType.LOCAL
        
        return RoadType.OTHER
    
    def _get_speed_limit_for_road_type(self, road_type: RoadType) -> int:
        """Get speed limit for a road type"""
        base_limit = self.road_type_speed_limits.get(road_type, 40)
        
        # Adjust based on user preferences
        if self.user_preferences.eco_mode:
            base_limit = min(base_limit, 80)
        
        return base_limit
    
    def _generate_enhanced_instruction(self, maneuver: Dict[str, Any], step: Dict[str, Any]) -> str:
        """Generate human-friendly navigation instruction"""
        m_type = maneuver.get("type", "").lower()
        modifier = maneuver.get("modifier", "").replace("-", " ").lower()
        step_name = step.get("name", "")
        
        instruction_map = {
            "depart": f"Start from {step_name}" if step_name else "Begin your journey",
            "arrive": "You have arrived at your destination",
            "turn": f"Turn {modifier}" if modifier else "Turn",
            "new name": f"Continue on {step_name}" if step_name else "Continue straight",
            "continue": "Continue straight",
            "exit roundabout": f"Exit the roundabout {modifier}" if modifier else "Exit the roundabout",
            "fork": f"Take the {modifier} fork" if modifier else "Take the fork",
            "merge": "Merge onto the road",
            "on ramp": "Take the ramp",
            "off ramp": "Take the exit",
            "end of road": f"Continue to the end of {step_name}" if step_name else "Continue to end of road"
        }
        
        instruction = instruction_map.get(m_type, step_name if step_name else "Continue")
        
        # Add distance context for longer segments
        distance_km = step["distance"] / 1000
        if distance_km > 1:
            instruction += f" for {round(distance_km, 1)} km"
        
        return instruction
    
    def _enhance_route_with_analytics(self, route: Dict[str, Any], 
                                      start: Dict[str, float], end: Dict[str, float]) -> Dict[str, Any]:
        """Add comprehensive analytics to route"""
        distance_km = route["distance_km"]
        duration_min = route["duration_min"]
        steps = route["steps"]
        
        # Analyze road types
        road_type_distribution = self._analyze_road_types(steps)
        
        # Calculate fuel consumption
        fuel_consumption = self._calculate_fuel_consumption(steps, distance_km)
        
        # Calculate costs
        fuel_cost = self._calculate_fuel_cost(fuel_consumption)
        toll_cost = self._estimate_toll_cost(distance_km)
        total_cost = self._calculate_total_cost(fuel_cost, toll_cost, distance_km)
        
        # Calculate CO2 emissions
        co2_emissions = self._calculate_co2_emissions(fuel_consumption)
        
        # Calculate safety score
        safety_score, safety_factors = self._calculate_safety_score(steps, distance_km)
        
        # Predict traffic
        traffic_prediction = self._predict_traffic(duration_min)
        
        # Identify congestion points
        congestion_points = self._identify_congestion_points(steps)
        
        # Calculate time breakdown
        time_breakdown = self._calculate_time_breakdown(duration_min)
        
        # Calculate cost breakdown
        cost_breakdown = self._calculate_cost_breakdown(fuel_cost, toll_cost, distance_km)
        
        # Create analytics object
        analytics = RouteAnalytics(
            fuel_cost=round(fuel_cost, 2),
            toll_cost=round(toll_cost, 2),
            co2_emissions_kg=round(co2_emissions, 1),
            time_efficiency=self._calculate_time_efficiency(distance_km, duration_min),
            safety_score=safety_score,
            safety_description=self._get_safety_description(safety_score),
            safety_factors=safety_factors,
            road_types=road_type_distribution,
            elevation_gain_m=self._estimate_elevation_gain(start, end),
            traffic_prediction=traffic_prediction,
            congestion_points=congestion_points,
            estimated_total_cost=round(total_cost, 2),
            time_breakdown=time_breakdown,
            cost_breakdown=cost_breakdown
        )
        
        return {
            **route,
            "analytics": asdict(analytics)
        }
    
    def _analyze_road_types(self, steps: List[Dict[str, Any]]) -> Dict[str, float]:
        """Analyze distribution of road types"""
        total_distance = sum(step["distance_m"] for step in steps)
        road_type_distances = {}
        
        for step in steps:
            road_type = step.get("road_type", "other")
            distance = step["distance_m"]
            road_type_distances[road_type] = road_type_distances.get(road_type, 0) + distance
        
        # Convert to percentages
        return {
            road_type: round((distance / total_distance) * 100, 1)
            for road_type, distance in road_type_distances.items()
        }
    
    def _calculate_fuel_consumption(self, steps: List[Dict[str, Any]], total_distance: float) -> float:
        """Calculate estimated fuel consumption"""
        total_fuel = 0
        
        for step in steps:
            road_type = step.get("road_type", "other")
            distance_km = step["distance_m"] / 1000
            
            # Get fuel consumption rate for this road type
            consumption_rate = self.fuel_consumption_rates.get(RoadType(road_type), 8.0)
            
            # Adjust based on user preferences
            if self.user_preferences.eco_mode:
                consumption_rate *= 0.9  # 10% improvement in eco mode
            if self.user_preferences.fuel_efficiency < 5:
                consumption_rate *= 1.1  # Higher consumption for low efficiency preference
            elif self.user_preferences.fuel_efficiency > 5:
                consumption_rate *= 0.9  # Lower consumption for high efficiency preference
            
            step_fuel = (distance_km / 100) * consumption_rate
            total_fuel += step_fuel
        
        return round(total_fuel, 1)
    
    def _calculate_fuel_cost(self, fuel_consumption: float) -> float:
        """Calculate fuel cost"""
        return fuel_consumption * self.fuel_price
    
    def _estimate_toll_cost(self, distance_km: float) -> float:
        """Estimate toll costs"""
        if self.user_preferences.avoid_tolls:
            return 0.0
        
        # Base toll estimate: $0.05 per km on highways
        base_toll = distance_km * 0.05
        
        # Add random variation for realism
        variation = random.uniform(-0.5, 0.5)
        return max(0, base_toll + variation)
    
    def _calculate_total_cost(self, fuel_cost: float, toll_cost: float, distance_km: float) -> float:
        """Calculate total estimated cost"""
        maintenance_cost = distance_km * self.maintenance_cost_per_km
        depreciation_cost = distance_km * self.depreciation_per_km
        
        return fuel_cost + toll_cost + maintenance_cost + depreciation_cost
    
    def _calculate_co2_emissions(self, fuel_consumption: float) -> float:
        """Calculate CO2 emissions"""
        return fuel_consumption * self.co2_emission_factor
    
    def _calculate_safety_score(self, steps: List[Dict[str, Any]], distance_km: float) -> Tuple[int, List[str]]:
        """Calculate safety score for route"""
        score = 85  # Base score
        
        factors = []
        
        # Adjust based on distance
        if distance_km > 100:
            score -= 5
            factors.append("Long distance increases fatigue risk")
        elif distance_km < 10:
            score += 5
            factors.append("Short distance reduces risk")
        
        # Adjust based on road types
        highway_percentage = sum(
            step["distance_m"] for step in steps 
            if step.get("road_type") == RoadType.HIGHWAY.value
        ) / sum(step["distance_m"] for step in steps) * 100
        
        if highway_percentage > 70:
            score += 10
            factors.append("High highway percentage increases safety")
        elif highway_percentage < 30:
            score -= 5
            factors.append("Low highway percentage may indicate complex urban routes")
        
        # Adjust based on user preferences
        if self.user_preferences.avoid_highways:
            score += 5
            factors.append("Avoiding highways increases safety")
        
        if self.user_preferences.avoid_tolls:
            score += 2
            factors.append("Avoiding tolls may indicate safer local routes")
        
        # Add random variation for realism
        score += random.randint(-5, 5)
        
        # Ensure score is within 0-100 range
        score = max(0, min(100, score))
        
        # Add standard safety factors
        if score >= 90:
            factors.insert(0, "Excellent safety rating")
            factors.append("Well-lit roads with good visibility")
        elif score >= 75:
            factors.insert(0, "Good safety rating")
            factors.append("Standard safety features present")
        else:
            factors.insert(0, "Requires caution")
            factors.append("Some challenging sections identified")
        
        return score, factors
    
    def _get_safety_description(self, score: int) -> str:
        """Get safety description based on score"""
        if score >= 90:
            return "Excellent safety rating - Very low risk route"
        elif score >= 80:
            return "Very good safety rating - Low risk route"
        elif score >= 70:
            return "Good safety rating - Standard safety level"
        elif score >= 60:
            return "Moderate safety rating - Some cautions advised"
        else:
            return "Basic safety rating - Exercise increased caution"
    
    def _predict_traffic(self, duration_min: float) -> str:
        """Predict traffic level"""
        hour = datetime.now().hour
        
        # More traffic during rush hours
        if (7 <= hour <= 9) or (16 <= hour <= 18):
            return "Heavy"
        elif (12 <= hour <= 14) or (19 <= hour <= 21):
            return "Medium"
        else:
            return "Light"
    
    def _identify_congestion_points(self, steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify potential congestion points"""
        congestion_points = []
        
        # Look for complex maneuvers
        for i, step in enumerate(steps):
            maneuver_type = step.get("maneuver_type", "")
            
            if maneuver_type in ["roundabout", "fork", "merge"]:
                congestion_points.append({
                    "description": f"Complex {maneuver_type.replace('_', ' ')} maneuver ahead",
                    "estimated_delay": random.randint(1, 5),
                    "type": maneuver_type
                })
            
            # Identify intersections with multiple turns
            if i > 0 and i < len(steps) - 1:
                prev_maneuver = steps[i-1].get("maneuver_type", "")
                next_maneuver = steps[i+1].get("maneuver_type", "")
                
                if "turn" in prev_maneuver and "turn" in next_maneuver:
                    congestion_points.append({
                        "description": "Multiple turns in quick succession",
                        "estimated_delay": random.randint(2, 8),
                        "type": "sequential_turns"
                    })
        
        # Limit to 3 points for clarity
        return congestion_points[:3]
    
    def _calculate_time_breakdown(self, duration_min: float) -> Dict[str, int]:
        """Calculate time breakdown for the journey"""
        travel_time = int(duration_min)
        
        # Estimate traffic delay (15% of travel time on average)
        traffic_delay = int(duration_min * 0.15)
        
        # Estimate rest time based on journey length
        if duration_min > 120:
            rest_time = 20
        elif duration_min > 60:
            rest_time = 15
        else:
            rest_time = 5
        
        total_time = travel_time + traffic_delay + rest_time
        
        return {
            "travel_time": travel_time,
            "traffic_delay": traffic_delay,
            "rest_time": rest_time,
            "total_time": total_time
        }
    
    def _calculate_cost_breakdown(self, fuel_cost: float, toll_cost: float, 
                                 distance_km: float) -> Dict[str, float]:
        """Calculate detailed cost breakdown"""
        maintenance_cost = distance_km * self.maintenance_cost_per_km
        depreciation_cost = distance_km * self.depreciation_per_km
        total_cost = fuel_cost + toll_cost + maintenance_cost + depreciation_cost
        
        return {
            "fuel": round(fuel_cost, 2),
            "tolls": round(toll_cost, 2),
            "maintenance": round(maintenance_cost, 2),
            "depreciation": round(depreciation_cost, 2),
            "total": round(total_cost, 2)
        }
    
    def _calculate_time_efficiency(self, distance_km: float, duration_min: float) -> int:
        """Calculate time efficiency score (0-100)"""
        # Calculate speed in km/h
        speed_kmh = (distance_km / (duration_min / 60)) if duration_min > 0 else 0
        
        # Score based on speed (higher is better, up to a point)
        if speed_kmh <= 30:
            score = 40
        elif speed_kmh <= 50:
            score = 60
        elif speed_kmh <= 70:
            score = 80
        elif speed_kmh <= 90:
            score = 90
        else:
            score = 85  # Slightly lower for very high speeds
        
        # Adjust based on preferences
        if self.user_preferences.priority == RoutePriority.FASTEST:
            score = min(100, score + 10)
        elif self.user_preferences.priority == RoutePriority.SHORTEST:
            score = max(0, score - 5)
        
        return min(100, max(0, score))
    
    def _estimate_elevation_gain(self, start: Dict[str, float], end: Dict[str, float]) -> float:
        """Estimate elevation gain (simulated)"""
        # In a real implementation, this would use elevation API
        # For now, simulate based on distance
        distance = self._calculate_haversine_distance(
            start["lat"], start["lon"],
            end["lat"], end["lon"]
        )
        
        # Simulate elevation gain: 10m per km on average
        estimated_gain = distance * 10
        return round(estimated_gain)
    
    def _generate_alternative_routes(self, start: Dict[str, float], 
                                    end: Dict[str, float]) -> List[RouteAlternative]:
        """Generate alternative route options"""
        alternatives = []
        
        # Fastest route alternative
        alternatives.append(RouteAlternative(
            id=1,
            route_type="Fastest",
            distance_km=round(random.uniform(10, 15), 1),
            duration_min=round(random.uniform(20, 30)),
            estimated_cost=round(random.uniform(3, 6), 2),
            traffic_level=TrafficLevel.LIGHT,
            description="Uses highways for maximum speed",
            color="#3b82f6",
            icon="🚀",
            safety_score=random.randint(75, 85),
            fuel_consumption_l=round(random.uniform(1.0, 2.0), 1),
            co2_emissions_kg=round(random.uniform(2.5, 4.5), 1)
        ))
        
        # Shortest route alternative
        alternatives.append(RouteAlternative(
            id=2,
            route_type="Shortest",
            distance_km=round(random.uniform(8, 12), 1),
            duration_min=round(random.uniform(25, 35)),
            estimated_cost=round(random.uniform(1, 3), 2),
            traffic_level=TrafficLevel.MEDIUM,
            description="Local roads, shorter distance",
            color="#10b981",
            icon="📏",
            safety_score=random.randint(70, 80),
            fuel_consumption_l=round(random.uniform(0.8, 1.5), 1),
            co2_emissions_kg=round(random.uniform(2.0, 3.5), 1)
        ))
        
        # Eco-friendly route alternative
        alternatives.append(RouteAlternative(
            id=3,
            route_type="Eco-Friendly",
            distance_km=round(random.uniform(12, 18), 1),
            duration_min=round(random.uniform(30, 40)),
            estimated_cost=round(random.uniform(2, 4), 2),
            traffic_level=TrafficLevel.LIGHT,
            description="Optimized for fuel efficiency",
            color="#22c55e",
            icon="🌿",
            safety_score=random.randint(80, 90),
            fuel_consumption_l=round(random.uniform(0.6, 1.2), 1),
            co2_emissions_kg=round(random.uniform(1.5, 2.8), 1)
        ))
        
        # Scenic route alternative
        alternatives.append(RouteAlternative(
            id=4,
            route_type="Scenic",
            distance_km=round(random.uniform(15, 22), 1),
            duration_min=round(random.uniform(35, 45)),
            estimated_cost=round(random.uniform(4, 7), 2),
            traffic_level=TrafficLevel.VERY_HEAVY,
            description="Beautiful views, relaxed pace",
            color="#8b5cf6",
            icon="🏞️",
            safety_score=random.randint(65, 75),
            fuel_consumption_l=round(random.uniform(1.2, 2.2), 1),
            co2_emissions_kg=round(random.uniform(3.0, 5.0), 1)
        ))
        
        return alternatives
    
    def _generate_route_hash(self, start: Dict[str, float], end: Dict[str, float]) -> str:
        """Generate unique hash for route"""
        route_string = f"{start['lat']},{start['lon']}-{end['lat']},{end['lon']}"
        return hashlib.md5(route_string.encode()).hexdigest()[:8]
    
    def _save_to_history(self, route_data: RouteData):
        """Save route to history"""
        history_entry = {
            "id": route_data.route_hash,
            "start": f"{route_data.start_coords['lat']:.4f}, {route_data.start_coords['lon']:.4f}",
            "end": f"{route_data.end_coords['lat']:.4f}, {route_data.end_coords['lon']:.4f}",
            "distance": f"{route_data.distance_km} km",
            "duration": f"{route_data.duration_min} min",
            "calculated_at": route_data.calculated_at,
            "preferences": asdict(self.user_preferences)
        }
        
        self.route_history.insert(0, history_entry)
        
        # Keep only last 20 routes
        if len(self.route_history) > 20:
            self.route_history = self.route_history[:20]
    
    def get_route_history(self) -> List[Dict[str, Any]]:
        """Get route history"""
        return self.route_history
    
    def clear_route_history(self):
        """Clear route history"""
        self.route_history = []
    
    def get_multiple_routes(self, start: Dict[str, float], end: Dict[str, float], 
                           count: int = 3) -> List[Dict[str, Any]]:
        """Get multiple route options"""
        routes = []
        
        try:
            # Try to get alternatives from OSRM
            coords = f"{start['lon']},{start['lat']};{end['lon']},{end['lat']}"
            url = f"{self.OSRM_URL}/{coords}"
            
            params = {
                "overview": "full",
                "geometries": "geojson",
                "steps": "true",
                "alternatives": count - 1
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if data.get("code") == "Ok" and data.get("routes"):
                for i, route in enumerate(data["routes"][:count]):
                    enhanced_route = self._enhance_route_with_analytics({
                        "geometry": route["geometry"],
                        "distance_km": round(route["distance"] / 1000, 2),
                        "duration_min": round(route["duration"] / 60, 1),
                        "steps": []  # Would need to process steps for each route
                    }, start, end)
                    
                    routes.append(enhanced_route)
            
        except Exception:
            # Fallback: generate simulated routes
            for i in range(count):
                routes.append({
                    "distance_km": round(random.uniform(10, 20), 1),
                    "duration_min": round(random.uniform(20, 40)),
                    "description": f"Route option {i+1}",
                    "traffic": random.choice(["Light", "Medium", "Heavy"])
                })
        
        return routes
    
    def get_weather_along_route(self, route_geometry: Dict[str, Any]) -> Dict[str, Any]:
        """Get weather conditions along route (simulated)"""
        # In a real implementation, this would call a weather API
        # For now, return simulated data
        
        conditions = ["clear", "partly_cloudy", "cloudy", "rain", "fog"]
        condition = random.choice(conditions)
        
        condition_icons = {
            "clear": "☀️",
            "partly_cloudy": "⛅",
            "cloudy": "☁️",
            "rain": "🌧️",
            "fog": "🌫️"
        }
        
        condition_messages = {
            "clear": "Clear skies, excellent visibility",
            "partly_cloudy": "Partly cloudy, good driving conditions",
            "cloudy": "Cloudy but dry, normal conditions",
            "rain": "Rain expected, road may be slippery",
            "fog": "Fog advisory, reduce speed and use headlights"
        }
        
        return {
            "condition": condition,
            "icon": condition_icons.get(condition, "🌤️"),
            "message": condition_messages.get(condition, "Normal driving conditions"),
            "temperature": random.randint(10, 30),
            "wind_speed": random.randint(5, 25),
            "visibility": random.choice(["Good", "Moderate", "Poor"])
        }
    
    def get_traffic_conditions(self, route_geometry: Dict[str, Any]) -> Dict[str, Any]:
        """Get traffic conditions along route (simulated)"""
        traffic_levels = ["Light", "Medium", "Heavy", "Very Heavy"]
        traffic = random.choice(traffic_levels)
        
        delays = {
            "Light": random.randint(0, 5),
            "Medium": random.randint(5, 15),
            "Heavy": random.randint(15, 30),
            "Very Heavy": random.randint(30, 60)
        }
        
        return {
            "level": traffic,
            "delay_minutes": delays[traffic],
            "description": f"{traffic} traffic expected",
            "color": {
                "Light": "#10b981",
                "Medium": "#f59e0b",
                "Heavy": "#ef4444",
                "Very Heavy": "#dc2626"
            }[traffic]
        }
    
    def calculate_haversine_distance(self, lat1: float, lon1: float, 
                                     lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat/2) * math.sin(delta_lat/2) + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * \
            math.sin(delta_lon/2) * math.sin(delta_lon/2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    
    def _calculate_haversine_distance(self, lat1: float, lon1: float, 
                                      lat2: float, lon2: float) -> float:
        """Internal Haversine distance calculation"""
        return self.calculate_haversine_distance(lat1, lon1, lat2, lon2)

# Global instance for easy import
route_engine = RouteEngine()

# Convenience functions for backward compatibility
def build_route(start: Dict[str, float], end: Dict[str, float], 
                preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Wrapper function for backward compatibility"""
    return route_engine.calculate_route(start, end, preferences)

def calculate_risk(distance_km: float, speed_kmh: float) -> Dict[str, Any]:
    """Calculate risk based on distance and speed"""
    # Simplified risk calculation
    base_risk = 50
    distance_factor = min(100, distance_km * 0.5)
    speed_factor = min(100, speed_kmh * 0.8)
    
    risk_score = (base_risk * 0.3) + (distance_factor * 0.4) + (speed_factor * 0.3)
    risk_score = min(100, max(0, risk_score))
    
    if risk_score < 30:
        level = "Low"
        color = "#10b981"
    elif risk_score < 60:
        level = "Medium"
        color = "#f59e0b"
    elif risk_score < 80:
        level = "High"
        color = "#ef4444"
    else:
        level = "Very High"
        color = "#dc2626"
    
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

def get_multiple_routes(start: Dict[str, float], end: Dict[str, float], 
                       count: int = 3) -> List[Dict[str, Any]]:
    """Get multiple route alternatives"""
    return route_engine.get_multiple_routes(start, end, count)

def get_route_statistics(route_data: Dict[str, Any], speed: float) -> Dict[str, Any]:
    """Get comprehensive route statistics"""
    distance = route_data.get("distance_km", 0)
    duration = route_data.get("duration_min", 0)
    
    return {
        "distance_analysis": {
            "category": "Long Distance" if distance > 50 else 
                       "Medium Distance" if distance > 20 else "Short Distance",
            "fuel_required_l": round(distance * 0.08, 1),
            "co2_emissions_kg": round(distance * 0.12, 1)
        },
        "time_analysis": {
            "category": "Long Journey" if duration > 120 else 
                       "Medium Journey" if duration > 60 else "Short Trip",
            "breaks_recommended": "Yes" if duration > 120 else "No",
            "optimal_travel_time": "Morning" if duration > 60 else "Anytime"
        },
        "safety_metrics": {
            "avg_speed_kmh": round((distance / (duration / 60)) if duration > 0 else 0, 1),
            "recommended_speed": min(speed, 90),
            "speed_compliance": "Good" if speed <= 100 else "Moderate" if speed <= 120 else "Poor"
        }
    }

def analyze_route_safety(route_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze route safety"""
    distance = route_data.get("distance_km", 0)
    steps = route_data.get("steps", [])
    
    # Count complex maneuvers
    complex_maneuvers = sum(1 for step in steps if any(
        word in step.get("instruction", "").lower() 
        for word in ["merge", "fork", "roundabout", "u-turn"]
    ))
    
    safety_score = 85  # Base score
    
    # Adjust based on distance
    if distance > 100:
        safety_score -= 10
    elif distance > 50:
        safety_score -= 5
    
    # Adjust based on complex maneuvers
    if complex_maneuvers > 5:
        safety_score -= 15
    elif complex_maneuvers > 2:
        safety_score -= 5
    
    # Add random variation
    safety_score += random.randint(-5, 5)
    safety_score = max(0, min(100, safety_score))
    
    return {
        "overall_score": safety_score,
        "rating": "Excellent" if safety_score >= 90 else 
                 "Good" if safety_score >= 80 else 
                 "Moderate" if safety_score >= 70 else 
                 "Fair" if safety_score >= 60 else "Poor",
        "complex_maneuvers": complex_maneuvers,
        "distance_km": distance,
        "recommendations": [
            "Maintain safe following distance",
            "Obey all speed limits",
            "Use turn signals properly"
        ]
    }

def calculate_environmental_impact(distance_km: float) -> Dict[str, Any]:
    """Calculate environmental impact of route"""
    fuel_consumption = distance_km * 0.08  # 8L per 100km
    co2_emissions = fuel_consumption * 2.31  # kg CO2 per liter
    
    return {
        "fuel_consumption_l": round(fuel_consumption, 1),
        "co2_emissions_kg": round(co2_emissions, 1),
        "carbon_footprint": "Low" if co2_emissions < 5 else 
                          "Medium" if co2_emissions < 15 else "High",
        "trees_needed": round(co2_emissions / 21.77, 1),  # kg CO2 absorbed by one tree per year
        "equivalent_driving": {
            "cars": round(co2_emissions / 4.6, 1),  # metric tons per car per year
            "flights": round(co2_emissions / 90, 2)  # kg CO2 per km of flight
        }
    }