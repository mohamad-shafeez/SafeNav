/* =========================================================
   SAFE STAYS & TRAVEL — TOMTOM POWERED (ENHANCED)
   ========================================================= */

let map;
let userMarker = null;
let markersLayer;
let startCoords = null;
let selectedPlace = null;
let voiceEnabled = true;
let isDiscovering = false;
let pageTransition = null;
let discoverSession = 0;
const TOMTOM_KEY = "eYv21bMhwipW5ydBVnvHYOtcsquJznMB";

// Add animation classes to CSS dynamically
const addAnimationStyles = () => {
    if (!document.getElementById('dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-styles';
        style.textContent = `
            .pulse-glow {
                animation: pulseGlow 1.5s infinite alternate;
            }
            @keyframes pulseGlow {
                from { box-shadow: 0 0 5px rgba(37, 99, 235, 0.5); }
                to { box-shadow: 0 0 20px rgba(37, 99, 235, 0.8); }
            }
            .slide-up {
                animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .bounce-in {
                animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }
            @keyframes bounceIn {
                0% { transform: scale(0.3); opacity: 0; }
                50% { transform: scale(1.05); }
                70% { transform: scale(0.9); }
                100% { transform: scale(1); opacity: 1; }
            }
            .search-highlight {
                animation: searchHighlight 1s ease;
            }
            @keyframes searchHighlight {
                0% { background: #fef3c7; }
                100% { background: white; }
            }
        `;
        document.head.appendChild(style);
    }
};

/* ---------------- INIT MAP ---------------- */
document.addEventListener("DOMContentLoaded", () => {
    
    // Add animation styles
    addAnimationStyles();
    
    // Get page transition element
    pageTransition = document.getElementById('pageTransition');
    
    if (typeof L === "undefined") {
        console.error("❌ Leaflet not loaded");
        return;
    }

    const mapEl = document.getElementById("staysMap");
    if (!mapEl) {
        console.error("❌ #staysMap not found");
        return;
    }

    markersLayer = L.layerGroup();
    map = L.map("staysMap").setView([20.5937, 78.9629], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }).addTo(map);

    markersLayer.addTo(map);
    
    // Add custom control for radius display
    addRadiusControl();

    // Setup all event listeners
    setupEventListeners();
    
    // Initial user location attempt
    setTimeout(() => {
        if (!startCoords) {
            getUserLocation();
        }
    }, 1000);
});

/* ---------------- SETUP EVENT LISTENERS ---------------- */
function setupEventListeners() {
    // Voice Toggle
    document.getElementById("voiceToggle").onchange = e => {
        voiceEnabled = e.target.checked;
        const label = document.getElementById("voiceStatusLabel");
        label.innerText = voiceEnabled ? "Active" : "Muted";
        label.style.color = voiceEnabled ? "#10b981" : "#ef4444";
        
        // Animation feedback
        if (voiceEnabled) {
            label.classList.add("bounce-in");
            setTimeout(() => label.classList.remove("bounce-in"), 600);
            speak("Voice guidance activated", "high");
        }
    };

    // Enter key in search input
    document.getElementById("startInput").addEventListener("keydown", e => {
        if (e.key === "Enter") {
            manualSearchLocation(true);
        }
    });
    
    // Manual Search Button (NEW)
    const manualSearchBtn = document.getElementById("manualSearchBtn");
    if (manualSearchBtn) {
        manualSearchBtn.onclick = () => manualSearchLocation(true);
    }

    /* ---------------- FILTER TOGGLE ---------------- */
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.onclick = function() {
            const wasActive = this.classList.contains("active");
            this.classList.toggle("active");
            
            // Animation
            if (!wasActive) {
                this.classList.add("bounce-in");
                setTimeout(() => this.classList.remove("bounce-in"), 600);
                
                // Speak feedback
                const filterName = this.querySelector("span").textContent;
                speak(`Showing ${filterName} places`, "normal");
            }
        };
    });

    /* ---------------- GPS LOCATION ---------------- */
    document.getElementById("myLocBtn").onclick = () => {
        getUserLocation(true);
    };

    /* ---------------- DISCOVER PLACES ---------------- */
    document.getElementById("discoverBtn").onclick = () => {
        discoverPlaces();
    };

    /* ---------------- CLEAR MAP ---------------- */
    document.getElementById("clearMapBtn").onclick = () => {
        clearMap();
    };

    /* ---------------- RADIUS SLIDER ---------------- */
    document.getElementById("radiusSlider").oninput = e => {
        const value = e.target.value;
        document.getElementById("radiusLabel").innerText = `${value} km`;
        
        // Update radius circle if exists
        updateRadiusCircle(value);
        
        // Visual feedback
        const label = document.getElementById("radiusLabel");
        label.classList.add("pulse-glow");
        setTimeout(() => label.classList.remove("pulse-glow"), 500);
    };

    /* ---------------- START NAVIGATION ---------------- */
    document.getElementById("startNavBtn").onclick = () => {
        startNavigationFromStay();
    };
}

