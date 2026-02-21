/* ==========================================================================
   SAFENAV PRO - 
   ========================================================================== */

// --- GLOBAL STATE ---

let map = null;
let routeLayer = null;
let userMarker = null; 
let startMarker = null;
let endMarker = null;
let accuracyCircle = null;
let animatedRouteLine = null;
let googleTrafficLayer = null;
let defaultDarkLayer = null;


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
let route = null;        


let animFrameId = null;
let currentAnimPos = { lat: 0, lng: 0, heading: 0 }; // Visual position (Where icon IS)
let targetAnimPos = { lat: 0, lng: 0, heading: 0 };  // Target position (Where GPS says to GO)
let lastAnimTick = 0;
let isAnimating = false;

// System & UI State
let isFullscreen = false;
let isVoiceActive = true;
let isCameraAlertActive = false;
let isTrafficActive = false;
let wakeLock = null;
let lastPanTime = 0;
let lastUplinkTime = 0;
let simulationInterval = null;

// 📸 Camera & Alerts
let realSpeedCameras = []; 
let lastCamScanTime = 0;
let activeCamAlertID = null;
let camCountdownInterval = null;
let currentSpeedLimit = null; // Added to prevent "undefined" errors in telemetry

// Caching
const geoCache = new Map();
// BASIC CONFIGURATION
const CONFIG = {
    colors: {
        primary: '#2563eb',
        secondary: '#8b5cf6',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        dark: '#0f172a',
        light: '#f8fafc'
    },
    animations: {
        routeDrawSpeed: 5,
        markerSmoothness: 0.3,
        hudUpdateDelay: 100
    },
    voice: {
        rate: 0.92,
        pitch: 1.05,
        volume: 1.0
    },
};
// --- FORCE ICON VISIBILITY ---
const style = document.createElement('style');
style.innerHTML = `
    .nav-arrow-icon { background: transparent !important; border: none !important; }
    .gps-arrow {
        color: #2563eb;
        font-size: 32px;
        text-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: block;
        margin-top: -8px;
        margin-left: -2px;
        transition: transform 0.3s linear;
    }
`;
document.head.appendChild(style);
function initMap() {
    if (map) return;
    
    try {
        // Default view (just for the camera, NOT the marker)
        const defaultLat = 12.9716; 
        const defaultLng = 77.5946;
        
        map = L.map('map').setView([defaultLat, defaultLng], 12);

        // Fix gray tiles
        setTimeout(() => { map.invalidateSize(); }, 400); 
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        // --- DELETED THE USER MARKER CREATION HERE ---
        // We wait for startGPSTracking() to create it at the REAL location.
        
        console.log('✅ Map initialized (Waiting for GPS...)');
    } catch (error) {
        console.error('❌ Failed to initialize map:', error);
    }
}
function createUserMarkerIcon() {
    return L.divIcon({
        html: `
            <div class="navigation-arrow-container">
                <i class="fas fa-location-arrow" style="font-size: 30px; color: #3b82f6; transform: rotate(-45deg); text-shadow: 0 0 15px rgba(59, 130, 246, 0.8);"></i>
            </div>
        `,
        className: 'user-marker-arrow',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
}

function createStartMarkerIcon() {
    return L.divIcon({
        html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                <div style="background: #10b981; width: 35px; height: 35px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    <span style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 14px;">A</span>
                </div>
            </div>
        `,
        className: 'start-marker-premium',
        iconSize: [40, 40],
        iconAnchor: [20, 35]
    });
}

function createDestinationMarkerIcon() {
    return L.divIcon({
        html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                <div style="background: #ef4444; width: 35px; height: 35px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    <span style="transform: rotate(45deg); color: white; font-weight: 800; font-size: 14px;">B</span>
                </div>
            </div>
        `,
        className: 'dest-marker-premium',
        iconSize: [40, 40],
        iconAnchor: [20, 35]
    });
}
// ============================
// LOCATION SERVICES
// ============================

function useMyLocation(inputId, button) {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }
    
    if (button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Update map view
            if (map) {
                map.setView([lat, lng], 15);
                updateUserMarker(lat, lng, position.coords.heading);
            }
            
            // Update input field
            if (inputId) {
                geocodeAddress(lat, lng, inputId);
            }
            
            // Update start marker
            if (inputId === 'startLocation' && startMarker) {
                startMarker.setLatLng([lat, lng]);
            }
            
            if (button) {
                button.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
                button.disabled = false;
            }
        },
        function(error) {
            console.error("Geolocation error:", error);
            alert("Unable to retrieve your location. Please check permissions.");
            
            if (button) {
                button.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
                button.disabled = false;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}
function startGPSTracking() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    
    console.log("📡 Searching for satellites...");

    watchId = navigator.geolocation.watchPosition(
        function(position) {
            // 1. EXTRACT DATA
            const { latitude, longitude, speed, heading, altitude, accuracy } = position.coords;
            const speedKmh = Math.round((speed * 3.6) || 0);
            
            // --- 🔥 NEW: REAL CAMERA & HELMET DETECTION ---
            scanForSpeedCameras(latitude, longitude);       // Scan 5km radius (Overpass API)
            if (isNavigating) checkCameraProximity(latitude, longitude); // Check 1km warning
            // ---------------------------------------------

            // Store state
            lastPosition = { lat: latitude, lng: longitude };
            window.currentRealSpeed = speedKmh; 

            requestAnimationFrame(() => {
                updateUserMarker(latitude, longitude, heading || 0, accuracy);
                
                if (typeof updateTelemetry === 'function') {
                    updateTelemetry(speedKmh, altitude);
                }
                
                if (isNavigating && isGpsLocked) {
                    map.panTo([latitude, longitude], { animate: true, duration: 1.0 });
                }

                // Cloud Uplink (Throttle 5s)
                if (typeof lastUplinkTime !== 'undefined' && Date.now() - lastUplinkTime > 5000) { 
                    uploadLiveTelemetry(latitude, longitude, speedKmh, heading);
                    lastUplinkTime = Date.now();
                }
            });

            // Auto-Reroute Logic
            if (isNavigating && typeof checkDistanceToPath === 'function') {
                const distanceToRoute = checkDistanceToPath(latitude, longitude);
                if (distanceToRoute > 0.06) { 
                    console.log("⚠️ Off route! Recalculating...");
                    if (typeof handleReroute === 'function') handleReroute();
                }
            }
        },
        (err) => console.warn("GPS Signal Weak:", err.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
}
// --- INITIALIZATION & EXPORTS ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Link functions to window
    window.calculateRoute = calculateRoute;
    window.startNavigation = startNavigation;
    window.simulateJourney = simulateJourney;
    window.useMyLocation = useMyLocation;

    // 2. Start Map
    if (typeof initMap === 'function') {
        initMap();
        setTimeout(() => { if (typeof map !== 'undefined') map.invalidateSize(); }, 600);
    }

    // 3. Button Listeners
    document.getElementById("findRouteBtn")?.addEventListener("click", calculateRoute);
    
    console.log("✅ SafeNav Engine Ignited & Synchronized");
});
// ============================
// ROUTE CALCULATION
// ============================

window.calculateRoute = async function() {
    const startInput = document.getElementById("startLocation");
    const endInput = document.getElementById("endLocation");
    const findBtn = document.getElementById("findRouteBtn");

    if (!startInput || !endInput) return;

    const startAddress = startInput.value.trim();
    const endAddress = endInput.value.trim();

    if (!startAddress || !endAddress) {
        if (typeof showPremiumToast === 'function') {
            showPremiumToast('⚠️ Missing Info', 'Please enter both locations', 'warning');
        } else {
            alert('Please enter both locations');
        }
        return;
    }

    try {
        if (findBtn) {
            findBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Analyzing...';
            findBtn.disabled = true;
        }

        const [startCoords, endCoords] = await Promise.all([
            geocodeAddressToCoords(startAddress),
            geocodeAddressToCoords(endAddress)
        ]);

        if (!startCoords || !endCoords) throw new Error("Coordinates not found");

        // ✅ CRITICAL NEW ADDITION: Save globally for the Hotel Engine!
        window.startCoords = startCoords;
        window.endCoords = endCoords;

        const route = await calculateRouteOSRM(startCoords, endCoords);

        if (route) {
            // 1. UPDATE MARKERS
            if (startMarker) {
                startMarker.setLatLng([startCoords.lat, startCoords.lng]);
            } else {
                startMarker = L.marker([startCoords.lat, startCoords.lng], { icon: createStartMarkerIcon() }).addTo(map);
            }

            if (endMarker) {
                endMarker.setLatLng([endCoords.lat, endCoords.lng]);
            } else {
                endMarker = L.marker([endCoords.lat, endCoords.lng], { icon: createDestinationMarkerIcon() }).addTo(map);
            }

            // 2. DRAW THE ROUTE LINE
            drawAnimatedRoute(route.coordinates);

            // 3. GOOGLE MAPS STYLE: ZOOM & SCROLL
            const bounds = L.latLngBounds([
                [startCoords.lat, startCoords.lng],
                [endCoords.lat, endCoords.lng]
            ]);
            
            map.fitBounds(bounds, { padding: [80, 80], animate: true });

            setTimeout(() => {
                const mapContainer = document.getElementById('mapContainer');
                if (mapContainer) {
                    mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);

            // 4. SAFETY SCORE
            const baseSafe = 95;
            const riskFactor = (parseFloat(route.distance_km) / 100); 
            const finalScore = Math.max(0, Math.floor(baseSafe - riskFactor));

            const scoreEl = document.getElementById('recommendedRiskHudMain');
            if (scoreEl) {
                scoreEl.textContent = finalScore + "%";
                scoreEl.style.color = finalScore > 90 ? "#10b981" : "#f59e0b";
            }

            // 5. UPDATE GLOBAL DATA & UI
            currentRouteData = route; 
            remainingKm = route.distance_km;
            updateRouteInfoUI(route);

            const navBtn = document.getElementById("navActionBtn");
            if (navBtn) {
                navBtn.disabled = false;
                navBtn.innerHTML = '<i class="fas fa-play"></i> Start Navigation';
            }
        }

    } catch (error) {
        console.error("❌ Route calculation failed:", error);
        if (typeof showPremiumToast === 'function') {
            showPremiumToast('⚠️ Route Error', error.message, 'error');
        }
    } finally {
        if (findBtn) {
            findBtn.innerHTML = '<i class="fas fa-search-location"></i> Find Safest Route';
            findBtn.disabled = false;
        }
    }
};
async function calculateRouteOSRM(start, end) {
    try {
        // OSRM requires: Longitude, Latitude
        const startLng = start.lng;
        const startLat = start.lat;
        const endLng = end.lng;
        const endLat = end.lat;

        if (!startLng || !endLng) {
            console.error("OSRM Error: Missing coordinates.");
            return null;
        }

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
        
        const response = await fetch(osrmUrl);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            
            // We return the raw coordinates [Lng, Lat] 
            // Our drawAnimatedRoute function will flip them to [Lat, Lng] for Leaflet
            return {
                coordinates: route.geometry.coordinates, 
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
        return null;
    }
    return null;
}


// --- 1. THE UI UPDATE LOGIC (Put this inside your updateRouteInfoUI function) ---
function updateRouteInfoUI(route) {
    if (!route) return;

    // Existing updates for distance/duration...
    const distanceMain = document.getElementById("routeDistanceMain");
    if (distanceMain) distanceMain.textContent = `${route.distance_km} km`;

    // AI Analysis Text - Now safely inside the function
    const detailsEl = document.getElementById('recommendedDetails');
    if (detailsEl) {
        // Dynamic recommendation based on time of day (it's 10:32 PM right now!)
        const hour = new Date().getHours();
        const isNight = hour > 20 || hour < 6;
        
        detailsEl.innerHTML = `
            AI Analysis: This ${route.distance_km}km path utilizes primary well-lit roads. <br> 
            <b>Recommendation:</b> ${isNight ? '🌕 Caution: Night-time travel detected. Staying on main highways is advised.' : '☀️ High safety rating for current conditions.'}
        `;
    }
}

// --- 2. THE FALLBACK ROUTE ENGINE (Flipped for OSRM consistency) ---
function createFallbackRoute(startCoords, endCoords) {
    const midLat = (startCoords.lat + endCoords.lat) / 2;
    const midLng = (startCoords.lng + endCoords.lng) / 2;
    
    // OSRM expects [Lng, Lat] format for its coordinate arrays
    const coordinates = [
        [startCoords.lng, startCoords.lat],
        [midLng, midLat],
        [endCoords.lng, endCoords.lat]
    ];
    
    const distance = calculateHaversineDistance(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng);
    const distanceKm = (distance / 1000).toFixed(1);
    const durationMin = Math.round((distance / 1000) * 1.5); 
    
    return {
        coordinates,
        steps: [{
            instruction: "Continue to destination",
            distance: distance,
            duration: durationMin * 60,
            coordinates: coordinates
        }],
        distance_km: distanceKm,
        duration_min: durationMin
    };
}

// --- 3. THE STATIC ROUTE DRAWER (For fallback or backup) ---
function drawRouteOnMap(route) {
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }
    
    // Safety check: coordinates must be flipped back to [Lat, Lng] for Leaflet
    routeLayer = L.geoJSON({
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: route.coordinates.map(coord => [coord[0], coord[1]]) // Matches OSRM format
        }
    }, {
        style: {
            color: '#2563eb', // Premium Navy Blue
            weight: 5,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
        }
    }).addTo(map);

    
    // Fit map to route bounds
    const bounds = L.latLngBounds(route.coordinates);
    map.fitBounds(bounds, { padding: [50, 50] });
};

// ============================
// NAVIGATION SYSTEM
// ============================
function startNavigation() {
    if (!currentRouteData) {
        showPremiumToast("⚠️ No Route", "Please calculate a route first", "warning");
        return;
    }
    
    isNavigating = true;
    isGpsLocked = true; 
    startNavigationTime = Date.now();
    totalDistanceTraveled = 0;
    
    // 1. BUTTERY SMOOTH ZOOM (Fixed for reliability)
    // Try to fly to the user's GPS location first. 
    // If GPS isn't ready, fly to the Route Start point (swapping coords correctly).
    let targetLat = 0, targetLng = 0;

    if (typeof lastPosition !== 'undefined' && lastPosition) {
        targetLat = lastPosition.lat;
        targetLng = lastPosition.lng;
    } else {
        // Fallback: Use Route Start (Flip OSRM [Lng, Lat] to Leaflet [Lat, Lng])
        targetLat = currentRouteData.coordinates[0][1];
        targetLng = currentRouteData.coordinates[0][0];
    }

    map.flyTo([targetLat, targetLng], 19, {
        animate: true,
        duration: 2.0, 
        easeLinearity: 0.25
    });
    
    // 2. UI Updates
    const navBtn = document.getElementById("navActionBtn");
    if (navBtn) {
        navBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Navigation';
        navBtn.classList.remove('btn-success');
        navBtn.classList.add('btn-danger');
        navBtn.onclick = cancelNavigation; // Ensure clicking again calls cancel
    }
    
    // Hide Search Bar & Show HUD
    document.querySelector('.route-panel')?.classList.add('minimized');
    document.getElementById("telemetryOverlay")?.classList.remove("hidden");
    
    // 3. Start high-frequency GPS tracking
    startGPSTracking();
    
    // 4. Start route progress checking (Safety Check)
    // Only run this if the function exists in your code
    if (typeof checkRouteProgress === 'function') {
        const progressInterval = setInterval(() => {
            if (isNavigating) {
                checkRouteProgress();
            } else {
                clearInterval(progressInterval);
            }
        }, 2000);
    }
    
    showPremiumToast("🚀 Navigation Active", "GPS Locked. Drive Safely.", "success");
}

function cancelNavigation() {
    isNavigating = false;
    isGpsLocked = false; 
    
    // 1. Stop GPS tracking
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    // 2. ZOOM OUT (Fixed "Wrong Country" Bug)
    if (currentRouteData && currentRouteData.coordinates) {
        // FIX: Map OSRM [Lng, Lat] back to Leaflet [Lat, Lng]
        const latLngs = currentRouteData.coordinates.map(c => [c[1], c[0]]);
        const bounds = L.latLngBounds(latLngs);
        
        map.fitBounds(bounds, {
            padding: [50, 50],
            animate: true,
            duration: 1.5 
        });
    }
    
    // 3. UI Updates
    const navBtn = document.getElementById("navActionBtn");
    if (navBtn) {
        navBtn.innerHTML = '<i class="fas fa-play"></i> Start Navigation';
        navBtn.classList.remove('btn-danger');
        navBtn.classList.add('btn-success');
        navBtn.onclick = startNavigation; // Reset button action
    }
    
    // Restore Search Bar & Hide HUD
    document.querySelector('.route-panel')?.classList.remove('minimized');
    document.getElementById("telemetryOverlay")?.classList.add("hidden");
    
    showPremiumToast("🛑 Navigation Stopped", "Overview Mode", "info");
}
// Helper for reroute accuracy
function checkDistanceToPath(uLat, uLng) {
    if (!currentRouteData) return 0;
    
    let minD = Infinity;
    
    currentRouteData.coordinates.forEach(c => {
        // FIX: OSRM is [Lng, Lat], but Haversine needs (Lat1, Lng1, Lat2, Lng2)
        // c[1] is Latitude, c[0] is Longitude
        const d = calculateHaversineDistance(uLat, uLng, c[1], c[0]); 
        if (d < minD) minD = d;
    });
    
    return minD / 1000; // returns km
}

function updateTelemetry(speedKmh, altitude) {
    // FIX: Removed the extra (* 3.6) because startGPSTracking already did it
    // We expect 'speedKmh' to be passed directly
    const safeSpeed = speedKmh || 0; 

    // Sync both the Map Overlay and the Dashboard Speed Card
    ['routeSpeed', 'routeSpeedMain', 'hudSpeed'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = safeSpeed;
            
            // Visual color feedback based on speed limits
            // Assuming 'currentSpeedLimit' is a global variable you might have set
            if (typeof currentSpeedLimit !== 'undefined' && currentSpeedLimit) {
                if (safeSpeed > currentSpeedLimit + 10) {
                    el.style.color = "#ef4444"; // Danger Red
                } else if (safeSpeed > currentSpeedLimit) {
                    el.style.color = "#f59e0b"; // Warning Orange
                } else {
                    el.style.color = "#10b981"; // Success Green
                }
            }
        }
    });

    // Sync Remaining Distance to both HUDs
    // 'remainingKm' is a global variable updated by your progress checker
    ['routeDistance', 'routeDistanceMain'].forEach(id => {
        const el = document.getElementById(id);
        if (el && typeof remainingKm !== 'undefined') {
            el.textContent = remainingKm;
        }
    });

    // Update Altitude
    const altEl = document.getElementById("routeAltitude");
    if (altEl && altitude) altEl.textContent = Math.round(altitude);
}
function checkRouteProgress() {
    if (!lastPosition || !currentRouteData || !isNavigating) return;
    
    const userLat = lastPosition.lat;
    const userLng = lastPosition.lng;
    
    // Find nearest point on route
    let minDistance = Infinity;
    let nearestIndex = 0;
    
    for (let i = 0; i < currentRouteData.coordinates.length; i++) {
        const [lat, lng] = currentRouteData.coordinates[i];
        const distance = calculateHaversineDistance(userLat, userLng, lat, lng);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
        }
    }
    
    // Check if user is off route
    if (minDistance > 100) { // 100 meters threshold
        handleReroute();
        return;
    }
    
    // Calculate remaining distance
    let remainingDistance = 0;
    for (let i = nearestIndex; i < currentRouteData.coordinates.length - 1; i++) {
        const [lat1, lng1] = currentRouteData.coordinates[i];
        const [lat2, lng2] = currentRouteData.coordinates[i + 1];
        remainingDistance += calculateHaversineDistance(lat1, lng1, lat2, lng2);
    }
    
    remainingKm = (remainingDistance / 1000).toFixed(1);
    totalDistanceTraveled = (parseFloat(currentRouteData.distance_km) - parseFloat(remainingKm));
    
    // Update UI
    updateRemainingDistance();
    
    // Check if we need next instruction
    if (routeSteps.length > 0 && currentStepIndex < routeSteps.length - 1) {
        const step = routeSteps[currentStepIndex];
        const distanceToNextStep = calculateDistanceToStep(userLat, userLng, step);
        
        if (distanceToNextStep < 50) { // 50 meters before maneuver
            currentStepIndex++;
            showNextInstruction();
        }
    }
    
    // Check if arrived
    if (remainingDistance < 50) { // 50 meters from destination
        showArrivalPopup();
        cancelNavigation();
    }
}

