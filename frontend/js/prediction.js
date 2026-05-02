// ==========================================
// PREDICTION.JS - SAFENAV (FIXED + HARDENED)
// Fix: MapLibre "zoom not supported" watermark
//      — removed visualizePitch: true
//      — NavigationControl replaced with safe version
//      — dark map tile style synced to dark mode
// ==========================================

let map;
let marker = null;
let isMuted = false;
let radarWatchId = null;
let hasAlerted = false;
let nasaLayerActive = false;
let activeWeatherLayer = 'none';

// 👉 Dynamic URL — local vs production
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://safenav-18sk.onrender.com';

let locationMarker;
let dangerCircle;
let currentWeatherLayer = null;
let radarLayer = null;
let hydrationInterval = null;

const OWM_API_KEY = "2e698fd333a893b698fb23ac8de09b7f";

// ──────────────────────────────────────────
// TILE STYLE HELPER — switch between light/dark map
// ──────────────────────────────────────────
function getMapStyle() {
    const isDark = document.body.classList.contains('dark-mode')
        || document.body.getAttribute('data-theme') === 'dark';

    if (isDark) {
        // Dark map style — CartoDB Dark Matter (free, no token needed)
        return {
            version: 8,
            sources: {
                'carto-dark': {
                    type: 'raster',
                    tiles: [
                        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '© OpenStreetMap © CARTO'
                }
            },
            layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 19 }]
        };
    }

    // Light — OSM default
    return {
        version: 8,
        sources: {
            'osm-tiles': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
            }
        },
        layers: [{ id: 'osm-layer', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 }]
    };
}

// ──────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const mapContainer = document.getElementById('predictionMap');
    if (!mapContainer) return;

    map = new maplibregl.Map({
        container: 'predictionMap',
        style: getMapStyle(),
        center: [78.9629, 20.5937],
        zoom: 4.5,
        pitch: 30,          // subtle tilt — avoids pitch control rendering issues
        antialias: true,
        attributionControl: false   // ← removes attribution watermark entirely
    });

    // ── Navigation control WITHOUT visualizePitch ──
    map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: false }),
        'bottom-right'
    );

    map.on('load', () => {
        console.log('✅ MapLibre GL Engine Loaded');
        if (typeof syncEliteProfile === 'function') syncEliteProfile();
        if (typeof updateActiveProfileUI === 'function') updateActiveProfileUI();
        if (typeof updateProfilePreview === 'function') updateProfilePreview();
    });

    // Button listeners
    const checkBtn = document.getElementById('checkRiskBtn');
    const geoBtn   = document.getElementById('useMyLocationBtn');
    if (checkBtn) checkBtn.addEventListener('click', runFullAnalysis);
    if (geoBtn) geoBtn.addEventListener('click', () => {
        document.getElementById('locationInput').value = 'My Location';
        runFullAnalysis();
    });

    // ── Watch for dark mode toggle and swap map style ──
    const observer = new MutationObserver(() => {
        if (map && map.isStyleLoaded()) {
            
            // Check if the style ACTUALLY needs to change to avoid infinite loops
            const currentStyleIsDark = !!map.getStyle().sources['carto-dark'];
            const needsDark = document.body.classList.contains('dark-mode') || document.body.getAttribute('data-theme') === 'dark';
            
            if (currentStyleIsDark !== needsDark) {
                // Preserve camera angles
                const center = map.getCenter();
                const zoom   = map.getZoom();
                const pitch  = map.getPitch();
                const bearing = map.getBearing();

                map.setStyle(getMapStyle());
                
                map.once('styledata', () => {
                    map.jumpTo({ center, zoom, pitch, bearing });
                    
                    // 🔄 RESTORE ALL CUSTOM LAYERS AFTER THE WIPE 🔄
                    
                    // 1. Restore Danger Circle
                    const activeMarker = typeof locationMarker !== 'undefined' && locationMarker ? locationMarker : (typeof marker !== 'undefined' ? marker : null);
                    if (activeMarker && typeof drawDangerZone === 'function') {
                        const riskBadge = document.getElementById('predictedRisk');
                        const currentRisk = riskBadge && riskBadge.textContent !== '-' ? riskBadge.textContent : 'LOW RISK';
                        const latLng = activeMarker.getLngLat();
                        drawDangerZone(latLng.lat, latLng.lng, currentRisk);
                    }

                    // 2. Restore Weather Layers
                    if (typeof activeWeatherLayer !== 'undefined' && activeWeatherLayer !== 'none') {
                        const layerToRestore = activeWeatherLayer;
                        activeWeatherLayer = 'none'; // Temporarily reset to allow toggle to trigger
                        if (typeof toggleWeatherLayer === 'function') toggleWeatherLayer(layerToRestore);
                    }

                    // 3. Restore NASA Disasters
                    if (typeof nasaLayerActive !== 'undefined' && nasaLayerActive) {
                        nasaLayerActive = false; // Temporarily reset
                        if (typeof toggleNasaDisasters === 'function') toggleNasaDisasters();
                    }
                });
            }
        }
    });
    
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
    });
});
// ──────────────────────────────────────────
// SYNC ELITE PROFILE
// ──────────────────────────────────────────
async function syncEliteProfile() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;
        try {
            const doc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                const profileDropdown = document.getElementById('userProfile');
                if (data.healthProfile && profileDropdown) {
                    profileDropdown.value = data.healthProfile.toLowerCase();
                    localStorage.setItem('ai_user_profile', data.healthProfile.toLowerCase());
                    updateProfilePreview();
                    updateActiveProfileUI();
                }
            }
        } catch (err) {
            console.warn('Cloud sync failed, using local defaults.');
        }
    });
}

