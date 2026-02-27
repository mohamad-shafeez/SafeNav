/* =========================================================
   SAFE STAYS & TRAVEL — MAPLIBRE + TOMTOM (V3 FULL UX)
   ========================================================= */

let map;
let userMarker = null;
let markersArray = []; 
let startCoords = null;
let selectedPlace = null; // Used for the HUD
let voiceEnabled = true;
let isDiscovering = false;
let discoverSession = 0;
let radiusCircleId = 'radius-circle';

const TOMTOM_KEY = CONFIG.TOMTOM_KEY;
const MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'; 
/* ---------------- 1. INIT MAPLIBRE ---------------- */
function initStaysMap() {
    // 🛡️ THE SAFETY CHECK: Wait for CONFIG to be ready
    if (typeof CONFIG === 'undefined' || typeof MAP_STYLE_URL === 'undefined') {
        console.warn("⏳ Stays Config/Style not ready, retrying in 100ms...");
        setTimeout(initStaysMap, 100);
        return;
    }

    map = new maplibregl.Map({
        container: 'staysMap',
        style: MAP_STYLE_URL,
        center: [78.9629, 20.5937], 
        zoom: 4,
        pitch: 45, 
        attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'bottom-right');

    map.on('load', () => {
        console.log("✅ MapLibre Vector Map Loaded (Full UX)");
        setupEventListeners();
        setupModalLogic();
        setupAutocomplete();

        setTimeout(() => {
            // Check if startCoords exists (declared in your global state)
            if (typeof startCoords === 'undefined' || !startCoords) getUserLocation();
        }, 1000);
    });
}

// Kick off the initialization
document.addEventListener("DOMContentLoaded", initStaysMap);

/* ---------------- 2. MODAL & UI LOGIC ---------------- */
function setupModalLogic() {
    const modal = document.getElementById("filterModal");
    
    document.getElementById("openFiltersBtn").onclick = () => {
        modal.classList.add("active");
        speak("Select categories to discover", "normal");
    };
    
    document.getElementById("closeFiltersBtn").onclick = () => modal.classList.remove("active");
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove("active");
    };

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.onclick = function() {
            this.classList.toggle("selected");
            if (this.classList.contains("selected")) {
                const filterName = this.querySelector("span").textContent;
                speak(filterName + " selected", "low");
            }
        };
    });
}

/* ---------------- 3. EVENT LISTENERS ---------------- */
function setupEventListeners() {
    document.getElementById("voiceToggle").onchange = e => {
        voiceEnabled = e.target.checked;
        if (voiceEnabled) speak("Voice guidance activated", "high");
    };

    document.getElementById("manualSearchBtn").onclick = () => manualSearchLocation(true);
    
    document.getElementById("startInput").addEventListener("keydown", e => {
        if (e.key === "Enter") {
            document.getElementById("autocompleteResults").style.display = "none";
            manualSearchLocation(true);
        }
    });

    document.getElementById("myLocBtn").onclick = () => getUserLocation(true);

    document.getElementById("discoverBtn").onclick = () => {
        document.getElementById("filterModal").classList.remove("active"); 
        discoverPlaces();
    };

    document.getElementById("clearMapBtn").onclick = () => clearMap();

    document.getElementById("radiusSlider").oninput = e => {
        const value = e.target.value;
        document.getElementById("radiusLabel").innerText = `${value} km`;
        updateRadiusCircle(value);
    };

    // THE HUD NAVIGATION BUTTON
    const startNavBtn = document.getElementById("startNavBtn");
    if(startNavBtn) {
        startNavBtn.onclick = () => startNavigationFromStay();
    }

    // THE NEW HUD CLOSE BUTTON LOGIC (ADD THIS NOW)
    const hudCloseBtn = document.getElementById("closeHUD");
    if (hudCloseBtn) {
        hudCloseBtn.onclick = (e) => {
            if(e) e.stopPropagation(); 
            const hud = document.getElementById("navBridgeHUD");
            hud.style.opacity = "0";
            hud.style.transform = "translate(-50%, 20px)";
            
            setTimeout(() => {
                hud.style.display = "none";
            }, 300);

            // Clear map popups for a fresh start
            markersArray.forEach(m => {
                if (m.getPopup() && m.getPopup().isOpen()) m.getPopup().remove();
            });
            
            speak("Selection cleared", "low");
        };
    }
}

