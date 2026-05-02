// ==========================================
// TRAVELDISCOVER 
// ==========================================

// Global variable to store the logged-in user's info
let currentUser = null;
// FOR TESTING: Force it to use your local Python server
const API_BASE_URL = 'http://localhost:5000'; // Change this after deployment

document.addEventListener('DOMContentLoaded', function() {
    // ⚡ INSTANT UI: Load from Global State Cache before Firebase even responds!
    const globalProfile = JSON.parse(localStorage.getItem('safeNav_globalProfile'));
    if (globalProfile) {
        console.log("⚡ AI Engine loaded fast preferences:", globalProfile);
        
        if (globalProfile.budgetDefault) document.getElementById('budget').value = globalProfile.budgetDefault;
        if (globalProfile.tripStyle) document.getElementById('vibe').value = globalProfile.tripStyle;
        if (globalProfile.travelGroup) document.getElementById('companions').value = globalProfile.travelGroup;
        if (globalProfile.transportDefault) document.getElementById('transport').value = globalProfile.transportDefault;
        if (globalProfile.foodDefault) document.getElementById('foodPref').value = globalProfile.foodDefault;
        
        // Map the new Health Profile instantly!
        const healthSelect = document.getElementById('plannerHealthProfile');
        if (healthSelect && globalProfile.healthProfile) {
            healthSelect.value = globalProfile.healthProfile;
        }
    }
    // 🛡️ THE LOGIN WALL: (Temporarily bypassed for UI testing)
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Automatically fill the UI with the user's saved Firebase profile
                const uid = user.uid;
                firebase.firestore().collection('users').doc(uid).get().then(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        if (data.budgetDefault) document.getElementById('budget').value = data.budgetDefault;
                        if (data.tripStyle) document.getElementById('vibe').value = data.tripStyle;
                        if (data.travelGroup) document.getElementById('companions').value = data.travelGroup;
                        if (data.transportDefault) document.getElementById('transport').value = data.transportDefault;
                        if (data.foodDefault) document.getElementById('foodPref').value = data.foodDefault;
                    }
                });
                currentUser = user;
                console.log("Authenticated as:", currentUser.email);
            } else {
                console.warn("User not logged in. Bypassing login redirect for testing.");
            }
            
            // 🚀 INITIALIZE UI WHETHER LOGGED IN OR NOT
            initializeEntranceAnimations();
            initializeThemeToggle();
            initializeFloatingLabels();
            initializeVibeChips();
            initializeDropdowns();
            initializeRippleEffects();
            initializeSmoothScrolling();
            initializeFormValidation();
            restrictPastDates();
        });
    } else {
        console.error("Firebase is not loaded! Check your HTML scripts.");
    }
});

// ==========================================
// ANIMATION SYSTEM
// ==========================================
function initializeEntranceAnimations() {
    const elements = document.querySelectorAll('.glass-panel, .panel-header, .form-group');
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.animation = `fadeUp 0.5s ease-out ${index * 0.1}s forwards`;
    });
}

function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if(!themeToggle) return;
    const themeIcon = themeToggle.querySelector('i');
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        document.body.style.transition = 'background-color 0.3s ease';
        setTimeout(() => { document.body.style.transition = ''; }, 300);
    });
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('#themeToggle i');
    if(themeIcon) themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function initializeFloatingLabels() {
    const floatingInputs = document.querySelectorAll('.floating-input');
    
    floatingInputs.forEach(input => {
        if (input.value.trim() !== '') {
            if(input.nextElementSibling) input.nextElementSibling.classList.add('floating');
        }
        
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
            if (this.value.trim() === '') {
                if(this.nextElementSibling) this.nextElementSibling.classList.remove('floating');
            }
        });
        
        input.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                if(this.nextElementSibling) this.nextElementSibling.classList.add('floating');
            } else {
                if(this.nextElementSibling) this.nextElementSibling.classList.remove('floating');
            }
        });
    });
}

