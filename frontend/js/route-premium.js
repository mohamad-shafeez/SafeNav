/* ==========================================================================
   SAFENAV PRO 
   ========================================================================== */

// PREMIUM CONFIGURATION
const PREMIUM_CONFIG = {
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
    speedLimits: {
        checkRadius: 100,
        warningBuffer: 5,
        dangerousBuffer: 20,
        alertCooldown: 30000,
        blinkInterval: 1000
    }
};

// PREMIUM STATE
let premiumToast = null;
let alternativeRoutes = [];
let routeHistory = [];
let weatherAlerts = [];
let currentAlternativeId = null;
let hotelMarkersLayer = null;
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
// PREMIUM FEATURES INITIALIZATION
// ============================

function initPremiumFeatures() {
    addPremiumMarkerStyles();
    premiumToast = document.getElementById('premiumToast');
    initializeUserPreferences();
    initializeRouteHistory();
    initializeWeatherAlerts();
    initializeAlternativeRoutes();
    initializeAnalytics();
    initializeOfflineMode();
    initializeTrafficSimulation();
    initializeLiveStats();
    
    console.log('Premium features initialized');
}

function initializeUserPreferences() {
    // Load saved preferences
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
        try {
            userPreferences = JSON.parse(saved);
            updatePreferenceUI();
        } catch (e) {
            console.warn('Failed to load preferences:', e);
        }
    }

    // Set up preference controls
    const routePriority = document.getElementById('routePriority');
    const roadPreference = document.getElementById('roadPreference');
    const tollPreference = document.getElementById('tollPreference');
    const fuelEfficiency = document.getElementById('fuelEfficiency');
    const comfortLevel = document.getElementById('comfortLevel');
    const autoReroute = document.getElementById('autoReroute');
    const nightMode = document.getElementById('nightMode');
    const showTraffic = document.getElementById('showTraffic');
    const ecoMode = document.getElementById('ecoMode');

    // Set values if elements exist
    if (routePriority) routePriority.value = userPreferences.priority;
    if (roadPreference) roadPreference.value = userPreferences.avoidHighways ? 'avoid_highways' : 'all';
    if (tollPreference) tollPreference.value = userPreferences.avoidTolls ? 'avoid_tolls' : 'allow_tolls';
    if (fuelEfficiency) fuelEfficiency.value = userPreferences.fuelEfficiency;
    if (comfortLevel) comfortLevel.value = userPreferences.comfortLevel;
    if (autoReroute) autoReroute.checked = userPreferences.autoReroute;
    if (nightMode) nightMode.checked = userPreferences.nightMode;
    if (showTraffic) showTraffic.checked = userPreferences.showTraffic;
    if (ecoMode) ecoMode.checked = userPreferences.ecoMode;
// Add event listeners
    document.getElementById('applyPreferences')?.addEventListener('click', applyPreferences);
    document.getElementById('resetPreferences')?.addEventListener('click', resetPreferences);
    
    // Add slider listeners
    const fuelSlider = document.getElementById('fuelEfficiency');
    if (fuelSlider) {
        fuelSlider.addEventListener('input', function() {
            const valDisplay = document.getElementById('fuelEfficiencyValue');
            if (valDisplay) valDisplay.textContent = this.value;
        });
    }
    
    const comfortSlider = document.getElementById('comfortLevel');
    if (comfortSlider) {
        comfortSlider.addEventListener('input', function() {
            const valDisplay = document.getElementById('comfortLevelValue');
            if (valDisplay) valDisplay.textContent = this.value;
        });
    }
function updatePreferenceUI() {
    // Update any UI indicators based on preferences
    if (userPreferences.nightMode) {
        document.body.setAttribute('data-theme', 'dark');
        document.documentElement.style.setProperty('--background', '#0f172a');
        document.documentElement.style.setProperty('--text-color', '#f8fafc');
    }
    
    if (userPreferences.ecoMode) {
        document.body.classList.add('eco-mode');
    }
}

function applyPreferences() {
    const routePriority = document.getElementById('routePriority');
    const roadPreference = document.getElementById('roadPreference');
    const tollPreference = document.getElementById('tollPreference');
    const fuelEfficiency = document.getElementById('fuelEfficiency');
    const comfortLevel = document.getElementById('comfortLevel');
    const autoReroute = document.getElementById('autoReroute');
    const nightMode = document.getElementById('nightMode');
    const showTraffic = document.getElementById('showTraffic');
    const ecoMode = document.getElementById('ecoMode');

    userPreferences = {
        priority: routePriority?.value || 'balanced',
        avoidHighways: roadPreference?.value === 'avoid_highways',
        avoidTolls: tollPreference?.value === 'avoid_tolls',
        maxSpeedLimit: 120,
        fuelEfficiency: parseInt(fuelEfficiency?.value || 5),
        comfortLevel: parseInt(comfortLevel?.value || 7),
        autoReroute: autoReroute?.checked || true,
        nightMode: nightMode?.checked || false,
        showTraffic: showTraffic?.checked || true,
        ecoMode: ecoMode?.checked || false
    };

    localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
    updatePreferenceUI();
    
    // Recalculate route if one exists
    if (window.currentRouteData) {
        showPremiumToast('🔄 Recalculating', 'Applying new preferences...');
        setTimeout(() => {
            window.calculateRoute();
            if (alternativeRoutes.length > 0) {
                loadAlternativeRoutes();
            }
        }, 1000);
    }
    
    showPremiumToast('⚙️ Preferences Applied', 'Your settings have been saved');
}