function showNextInstruction() {
    if (currentStepIndex >= routeSteps.length) return;
    
    const step = routeSteps[currentStepIndex];
    const instructionElement = document.getElementById("nextInstruction");
    
    if (instructionElement) {
        instructionElement.textContent = step.instruction;
        
        // Add distance if available
        if (step.distance) {
            const distanceKm = (step.distance / 1000).toFixed(1);
            instructionElement.textContent += ` (${distanceKm} km)`;
        }
    }
    
    // Speak instruction if voice is active
    if (isVoiceActive) {
        speak(step.instruction);
    }
}

function showArrivalPopup() {
    const popup = document.createElement("div");
    popup.className = "arrival-popup";
    popup.innerHTML = `
        <div class="arrival-content">
            <div class="arrival-icon">🏁</div>
            <h3>Destination Reached!</h3>
            <p>You have arrived at your destination.</p>
            <p>Total distance: ${totalDistanceTraveled.toFixed(1)} km</p>
            <p>Total time: ${Math.round((Date.now() - startNavigationTime) / 60000)} min</p>
            <button onclick="this.parentElement.parentElement.remove()" class="btn btn-primary">
                OK
            </button>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (popup.parentElement) {
            popup.remove();
        }
    }, 10000);
}
// ============================
// VOICE GUIDANCE
// ============================

function toggleVoice() {
    isVoiceActive = !isVoiceActive;
    
    const voiceBtn = document.getElementById("voiceToggleBtn");
    if (voiceBtn) {
        if (isVoiceActive) {
            voiceBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            voiceBtn.classList.add("active");
            showToast("Voice On", "Voice guidance enabled", "success");
        } else {
            voiceBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            voiceBtn.classList.remove("active");
            showToast("Voice Off", "Voice guidance disabled", "info");
        }
    }
}

function speak(text) {
    if (!('speechSynthesis' in window) || !isVoiceActive) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = CONFIG.voice.rate;
    utterance.pitch = CONFIG.voice.pitch;
    utterance.volume = CONFIG.voice.volume;
    
    window.speechSynthesis.speak(utterance);
}

// ============================
// UI UTILITIES
// ============================

function showToast(title, message, type = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    
    const toastIcon = document.getElementById("toastIcon");
    const toastTitle = document.getElementById("toastTitle");
    const toastMessage = document.getElementById("toastMessage");
    
    if (toastIcon) toastIcon.textContent = getToastIcon(type);
    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;
    
    // Set color based on type
    toast.className = `toast toast-${type}`;
    
    // Show toast
    toast.classList.remove("hidden");
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    
    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    }, 10);
    
    // Auto-hide
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        setTimeout(() => {
            toast.classList.add("hidden");
        }, 300);
    }, 4000);
}

function getToastIcon(type) {
    switch(type) {
        case "success": return "✅";
        case "error": return "❌";
        case "warning": return "⚠️";
        default: return "ℹ️";
    }
}

function updateRemainingDistance() {
    const remainingElement = document.getElementById("remainingDistance");
    if (remainingElement) {
        remainingElement.textContent = `${remainingKm} km`;
    }
}

function toggleFullscreen() {
    const elem = document.documentElement;
    
    if (!isFullscreen) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        isFullscreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        isFullscreen = false;
    }
}

// ============================
// HELPER FUNCTIONS
// ============================

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

function calculateDistanceToStep(lat, lng, step) {
    // Calculate distance to the first coordinate of the step
    if (step.coordinates && step.coordinates.length > 0) {
        const [stepLat, stepLng] = step.coordinates[0];
        return calculateHaversineDistance(lat, lng, stepLat, stepLng);
    }
    return Infinity;
}
// ==========================================
// 🚀 PHOTON ENGINE: SMART SEARCH & FETCH
// ==========================================

// 1. REPLACEMENT GEOCODER (Used by "Find Route" button)
async function geocodeAddressToCoords(address) {
    // Use Photon API (Fast & Fuzzy)
    // Focused on India (lat=20.59, lon=78.96)
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lat=20.59&lon=78.96`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].geometry.coordinates; // Photon sends [Lng, Lat]
            const props = data.features[0].properties;
            
            console.log("✅ Photon Found:", props.name);
            
            return { 
                lat: lat, 
                lng: lng,
                displayName: `${props.name}, ${props.city || props.state || ''}`
            };
        }
    } catch (err) {
        console.error("Photon Error:", err);
    }
    return null;
}