function initializeVibeChips() {
    const chips = document.querySelectorAll('.vibe-chip');
    const hiddenInput = document.getElementById('vibe');
    
    chips.forEach(chip => {
        chip.addEventListener('click', function() {
            chips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const selectedValue = this.getAttribute('data-value');
            if(hiddenInput) hiddenInput.value = selectedValue;
            
            this.style.animation = 'chipSelect 0.3s ease';
            setTimeout(() => { this.style.animation = ''; }, 300);
        });
    });
    
    if (chips.length > 0 && hiddenInput) {
        chips[0].classList.add('active');
        hiddenInput.value = chips[0].getAttribute('data-value');
    }
}

function initializeDropdowns() {
    const styledSelects = document.querySelectorAll('.styled-select');
    styledSelects.forEach(select => {
        select.addEventListener('focus', function() { this.parentElement.classList.add('dropdown-open'); });
        select.addEventListener('blur', function() { this.parentElement.classList.remove('dropdown-open'); });
        select.addEventListener('change', function() {
            this.parentElement.style.transform = 'scale(0.98)';
            setTimeout(() => { this.parentElement.style.transform = ''; }, 150);
        });
    });
}

function initializeRippleEffects() {
    const buttons = document.querySelectorAll('.generate-btn, .action-btn, .save-profile-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            const existingRipples = this.querySelectorAll('.ripple');
            existingRipples.forEach(r => r.remove());
            
            this.appendChild(ripple);
            setTimeout(() => { ripple.remove(); }, 600);
        });
    });
}

function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function initializeFormValidation() {
    const generateBtn = document.getElementById('generateBtn');
    
    if(generateBtn) {
        generateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const destination = document.getElementById('destination').value.trim();
            const days = document.getElementById('days').value.trim();
            const startDate = document.getElementById('startDate').value;
            
            let isValid = true;
            
            if (!destination) {
                shakeElement(document.getElementById('destination').parentElement);
                isValid = false;
            }
            if (!startDate) {
                shakeElement(document.getElementById('startDate').parentElement);
                isValid = false;
            }
            if (!days || parseInt(days) < 1 || parseInt(days) > 30) {
                shakeElement(document.getElementById('days').parentElement);
                isValid = false;
            }
            
            if (isValid) {
                generateItinerary();
            } else {
                showError('Please fill in all required fields correctly.');
            }
        });
    }
}

function shakeElement(element) {
    if(!element) return;
    element.classList.add('shake');
    setTimeout(() => { element.classList.remove('shake'); }, 500);
}

function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
    
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: linear-gradient(135deg, #ef4444, #dc2626); color: white;
        padding: 1rem 1.5rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem;
        box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3); z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// 🧠 SMART IMAGE ENGINE & MEMORY
// ==========================================
const usedImagesTracker = new Set();
const usedFallbacks = new Set();

const fallbacks = {
    food: [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1414235077428-338988692392?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    stay: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1542314831-c6a420828f42?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ],
    activity: [
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1527631746610-bca00a040d60?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ]
};

async function fetchImage(place, destination, type) {
    const safeType = type.toLowerCase().trim();
    
    // Dynamic URL
    const LIVE_URL = 'https://safenav-18sk.onrender.com'; // Adjust as needed
    try {
        const response = await fetch(`${LIVE_URL}/api/get-image?query=${encodeURIComponent(place + " " + destination)}`);
        const data = await response.json();
        if (data.url) {
            if (!usedImagesTracker.has(data.url)) {
                usedImagesTracker.add(data.url);
                return data.url;
            }
        }
    } catch (error) {
        console.log("Secure Image Fetch failed, using local fallback system.");
    }
    
    const targetFallbacks = fallbacks[safeType] || fallbacks['activity'];
    for (let f of targetFallbacks) {
        if (!usedFallbacks.has(f)) {
            usedFallbacks.add(f);
            return f;
        }
    }
    return targetFallbacks[Math.floor(Math.random() * targetFallbacks.length)];
}

// ==========================================
// 🧠 1. GLOBAL STATE (The "TripSession")
// ==========================================
const TripSession = {
    status: 'idle', // 'idle', 'loading', 'success', 'error'
    errorMsg: null,
    simulationData: null
};

