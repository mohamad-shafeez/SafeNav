// ==========================================
// PREDICTION.JS - SaaS HARDENED & SYNCED
// ==========================================

let isMuted = false;
let radarWatchId = null;
let hasAlerted = false;
// 👉 DYNAMIC URL TOGGLE: Automatically switches between Local and Production
// This automatically uses your localhost for now, but is ready for Render later!
const API_BASE_URL = 'https://safenav-18sk.onrender.com';

let map;
let locationMarker;
let dangerCircle;
let currentWeatherLayer = null;
let radarLayer = null; 
let hydrationInterval = null;

const OWM_API_KEY = "2e698fd333a893b698fb23ac8de09b7f"; 

// --- ⚙️ UNIFIED INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const mapContainer = document.getElementById('predictionMap');
    
    if (mapContainer) {
        // 1. Initialize Map with mobile-friendly settings
        map = L.map('predictionMap', {
            tap: false, 
            wheelDebounceTime: 150
        }).setView([20.5937, 78.9629], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // 2. Force Render Fix for visibility (Slightly increased timeout for mobile performance)
        setTimeout(() => { map.invalidateSize(); }, 500);

        // 3. 🧬 NEW: Sync user's intelligence profile from Firebase
        syncEliteProfile();

        // 4. UI & Profile Sync (Initial View)
        updateActiveProfileUI();
        updateProfilePreview();

        // 5. Global Listeners
        const checkBtn = document.getElementById('checkRiskBtn');
        const geoBtn = document.getElementById('useMyLocationBtn');

        if (checkBtn) checkBtn.addEventListener('click', runFullAnalysis);
        if (geoBtn) geoBtn.addEventListener('click', () => {
            document.getElementById('locationInput').value = "My Location";
            runFullAnalysis();
        });

        // 6. Radar Update & Tab Focus Refresh
        updateRainRadar();
        setInterval(() => { if (!document.hidden) updateRainRadar(); }, 600000);
        window.addEventListener('focus', () => { if (map) map.invalidateSize(); });
    }
});

// 🧬 NEW: SYNC ELITE PROFILE LOGIC
async function syncEliteProfile() {
    // Check if firebase is defined to avoid crashes if script loads out of order
    if (typeof firebase === 'undefined') return;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const doc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    const profileDropdown = document.getElementById('userProfile');
                    
                    // Match the saved "Health Sensitivity" from Dashboard to this page
                    if (data.healthProfile && profileDropdown) {
                        const profileValue = data.healthProfile.toLowerCase();
                        profileDropdown.value = profileValue;
                        
                        // 👉 CRITICAL FIX: Save to localStorage so Planner and other pages can read it
                        localStorage.setItem('ai_user_profile', profileValue);

                        updateProfilePreview();
                        updateActiveProfileUI();
                        console.log("SafeNav: Health thresholds synced from cloud profile.");
                    }
                }
            } catch (err) {
                console.warn("Cloud sync failed, using local storage defaults.");
            }
        }
    });
}

// --- 🎙️ VOICE ENGINE ---
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
    }
}