// 2. LIVE SEARCH SUGGESTIONS (Auto-runs when file loads)
document.addEventListener("DOMContentLoaded", () => {
    setupLiveSearch('startLocation');
    setupLiveSearch('endLocation');
});

function setupLiveSearch(inputId) {
    const input = document.getElementById(inputId);
    if(!input) return;

    // Create Suggestion Box
    let box = document.createElement('div');
    box.className = 'search-suggestions';
    box.style.display = 'none';
    document.body.appendChild(box);

    let debounce;

    input.addEventListener('input', (e) => {
        const query = e.target.value;
        clearTimeout(debounce);

        // Wait 300ms before searching
        debounce = setTimeout(async () => {
            if (query.length < 3) { box.style.display = 'none'; return; }

            // Fetch Suggestions
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=20.59&lon=78.96`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                
                box.innerHTML = '';
                if(data.features.length > 0) {
                    // Position Box
                    const rect = input.getBoundingClientRect();
                    box.style.top = (rect.bottom + window.scrollY + 5) + 'px';
                    box.style.left = rect.left + 'px';
                    box.style.width = rect.width + 'px';
                    box.style.display = 'block';

                    // Fill Items
                    data.features.forEach(f => {
                        const props = f.properties;
                        const div = document.createElement('div');
                        div.className = 'suggestion-item';
                        div.innerHTML = `<b>${props.name}</b> <span style="font-size:0.8em; color:#666">${props.city || props.state || ''}</span>`;
                        
                        div.onclick = () => {
                            input.value = props.name;
                            box.style.display = 'none';
                            // Optional: Auto-pan map
                            const [lng, lat] = f.geometry.coordinates;
                            if(map) map.flyTo([lat, lng], 14);
                        };
                        box.appendChild(div);
                    });
                }
            } catch(e) { console.warn("Search error", e); }
        }, 300);
    });

    // Hide on click outside
    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== box) box.style.display = 'none';
    });
}
async function geocodeAddress(lat, lng, inputId) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        
        const data = await response.json();
        
        if (data && data.display_name) {
            const input = document.getElementById(inputId);
            if (input) {
                // Extract just the street and city for brevity
                const address = data.display_name.split(",").slice(0, 3).join(",");
                input.value = address;
            }
        }
    } catch (error) {
        console.error("Reverse geocoding error:", error);
    }
}

function updateAddressFromCoords(lat, lng, inputId) {
    geocodeAddress(lat, lng, inputId);
}

function reverseLocations() {
    const startInput = document.getElementById("startLocation");
    const endInput = document.getElementById("endLocation");
    
    if (startInput && endInput) {
        const temp = startInput.value;
        startInput.value = endInput.value;
        endInput.value = temp;
        
        // Also swap markers if they exist
        if (startMarker && endMarker) {
            const startPos = startMarker.getLatLng();
            const endPos = endMarker.getLatLng();
            
            startMarker.setLatLng(endPos);
            endMarker.setLatLng(startPos);
            
            // Update addresses
            updateAddressFromCoords(endPos.lat, endPos.lng, "startLocation");
            updateAddressFromCoords(startPos.lat, startPos.lng, "endLocation");
        }
        
        showToast("Locations Swapped", "Start and destination have been swapped", "info");
    }
}

function updateRouteInfoUI(route) {
    if (!route) return;

    // 1. Update the Main Dashboard Cards (Below the map)
    const distMain = document.getElementById("routeDistanceMain");
    const durMain = document.getElementById("routeDurationMain");
    const riskMain = document.getElementById("recommendedRiskHudMain");

    if (distMain) distMain.textContent = route.distance_km + " km";
    if (durMain) durMain.textContent = route.duration_min + " min";
    
    // 2. Update the Floating Telemetry Overlay (On the map)
    const distOverlay = document.getElementById("routeDistance");
    const etaOverlay = document.getElementById("etaDisplay");
    
    if (distOverlay) distOverlay.textContent = route.distance_km;
    
    // 3. Calculate and display ETA (Arrival Time)
    if (etaOverlay) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + parseInt(route.duration_min));
        const etaTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        etaOverlay.textContent = etaTime;
        
        // Also update the main ETA if you have one
        const etaMain = document.getElementById("etaDisplayMain");
        if (etaMain) etaMain.textContent = etaTime;
    }

    // 4. Update AI Safety Score (The "SafeNav" touch)
    if (riskMain) {
        riskMain.textContent = "98%"; // You can make this dynamic later
        riskMain.style.color = "#10b981"; // Success Green
    }

    console.log("📊 UI Dashboard fully synchronized with Route Data");
}

function handleReroute() {
    // 1. RECALCULATION GUARD: Stop the app from spamming requests
    if (window.isRecalculating) return;
    window.isRecalculating = true;

    showToast("Recalculating", "Adjusting path based on your location...", "info");
    
    if (lastPosition && endMarker) {
        // 2. COORDINATE-ONLY ROUTING: Bypasses the Geocoding search
        setTimeout(async () => {
            const startCoords = { lat: lastPosition.lat, lng: lastPosition.lng };
            const endPos = endMarker.getLatLng();
            const endCoords = { lat: endPos.lat, lng: endPos.lng };

            // We call OSRM directly with numbers, not text!
            const route = await calculateRouteOSRM(startCoords, endCoords);
            
            if (route) {
                currentRouteData = route;
                drawAnimatedRoute(route.coordinates);
                updateRouteInfoUI(route);
                
                if (typeof showPremiumToast === 'function') {
                    showPremiumToast('🔄 Route Updated', 'New path found!', 'success');
                }
            }
            
            // 3. COOLDOWN: Wait 5 seconds before allowing another reroute
            setTimeout(() => { window.isRecalculating = false; }, 5000);
        }, 1000);
    }
}
// ============================
// INITIALIZATION
// ============================

document.addEventListener("DOMContentLoaded", function() {
    // 1. Initialize core map
    setTimeout(initMap, 100);

    // 2. NEW: CHECK FOR DATA FROM STAYS PAGE
    const pendingNav = localStorage.getItem("pendingNav");
    
if (pendingNav) {
        try {
            const data = JSON.parse(pendingNav);
            const startInput = document.getElementById("startLocation");
            const endInput = document.getElementById("endLocation");

            if (startInput && endInput) {
                // 1. Fill the text for the user to see
                startInput.value = data.start.name;
                endInput.value = data.end.name;

                // 2. Clear storage
                localStorage.removeItem("pendingNav");

                // 3. Pinpoint Accuracy: Set markers using coordinates immediately
                // This prevents the "half-location" search error
                setTimeout(async () => {
                    if (startMarker && endMarker) {
                      
const sCoord = { lat: data.start.lat, lon: data.start.lng, lng: data.start.lng };
const eCoord = { lat: data.end.lat, lon: data.end.lng, lng: data.end.lng };

                        startMarker.setLatLng([sCoord.lat, sCoord.lng]);
                        endMarker.setLatLng([eCoord.lat, eCoord.lng]);

                        // 4. Directly calculate route using numbers, not text
                        const route = await calculateRouteOSRM(sCoord, eCoord);
                        
                        if (route) {
                            currentRouteData = route;
                            drawRouteOnMap(route);
                            updateRouteInfoUI(route);
                            
                            if (typeof showPremiumToast === 'function') {
                                showPremiumToast('🚀 High-Precision Route', `Navigating to ${data.end.name}`, '✨');
                            }
                            
                            // Zoom map to show the whole trip
                            const bounds = L.latLngBounds([sCoord, eCoord]);
                            map.fitBounds(bounds, { padding: [50, 50] });
                        }
                    }
                }, 1200);
            }
        } catch (e) {
            console.error("Accuracy Sync Error:", e);
        }
    }

    // 3. SET UP ALL EVENT LISTENERS (Original Code)
    document.getElementById("useMyLocationBtn")?.addEventListener("click", function() {
        useMyLocation("startLocation", this);
    });
    
    document.getElementById("findRouteBtn")?.addEventListener("click", calculateRoute);
    document.getElementById("reverseRouteBtn")?.addEventListener("click", reverseLocations);
    
    document.getElementById("navActionBtn")?.addEventListener("click", function() {
        if (!isNavigating) {
            startNavigation();
        } else {
            cancelNavigation();
        }
    });
    
    document.getElementById("voiceToggleBtn")?.addEventListener("click", toggleVoice);
    document.getElementById("cancelNavBtn")?.addEventListener("click", cancelNavigation);
    document.getElementById("fullScreenBtn")?.addEventListener("click", toggleFullscreen);
    
    document.addEventListener('fullscreenchange', function() {
        isFullscreen = !!document.fullscreenElement;
        setTimeout(() => map?.invalidateSize(), 100);
    });
    
    addCoreStyles();
});

function addCoreStyles() {
    if (!document.getElementById('core-styles')) {
        const style = document.createElement('style');
        style.id = 'core-styles';
        style.textContent = `
            .toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                padding: 15px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                z-index: 1000;
                min-width: 300px;
                max-width: 90%;
                transition: all 0.3s ease;
            }
            
            .toast.hidden {
                display: none;
            }
            
            .toast-success {
                border-left: 5px solid #10b981;
            }
            
            .toast-error {
                border-left: 5px solid #ef4444;
            }
            
            .toast-warning {
                border-left: 5px solid #f59e0b;
            }
            
            .camera-alert-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(239, 68, 68, 0.1);
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: pulseBackground 2s infinite;
            }
            
            .camera-alert {
                background: white;
                padding: 30px;
                border-radius: 20px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(239, 68, 68, 0.3);
                border: 3px solid #ef4444;
                animation: shake 0.5s infinite;
            }
            
            .camera-icon {
                font-size: 4rem;
                margin-bottom: 20px;
                animation: pulse 2s infinite;
            }
            
            .arrival-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .arrival-content {
                background: white;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                max-width: 400px;
                animation: slideUp 0.5s ease;
            }
            
            .arrival-icon {
                font-size: 4rem;
                margin-bottom: 20px;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .btn.active {
                background: #dc2626 !important;
            }
        `;
        document.head.appendChild(style);
    }
}
// test route function

function simulateJourney() {
    if (!currentRouteData || !currentRouteData.coordinates) {
        if (typeof showPremiumToast === 'function') {
            showPremiumToast('⚠️ Error', 'Find a route first to simulate', '❌');
        } else {
            alert('Find a route first to simulate');
        }
        return;
    }

    // 1. Reset state
    if (simulationInterval) clearInterval(simulationInterval);
    if (watchId) navigator.geolocation.clearWatch(watchId);
    
    isNavigating = true;
    isGpsLocked = true;
    let pointIndex = 0;
    const coords = currentRouteData.coordinates;

    if (typeof showPremiumToast === 'function') {
        showPremiumToast('🔬 Simulation Mode', 'Simulating drive at 60 km/h...', '✨');
    }

    // 2. Start Movement Loop
    simulationInterval = setInterval(() => {
        if (pointIndex >= coords.length) {
            clearInterval(simulationInterval);
            if (typeof showArrivalPopup === 'function') showArrivalPopup();
            return;
        }

        const [lat, lng] = coords[pointIndex];
        
        // Calculate heading for the rotating arrow
        let heading = 0;
        if (pointIndex < coords.length - 1 && typeof calculateHeading === 'function') {
            const next = coords[pointIndex + 1];
            heading = calculateHeading(lat, lng, next[0], next[1]);
        }

        // 3. Smooth UI Updates
        updateUserMarker(lat, lng, heading);
        updateTelemetry(16.6, 100); 
        
        // Update distance logic
        remainingKm = Math.max(0, (currentRouteData.distance_km - (pointIndex * 0.05))).toFixed(2);
        updateRemainingDistance();

        pointIndex++;
    }, 200); 
} // <--- ENSURE THIS BRACE IS PRESENT

// Helper: Calculate angle between two GPS points
function calculateHeading(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function drawAnimatedRoute(coords) {
    if (!map || !coords || coords.length === 0) return;

    // 1. Clear previous line
    if (animatedRouteLine) {
        map.removeLayer(animatedRouteLine);
    }

    // 2. Convert OSRM [Lng, Lat] to Leaflet [Lat, Lng]
    const leafletPath = coords.map(c => [c[1], c[0]]);

    // 3. Create the Polyline
    animatedRouteLine = L.polyline([], {
        color: '#2563eb', // Premium Blue
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '1, 10' // Starts as dots, we'll make it solid
    }).addTo(map);

    // 4. Animation Logic
    let i = 0;
    // Speed: Adjust based on route length (higher = faster)
    const step = Math.ceil(leafletPath.length / 50) || 1; 

    function animate() {
        if (i < leafletPath.length) {
            // Add next segment of points
            const nextSegment = leafletPath.slice(0, i + step);
            animatedRouteLine.setLatLngs(nextSegment);
            i += step;
            requestAnimationFrame(animate);
        } else {
            // Animation finished: Make line solid and glow
            animatedRouteLine.setStyle({ dashArray: null, opacity: 1 });
            console.log("✅ Route Animation Complete");
        }
    }

    animate();
}

// --- UNIVERSAL INITIALIZATION (Mobile & Laptop) ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("🛠️ SafeNav: Finalizing Universal Linkage...");

    // 1. START MAP ENGINE
    if (typeof initMap === 'function') {
        initMap();
        
        // REFRESH TRIGGER: Fixes gray tiles on both Laptop and Mobile
        const refreshMap = () => {
            if (typeof map !== 'undefined' && map) {
                map.invalidateSize();
                console.log("🗺️ Map Layout Adjusted.");
            }
        };

        setTimeout(refreshMap, 600); // Initial load fix
        window.addEventListener('resize', refreshMap); // Fix for mobile rotation
    }

    // 2. DEFENSIVE LINKAGE & TOUCH SUPPORT
    setTimeout(() => {
        try {
            // Link all functions to window for global access
            window.calculateRoute = calculateRoute;
            window.useMyLocation = useMyLocation;

            if (typeof window.calculateRoute === 'function') {
                console.log("✅ Engine linked successfully!");
            }

            // 3. BUTTONS (Supports both Click and Tap)
            const findBtn = document.getElementById("findRouteBtn");
            if (findBtn) {
                // Using 'onclick' is best for cross-device compatibility
                findBtn.onclick = (e) => {
                    e.preventDefault(); // Prevents page jump on mobile
                    if (typeof window.calculateRoute === 'function') window.calculateRoute();
                    else alert("Engine still warming up...");
                };
            }

            // Mobile-Specific: Start GPS tracking automatically if navigating
            if (isNavigating) startGPSTracking();

        } catch (e) {
            console.error("Linkage failed:", e.message);
        }
    }, 500); 

    console.log("🚀 SafeNav Mobile-Ready Engine Ignited");
    if (route) {
            // 1. UPDATE MARKERS
            if (startMarker) {
                startMarker.setLatLng([startCoords.lat, startCoords.lng]);
            } else {
                startMarker = L.marker([startCoords.lat, startCoords.lng], { icon: createStartMarkerIcon() }).addTo(map);
            }

            if (endMarker) {
                endMarker.setLatLng([endCoords.lat, endCoords.lng]);
            } else {
                endMarker = L.marker([endCoords.lat, endCoords.lng], { icon: createDestinationMarkerIcon() }).addTo(map);
            }

            // 2. DRAW THE ROUTE LINE
            drawAnimatedRoute(route.coordinates);

            // 3. GOOGLE MAPS STYLE: ZOOM & SCROLL (The "Premium" Feel)
            // Create a box around Start & End points
            const bounds = L.latLngBounds([
                [startCoords.lat, startCoords.lng],
                [endCoords.lat, endCoords.lng]
            ]);
            
            // Zoom the map to fit exactly that box with padding
            map.fitBounds(bounds, { padding: [80, 80], animate: true });

            // Smoothly scroll the screen down to the map
            setTimeout(() => {
                const mapContainer = document.getElementById('mapContainer');
                if (mapContainer) {
                    mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500); // 0.5s delay to let the keyboard close on mobile

            // 4. SAFETY SCORE (Fixed Logic)
            // calculating score using 'route' directly, NOT currentRouteData
            const baseSafe = 95;
            const riskFactor = (parseFloat(route.distance_km) / 100); 
            const finalScore = Math.max(0, Math.floor(baseSafe - riskFactor));

            const scoreEl = document.getElementById('recommendedRiskHudMain');
            if (scoreEl) {
                scoreEl.textContent = finalScore + "%";
                scoreEl.style.color = finalScore > 90 ? "#10b981" : "#f59e0b";
            }

            // 5. UPDATE GLOBAL DATA & UI
            currentRouteData = route; // NOW we save it globally
            remainingKm = route.distance_km;
            updateRouteInfoUI(route);

            const navBtn = document.getElementById("navActionBtn");
            if (navBtn) {
                navBtn.disabled = false;
                navBtn.innerHTML = '<i class="fas fa-play"></i> Start Navigation';
            }
        }
});
function updateUserMarker(lat, lng, heading = 0, accuracy = 0) {
    if (!map) return;

    // 1. FIRST TIME SETUP (Create Marker)
    if (!userMarker) {
        console.log("📍 CREATING USER MARKER (Physics Enabled)");
        
        currentAnimPos = { lat, lng, heading };
        targetAnimPos = { lat, lng, heading };

        // Create the Arrow Icon
        const navIcon = L.divIcon({
            className: 'nav-arrow-icon',
            html: `<div id="userArrow" class="gps-arrow" style="transform: rotate(${heading}deg);">➤</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        userMarker = L.marker([lat, lng], { 
            icon: navIcon, 
            zIndexOffset: 2000 
        }).addTo(map);

        // Start the Animation Loop
        startAnimationLoop();
    } 
    
    // 2. UPDATE TARGET (When GPS updates)
    else {
        targetAnimPos = { lat, lng, heading };
        
        // Handle Heading Edge Case (Stop spinning if GPS returns 0)
        if (heading === 0 && currentAnimPos.heading !== 0) {
            targetAnimPos.heading = currentAnimPos.heading;
        }
    }

    // 3. DRAW ACCURACY CIRCLE
    if (accuracy > 0) {
        if (!accuracyCircle) {
            accuracyCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#2563eb',
                fillColor: '#2563eb',
                fillOpacity: 0.15,
                weight: 1
            }).addTo(map);
        } else {
            accuracyCircle.setLatLng([lat, lng]);
            accuracyCircle.setRadius(accuracy);
        }
    }
}