// ==========================================
// ⚙️ 2. CORE API LOGIC (Phase 1 Risk Engine)
// ==========================================
async function generateItinerary() { 
    const formData = {
        destination: document.getElementById('destination').value.trim(),
        origin: document.getElementById('origin').value.trim() || "Not specified",
        start_date: document.getElementById('startDate').value,
        days: document.getElementById('days').value,
        health_profile: document.getElementById('plannerHealthProfile')?.value || "Standard",
        trip_vibe: document.getElementById('vibe')?.value || "Adventure",
        budget: document.getElementById('budget')?.value || "Moderate",
        companions: document.getElementById('companions')?.value || "Solo",
        transport: document.getElementById('transport')?.value || "Public Transit",
        food: document.getElementById('foodPref')?.value || "Any",
        safety_mode: "Normal"
    };

    if (typeof firebase !== 'undefined' && currentUser) {
        try {
            const doc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
            if (doc.exists && doc.data().safetyMode) {
                formData.safety_mode = doc.data().safetyMode;
            }
        } catch(e) { console.warn("Could not fetch deep profile"); }
    }

    TripSession.status = 'loading';
    updateUI();

    try {
        console.log("📡 Sending data to Python...", formData);
        const response = await fetch(`${API_BASE_URL}/api/planner/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData) 
        });

        if (!response.ok) throw new Error("Risk Engine timeout or server error.");

        const data = await response.json();
        console.log("📦 RAW PACKAGE FROM PYTHON:", data);
        
        // 🛡️ DEFENSIVE JSON PARSING
        let parsedResult = data.result;
        if (typeof parsedResult === 'string') {
            // Strip out any markdown code blocks the AI might have accidentally added
            parsedResult = parsedResult.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsedResult = JSON.parse(parsedResult);
        }

        TripSession.simulationData = parsedResult;
        TripSession.status = 'success';

    } catch (error) {
        console.error("❌ Simulation Error:", error);
        TripSession.errorMsg = error.message;
        TripSession.status = 'error';
    }

    updateUI();
}

function updateUI() {
    const defaultState = document.getElementById('defaultState');
    const loadingState = document.getElementById('loadingState');
    const contentState = document.getElementById('contentState');
    const itineraryElement = document.getElementById('itineraryText');
    const generateBtn = document.getElementById('generateBtn');

    // 🛡️ USING SET ATTRIBUTE to force overrides of any conflicting CSS
    if(defaultState) defaultState.setAttribute('style', 'display: none !important');
    if(loadingState) loadingState.setAttribute('style', 'display: none !important');
    if(contentState) contentState.setAttribute('style', 'display: none !important');
    if(generateBtn) generateBtn.disabled = false;

    if (TripSession.status === 'loading') {
        if(loadingState) loadingState.setAttribute('style', 'display: flex !important');
        if(generateBtn) generateBtn.disabled = true;
        const loaderText = loadingState.querySelector('p');
        if (loaderText) {
            setTimeout(() => loaderText.innerText = "Analyzing live weather & AQI hazards...", 1000);
            setTimeout(() => loaderText.innerText = "Simulating safe transit paths...", 2500);
        }
    } 
    else if (TripSession.status === 'error') {
        if(defaultState) defaultState.setAttribute('style', 'display: flex !important');
        showError(TripSession.errorMsg || "Failed to simulate trip. Please try again.");
    } 
    else if (TripSession.status === 'success') {
        if(contentState) contentState.setAttribute('style', 'display: block !important');
        
        try {
            let html = renderRiskDashboard(TripSession.simulationData) + renderDailyItinerary(TripSession.simulationData);
            
            html += `
                <div class="itinerary-actions" style="display: flex; gap: 15px; margin-top: 40px; padding-top: 20px; border-top: 1px dashed var(--glass-border);">
                    <button id="saveTripBtn" class="generate-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; background: #10b981;">
                        <i class="fas fa-cloud-upload-alt"></i> Save to Dashboard
                    </button>
                    <button id="printTripBtn" class="action-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; background: var(--card-bg); border: 1px solid var(--glass-border); color: var(--text-main);">
                        <i class="fas fa-file-pdf"></i> Save as PDF
                    </button>
                </div>
            `;

            if (itineraryElement) {
                itineraryElement.innerHTML = html;
                itineraryElement.style.opacity = 0;
                itineraryElement.style.animation = "fadeUp 0.6s ease-out forwards";
            }
            
            document.querySelector('.output-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

            document.getElementById('saveTripBtn')?.addEventListener('click', saveTripToCloud);
            document.getElementById('printTripBtn')?.addEventListener('click', () => {
                if(typeof printItineraryPDF === 'function') {
                    printItineraryPDF();
                } else {
                    window.print();
                }
            });
        } catch (renderError) {
            console.error("❌ Error drawing HTML:", renderError);
            showError("AI generated missing data. Please try generating again.");
            if(defaultState) defaultState.setAttribute('style', 'display: flex !important');
            if(contentState) contentState.setAttribute('style', 'display: none !important');
        }
    }
}

// 🛡️ DEFENSIVE RENDERING (Added Optional Chaining ?.)
function renderRiskDashboard(data) {
    const whyPlan = data?.trip_overview?.why_this_plan || "Custom itinerary designed for your preferences.";
    const totalCost = data?.trip_overview?.cost_breakdown?.total || 0;
    const transitAdvice = data?.trip_overview?.transit_logistics?.route_advice || "Standard transit options available.";

    return `
        <div style="background: var(--input-bg); padding: 25px; border-radius: 16px; border-left: 5px solid #10b981; margin-bottom: 25px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="color: var(--text-main); margin: 0;"><i class="fas fa-shield-alt" style="color: #10b981;"></i> Trip Safety Simulation</h3>
                <span style="background: #10b98120; color: #10b981; padding: 5px 15px; border-radius: 20px; font-weight: 700; font-size: 0.9rem;">Protected Route</span>
            </div>
            <p style="font-size: 0.95rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
                ${whyPlan}
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; background: var(--card-bg); padding: 15px; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div><div style="font-size: 0.8rem; color: var(--text-muted);">Est. Budget</div><div style="font-weight: 800; color: var(--accent); font-size: 1.2rem;">₹${totalCost.toLocaleString('en-IN')}</div></div>
                <div><div style="font-size: 0.8rem; color: var(--text-muted);">Transit Config</div><div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">${transitAdvice}</div></div>
            </div>
        </div>
    `;
}

function renderDailyItinerary(data) {
    if(!data?.itinerary) return "<p>No itinerary data found.</p>";

    let html = '';
    const destination = data?.trip_overview?.destination || "Destination";
    
    data.itinerary.forEach((day, i) => {
        const safeRisk = (day.risk_level || "Low").toLowerCase();
        let riskColor = safeRisk === 'low' ? '#10b981' : safeRisk === 'moderate' ? '#f59e0b' : '#ef4444';
        let riskIcon = safeRisk === 'low' ? 'fa-check-circle' : safeRisk === 'moderate' ? 'fa-exclamation-triangle' : 'fa-shield-alt';
        
        html += `
            <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px; border-bottom: 2px solid var(--glass-border); padding-bottom: 10px; margin: 40px 0 20px 0;">
                <h3 style="color: var(--primary); margin: 0; font-weight: 800; font-size: 1.5rem;"><i class="fas fa-calendar-day"></i> Day ${day.day || i+1}: ${day.theme || "Explore"}</h3>
                <div style="background: ${riskColor}15; color: ${riskColor}; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; border: 1px solid ${riskColor}40;">
                    <i class="fas ${riskIcon}"></i> ${day.risk_level || "Low"} Risk: <span style="font-weight: 500;">${day.risk_reason || "Safe conditions"}</span>
                </div>
            </div>
        `;

        if(day.activities) {
            day.activities.forEach((act, j) => {
                const actType = (act.type || "activity").toLowerCase();
                let icon = 'fas fa-map-marker-alt';
                let color = 'var(--primary)';
                let buttonHtml = '';

                const exactSearchQuery = encodeURIComponent((act.place || "Place") + " " + destination);

                if(actType === 'stay') {
                    icon = 'fas fa-bed'; color = 'var(--accent)'; 
                    buttonHtml = `<a href="https://www.booking.com/searchresults.html?ss=${exactSearchQuery}&aid=2779272" target="_blank" class="btn-affiliate-book" style="display: inline-block; padding: 8px 15px; background: var(--accent); color: white; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-hotel"></i> Book on Booking.com</a>`;
                } else if (actType === 'food') {
                    icon = 'fas fa-utensils'; color = '#f59e0b'; 
                    buttonHtml = `<a href="route.html?dest=${exactSearchQuery}" target="_blank" class="btn-navigate" style="display: inline-block; padding: 8px 15px; background: var(--primary); color: white; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-map-marked-alt"></i> View on Map</a>`;
                } else {
                    buttonHtml = `<a href="route.html?dest=${exactSearchQuery}" target="_blank" class="btn-navigate" style="display: inline-block; padding: 8px 15px; background: var(--primary); color: white; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-car"></i> Navigate Here</a>`;
                }

                const imgId = `img-${i}-${j}`; 
                const imageHtml = `<img id="${imgId}" src="https://via.placeholder.com/100?text=Loading..." class="activity-image" alt="${act.place || 'Location'}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 12px;">`;
                
                fetchImage(act.place || "", destination, actType).then(url => {
                    const imgEl = document.getElementById(imgId);
                    if(imgEl) imgEl.src = url;
                }).catch(() => {});

                html += `
                    <div class="timeline-item" style="display: flex; gap: 15px; margin-bottom: 20px; position: relative;">
                        <div class="time-badge" style="background: var(--card-bg); border: 2px solid ${color}; color: ${color}; width: 75px; height: 75px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; flex-shrink: 0; box-shadow: var(--shadow-sm); z-index: 1;">
                            ${(act.time || "10:00 AM").split(' ')[0]} <span style="font-size:0.6rem;">${(act.time || "10:00 AM").split(' ')[1] || ''}</span>
                        </div>
                        <div class="activity-card" style="background: var(--card-bg); border: 1px solid var(--glass-border); border-left: 5px solid ${color}; border-radius: 16px; padding: 15px; flex: 1; display: flex; gap: 15px; box-shadow: var(--shadow-sm);">
                            ${imageHtml}
                            <div class="activity-content" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                    <div>
                                        <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);"><i class="${icon}" style="color:${color}; margin-right:8px;"></i>${act.place || 'Location'}</h4>
                                        <p style="color:var(--text-muted); font-size:0.85rem; margin-top:5px; text-transform: capitalize;">${actType}</p>
                                    </div>
                                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                                        <p class="cost" style="color: ${color}; font-weight: 700; margin: 0;">₹${(act.estimated_cost_inr || 0).toLocaleString('en-IN')}</p>
                                        
                                        <button onclick="swapActivity(this, '${(act.place || "").replace(/'/g, "\\'")}', '${destination.replace(/'/g, "\\'")}', '${actType}', '${act.time || ""}', '${color}', '${icon}')" class="swap-btn" style="background: var(--bg-main); border: 1px solid var(--glass-border); padding: 4px 10px; border-radius: 8px; color: var(--text-muted); cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: 0.2s;">
                                            <i class="fas fa-sync-alt"></i> Swap
                                        </button>
                                    </div>
                                </div>
                                <div style="margin-top: 10px;">${buttonHtml}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
    });

    return html;
}

