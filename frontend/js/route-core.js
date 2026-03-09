/* ==========================================================================
   SAFENAV PRO - MAPLIBRE 3D ENGINE (100% Logic Preserved)
   ========================================================================== */
   // --- GLOBAL SYSTEM LOCKS ---
var isCalculating = false;
window.isCalculating = false;


// --- GLOBAL STATE ---
let map = null;
let userMarker = null; 
let startMarker = null;
let endMarker = null;
let accuracyCircleId = 'accuracy-circle';
let routeSourceId = 'route-source';
let routeLayerId = 'route-layer';

let watchId = null;
let currentRouteData = null;
let routeSteps = [];
let currentStepIndex = 0;
let isNavigating = false;
let isGpsLocked = false;
let startNavigationTime = null;
let totalDistanceTraveled = 0;
let remainingKm = 0;
let lastPosition = null;        

let animFrameId = null;
let currentAnimPos = { lat: 0, lng: 0, heading: 0 }; 
let targetAnimPos = { lat: 0, lng: 0, heading: 0 };  
let lastAnimTick = 0;

// --- HAZARD STATE ---
let hazardMarkers = []; // Stores the MapLibre markers
let activeHazards = []; // Stores the raw data for the radar
let hazardAlertTriggered = new Set(); // Prevents repeating the same voice alert

// System & UI State
let isFullscreen = false;
let isVoiceActive = true;
let isTrafficActive = false;
let wakeLock = null;
let lastUplinkTime = 0;
let simulationInterval = null;
let currentMapTheme = null;

// 📸 Camera & Alerts
let realSpeedCameras = []; 
let lastCamScanTime = 0;
let activeCamAlertID = null;
let camCountdownInterval = null;
let currentSpeedLimit = null; 

let navWatchId = null; // Secret ID to stop the GPS when we exit
let simInterval = null;


// BASIC CONFIGURATION
const CONFIG_APP = {
    animations: { markerSmoothness: 0.15 },
    voice: { rate: 0.92, pitch: 1.05, volume: 1.0 }
};

// ============================
// 1. MAPLIBRE INITIALIZATION
// ============================
function initMap() {
    if (map) return;
    
    try {
        const defaultLat = 20.5937; 
        const defaultLng = 78.9629; // Center of India
        
        // Use TomTom Vector Style (Highly Detailed)
        const MAP_STYLE_URL = `https://api.tomtom.com/map/1/style/20.0.0-8/basic_main.json?key=${CONFIG.TOMTOM_KEY}&language=en-US`;
        
        map = new maplibregl.Map({
            container: 'map',
            style: MAP_STYLE_URL,
            center: [defaultLng, defaultLat],
            zoom: 4,
            pitch: 0,
            
            // ⚡ SPEED OPTIMIZATION ⚡
            fadeDuration: 0, // Removes the artificial delay when tiles load
            crossSourceCollisions: false, // Speeds up rendering
            
            // 🛡️ RELAXED STABILITY SETTINGS 🛡️
            minZoom: 2, 
            maxZoom: 20,
            renderWorldCopies: true, 
            
            attributionControl: false,
            // 🔥 THE INTERCEPTOR: Forces English on every single map tile
            transformRequest: (url, resourceType) => {
                if (url.includes('api.tomtom.com') && resourceType === 'Tile') {
                    try {
                        const newUrl = new URL(url);
                        newUrl.searchParams.set('language', 'en-US');
                        return { url: newUrl.toString() };
                    } catch (e) {
                        return { url };
                    }
                }
                return { url };
            }
        });

        map.on('load', () => {
            console.log('✅ MapLibre 3D Vector Engine Initialized');
            
            // 🖱️ RIGHT-CLICK FIX 🖱️
            map.dragRotate.disable();
            map.touchPitch.disable();
            map.getCanvasContainer().addEventListener('contextmenu', (e) => {
                e.stopPropagation(); 
            }, true);

            // 📍 THE LIVE GPS TRACKER (BLUE DOT)
            const geolocateControl = new maplibregl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true, // Follows you as you move
                showUserHeading: true, // Shows the direction you are pointing
                showAccuracyCircle: false // Hides the giant blue circle for a cleaner UI
            });
            map.addControl(geolocateControl, 'bottom-right');
          
            
            // Setup Route Sources
            map.addSource(routeSourceId, {
                'type': 'geojson',
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
            });

            map.addLayer({
                'id': routeLayerId,
                'type': 'line',
                'source': routeSourceId,
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 'line-color': '#2563eb', 'line-width': 6, 'line-opacity': 0.9 }
            });
            
            if(window.startCoords && window.endCoords) {
                // If auto-routed from another page, trigger calculation
                setTimeout(() => window.calculateRoute(), 500);
            } else if (typeof useMyLocation === 'function') {
                useMyLocation("startLocation", null);
            }
        });
    } catch (error) {
        console.error('❌ Failed to initialize map:', error);
    }
}
// ============================
// 2. MARKER CREATION (DOM Elements for MapLibre)
// ============================
function createUserMarkerElement() {
    const el = document.createElement('div');
    el.className = 'user-marker-arrow';
    el.innerHTML = `<i id="userArrow" class="fas fa-location-arrow" style="font-size: 36px; color: #2563eb; transform: rotate(-45deg); text-shadow: 0 4px 10px rgba(0,0,0,0.4); display: block; transition: transform 0.1s;"></i>`;
    return el;
}

function createStartMarkerElement() {
    const el = document.createElement('div');
    el.innerHTML = `
        <div style="background: #10b981; width: 35px; height: 35px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            <span style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 14px;">A</span>
        </div>`;
    return el;
}

function createDestinationMarkerElement() {
    const el = document.createElement('div');
    el.innerHTML = `
        <div style="background: #ef4444; width: 35px; height: 35px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            <span style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 14px;">B</span>
        </div>`;
    return el;
}

// ============================
// 3. LOCATION & GPS TRACKING (Upgraded with Real Street Names)
// ============================
function useMyLocation(inputId, button) {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    
    // 🔥 THE BUG FIX: Erase the top search bar so it stops fighting with the GPS!
    const topSearch = document.getElementById('endLocation');
    if (topSearch) topSearch.value = "";

    if (button) { 
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
        button.disabled = true; 
    }

    const inputField = document.getElementById(inputId);
    if (inputField && !inputField.value) inputField.value = "Locating satellite...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Save coordinates
            if (inputId === 'startLocation') window.startCoords = [lng, lat];
            if (inputId === 'endLocationSheet') window.endCoords = [lng, lat];
            
            // 🔥 NEW: Reverse Geocoding to get the REAL address instead of "My Location"
            if (inputField) {
                inputField.value = "Pinpointing street...";
                fetch(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${CONFIG.TOMTOM_KEY}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.addresses && data.addresses.length > 0) {
                        // Put the real street/city name into the box!
                        inputField.value = data.addresses[0].address.freeformAddress;
                    } else {
                        inputField.value = "Current GPS Location";
                    }
                })
                .catch(err => {
                    console.error("Geocode error:", err);
                    inputField.value = "Current GPS Location";
                });
            }

            // Move the map
            if (map && map.isStyleLoaded()) {
                map.flyTo({ center: [lng, lat], zoom: 15 });
                if (typeof updateUserMarker === 'function') updateUserMarker(lat, lng, position.coords.heading || 0);
            }
            
            if (button) { 
                button.innerHTML = '<i class="fas fa-location-crosshairs"></i>'; 
                button.disabled = false; 
            }
        },
        (error) => {
            console.warn("GPS Error:", error.message);
            if (inputField && (inputField.value === "Locating satellite..." || inputField.value === "Pinpointing street...")) inputField.value = ""; 
            if (button) { 
                button.innerHTML = '<i class="fas fa-location-crosshairs"></i>'; 
                button.disabled = false; 
            }
            alert("Could not lock GPS. Make sure location permissions are allowed.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}
function startGPSTracking() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    console.log("📡 Searching for satellites...");

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, speed, heading, altitude, accuracy } = position.coords;
            const speedKmh = Math.round((speed * 3.6) || 0);
            
            // 🔥 REAL CAMERA DETECTION (Overpass API)
            scanForSpeedCameras(latitude, longitude);       
            if (isNavigating) checkCameraProximity(latitude, longitude);
            // 🔥 REAL ACCIDENT PROXIMITY (TomTom API)
            if (isNavigating) checkHazardProximity(latitude, longitude);

            lastPosition = { lat: latitude, lng: longitude };
            window.currentRealSpeed = speedKmh; 

            requestAnimationFrame(() => {
                updateUserMarker(latitude, longitude, heading || 0, accuracy);
                updateTelemetry(speedKmh, altitude);
                
                if (isNavigating && isGpsLocked) {
                    map.jumpTo({ center: [longitude, latitude] }); // Jump to avoid pan lag during high speeds
                }

                // Cloud Uplink (Throttle 5s) - Firebase
                if (Date.now() - lastUplinkTime > 5000) { 
                    uploadLiveTelemetry(latitude, longitude, speedKmh, heading);
                    lastUplinkTime = Date.now();
                }
            });

            // Auto-Reroute Logic
            if (isNavigating) {
                const distanceToRoute = checkDistanceToPath(latitude, longitude);
                if (distanceToRoute > 0.06) { 
                    console.log("⚠️ Off route! Recalculating...");
                    handleReroute();
                } else {
                    checkRouteProgress();
                }
            }
        },
        (err) => console.warn("GPS Signal Weak:", err.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
}

// ============================
// 4. ROUTE CALCULATION (OSRM + MapLibre Native)
// ============================
window.calculateRoute = async function() {
    const startInput = document.getElementById("startLocation");
    const endInput = document.getElementById("endLocation");
    const findBtn = document.getElementById("findRouteBtn");

    if (!startInput || !endInput) return;

    const startAddress = startInput.value.trim();
    const endAddress = endInput.value.trim();

    if (!startAddress || !endAddress) return window.showPremiumToast('⚠️ Missing Info', 'Please enter both locations', 'warning');

    try {
        if (findBtn) { findBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Analyzing...'; findBtn.disabled = true; }

        const [startCoords, endCoords] = await Promise.all([
            geocodeAddressToCoords(startAddress),
            geocodeAddressToCoords(endAddress)
        ]);

        if (!startCoords || !endCoords) throw new Error("Coordinates not found");

        window.startCoords = startCoords;
        window.endCoords = endCoords;

        const route = await calculateRouteOSRM(startCoords, endCoords);

        if (route) {
            // 1. UPDATE MARKERS
            if (startMarker) startMarker.remove();
            startMarker = new maplibregl.Marker({ element: createStartMarkerElement() })
                .setLngLat([startCoords.lng, startCoords.lat])
                .addTo(map);

            if (endMarker) endMarker.remove();
            endMarker = new maplibregl.Marker({ element: createDestinationMarkerElement() })
                .setLngLat([endCoords.lng, endCoords.lat])
                .addTo(map);

            // 2. DRAW ROUTE
            drawAnimatedRoute(route.coordinates);

            // 3. ZOOM TO FIT (Turf.js Bounding Box)
            const line = turf.lineString(route.coordinates);
            const bbox = turf.bbox(line); // [minLng, minLat, maxLng, maxLat]
            map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, animate: true, duration: 1500 });

            // 4. UPDATE UI
            currentRouteData = route; 
            remainingKm = route.distance_km;
            routeSteps = route.steps;
            currentStepIndex = 0;
            updateRouteInfoUI(route);
            
            // Slide up the Route Planner Bottom Sheet
            document.getElementById('routePlanningSheet').style.transform = "translateY(0)";
            
            // Update Destination Text in UI
            document.getElementById('destinationDisplay').innerText = endCoords.displayName || endAddress;

            const navBtn = document.getElementById("navActionBtn");
            if (navBtn) navBtn.disabled = false;
        }

    } catch (error) {
        console.error("❌ Route calculation failed:", error);
        window.showPremiumToast('⚠️ Route Error', error.message, 'error');
    } finally {
        if (findBtn) { findBtn.innerHTML = '<i class="fas fa-directions"></i>'; findBtn.disabled = false; }
    }
};