// ──────────────────────────────────────────
// VOICE ENGINE
// ──────────────────────────────────────────
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
    }
}

window.speak = function(text, priority = false) {
    if (isMuted) return;
    if (!('speechSynthesis' in window)) return;
    if (priority) speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    msg.rate = 0.95;
    speechSynthesis.speak(msg);
};

// ──────────────────────────────────────────
// MAIN ANALYSIS
// ──────────────────────────────────────────
async function runFullAnalysis() {
    const checkBtn      = document.getElementById('checkRiskBtn');
    const locationInput = document.getElementById('locationInput');
    const navBox        = document.getElementById('nav-instruction-box');
    const navText       = document.getElementById('nav-text');
    const durationMins  = parseInt(document.getElementById('tripDuration')?.value || 30);

    if (!locationInput?.value) return alert('Please enter a location first.');

    const originalBtnText = checkBtn.innerHTML;
    checkBtn.classList.add('btn-loading');
    checkBtn.innerHTML = `<span class="spinner"></span> AI Scanning...`;
    if (navBox) navBox.style.display = 'block';
    if (navText) navText.innerText = 'Connecting to Satellite Data...';

    try {
        let coords;

        if (locationInput.value === 'My Location') {
            coords = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
                    () => reject('GPS Access Denied'),
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });
        } else {
            const geoRes  = await fetch(`${API_BASE_URL}/api/proxy/geocode?q=${encodeURIComponent(locationInput.value)}`);
            const geoData = await geoRes.json();
            if (!geoData.length) throw new Error('Location not found');
            coords = { lat: parseFloat(geoData[0].lat), lon: parseFloat(geoData[0].lon) };
        }

        // Map animation
        if (locationMarker) locationMarker.remove();
        map.flyTo({ center: [coords.lon, coords.lat], zoom: 14, pitch: 30, speed: 1.2 });

        locationMarker = new maplibregl.Marker({ color: '#ef4444' })
            .setLngLat([coords.lon, coords.lat])
            .setPopup(new maplibregl.Popup().setHTML('<strong>Scanning...</strong>'))
            .addTo(map);
        locationMarker.togglePopup();

        // Backend call
        const hour          = new Date().getHours();
        const activeProfile = document.getElementById('userProfile')?.value
            || localStorage.getItem('ai_user_profile')
            || 'standard';

        const response = await fetch(`${API_BASE_URL}/api/prediction/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: coords.lat,
                lng: coords.lon,
                time: (hour > 18 || hour < 6) ? 'night' : 'day',
                travel_mode: document.getElementById('travelMode')?.value || 'walking',
                user_profile: activeProfile,
                duration_mins: durationMins
            })
        });

        const data = await response.json();
        console.log('AI DATA:', data);

        updatePredictionUI(data.risk_level, data.factors, data.advice, data.aqi, data.trend);
        drawDangerZone(coords.lat, coords.lon, data.risk_level);
        startHydrationAlert(data.risk_level);

        const profileSelect = document.getElementById('userProfile');
        const currentProfile = profileSelect?.options[profileSelect.selectedIndex]?.text || 'Standard';
        const voiceMsg = `[${currentProfile} Mode]: Alert: ${data.risk_level}. ${data.advice}`;
        if (navText) navText.innerText = voiceMsg;
        if (window.speak) window.speak(voiceMsg, true);

    } catch (e) {
        if (navText) navText.innerText = 'Connection Error. Please retry.';
        console.error('Analysis Failed:', e);
    } finally {
        checkBtn.classList.remove('btn-loading');
        checkBtn.innerHTML = originalBtnText;
    }
}

// ──────────────────────────────────────────
// UI ENGINE
// ──────────────────────────────────────────
function updatePredictionUI(risk, factors, advice, aqi = 0, trend = 'stable') {
    const badge = document.getElementById('predictedRisk');
    if (badge) {
        badge.textContent = risk;
        badge.className = 'status-badge ' + (risk ? 'risk-' + risk.toLowerCase().replace(/\s/g, '') : 'risk-unknown');
    }

    const aqiBadge = document.getElementById('aqiDisplay');
    if (aqiBadge) {
        const arrow = trend === 'improving' ? ' 📉' : trend === 'worsening' ? ' 📈' : ' ➡️';
        aqiBadge.innerHTML = `AQI: ${aqi}${arrow}`;
        aqiBadge.className = 'status-badge ' + (aqi > 200 ? 'risk-highrisk' : aqi > 100 ? 'risk-mediumrisk' : 'risk-lowrisk');
    }

    const adviceEl = document.getElementById('predictionAdvice');
    if (adviceEl) adviceEl.textContent = advice;

    const list = document.getElementById('predictionFactors');
    if (list && Array.isArray(factors)) {
        list.innerHTML = factors.map(f => `<li>⚠️ ${f}</li>`).join('');
    }
}

// ──────────────────────────────────────────
// 3D DANGER ZONE (MapLibre + Turf.js)
// ──────────────────────────────────────────
function drawDangerZone(lat, lon, risk) {
    if (!map || !map.isStyleLoaded()) return;

    const color    = risk === 'HIGH RISK' ? '#ef4444' : risk === 'MEDIUM RISK' ? '#f59e0b' : '#22c55e';
    const radiusKm = parseInt(document.getElementById('radiusSlider')?.value || 3);
    const circleData = turf.circle([lon, lat], radiusKm, { steps: 64, units: 'kilometers' });

    if (map.getSource('danger-zone')) {
        map.getSource('danger-zone').setData(circleData);
        map.setPaintProperty('danger-zone-fill', 'fill-color', color);
        map.setPaintProperty('danger-zone-line', 'line-color', color);
    } else {
        map.addSource('danger-zone', { type: 'geojson', data: circleData });
        map.addLayer({ id: 'danger-zone-fill', type: 'fill', source: 'danger-zone', paint: { 'fill-color': color, 'fill-opacity': 0.25 } });
        map.addLayer({ id: 'danger-zone-line', type: 'line', source: 'danger-zone', paint: { 'line-color': color, 'line-width': 2.5 } });
    }
}

// Radius slider
const radiusSlider = document.getElementById('radiusSlider');
const radiusLabel  = document.getElementById('radiusLabel');
if (radiusSlider) {
    radiusSlider.addEventListener('input', function() {
        if (radiusLabel) radiusLabel.textContent = `${this.value} km`;
    });
    radiusSlider.addEventListener('change', function() {
        const radiusKm   = parseInt(this.value);
        const activeMarker = locationMarker || (typeof marker !== 'undefined' ? marker : null);
        if (activeMarker && map.getSource('danger-zone')) {
            const lngLat = activeMarker.getLngLat();
            const newCircleData = turf.circle([lngLat.lng, lngLat.lat], radiusKm, { steps: 64, units: 'kilometers' });
            map.getSource('danger-zone').setData(newCircleData);
            map.fitBounds(turf.bbox(newCircleData), { padding: 40, duration: 1000 });
        }
    });
}

// ──────────────────────────────────────────
// WEATHER LAYERS
// ──────────────────────────────────────────

function toggleWeatherLayer(layerType) {
    if (!map || !map.isStyleLoaded()) return;

    // 1. If clicking the button that is already active, turn it off!
    if (activeWeatherLayer === layerType) {
        layerType = 'none';
    }

    // 2. Remove the existing weather layer if there is one
    if (map.getLayer('weather-layer')) {
        map.removeLayer('weather-layer');
        map.removeSource('weather-source');
    }

    activeWeatherLayer = layerType;

    // 3. If we are just clearing the map, stop here
    if (layerType === 'none') return;

    // 4. Inject the OpenWeatherMap tiles
    map.addSource('weather-source', {
        type: 'raster',
        tiles: [`https://tile.openweathermap.org/map/${layerType}/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`],
        tileSize: 256
    });
    
    // 5. Paint with a smooth fade-in animation
    map.addLayer({ 
        id: 'weather-layer', 
        type: 'raster', 
        source: 'weather-source', 
        paint: { 
            'raster-opacity': 0.6,
            'raster-fade-duration': 300 // Smooth fade-in
        } 
    });
}