// ==========================================
// ITINERARY MANAGEMENT FUNCTIONS
// ==========================================
function saveToProfile() {
    const destination = document.getElementById('destination').value;
    const plan = document.getElementById('itineraryText').innerHTML;
    
    if (!destination || !plan || plan.includes('Your Adventure Awaits')) {
        showError('Please generate an itinerary first!');
        return;
    }
    
    const trip = {
        id: Date.now(),
        destination: destination,
        plan: plan,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        budget: document.getElementById('budget').value,
        vibe: document.getElementById('vibe').value
    };

    let myTrips = JSON.parse(localStorage.getItem('travelDiscoverTrips')) || [];
    myTrips.push(trip);
    localStorage.setItem('travelDiscoverTrips', JSON.stringify(myTrips));
    showSuccess('Trip saved to your local profile!');
}

function shareItinerary() {
    const plan = document.getElementById('itineraryText').innerText;
    if (!plan || plan.includes('Your Adventure Awaits')) {
        showError('Please generate an itinerary first!');
        return;
    }
    
    if (navigator.share) {
        navigator.share({ title: 'My TravelDiscover Itinerary', text: plan.substring(0, 100) + '...', url: window.location.href });
    } else {
        navigator.clipboard.writeText(plan).then(() => { showSuccess('Itinerary copied to clipboard!'); });
    }
}