async function calculateRouteOSRM(start, end) {
    // 🛡️ ITEM 9: Loading State (Added before the fetch)
    if (typeof window.showPremiumToast === 'function') {
        window.showPremiumToast('⏳ Analyzing', 'Calculating optimal route...', 'info');
    }

    try {
        const startLng = start.lng, startLat = start.lat;
        const endLng = end.lng, endLat = end.lat;

        // OSRM perfectly matches MapLibre's [lng, lat] requirement!
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
        
        const response = await fetch(osrmUrl);
        
        // 🛡️ ITEM 1 & 8: Catch API Graceful Failure (If OSRM servers go down)
        if (!response.ok) {
            if (typeof window.showPremiumToast === 'function') {
                window.showPremiumToast('⚠️ Route Unavailable', 'Routing service temporarily down. Please retry.', 'error', 5000);
            }
            return null; // Safely exit without crashing
        }

        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            window.currentRouteLine = turf.lineString(route.geometry.coordinates);
            
            // 🔥 INJECT THE MATH ENGINE HERE: Updates the ETA UI immediately!
            if (route && route.summary) {
                if (typeof window.updateTransportETAs === 'function') {
                    window.updateTransportETAs(route.summary.lengthInMeters, route.summary.travelTimeInSeconds);
                }
            }

            // 🛡️ ITEM 4: "Clean State" UI (Confirming route loaded successfully)
            if (typeof window.showPremiumToast === 'function') {
                window.showPremiumToast('✅ Route Found', 'Path calculated successfully.', 'success', 4000);
            }

            // 🛡️ ITEM 6: Populate the Transparency Panel (Make it visible)
            const panel = document.getElementById('safetyTransparencyPanel');
            if (panel) {
                panel.style.display = 'block';
                // Because OSRM doesn't return weather/incidents directly, we just update the distance here
                const distanceUI = document.getElementById('bd-distance');
                if(distanceUI) distanceUI.innerText = `Distance: ${(route.distance / 1000).toFixed(1)} km`;
            }

            return {
                coordinates: route.geometry.coordinates, // Array of [lng, lat]
                steps: route.legs[0].steps.map(step => ({
                    instruction: step.maneuver.instruction,
                    distance: step.distance,
                    coordinates: step.geometry.coordinates
                })),
                distance_km: (route.distance / 1000).toFixed(1),
                duration_min: Math.round(route.duration / 60)
            };
        }
    } catch (error) { 
        console.error("❌ OSRM API Error:", error); 
        // 🛡️ Ultimate fallback if network is completely dead
        if (typeof window.showPremiumToast === 'function') {
            window.showPremiumToast('📡 Network Error', 'Could not reach routing servers. Check connection.', 'error');
        }
    }
    return null;
}

function drawAnimatedRoute(coords) {
    if (!map || !coords || coords.length === 0) return;

    // Direct update to MapLibre Source (High Performance)
    const geojson = { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': coords } };
    map.getSource(routeSourceId).setData(geojson);
    
    console.log("✅ Route Drawn on MapLibre");
}

// ============================
// 5. NAVIGATION ENGINE
// ============================
function startNavigation() {
    if (!currentRouteData) return window.showPremiumToast("⚠️ No Route", "Please calculate a route first", "warning");
    
    isNavigating = true;
    isGpsLocked = true; 
    startNavigationTime = Date.now();
    totalDistanceTraveled = 0;
    
    // UI Transitions (Bottom Sheets)
    document.getElementById('routePlanningSheet').style.transform = "translateY(150%)"; // Hide Planner
    document.getElementById('activeNavSheet').classList.remove('hidden');
    document.getElementById('activeNavSheet').style.transform = "translateY(0)"; // Show Nav HUD
    
    // Pitch the map into 3D Driving Mode
    map.easeTo({ pitch: 60, bearing: currentAnimPos.heading, zoom: 18, duration: 2000 });

    startGPSTracking();
    
    // Initial UI Fill
    document.getElementById('currentInstructionMain').innerHTML = `<span><i class="fas fa-arrow-up"></i> Head to starting point</span>`;
    window.showPremiumToast("🚀 Navigation Active", "GPS Locked. Drive Safely.", "✨");
    if(isVoiceActive) speak("Navigation started. Drive safely.");
}

function cancelNavigation() {
    isNavigating = false;
    isGpsLocked = false; 
    
    if (watchId) navigator.geolocation.clearWatch(watchId);
    if (simulationInterval) clearInterval(simulationInterval);
    
    // Reset Map View to 2D
    if (currentRouteData && currentRouteData.coordinates) {
        const line = turf.lineString(currentRouteData.coordinates);
        const bbox = turf.bbox(line); 
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, animate: true, duration: 1500, pitch: 0, bearing: 0 });
    }
    
    // UI Transitions
    document.getElementById('activeNavSheet').style.transform = "translateY(150%)";
    setTimeout(() => document.getElementById('activeNavSheet').classList.add('hidden'), 400);
    document.getElementById('routePlanningSheet').style.transform = "translateY(0)";
    
    window.showPremiumToast("🛑 Navigation Stopped", "Overview Mode", "✨");
}

window.simulateJourney = function() {
    if (!currentRouteData || !currentRouteData.coordinates) return window.showPremiumToast('⚠️ Error', 'Find a route first', '❌');

    if (simulationInterval) clearInterval(simulationInterval);
    if (watchId) navigator.geolocation.clearWatch(watchId);
    
    startNavigation(); // Triggers UI changes
    window.showPremiumToast('🔬 Simulation Mode', 'Simulating drive at 60 km/h...', '✨');

    let pointIndex = 0;
    const coords = currentRouteData.coordinates; // [lng, lat]

    simulationInterval = setInterval(() => {
        if (pointIndex >= coords.length) {
            clearInterval(simulationInterval);
            showArrivalPopup();
            cancelNavigation();
            return;
        }

        const [lng, lat] = coords[pointIndex];
        
        let heading = 0;
        if (pointIndex < coords.length - 1) {
            const next = coords[pointIndex + 1];
            // Turf.js bearing calculation is much more accurate for MapLibre
            const pt1 = turf.point([lng, lat]);
            const pt2 = turf.point([next[0], next[1]]);
            heading = turf.bearing(pt1, pt2);
        }

        updateUserMarker(lat, lng, heading);
        
        remainingKm = Math.max(0, (currentRouteData.distance_km - (pointIndex * 0.05))).toFixed(2);
        updateTelemetry(60, 100);

        // 🔥 THE RADAR: Checks for real accidents as the simulator drives
        checkHazardProximity(lat, lng);

        if(pointIndex % 10 === 0) checkRouteProgressSimulation(lat, lng);

        pointIndex++;
    }, 200);
};

// ============================
// 🚨 REAL HAZARD OVERLAY
// ============================
function drawRealHazards(congestionPoints) {
    if (!map) return;

    // 1. Clear old markers
    hazardMarkers.forEach(marker => marker.remove());
    hazardMarkers = [];
    activeHazards = [];
    hazardAlertTriggered.clear();

    if (!congestionPoints || congestionPoints.length === 0) return;

    // 2. Draw new markers from Python
    congestionPoints.forEach(hazard => {
        // Create custom red dot element
        const el = document.createElement('div');
        el.className = 'hazard-marker';
        el.innerHTML = `
            <div style="background: #ef4444; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); animation: pulse 2s infinite;">
                <i class="fa-solid fa-triangle-exclamation" style="color: white; font-size: 12px;"></i>
            </div>
        `;

        // Add CSS animation for pulsing if it doesn't exist
        if (!document.getElementById('hazardPulseStyles')) {
            const style = document.createElement('style');
            style.id = 'hazardPulseStyles';
            style.innerHTML = `@keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }`;
            document.head.appendChild(style);
        }

        // Add to map
        const marker = new maplibregl.Marker({ element: el })
            .setLngLat([hazard.location.lng, hazard.location.lat])
            .addTo(map);
            
        hazardMarkers.push(marker);
        
        // Save for the 500m Radar Check
        activeHazards.push({
            id: `${hazard.location.lat}-${hazard.location.lng}`,
            lat: hazard.location.lat,
            lng: hazard.location.lng,
            type: hazard.type,
            desc: hazard.description
        });
    });
    
    console.log(`⚠️ Rendered ${activeHazards.length} live hazards from TomTom.`);
}

function checkHazardProximity(userLat, userLng, accuracy = 0, speedMps = null) {
    // 🛡️ 1. GPS ACCURACY FILTER
    // If the phone is guessing its location by more than 60 meters, pause the radar to prevent false alarms.
    if (accuracy > 60) {
        console.warn(`📡 GPS accuracy too low (${Math.round(accuracy)}m). Radar paused.`);
        return; 
    }

    const userPt = turf.point([userLng, userLat]);

    // 🛡️ 2. OFF-ROUTE DETECTION
    // If the user is more than 100 meters away from the blue line, suppress alerts.
    if (window.currentRouteLine) {
        const distToRouteKm = turf.pointToLineDistance(userPt, window.currentRouteLine);
        if ((distToRouteKm * 1000) > 100) {
            console.log("⚠️ Vehicle is off-route. Suppressing hazard alerts.");
            // Optional: You can trigger a UI change here like document.getElementById('status').innerText = "Off Route";
            return; 
        }
    }

    if (!activeHazards || activeHazards.length === 0) return;

    // 🛡️ 3. SPEED-ADAPTIVE ALERT RADIUS
    // Convert meters per second (from GPS) to km/h. Default to 45 km/h if speed is null.
    const speedKmh = speedMps ? (speedMps * 3.6) : (window.currentSimulatedSpeed || 45);
    
    let alertRadius = 500; // Default suburban
    if (speedKmh > 80) alertRadius = 1000; // Highway: Alert earlier (1km)
    else if (speedKmh < 40) alertRadius = 300; // City traffic: Alert later (300m)

    activeHazards.forEach(hazard => {
        if (hazardAlertTriggered.has(hazard.id)) return;

        const hazardPt = turf.point([hazard.lng, hazard.lat]);
        const distMeters = turf.distance(userPt, hazardPt, {units: 'kilometers'}) * 1000;

        // THE DYNAMIC RADAR TRIGGER
        if (distMeters < alertRadius) {
            console.log(`🚨 DYNAMIC RADAR: Hazard is ${Math.round(distMeters)}m away (Speed: ${Math.round(speedKmh)}km/h).`);
            hazardAlertTriggered.add(hazard.id); 
            
            // Visual Alert
            if (typeof window.showPremiumToast === 'function') {
                window.showPremiumToast(`🚨 HAZARD IN ${Math.round(distMeters)}m`, hazard.desc, "error", 8000);
            }
            
            // Voice Alert
            if (typeof isVoiceActive !== 'undefined' && isVoiceActive && window.speechSynthesis) {
                // Ensure 'speak' function exists in your codebase
                if (typeof speak === 'function') {
                    speak(`Warning. ${hazard.desc} reported ahead in ${Math.round(distMeters)} meters. Please reduce speed.`);
                }
            }
            
            // Speed UI Flash
            const zenSpeed = document.getElementById('zenLiveSpeed');
            if (zenSpeed) {
                zenSpeed.style.color = "#ef4444";
                setTimeout(() => { zenSpeed.style.color = ""; }, 5000);
            }
        }
    });
}