async function updateRainRadar() {
    if (!map || !map.isStyleLoaded()) return;
    try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data     = await response.json();
        const latestFrame = data.radar.past[data.radar.past.length - 1];
        const radarUrl = `${data.host}${latestFrame.path}256/{z}/{x}/{y}/2/1_1.png`;

        if (map.getLayer('radar-layer')) { map.removeLayer('radar-layer'); map.removeSource('radar-source'); }
        map.addSource('radar-source', { type: 'raster', tiles: [radarUrl], tileSize: 256 });
        map.addLayer({ id: 'radar-layer', type: 'raster', source: 'radar-source', paint: { 'raster-opacity': 0.55 } });
    } catch (err) { console.error('Radar sync fail:', err); }
}
// ──────────────────────────────────────────
// HYDRATION ALERT
// ──────────────────────────────────────────
function startHydrationAlert(riskLevel) {
    const controlBox = document.getElementById('hydrationControl');
    if (hydrationInterval) clearInterval(hydrationInterval);
    if (riskLevel === 'HIGH RISK') {
        if (controlBox) controlBox.style.display = 'block';
        hydrationInterval = setInterval(() => {
            if (typeof speak === 'function') speak('Time to hydrate. Please drink water now.');
        }, 1800000);
    } else {
        if (controlBox) controlBox.style.display = 'none';
    }
}