function printItinerary() {
    const plan = document.getElementById('itineraryText').innerHTML;
    if (!plan || plan.includes('Your Adventure Awaits')) {
        showError('Please generate an itinerary first!');
        return;
    }
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`
        <html>
            <head><title>TravelDiscover Itinerary</title><style>body { font-family: Arial, sans-serif; padding: 20px; } h1 { color: #2563eb; } .print-date { color: #666; margin-bottom: 30px; }</style></head>
            <body><h1>TravelDiscover Itinerary</h1><div class="print-date">Generated on ${new Date().toLocaleDateString()}</div><div>${plan}</div></body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: linear-gradient(135deg, #10b981, #059669); color: white;
        padding: 1rem 1.5rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem;
        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// ☁️ CLOUD DATABASE: SAVE TRIP TO FIRESTORE
// ==========================================
async function saveTripToCloud() {
    if (!currentUser) {
        alert("You must be logged in to save trips!");
        return;
    }

    const saveBtn = document.getElementById('saveTripBtn'); 
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving to Cloud...`;
    saveBtn.disabled = true;

    const destination = document.getElementById('destination').value.trim();
    const budget = document.getElementById('budget').value;
    const vibe = document.getElementById('vibe').value;
    const planHTML = document.getElementById('itineraryText').innerHTML;

    const db = firebase.firestore();
    
    const tripData = {
        destination: destination,
        budget: budget,
        vibe: vibe,
        plan: planHTML,
        date: new Date().toLocaleDateString(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('users').doc(currentUser.uid).collection('trips').add(tripData);
        
        saveBtn.innerHTML = `<i class="fas fa-check"></i> Saved to Dashboard!`;
        saveBtn.style.background = '#10b981';
        saveBtn.style.color = 'white';
        
        setTimeout(() => {
            if (typeof restoreProfileDefaults === 'function') {
                restoreProfileDefaults();
            }
            
            document.getElementById('contentState').style.display = 'none';
            document.getElementById('defaultState').style.display = 'flex';
            
            saveBtn.innerHTML = originalText;
            saveBtn.style.background = '';
            saveBtn.disabled = false;
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 3000);

    } catch (error) {
        console.error("Error saving trip to cloud:", error);
        alert("Failed to save trip. Check your connection.");
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ==========================================
// 🔄 PREMIUM FEATURE: SWAP ACTIVITY
// ==========================================
window.swapActivity = async function(btnElement, oldPlace, destination, type, time, color, icon) {
    const cardElement = btnElement.closest('.activity-card');
    const originalHTML = cardElement.innerHTML; 
    
    cardElement.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: ${color}; margin-bottom: 10px;"></i>
            <p style="color: var(--text-muted); font-size: 0.9rem; font-weight: 600;">Finding an alternative for ${oldPlace}...</p>
        </div>
    `;

    try {
        const promptText = `
            You are an expert travel planner. The user did not like the activity "${oldPlace}" in "${destination}" scheduled for "${time}". 
            Suggest exactly ONE highly-rated alternative activity of type "${type}" in "${destination}".
            Return ONLY a valid JSON object matching this exact structure:
            {
                "place": "Name of the new place",
                "estimated_cost_inr": 1500
            }
        `;

        // Wait, where is `callSafenavAI` defined? I am adding a direct fetch fallback just in case!
        let aiResponseRaw = null;
        if(typeof callSafenavAI === 'function') {
            aiResponseRaw = await callSafenavAI(promptText);
        } else {
             // Direct hit to the planner generate route as a fallback
             const res = await fetch(`${API_BASE_URL}/api/planner/generate`, {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ destination: destination, days: 1, origin: "Swap Request" })
             });
             const swapData = await res.json();
             if(swapData.result && swapData.result.itinerary) {
                 const newActData = swapData.result.itinerary[0].activities[0];
                 aiResponseRaw = JSON.stringify({ place: newActData.place, estimated_cost_inr: newActData.estimated_cost_inr });
             }
        }
        
        if (!aiResponseRaw) throw new Error("AI failed to find alternative.");

        // Safe JSON parse for swap too!
        let cleanedSwap = aiResponseRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const newAct = JSON.parse(cleanedSwap);

        const newImgUrl = await fetchImage(newAct.place, destination, type);
        const exactSearchQuery = encodeURIComponent(newAct.place + " " + destination);

        let buttonHtml = '';
        if(type === 'stay') {
            buttonHtml = `<a href="https://www.booking.com/searchresults.html?ss=${exactSearchQuery}&aid=2779272" target="_blank" class="btn-affiliate-book"><i class="fas fa-hotel"></i> Book on Booking.com</a>`;
        } else if (type === 'food') {
            buttonHtml = `<a href="route.html?dest=${exactSearchQuery}" target="_blank" class="btn-navigate"><i class="fas fa-map-marked-alt"></i> View on Map</a>`;
        } else {
            buttonHtml = `<a href="route.html?dest=${exactSearchQuery}" target="_blank" class="btn-navigate"><i class="fas fa-car"></i> Navigate Here</a>`;
        }

        cardElement.innerHTML = `
            <img src="${newImgUrl}" class="activity-image" alt="${newAct.place}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 12px;">
            <div class="activity-content" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);"><i class="${icon}" style="color:${color}; margin-right:8px;"></i>${newAct.place}</h4>
                        <p style="color:var(--text-muted); font-size:0.85rem; margin-top:5px; text-transform: capitalize;">${type} <span style="color: #10b981; font-weight: 700; margin-left: 5px;">(Updated ✨)</span></p>
                    </div>
                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        <p class="cost" style="color: ${color}; font-weight: 700; margin: 0;">₹${(newAct.estimated_cost_inr || 0).toLocaleString('en-IN')}</p>
                        <button onclick="swapActivity(this, '${newAct.place.replace(/'/g, "\\'")}', '${destination.replace(/'/g, "\\'")}', '${type}', '${time}', '${color}', '${icon}')" class="swap-btn" style="background: var(--bg-main); border: 1px solid var(--glass-border); padding: 4px 10px; border-radius: 8px; color: var(--text-muted); cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: 0.2s;">
                            <i class="fas fa-sync-alt"></i> Swap
                        </button>
                    </div>
                </div>
                <div>${buttonHtml}</div>
            </div>
        `;

        cardElement.style.animation = "none";
        setTimeout(() => cardElement.style.animation = "fadeUp 0.4s ease-out forwards", 10);

    } catch (error) {
        console.error("Swap Error:", error);
        alert("Couldn't find an alternative. Try again in a moment.");
        cardElement.innerHTML = originalHTML; 
    }
}

// ==========================================
// 🔄 RESET FORM TO PROFILE DEFAULTS (Zero Latency)
// ==========================================
window.restoreProfileDefaults = function() {
    const globalProfile = JSON.parse(localStorage.getItem('safeNav_globalProfile'));
    
    if (globalProfile) {
        if (globalProfile.budgetDefault) document.getElementById('budget').value = globalProfile.budgetDefault;
        if (globalProfile.tripStyle) document.getElementById('vibe').value = globalProfile.tripStyle;
        if (globalProfile.travelGroup) document.getElementById('companions').value = globalProfile.travelGroup;
        if (globalProfile.transportDefault) document.getElementById('transport').value = globalProfile.transportDefault;
        if (globalProfile.foodDefault) document.getElementById('foodPref').value = globalProfile.foodDefault;
        
        const healthDropdown = document.getElementById('plannerHealthProfile');
        if (healthDropdown && globalProfile.healthProfile) healthDropdown.value = globalProfile.healthProfile;

        document.getElementById('origin').value = '';
        document.getElementById('destination').value = '';
        document.getElementById('startDate').value = '';
        document.getElementById('days').value = '';

        console.log("⚡ Form instantly reset using Global Cache.");
    }
};

// ==========================================
// 📅 DATE RESTRICTION
// ==========================================
function restrictPastDates() {
    const dateInput = document.getElementById('startDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }
}

const styleTag = document.createElement('style');
styleTag.textContent = `@keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }`;
document.head.appendChild(styleTag);