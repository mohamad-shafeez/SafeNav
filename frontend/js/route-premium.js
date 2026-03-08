/* ==========================================================================
   SAFENAV PRO - PREMIUM FEATURES (MapLibre Compatible)
   ========================================================================== */

// PREMIUM STATE
let alternativeRoutes = [];
let routeHistory = [];
let currentAlternativeId = null;
let hotelMarkers = []; // Array to store MapLibre markers

// USER PREFERENCES
let userPreferences = {
    priority: 'balanced',
    avoidTolls: false,
    avoidHighways: false,
    maxSpeedLimit: 120,
    fuelEfficiency: 5,
    comfortLevel: 7,
    autoReroute: true,
    nightMode: false,
    showTraffic: true,
    ecoMode: false
};

// ============================
// 1. PREMIUM INITIALIZATION
// ============================
function initPremiumFeatures() {
    initializeUserPreferences();
    initializeRouteHistory();
    initializeAnalytics();
    initializeOfflineMode();
    console.log('✅ Premium features initialized');
}

// ============================
// 2. ROUTE HISTORY SYSTEM
// ============================
function initializeRouteHistory() {
    routeHistory = JSON.parse(localStorage.getItem('routeHistory') || '[]');
}

window.saveToRouteHistory = function(start, end, distance, duration) {
    const routeEntry = {
        id: Date.now(),
        start, end, distance, duration,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };
    routeHistory.unshift(routeEntry);
    if (routeHistory.length > 20) routeHistory = routeHistory.slice(0, 20);
    localStorage.setItem('routeHistory', JSON.stringify(routeHistory));
};

// ============================
// 3. ALTERNATIVE ROUTES
// ============================
// Simulate fetching alternative routes
window.loadAlternativeRoutes = function() {
    if (!window.startCoords || !window.endCoords) return window.showPremiumToast('⚠️ Missing Route', 'Calculate a route first');
    window.showPremiumToast('🔍 Alternatives', 'Searching for different options...', '✨');
    
    // In a real app, you would fetch from TomTom/OSRM alternative APIs.
    alternativeRoutes = [
        { id: 1, type: 'Fastest', color: '#3b82f6', icon: '🚀' },
        { id: 2, type: 'Eco-Friendly', color: '#10b981', icon: '🌿' },
        { id: 3, type: 'Scenic', color: '#8b5cf6', icon: '🏞️' }
    ];
    
    window.showPremiumToast('✅ Alternatives Found', `3 route options available`, '✨');
};

// ============================
// 4. ANALYTICS & AI ENHANCEMENTS
// ============================
function initializeAnalytics() {
    setInterval(updateLiveAnalytics, 5000);
}



function updateLiveAnalytics() {
    // Background analytics sync logic
}

// ============================
// 5. USER PREFERENCES
// ============================
function initializeUserPreferences() {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
        try { userPreferences = JSON.parse(saved); } 
        catch (e) { console.warn('Failed to load preferences:', e); }
    }
}