// Stop hydration btn
const stopHydBtn = document.getElementById('stopHydrationBtn');
if (stopHydBtn) {
    stopHydBtn.addEventListener('click', () => {
        if (hydrationInterval) { clearInterval(hydrationInterval); hydrationInterval = null; }
        const controlBox = document.getElementById('hydrationControl');
        if (controlBox) controlBox.style.display = 'none';
    });
}

// ──────────────────────────────────────────
// PROFILE & HINT
// ──────────────────────────────────────────
function updateActiveProfileUI() {
    const profile = document.getElementById('userProfile')?.value
        || localStorage.getItem('ai_user_profile') || 'standard';
    const label = document.getElementById('activeProfileLabel');
    const profileNames = {
        'standard':    '🏃 Standard',
        'asthma':      '🫁 Respiratory',
        'respiratory': '🫁 Respiratory',
        'elderly':     '👴 Heat Sensitive',
        'heart':       '🫀 Cardiac Sensitive',
        'heat':        '🌡️ Heat Sensitive',
        'altitude':    '⛰️ Altitude Sensitive',
        'worker':      '🏗️ Outdoor Worker'
    };
    if (label) label.innerText = profileNames[profile.toLowerCase()] || profile;
}

function updateProfilePreview() {
    const profile = document.getElementById('userProfile')?.value || 'standard';
    const hint = document.getElementById('profileHint');
    const hints = {
        'standard':  'Standard safety thresholds applied.',
        'asthma':    '🚨 AQI alerts active above 70 (Asthma/COPD focus).',
        'respiratory': '🚨 AQI alerts active above 70 (Respiratory focus).',
        'elderly':   '🔥 Heat Index alerts above 32°C (Vulnerable group).',
        'heart':     '🫀 High cardiac strain thresholds active.',
        'heat':      '🌡️ Extreme heat sensitivity mode active.',
        'altitude':  '⛰️ Altitude sickness thresholds applied.',
        'worker':    '🏗️ Full-day industrial exposure limits active.'
    };
    if (hint) hint.innerText = hints[profile.toLowerCase()] || 'Profile thresholds active.';
}