function getUserLocation(forceUpdate = false) {
    const btn = document.getElementById("myLocBtn");
    const originalText = btn.innerHTML;
    
    if (!navigator.geolocation) {
        alert("GPS not supported");
        return;
    }
    
    btn.innerHTML = '🛰️ Locating...';
    btn.disabled = true;
    btn.style.background = '#475569';
    
    navigator.geolocation.getCurrentPosition(
        async pos => {
            const lat = Number(pos.coords.latitude);
            const lng = Number(pos.coords.longitude);
            startCoords = { lat, lng };
            
            if (userMarker) map.removeLayer(userMarker);
            
            userMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: `<div class="user-location-icon"></div>`,
                    className: "bounce-in",
                    iconSize: [44.8, 44.8],
                    iconAnchor: [22.4, 44.8]
                })
            }).addTo(map);
            
            map.flyTo([lat, lng], 15, { 
                duration: 1.2,
                animate: true 
            });
            
            try {
                const res = await fetch(
                    `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_KEY}`
                );
                const data = await res.json();
                const address = data.addresses?.[0]?.address?.freeformAddress || "My Location";
                document.getElementById("startInput").value = address;
            } catch (err) {
                document.getElementById("startInput").value = "My Location";
            }
            
            btn.innerHTML = '✅ Located!';
            btn.style.background = '#10b981';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '#0f172a';
                btn.disabled = false;
            }, 1500);
            
            if (forceUpdate) {
                speak("Location found", "high");
                updateRadiusCircle(document.getElementById("radiusSlider").value);
            }
        },
        err => {
            btn.innerHTML = '❌ Failed';
            btn.style.background = '#ef4444';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '#0f172a';
                btn.disabled = false;
            }, 2000);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

