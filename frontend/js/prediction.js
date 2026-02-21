// ==========================================
// PREDICTION.JS - SaaS HARDENED & SYNCED
// ==========================================

let isMuted = false;

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

        // 2. Force Render Fix for visibility
        setTimeout(() => { map.invalidateSize(); }, 300);

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
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const doc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    const profileDropdown = document.getElementById('userProfile');
                    
                    // Match the saved "Health Sensitivity" from Dashboard to this page
                    if (data.healthProfile && profileDropdown) {
                        profileDropdown.value = data.healthProfile.toLowerCase();
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

    if (!locationInput || !locationInput.value) return alert("Please enter a location first.");

    // Loading UI State
    const originalBtnText = checkBtn.innerHTML;
    checkBtn.classList.add('btn-loading');
    checkBtn.innerHTML = `<span class="spinner"></span> AI Scanning...`;
    if (navBox) navBox.style.display = 'block';
    if (navText) navText.innerText = "Connecting to Satellite Data...";

    try {
        let coords;
        // A. Location Resolution
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

        // B. 🚀 CALLING THE DYNAMIC BACKEND URL
        const hour = new Date().getHours();
        const response = await fetch(`${API_BASE_URL}/api/prediction/predict`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                lat: coords.lat, 
                lng: coords.lon, 
                time: (hour > 18 || hour < 6) ? 'night' : 'day', 
                travel_mode: document.getElementById('travelMode').value,
                user_profile: document.getElementById('userProfile').value
            })
        });

        const data = await response.json();
        console.log("AI DATA RECEIVED:", data);
        // C. Result Handlers
        updatePredictionUI(data.risk_level, data.factors, data.advice, data.aqi, data.trend);
        drawDangerZone(coords.lat, coords.lon, data.risk_level);
        startHydrationAlert(data.risk_level);

        // --- 🎙️ SAFE VOICE TRIGGER (FIXED PART) ---
        const profileSelect = document.getElementById('userProfile');
        let currentProfile = "Standard"; // Default fallback if dropdown is broken

        if (profileSelect && profileSelect.selectedIndex !== -1) {
            currentProfile = profileSelect.options[profileSelect.selectedIndex].text;
        }

        let voiceMsg = `[${currentProfile} Mode]: Alert: ${data.risk_level}. ${data.advice}`;
        if (navText) navText.innerText = voiceMsg;
        
        // Use the global speak function from voice-alerts.js
        if (window.speak) {
            window.speak(voiceMsg, true);
        } else {
            speak(voiceMsg); // Fallback to local speak if window.speak isn't ready
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
        badge.className = 'status-badge ' + risk.toLowerCase().replace(/\s/g, '');
    }
    const aqiBadge = document.getElementById('aqiDisplay');
    if (aqiBadge) {
        let arrow = trend === "improving" ? " 📉" : (trend === "worsening" ? " 📈" : " ➡️");
        aqiBadge.innerHTML = `AQI: ${aqi}${arrow}`;
    }
    if (document.getElementById('predictionAdvice')) document.getElementById('predictionAdvice').textContent = advice;
    const list = document.getElementById('predictionFactors');
    if (list) {
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
            speak("Time to hydrate. Please drink water now.");
        }, 1800000);
    } else {
        if (controlBox) controlBox.style.display = 'none';
    }
}

// --- 🧬 PROFILE & HINT SYNC ---
function updateActiveProfileUI() {
    const profile = document.getElementById('userProfile').value || localStorage.getItem('ai_user_profile') || 'standard';
    const label = document.getElementById('activeProfileLabel');
    const profileNames = {
        'standard': '🏃 Standard',
        'respiratory': '🫁 Respiratory Sensitive',
        'elderly': '👴 Heat Sensitive',
        'worker': '🏗️ Outdoor Worker'
    };
    if (label) label.innerText = profileNames[profile] || profile;
}

function updateProfilePreview() {
    const profile = document.getElementById('userProfile').value;
    const hint = document.getElementById('profileHint');
    const hints = {
        'standard': 'Standard safety thresholds applied.',
        'respiratory': '🚨 Alerting for AQI levels > 70 (Asthma/COPD focus).',
        'elderly': '🔥 Alerting for Heat Index > 32°C (Vulnerable group focus).',
        'worker': '🏗️ Industrial exposure thresholds active (Full-day focus).'
    };
    if(hint) hint.innerText = hints[profile];
}

// The Gatekeeper function
function toggleMute() {
    isMuted = !isMuted;
    const icon = document.getElementById('voiceIcon');
    const btn = document.getElementById('toggleVoiceBtn');

    if (isMuted) {
        icon.innerText = '🔇';
        btn.style.borderColor = '#94a3b8'; // Gray when muted
        speechSynthesis.cancel(); // Stop talking immediately
    } else {
        icon.innerText = '🔊';
        btn.style.borderColor = '#3b82f6'; // Blue when active
        
        // Confirm unmute with a quick sound
        const msg = new SpeechSynthesisUtterance("Voice alerts active");
        speechSynthesis.speak(msg);
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