// ──────────────────────────────────────────
// VOICE MUTE TOGGLE
// ──────────────────────────────────────────
function toggleMute() {
    isMuted = !isMuted;
    const icon = document.getElementById('voiceIcon');
    const btn  = document.getElementById('toggleVoiceBtn');
    if (isMuted) {
        icon.innerText = '🔇';
        btn.style.borderColor = '#94a3b8';
        if ('speechSynthesis' in window) speechSynthesis.cancel();
    } else {
        icon.innerText = '🔊';
        btn.style.borderColor = '#3b82f6';
        if ('speechSynthesis' in window) {
            speechSynthesis.speak(new SpeechSynthesisUtterance('Voice alerts active'));
        }
    }
}

// ──────────────────────────────────────────
// RESET TO DEFAULTS
// ──────────────────────────────────────────
window.restorePredictDefaults = async function() {
    const travelMode    = document.getElementById('travelMode');
    const tripDuration  = document.getElementById('tripDuration');
    const locationInput = document.getElementById('locationInput');
    if (travelMode)    travelMode.value    = 'walking';
    if (tripDuration)  tripDuration.value  = '30';
    if (locationInput) locationInput.value = '';

    const el = (id) => document.getElementById(id);
    if (el('predictedRisk'))  { el('predictedRisk').textContent = '-'; el('predictedRisk').className = 'status-badge'; }
    if (el('aqiDisplay'))     el('aqiDisplay').innerHTML = 'Loading...';
    if (el('predictionAdvice')) el('predictionAdvice').textContent = '';
    if (el('predictionFactors')) el('predictionFactors').innerHTML = '';
    const navBox = el('nav-instruction-box');
    if (navBox) navBox.style.display = 'none';

    if (map && map.getLayer('danger-zone-fill')) {
        map.removeLayer('danger-zone-fill');
        map.removeLayer('danger-zone-line');
        map.removeSource('danger-zone');
    }

    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;
            try {
                const doc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (doc.exists && doc.data().healthProfile) {
                    const profileDropdown = document.getElementById('userProfile');
                    if (profileDropdown) {
                        Array.from(profileDropdown.options).forEach(opt => {
                            if (opt.value.toLowerCase() === doc.data().healthProfile.toLowerCase()) {
                                profileDropdown.value = opt.value;
                                profileDropdown.dispatchEvent(new Event('change'));
                            }
                        });
                    }
                }
            } catch (err) { console.warn('Reset failed.', err); }
        });
    }
};

// 5. Clean up NASA layer if active
    if (nasaLayerActive) {
        if (map.getLayer('nasa-disasters-layer')) map.removeLayer('nasa-disasters-layer');
        if (map.getSource('nasa-disasters')) map.removeSource('nasa-disasters');
        nasaLayerActive = false;
        const nasaBtn = document.getElementById('nasaBtn');
        if(nasaBtn) {
            nasaBtn.innerHTML = `🌋 NASA Live`;
            nasaBtn.style.background = 'transparent';
            nasaBtn.style.color = '#ef4444';
        }
    }
// ──────────────────────────────────────────
// SMART AUTOCOMPLETE SEARCH
// ──────────────────────────────────────────
const searchInput   = document.getElementById('smartSearch');
const searchResults = document.getElementById('searchResults');
let searchTimeout = null;

if (searchInput) {
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length < 3) { if (searchResults) searchResults.style.display = 'none'; return; }
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
                .then(r => r.json())
                .then(data => {
                    if (!searchResults) return;
                    searchResults.innerHTML = '';
                    if (!data.length) { searchResults.style.display = 'none'; return; }
                    searchResults.style.display = 'block';
                    data.forEach(place => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        div.innerHTML = `<i class="fas fa-map-marker-alt" style="color:var(--text-muted);font-size:.8rem"></i> ${place.display_name}`;
                        div.onclick = () => {
                            searchInput.value = place.display_name.split(',')[0];
                            searchResults.style.display = 'none';
                            const lat = parseFloat(place.lat);
                            const lng = parseFloat(place.lon);
                            map.flyTo({ center: [lng, lat], zoom: 13, pitch: 30 });
                            if (marker) marker.remove();
                            marker = new maplibregl.Marker({ color: '#3b82f6' }).setLngLat([lng, lat]).addTo(map);
                            getPrediction(lat, lng);
                        };
                        searchResults.appendChild(div);
                    });
                })
                .catch(err => console.error('Search error:', err));
        }, 400);
    });
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && searchResults) searchResults.style.display = 'none';
    });
}