/* ---------------- 4. AUTOCOMPLETE ---------------- */
let debounceTimer;
function setupAutocomplete() {
    const input = document.getElementById("startInput");
    const resultsDiv = document.getElementById("autocompleteResults");

    input.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value;
        
        if (query.length < 3) {
            resultsDiv.style.display = "none";
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_KEY}&limit=5`);
                const data = await res.json();
                
                if (data.results && data.results.length > 0) {
                    resultsDiv.innerHTML = "";
                    data.results.forEach(item => {
                        const div = document.createElement("div");
                        div.className = "autocomplete-item";
                        div.innerText = `${item.poi ? item.poi.name + ', ' : ''}${item.address.freeformAddress}`;
                        div.onclick = () => {
                            input.value = div.innerText;
                            resultsDiv.style.display = "none";
                            manualSearchLocation(true); 
                        };
                        resultsDiv.appendChild(div);
                    });
                    resultsDiv.style.display = "block";
                }
            } catch (err) {}
        }, 300);
    });

    document.addEventListener("click", (e) => {
        if (e.target !== input && e.target !== resultsDiv) {
            resultsDiv.style.display = "none";
        }
    });
}

/* ---------------- 5. LOCATION & SEARCH ---------------- */
function getUserLocation(forceUpdate = false) {
    if (!navigator.geolocation) return;
    speak("Locating you...", "normal");
    
    navigator.geolocation.getCurrentPosition(
        async pos => {
            const lat = Number(pos.coords.latitude);
            const lng = Number(pos.coords.longitude);
            startCoords = { lat, lng };
            
            setCenterMarker(lng, lat);
            
            try {
                const res = await fetch(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_KEY}`);
                const data = await res.json();
                const address = data.addresses?.[0]?.address?.freeformAddress || "My Location";
                document.getElementById("startInput").value = address;
            } catch (err) {}
            
            if (forceUpdate) speak("Location found", "high");
            updateRadiusCircle(document.getElementById("radiusSlider").value);
        },
        err => { speak("Failed to get location", "high"); },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