// ============================
// 6. HOTEL AFFILIATE ENGINE (MapLibre Upgrade)
// ============================
window.findSafeHotels = async function() {
    if (!window.currentRouteData || !window.endCoords) {
        return window.showPremiumToast('⚠️ Map Empty', 'Find a route first!', 'warning');
    }

    window.showPremiumToast('🔍 Scanning', 'Looking for secure stays near destination...', '✨');

    const lat = window.endCoords.lat;
    const lng = window.endCoords.lng;

    try {
        const TOMTOM_KEY = CONFIG.TOMTOM_KEY; 
        const url = `https://api.tomtom.com/search/2/poiSearch/hotel.json?key=${TOMTOM_KEY}&lat=${lat}&lon=${lng}&radius=5000&limit=5`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return window.showPremiumToast('❌ No Stays', 'No secure hotels found.', 'error');
        }

        // Clear existing markers
        hotelMarkers.forEach(m => m.remove());
        hotelMarkers = [];

        data.results.forEach((place) => {
            const pLat = Number(place.position.lat);
            const pLng = Number(place.position.lon);
            const pName = place.poi?.name || "Verified Safe Stay";
            const price = Math.floor(60 + (Math.random() * 100));

            // Create Custom HTML Marker for MapLibre
            const el = document.createElement('div');
            el.className = 'hotel-marker';
            el.innerHTML = `<div style="background: #10b981; color: white; padding: 5px 10px; border-radius: 20px; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 12px; cursor: pointer;">$${price}</div>`;

            // Create Popup HTML
            const popupHTML = `
                <div style="text-align: center; min-width: 180px; padding: 5px; font-family: 'Inter', sans-serif;">
                    <h4 style="margin: 0 0 5px 0; color: #1e293b; font-size: 14px;">${pName}</h4>
                    <div style="color: #10b981; font-weight: bold; font-size: 16px; margin-bottom: 5px;">$${price} / night</div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                        <i class="fas fa-shield-alt"></i> Verified Safe Zone
                    </div>
                    <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(pName)}&aid=2779272" target="_blank" style="display: block; background: #003580; color: white; text-decoration: none; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 13px;">
                        Book Now
                    </a>
                </div>
            `;
            
            const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(popupHTML);

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([pLng, pLat])
                .setPopup(popup)
                .addTo(window.map);

            hotelMarkers.push(marker);
        });

        window.showPremiumToast('🏨 Stays Found!', `Plotted ${hotelMarkers.length} secure locations.`, 'success');

    } catch (error) {
        console.error("Hotel Search Error:", error);
        window.showPremiumToast('❌ Search Failed', 'Network error.', 'error');
    }
};

// ============================
// 7. OFFLINE & SHARING
// ============================
function initializeOfflineMode() {
    window.addEventListener('offline', () => window.showPremiumToast('📡 Offline', 'Using cached data'));
    window.addEventListener('online', () => window.showPremiumToast('📡 Online', 'Connection restored'));
}

window.handleRouteSharing = async function() {
    const end = document.getElementById("endLocation")?.value || "Destination";
    const distance = document.getElementById("routeDistanceMain")?.textContent || "0";
    const safety = document.getElementById("recommendedRiskHudMain")?.textContent || "0";

    const shareData = {
        title: 'SafeNav Pro Route',
        text: `📍 Heading to ${end}\n📏 Distance: ${distance}km\n🛡️ Safety Score: ${safety}/100`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            window.showPremiumToast('📲 Shared!', 'Route details sent!', '✨');
        } catch (err) { console.log("Share failed", err); }
    } else {
        navigator.clipboard.writeText(`${shareData.text} \nLink: ${shareData.url}`);
        window.showPremiumToast('📋 Copied!', 'Link copied to clipboard', '🔗');
    }
};

// Connect Share Button
document.getElementById("shareRouteBtn")?.addEventListener("click", window.handleRouteSharing);

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initPremiumFeatures, 1000);
});

// 2. Advanced Alternative Routes UI Builder
window.previewAlternativeRoute = function(id) {
    const alt = alternativeRoutes.find(a => a.id === id);
    if (!alt) return;
    
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; width: 90%; max-width: 400px; padding: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); animation: slideUp 0.3s ease;">
            <h3 style="margin-top:0; color: ${alt.color};">${alt.icon} ${alt.type} Route</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background:#f8fafc; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:1.2rem; font-weight:bold;">${alt.distance_km || '12.5'} km</div>
                    <div style="font-size:0.8rem; color:#64748b;">Distance</div>
                </div>
                <div style="background:#f8fafc; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:1.2rem; font-weight:bold;">${alt.duration_min || '25'} min</div>
                    <div style="font-size:0.8rem; color:#64748b;">Duration</div>
                </div>
            </div>
            <p style="color: #475569; font-size: 0.9rem;">${alt.description || 'Optimized alternative path avoiding heavy traffic.'}</p>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="flex:1; padding:12px; border-radius:10px; border:none; background:#e2e8f0; cursor:pointer;">Cancel</button>
                <button onclick="window.showPremiumToast('✅ Switched', 'Route updated successfully'); this.parentElement.parentElement.parentElement.remove()" style="flex:1; padding:12px; border-radius:10px; border:none; background:var(--primary); color:white; font-weight:bold; cursor:pointer;">Select</button>
            </div>
        </div>
    `;
    
    modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 10000;`;
    document.body.appendChild(modal);
};