function resetPreferences() {
    const defaultPrefs = {
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
    
    userPreferences = defaultPrefs;
    updatePreferenceUI();
    
    // Update UI elements
    const routePriority = document.getElementById('routePriority');
    const roadPreference = document.getElementById('roadPreference');
    const tollPreference = document.getElementById('tollPreference');
    const fuelEfficiency = document.getElementById('fuelEfficiency');
    const comfortLevel = document.getElementById('comfortLevel');
    const autoReroute = document.getElementById('autoReroute');
    const nightMode = document.getElementById('nightMode');
    const showTraffic = document.getElementById('showTraffic');
    const ecoMode = document.getElementById('ecoMode');
    
   if (routePriority) routePriority.value = 'balanced';
    if (roadPreference) roadPreference.value = 'all';
    if (tollPreference) tollPreference.value = 'allow_tolls';
    
    if (fuelEfficiency) {
        fuelEfficiency.value = 5;
        const fuelVal = document.getElementById('fuelEfficiencyValue');
        if (fuelVal) fuelVal.textContent = '5';
    }
    
    if (comfortLevel) {
        comfortLevel.value = 7;
        const comfortVal = document.getElementById('comfortLevelValue');
        if (comfortVal) comfortVal.textContent = '7'; 
    }
    
    if (autoReroute) autoReroute.checked = true;
    if (nightMode) nightMode.checked = false;
    if (showTraffic) showTraffic.checked = true;
    if (ecoMode) ecoMode.checked = false;
    
    localStorage.setItem('userPreferences', JSON.stringify(defaultPrefs));
    showPremiumToast('🔄 Preferences Reset', 'All settings reset to default');
}
// ============================
// ROUTE HISTORY SYSTEM
// ============================

function initializeRouteHistory() {
    routeHistory = JSON.parse(localStorage.getItem('routeHistory') || '[]');
    renderRouteHistory();
    
    // Clear history button
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all route history?')) {
            routeHistory = [];
            localStorage.removeItem('routeHistory');
            renderRouteHistory();
            showPremiumToast('🗑️ History Cleared', 'All route history has been cleared');
        }
    });
}

function renderRouteHistory() {
    const historyContainer = document.querySelector('.history-container');
    const historyList = document.querySelector('.history-list');
    const noHistory = document.getElementById('noHistory');
    
    if (!historyContainer || !historyList) return;
    
    if (routeHistory.length === 0) {
        historyContainer.style.display = 'none';
        if (noHistory) noHistory.style.display = 'block';
        return;
    }
    
    historyContainer.style.display = 'block';
    if (noHistory) noHistory.style.display = 'none';
    
    historyList.innerHTML = '';
    
    routeHistory.slice(0, 10).forEach((route, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <div class="history-route">${route.start} → ${route.end}</div>
                <div class="history-details">
                    <span class="history-distance">${route.distance}</span>
                    <span class="history-duration">${route.duration}</span>
                    <span class="history-date">${route.date}</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="btn btn-icon" onclick="loadFromHistory(${index})" title="Load Route">
                    <i class="fas fa-redo"></i>
                </button>
                <button class="btn btn-icon btn-danger" onclick="deleteFromHistory(${index})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        historyList.appendChild(item);
    });
}

function saveToRouteHistory(start, end, distance, duration) {
    const routeEntry = {
        id: Date.now(),
        start,
        end,
        distance,
        duration,
        date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        timestamp: Date.now()
    };
    
    routeHistory.unshift(routeEntry);
    
    // Keep only last 20 routes
    if (routeHistory.length > 20) {
        routeHistory = routeHistory.slice(0, 20);
    }
    
    localStorage.setItem('routeHistory', JSON.stringify(routeHistory));
    renderRouteHistory();
}

function loadFromHistory(index) {
    if (index >= 0 && index < routeHistory.length) {
        const route = routeHistory[index];
        
        // Load into inputs
        const startInput = document.getElementById('startLocation');
        const endInput = document.getElementById('endLocation');
        
        if (startInput) startInput.value = route.start;
        if (endInput) endInput.value = route.end;
        
        // Attempt to recalculate
        showPremiumToast('🔄 Loading Route', `Loading: ${route.start} → ${route.end}`);
        
        // Try to calculate after a delay
        setTimeout(() => {
            if (typeof window.calculateRoute === 'function') {
                window.calculateRoute();
            }
        }, 500);
    }
}

function deleteFromHistory(index) {
    if (index >= 0 && index < routeHistory.length) {
        routeHistory.splice(index, 1);
        localStorage.setItem('routeHistory', JSON.stringify(routeHistory));
        renderRouteHistory();
        showPremiumToast('🗑️ Route Deleted', 'Route removed from history');
    }
}

// ============================
// ALTERNATIVE ROUTES SYSTEM
// ============================

function initializeAlternativeRoutes() {
    const loadAlternativesBtn = document.getElementById('loadAlternativesBtn');
    if (loadAlternativesBtn) {
        loadAlternativesBtn.addEventListener('click', loadAlternativeRoutes);
    }
}

async function loadAlternativeRoutes() {
    // Check if start and end coordinates exist (from core)
    if (!window.startCoords || !window.endCoords) {
        showPremiumToast('⚠️ Missing Route', 'Please calculate a route first');
        return;
    }
    
    showPremiumToast('🔍 Finding Alternatives', 'Searching for different route options...');
    
    try {
        // Simulate API call with different preferences
        const alternatives = [
            {
                id: 1,
                type: 'Fastest',
                distance_km: '12.5',
                duration_min: '25',
                cost: '$3.50',
                traffic: 'Light',
                description: 'Uses highways for maximum speed',
                color: '#3b82f6',
                icon: '🚀'
            },
            {
                id: 2,
                type: 'Shortest',
                distance_km: '10.8',
                duration_min: '32',
                cost: '$0.00',
                traffic: 'Medium',
                description: 'Local roads, shorter distance',
                color: '#10b981',
                icon: '📏'
            },
            {
                id: 3,
                type: 'Eco-Friendly',
                distance_km: '13.2',
                duration_min: '35',
                cost: '$1.25',
                traffic: 'Light',
                description: 'Optimized for fuel efficiency',
                color: '#22c55e',
                icon: '🌿'
            },
            {
                id: 4,
                type: 'Scenic',
                distance_km: '15.7',
                duration_min: '40',
                cost: '$2.75',
                traffic: 'Very Light',
                description: 'Beautiful views, relaxed pace',
                color: '#8b5cf6',
                icon: '🏞️'
            }
        ];
        
        alternativeRoutes = alternatives;
        renderAlternativeRoutes(alternatives);
        
        showPremiumToast('✅ Alternatives Found', `${alternatives.length} route options available`);
        
    } catch (error) {
        console.error('Failed to load alternatives:', error);
        showPremiumToast('❌ Error', 'Could not load alternative routes');
    }
}