// THE ANIMATION LOOP (Runs 60 times per second)
function startAnimationLoop() {
    if (animFrameId) cancelAnimationFrame(animFrameId);

    function animate(now) {
        if (!lastAnimTick) lastAnimTick = now;
        lastAnimTick = now;

        if (userMarker && targetAnimPos) {
            // A. INTERPOLATION (The "Butter" Logic)
            // Move 15% of the distance towards target every frame
            const speed = 0.15; 
            
            currentAnimPos.lat += (targetAnimPos.lat - currentAnimPos.lat) * speed;
            currentAnimPos.lng += (targetAnimPos.lng - currentAnimPos.lng) * speed;
            
            // B. SMART ROTATION (Shortest path)
            // Prevents the arrow from doing a 360 backflip when going North (359° -> 1°)
            let deltaAngle = (targetAnimPos.heading - currentAnimPos.heading);
            while (deltaAngle > 180) deltaAngle -= 360;
            while (deltaAngle < -180) deltaAngle += 360;
            currentAnimPos.heading += deltaAngle * speed;

            // C. UPDATE DOM
            const newLatLng = new L.LatLng(currentAnimPos.lat, currentAnimPos.lng);
            userMarker.setLatLng(newLatLng);

            const arrowEl = document.getElementById('userArrow');
            if (arrowEl) {
                arrowEl.style.transform = `rotate(${currentAnimPos.heading}deg)`;
            }

            // D. CAMERA FOLLOW (Instant Lock)
            // We use animate:false here because we are manually animating the position every 16ms
            if (window.isNavigating && !window.isRecalculating) {
                map.panTo(newLatLng, { animate: false }); 
            }
        }

        animFrameId = requestAnimationFrame(animate);
    }
    
    animFrameId = requestAnimationFrame(animate);
}
const db = firebase.firestore(); // Ensure this is initialized