// --- 🧠 MAIN ANALYSIS LOGIC ---
async function runFullAnalysis() {
    const checkBtn = document.getElementById('checkRiskBtn');
    const locationInput = document.getElementById('locationInput');
    const navBox = document.getElementById('nav-instruction-box');
    const navText = document.getElementById('nav-text');

    // 👉 UPDATE 1: Grab the duration value right when the button is clicked
    const durationInput = document.getElementById('tripDuration');
    const durationMins = durationInput ? parseInt(durationInput.value) : 30; // Default to 30 if input missing

    if (!locationInput || !locationInput.value) return alert("Please enter a location first.");

    // Loading UI State
    const originalBtnText = checkBtn.innerHTML;
    checkBtn.classList.add('btn-loading');
    checkBtn.innerHTML = `<span class="spinner"></span> AI Scanning...`;
    if (navBox) navBox.style.display = 'block';
    if (navText) navText.innerText = "Connecting to Satellite Data...";

    try {
        let coords;
        // A. Location Resolution (GPS or Geocoding)
        if (locationInput.value === "My Location") {
            coords = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    p => resolve({lat: p.coords.latitude, lon: p.coords.longitude}),
                    (err) => reject("GPS Access Denied"),
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });
        } else {
            const geoRes = await fetch(`${API_BASE_URL}/api/proxy/geocode?q=${encodeURIComponent(locationInput.value)}`);
            const geoData = await geoRes.json();
            if (!geoData.length) throw new Error("Location not found");
            coords = {lat: parseFloat(geoData[0].lat), lon: parseFloat(geoData[0].lon)};
        }

        // --- 🚀 Smooth Map Animation ---
        if (locationMarker) map.removeLayer(locationMarker);
        map.flyTo([coords.lat, coords.lon], 14, { animate: true, duration: 1.5 });
        locationMarker = L.marker([coords.lat, coords.lon]).addTo(map).bindPopup("Scanning...").openPopup();

        // --- 📜 Auto-Scroll to Result ---
        document.getElementById('predictionMap').scrollIntoView({ behavior: 'smooth', block: 'center' });

        // B. 🚀 CALLING THE BACKEND
        const hour = new Date().getHours();
        const activeProfile = document.getElementById('userProfile')?.value || localStorage.getItem('ai_user_profile') || 'standard';

        const response = await fetch(`${API_BASE_URL}/api/prediction/predict`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                lat: coords.lat, 
                lng: coords.lon, 
                time: (hour > 18 || hour < 6) ? 'night' : 'day', 
                travel_mode: document.getElementById('travelMode')?.value || 'walking',
                user_profile: activeProfile,
                duration_mins: durationMins // 👉 UPDATE 2: Send the duration to your Python backend!
            })
        });

        const data = await response.json();
        console.log("AI DATA RECEIVED:", data);
        
        // C. Result Handlers
        updatePredictionUI(data.risk_level, data.factors, data.advice, data.aqi, data.trend);
        drawDangerZone(coords.lat, coords.lon, data.risk_level);
        startHydrationAlert(data.risk_level);

        // --- 🎙️ VOICE ENGINE TRIGGER ---
        const profileSelect = document.getElementById('userProfile');
        let currentProfile = "Standard"; 
        if (profileSelect && profileSelect.selectedIndex !== -1) {
            currentProfile = profileSelect.options[profileSelect.selectedIndex].text;
        }

        let voiceMsg = `[${currentProfile} Mode]: Alert: ${data.risk_level}. ${data.advice}`;
        if (navText) navText.innerText = voiceMsg;
        
        if (window.speak && typeof window.speak === 'function') {
            window.speak(voiceMsg, true);
        }

    } catch (e) {
        if (navText) navText.innerText = "Connection Error. Please retry.";
        console.error("Analysis Failed:", e);
    } finally {
        checkBtn.classList.remove('btn-loading');
        checkBtn.innerHTML = originalBtnText;
    }
}
// --- 🎨 UI ENGINE ---
function updatePredictionUI(risk, factors, advice, aqi = 0, trend = "stable") {
    const badge = document.getElementById('predictedRisk');
    if (badge) {
        badge.textContent = risk;
        badge.className = 'status-badge ' + (risk ? risk.toLowerCase().replace(/\s/g, '') : 'unknown');
    }
    const aqiBadge = document.getElementById('aqiDisplay');
    if (aqiBadge) {
        let arrow = trend === "improving" ? " 📉" : (trend === "worsening" ? " 📈" : " ➡️");
        aqiBadge.innerHTML = `AQI: ${aqi}${arrow}`;
    }
    if (document.getElementById('predictionAdvice')) document.getElementById('predictionAdvice').textContent = advice;
    const list = document.getElementById('predictionFactors');
    if (list && factors && Array.isArray(factors)) {
        list.innerHTML = factors.map(f => `<li>⚠️ ${f}</li>`).join('');
    }
}

function drawDangerZone(lat, lon, risk) {
    if (dangerCircle) map.removeLayer(dangerCircle);
    const color = risk === "HIGH RISK" ? "#ef4444" : (risk === "MEDIUM RISK" ? "#f59e0b" : "#22c55e");
    dangerCircle = L.circle([lat, lon], { color, fillColor: color, fillOpacity: 0.3, radius: 3000 }).addTo(map);
}

// --- 🌧️ WEATHER LAYERS ---
function toggleWeatherLayer(layerType) {
    if (currentWeatherLayer) map.removeLayer(currentWeatherLayer);
    if (layerType === 'none') return;
    currentWeatherLayer = L.tileLayer(`https://tile.openweathermap.org/map/${layerType}/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`, {
        maxZoom: 19, opacity: 0.5, zIndex: 100
    }).addTo(map);
}

async function updateRainRadar() {
    try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        const latestTime = data.radar.past[data.radar.past.length - 1].time;
        if (radarLayer) map.removeLayer(radarLayer);
        radarLayer = L.tileLayer(`${data.host}/v2/radar/${latestTime}/512/{z}/{x}/{y}/7/1_1.png`, { opacity: 0.5, zIndex: 1000 }).addTo(map);
    } catch (err) { console.error("Radar Fail"); }
}