// ──────────────────────────────────────────
// RADAR ENGINE CONTROLS
// ──────────────────────────────────────────
const radarToggle   = document.getElementById('radarToggle');
const radarSettings = document.getElementById('radarSettings');
const radarStatus   = document.getElementById('radarStatus');

if (radarToggle) {
    radarToggle.addEventListener('change', function() {
        if (this.checked) {
            radarSettings.style.display = 'block';
            const targetMarker = locationMarker || (typeof marker !== 'undefined' ? marker : null);
            if (!targetMarker) {
                alert('Please scan a location first so the radar has a target to track!');
                this.checked = false;
                radarSettings.style.display = 'none';
                return;
            }
            const targetLat          = targetMarker.getLngLat().lat;
            const targetLng          = targetMarker.getLngLat().lng;
            const sliderRadius       = parseFloat(document.getElementById('radiusSlider').value) || 0;
            const userWarning        = parseFloat(document.getElementById('alertThreshold').value) || 0;
            const dangerBoundaryKm   = sliderRadius + userWarning;
            if (radarStatus) { radarStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing Radar...'; radarStatus.style.color = '#3b82f6'; }
            if (typeof enableSimulator === 'function') enableSimulator();
            RadarEngine.start(targetLat, targetLng, dangerBoundaryKm);
        } else {
            radarSettings.style.display = 'none';
            RadarEngine.stop();
            if (radarStatus) { radarStatus.innerHTML = '<i class="fas fa-satellite"></i> Radar is OFF'; radarStatus.style.color = '#f59e0b'; }
        }
    });
}

// ──────────────────────────────────────────
// AUDIO ENGINE
// ──────────────────────────────────────────
let audioCtx;
try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}

function playBeep() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode   = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type            = 'square';
    oscillator.frequency.value = 800;
    gainNode.gain.value        = 0.1;
    oscillator.start();
    setTimeout(() => oscillator.stop(), 500);
}

function playVoiceAlert(message) {
    if ('speechSynthesis' in window) {
        const utterance   = new SpeechSynthesisUtterance(message);
        utterance.rate    = 1.0;
        utterance.pitch   = 1.2;
        window.speechSynthesis.speak(utterance);
    }
}