// ============================
// 6. UI & HUD UPDATES
// ============================
function updateRouteInfoUI(route) {
    if (!route) return;

    // Safely update all IDs from the HTML
    const distMain = document.getElementById("routeDistanceMain");
    const riskMain = document.getElementById("recommendedRiskHudMain");
    const riskPanel = document.getElementById("recommendedRisk");
    const detailsEl = document.getElementById("recommendedDetails");
    const instructionList = document.getElementById("instructionListMain");

    if (distMain && route.distance_km) distMain.textContent = route.distance_km;

    // Populate Turn-by-Turn Steps
    if (instructionList && route.steps) {
        instructionList.innerHTML = '';
        route.steps.slice(0, 5).forEach(step => { // Show next 5 steps
            const li = document.createElement('li');
            li.style.padding = "8px 0";
            li.style.borderBottom = "1px solid #e2e8f0";
            li.innerHTML = `<strong>${step.instruction}</strong> <span style="color:var(--text-muted); float:right;">${(step.distance/1000).toFixed(1)} km</span>`;
            instructionList.appendChild(li);
        });
    }

    // 🔥 REAL DATA ONLY: Handle Backend Analytics
    if (route.analytics) {
        // 🟢 PYTHON DATA ARRIVED: Inject the real math!
        updateUIWithAnalytics(route.analytics);
        
        const realScore = route.analytics.safety_score || "--";
        
        if (riskMain) {
            riskMain.textContent = realScore;
            riskMain.className = `stat-value ${realScore > 80 ? 'text-success' : 'text-warning'}`;
        }
        if (riskPanel) {
            riskPanel.textContent = `Overall Safety Rating: ${realScore}%`;
            riskPanel.style.color = realScore > 80 ? "#10b981" : "#f59e0b";
        }
        if (detailsEl) {
            detailsEl.innerHTML = `AI Analysis: ${route.analytics.safety_description || 'Route analyzed successfully based on live constraints.'}`;
        }
    } else {
        // 🟡 WAITING FOR PYTHON: Show loading state
        if (riskMain) riskMain.textContent = "...";
        if (riskPanel) {
            riskPanel.textContent = `Overall Safety Rating: Analyzing...`;
            riskPanel.style.color = "#94a3b8"; // Neutral Gray
        }
        if (detailsEl) {
            detailsEl.innerHTML = `<i><i class="fas fa-spinner fa-spin"></i> Analyzing route safety parameters via Python AI...</i>`;
        }
        
        // Fallback for the Top Badge
        const safetyEl = document.getElementById('topSafety');
        if (safetyEl) {
            safetyEl.innerText = "Analyzing...";
            const pill = safetyEl.closest('.safety-pill');
            if (pill) {
                pill.style.color = "#94a3b8";
                pill.style.background = "rgba(148, 163, 184, 0.15)";
            }
        }
    }

    if (route.duration_min) updateETA(route.duration_min);
}

// 🔥 HELPER: Specific Logic for Backend Analytics Data
function updateUIWithAnalytics(analytics) {
    const safetyEl = document.getElementById('topSafety');
    if (!safetyEl) return;

    // Set the text from the Python 'safety_description'
    safetyEl.innerText = analytics.safety_description.split(' - ')[0]; // e.g. "Excellent"

    // Change color based on score from Python engine
    const score = analytics.safety_score;
    const pill = safetyEl.closest('.safety-pill');
    if (!pill) return;
    
    if (score >= 80) {
        pill.style.color = "#10b981"; // Green
        pill.style.background = "rgba(16, 185, 129, 0.15)";
    } else if (score >= 60) {
        pill.style.color = "#f59e0b"; // Orange
        pill.style.background = "rgba(245, 158, 11, 0.15)";
    } else {
        pill.style.color = "#ef4444"; // Red
        pill.style.background = "rgba(239, 68, 68, 0.15)";
    }
}

function updateETA(durationMinutes) {
    const etaMain = document.getElementById("etaDisplayMain");
    if (etaMain) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + parseInt(durationMinutes));
        etaMain.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

function updateTelemetry(speedKmh, altitude) {
    const safeSpeed = speedKmh || 0; 
    
    // 1. Standard UI Updates
    const speedEl = document.getElementById('routeSpeedMain');
    const distEl = document.getElementById('routeDistanceMain');
    if (speedEl) speedEl.textContent = safeSpeed;
    if (distEl && typeof remainingKm !== 'undefined') distEl.textContent = remainingKm;
    
    // 🔥 2. REAL GPS FOR THE ZEN DASHBOARD
    const zenSpeed = document.getElementById('zenLiveSpeed');
    if (zenSpeed) zenSpeed.innerText = safeSpeed; // Feeds hardware GPS speed to UI

    const zenDist = document.getElementById('zenTotalDistance');
    if (zenDist && typeof remainingKm !== 'undefined') {
        // Update the UI Text
        if (remainingKm >= 1) {
            zenDist.innerText = parseFloat(remainingKm).toFixed(1) + " km";
        } else {
            zenDist.innerText = Math.round(remainingKm * 1000) + " m";
        }

        // 🏁 THE ARRIVAL TRIGGER 
        if (remainingKm <= 0.015) { // If you are within 15 meters
            console.log("📍 Within 15 meters of destination. Arriving!");
            
            if (typeof window.triggerArrivalSequence === 'function') {
                window.triggerArrivalSequence();
            }
            
            return; // 🛑 CRITICAL: This stops the GPS loop from running anymore!
        }
    } 

    // 3. Hardware Speed Limit Warnings
    if (typeof currentSpeedLimit !== 'undefined' && currentSpeedLimit && safeSpeed > currentSpeedLimit) {
        if(speedEl) speedEl.style.color = "var(--danger)";
        if(zenSpeed) zenSpeed.style.color = "#ef4444"; // Red in Zen Mode
        const warningEl = document.getElementById('speedWarning');
        if (warningEl) warningEl.classList.remove('hidden');
    } else {
        if(speedEl) speedEl.style.color = "var(--primary)";
        if(zenSpeed) zenSpeed.style.color = "#4ade80"; // Green in Zen Mode
        const warningEl = document.getElementById('speedWarning');
        if (warningEl) warningEl.classList.add('hidden');
    }
}

// ============================
// 7. PHOTON GEOCODER & AUTOCOMPLETE
// ============================
async function geocodeAddressToCoords(address) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lat=20.59&lon=78.96`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].geometry.coordinates; 
            const props = data.features[0].properties;
            return { lat, lng, displayName: `${props.name}, ${props.city || props.state || ''}` };
        }
    } catch (err) { console.error("Photon Error:", err); }
    return null;
}

function geocodeAddress(lat, lng, inputId) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) {
                const input = document.getElementById(inputId);
                if (input) input.value = data.display_name.split(",").slice(0, 3).join(",");
            }
        }).catch(err => console.error(err));
}

// ==========================================
// 🔍 PREMIUM AUTOCOMPLETE & BULLETPROOF BUTTONS
// ==========================================
setTimeout(() => {
    const topSearchInput = document.getElementById('endLocation');
    const autocompleteResults = document.getElementById('autocompleteResults');
    const searchBtn = document.getElementById('triggerSearchBtn');
    const directionsBtn = document.getElementById('findRouteBtn');
    const swapBtn = document.getElementById('reverseRouteBtn'); 
    const myLocBtn = document.getElementById('btnMyLocation'); // Added up here!
    let searchTimeout;

    if (!topSearchInput || !autocompleteResults) return;

    // 1. ⌨️ The Typing Logic (Autocomplete)
    topSearchInput.oninput = function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        if (query.length < 3) {
            autocompleteResults.style.display = 'none';
            return;
        }
// Debounce: Wait 300ms...
        searchTimeout = setTimeout(() => {
            // Defaults to Mysuru so local places pop up faster!
            const mapCenter = typeof map !== 'undefined' ? map.getCenter() : { lat: 12.2958, lng: 76.6394 };
            
            // 🧠 GOOGLE-STYLE SMART SEARCH (Typeahead + India + Everything)
            const searchUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${CONFIG.TOMTOM_KEY}&typeahead=true&countrySet=IN&lat=${mapCenter.lat}&lon=${mapCenter.lng}&limit=5&language=en-US`;
            
            fetch(searchUrl)
                .then(res => res.json())
            .then(data => {
                autocompleteResults.innerHTML = ''; 
                
                if (data.results && data.results.length > 0) {
                    data.results.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        
                        const mainName = item.poi ? item.poi.name : item.address.freeformAddress;
                        const subText = item.address.countrySecondarySubdivision || item.address.country || '';
                        
                        div.innerHTML = `
                            <i class="fa-solid fa-location-dot" style="color: var(--text-muted); margin-right: 10px; font-size: 14px;"></i>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-weight: 600; color: var(--text-main); font-size: 13px;">${mainName}</span>
                                <span style="font-size: 11px; color: var(--text-muted);">${subText}</span>
                            </div>
                        `;
                        
                        // WHEN YOU CLICK A SUGGESTION
                      div.onclick = () => {
                            topSearchInput.value = mainName; 
                            autocompleteResults.style.display = 'none'; 
                            
                            // 🔥 Changed back to endCoords so it acts as your Destination!
                            window.endCoords = [item.position.lon, item.position.lat];
                            
                            if (typeof map !== 'undefined' && map.flyTo) {
                                map.flyTo({ center: window.endCoords, zoom: 14, speed: 1.5 });
                            }
                        };
                        
                        autocompleteResults.appendChild(div);
                    });
                    autocompleteResults.style.display = 'block';
                } else {
                    autocompleteResults.style.display = 'none';
                }
            })
            .catch(err => console.error("Autocomplete error:", err));
        }, 300);
    };

    // 2. 🔍 The Magnifying Glass Button
    if (searchBtn) {
        searchBtn.onclick = function(e) {
            e.preventDefault(); 
            // If they already picked a place, center the map on it again
            if (window.endCoords && topSearchInput.value.length > 0) {
                if (typeof map !== 'undefined' && map.flyTo) map.flyTo({ center: window.endCoords, zoom: 14 });
            } else {
                // Otherwise, open the typing dropdown
                topSearchInput.focus();
                topSearchInput.dispatchEvent(new Event('input')); 
            }
        };
    }
// 3. 🚙 The Directions Button (Transfers Search to DESTINATION Location)
    if (directionsBtn) {
        directionsBtn.onclick = function(e) {
            e.preventDefault(); 
            
            const bottomSheetClass = document.querySelector('.bottom-sheet'); 
            const bottomSheetStart = document.getElementById('startLocation');
            const bottomSheetDest = document.getElementById('endLocationSheet');

            // Slide panel up
            if (bottomSheetClass) {
                bottomSheetClass.classList.add('active'); 
            }

            // Always auto-trigger GPS for the Start location if it's empty
            if (bottomSheetStart && (!bottomSheetStart.value || bottomSheetStart.value === "")) {
                if(typeof useMyLocation === 'function') useMyLocation("startLocation", null);
            }

            // 🔥 Transfer top search text down to the DESTINATION box
            if (window.endCoords && topSearchInput.value) {
                if (bottomSheetDest) {
                    bottomSheetDest.value = topSearchInput.value;
                }
            }

            // Calculate if both are filled
            if (window.startCoords && window.endCoords && typeof window.calculateRoute === 'function') {
                window.calculateRoute();
            }
        };
    }

// 4. 🔄 The Swap Button (CLONED to destroy old ghost bugs)
    let oldSwapBtn = document.getElementById('reverseRouteBtn');
    if (oldSwapBtn) {
        // This copies the button but strips away ALL old, hidden bugs
        let swapBtn = oldSwapBtn.cloneNode(true);
        oldSwapBtn.parentNode.replaceChild(swapBtn, oldSwapBtn);

        // Now we attach our perfect logic to the clean button
        swapBtn.addEventListener('click', function(e) {
            e.preventDefault(); 
            
            const bottomStart = document.getElementById('startLocation');
            const bottomDest = document.getElementById('endLocationSheet');
            const topSearch = document.getElementById('endLocation');

            if (!bottomStart || !bottomDest) return;

            // Grab the current text exactly as it is
            const startText = bottomStart.value;
            const destText = bottomDest.value;

            // Swap them flawlessly
            bottomStart.value = destText;
            bottomDest.value = startText;

            // Make sure the top search bar matches the new destination
            if (topSearch) topSearch.value = startText;

            // Swap the hidden GPS coordinates
            const tempCoords = window.startCoords;
            window.startCoords = window.endCoords;
            window.endCoords = tempCoords;

            // Recalculate the route automatically
            if (window.startCoords && window.endCoords && typeof window.calculateRoute === 'function') {
                window.calculateRoute();
            }
        });
    }

    // 5. 📍 The Floating "My Location" Target Button
    if (myLocBtn) {
        myLocBtn.onclick = function(e) {
            e.preventDefault();
            if (typeof useMyLocation === 'function') {
                useMyLocation('startLocation', myLocBtn);
            }
        };
    }

    // 6. Close dropdown if clicked outside
    document.addEventListener('click', (e) => {
        if (!topSearchInput.contains(e.target) && !autocompleteResults.contains(e.target) && e.target !== searchBtn) {
            autocompleteResults.style.display = 'none';
        }
    });
}, 500);