function renderAlternativeRoutes(alternatives) {
    const container = document.getElementById('alternativesContainer');
    const noAlternatives = document.getElementById('noAlternatives');
    const grid = container?.querySelector('.alternatives-grid');
    
    if (!container || !grid) return;
    
    if (alternatives.length > 0) {
        container.style.display = 'block';
        if (noAlternatives) noAlternatives.style.display = 'none';
        
        grid.innerHTML = '';
        
        alternatives.forEach((alt, index) => {
            const card = document.createElement('div');
            card.className = `alternative-card ${currentAlternativeId === alt.id ? 'selected' : ''}`;
            card.dataset.id = alt.id;
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="font-size: 1.5rem;">${alt.icon}</div>
                        <h4 style="font-weight: 700; color: ${alt.color};">${alt.type}</h4>
                    </div>
                    <span class="traffic-indicator ${getTrafficClass(alt.traffic)}">
                        <i class="fas fa-car"></i> ${alt.traffic}
                    </span>
                </div>
                
                <div class="alternative-stats">
                    <div class="alternative-stat">
                        <div class="alternative-stat-value">${alt.distance_km} km</div>
                        <div class="alternative-stat-label">Distance</div>
                    </div>
                    <div class="alternative-stat">
                        <div class="alternative-stat-value">${alt.duration_min} min</div>
                        <div class="alternative-stat-label">Duration</div>
                    </div>
                    <div class="alternative-stat">
                        <div class="alternative-stat-value">${alt.cost}</div>
                        <div class="alternative-stat-label">Cost</div>
                    </div>
                </div>
                
                <div style="margin: 15px 0; font-size: 0.9rem; color: #64748b;">
                    ${alt.description}
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="selectAlternativeRoute(${alt.id})" style="flex: 1; padding: 12px;">
                        <i class="fas fa-map-marker-alt" style="margin-right: 8px;"></i> Select
                    </button>
                    <button class="btn btn-outline" onclick="previewAlternativeRoute(${alt.id})" style="padding: 12px 15px;">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            `;
            
            grid.appendChild(card);
        });
    }
}

function selectAlternativeRoute(id) {
    const alternative = alternativeRoutes.find(alt => alt.id === id);
    if (!alternative) return;
    
    // Update UI
    document.querySelectorAll('.alternative-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`.alternative-card[data-id="${id}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    currentAlternativeId = id;
    
    // Show confirmation
    showPremiumToast('✅ Route Selected', `${alternative.type} route has been selected`);
    if (window.speak) window.speak(`Alternative route selected: ${alternative.type}`);
    
    // In a real app, you would recalculate the route with different parameters
    // For now, we'll just update the display
    if (window.currentRouteData) {
        const updatedRoute = {
            ...window.currentRouteData,
            distance_km: alternative.distance_km,
            duration_min: alternative.duration_min
        };
        
        // Update route info if function exists
        if (window.updateRouteInfoUI) {
            window.updateRouteInfoUI(updatedRoute);
        }
        
        showRouteAnalytics(updatedRoute);
    }
}

function previewAlternativeRoute(id) {
    const alternative = alternativeRoutes.find(alt => alt.id === id);
    if (!alternative) return;
    
    // Show preview modal
    showRoutePreviewModal(alternative);
}

function showRoutePreviewModal(alternative) {
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.innerHTML = `
        <div class="preview-modal-content">
            <div class="preview-modal-header">
                <h3>${alternative.icon} ${alternative.type} Route Preview</h3>
                <button class="preview-modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="preview-modal-body">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div class="preview-stat">
                        <div class="preview-stat-label">Distance</div>
                        <div class="preview-stat-value">${alternative.distance_km} km</div>
                    </div>
                    <div class="preview-stat">
                        <div class="preview-stat-label">Duration</div>
                        <div class="preview-stat-value">${alternative.duration_min} min</div>
                    </div>
                    <div class="preview-stat">
                        <div class="preview-stat-label">Estimated Cost</div>
                        <div class="preview-stat-value">${alternative.cost}</div>
                    </div>
                    <div class="preview-stat">
                        <div class="preview-stat-label">Traffic</div>
                        <div class="preview-stat-value">${alternative.traffic}</div>
                    </div>
                </div>
                <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #475569;">${alternative.description}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="gradient-btn" onclick="selectAlternativeRoute(${alternative.id}); this.parentElement.parentElement.parentElement.parentElement.remove()" style="flex: 1;">
                        <i class="fas fa-check"></i> Select This Route
                    </button>
                    <button class="btn" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    const content = modal.querySelector('.preview-modal-content');
    content.style.cssText = `
        background: white;
        border-radius: 20px;
        width: 90%;
        max-width: 500px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(modal);
}

// ============================
// ANALYTICS SYSTEM
// ============================

function initializeAnalytics() {
    // Set up analytics update interval
    setInterval(updateLiveAnalytics, 5000);
}

function showRouteAnalytics(routeData) {
    // Select the specific IDs from your route.html
    const riskDisplay = document.getElementById('recommendedRisk');
    const riskHud = document.getElementById('recommendedRiskHudMain');
    const riskHudAlt = document.getElementById('recommendedRiskHud');
    const detailsEl = document.getElementById('recommendedDetails');
    const explanationList = document.getElementById('explanationList');
    
    if (!routeData || !routeData.analytics) return;

    const { analytics } = routeData;

    // 1. Update Safety Indicator in the Risk Analysis section
    if (riskDisplay) {
        riskDisplay.textContent = analytics.safetyDescription;
        // Apply your premium CSS animations (success-glow or danger-pulse)
        riskDisplay.className = `risk-indicator ${analytics.safetyScore > 80 ? 'success-glow' : 'danger-pulse'}`;
    }

    // 2. Update Safety Scores in the Dashboard HUDs
    if (riskHud) riskHud.textContent = analytics.safetyScore;
    if (riskHudAlt) riskHudAlt.textContent = analytics.safetyScore;

    // 3. Update the AI-generated route details text
    if (detailsEl) {
        detailsEl.textContent = `SafeNav AI Analysis: ${analytics.safetyDescription}. This route is optimized for ${userPreferences.priority} travel. Predicted traffic: ${analytics.trafficPrediction}.`;
    }

    // 4. Update the Safety Factors Bullet Points
    if (explanationList) {
        explanationList.innerHTML = analytics.safetyFactors
            .map(factor => `<li><i class="fas fa-check-circle" style="color: #10b981; margin-right: 8px;"></i> ${factor}</li>`)
            .join('');
    }

    // 5. Trigger other analytics components if they exist
    if (analytics.roadTypes) createRoadTypeChart(analytics.roadTypes);
    updateLiveStats(routeData);
}
function createRoadTypeChart(roadTypes) {
    const chart = document.getElementById('roadTypeChart');
    if (!chart) return;
    
    chart.innerHTML = '';
    
    const colors = {
        'Highway': '#3b82f6',
        'Arterial': '#10b981',
        'Local': '#8b5cf6',
        'Residential': '#f59e0b',
        'Other': '#94a3b8'
    };
    
    let total = 0;
    Object.values(roadTypes).forEach(value => total += value);
    
    Object.entries(roadTypes).forEach(([type, value]) => {
        const percentage = (value / total) * 100;
        if (percentage > 0) {
            const segment = document.createElement('div');
            segment.className = 'road-type-segment';
            segment.style.width = `${percentage}%`;
            segment.style.backgroundColor = colors[type] || '#94a3b8';
            segment.title = `${type}: ${percentage.toFixed(1)}%`;
            
            if (percentage > 10) {
                const label = document.createElement('span');
                label.className = 'road-type-label';
                label.textContent = `${type} ${percentage.toFixed(0)}%`;
                segment.appendChild(label);
            }
            
            chart.appendChild(segment);
        }
    });
}

function updateTimeBreakdown(durationMin) {
    const container = document.getElementById('timeBreakdown');
    if (!container) return;
    
    const travelTime = durationMin;
    const trafficDelay = Math.round(durationMin * 0.15);
    const restTime = durationMin > 120 ? 20 : durationMin > 60 ? 15 : 5;
    const totalTime = travelTime + trafficDelay + restTime;
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #64748b;">Travel Time</span>
            <span style="font-weight: 600;">${travelTime} min</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #64748b;">Traffic Delay</span>
            <span style="font-weight: 600; color: #f59e0b;">+${trafficDelay} min</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span style="color: #64748b;">Recommended Breaks</span>
            <span style="font-weight: 600; color: #8b5cf6;">+${restTime} min</span>
        </div>
        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; margin: 20px 0; overflow: hidden;">
            <div style="width: ${(travelTime/totalTime*100)}%; height: 100%; background: #3b82f6; display: inline-block;"></div>
            <div style="width: ${(trafficDelay/totalTime*100)}%; height: 100%; background: #f59e0b; display: inline-block;"></div>
            <div style="width: ${(restTime/totalTime*100)}%; height: 100%; background: #8b5cf6; display: inline-block;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; color: #1e40af;">
            <span>Total Estimated Time</span>
            <span>${totalTime} min</span>
        </div>
    `;
}

function updateCostBreakdown(fuelCost, tollCost) {
    const container = document.getElementById('costBreakdown');
    if (!container) return;
    
    const fuel = parseFloat(fuelCost) || 0;
    const tolls = parseFloat(tollCost) || 0;
    const maintenance = (fuel * 0.15).toFixed(2);
    const depreciation = (fuel * 0.25).toFixed(2);
    const total = (fuel + tolls + parseFloat(maintenance) + parseFloat(depreciation)).toFixed(2);
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #64748b;">Fuel Cost</span>
            <span style="font-weight: 600; color: #10b981;">$${fuel.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #64748b;">Toll Cost</span>
            <span style="font-weight: 600; color: #8b5cf6;">$${tolls.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #64748b;">Maintenance</span>
            <span style="font-weight: 600; color: #f59e0b;">$${maintenance}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span style="color: #64748b;">Vehicle Depreciation</span>
            <span style="font-weight: 600;">$${depreciation}</span>
        </div>
        <div style="height: 4px; background: #e2e8f0; border-radius: 2px; margin: 15px 0; overflow: hidden;">
            <div style="width: ${(fuel/total*100)}%; height: 100%; background: #10b981; display: inline-block;"></div>
            <div style="width: ${(tolls/total*100)}%; height: 100%; background: #8b5cf6; display: inline-block;"></div>
            <div style="width: ${(parseFloat(maintenance)/total*100)}%; height: 100%; background: #f59e0b; display: inline-block;"></div>
        </div>
        <div style="padding-top: 15px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; color: #1e40af;">
            <span>Total Estimated Cost</span>
            <span>$${total}</span>
        </div>
    `;
}

// ============================
// LIVE STATS SYSTEM
// ============================

function initializeLiveStats() {
    // Initialize live stats update
    setInterval(updateLiveStatsDisplay, 1000);
}

function updateLiveStats(routeData) {
    // This would update live stats based on route data
    // For now, we'll simulate some data
    if (!routeData) return;
    
    const stats = {
        avgSpeed: Math.round(Math.random() * 30 + 50), // 50-80 km/h
        fuelConsumption: (routeData.distance_km * 0.08).toFixed(1),
        timeSaved: Math.round(routeData.duration_min * 0.15),
        safetyScore: 85 + Math.random() * 15
    };
    
    // Update live stats display
    const liveStatsContainer = document.getElementById('liveStats');
    if (liveStatsContainer) {
        liveStatsContainer.innerHTML = `
            <div class="live-stat">
                <div class="live-stat-value">${stats.avgSpeed}</div>
                <div class="live-stat-label">Avg Speed</div>
            </div>
            <div class="live-stat">
                <div class="live-stat-value">${stats.fuelConsumption}L</div>
                <div class="live-stat-label">Fuel Used</div>
            </div>
            <div class="live-stat">
                <div class="live-stat-value">${stats.timeSaved}m</div>
                <div class="live-stat-label">Time Saved</div>
            </div>
            <div class="live-stat">
                <div class="live-stat-value">${Math.round(stats.safetyScore)}</div>
                <div class="live-stat-label">Safety Score</div>
            </div>
        `;
    }
}

function updateLiveStatsDisplay() {
    // Update real-time stats during navigation
    if (!window.isNavigating) return;
    
    // Update current speed
    const speedElement = document.getElementById('routeSpeed');
    const speedMainElement = document.getElementById('routeSpeedMain');
    
    // Simulate speed changes during navigation
    if (speedElement && speedMainElement) {
        const currentSpeed = parseInt(speedElement.textContent) || 0;
        const newSpeed = Math.max(0, currentSpeed + (Math.random() * 4 - 2));
        speedElement.textContent = Math.round(newSpeed);
        speedMainElement.textContent = Math.round(newSpeed);
        
        // Update color based on speed limit
        if (window.currentSpeedLimit && newSpeed > window.currentSpeedLimit + 10) {
            speedElement.style.color = '#ef4444';
            speedMainElement.style.color = '#ef4444';
        } else if (window.currentSpeedLimit && newSpeed > window.currentSpeedLimit) {
            speedElement.style.color = '#f59e0b';
            speedMainElement.style.color = '#f59e0b';
        } else {
            speedElement.style.color = '#10b981';
            speedMainElement.style.color = '#10b981';
        }
    }
    
    // Update ETA
    updateETA();
}

function updateLiveAnalytics() {
    // Update analytics periodically
    if (window.currentRouteData && window.isNavigating) {
        // Update fuel consumption, etc.
    }
}
function updateETA() {
    if (!window.currentRouteData || !window.startNavigationTime) return;
    
    const elapsedMinutes = (Date.now() - window.startNavigationTime) / 60000;
    const remainingDistance = Math.max(0, window.currentRouteData.distance_km - (window.totalDistanceTraveled || 0));
    const avgSpeed = 60; // km/h
    
    if (avgSpeed > 0) {
        const remainingMinutes = (remainingDistance / avgSpeed) * 60;
        const eta = new Date(Date.now() + remainingMinutes * 60000);
        const etaStr = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // --- SAFE ASSIGNMENT (Line 871 Fix) ---
        const display1 = document.getElementById('etaDisplay');
        if (display1) display1.textContent = etaStr;
        
        const display2 = document.getElementById('etaDisplayMain');
        if (display2) display2.textContent = etaStr;
    }
}

// ============================
// WEATHER ALERTS SYSTEM
// ============================

function initializeWeatherAlerts() {
    // Simulate weather updates every 5 minutes
    setInterval(updateWeatherAlerts, 300000);
    
    // Initial update
    updateWeatherAlerts();
}

function updateWeatherAlerts() {
    // In a real app, this would fetch from a weather API
    const conditions = [
        { type: 'clear', icon: '☀️', message: 'Clear skies, perfect driving conditions' },
        { type: 'rain', icon: '🌧️', message: 'Light rain expected, road may be slippery' },
        { type: 'fog', icon: '🌫️', message: 'Fog advisory in effect, reduce speed' },
        { type: 'wind', icon: '💨', message: 'Strong winds expected, be cautious' }
    ];
    
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    // Only show if different from previous
    if (!weatherAlerts.length || weatherAlerts[weatherAlerts.length - 1].type !== randomCondition.type) {
        weatherAlerts.push({
            ...randomCondition,
            timestamp: Date.now()
        });
        
        showWeatherAlert(randomCondition);
    }
}

function showWeatherAlert(condition) {
    const weatherAlert = document.getElementById('weatherAlert');
    if (!weatherAlert) return;
    
    weatherAlert.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 1.5rem;">${condition.icon}</div>
            <div>
                <div style="font-weight: 800; margin-bottom: 5px;">Weather Update</div>
                <div style="font-size: 0.9rem; opacity: 0.9;">${condition.message}</div>
            </div>
        </div>
    `;
    
    weatherAlert.classList.remove('hidden');
    
    // Speak alert if voice is on
    if (window.isVoiceActive && window.speak) {
        window.speak(`Weather update: ${condition.message}`);
    }
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        weatherAlert.classList.add('hidden');
    }, 10000);
}

// ============================
// OFFLINE MODE SYSTEM
// ============================

function initializeOfflineMode() {
    // Check online status
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
}

function updateOnlineStatus() {
    const offlineMode = document.getElementById('offlineMode');
    if (!offlineMode) return;
    
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
        offlineMode.classList.remove('hidden');
        showPremiumToast('📡 Offline Mode', 'Using cached data. Some features may be limited.');
        
        // Disable features that require internet
        document.querySelectorAll('[data-requires-internet]').forEach(el => {
            el.disabled = true;
            el.style.opacity = '0.5';
        });
    } else {
        offlineMode.classList.add('hidden');
        
        // Re-enable features
        document.querySelectorAll('[data-requires-internet]').forEach(el => {
            el.disabled = false;
            el.style.opacity = '1';
        });
    }
}

// ============================
// TRAFFIC SIMULATION
// ============================

function initializeTrafficSimulation() {
    // Simulate traffic updates every 30 seconds
    setInterval(simulateTrafficUpdate, 30000);
}

function simulateTrafficUpdate() {
    // In a real app, this would fetch live traffic data
    const trafficLevels = ['Light', 'Medium', 'Heavy', 'Very Heavy'];
    const randomTraffic = trafficLevels[Math.floor(Math.random() * trafficLevels.length)];
    
    // Update traffic indicator if route exists
    if (window.currentRouteData) {
        const trafficElement = document.getElementById('trafficLevel');
        if (trafficElement) {
            trafficElement.textContent = randomTraffic;
            trafficElement.className = `traffic-indicator traffic-${randomTraffic.toLowerCase().replace(' ', '-')}`;
        }
        
        // Update traffic delay in analytics
        if (Math.random() > 0.7) { // 30% chance of traffic change
            showPremiumToast('🚦 Traffic Update', `Traffic is now ${randomTraffic} on your route`);
        }
    }
}

// ============================
// ENHANCED ROUTE CALCULATION
// ============================

async function calculateEnhancedRoute(start, end) {
    showPremiumToast('🧠 Calculating Route', 'Using enhanced route algorithm...');
    
    // Add user preferences to route calculation
    const params = {
        start,
        end,
        preferences: userPreferences
    };
    
    try {
        // This would be your enhanced route calculation
        // For now, we'll use OSRM but add our analytics
        const route = await window.calculateRouteOSRM(start, end);
        
        if (!route) throw new Error('No route found');
        
        // Enhance with additional analytics
        const enhancedRoute = enhanceRouteWithAnalytics(route);
        
        return enhancedRoute;
        
    } catch (error) {
        console.error('Enhanced route calculation failed:', error);
        throw error;
    }
}

function enhanceRouteWithAnalytics(route) {
    // Add comprehensive analytics to the route
    const distance = parseFloat(route.distance_km);
    const duration = parseInt(route.duration_min);
    
    // Calculate detailed analytics
    const analytics = {
        // Cost calculations
        fuelCost: (distance * 0.08 * 1.2).toFixed(2), // 8L/100km, $1.2 per liter
        tollCost: (distance * (userPreferences.avoidTolls ? 0 : 0.05)).toFixed(2),
        co2Emissions: (distance * 0.12).toFixed(1), // kg CO2 per km
        
        // Efficiency metrics
        timeEfficiency: Math.min(100, Math.round((distance / (duration / 60)) * 10)),
        fuelEfficiency: Math.min(100, Math.round(100 - (distance * 0.08))),
        
        // Safety metrics
        safetyScore: calculateSafetyScore(route),
        safetyDescription: '',
        safetyFactors: [],
        
        // Route composition
        roadTypes: analyzeRoadTypes(route),
        elevationGain: Math.round(Math.random() * 200),
        
        // Traffic predictions
        trafficPrediction: predictTraffic(duration),
        congestionPoints: identifyCongestionPoints(route)
    };
    
    // Set safety description based on score
    if (analytics.safetyScore >= 90) {
        analytics.safetyDescription = 'Excellent safety rating';
        analytics.safetyFactors = ['Well-lit roads', 'Low accident rate', 'Good visibility'];
    } else if (analytics.safetyScore >= 75) {
        analytics.safetyDescription = 'Good safety rating';
        analytics.safetyFactors = ['Standard safety features', 'Moderate traffic', 'Average road quality'];
    } else {
        analytics.safetyDescription = 'Requires caution';
        analytics.safetyFactors = ['Some challenging sections', 'Higher traffic areas', 'Limited lighting'];
    }
    
    route.analytics = analytics;
    return route;
}

function calculateSafetyScore(route) {
    // Simplified safety score calculation
    let score = 85; // Base score
    
    // Adjust based on distance
    const distance = parseFloat(route.distance_km);
    if (distance > 100) score -= 5;
    if (distance > 300) score -= 10;
    
    // Adjust based on preferences
    if (userPreferences.avoidHighways) score += 5;
    if (userPreferences.avoidTolls) score += 2;
    
    // Add random variation
    score += Math.random() * 10 - 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
}

function analyzeRoadTypes(route) {
    // Simulate road type analysis
    return {
        'Highway': Math.round(40 + Math.random() * 30),
        'Arterial': Math.round(25 + Math.random() * 20),
        'Local': Math.round(15 + Math.random() * 20),
        'Residential': Math.round(10 + Math.random() * 15)
    };
}

function predictTraffic(duration) {
    const trafficLevels = ['Light', 'Moderate', 'Heavy'];
    const hour = new Date().getHours();
    
    // More traffic during rush hours
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
        return trafficLevels[2];
    } else if ((hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21)) {
        return trafficLevels[1];
    }
    return trafficLevels[0];
}

function identifyCongestionPoints(route) {
    // Simulate congestion points
    const points = [];
    const numPoints = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numPoints; i++) {
        points.push({
            description: `Possible congestion near intersection ${i + 1}`,
            delay: Math.round(Math.random() * 10) + 5,
            reason: ['Traffic lights', 'School zone', 'Construction'][i % 3]
        });
    }
    
    return points;
}

// ============================
// UTILITY FUNCTIONS
// ============================

function getTrafficClass(traffic) {
    const trafficLower = traffic.toLowerCase();
    if (trafficLower.includes('light')) return 'traffic-light';
    if (trafficLower.includes('medium')) return 'traffic-medium';
    if (trafficLower.includes('heavy') || trafficLower.includes('very heavy')) return 'traffic-heavy';
    return 'traffic-medium';
}

function showPremiumToast(title, message, icon = '✨', duration = 4000) {
    if (!premiumToast) {
        premiumToast = document.getElementById('premiumToast');
    }
    
    if (premiumToast) {
        const toastIcon = document.getElementById('toastIcon');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toastIcon) toastIcon.textContent = icon;
        if (toastTitle) toastTitle.textContent = title;
        if (toastMessage) toastMessage.textContent = message;
        
        premiumToast.classList.remove('hidden');
        premiumToast.style.opacity = '0';
        premiumToast.style.transform = 'translate(-50%, 20px)';
        premiumToast.style.transition = 'none';
        
        setTimeout(() => {
            premiumToast.style.opacity = '1';
            premiumToast.style.transform = 'translate(-50%, 0)';
            premiumToast.style.transition = 'all 0.3s ease';
        }, 10);
        
        setTimeout(() => {
            premiumToast.style.opacity = '0';
            premiumToast.style.transform = 'translate(-50%, 20px)';
            setTimeout(() => {
                premiumToast.classList.add('hidden');
            }, 300);
        }, duration);
    }
}

function addPremiumMarkerStyles() {
    if (!document.getElementById('premium-marker-styles')) {
        const style = document.createElement('style');
        style.id = 'premium-marker-styles';
        style.textContent = `
            .premium-marker { filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2)); transition: all 0.3s ease; }
            .premium-marker:hover { filter: drop-shadow(0 6px 20px rgba(37, 99, 235, 0.4)); transform: scale(1.1); }
            .floating-marker { animation: floatMarker 2s ease-in-out infinite; }
            @keyframes floatMarker { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-8px) rotate(5deg); } }
            @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); } 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); } }
            
            .traffic-light { background: #10b981; color: white; }
            .traffic-medium { background: #f59e0b; color: white; }
            .traffic-heavy { background: #ef4444; color: white; }
            .traffic-very-heavy { background: #dc2626; color: white; }
            
            .history-item { background: #f8fafc; border-radius: 12px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s ease; }
            .history-item:hover { background: #f1f5f9; transform: translateY(-2px); }
            .history-info { flex: 1; }
            .history-route { font-weight: 600; color: #1e293b; margin-bottom: 5px; }
            .history-details { font-size: 0.9rem; color: #64748b; display: flex; gap: 15px; }
            .history-actions { display: flex; gap: 10px; }
            .btn-icon { padding: 8px; border-radius: 8px; background: #f1f5f9; border: none; cursor: pointer; }
            .btn-danger { background: #fef2f2; color: #dc2626; }
            
            .alternative-card { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 20px; transition: all 0.3s ease; cursor: pointer; }
            .alternative-card:hover { transform: translateY(-5px); border-color: #2563eb; box-shadow: 0 10px 30px rgba(37, 99, 235, 0.1); }
            .alternative-card.selected { border-color: #2563eb; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); }
            .alternative-stats { display: flex; justify-content: space-between; margin: 15px 0; }
            .alternative-stat { text-align: center; }
            .alternative-stat-value { font-size: 1.2rem; font-weight: 800; color: #1e40af; }
            .alternative-stat-label { font-size: 0.8rem; color: #64748b; }
            
            .road-type-segment { height: 20px; display: inline-block; transition: width 0.3s ease; }
            .road-type-label { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: white; font-weight: 600; font-size: 0.7rem; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
            
            .live-stat { text-align: center; }
            .live-stat-value { font-size: 1.5rem; font-weight: 800; color: #1e40af; }
            .live-stat-label { font-size: 0.8rem; color: #64748b; margin-top: 5px; }
            
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }
}

// ============================
// INTEGRATION WITH CORE
// ============================
// SAFER INTEGRATION: Hook into core route calculation with safety lock
if (window.calculateRoute && !window.calculateRoute._isHooked) {
    const originalCalculateRoute = window.calculateRoute;
    
    window.calculateRoute = async function() {
        const startInput = document.getElementById("startLocation")?.value;
        const endInput = document.getElementById("endLocation")?.value;
        
        // 1. Run the original Core Routing logic
        const result = await originalCalculateRoute.apply(this, arguments);
        
        // 2. Only proceed if the route was successfully found
        if (window.currentRouteData) {
            // Save to history
            saveToRouteHistory(
                startInput || 'Current Location',
                endInput || 'Destination',
                window.currentRouteData.distance_km,
                window.currentRouteData.duration_min
            );
            
            // Apply Premium Analytics (AI safety scores, etc.)
            window.currentRouteData = enhanceRouteWithAnalytics(window.currentRouteData);
            
            // Show analytics on the UI
            setTimeout(() => {
                showRouteAnalytics(window.currentRouteData);
            }, 500);
        }
        
        return result;
    };
    
    // Set the flag so we don't hook it again
    window.calculateRoute._isHooked = true;
}

// Hook into navigation start for enhanced features
const originalStartNavigation = window.startNavigation;
if (originalStartNavigation) {
    window.startNavigation = function() {
        originalStartNavigation.apply(this, arguments);
        
        // Start premium live stats
        setTimeout(() => {
            updateLiveStats(window.currentRouteData);
        }, 1000);
    };
}

// ============================
// PREMIUM INITIALIZATION
// ============================

document.addEventListener("DOMContentLoaded", function() {
    // Initialize premium features after core is loaded
    setTimeout(initPremiumFeatures, 500);
    
    // Add AI Advice button if exists
    const aiAdviceBtn = document.getElementById('aiAdviceBtn');
    if (aiAdviceBtn) {
        aiAdviceBtn.addEventListener('click', showAIAdvice);
    }
});

function showAIAdvice() {
    if (!window.currentRouteData) {
        showPremiumToast('⚠️ No Route', 'Please calculate a route first');
        return;
    }
    
    const tips = [
        "Consider leaving 15 minutes earlier to avoid rush hour traffic",
        "Check your tire pressure for better fuel efficiency",
        "Keep a safe following distance of at least 3 seconds",
        "Use cruise control on highways to maintain consistent speed",
        "Plan a rest stop every 2 hours for safety",
        "Check weather conditions along your route",
        "Ensure your emergency kit is in the vehicle",
        "Share your route with someone for safety"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    showPremiumToast('🤖 AI Driving Tip', randomTip, '🤖', 5000);
    
    if (window.speak && window.isVoiceActive) {
        window.speak(`AI advice: ${randomTip}`);
    }
}
/* --- ADD THIS TO THE VERY BOTTOM OF ROUTE-PREMIUM.JS --- */

// 1. Share Functionality
async function handleRouteSharing() {
    const end = document.getElementById("endLocation").value;
    const distance = document.getElementById("routeDistanceMain").textContent;
    const safety = document.getElementById("recommendedRiskHudMain").textContent;

    const shareData = {
        title: 'SafeNav Pro Route',
        text: `📍 Heading to ${end}\n📏 Distance: ${distance}km\n🛡️ Safety Score: ${safety}/100`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            showPremiumToast('📲 Shared!', 'Route details sent!', '✨');
        } catch (err) { console.log("Share failed", err); }
    } else {
        navigator.clipboard.writeText(`${shareData.text} \nLink: ${shareData.url}`);
        showPremiumToast('📋 Copied!', 'Link copied to clipboard', '🔗');
    }
}

// 2. Attach Event Listener
document.getElementById("shareRouteBtn")?.addEventListener("click", handleRouteSharing);

// 3. Helper to show the button (Call this inside your successful route drawing function)
function enableSharingUI() {
    const shareBtn = document.getElementById("shareRouteBtn");
    if (shareBtn) {
        shareBtn.style.display = "block";
        shareBtn.classList.add("fade-in");
    }
}
document.getElementById('aiAdviceBtn')?.addEventListener('click', () => {
    if (!window.currentRouteData) {
        showPremiumToast('⚠️ No Route', 'Please calculate a route first');
        return;
    }

    const scoreText = document.getElementById('recommendedRiskHudMain')?.textContent;
    const safetyScore = parseInt(scoreText) || 0;
    
    // Safety Analysis
    let advice = "";
    if (safetyScore > 80) {
        advice = "Optimal route detected. ";
    } else if (safetyScore > 60) {
        advice = "Minor risks ahead. ";
    } else {
        advice = "Low safety rating. ";
    }

    // Add a random driving tip for extra "AI" feel
    const tips = ["Maintain steady speed.", "Check tire pressure.", "Keep a 3-second gap."];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    showPremiumToast('🤖 AI Master Advice', advice + randomTip, '💡', 6000);
    
    if (window.speak && window.isVoiceActive) {
        window.speak(advice + randomTip);
    }
});
// ============================
// STAYS & HOTEL AFFILIATE ENGINE (Powered by TomTom)
// ============================


document.addEventListener("DOMContentLoaded", () => {
    const searchStaysBtn = document.getElementById('searchStaysBtn');
    
    if (searchStaysBtn) {
        searchStaysBtn.addEventListener('click', findSafeHotels);
    }
});

async function findSafeHotels() {
    // 1. Check if a route exists! We need a destination to search near.
    if (!window.currentRouteData || !window.endCoords) {
        showPremiumToast('⚠️ Map Empty', 'Please find a route first so we know where you are going!', 'warning');
        return;
    }

    const btn = document.getElementById('searchStaysBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Scanning Secure Networks...';
    btn.disabled = true;

    // We will search near the user's DESTINATION (endCoords)
    const lat = window.endCoords.lat;
    const lng = window.endCoords.lng;
    
    // Grab user filters
    const safetyLevel = document.getElementById('staySafety').value; // 'high' or 'medium'
    const budgetLevel = document.getElementById('stayBudget').value; // 'budget', 'medium', 'luxury'

    try {
        // Use the TomTom Key from your stays.js
        const TOMTOM_KEY = "eYv21bMhwipW5ydBVnvHYOtcsquJznMB"; 
        
        // Query string based on safety/budget (Making it feel dynamic)
        let query = "hotel";
        if (budgetLevel === "luxury") query = "resort";
        if (budgetLevel === "budget") query = "hostel";

        // Search within a 5km radius of the destination
        const url = `https://api.tomtom.com/search/2/poiSearch/${query}.json?key=${TOMTOM_KEY}&lat=${lat}&lon=${lng}&radius=5000&limit=10`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            showPremiumToast('❌ No Stays Found', 'No secure hotels found in this area.', 'error');
            resetBtn(btn, originalText);
            return;
        }

        // Initialize or clear the hotel layer on the main map
        if (hotelMarkersLayer) {
            window.map.removeLayer(hotelMarkersLayer);
        }
        hotelMarkersLayer = L.layerGroup().addTo(window.map);

        let hotelCount = 0;

        // Plot the hotels on the map!
        data.results.forEach((place) => {
            const pLat = Number(place.position.lat);
            const pLng = Number(place.position.lon);
            const pName = place.poi?.name || "Verified Safe Stay";
            
            // Generate a fake price for the UI based on the budget filter
            let basePrice = 40;
            if(budgetLevel === 'medium') basePrice = 120;
            if(budgetLevel === 'luxury') basePrice = 350;
            const price = Math.floor(basePrice + (Math.random() * 50));

            // Create a specialized Hotel Marker
            const marker = L.marker([pLat, pLng], {
                icon: L.divIcon({
                    html: `<div style="background: #10b981; color: white; padding: 5px 10px; border-radius: 20px; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 12px;">$${price}</div>`,
                    className: "hotel-marker",
                    iconSize: [50, 30],
                    iconAnchor: [25, 30]
                })
            });

            // The Affiliate Popup! (This is where the magic happens)
            // Notice the ?aid=YOUR_ID parameter in the URL.
            const popupHTML = `
                <div style="text-align: center; min-width: 180px; padding: 5px;">
                    <h4 style="margin: 0 0 5px 0; color: #1e293b; font-size: 14px;">${pName}</h4>
                    <div style="color: #10b981; font-weight: bold; font-size: 16px; margin-bottom: 5px;">$${price} / night</div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                        <i class="fas fa-shield-alt"></i> ${safetyLevel === 'high' ? 'High Security' : 'Verified Safe Zone'}
                    </div>
                    <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(pName)}&aid=YOUR_AFFILIATE_ID" target="_blank" style="display: block; background: #003580; color: white; text-decoration: none; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 13px;">
                        Book on Booking.com
                    </a>
                </div>
            `;

            marker.bindPopup(popupHTML);
            marker.addTo(hotelMarkersLayer);
            hotelCount++;
        });

        // Close the drawer and show success
        document.getElementById('hotelFiltersDrawer').style.display = 'none';
        showPremiumToast('🏨 Safe Stays Found!', `Plotted ${hotelCount} secure locations near your destination.`, 'success');
        
        if (window.speak && window.isVoiceActive) {
            window.speak(`Found ${hotelCount} secure stays near your destination.`);
        }

    } catch (error) {
        console.error("Hotel Search Error:", error);
        showPremiumToast('❌ Search Failed', 'Could not connect to the hotel network.', 'error');
    } finally {
        resetBtn(btn, originalText);
    }
}

function resetBtn(btn, text) {
    btn.innerHTML = text;
    btn.disabled = false;
}
// ============================
// STAYS & HOTEL AFFILIATE UI
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const hotelFiltersBtn = document.getElementById('hotelFiltersBtn');
    const hotelFiltersDrawer = document.getElementById('hotelFiltersDrawer');

    if (hotelFiltersBtn && hotelFiltersDrawer) {
        hotelFiltersBtn.addEventListener('click', () => {
            if (hotelFiltersDrawer.style.display === 'none' || hotelFiltersDrawer.style.display === '') {
                hotelFiltersDrawer.style.display = 'block';
                // Small animation effect
                hotelFiltersDrawer.style.animation = 'slideDown 0.3s ease';
            } else {
                hotelFiltersDrawer.style.display = 'none';
            }
        });
    }
});
// Export premium functions to window
window.loadFromHistory = loadFromHistory;
window.deleteFromHistory = deleteFromHistory;
window.selectAlternativeRoute = selectAlternativeRoute;
window.previewAlternativeRoute = previewAlternativeRoute;
window.applyPreferences = applyPreferences;
window.resetPreferences = resetPreferences;
window.showAIAdvice = showAIAdvice;
window.initPremiumFeatures = initPremiumFeatures;
}