/* ---------------- MANUAL SEARCH LOCATION ---------------- */
async function manualSearchLocation(withAnimation = false) {
    const query = document.getElementById("startInput").value.trim();
    if (!query) {
        speak("Please enter a location to search", "high");
        return;
    }
    
    const searchBtn = document.getElementById("manualSearchBtn");
    const originalText = searchBtn.innerHTML;
    
    if (withAnimation) {
        searchBtn.innerHTML = '⏳ Searching...';
        searchBtn.disabled = true;
        searchBtn.style.background = '#475569';
        
        const input = document.getElementById("startInput");
        input.classList.add("search-highlight");
        setTimeout(() => input.classList.remove("search-highlight"), 1000);
    }
    
    try {
        const res = await fetch(
            `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?key=${TOMTOM_KEY}`
        );
        const data = await res.json();
        
        if (!data.results || !data.results.length) {
            alert("Location not found. Please try a different name.");
            speak("Location not found. Try another name.", "high");
            return;
        }
        
        const pos = data.results[0].position;
console.log("DEBUG TomTom position:", pos); // Add this line
startCoords = { 
    lat: Number(pos.lat), 
    lng: Number(pos.lon)  // Make sure it's 'lon' not 'lng'
};

        if (userMarker) map.removeLayer(userMarker);

        // FIXED: Use [lat, lng] format with correct coordinates
        userMarker = L.marker([startCoords.lat, startCoords.lng], {
            icon: L.divIcon({
                html: `<div class="user-location-icon"></div>`,
                className: "bounce-in",
                iconSize: [44.8, 44.8],
                iconAnchor: [22.4, 44.8]
            })
        }).addTo(map);

        // FIXED: Use correct coordinates
        map.flyTo([startCoords.lat, startCoords.lng], 14, { 
            duration: 1.2,
            animate: true 
        });
        
        if (withAnimation) {
            searchBtn.innerHTML = '✅ Found!';
            searchBtn.style.background = '#10b981';
            
            setTimeout(() => {
                searchBtn.innerHTML = originalText;
                searchBtn.style.background = '#2563eb';
                searchBtn.disabled = false;
            }, 1500);
        }
        
        speak(`Search center set to ${query}`, "high");
        updateRadiusCircle(document.getElementById("radiusSlider").value);
        
    } catch (err) {
        console.error("Search error:", err);
        alert("Search failed. Please check your connection and try again.");
        speak("Search failed. Please try again.", "high");
        
        if (withAnimation) {
            searchBtn.innerHTML = '❌ Failed';
            searchBtn.style.background = '#ef4444';
            
            setTimeout(() => {
                searchBtn.innerHTML = originalText;
                searchBtn.style.background = '#2563eb';
                searchBtn.disabled = false;
            }, 2000);
        }
    }
}