// ============================
// 8. GOOGLE TRAFFIC OVERLAY
// ============================
document.getElementById("trafficToggleBtn")?.addEventListener("click", () => {
    if (!map) return;
    isTrafficActive = !isTrafficActive;
    const btn = document.getElementById("trafficToggleBtn");

    if (isTrafficActive) {
        // MapLibre Raster Source Integration
        if (!map.getSource('google-traffic')) {
            map.addSource('google-traffic', { type: 'raster', tiles: ['https://mt0.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}'], tileSize: 256 });
            map.addLayer({ id: 'google-traffic-layer', type: 'raster', source: 'google-traffic', paint: {'raster-opacity': 0.8} }, routeLayerId); // Add below route line
        } else {
            map.setLayoutProperty('google-traffic-layer', 'visibility', 'visible');
        }
        btn.style.background = "var(--danger)"; btn.style.color = "white";
        window.showPremiumToast('🚦 Traffic On', 'Live Google Traffic Data Active', '✨');
    } else {
        if (map.getLayer('google-traffic-layer')) map.setLayoutProperty('google-traffic-layer', 'visibility', 'none');
        btn.style.background = "var(--glass-bg)"; btn.style.color = "var(--text-main)";
        window.showPremiumToast('🌑 Traffic Off', 'Base map restored', '✨');
    }
});

// ============================
// 9. SMOOTH ANIMATION ENGINE
// ============================
function updateUserMarker(lat, lng, heading = 0, accuracy = 0) {
    if (!map) return;

    if (!userMarker) {
        currentAnimPos = { lat, lng, heading };
        targetAnimPos = { lat, lng, heading };

        userMarker = new maplibregl.Marker({ element: createUserMarkerElement() })
            .setLngLat([lng, lat])
            .addTo(map);

        startAnimationLoop();
    } else {
        targetAnimPos = { lat, lng, heading };
        if (heading === 0 && currentAnimPos.heading !== 0) targetAnimPos.heading = currentAnimPos.heading;
    }
}

function startAnimationLoop() {
    if (animFrameId) cancelAnimationFrame(animFrameId);

    function animate() {
        if (userMarker && targetAnimPos) {
            const speed = CONFIG_APP.animations.markerSmoothness; 
            
            currentAnimPos.lat += (targetAnimPos.lat - currentAnimPos.lat) * speed;
            currentAnimPos.lng += (targetAnimPos.lng - currentAnimPos.lng) * speed;
            
            let deltaAngle = (targetAnimPos.heading - currentAnimPos.heading);
            while (deltaAngle > 180) deltaAngle -= 360;
            while (deltaAngle < -180) deltaAngle += 360;
            currentAnimPos.heading += deltaAngle * speed;

            userMarker.setLngLat([currentAnimPos.lng, currentAnimPos.lat]);

            const arrowEl = document.getElementById('userArrow');
            if (arrowEl) arrowEl.style.transform = `rotate(${currentAnimPos.heading}deg)`;

            if (isNavigating) {
                map.jumpTo({ center: [currentAnimPos.lng, currentAnimPos.lat], bearing: currentAnimPos.heading }); 
            }
        }
        animFrameId = requestAnimationFrame(animate);
    }
    animFrameId = requestAnimationFrame(animate);
}

// ============================
// 10. OVERPASS SPEED CAMERAS
// ============================
async function scanForSpeedCameras(lat, lng) {
    const now = Date.now();
    if (realSpeedCameras.length > 0 && (now - lastCamScanTime < 180000)) return;

    lastCamScanTime = now;
    const query = `[out:json];(node["highway"="speed_camera"](around:5000,${lat},${lng});node["man_made"="surveillance"]["surveillance:type"="speed_camera"](around:5000,${lat},${lng}););out body;`;

    try {
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.elements) {
            realSpeedCameras = data.elements.map(cam => ({ lat: cam.lat, lng: cam.lon }));
        }
    } catch (e) { console.warn("Camera Scan Error:", e); }
}

function checkCameraProximity(userLat, userLng) {
    if (activeCamAlertID) return; 

    for (const cam of realSpeedCameras) {
        const pt1 = turf.point([userLng, userLat]);
        const pt2 = turf.point([cam.lng, cam.lat]);
        const dist = turf.distance(pt1, pt2, {units: 'meters'});

        if (dist <= 1000 && dist > 50) { 
            triggerRealCameraAlert(dist);
            break; 
        }
    }
}

function triggerRealCameraAlert(startDistance) {
    activeCamAlertID = true;
    const camBox = document.getElementById('cameraAlertBox');
    const camLimit = document.getElementById('camLimit');
    
    if(camBox) {
        camBox.classList.remove('hidden');
        if(camLimit) camLimit.innerText = "60"; // Example Limit
        
        if (isVoiceActive) speak(`Caution. Speed camera ahead.`);
        
        setTimeout(() => {
            camBox.classList.add('hidden');
            setTimeout(() => { activeCamAlertID = false; }, 60000); // 1 min cooldown
        }, 15000);
    }
}

// ============================
// 11. FIREBASE & UTILITIES
// ============================
async function uploadLiveTelemetry(lat, lng, speed, heading) {
    if (typeof firebase === 'undefined') return;
    const user = firebase.auth().currentUser;
    if (!user) return; 

    try {
        await firebase.firestore().collection('users').doc(user.uid).update({
            location: new firebase.firestore.GeoPoint(lat, lng),
            heading: heading, speed: speed,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            status: "active" 
        });
    } catch (e) { console.warn("Uplink skipped:", e.message); }
}

function checkDistanceToPath(uLat, uLng) {
    if (!currentRouteData) return 0;
    const pt = turf.point([uLng, uLat]);
    const line = turf.lineString(currentRouteData.coordinates);
    return turf.pointToLineDistance(pt, line, {units: 'kilometers'});
}

function checkRouteProgressSimulation(lat, lng) {
    if (routeSteps.length > 0 && currentStepIndex < routeSteps.length - 1) {
        const step = routeSteps[currentStepIndex];
        const stepPt = turf.point([step.coordinates[0][0], step.coordinates[0][1]]);
        const userPt = turf.point([lng, lat]);
        const dist = turf.distance(userPt, stepPt, {units: 'meters'});

        if (dist < 50) { 
            document.getElementById('currentInstructionMain').innerHTML = `<span><i class="fas fa-arrow-turn-right"></i> ${step.instruction}</span>`;
            if (isVoiceActive) speak(step.instruction);
            currentStepIndex++;
        }
    }
}

function handleReroute() {
    if (window.isRecalculating) return;
    window.isRecalculating = true;
    window.showPremiumToast("🔄 Recalculating", "Adjusting path...", "✨");
    
    setTimeout(async () => {
        if (lastPosition && endMarker) {
            const startCoords = { lat: lastPosition.lat, lng: lastPosition.lng };
            const endLngLat = endMarker.getLngLat();
            const endCoords = { lat: endLngLat.lat, lng: endLngLat.lng };
            const route = await calculateRouteOSRM(startCoords, endCoords);
            
            if (route) {
                currentRouteData = route;
                drawAnimatedRoute(route.coordinates);
                updateRouteInfoUI(route);
            }
            setTimeout(() => { window.isRecalculating = false; }, 5000);
        }
    }, 1000);
}

function showArrivalPopup() {
    window.showPremiumToast("🏁 Arrived", "You have reached your destination.", "✨");
    if(isVoiceActive) speak("You have arrived at your destination.");
}

function speak(text) {
    if (!('speechSynthesis' in window) || !isVoiceActive) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = CONFIG_APP.voice.rate;
    window.speechSynthesis.speak(utterance);
}

document.getElementById('aiAdviceBtn')?.addEventListener('click', () => {
    document.getElementById('safetyAnalysisSheet').classList.remove('hidden');
    document.getElementById('routePlanningSheet').style.transform = "translateY(150%)";
});

// EVENT LISTENERS
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initMap, 200);
    document.getElementById("btnMyLocation")?.addEventListener("click", () => useMyLocation("startLocation", document.getElementById("btnMyLocation")));
    document.getElementById("findRouteBtn")?.addEventListener("click", window.calculateRoute);
    document.getElementById("navActionBtn")?.addEventListener("click", startNavigation);
    document.getElementById("cancelNavBtn")?.addEventListener("click", cancelNavigation);
    document.getElementById("simulateBtn")?.addEventListener("click", window.simulateJourney);
    
    document.getElementById("voiceToggleBtn")?.addEventListener("click", function() {
        isVoiceActive = !isVoiceActive;
        this.style.background = isVoiceActive ? "var(--glass-bg)" : "var(--danger)";
        this.style.color = isVoiceActive ? "var(--text-main)" : "white";
        window.showPremiumToast(isVoiceActive ? "🔊 Voice On" : "🔇 Voice Off", "", "✨");
    });
    
    document.getElementById("btnZoomIn")?.addEventListener("click", () => map.zoomIn());
    document.getElementById("btnZoomOut")?.addEventListener("click", () => map.zoomOut());
    
    document.getElementById("fullScreenBtn")?.addEventListener("click", () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    });
});
// ==========================================
// 🚨 RESTORED CORE LOGIC (Admin, Wake Lock, Reverse)
// ==========================================

// 1. Reverse Locations Button Logic
window.reverseLocations = function() {
    const startInput = document.getElementById("startLocation");
    const endInput = document.getElementById("endLocation");
    
    if (startInput && endInput) {
        const temp = startInput.value;
        startInput.value = endInput.value;
        endInput.value = temp;
        
        // Swap markers if they exist
        if (startMarker && endMarker) {
            const startPos = startMarker.getLngLat();
            const endPos = endMarker.getLngLat();
            
            startMarker.setLngLat(endPos);
            endMarker.setLngLat(startPos);
        }
        
        // Swap the global coords
        if (window.startCoords && window.endCoords) {
            const tempCoords = window.startCoords;
            window.startCoords = window.endCoords;
            window.endCoords = tempCoords;
        }
        
        window.showPremiumToast("🔄 Swapped", "Start and destination reversed", "✨");
    }
};
document.getElementById("reverseRouteBtn")?.addEventListener("click", window.reverseLocations);

// 2. Firebase Admin System Alerts
document.addEventListener("DOMContentLoaded", () => {
    if (typeof firebase !== 'undefined') {
        const db = firebase.firestore();
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        db.collection('system_alerts')
          .where('timestamp', '>', fiveMinsAgo)
          .onSnapshot(snapshot => {
              snapshot.docChanges().forEach(change => {
                  if (change.type === "added") {
                      window.showPremiumToast('🚨 ADMIN ALERT', change.doc.data().message, '📢', 10000);
                      const alarm = document.getElementById('alarmSound');
                      if(alarm) alarm.play().catch(e => console.log("Audio blocked"));
                  }
              });
          });
    }
});