// --- 💧 HYDRATION SMART LOGIC ---
function startHydrationAlert(riskLevel) {
    const controlBox = document.getElementById('hydrationControl');
    if (hydrationInterval) clearInterval(hydrationInterval);
    if (riskLevel === "HIGH RISK") {
        if (controlBox) controlBox.style.display = 'block';
        hydrationInterval = setInterval(() => {
            if(typeof speak === 'function') speak("Time to hydrate. Please drink water now.");
        }, 1800000);
    } else {
        if (controlBox) controlBox.style.display = 'none';
    }
}

// --- 🧬 PROFILE & HINT SYNC ---
function updateActiveProfileUI() {
    const profile = document.getElementById('userProfile')?.value || localStorage.getItem('ai_user_profile') || 'standard';
    const label = document.getElementById('activeProfileLabel');
    
    // 👉 CRITICAL FIX: Added Heart Disease UI Mapping
    const profileNames = {
        'standard': '🏃 Standard',
        'respiratory': '🫁 Respiratory Sensitive',
        'elderly': '👴 Heat Sensitive',
        'heart disease': '🫀 Cardiac Sensitive',
        'worker': '🏗️ Outdoor Worker'
    };
    if (label) label.innerText = profileNames[profile.toLowerCase()] || profile;
}

function updateProfilePreview() {
    const profile = document.getElementById('userProfile')?.value || 'standard';
    const hint = document.getElementById('profileHint');
    
    // 👉 CRITICAL FIX: Added Heart Disease Profile Hint
    const hints = {
        'standard': 'Standard safety thresholds applied.',
        'respiratory': '🚨 Alerting for AQI levels > 70 (Asthma/COPD focus).',
        'elderly': '🔥 Alerting for Heat Index > 32°C (Vulnerable group focus).',
        'heart disease': '🫀 Alerting for high cardiac strain and moderate pollution.',
        'worker': '🏗️ Industrial exposure thresholds active (Full-day focus).'
    };
    if(hint) hint.innerText = hints[profile.toLowerCase()] || 'Profile thresholds active.';
}

// The Gatekeeper function
function toggleMute() {
    isMuted = !isMuted;
    const icon = document.getElementById('voiceIcon');
    const btn = document.getElementById('toggleVoiceBtn');

    if (isMuted) {
        icon.innerText = '🔇';
        btn.style.borderColor = '#94a3b8'; // Gray when muted
        if ('speechSynthesis' in window) speechSynthesis.cancel(); // Stop talking immediately
    } else {
        icon.innerText = '🔊';
        btn.style.borderColor = '#3b82f6'; // Blue when active
        
        // Confirm unmute with a quick sound
        if ('speechSynthesis' in window) {
            const msg = new SpeechSynthesisUtterance("Voice alerts active");
            speechSynthesis.speak(msg);
        }
    }
}

// 🎙️ UPDATED VOICE ENGINE
window.speak = function(text, priority = false) {
    if (isMuted) return; // 🛑 The Mute Check

    if (!('speechSynthesis' in window)) return;

    if (priority) speechSynthesis.cancel();

    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    msg.rate = 0.95;
    
    speechSynthesis.speak(msg);
};
// ==========================================
// 🔄 RESET PREDICT FORM TO PROFILE DEFAULTS
// ==========================================
window.restorePredictDefaults = async function() {
    // 1. Reset standard inputs to default
    const travelMode = document.getElementById('travelMode');
    if (travelMode) travelMode.value = 'walking';
    
    const tripDuration = document.getElementById('tripDuration');
    if (tripDuration) tripDuration.value = '30';
    
    const locationInput = document.getElementById('locationInput');
    if (locationInput) locationInput.value = '';

    // 2. Clear the AI Results UI
    document.getElementById('predictedRisk').textContent = '-';
    document.getElementById('predictedRisk').className = 'status-badge';
    document.getElementById('aqiDisplay').innerHTML = 'Loading...';
    document.getElementById('predictionAdvice').textContent = '';
    document.getElementById('predictionFactors').innerHTML = '';
    
    const navBox = document.getElementById('nav-instruction-box');
    if (navBox) navBox.style.display = 'none';

    // 3. Fetch Firebase and Reset the Health Profile
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const doc = await firebase.firestore().collection('users').doc(user.uid).get();
                    if (doc.exists) {
                        const data = doc.data();
                        const profileDropdown = document.getElementById('userProfile');
                        
                        if (profileDropdown && data.healthProfile) {
                            // Find the matching option regardless of capitalization
                            Array.from(profileDropdown.options).forEach(opt => {
                                if (opt.value.toLowerCase() === data.healthProfile.toLowerCase() || 
                                    opt.text.toLowerCase() === data.healthProfile.toLowerCase()) {
                                    
                                    profileDropdown.value = opt.value;
                                    profileDropdown.dispatchEvent(new Event('change')); // Updates the UI hint
                                }
                            });
                        }
                    }
                } catch (err) {
                    console.warn("Failed to restore predict defaults from cloud.");
                }
            }
        });
    }
    
    // 4. Remove the map danger circle if it exists
    if (dangerCircle && map) {
        map.removeLayer(dangerCircle);
    }
};
// ==========================================
// 📍 SMART AUTO-COMPLETE SEARCH (Nominatim API)
// ==========================================
const searchInput = document.getElementById('smartSearch');
const searchResults = document.getElementById('searchResults');
let searchTimeout = null;