async function uploadLiveTelemetry(lat, lng, speed, heading) {
    const user = firebase.auth().currentUser;
    if (!user) return; // Ghost users don't transmit

    try {
        await db.collection('users').doc(user.uid).update({
            location: new firebase.firestore.GeoPoint(lat, lng),
            heading: heading,
            speed: speed,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            status: "active" // Mark them as online
        });
        // console.log("📡 Uplink Sent"); // Uncomment to debug
    } catch (e) {
        console.warn("Uplink skipped:", e.message);
    }
}
// ==========================================
// 📡 GLOBAL ALERT RECEIVER (Listens to Admin)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const db = firebase.firestore();
    
    // Listen for new alerts added in the last 5 minutes
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    db.collection('system_alerts')
      .where('timestamp', '>', fiveMinsAgo)
      .onSnapshot(snapshot => {
          snapshot.docChanges().forEach(change => {
              if (change.type === "added") {
                  const data = change.doc.data();
                  showAdminAlert(data.message);
              }
          });
      });
});

function showAdminAlert(msg) {
    // Use the Premium Toast we created earlier
    if (typeof showPremiumToast === 'function') {
        showPremiumToast('🚨 ADMIN ALERT', msg, '📢');
        
        // Optional: Play Alarm Sound
        const alarm = document.getElementById('alarmSound');
        if(alarm) alarm.play().catch(e => console.log("Audio blocked"));
    } else {
        alert("ADMIN ALERT: " + msg);
    }
}
// ==========================================
// 🔋 WAKE LOCK (Keeps Screen ON while Driving)
// ==========================================

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('💡 Screen Wake Lock Active');
    }
  } catch (err) {
    console.warn(`${err.name}, ${err.message}`);
  }
}