async function manualSearchLocation(withAnimation = false) {
    const query = document.getElementById("startInput").value.trim();
    if (!query) return;
    
    try {
        const res = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?key=${TOMTOM_KEY}`);
        const data = await res.json();
        
        if (!data.results || !data.results.length) {
            speak("Location not found.", "high");
            return;
        }
        
        const pos = data.results[0].position;
        startCoords = { lat: Number(pos.lat), lng: Number(pos.lon) };
        
        setCenterMarker(startCoords.lng, startCoords.lat);
        speak(`Search center set to ${query}`, "high");
        updateRadiusCircle(document.getElementById("radiusSlider").value);
        
    } catch (err) {}
}

function setCenterMarker(lng, lat) {
    if (userMarker) userMarker.remove();
    const el = document.createElement('div');
    el.innerHTML = '📍';
    el.style.fontSize = '35px';
    el.style.filter = 'drop-shadow(0px 4px 4px rgba(0,0,0,0.3))';
    el.style.transform = 'translateY(-15px)';
    
    userMarker = new maplibregl.Marker({element: el})
        .setLngLat([lng, lat])
        .addTo(map);
        
    map.flyTo({ center: [lng, lat], zoom: 14, speed: 1.5 });
}

/* ---------------- 6. DISCOVER PLACES (TOMTOM + OVERPASS DUAL ENGINE) ---------------- */
function discoverPlaces() {
    if (!startCoords) {
        speak("Please set your location first.", "high");
        return;
    }
    
    clearMapMarkersOnly();
    
    const hud = document.getElementById("navBridgeHUD");
    if (hud) hud.style.display = "none";
    
    const radiusKm = Number(document.getElementById("radiusSlider").value) || 5;
    const activeFilters = document.querySelectorAll(".filter-btn.selected");
    
    if (activeFilters.length === 0) {
        speak("Please select at least one category.", "normal");
        document.getElementById("filterModal").classList.add("active");
        return;
    }
    
    discoverSession++;
    const currentSession = discoverSession;
    let bounds = new maplibregl.LngLatBounds();
    bounds.extend([startCoords.lng, startCoords.lat]);
    
    let completedRequests = 0;
    // Each filter now triggers 2 APIs (TomTom + Overpass)
    const totalRequests = activeFilters.length * 2; 
    
    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "flex";
    
    isDiscovering = true;

    // --- HELPER FUNCTION: DRAWS THE ACTUAL PINS ---
    function plotPin(pLat, pLng, pName, pFullAddress, isAccommodation, queryLower, emoji, typeName, index) {
        if (!pName || pName === "Unnamed Place") return; // Skip unnamed garbage data
        
        const safeName = pName.replace(/'/g, "\\'");
        const safeAddress = pFullAddress.replace(/'/g, "\\'");
        
        const from = turf.point([startCoords.lng, startCoords.lat]);
        const to = turf.point([pLng, pLat]);
        const distKm = turf.distance(from, to, {units: 'kilometers'});

        let bookingHTML = "";
        let priceHTML = "";

        if (isAccommodation) {
            let minPrice, maxPrice;
            if (queryLower.includes("hostel") || queryLower.includes("oyo") || queryLower.includes("budget") || queryLower.includes("lodge") || pName.toLowerCase().includes("hostel")) {
                minPrice = 500; maxPrice = 1800; 
            } else if (queryLower.includes("resort") || pName.toLowerCase().includes("resort")) {
                minPrice = 6500; maxPrice = 18000; 
            } else if (queryLower.includes("luxury") || queryLower.includes("premium") || pName.toLowerCase().includes("taj")) {
                minPrice = 12000; maxPrice = 35000; 
            } else {
                minPrice = 2000; maxPrice = 5500; 
            }

            const priceINR = Math.floor(Math.random() * (maxPrice - minPrice + 1) + minPrice);
            const priceUSD = Math.round(priceINR / 83); 
            
            priceHTML = `<div style="color: #10b981; font-weight: 900; font-size: 16px; margin-bottom: 2px;">
                            $${priceUSD} <span style="color: #64748b; font-size: 12px;">(₹${priceINR.toLocaleString('en-IN')})</span>
                         </div>`;
            
            const affiliateId = "2779272"; 
            bookingHTML = `<a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(pFullAddress)}&aid=${affiliateId}" target="_blank" 
                           style="display: block; background: #003580; color: white; text-decoration: none; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 13px; margin-bottom: 8px;">
                           🏨 Book Now
                        </a>`;
        }

        const placeObj = { 
            name: pName, fullAddress: pFullAddress, lat: pLat, lng: pLng, 
            type: typeName, emoji: emoji, distKm: distKm
        };

        setTimeout(() => {
            if (currentSession !== discoverSession) return;
            
            const el = document.createElement('div');
            el.className = 'poi-marker';
            el.innerHTML = `<div style="background:white; border-radius:50%; padding:5px; box-shadow:0 2px 10px rgba(0,0,0,0.2); font-size:20px; border:2px solid #2563eb; cursor:pointer;">${emoji}</div>`;
            
            const popupHTML = `
                <div style="text-align:center;">
                    <div class="custom-popup-title">${emoji} ${pName}</div>
                    ${priceHTML}
                    <span class="custom-popup-address">${pFullAddress} <br/> <strong style="color:var(--primary)">${distKm.toFixed(1)} km away</strong></span>
                    ${bookingHTML}
                    <button class="custom-nav-btn" onclick="window.prepareNavigation(${pLat}, ${pLng}, '${safeName}', '${emoji}', '${safeAddress}')">
                        🚗 Navigate Here
                    </button>
                </div>
            `;
            
            const popup = new maplibregl.Popup({ offset: 25, closeButton: true, closeOnClick: true, className: 'glass-popup' }).setHTML(popupHTML);
            
            const marker = new maplibregl.Marker({element: el}).setLngLat([pLng, pLat]).setPopup(popup).addTo(map);
            marker.getElement().addEventListener('click', () => selectPlace(placeObj));
            
            popup.on('close', () => {
                const hud = document.getElementById("navBridgeHUD");
                if (hud) { hud.style.opacity = "0"; setTimeout(() => hud.style.display = "none", 300); }
            });

            markersArray.push(marker);
            bounds.extend([pLng, pLat]);
            
        }, index * 25); // Faster animation to handle more pins
    }

    // --- FETCH DATA FOR EACH FILTER ---
    activeFilters.forEach(btn => {
        const emoji = btn.querySelector('.emoji').innerText;
        let query = btn.dataset.query;
        let queryLower = query.toLowerCase();
        let typeName = btn.querySelector('span').innerText;
        
        const isAccommodation = ['hotel', 'oyo', 'luxury', 'resort', 'homestay', 'motel', 'camping', 'cabin', 'lodge', 'guest house'].some(kw => queryLower.includes(kw));
        
        // 1. TOMTOM API REQUEST (Commercial Data)
        const tomtomUrl = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(query)}.json?key=${TOMTOM_KEY}&lat=${startCoords.lat}&lon=${startCoords.lng}&radius=${radiusKm * 1000}&limit=30`;
        
        fetch(tomtomUrl).then(res => res.json()).then(data => {
            if (currentSession !== discoverSession) return;
            if (data.results) {
                data.results.forEach((place, index) => {
                    const pLat = Number(place.position.lat);
                    const pLng = Number(place.position.lon);
                    const pName = place.poi?.name;
                    const pFullAddress = place.address?.freeformAddress || pName + ", " + (place.address?.municipality || "Local Area");
                    plotPin(pLat, pLng, pName, pFullAddress, isAccommodation, queryLower, emoji, typeName, index);
                });
            }
            checkCompletion();
        }).catch(() => checkCompletion());

        // 2. OVERPASS API REQUEST (Open-Source Local Data)
        let osmTag = `["name"~"(?i)${query}"]`; // Default regex search
        if (isAccommodation) osmTag = `["tourism"~"hotel|hostel|guest_house|motel|camp_site"]`;
        else if (queryLower.includes('hospital') || queryLower.includes('clinic')) osmTag = `["amenity"~"hospital|clinic"]`;
        else if (queryLower.includes('petrol') || queryLower.includes('gas')) osmTag = `["amenity"="fuel"]`;

        const overpassQuery = `[out:json][timeout:10];(node${osmTag}(around:${radiusKm * 1000},${startCoords.lat},${startCoords.lng});way${osmTag}(around:${radiusKm * 1000},${startCoords.lat},${startCoords.lng}););out center limit 30;`;
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

        fetch(overpassUrl).then(res => res.json()).then(data => {
            if (currentSession !== discoverSession) return;
            if (data.elements) {
                data.elements.forEach((place, index) => {
                    const pLat = place.lat || place.center?.lat;
                    const pLng = place.lon || place.center?.lon;
                    const pName = place.tags?.name;
                    // OSM doesn't always have addresses, so we construct a smart fallback
                    const street = place.tags?.["addr:street"] ? place.tags["addr:street"] + ", " : "";
                    const city = place.tags?.["addr:city"] || "Local Area";
                    const pFullAddress = street + city;
                    
                    if (pLat && pLng && pName) {
                        plotPin(pLat, pLng, pName, pFullAddress, isAccommodation, queryLower, emoji, typeName, index + 30); // Offset index so animations don't clash
                    }
                });
            }
            checkCompletion();
        }).catch(() => checkCompletion());
    });

    // --- CHECK WHEN ALL REQUESTS ARE DONE ---
    function checkCompletion() {
        completedRequests++;
        if (completedRequests === totalRequests) {
            setTimeout(() => {
                if (currentSession !== discoverSession) return;
                if (loader) loader.style.display = "none";
                isDiscovering = false;
                if (!bounds.isEmpty()) {
                    map.fitBounds(bounds, { padding: 80, maxZoom: 15, speed: 1.2 });
                }
                speak(`Discovery complete. Found ${markersArray.length} places.`, "high");
            }, 800);
        }
    }
}
/* ---------------- 7. SELECT PLACE & HUD (OPTIMIZED) ---------------- */
function selectPlace(place) {
    selectedPlace = place;
    
    speak(`${place.name}. ${place.distKm.toFixed(1)} kilometers away.`, "high");
    
    const hud = document.getElementById("navBridgeHUD");
    const display = document.getElementById("selectedPlaceDisplay");
    
    if (hud && display) {
        // We added 'text-overflow' logic here so long names don't break the UI
        display.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                <span style="font-size: 24px;">${place.emoji}</span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${place.name}</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${place.distKm.toFixed(1)} km away • ${place.type}
            </div>
        `;
        
        // Ensure the HUD is visible and trigger the animation
        hud.style.display = "block";
        
        // Reset animation state for a "pop-in" effect
        hud.style.transition = "none"; 
        hud.style.opacity = "0";
        hud.style.transform = "translate(-50%, 30px)";
        
        // Small delay to allow the browser to register the 'none' transition before animating
        setTimeout(() => {
            hud.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
            hud.style.opacity = "1";
            hud.style.transform = "translate(-50%, 0)";
        }, 50);
    }
}
/* ---------------- 8. CLEARING & RADIUS ---------------- */
function clearMapMarkersOnly() {
    markersArray.forEach(marker => marker.remove());
    markersArray = [];
}

function clearMap() {
    clearMapMarkersOnly();
    selectedPlace = null;
    
    const hud = document.getElementById("navBridgeHUD");
    if (hud) hud.style.display = "none";
    
    if (userMarker) {
        map.flyTo({ center: userMarker.getLngLat(), zoom: 14, speed: 1.5 });
    }
    speak("Map cleared", "low");
}

function updateRadiusCircle(radiusKm) {
    if (!startCoords || !map.isStyleLoaded()) return;

    const center = [startCoords.lng, startCoords.lat];
    const options = {steps: 64, units: 'kilometers'};
    const circlePolygon = turf.circle(center, radiusKm, options);

    if (map.getSource(radiusCircleId)) {
        map.getSource(radiusCircleId).setData(circlePolygon);
    } else {
        map.addSource(radiusCircleId, { type: 'geojson', data: circlePolygon });
        map.addLayer({ id: radiusCircleId + '-fill', type: 'fill', source: radiusCircleId, paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.1 } });
        map.addLayer({ id: radiusCircleId + '-line', type: 'line', source: radiusCircleId, paint: { 'line-color': '#2563eb', 'line-width': 2, 'line-dasharray': [2, 2] } });
    }
}

/* ---------------- 9. NAVIGATION HANDOFF (ROCKET TRANSITION BACK) ---------------- */
function startNavigationFromStay() {
    if (!startCoords || !selectedPlace) return;
    
    const navData = {
        start: {
            name: document.getElementById("startInput").value || "My Location",
            lat: startCoords.lat,
            lng: startCoords.lng
        },
        end: {
            name: selectedPlace.name,
            address: selectedPlace.fullAddress, // 👈 THIS IS THE CRUCIAL NEW LINE
            lat: selectedPlace.lat,
            lng: selectedPlace.lng,
            emoji: selectedPlace.emoji || '📍'
        }
    };
    
    localStorage.setItem("pendingNav", JSON.stringify(navData));
    
    const hud = document.getElementById("navBridgeHUD");
    if (hud) hud.style.display = "none";
    
    speak(`Starting navigation to ${selectedPlace.name}`, "high");
    transitionToRoute();
}
function transitionToRoute() {
    const pageTransition = document.getElementById('pageTransition');
    if (pageTransition) {
        pageTransition.style.display = "flex";
        pageTransition.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 60px; margin-bottom: 20px; animation: bounce 1s infinite;">🚀</div>
                <div style="font-size: 1.5rem; font-weight: 800; margin-bottom: 10px;">Routing to ${selectedPlace?.name || 'Destination'}</div>
                <div style="font-size: 1rem; opacity: 0.8;">Calculating Safe Route...</div>
            </div>
        `;
    }
    
    setTimeout(() => {
        window.location.href = "route.html";
    }, 1200);
}

/* ---------------- 10. SMART VOICE ENGINE ---------------- */
let voiceQueueTimeout = null;
function speak(text, priority = "normal") {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    speechSynthesis.cancel();
    if (voiceQueueTimeout) clearTimeout(voiceQueueTimeout);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1;
    
    const delay = priority === "high" ? 100 : 300;
    voiceQueueTimeout = setTimeout(() => {
        speechSynthesis.speak(utterance);
    }, delay);
}
/* ---------------- 11. POPUP NAVIGATION BRIDGE ---------------- */
window.prepareNavigation = function(lat, lng, name, emoji, address) {
    selectedPlace = {
        name: name,
        fullAddress: address,
        lat: lat,
        lng: lng,
        emoji: emoji
    };
    startNavigationFromStay();
};

window.startNavigationFromStay = function() {
    if (!selectedPlace) return;

    // 1. Pack the suitcase (Save data to browser memory)
    const navData = {
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        name: selectedPlace.name
    };
    localStorage.setItem('pendingNavDestination', JSON.stringify(navData));

    console.log("🚀 Teleporting to Route Page with destination:", selectedPlace.name);

    // 2. Go to the Route page
    window.location.href = 'route.html';
};