// 3. Screen Wake Lock (Keep screen on while driving)
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('💡 Screen Wake Lock Active');
        }
    } catch (err) { console.warn("Wake Lock Error:", err.message); }
}
document.getElementById('navActionBtn')?.addEventListener('click', () => {
    if (isNavigating) requestWakeLock();
});
// ==========================================
// 📱 SWIPEABLE BOTTOM SHEET LOGIC
// ==========================================
function setupBottomSheetSwipe() {
    const sheet = document.getElementById('routePlanningSheet');
    const handle = sheet.querySelector('.sheet-drag-handle');
    if (!sheet || !handle) return;

    let startY = 0;
    let currentY = 0;
    let isCollapsed = false;

    // 1. Tap to toggle
    handle.addEventListener('click', () => {
        isCollapsed ? expandSheet() : collapseSheet();
    });

    // 2. Dragging logic (Mobile Touch)
    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        sheet.style.transition = 'none'; // Disable animation while finger is moving it
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        let deltaY = currentY - startY;

        // Prevent dragging above the original position
        if (!isCollapsed && deltaY < 0) deltaY = 0; 

        let translateY = isCollapsed ? (window.innerHeight - 150) + deltaY : deltaY;
        sheet.style.transform = `translateY(${Math.max(0, translateY)}px)`;
    }, { passive: true });

    handle.addEventListener('touchend', () => {
        sheet.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // Re-enable snappy animation
        let deltaY = currentY - startY;

        // If swiped more than 40px down, collapse it. Otherwise, snap back.
        if (deltaY > 40 && !isCollapsed) {
            collapseSheet();
        } else if (deltaY < -40 && isCollapsed) {
            expandSheet();
        } else {
            isCollapsed ? collapseSheet() : expandSheet();
        }
    });

    // Helper functions
    function collapseSheet() {
        // Hides everything except the top 40px (just the drag handle)
        sheet.style.transform = 'translateY(calc(100% - 40px))';
        isCollapsed = true;
    }

    function expandSheet() {
        sheet.style.transform = 'translateY(0)';
        isCollapsed = false;
    }
}

// Run it when the page loads
document.addEventListener("DOMContentLoaded", setupBottomSheetSwipe);

// ==========================================
// 🌙 AUTO-SYNC DARK MODE (Fixed - No Freezing!)
// ==========================================

// 1. The Map Switcher Function
window.toggleDarkMode = function(isDark) {
    // If map isn't loaded, or it's already in the correct theme, do nothing!
    if (!map || currentMapTheme === isDark) return; 
    
    currentMapTheme = isDark; // Lock it in

    // Change the MapLibre Tiles (basic_night vs basic_main)
    const TOMTOM_KEY = CONFIG.TOMTOM_KEY;
    const styleName = isDark ? 'basic_night' : 'basic_main';
   const newStyleUrl = `https://api.tomtom.com/map/1/style/20.0.0-8/${styleName}.json?key=${TOMTOM_KEY}&language=en-US`;
    
    map.setStyle(newStyleUrl);
    
    // Re-draw the blue route line after the new dark/light style loads
    map.once('styledata', () => {
        if (!map.getSource(routeSourceId)) {
            map.addSource(routeSourceId, {
                'type': 'geojson',
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': [] } }
            });
            map.addLayer({
                'id': routeLayerId,
                'type': 'line',
                'source': routeSourceId,
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': { 'line-color': '#2563eb', 'line-width': 6, 'line-opacity': 0.9 }
            });
            
            if (window.currentRouteData) {
                window.drawAnimatedRoute(window.currentRouteData.coordinates);
            }
        }
    });
};

// 2. The Watcher (Detects when Navbar button is clicked)
document.addEventListener("DOMContentLoaded", () => {
    // Check if the page loaded in dark mode initially
    const isInitiallyDark = document.body.getAttribute('data-theme') === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
    if (isInitiallyDark) {
        setTimeout(() => window.toggleDarkMode(true), 500); // Wait 0.5s for map to init
    }

    // Watch the HTML and Body tags for changes made by the Navbar
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
                // Check if the theme was set to dark
                const isDark = document.body.getAttribute('data-theme') === 'dark' || 
                               document.documentElement.getAttribute('data-theme') === 'dark' ||
                               document.body.classList.contains('dark-mode');
                               
                window.toggleDarkMode(isDark);
            }
        });
    });

    // Start watching
    observer.observe(document.body, { attributes: true });
    observer.observe(document.documentElement, { attributes: true });
});
// ==========================================
// 🔍 PREMIUM AUTOCOMPLETE (Google Maps Style)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById('endLocation');
    const autocompleteResults = document.getElementById('autocompleteResults');
    let searchTimeout;

    if (!searchInput || !autocompleteResults) return;

    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        // Only search if user typed at least 3 letters
        if (query.length < 3) {
            autocompleteResults.style.display = 'none';
            return;
        }

        // Debounce: Wait 300ms after they stop typing before asking TomTom (Saves API calls and speeds up app)
        searchTimeout = setTimeout(() => {
fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?key=${CONFIG.TOMTOM_KEY}&limit=5&typeahead=true&language=en-US`)
            .then(res => res.json())
            .then(data => {
                autocompleteResults.innerHTML = ''; // Clear old results
                
                if (data.results && data.results.length > 0) {
                    data.results.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        
                        // Smart formatting: If it's a place (like Starbucks), show name. If it's a house, show address.
                        const mainName = item.poi ? item.poi.name : item.address.freeformAddress;
                        const subText = item.address.countrySecondarySubdivision || item.address.country || 'Location';
                        
                        div.innerHTML = `
                            <i class="fa-solid fa-location-dot" style="color: var(--text-muted); margin-right: 15px; font-size: 18px;"></i>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-weight: 600; color: var(--text-main); font-size: 15px;">${mainName}</span>
                                <span style="font-size: 12px; color: var(--text-muted);">${subText}</span>
                            </div>
                        `;

                        // WHEN YOU CLICK A SUGGESTION (Top Search Bar)
                        div.onclick = () => {
                            searchInput.value = mainName; // Fill the box 
                            autocompleteResults.style.display = 'none'; // Hide dropdown
                            
                            // 1. Save to Destination (endCoords)
                            window.endCoords = [item.position.lon, item.position.lat];
                            console.log("📍 Destination selected:", window.endCoords);
                            
                            // 2. Fly the map instantly to the searched location
                            if (typeof map !== 'undefined' && map.flyTo) {
                                map.flyTo({ center: window.endCoords, zoom: 14, speed: 1.5 });
                            }

                            // 3. 🔥 MAGIC AUTO-DRAW LOGIC
                            // If we have both a start and an end, draw the route instantly!
                            if (window.startCoords && window.endCoords) {
                                console.log("🛣️ Both coordinates locked! Calculating route...");
                                if (typeof calculateRoute === 'function') {
                                    calculateRoute();
                                } else if (typeof window.calculateRoute === 'function') {
                                    window.calculateRoute();
                                }
                            }
                        };
                        
                        // 🔥 THIS WAS MISSING: Actually put the result into the dropdown list!
                        autocompleteResults.appendChild(div);
                    });
                    
                    // Show the dropdown once it's built
                    autocompleteResults.style.display = 'block';
                } else {
                    autocompleteResults.style.display = 'none';
                }
            })
            .catch(err => console.error("Autocomplete error:", err)); // 🔥 THESE BRACKETS WERE MISSING!
        }, 300);
    });

    // Close dropdown if user clicks anywhere else on the map
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteResults.contains(e.target)) {
            autocompleteResults.style.display = 'none';
        }
    });
});
// ==========================================
// 🧘‍♂️ ZEN MODE LOGIC & BUTTERY SMOOTH GPS
// ==========================================


function startZenMode() {
    console.log("🚗 Entering Zen Mode...");
    
    // 1. UI CLEANUP (Keeping your good logic!)
    const topSearch = document.querySelector('.top-search-container');
    const bottomSheet = document.querySelector('.bottom-sheet');
    const zenBanner = document.getElementById('zenNavBanner');
    
    if (topSearch) topSearch.classList.add('hide-for-zen');
    
    if (bottomSheet) {
        bottomSheet.classList.remove('active'); 
        setTimeout(() => bottomSheet.classList.add('hide-for-zen'), 300); 
    }
    
    if (zenBanner) {
        zenBanner.style.display = 'flex';
        setTimeout(() => zenBanner.style.transform = 'translateY(0)', 50);
    }
    const bottomExit = document.getElementById('zenBottomBar');
    if (bottomExit) bottomExit.style.display = 'block';
    
    // 2. 🎥 THE BUTTERY SMOOTH ENGINE
    if (navigator.geolocation) {
        // Initial "Fly-in" to look cool
        if (typeof map !== 'undefined' && window.startCoords) {
            map.flyTo({ center: window.startCoords, zoom: 18, pitch: 60, speed: 1.2 });
        }

        // Start watching the user move in real-time
        navWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, heading } = position.coords;
                const userHeading = heading || 0;
                
                window.startCoords = [longitude, latitude]; 

                if (typeof map !== 'undefined') {
                    // 🔥 THE GOOGLE MAPS SECRET: easeTo + bearing
                    map.easeTo({
                        center: [longitude, latitude],
                        bearing: userHeading, // Rotates map to follow your face/car!
                        pitch: 60,           // 3D Tilt
                        zoom: 18,            // Close-up street view
                        duration: 1000,      // Smoothly glides for 1 second
                        easing: (t) => t     // Makes the motion linear and fluid
                    });
                }

                // Update the icon on the map to show orientation
                if (typeof updateUserMarker === 'function') {
                    updateUserMarker(latitude, longitude, userHeading);
                }
            },
            (err) => console.warn("GPS Watch Error:", err),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    }
}

// ==========================================
// 🛣️ MASTER ROUTE CALCULATOR (Dual-Engine: TomTom + Python)
// ==========================================
window.calculateRoute = function() {
    if (!window.startCoords || !window.endCoords) {
        console.warn("⚠️ Missing coordinates for route calculation.");
        return;
    }

    console.log("🛣️ Fetching route from TomTom...");

    // TomTom requires coordinates in Latitude,Longitude order for the routing API
    const start = `${window.startCoords[1]},${window.startCoords[0]}`; 
    const end = `${window.endCoords[1]},${window.endCoords[0]}`; 

    const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${start}:${end}/json?key=${CONFIG.TOMTOM_KEY}&routeType=fastest&traffic=true&instructionsType=text&travelMode=${window.currentTravelMode || 'car'}`;

    // 1. FETCH TOMTOM (For Map Drawing & 60FPS Simulation)
    fetch(routeUrl)
        .then(res => res.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                
                // Save the driving instructions globally so the Simulator can read them
                if (data.routes[0].guidance && data.routes[0].guidance.instructions) {
                    window.routeInstructions = data.routes[0].guidance.instructions;
                }

                // Convert TomTom's points into a format MapLibre understands
                const coordinates = data.routes[0].legs[0].points.map(p => [p.longitude, p.latitude]);
                
                const geojson = {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates
                    }
                };

                // Draw the Blue Line on the Map
                if (map.getSource('route')) {
                    map.getSource('route').setData(geojson); 
                } else {
                    map.addSource('route', { type: 'geojson', data: geojson });
                    map.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: 'route',
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': '#3b82f6', 'line-width': 6 } 
                    });
                }

                // Neatly zoom the camera out
                const bounds = new maplibregl.LngLatBounds();
                coordinates.forEach(point => bounds.extend(point));
                map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
                
                console.log("✅ Route successfully drawn on the map!");
                if (typeof window.updateRealTransportETAs === 'function') window.updateRealTransportETAs();
                // ==========================================
                // 🔥 2. FETCH PYTHON BACKEND (For Safety, Weather & Analytics)
                // ==========================================
                console.log("🧠 Fetching AI Analytics from Python Backend...");
                
                const requestData = {
                    start: { lat: window.startCoords[1], lng: window.startCoords[0] },
                    end: { lat: window.endCoords[1], lng: window.endCoords[0] },
                    speed: 65,
                    preferences: {
                        aqi_weight: parseInt(document.getElementById('aqiWeight')?.value || 2),
                        heat_weight: parseInt(document.getElementById('heatWeight')?.value || 2),
                        risk_tolerance: document.getElementById('riskVal')?.innerText.toLowerCase() || 'balanced',
                        avoid_hazards: document.getElementById('hazardToggle')?.checked ?? true
                    }
                };

                // NOTE: Change this URL if your Flask backend is hosted online (e.g., https://your-app.com/calculate)
               const backendUrl = 'http://127.0.0.1:5000/api/route/calculate';

                fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                })
                .then(res => res.json())
                .then(backendData => {
                    if (backendData.success) {
                        // 🟢 DYNAMIC RISK COLORING 🔴
// SafeNav Logic: Lower score is safer. <50 Green, 50-100 Yellow, >100 Red.
if (backendData.route.analytics && backendData.route.analytics.safety_score) {
    const exposureScore = backendData.route.analytics.safety_score;
    let routeColor = '#10b981'; // Default Green (Safe)
    
    if (exposureScore > 100) {
        routeColor = '#ef4444'; // Red (High Risk)
    } else if (exposureScore >= 50) {
        routeColor = '#f59e0b'; // Yellow (Moderate)
    }

    // Repaint the MapLibre line instantly
    if (map.getLayer('route-line')) {
        map.setPaintProperty('route-line', 'line-color', routeColor);
    }
}
                        console.log("🎯 Python Data Received!", backendData);
                        
                      // Update the Safety Score and bottom sheet using Python data!
                        if (typeof updateRouteInfoUI === 'function') {
                            updateRouteInfoUI(backendData.route);
                        }

                        // 🔥 NEW: Draw the real TomTom accidents on the map!
                        if (backendData.route.analytics && backendData.route.analytics.congestion_points) {
                            drawRealHazards(backendData.route.analytics.congestion_points);
                        }

                        // Trigger the Weather Pop-up!
                        if (backendData.analysis && backendData.analysis.weather) {
                            showWeatherAlert(backendData.analysis.weather);
                        }
                    }
                })
                .catch(err => console.warn("⚠️ Backend Analytics failed (Is Flask running?):", err));

            } else {
                alert("⚠️ Could not find a driving route between these two locations.");
            }
        })
        .catch(err => console.error("Routing error:", err));
};