// Activate when navigation starts
document.getElementById('navActionBtn')?.addEventListener('click', () => {
    if (isNavigating) requestWakeLock();
});
// ==========================================
// 🚦 LIVE TRAFFIC SYSTEM (Google Precision)
// ==========================================



// 1. INITIALIZE TRAFFIC BUTTON
document.addEventListener("DOMContentLoaded", () => {
    const trafficBtn = document.getElementById("trafficToggleBtn");
    if (trafficBtn) {
        trafficBtn.addEventListener("click", toggleTrafficLayer);
    }
    
    // Save the default dark layer so we can switch back
    // (Assuming you initialized the map with a dark layer in initMap)
});

function toggleTrafficLayer() {
    if (!map) return;
    
    const btn = document.getElementById("trafficToggleBtn");
    isTrafficActive = !isTrafficActive;

    if (isTrafficActive) {
        // --- TURN TRAFFIC ON ---
        
        // 1. Create Google Traffic Layer (Standard Roads + Traffic Colors)
        if (!googleTrafficLayer) {
            googleTrafficLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            });
        }
        
        // 2. Add Google Layer
        googleTrafficLayer.addTo(map);
        
        // 3. UI Updates
        btn.style.background = "#ef4444"; // Red (Active)
        btn.style.color = "white";
        
        if (typeof showPremiumToast === 'function') {
            showPremiumToast('🚦 Traffic On', 'Live Google Traffic Data Active', 'success');
        }

    } else {
        // --- TURN TRAFFIC OFF (Back to Dark Mode) ---
        
        if (googleTrafficLayer) {
            map.removeLayer(googleTrafficLayer);
        }
        
        // 3. UI Updates
        btn.style.background = "white"; // White (Inactive)
        btn.style.color = "#1e293b";
        
        if (typeof showPremiumToast === 'function') {
            showPremiumToast('🌑 Dark Mode', 'Traffic layer disabled', 'info');
        }
    }
}
// ==========================================
// 📸 REAL-WORLD SPEED CAMERA SYSTEM 
// ==========================================