/* ---------------- DISCOVER PLACES ---------------- */
/* ---------------- DISCOVER PLACES (FULL CORRECTED) ---------------- */
function discoverPlaces() {
    if (!startCoords) {
        speak("Please set your location first.", "high");
        alert("Use GPS or Search first to set a starting point.");
        return;
    }
    
    // 1. UI Reset & Map Focus
    const mapEl = document.getElementById("staysMap");
    if (mapEl) mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
    
    markersLayer.clearLayers();
    selectedPlace = null;
    
    // Hide HUD during new discovery
    const hud = document.getElementById("navBridgeHUD");
    if (hud) hud.style.display = "none";
    
    // Initialize bounds with user's current location
    const bounds = L.latLngBounds([startCoords.lat, startCoords.lng]);
    
    const radiusKm = Number(document.getElementById("radiusSlider").value) || 5;
    const activeFilters = document.querySelectorAll(".filter-btn.active");
    
    if (activeFilters.length === 0) {
        speak("Please select at least one category like hotels or cafes.", "normal");
        alert("Select at least one filter category.");
        return;
    }
    
    // 2. Session Management
    // Incremented every time Discover is clicked to stop old async results
    discoverSession++;
    const currentSession = discoverSession;
    const totalFilters = activeFilters.length;
    let completedFilters = 0;
    
    // 3. Visual Feedback (Loader & Button)
    const loader = document.getElementById("loader");
    if (loader) {
        loader.style.display = "flex";
        loader.classList.add("slide-up");
    }
    
    const discoverBtn = document.getElementById("discoverBtn");
    discoverBtn.innerHTML = '🔄 Searching...';
    discoverBtn.disabled = true;
    discoverBtn.style.background = '#475569';
    
    // 4. Loop Through Selected Categories
    activeFilters.forEach(btn => {
        const emoji = btn.dataset.emoji || "📍";
        let query = btn.dataset.query;
        
        // Clean query (e.g., "category=hotel" -> "hotel")
        if (query.includes("=")) {
            query = query.split("=")[1].replace(/_/g, " ");
        }
        
        speak(`Searching for ${query} nearby`, "normal");
        
        // TomTom POI Search API URL
        const url = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(query)}.json?key=${TOMTOM_KEY}&lat=${startCoords.lat}&lon=${startCoords.lng}&radius=${radiusKm * 1000}&limit=30`;
        
        fetch(url)
            .then(res => res.json())
            .then(data => {
                // Stop processing if the user has already started a NEW discovery session
                if (currentSession !== discoverSession) return;

                if (!data.results || data.results.length === 0) {
                    finalizeFilter();
                    return;
                }
                
                speak(`Found ${data.results.length} ${query} places`, "high");
                
                data.results.forEach((place, index) => {
                    // --- DEFINE CONSTANTS FIRST ---
                    const pLat = Number(place.position.lat);
                    const pLng = Number(place.position.lon); // TomTom uses 'lon'
                    const pName = place.poi?.name || "Unnamed Place";
                    const pCity = place.address?.municipality || "this area";
                    const safeName = pName.replace(/'/g, "\\'"); // Fixes apostrophes in names

                    // Validate Coords
                    if (isNaN(pLat) || isNaN(pLng)) return;
                    
                    // --- STAGGERED MARKER PLACEMENT ---
                    setTimeout(() => {
                        if (currentSession !== discoverSession) return;
                        
                        const marker = L.marker([pLat, pLng], {
                            icon: L.divIcon({
                                html: `<div class="poi-emoji">${emoji}</div>`,
                                className: "leaflet-div-icon",
                                iconSize: [40, 40],
                                iconAnchor: [20, 40]
                            })
                        });
                        
                        marker.addTo(markersLayer);
                        bounds.extend([pLat, pLng]);
                        
                        // Object to store for navigation
                        const placeObj = { 
                            name: pName, 
                            lat: pLat, 
                            lng: pLng, 
                            city: pCity,
                            type: query,
                            emoji: emoji
                        };
                        
                        marker.on("click", () => {
                            selectPlace(placeObj);
                            const distKm = map.distance(
                                [startCoords.lat, startCoords.lng],
                                [pLat, pLng]
                            ) / 1000;
                            
                            // --- START OF UPDATED AFFILIATE POPUP LOGIC ---
                        
                        // 1. Calculate Prices based on category
                       // --- START OF UPDATED AFFILIATE POPUP LOGIC ---
                        
                        // 1. Calculate Prices based on category
                        let basePriceUSD = 60; // Default medium
                        if (query.toLowerCase().includes("resort") || query.toLowerCase().includes("luxury")) basePriceUSD = 250;
                        if (query.toLowerCase().includes("hostel") || query.toLowerCase().includes("lodge") || query.toLowerCase().includes("oyo")) basePriceUSD = 20;

                        const priceUSD = Math.floor(basePriceUSD + (Math.random() * 40));
                        const priceINR = (priceUSD * 83).toLocaleString('en-IN'); 
                        
                        // 2. Exact Search Query for Booking.com
                        const exactSearchQuery = pName + " " + pCity;

                        // 3. The New Dual-Action Popup (Booking + Navigation)
                        const popupHTML = `
                            <div class="popup-card" style="text-align:center; min-width:190px;">
                                <div style="font-weight:800; color:#1c3c72; font-size:1rem; margin-bottom:5px;">${emoji} ${pName}</div>
                                
                                <div style="color: #10b981; font-weight: 900; font-size: 17px; margin-bottom: 2px;">
                                    $${priceUSD} <span style="color: #64748b; font-size: 13px;">(₹${priceINR})</span>
                                </div>
                                <div style="font-size:0.75rem; color:#64748b; margin-bottom:12px;">${pCity} • ${distKm.toFixed(1)} km away</div>
                                
                                <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(exactSearchQuery)}&aid=2779272" target="_blank" 
                                   style="display: block; background: #003580; color: white; text-decoration: none; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 13px; margin-bottom: 8px; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                                    🏨 Book on Booking.com
                                </a>

                                <button onclick="window.prepareNavigation(${pLat}, ${pLng}, '${safeName}')"
                                    style="background:#2563eb; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; width:100%; font-weight:600; transition:0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                                    🚗 Navigate Here
                                </button>
                            </div>`;
                            
                        marker.bindPopup(popupHTML).openPopup();
                        // --- END OF UPDATED AFFILIATE POPUP LOGIC ---
                        });
                    }, index * 60); // Creates a "pop-in" effect
                });
                
                finalizeFilter();
            })
            .catch(err => {
                console.error("Discovery error:", err);
                finalizeFilter();
            });
    });
    
    // Internal helper to check when all API calls are done
    function finalizeFilter() {
        completedFilters++;
        if (completedFilters === totalFilters) {
            setTimeout(() => {
                if (currentSession !== discoverSession) return;

                if (bounds.isValid() && markersLayer.getLayers().length > 0) {
                    map.flyToBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 15,
                        duration: 1.5
                    });
                }
                
                if (loader) loader.style.display = "none";
                
                discoverBtn.innerHTML = '🔍 Discover Places';
                discoverBtn.disabled = false;
                discoverBtn.style.background = '#2563eb';
                discoverBtn.classList.add("bounce-in");
                
                speak(`Discovery complete! Showing ${markersLayer.getLayers().length} locations.`, "high");
                
                setTimeout(() => discoverBtn.classList.remove("bounce-in"), 600);
            }, 500);
        }
    }
}

/* ---------------- SELECT PLACE ---------------- */
function selectPlace(place) {
    selectedPlace = place;
    
    const distKm = map.distance([startCoords.lat, startCoords.lng], [place.lat, place.lng]) / 1000;
    
    speak(
        `${place.name}. ${distKm.toFixed(1)} kilometers away. Tap navigate to start.`,
        "high"
    );
    
    const hud = document.getElementById("navBridgeHUD");
    const display = document.getElementById("selectedPlaceDisplay");
    
    if (hud && display) {
        display.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                <span style="font-size: 20px;">${place.emoji}</span>
                <span>${place.name}</span>
            </div>
            <div style="font-size: 0.9rem; color: #2563eb; font-weight: 600; margin-top: 5px;">
                ${distKm.toFixed(1)} km away • ${place.type}
            </div>
        `;
        
        hud.style.display = "block";
        hud.style.opacity = "0";
        hud.style.transform = "translateY(20px)";
        
        setTimeout(() => {
            hud.style.opacity = "1";
            hud.style.transform = "translateY(0)";
        }, 10);
        
        const startBtn = document.getElementById("startNavBtn");
        startBtn.classList.add("pulse-glow");
    }
    
    map.flyTo([place.lat, place.lng], 16, { 
        animate: true, 
        duration: 1.2 
    });
}