if (searchInput) {
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous results and hide dropdown if empty
        if (query.length < 3) {
            searchResults.style.display = 'none';
            return;
        }

        // Debounce: Wait 400ms after they stop typing before fetching
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
                .then(res => res.json())
                .then(data => {
                    searchResults.innerHTML = '';
                    if (data.length > 0) {
                        searchResults.style.display = 'block';
                        data.forEach(place => {
                            const div = document.createElement('div');
                            div.innerHTML = `<i class="fas fa-map-marker-alt" style="color: var(--text-muted); margin-right: 8px;"></i> ${place.display_name}`;
                            div.style.cssText = 'padding: 12px 15px; cursor: pointer; border-bottom: 1px solid var(--glass-border); font-size: 0.85rem; color: var(--text-main);';
                            
                            // Hover effect
                            div.onmouseover = () => div.style.background = 'rgba(37, 99, 235, 0.1)';
                            div.onmouseout = () => div.style.background = 'transparent';
                            
                            // On Click Event
                            div.onclick = () => {
                                searchInput.value = place.display_name.split(',')[0]; // Put short name in box
                                searchResults.style.display = 'none';
                                
                                const lat = float(place.lat);
                                const lng = float(place.lon);
                                
                                // Move map and set marker!
                                map.flyTo([lat, lng], 13);
                                if (marker) map.removeLayer(marker);
                                marker = L.marker([lat, lng]).addTo(map);
                                
                                // Auto-trigger the prediction!
                                getPrediction(lat, lng); 
                            };
                            searchResults.appendChild(div);
                        });
                    } else {
                        searchResults.style.display = 'none';
                    }
                })
                .catch(err => console.error("Search Error:", err));
        }, 400);
    });

    // Close dropdown if user clicks outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== searchResults) {
            searchResults.style.display = 'none';
        }
    });
}

// ==========================================
// 🎯 DYNAMIC RADIUS SLIDER LOGIC
// ==========================================
const radiusSlider = document.getElementById('radiusSlider');
const radiusLabel = document.getElementById('radiusLabel');

if (radiusSlider) {
    // 1. Update the text label instantly as they drag
    radiusSlider.addEventListener('input', function() {
        radiusLabel.textContent = `${this.value} km`;
    });

    // 2. Redraw the danger circle when they let go of the slider
    radiusSlider.addEventListener('change', function() {
        const radiusInMeters = parseInt(this.value) * 1000;
        
        // If we already have a marker/circle on the map, update it!
        if (marker && dangerCircle) {
            const latLng = marker.getLatLng();
            map.removeLayer(dangerCircle);
            
            // Re-draw the circle with the new radius
            dangerCircle = L.circle(latLng, {
                color: '#ef4444',     // Red border
                fillColor: '#ef4444', // Red fill
                fillOpacity: 0.2,
                radius: radiusInMeters
            }).addTo(map);
            
            // Adjust the map zoom to fit the new circle size
            map.fitBounds(dangerCircle.getBounds());
        }
    });
}
// ==========================================
// 📡 LIVE "EN-ROUTE" RADAR ENGINE
// ==========================================
 

// 1. UI Toggle Logic
const radarToggle = document.getElementById('radarToggle');
const radarSettings = document.getElementById('radarSettings');
const radarStatus = document.getElementById('radarStatus');

if (radarToggle) {
    radarToggle.addEventListener('change', function() {
        if (this.checked) {
            radarSettings.style.display = 'block';
            startLiveRadar();
        } else {
            radarSettings.style.display = 'none';
            stopLiveRadar();
        }
    });
}