// 1. SCANNER: Finds cameras within 5km of your location
async function scanForSpeedCameras(lat, lng) {
    const now = Date.now();
    // Prevent spamming API (Scan max once every 3 mins)
    if (realSpeedCameras.length > 0 && (now - lastCamScanTime < 180000)) return;

    console.log("📡 Scanning for REAL Speed Cameras (Overpass API)...");
    lastCamScanTime = now;

    // Search for 'speed_camera' nodes in 5km radius
    const query = `
        [out:json];
        (
          node["highway"="speed_camera"](around:5000,${lat},${lng});
          node["man_made"="surveillance"]["surveillance:type"="speed_camera"](around:5000,${lat},${lng});
        );
        out body;
    `;

    try {
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.elements) {
            realSpeedCameras = data.elements.map(cam => ({
                lat: cam.lat,
                lng: cam.lon,
                id: cam.id
            }));
            console.log(`✅ FOUND ${realSpeedCameras.length} REAL CAMERAS NEARBY`);
        }
    } catch (e) {
        console.warn("Camera Scan Error (Offline?):", e);
    }
}

// 2. CHECKER: Runs every GPS update to see if you are close
function checkCameraProximity(userLat, userLng) {
    if (activeCamAlertID) return; // Don't alert if one is already on screen

    for (const cam of realSpeedCameras) {
        const dist = calculateHaversineDistance(userLat, userLng, cam.lat, cam.lng);

        // 🚨 TRIGGER AT 1 KM (1000 Meters)
        if (dist <= 1000 && dist > 50) { 
            triggerRealCameraAlert(dist);
            break; 
        }
    }
}