/* ---------------- CLEAR MAP ---------------- */
function clearMap() {
    markersLayer.clearLayers();
    selectedPlace = null;
    
    const hud = document.getElementById("navBridgeHUD");
    if (hud) {
        hud.style.opacity = "0";
        hud.style.transform = "translateY(20px)";
        setTimeout(() => {
            hud.style.display = "none";
        }, 300);
    }
    
    const startBtn = document.getElementById("startNavBtn");
    if (startBtn) startBtn.classList.remove("pulse-glow");
    
    if (userMarker && !isDiscovering) {
        map.flyTo(userMarker.getLatLng(), 14, { 
            animate: true,
            duration: 1 
        });
    }
    
    speak("Map cleared", "low");
}

/* ---------------- RADIUS VISUALIZATION ---------------- */
let radiusCircle = null;

function updateRadiusCircle(radiusKm) {
    if (!startCoords) return;
    
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
    }
    
    radiusCircle = L.circle([startCoords.lat, startCoords.lng], {
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        radius: radiusKm * 1000,
        weight: 2
    }).addTo(map);
}

function addRadiusControl() {
    const RadiusControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.innerHTML = `
                <div style="background: white; padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); font-size: 0.9rem; font-weight: 600; color: #2563eb;">
                    Radius: <span id="liveRadius">5</span> km
                </div>
            `;
            return container;
        }
    });
    
    map.addControl(new RadiusControl());
    
    document.getElementById('radiusSlider').addEventListener('input', function(e) {
        const liveRadius = document.getElementById('liveRadius');
        if (liveRadius) {
            liveRadius.textContent = e.target.value;
            liveRadius.style.color = '#ef4444';
            setTimeout(() => liveRadius.style.color = '#2563eb', 300);
        }
    });
}