// 2. The Audio Engine (No external MP3s needed!)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'square'; // Sharp, urgent sound
    oscillator.frequency.value = 800; 
    gainNode.gain.value = 0.1; // Volume control
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 500); // Beep for half a second
}

function playVoiceAlert(message) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1.0;
        utterance.pitch = 1.2; // Slightly urgent pitch
        window.speechSynthesis.speak(utterance);
    }
}

// 3. Haversine Distance Math
function calculateDistanceKM(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 4. The Live Tracking Core
function startLiveRadar() {
    if (!marker) {
        alert("Please search for a Target Location first so the radar knows what to track!");
        radarToggle.checked = false;
        radarSettings.style.display = 'none';
        return;
    }

    if (!navigator.geolocation) {
        alert("Your browser does not support Live GPS Tracking.");
        return;
    }

    hasAlerted = false; // Reset the warning flag
    radarStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Connecting to Satellites...`;
    radarStatus.style.color = '#3b82f6'; // Blue

    // 🚀 Start watching the user's GPS position
    radarWatchId = navigator.geolocation.watchPosition(
        (position) => {
            radarStatus.innerHTML = `<i class="fas fa-satellite-dish"></i> Tracking Active (Live)`;
            radarStatus.style.color = '#10b981'; // Green
            
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            const targetLat = marker.getLatLng().lat;
            const targetLng = marker.getLatLng().lng;

            // Calculate distance to target
            const distanceToTarget = calculateDistanceKM(userLat, userLng, targetLat, targetLng);
            
            // Get Thresholds
            const sliderRadiusKm = parseFloat(document.getElementById('radiusSlider').value);
            const userWarningKm = parseFloat(document.getElementById('alertThreshold').value);
            
            // Total danger boundary = The size of the storm + how early they want to be warned
            const dangerBoundary = sliderRadiusKm + userWarningKm;

            // 🚨 TRIGGER ALERT IF THEY CROSS THE BOUNDARY
            if (distanceToTarget <= dangerBoundary && !hasAlerted) {
                hasAlerted = true; // Make sure it only fires once!
                
                const alertType = document.getElementById('alertType').value;
                const warningMsg = `Warning! You are approaching a high-risk environmental zone.`;
                
                if (alertType === 'voice') {
                    playVoiceAlert(warningMsg);
                } else if (alertType === 'beep') {
                    playBeep();
                }
                
                // Always show the visual popup
                showError(warningMsg); 
                
                radarStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> DANGER ZONE REACHED`;
                radarStatus.style.color = '#ef4444'; // Red
            }
        },
        (error) => {
            console.error("Radar Error:", error);
            radarStatus.innerHTML = `<i class="fas fa-times-circle"></i> GPS Signal Lost`;
            radarStatus.style.color = '#ef4444';
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
}

function stopLiveRadar() {
    if (radarWatchId !== null) {
        navigator.geolocation.clearWatch(radarWatchId);
        radarWatchId = null;
    }
    radarStatus.innerHTML = `<i class="fas fa-satellite"></i> Radar is OFF`;
    radarStatus.style.color = '#f59e0b'; // Yellow
}
// ==========================================
// 💾 SAVE & LOAD RADAR PREFERENCES
// ==========================================

const alertTypeDropdown = document.getElementById('alertType');
const alertThresholdInput = document.getElementById('alertThreshold');

// 1. Save to Firebase whenever the user changes a setting
function saveRadarPreferences() {
    if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
        const uid = firebase.auth().currentUser.uid;
        const db = firebase.firestore();
        
        // Using { merge: true } ensures we don't accidentally delete their health profile!
        db.collection('users').doc(uid).set({
            radarAlertType: alertTypeDropdown.value,
            radarThreshold: parseFloat(alertThresholdInput.value)
        }, { merge: true })
        .then(() => console.log("Radar preferences synced to cloud!"))
        .catch(err => console.error("Error saving radar preferences:", err));
    }
}

// Attach the auto-save listeners
if (alertTypeDropdown) alertTypeDropdown.addEventListener('change', saveRadarPreferences);
if (alertThresholdInput) alertThresholdInput.addEventListener('change', saveRadarPreferences);

// 2. Auto-Load settings when the page boots up
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const db = firebase.firestore();
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    
                    // Inject their saved preferences into the UI
                    if (data.radarAlertType && alertTypeDropdown) {
                        alertTypeDropdown.value = data.radarAlertType;
                    }
                    if (data.radarThreshold && alertThresholdInput) {
                        alertThresholdInput.value = data.radarThreshold;
                    }
                }
            } catch (err) {
                console.warn("Failed to load radar preferences.", err);
            }
        }
    });
}