// ==========================================
// ☁️ WEATHER POP-UP NOTIFICATION LOGIC
// ==========================================
function showWeatherAlert(weatherData) {
    // Check if one already exists and remove it
    let oldAlert = document.getElementById('weatherPopupAlert');
    if (oldAlert) oldAlert.remove();

    // Create the pop-up
    const alertDiv = document.createElement('div');
    alertDiv.id = 'weatherPopupAlert';
    
    // Styling it like a premium floating notification
    alertDiv.style.position = 'absolute';
    alertDiv.style.top = '220px'; // Right below your top banner
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translateX(-50%)';
    alertDiv.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    alertDiv.style.backdropFilter = 'blur(10px)';
    alertDiv.style.color = 'white';
    alertDiv.style.padding = '12px 24px';
    alertDiv.style.borderRadius = '30px';
    alertDiv.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    alertDiv.style.zIndex = '3000';
    alertDiv.style.display = 'flex';
    alertDiv.style.alignItems = 'center';
    alertDiv.style.gap = '10px';
    alertDiv.style.fontWeight = 'bold';
    alertDiv.style.fontSize = '0.9rem';
    alertDiv.style.opacity = '0';
    alertDiv.style.transition = 'opacity 0.4s ease, top 0.4s ease';
    alertDiv.style.border = '1px solid rgba(255,255,255,0.1)';

    // Set the content using Python's data
    alertDiv.innerHTML = `<span style="font-size: 1.2rem;">${weatherData.icon}</span> <span>${weatherData.message}</span>`;
    
    document.body.appendChild(alertDiv);

    // Animate it fading in and sliding down slightly
    setTimeout(() => {
        alertDiv.style.opacity = '1';
        alertDiv.style.top = '230px';
    }, 100);

    // Automatically fade it out and remove it after 5 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.top = '220px';
        setTimeout(() => alertDiv.remove(), 400);
    }, 5000);
}
function exitZenMode() {
    console.log("🛑 Exiting Zen Mode...");

    // 1. KILL THE GPS WATCH (Saves battery)
    if (navWatchId !== null) {
        navigator.geolocation.clearWatch(navWatchId);
        navWatchId = null;
    }
    // 🔥 KILL THE FAKE SIMULATION CAR
    if (simInterval !== null) {
        clearInterval(simInterval);
        simInterval = null;
    }
    // 2. RESTORE UI
    const topSearch = document.querySelector('.top-search-container');
    const bottomSheet = document.querySelector('.bottom-sheet');
    const zenBanner = document.getElementById('zenNavBanner');
    
    if (topSearch) topSearch.classList.remove('hide-for-zen');
    if (bottomSheet) bottomSheet.classList.remove('hide-for-zen');
    if (zenBanner) zenBanner.style.display = 'none';
    const bottomExit = document.getElementById('zenBottomBar');
    if (bottomExit) bottomExit.style.display = 'none';
    
    // 3. RESET CAMERA
    if (typeof map !== 'undefined' && window.startCoords) {
        map.flyTo({ 
            center: window.startCoords,
            pitch: 0,
            bearing: 0, // Reset rotation to North
            zoom: 14 
        });
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
   // 2. The Simulate Button (The "Gold Standard" requestAnimationFrame Engine)
    const simBtn = document.getElementById('simulateBtn');
    if (simBtn) {
        simBtn.addEventListener('click', () => {
            
            // 🔥 STOP TOGGLE: If it's already running, stop it!
            if (typeof window.simAnimId !== 'undefined' && window.simAnimId !== null) {
                console.log("🛑 Stopping Simulation...");
                cancelAnimationFrame(window.simAnimId);
                window.simAnimId = null;
                if (typeof exitZenMode === 'function') exitZenMode();
                return; 
            }

            const routeSource = typeof map !== 'undefined' ? map.getSource('route') : null;
            if (!routeSource || !routeSource._data || !routeSource._data.geometry) {
                return alert("⚠️ Please calculate a route first before simulating!");
            }

            console.log("🏎️ Starting Buttery Smooth Simulation...");
            // Reset camera lock on new trip!
window.isCameraLocked = true;
if (document.getElementById('recenterBtn')) document.getElementById('recenterBtn').style.display = 'none';
            if (typeof navWatchId !== 'undefined' && navWatchId !== null) {
                navigator.geolocation.clearWatch(navWatchId);
                navWatchId = null;
            }

            // Hide the UI & Show Zen UI
            const topSearch = document.querySelector('.top-search-container');
            if (topSearch) topSearch.classList.add('hide-for-zen');
            const bottomSheet = document.querySelector('.bottom-sheet');
            if(bottomSheet) {
                bottomSheet.classList.remove('active');
                bottomSheet.classList.add('hide-for-zen');
            }
            const zenBanner = document.getElementById('zenNavBanner');
            if(zenBanner) zenBanner.style.display = 'flex';
            const bottomExit = document.getElementById('zenBottomBar');
            if (bottomExit) bottomExit.style.display = 'block';

            const routeCoords = routeSource._data.geometry.coordinates;
            const routeLine = turf.lineString(routeCoords);
            const totalDistance = turf.length(routeLine, { units: 'meters' });
            
            // FLY DOWN TO THE STREET ONCE
            const startHeading = turf.bearing(turf.point(routeCoords[0]), turf.point(routeCoords[1]));
            map.flyTo({ center: routeCoords[0], bearing: startHeading, pitch: 60, zoom: 18, speed: 1.2 });

            let currentDistance = 0;
            let lastTime = 0;
            const speedKmph = 65; 
            const speedMps = speedKmph / 3.6; // converts km/h to meters-per-second

            // 🏎️ THE TRUE 60FPS ANIMATION LOOP
            function animate(timestamp) {
                if (!lastTime) lastTime = timestamp;
                const deltaTime = (timestamp - lastTime) / 1000; // Time passed in seconds
                lastTime = timestamp;

                currentDistance += speedMps * deltaTime; // Moves the exact mathematically correct distance per frame

                if (currentDistance >= totalDistance) {
                    cancelAnimationFrame(window.simAnimId);
                    window.simAnimId = null;
                    alert("🏁 You have arrived!");
                    if (typeof exitZenMode === 'function') exitZenMode();
                    return;
                }

                const currentPos = turf.along(routeLine, currentDistance, { units: 'meters' }).geometry.coordinates;
                const nextDistance = Math.min(currentDistance + 15, totalDistance);
                const nextPos = turf.along(routeLine, nextDistance, { units: 'meters' }).geometry.coordinates;
                const heading = turf.bearing(turf.point(currentPos), turf.point(nextPos));

                // 🔥 THE FIX: jumpTo inside requestAnimationFrame is the smoothest movement possible in MapLibre
                map.jumpTo({
                    center: currentPos,
                    bearing: heading
                });
               
                if (typeof updateUserMarker === 'function') {
                    updateUserMarker(currentPos[1], currentPos[0], heading);
                }
                // 🔥 FREE-ROAM CAMERA FIX: Only lock the camera if the user hasn't panned away
                if (window.isCameraLocked !== false) {
                    map.jumpTo({
                        center: currentPos,
                        bearing: heading,
                        zoom: 18,   
                        pitch: 60   
                    });
                }

                if (typeof updateUserMarker === 'function') {
                    updateUserMarker(currentPos[1], currentPos[0], heading);
                }
                // 🧮 MATH ENGINE
                const remainingMeters = totalDistance - currentDistance;
                const remainingText = remainingMeters > 1000 
                    ? (remainingMeters / 1000).toFixed(1) + ' km' 
                    : Math.round(remainingMeters) + ' m';
                
                const topRemEl = document.getElementById('topRemaining');
                if (topRemEl) topRemEl.innerText = remainingText;

                const zenDistEl = document.getElementById('zenDistance');
                if (zenDistEl) zenDistEl.innerText = remainingText;

                // Update UI text (Flickers slightly for realism)
                const displaySpeed = Math.floor(speedKmph + (Math.random() * 4 - 2));
                const topSpeedEl = document.getElementById('topSpeed');
                if (topSpeedEl) topSpeedEl.innerText = displaySpeed;

                const etaMinutes = Math.ceil((remainingMeters / speedMps) / 60);
                const topEtaEl = document.getElementById('topEta');
                if (topEtaEl) topEtaEl.innerText = etaMinutes + ' min';

// 🔀 DYNAMIC TURN-BY-TURN INSTRUCTIONS
                if (window.routeInstructions && window.routeInstructions.length > 0) {
                    // Find the VERY NEXT instruction that is further ahead than our current car position
                    const nextTurn = window.routeInstructions.find(inst => inst.routeOffsetInMeters > currentDistance);
                    
                    if (nextTurn) {
                        // 1. Update the Street Name text
                        const zenStreetEl = document.getElementById('zenStreetName');
                        if (zenStreetEl) zenStreetEl.innerText = nextTurn.message;

                        // 2. INCH-BY-INCH COUNTDOWN LOGIC
                        const distanceToTurn = nextTurn.routeOffsetInMeters - currentDistance;
                        const distanceEl = document.getElementById('zenTurnDistance');
                        
                        if (distanceEl) {
                            if (distanceToTurn < 1000) {
                                distanceEl.innerText = Math.max(0, Math.round(distanceToTurn / 10) * 10) + " m";
                            } else {
                                distanceEl.innerText = (distanceToTurn / 1000).toFixed(1) + " km";
                            }
                        }

                        // THE MAGIC LINK: Trigger the voice engine!
                        if (typeof window.speakTurnInstruction === 'function') {
                            window.speakTurnInstruction(nextTurn.message);
                        }

                        // ==========================================
                        // 3. THE "READ THE TEXT" ICON SWAPPER
                        // ==========================================
                        const iconEl = document.getElementById('zenTurnIconBox') || document.getElementById('zenTurnIcon'); 
                        
                        if (iconEl) {
                            // 🔥 THE FIX: Read the actual text since TomTom hides the maneuver data!
                            const maneuverText = (nextTurn.message || "").toUpperCase();
                            let newIconClass = 'fa-arrow-up'; // Default straight
                            
                            // Match the spoken words to Universal FontAwesome shapes
                            if (maneuverText.includes('U-TURN') || maneuverText.includes('MAKE A U')) newIconClass = 'fa-undo';
                            else if (maneuverText.includes('ROUNDABOUT')) newIconClass = 'fa-sync';
                            else if (maneuverText.includes('LEFT')) newIconClass = 'fa-arrow-left';
                            else if (maneuverText.includes('RIGHT')) newIconClass = 'fa-arrow-right';
                            else if (maneuverText.includes('ARRIVE') || maneuverText.includes('DESTINATION')) newIconClass = 'fa-flag-checkered';
                            
                            // 🔥 PERFORMANCE FIX: Only update the HTML if the arrow actually needs to change
                            if (window.currentArrowClass !== newIconClass) {
                                window.currentArrowClass = newIconClass; // Save to memory
                                
                                if (iconEl.tagName === 'SPAN') {
                                    // The Wrapper Method
                                    iconEl.innerHTML = `<i class="fa-solid ${newIconClass} turn-icon-main"></i>`;
                                } else {
                                    // The SVG Fallback Method
                                    iconEl.className = `fa-solid ${newIconClass} turn-icon-main`;
                                    iconEl.setAttribute('data-icon', newIconClass.replace('fa-', '')); 
                                }
                                
                                console.log("🔄 Visual Arrow Flipped to:", newIconClass);
                            }
                        }
                    }
                }
                // ==========================================
                        // 📊 BOTTOM DASHBOARD: SPEED & TOTAL DISTANCE
                        // ==========================================
                        
                        // 1. Update Total Distance Remaining
                        // (routeDistance is your total trip length, currentDistance is how far you've driven)
                        const totalDistanceLeft = routeDistance - currentDistance; 
                        const totalDistEl = document.getElementById('zenTotalDistance'); 
                        
                        if (totalDistEl) {
                            if (totalDistanceLeft > 1000) {
                                totalDistEl.innerText = (totalDistanceLeft / 1000).toFixed(1) + " km";
                            } else {
                                // Round to nearest meter and prevent negative numbers
                                totalDistEl.innerText = Math.max(0, Math.round(totalDistanceLeft)) + " m";
                            }
                        }

                        // 2. The Smart Speedometer (km/h)
                        const liveSpeedEl = document.getElementById('zenLiveSpeed');
                        if (liveSpeedEl) {
                            let displaySpeed = 0;
                            // Generate a highly realistic speed based on the vehicle type!
                            const mode = window.currentTransportMode || 'car';
                            
                            if (mode === 'pedestrian') {
                                displaySpeed = Math.floor(Math.random() * 2) + 4; // 4-5 km/h walking
                            } else if (mode === 'bicycle') {
                                displaySpeed = Math.floor(Math.random() * 5) + 15; // 15-20 km/h biking
                            } else if (mode === 'bus') {
                                displaySpeed = Math.floor(Math.random() * 8) + 35; // 35-43 km/h bus
                            } else {
                                displaySpeed = Math.floor(Math.random() * 12) + 45; // 45-57 km/h car/motorcycle
                            }
                            
                            // Slow down to 10 km/h when approaching a sharp turn!
                            if (nextTurn && (nextTurn.routeOffsetInMeters - currentDistance) < 30) {
                                displaySpeed = Math.floor(Math.random() * 5) + 10;
                            }
                            
                            liveSpeedEl.innerText = displaySpeed; 
                        }

                // Call the next frame!
                window.simAnimId = requestAnimationFrame(animate);
            }

            // Start the loop after the camera finishes flying down
            setTimeout(() => {
                window.simAnimId = requestAnimationFrame(animate);
            }, 1500); 
        });
    }
   // 3. The Start Navigation Button (Upgraded with Safety Checks)
    const navActionBtn = document.getElementById('navActionBtn');
    if (navActionBtn) {
        navActionBtn.onclick = function() {
            // Re-verify coordinates exist
            if (!window.startCoords || !window.endCoords) {
                alert("⚠️ Please set both Start and Destination in the panel below.");
                return;
            }

            // 🔥 Check if the blue line is actually on the map yet
            const routeSource = typeof map !== 'undefined' ? map.getSource('route') : null;
            
            if (!routeSource) {
                console.log("⏳ Waiting for route to draw before entering Zen Mode...");
                
                // Force it to draw if it hasn't yet
                if (typeof calculateRoute === 'function') calculateRoute();
                else if (typeof window.calculateRoute === 'function') window.calculateRoute();
                
                // Wait 1 second for the line to draw, THEN tilt the camera
                setTimeout(() => {
                    if (typeof startZenMode === 'function') startZenMode();
                }, 1000);
            } else {
                // The blue line is already there, start driving instantly!
                if (typeof startZenMode === 'function') startZenMode();
            }
        };
    }
});
// ==========================================
// 📍 UPDATE MARKER (Always pointing forward!)
// ==========================================
function updateUserMarker(lat, lng, heading) {
    if (!map) return;

    if (!userMarker) {
        // Create the HTML element for the marker
        const el = document.createElement('div');
        el.className = 'user-location-marker';

        userMarker = new maplibregl.Marker({
            element: el,
            rotationAlignment: 'viewport', // 🔥 THE FIX: Locks the arrow to the screen so it ALWAYS points UP!
            pitchAlignment: 'viewport'
        })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
        // Butter-smooth movement to new coordinates
        userMarker.setLngLat([lng, lat]);
    }
}