// ──────────────────────────────────────────
// HAVERSINE DISTANCE
// ──────────────────────────────────────────
function calculateDistanceKM(lat1, lon1, lat2, lon2) {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    = Math.sin(dLat/2) ** 2
               + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ──────────────────────────────────────────
// ADAPTIVE RADAR ENGINE
// ──────────────────────────────────────────
const RadarEngine = (function() {
    let radarTimeoutId = null;
    let isTracking     = false;
    let hasAlerted     = false;
    let wakeLock       = null;

    const CONFIG = {
        baseInterval:   30000,
        mediumInterval: 15000,
        dangerInterval:  5000,
        gpsTimeout:     10000
    };

    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try { wakeLock = await navigator.wakeLock.request('screen'); }
            catch (err) { console.warn('Wake Lock denied:', err); }
        }
    }

    function releaseWakeLock() {
        if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    }

    function processRadarData(coords, targetLat, targetLng, dangerBoundaryKm) {
        const radarStatus = document.getElementById('radarStatus');
        const userLat     = coords.latitude;
        const userLng     = coords.longitude;
        const accuracy    = coords.accuracy || 0;
        const speed       = coords.speed    || 0;

        // Auto-shelter detection
        if (accuracy > 40 && speed < 0.5 && !window.SIMULATOR_ACTIVE) {
            if (radarStatus) { radarStatus.innerHTML = '<i class="fas fa-house-user"></i> Sheltered (Indoor Mode)'; radarStatus.style.color = '#8b5cf6'; }
            radarTimeoutId = setTimeout(() => executeTrackingCycle(targetLat, targetLng, dangerBoundaryKm), CONFIG.baseInterval);
            return;
        }

        if (radarStatus && !hasAlerted) { radarStatus.innerHTML = '<i class="fas fa-satellite-dish"></i> Tracking Active (Live)'; radarStatus.style.color = '#10b981'; }

        const distanceKm = calculateDistanceKM(userLat, userLng, targetLat, targetLng);
        const nextInterval = distanceKm > 15 ? CONFIG.baseInterval : distanceKm > 5 ? CONFIG.mediumInterval : CONFIG.dangerInterval;

        if (distanceKm <= dangerBoundaryKm && !hasAlerted) {
            hasAlerted = true;
            const alertType  = document.getElementById('alertType')?.value || 'voice';
            const warningMsg = 'Warning! You are approaching a high-risk environmental zone.';
            if (alertType === 'voice')  playVoiceAlert(warningMsg);
            else if (alertType === 'beep') playBeep();
            if (radarStatus) { radarStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> DANGER ZONE REACHED'; radarStatus.style.color = '#ef4444'; }

            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    new Notification('🚨 SafeNav Alert', { body: warningMsg, requireInteraction: true });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(p => {
                        if (p === 'granted') new Notification('🚨 SafeNav Alert', { body: warningMsg, requireInteraction: true });
                    });
                }
            }
        }

        radarTimeoutId = setTimeout(() => executeTrackingCycle(targetLat, targetLng, dangerBoundaryKm), nextInterval);
    }

    function executeTrackingCycle(targetLat, targetLng, dangerBoundaryKm) {
        if (!isTracking) return;

        if (window.SIMULATOR_ACTIVE) {
            window.simLat += (targetLat - window.simLat) * 0.15;
            window.simLng += (targetLng - window.simLng) * 0.15;
            if (window.fakeUserMarker) {
                window.fakeUserMarker.setLngLat([window.simLng, window.simLat]);
            } else {
                window.fakeUserMarker = new maplibregl.Marker({ color: '#3b82f6' })
                    .setLngLat([window.simLng, window.simLat])
                    .setPopup(new maplibregl.Popup().setHTML('<strong>Fake User</strong>'))
                    .addTo(map);
                window.fakeUserMarker.togglePopup();
            }
            return processRadarData({ latitude: window.simLat, longitude: window.simLng, accuracy: 10, speed: 1.5 }, targetLat, targetLng, dangerBoundaryKm);
        }

        navigator.geolocation.getCurrentPosition(
            (position) => processRadarData(position.coords, targetLat, targetLng, dangerBoundaryKm),
            (error) => {
                console.error('GPS Error:', error);
                radarTimeoutId = setTimeout(() => executeTrackingCycle(targetLat, targetLng, dangerBoundaryKm), CONFIG.baseInterval);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: CONFIG.gpsTimeout }
        );
    }

    return {
        start(targetLat, targetLng, dangerBoundaryKm) {
            if (isTracking) return;
            isTracking = true;
            hasAlerted = false;
            requestWakeLock();
            executeTrackingCycle(targetLat, targetLng, dangerBoundaryKm);
        },
        stop() {
            isTracking = false;
            if (radarTimeoutId) { clearTimeout(radarTimeoutId); radarTimeoutId = null; }
            releaseWakeLock();
            if (window.SIMULATOR_ACTIVE) {
                window.SIMULATOR_ACTIVE = false;
                if (window.fakeUserMarker) { window.fakeUserMarker.remove(); window.fakeUserMarker = null; }
            }
        }
    };
})();

// ──────────────────────────────────────────
// RADAR PREFERENCES SAVE/LOAD
// ──────────────────────────────────────────
const alertTypeDropdown   = document.getElementById('alertType');
const alertThresholdInput = document.getElementById('alertThreshold');

function saveRadarPreferences() {
    if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
        const uid = firebase.auth().currentUser.uid;
        firebase.firestore().collection('users').doc(uid).set({
            radarAlertType: alertTypeDropdown?.value,
            radarThreshold: parseFloat(alertThresholdInput?.value)
        }, { merge: true }).catch(err => console.error('Save radar prefs:', err));
    }
}
if (alertTypeDropdown)   alertTypeDropdown.addEventListener('change', saveRadarPreferences);
if (alertThresholdInput) alertThresholdInput.addEventListener('change', saveRadarPreferences);

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;
        try {
            const doc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (doc.exists) {
                const d = doc.data();
                if (d.radarAlertType && alertTypeDropdown)   alertTypeDropdown.value   = d.radarAlertType;
                if (d.radarThreshold && alertThresholdInput) alertThresholdInput.value = d.radarThreshold;
            }
        } catch (err) { console.warn('Load radar prefs failed.', err); }
    });
}