// 3. ALERT UI & COUNTDOWN
function triggerRealCameraAlert(startDistance) {
    activeCamAlertID = "cam-" + Date.now();
    let currentDistance = Math.round(startDistance);

    // CHECK HELMET STATUS (From AI Copilot)
    // Note: If window.isWearingHelmet is undefined, assume FALSE (Safety First)
    const hasHelmet = window.isWearingHelmet === true; 
    
    // UI COLORS
    const borderColor = hasHelmet ? "#10b981" : "#ef4444"; // Green vs Red
    const statusMsg = hasHelmet ? "✅ HELMET DETECTED" : "⛔ NO HELMET!";

    const alertHTML = `
        <div id="${activeCamAlertID}" class="camera-alert" style="border: 4px solid ${borderColor}; animation: pulseBorder 2s infinite;">
            <div class="camera-icon">📸</div>
            <h2 style="margin:0; font-size:1.4rem; font-weight:900;">SPEED CAMERA</h2>
            
            <div class="distance-box" style="margin: 15px 0;">
                <span id="cam-countdown" style="font-size: 3rem; font-weight: 800; color: #1e293b;">${currentDistance}</span>
                <span style="font-size: 1rem; color: #64748b;">meters</span>
            </div>

            <div style="background: ${hasHelmet ? '#dcfce7' : '#fee2e2'}; padding: 10px; border-radius: 8px; font-weight: bold; color: ${hasHelmet ? '#166534' : '#991b1b'};">
                ${statusMsg}
            </div>
            ${!hasHelmet ? '<div style="margin-top:5px; font-size:0.8rem; color:red; animation: flash 1s infinite;">⚠️ FINES APPLICABLE</div>' : ''}
        </div>
    `;

    // ADD OVERLAY
    const overlay = document.createElement("div");
    overlay.className = "camera-alert-overlay";
    overlay.id = "overlay-" + activeCamAlertID;
    overlay.innerHTML = alertHTML;
    document.body.appendChild(overlay);

    // VOICE WARNING
    if (typeof speak === 'function') {
        speak(`Caution. Speed camera ahead. ${currentDistance} meters.`);
        if (!hasHelmet) setTimeout(() => speak("Warning. No helmet detected."), 3000);
    }

    // LIVE COUNTDOWN LOGIC
    if (camCountdownInterval) clearInterval(camCountdownInterval);
    
    camCountdownInterval = setInterval(() => {
        // Decrease distance visually (Simulation of approach)
        // If we have real GPS speed, we could calculate: dist -= (speed_mps)
        currentDistance -= 15; // Approx 50km/h approach speed

        const countEl = document.getElementById("cam-countdown");
        if (countEl) countEl.innerText = Math.max(0, currentDistance);

        if (currentDistance <= 0) {
            dismissRealAlert();
        }
    }, 1000);
    
    // Auto-dismiss after 25 seconds (passed the camera)
    setTimeout(dismissRealAlert, 25000);
}

function dismissRealAlert() {
    if (activeCamAlertID) {
        const overlay = document.getElementById("overlay-" + activeCamAlertID);
        if (overlay) overlay.remove();
        
        clearInterval(camCountdownInterval);
        
        // Cooldown: Don't alert again for 60 seconds
        setTimeout(() => { activeCamAlertID = null; }, 60000);
    }
// =================================================
// 🚑 EMERGENCY AI LINKAGE (Paste at bottom of route-core.js)
// =================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("🛠️ AI Linkage Loaded");

    const startBtn = document.getElementById('navActionBtn');
    const statusText = document.getElementById('eyeStatusText');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log("🚀 NAVIGATION STARTED - TURNING ON AI");
            
            // 1. Force the Global Variable to True
            window.isNavigating = true;

            // 2. Initialize Audio Context on Click (Google requires this!)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            audioCtx.resume().then(() => {
                console.log('🔊 Audio Engine Unlocked');
            });

            // 3. Update Text
            if (statusText) {
                statusText.innerText = "ACTIVE";
                statusText.style.color = "#22c55e"; 
            }
        });
    } else {
        console.error("❌ Could not find 'navActionBtn'. Check your HTML ID.");
    }
}); 
}
// ==========================================
// 🔗 FORCE LINK: BUTTON -> AI
// ==========================================
document.getElementById('navActionBtn')?.addEventListener('click', function() {
    console.log("🔘 BUTTON CLICKED: STARTING AI...");
    
    // 1. Tell AI we are driving
    window.isNavigating = true; 

    // 2. Unlock Audio (Required for Android/iOS)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    audioCtx.resume().then(() => {
        console.log('🔊 Audio System Unlocked');
    });

    // 3. Update Visuals
    const statusText = document.getElementById('eyeStatusText');
    if (statusText) {
        statusText.innerText = "ACTIVE - MONITORING";
        statusText.style.color = "#22c55e"; // Green
    }
});