// ==========================================
// 🌍 UNIVERSAL AUTOCOMPLETE (For Start & End Boxes)
// ==========================================
function attachUniversalAutocomplete(inputId, isStartPoint) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;

    // 1. Create a secret dropdown box just for this input
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown glass-panel';
    dropdown.style.display = 'none';
    dropdown.style.position = 'absolute';
    dropdown.style.width = 'calc(100% - 30px)'; // Fits perfectly inside the bottom sheet
    dropdown.style.left = '15px';
    dropdown.style.marginTop = '5px';
    dropdown.style.zIndex = '2000';
    dropdown.style.maxHeight = '200px';
    dropdown.style.overflowY = 'auto';

    // Insert the dropdown right under the input field
    inputEl.parentNode.insertBefore(dropdown, inputEl.nextSibling);

    let searchTimeout = null;

    // 2. The Typing Logic
    inputEl.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();

        if (query.length < 3) {
            dropdown.style.display = 'none';
            return;
        }

       // Debounce: Wait 300ms...
        searchTimeout = setTimeout(() => {
            // Defaults to Mysuru so local places pop up faster!
            const mapCenter = typeof map !== 'undefined' ? map.getCenter() : { lat: 12.2958, lng: 76.6394 };
            
            // 🧠 GOOGLE-STYLE SMART SEARCH (Typeahead + India + Everything)
            const searchUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${CONFIG.TOMTOM_KEY}&typeahead=true&countrySet=IN&lat=${mapCenter.lat}&lon=${mapCenter.lng}&limit=5&language=en-US`;
            
            fetch(searchUrl)
                .then(res => res.json())
            .then(data => {
                dropdown.innerHTML = ''; 

                if (data.results && data.results.length > 0) {
                    data.results.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        div.style.padding = '10px';
                        div.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
                        div.style.cursor = 'pointer';

                        const mainName = item.poi ? item.poi.name : item.address.freeformAddress;
                        const subText = item.address.countrySecondarySubdivision || item.address.country || '';

                        div.innerHTML = `
                            <div style="display: flex; align-items: center;">
                                <i class="fa-solid fa-location-dot" style="color: var(--primary); margin-right: 10px; font-size: 14px;"></i>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-weight: 600; color: var(--text-main); font-size: 13px;">${mainName}</span>
                                    <span style="font-size: 11px; color: var(--text-muted);">${subText}</span>
                                </div>
                            </div>
                        `;

                        // 3. WHEN YOU CLICK A SUGGESTION
                        div.onclick = () => {
                            inputEl.value = mainName; // Fill the box with the city name
                            dropdown.style.display = 'none'; // Hide the menu

                            const coords = [item.position.lon, item.position.lat];
                            
                            // Save it to the correct background variable!
                            if (isStartPoint) {
                                window.startCoords = coords;
                                console.log("📍 Start Location manually set:", coords);
                            } else {
                                window.endCoords = coords;
                                console.log("📍 Destination manually set:", coords);
                            }

                            // Fly the camera to show the user what they selected
                            if (typeof map !== 'undefined' && map.flyTo) {
                                map.flyTo({ center: coords, zoom: 14, speed: 1.5 });
                            }

                            // 🔥 MAGIC: Automatically draw the route if both boxes are now full!
                            if (window.startCoords && window.endCoords && typeof window.calculateRoute === 'function') {
                                window.calculateRoute();
                            }
                        };

                        dropdown.appendChild(div);
                    });
                    dropdown.style.display = 'block';
                } else {
                    dropdown.style.display = 'none';
                }
            }).catch(err => console.error("Autocomplete Error:", err));
        }, 300);
    });

    // 4. Hide dropdown if you click somewhere else on the screen
    document.addEventListener('click', (e) => {
        if (!inputEl.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

// Attach the brains to the two bottom sheet boxes!
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        // Attach to Start Box (true = save to startCoords)
        attachUniversalAutocomplete('startLocation', true); 
        
        // Attach to Destination Box (false = save to endCoords)
        attachUniversalAutocomplete('endLocationSheet', false); 
    }, 500);
});

// ==========================================
// 🛑 EXIT ZEN MODE & KILL SIMULATION
// ==========================================
// Declare global lock for transport buttons
if (typeof isCalculating === 'undefined') 

document.addEventListener("DOMContentLoaded", () => {
   
    const exitZenBtn = document.getElementById('exitZenBtn');
    
    if (exitZenBtn) {
        exitZenBtn.addEventListener('click', () => {
            console.log("🛑 Exiting Zen Mode & Stopping Car...");
            
            // 1. Kill the 60FPS Animation Loop
            if (typeof window.simAnimId !== 'undefined' && window.simAnimId !== null) {
                cancelAnimationFrame(window.simAnimId);
                window.simAnimId = null;
            }
            
            // 2. Shut up the Voice Engine instantly
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            
            // 🔥 ADDED THIS BACK: Wipes the brain so the voice works on the next trip!
            if (typeof window.resetVoiceMemory === 'function') {
                window.resetVoiceMemory();
            }

            // 3. Reset UI back to normal
            const topSearch = document.querySelector('.top-search-container');
            if (topSearch) topSearch.classList.remove('hide-for-zen');
            
            const bottomSheet = document.querySelector('.bottom-sheet');
            if (bottomSheet) {
                bottomSheet.classList.remove('hide-for-zen');
                bottomSheet.classList.add('active');
            }
            
            const zenBanner = document.getElementById('zenNavBanner');
            if (zenBanner) zenBanner.style.display = 'none';
            
            const bottomExit = document.getElementById('zenBottomBar');
            if (bottomExit) bottomExit.style.display = 'none';

            // 4. Reset camera pitch back to top-down 2D view
            if (typeof map !== 'undefined') {
                map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
            }
        });
    }

     // 🔊 Mute Button Logic
   const muteBtn = document.getElementById('voiceToggleBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            const isNowMuted = window.toggleVoiceMute(); // Calls our Voice Engine
            
            // Swap the icons so the user knows it worked!
            if (isNowMuted) {
                muteBtn.innerHTML = '<i class="fas fa-volume-xmark"></i>';
                muteBtn.style.color = '#ef4444'; // Make it red to show it's off
            } else {
                muteBtn.innerHTML = '<i class="fas fa-volume-high"></i>';
                muteBtn.style.color = ''; // Reset to default color
            }
        });
    }

  // ==========================================
// 💥 1. BULLETPROOF TRANSPORT BUTTONS (With Anti-Spam Lock)
// ==========================================
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn'); 
    if (!btn || isCalculating) return; 

    console.log("🚗 Vehicle mode change requested...");
    
    // 🔒 ACTIVATE LOCK
    isCalculating = true; 
    
    // UI Feedback
    document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.remove('active');
        b.style.opacity = "0.5";
    });
    btn.classList.add('active');
    btn.style.opacity = "1";

    // Update global mode
    window.currentTravelMode = btn.getAttribute('data-mode');
    console.log("🛣️ Mode changed to:", window.currentTravelMode);

    // Trigger calculation
    if (window.endCoords && typeof window.calculateRoute === 'function') {
        window.calculateRoute();
    }

    // 🔓 RELEASE LOCK after 2 seconds to prevent "400 Bad Request" spam
    setTimeout(() => {
        isCalculating = false;
        document.querySelectorAll('.mode-btn').forEach(b => b.style.opacity = "1");
        console.log("🔓 Transport buttons unlocked.");
    }, 2000);
});

// ==========================================
// 💥 2. THE PERFECT GOOGLE MAPS FREE-ROAM
// ==========================================
    window.isCameraLocked = true; 

    // 1. Create the Recenter Button
    let recenterBtn = document.getElementById('recenterBtn');
    if (!recenterBtn) {
        recenterBtn = document.createElement('button');
        recenterBtn.id = 'recenterBtn';
        recenterBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Recenter';
        document.body.appendChild(recenterBtn);
    }

    recenterBtn.style.cssText = 'display: none; position: fixed; bottom: 130px; left: 50%; transform: translateX(-50%); z-index: 2147483647; background-color: white; color: #1a73e8; border-radius: 24px; padding: 10px 20px; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 1rem; align-items: center; gap: 8px; font-family: sans-serif;';

    // 2. The Smart Unlocker (Physical Touch/Scroll)
    const triggerUnlock = (e) => {
        // Ignore if clicking a button
        if (e && e.target && e.target.closest('button, .mode-btn, .glass-panel')) return;

        if (window.simAnimId && window.isCameraLocked) {
            window.isCameraLocked = false;
            console.log("🔓 Camera unlocked - You can now zoom and drag!");
            recenterBtn.style.display = 'flex';
        }
    };

    document.addEventListener('mousedown', triggerUnlock);
    document.addEventListener('touchstart', triggerUnlock, { passive: true });
    document.addEventListener('wheel', triggerUnlock, { passive: true }); 

    // 3. The Clean Snap-Back
    recenterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); 
        
        window.isCameraLocked = true; // Instantly tells the 60FPS loop to pull you back!
        recenterBtn.style.display = 'none';
        
        console.log("🔒 Recenter clicked! Locking back to car.");
    });

    // ==========================================
    // 💥 3. BULLETPROOF ENTER KEY SEARCH
    // ==========================================
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault(); 
            const query = e.target.value.trim();
            if (!query) return;

            console.log("🔍 Enter key pressed! Searching for:", query);
            e.target.blur(); 

            fetch(`http://127.0.0.1:5000/api/proxy/geocode?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.length > 0) {
                        window.endCoords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
                        console.log("📍 Enter Key Destination:", window.endCoords);
                        if (typeof window.calculateRoute === 'function') window.calculateRoute();
                    } else {
                        alert("Location not found. Try being more specific!");
                    }
                })
                .catch(err => console.error("Search API Error:", err));
        }
    });

    // ==========================================
    // 🌉 5. THE STAYS BRIDGE (Automatic Filling)
    // ==========================================
    const incomingStay = localStorage.getItem('pendingNavDestination');
    if (incomingStay) {
        const data = JSON.parse(incomingStay);
        console.log("🏨 Auto-loading stay from memory:", data.name);
        
        window.endCoords = [data.lng, data.lat];
        const topSearch = document.getElementById('endLocation');
        const sheetSearch = document.getElementById('endLocationSheet');
        if (topSearch) topSearch.value = data.name;
        if (sheetSearch) sheetSearch.value = data.name;

        localStorage.removeItem('pendingNavDestination');

        setTimeout(() => {
            if (typeof window.calculateRoute === 'function') window.calculateRoute();
        }, 1500);
    }
    
    // ==========================================
    // 🗺️ 6. AUTO-INJECT RECENTER BUTTON
    // ==========================================
    let forceRecenterBtn = document.getElementById('recenterBtn');
    if (!forceRecenterBtn) {
        forceRecenterBtn = document.createElement('button');
        forceRecenterBtn.id = 'recenterBtn';
        forceRecenterBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Recenter';
        forceRecenterBtn.style.cssText = 'display: none; position: fixed; bottom: 180px; right: 20px; z-index: 999999; background-color: #3b82f6; color: white; border-radius: 20px; padding: 12px 24px; font-weight: bold; border: 2px solid white; cursor: pointer; box-shadow: 0 10px 15px rgba(0,0,0,0.5); font-size: 1rem;';
        document.body.appendChild(forceRecenterBtn);

        forceRecenterBtn.addEventListener('click', () => {
            window.isCameraLocked = true;
            forceRecenterBtn.style.display = 'none';
        });
    }

}); 