// ──────────────────────────────────────────
// DEV SIMULATOR
// ──────────────────────────────────────────
window.enableSimulator = function() {
    const targetMarker = locationMarker || (typeof marker !== 'undefined' ? marker : null);
    if (!targetMarker) return alert('Please drop a target location pin first!');
    window.SIMULATOR_ACTIVE = true;
    window.simLat = targetMarker.getLngLat().lat - 0.18;
    window.simLng = targetMarker.getLngLat().lng - 0.18;
    console.warn('⚠️ DEV SIMULATOR ACTIVATED.');
    alert('Simulator Activated! Toggle Live Radar to begin the test.');
};

// ==========================================
// 🌋 NASA EONET LIVE DISASTER TRACKING
// ==========================================

async function toggleNasaDisasters() {
    if (!map || !map.isStyleLoaded()) return;

    const nasaBtn = document.getElementById('nasaBtn');

    // 1. If active, turn it off and clean up
    if (nasaLayerActive) {
        if (map.getLayer('nasa-disasters-layer')) map.removeLayer('nasa-disasters-layer');
        if (map.getSource('nasa-disasters')) map.removeSource('nasa-disasters');
        nasaLayerActive = false;
        nasaBtn.innerHTML = `🌋 NASA Live`;
        nasaBtn.style.background = 'transparent';
        nasaBtn.style.color = '#ef4444';
        return;
    }

    // 2. Show loading state
    const originalText = nasaBtn.innerHTML;
    nasaBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Fetching...`;
    nasaBtn.style.background = '#ef4444';
    nasaBtn.style.color = '#ffffff';

    try {
        // 3. Fetch Active Global Events (Past 30 days) directly as GeoJSON
        const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&days=30');
        const data = await response.json();

        // 4. Inject the NASA GeoJSON source into MapLibre
        map.addSource('nasa-disasters', {
            type: 'geojson',
            data: data
        });

        // 5. Paint the disasters as glowing red dots
        map.addLayer({
            id: 'nasa-disasters-layer',
            type: 'circle',
            source: 'nasa-disasters',
            paint: {
                'circle-radius': 6,
                'circle-color': '#ef4444', // Danger Red
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.8
            }
        });

        // 6. Add Interactive Popups for when the user clicks a disaster
        map.on('click', 'nasa-disasters-layer', (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            const title = e.features[0].properties.title;
            
            // NASA returns categories as an array of objects
            let categoryName = "Live Event";
            if (e.features[0].properties.categories && e.features[0].properties.categories.length > 0) {
                categoryName = e.features[0].properties.categories[0].title;
            }

            // Ensure the popup appears over the exact point even when zoomed out
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            new maplibregl.Popup({ offset: 15, className: 'nasa-popup' })
                .setLngLat(coordinates)
                .setHTML(`
                    <div style="padding: 5px;">
                        <span style="font-size: 0.7rem; font-weight: 800; color: #ef4444; text-transform: uppercase; letter-spacing: 1px;">
                            <i class="fas fa-exclamation-triangle"></i> ${categoryName}
                        </span>
                        <p style="margin: 5px 0 0 0; font-size: 0.9rem; font-weight: 600; color: #1e293b;">${title}</p>
                        <span style="font-size: 0.7rem; color: #64748b;">Verified by NASA EONET</span>
                    </div>
                `)
                .addTo(map);
        });

        // 7. Make the cursor a pointer so the user knows they are clickable
        map.on('mouseenter', 'nasa-disasters-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'nasa-disasters-layer', () => { map.getCanvas().style.cursor = ''; });

        nasaLayerActive = true;
        nasaBtn.innerHTML = `✅ NASA Active`;
        console.log(`🌍 NASA EONET Synced: Loaded ${data.features.length} active global disasters.`);

    } catch (error) {
        console.error("NASA EONET Fetch Error:", error);
        alert("Failed to connect to NASA satellites. Please check your internet connection.");
        nasaBtn.innerHTML = originalText;
        nasaBtn.style.background = 'transparent';
        nasaBtn.style.color = '#ef4444';
    }
}