/* ---------------- NAVIGATION HANDOFF (ACCURACY OPTIMIZED) ---------------- */
function startNavigationFromStay() {
    if (!startCoords || !selectedPlace) {
        showPremiumToast('⚠️ Selection Required', 'Please select a place on the map first.', 'warning');
        return;
    }
    
    // Using Coordinates (lat/lng) is 100% accurate regardless of partial addresses
    const navData = {
        start: {
            name: document.getElementById("startInput").value || "My Location",
            lat: startCoords.lat,
            lng: startCoords.lng || startCoords.lon // Handle TomTom 'lon' vs Leaflet 'lng'
        },
        end: {
            name: selectedPlace.name,
            lat: selectedPlace.lat,
            lng: selectedPlace.lng || selectedPlace.lon,
            emoji: selectedPlace.emoji
        }
    };
    
    localStorage.setItem("pendingNav", JSON.stringify(navData));
    
    // UI Feedback
    const hud = document.getElementById("navBridgeHUD");
    if (hud) {
        hud.style.opacity = "0";
        hud.style.transform = "translateY(20px)";
    }
    
    speak(`Starting navigation to ${selectedPlace.name}`, "high");
    setTimeout(() => transitionToRoute(), 500);
}

function prepareNavigation(lat, lng, name) {
    if (!startCoords) {
        showPremiumToast('📍 Location Needed', 'Please set your search center first.', 'info');
        return;
    }
    
    const navData = {
        start: {
            name: document.getElementById("startInput").value || "My Location",
            lat: startCoords.lat,
            lng: startCoords.lng || startCoords.lon
        },
        end: {
            name: name,
            lat: lat,
            lng: lng
        }
    };
    
    localStorage.setItem("pendingNav", JSON.stringify(navData));
    speak(`Navigating to ${name}`, "high");
    setTimeout(() => transitionToRoute(), 500);
}

function transitionToRoute() {
    if (pageTransition) {
        pageTransition.classList.add("active");
        
        pageTransition.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px; animation: bounce 1s infinite;">🚀</div>
                <div style="font-size: 1.2rem; font-weight: 700; margin-bottom: 10px;">Routing to ${selectedPlace?.name || 'Destination'}</div>
                <div style="font-size: 0.9rem; opacity: 0.8;">Preparing navigation...</div>
            </div>
        `;
    }
    
    setTimeout(() => {
        window.location.href = "route.html";
    }, 1000);
}

/* ===============================
   SMART VOICE ENGINE
================================ */
let voiceQueueTimeout = null;

function speak(text, priority = "normal") {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    speechSynthesis.cancel();
    if (voiceQueueTimeout) clearTimeout(voiceQueueTimeout);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    const delay = priority === "high" ? 150 : 350;
    
    voiceQueueTimeout = setTimeout(() => {
        speechSynthesis.speak(utterance);
    }, delay);
}

// Make functions global
window.startNavigationFromStay = startNavigationFromStay;
window.prepareNavigation = prepareNavigation;
window.manualSearchLocation = manualSearchLocation;
window.selectPlace = selectPlace;
console.log("✅ stays.js enhanced version loaded");