// ==========================================
// 🧮 4. THE REAL TOMTOM ETA ENGINE (No Fake Math!)
// ==========================================
window.updateRealTransportETAs = function() {
    if (!window.startCoords || !window.endCoords) return;

    const start = `${window.startCoords[1]},${window.startCoords[0]}`; 
    const end = `${window.endCoords[1]},${window.endCoords[0]}`; 
    const modes = ['car', 'motorcycle', 'bus', 'pedestrian'];

    modes.forEach(mode => {
        const url = `https://api.tomtom.com/routing/1/calculateRoute/${start}:${end}/json?key=${CONFIG.TOMTOM_KEY}&routeType=fastest&traffic=true&travelMode=${mode}`;
        
        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.routes && data.routes.length > 0) {
                    const secs = data.routes[0].summary.travelTimeInSeconds;
                    const mins = Math.round(secs / 60);
                    let timeStr = "";
                    if (mins < 60) {
                        timeStr = mins + " min";
                    } else {
                        const hrs = Math.floor(mins / 60);
                        timeStr = hrs + " hr " + (mins % 60) + " min";
                    }

                    const span = document.querySelector(`.mode-btn[data-mode="${mode}"] .time`);
                    if (span) span.innerText = timeStr;
                }
            })
            .catch(err => console.warn(`Could not fetch real ETA for ${mode}`));
    });
};
function bridgeStayData() {
    const savedData = localStorage.getItem('pendingNavDestination');
    
    if (savedData) {
        const data = JSON.parse(savedData);
        
        // 1. Find the input boxes
        const topInput = document.getElementById('endLocation');
        const sheetInput = document.getElementById('endLocationSheet');

        // 2. If the boxes aren't on screen yet, wait 100ms and try again
        if (!topInput && !sheetInput) {
            setTimeout(bridgeStayData, 100);
            return;
        }

        // 3. Write the name into the boxes
        if (topInput) topInput.value = data.name;
        if (sheetInput) sheetInput.value = data.name;
        
        // 4. Set the coordinates for the engine
        window.endCoords = [data.lng, data.lat];

        // 5. Clean up the memory
        localStorage.removeItem('pendingNavDestination');

        // 6. Start the route after the map settles
        setTimeout(() => {
            if (typeof window.calculateRoute === 'function') window.calculateRoute();
        }, 1500);
    }
}

// Start the check
document.addEventListener("DOMContentLoaded", bridgeStayData);
// ==========================================
// 🏁 THE ARRIVAL SEQUENCE (Mission Accomplished)
// ==========================================

window.triggerArrivalSequence = function() {
    console.log("🏆 Destination Reached! Triggering Arrival Sequence...");

    // 1. Stop all navigation loops & engines
    if (window.simAnimId) cancelAnimationFrame(window.simAnimId);
    if (window.watchId) navigator.geolocation.clearWatch(window.watchId);
    window.isNavigating = false;
    window.isCalculating = false;

    // 2. Announce Arrival (Voice)
    if (typeof speakAlert === 'function') {
        speakAlert("You have arrived at your destination. Route complete.");
    }

    // 3. Calculate Final Stats
    let timeSpent = "N/A";
    if (window.startNavigationTime) {
        const diffMs = Date.now() - window.startNavigationTime;
        const diffMins = Math.round(diffMs / 60000);
        timeSpent = diffMins > 0 ? `${diffMins} mins` : "< 1 min";
    }

    // 4. Create the Professional UI Popup
    const arrivalModal = document.createElement('div');
    arrivalModal.id = 'arrivalModal';
    arrivalModal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);
        display: flex; justify-content: center; align-items: center;
        z-index: 9999999; opacity: 0; transition: opacity 0.5s ease;
    `;

    arrivalModal.innerHTML = `
        <div style="background: white; width: 90%; max-width: 400px; border-radius: 24px; padding: 30px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); transform: translateY(20px); transition: transform 0.5s ease;" id="arrivalCard">
            <div style="background: #10b981; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.4);">
                <i class="fa-solid fa-check" style="color: white; font-size: 40px;"></i>
            </div>
            <h2 style="margin: 0 0 10px; color: #1f2937; font-size: 24px; font-weight: 800; font-family: sans-serif;">You've Arrived!</h2>
            <p style="color: #6b7280; font-size: 15px; margin-bottom: 25px; font-family: sans-serif;">Your route guidance is now complete.</p>
            
            <div style="background: #f3f4f6; border-radius: 16px; padding: 15px; margin-bottom: 25px; display: flex; justify-content: space-around;">
                <div>
                    <span style="display: block; color: #9ca3af; font-size: 12px; text-transform: uppercase; font-weight: bold;">Trip Time</span>
                    <span style="color: #1f2937; font-size: 18px; font-weight: 700;">${timeSpent}</span>
                </div>
                <div style="width: 1px; background: #e5e7eb;"></div>
                <div>
                    <span style="display: block; color: #9ca3af; font-size: 12px; text-transform: uppercase; font-weight: bold;">Safety Score</span>
                    <span style="color: #10b981; font-size: 18px; font-weight: 700;">Excellent</span>
                </div>
            </div>

            <button id="finishRouteBtn" style="background: #3b82f6; color: white; width: 100%; border: none; padding: 16px; border-radius: 14px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                Done
            </button>
        </div>
    `;

    document.body.appendChild(arrivalModal);

    // 5. Animate in
    requestAnimationFrame(() => {
        arrivalModal.style.opacity = "1";
        document.getElementById('arrivalCard').style.transform = "translateY(0)";
    });

    // 6. Handle the "Done" Button Click
    document.getElementById('finishRouteBtn').addEventListener('click', () => {
        // Fade out
        arrivalModal.style.opacity = "0";
        setTimeout(() => {
            arrivalModal.remove();
            
            // Trigger your existing Exit Zen Mode logic to reset the map!
            const exitBtn = document.getElementById('exitZenBtn');
            if (exitBtn) exitBtn.click();
            
            // Clear route lines from map
            if (map.getSource(routeSourceId)) {
                map.getSource(routeSourceId).setData({ type: 'FeatureCollection', features: [] });
            }
            if (endMarker) endMarker.remove();
            
            // Clear inputs
            const topSearch = document.getElementById('endLocation');
            if (topSearch) topSearch.value = '';
            
        }, 500);
    });
};
// ==========================================
// 🛡️ THE RADAR HEARTBEAT (Runs every 2 seconds)
// ==========================================
setInterval(() => {
    // Check if the car is currently moving/exists on the map
    if (window.currentAnimPos) {
        
        // Mock a high GPS accuracy (10m) for the MVP demo
        const mockAccuracy = 10; 
        
        // Grab the simulated speed if it exists, otherwise pass null
        const currentSpeedMps = window.currentSimulatedSpeed ? (window.currentSimulatedSpeed / 3.6) : null;

        // Fire the radar scan!
        checkHazardProximity(
            window.currentAnimPos.lat, 
            window.currentAnimPos.lng, 
            mockAccuracy, 
            currentSpeedMps
        );
    }
}, 2000);
// ==========================================
// 🛡️ SAFENAV RISK ROUTER LOGIC
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const textMap = { 1: 'Low', 2: 'Medium', 3: 'High' };
    const riskMap = { 1: 'Conservative', 2: 'Balanced', 3: 'Aggressive' };

    const updateLabelAndRecalculate = (sliderId, labelId, mapping) => {
        const slider = document.getElementById(sliderId);
        const label = document.getElementById(labelId);
        if (slider && label) {
            slider.addEventListener('input', (e) => {
                label.innerText = mapping[e.target.value];
            });
            slider.addEventListener('change', () => {
                // Instantly recalculate route when slider is dropped
                if (window.startCoords && window.endCoords && typeof window.calculateRoute === 'function') {
                    window.calculateRoute(); 
                }
            });
        }
    };

    updateLabelAndRecalculate('aqiWeight', 'aqiVal', textMap);
    updateLabelAndRecalculate('heatWeight', 'heatVal', textMap);
    updateLabelAndRecalculate('riskTolerance', 'riskVal', riskMap);

    document.getElementById('hazardToggle')?.addEventListener('change', () => {
        if (window.startCoords && window.endCoords) window.calculateRoute();
    });
});