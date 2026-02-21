// ==========================================
// TRAVELDISCOVER 
// ==========================================

// Global variable to store the logged-in user's info
let currentUser = null;

const API_BASE_URL = 'https://safenav-18sk.onrender.com'; // Your actual live URL! // Change this after deployment

document.addEventListener('DOMContentLoaded', function() {
    // 🛡️ THE LOGIN WALL: Check if user is authenticated
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Automatically fill the UI with the user's saved Firebase profile
const uid = user.uid;
firebase.firestore().collection('users').doc(uid).get().then(doc => {
    if (doc.exists) {
        const data = doc.data();
        // Update the visual dropdowns on the page!
        if (data.budgetDefault) document.getElementById('budget').value = data.budgetDefault;
        if (data.tripStyle) document.getElementById('vibe').value = data.tripStyle;
        if (data.travelGroup) document.getElementById('companions').value = data.travelGroup;
        if (data.transportDefault) document.getElementById('transport').value = data.transportDefault;
        if (data.foodDefault) document.getElementById('foodPref').value = data.foodDefault;
    }
});
                // User IS logged in. Let them use the app!
                currentUser = user;
                console.log("Authenticated as:", currentUser.email);
                
                // Initialize all the UI features now that we know they are safe
                initializeEntranceAnimations();
                initializeThemeToggle();
                initializeFloatingLabels();
                initializeVibeChips();
                initializeDropdowns();
                initializeRippleEffects();
                initializeSmoothScrolling();
                initializeFormValidation();
            } else {
                // User is NOT logged in. Kick them to the login page!
                console.log("Unauthorized access. Redirecting to login...");
                window.location.href = "login.html"; 
            }
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
    
    // Dynamic URL: Switches automatically between local testing and live site
 const API_BASE_URL = 'https://safenav-18sk.onrender.com'; // Your actual live URL!
    try {
        // 🔒 SECURE CALL: We ask our OWN backend for the image.
        // No API keys are visible in the browser anymore!
        const response = await fetch(`${API_BASE_URL}/api/get-image?query=${encodeURIComponent(place + " " + destination)}`);
        const data = await response.json();
        
        if (data.url) {
            // Track used images so we don't repeat them
            if (!usedImagesTracker.has(data.url)) {
                usedImagesTracker.add(data.url);
                return data.url;
            }
        }
    } catch (error) {
        console.log("Secure Image Fetch failed, using local fallback system.");
    }
    
    // --- 🛡️ FALLBACK SYSTEM (Same as before) ---
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
// 🧠 MAIN ITINERARY GENERATION (GEMINI AI API)
// ==========================================
// ==========================================
// 🧠 PREMIUM ITINERARY GENERATION (GEMINI AI)
// ==========================================

async function generateItinerary() {
    // 1. Get Basic UI Inputs
    const origin = document.getElementById('origin').value.trim() || "Not specified";
    const destination = document.getElementById('destination').value.trim();
    const startDate = document.getElementById('startDate').value;
    const days = document.getElementById('days').value;
    
    // UI State Management
    document.getElementById('defaultState').style.display = 'none';
    document.getElementById('contentState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'flex';
    
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.style.transform = 'scale(0.95)';
    generateBtn.disabled = true;

    try {
        // 2. Fetch Elite Profile Data from Firestore (The Intelligence Layer)
        // 👉 CRITICAL ADDITION: Pulls the profile you just used on the Prediction page!
        const savedHealthProfile = localStorage.getItem('ai_user_profile') || "Standard / No Conditions";

        let userProfile = {
            safetyMode: "Normal",
            healthProfile: savedHealthProfile, // Starts with your active profile
            tripStyle: document.getElementById('vibe')?.value || "Adventure",
            budget: document.getElementById('budget')?.value || "Moderate",
            companions: document.getElementById('companions')?.value || "Solo",
            transport: document.getElementById('transport')?.value || "Public Transit",
            food: document.getElementById('foodPref')?.value || "Any",
            country: "Not specified"
        };

        if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
            const uid = firebase.auth().currentUser.uid;
            const doc = await firebase.firestore().collection('users').doc(uid).get();
            if (doc.exists) {
                const data = doc.data();
                // Override UI defaults with Elite Profile data if it exists
                if(data.safetyMode) userProfile.safetyMode = data.safetyMode;
                
                // 👉 FIX: Removed the buggy 'autoApplyHealth' check
                if(data.healthProfile) userProfile.healthProfile = data.healthProfile;
                
                if(data.country) userProfile.country = data.country;
                if(data.tripStyle) userProfile.tripStyle = data.tripStyle;
                if(data.budgetDefault) userProfile.budget = data.budgetDefault;
                if(data.travelGroup) userProfile.companions = data.travelGroup;
                if(data.transportDefault) userProfile.transport = data.transportDefault;
                if(data.foodDefault) userProfile.food = data.foodDefault;
            }
        }

        // 👉 FIX: Cleaned up the AI Caller (Removed duplicate URL)
        async function callSafenavAI(finalPrompt) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/planner/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: finalPrompt })
                });
                
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const data = await response.json();
                return data.result; // The JSON string from Gemini
            } catch (error) {
                console.error("Security Layer Error:", error);
                return null;
            }
        }
        // 🚀 The Master Prompt (Now Powered by the Elite Profile)
        const promptText = `
            You are a high-end, expert travel planner and safety analyst API. 
            Create a ${days}-day itinerary to ${destination} starting on ${startDate}.
            Origin City: ${origin}.
            
            USER INTELLIGENCE PROFILE:
            - Home Country: ${userProfile.country} (Provide contextual advice based on this)
            - Companions: ${userProfile.companions}
            - Budget Level: ${userProfile.budget}
            - Trip Style: ${userProfile.tripStyle}
            - Transport Preference: ${userProfile.transport}
            - Dietary Needs: ${userProfile.food}
            
            CRITICAL SAFETY ENGINE PARAMETERS:
            - Safety Alert Level: ${userProfile.safetyMode} (Adjust activity risk thresholds accordingly. If Maximum, avoid any moderate/high risk areas).
            - User Health Conditions: ${userProfile.healthProfile} (Crucial: You MUST tailor the physical strain, altitude, and weather recommendations to accommodate this health condition).

            INSTRUCTIONS:
            - Calculate realistic transit logistics from the Origin to the Destination. If Origin is "Not specified", leave transit empty but provide the rest.
            - Suggest an exact departure date/time based on the start date so they arrive on time.
            - Provide a realistic cost breakdown in INR.
            - Provide a Risk/Safety score for EACH day ('Low', 'Moderate', 'High') and a specific reason factoring in the user's Health Profile and Safety Level.
            
            You MUST return ONLY a valid JSON object. Do not include markdown.
            Use this EXACT structure:
            {
                "trip_overview": {
                    "destination": "${destination}",
                    "why_this_plan": "Short paragraph explaining why this fits their specific trip style, health condition, and safety mode.",
                    "cost_breakdown": {
                        "stay": 0,
                        "food": 0,
                        "activities": 0,
                        "transport": 0,
                        "total": 0
                    },
                    "transit_logistics": {
                        "has_transit": true,
                        "route_advice": "e.g., Flight from Mangalore to Delhi, then Volvo bus to Manali.",
                        "departure_recommendation": "e.g., Leave on [Date] at [Time] to reach by Day 1 morning.",
                        "estimated_transit_cost": 0
                    }
                },
                "itinerary": [
                    {
                        "day": 1,
                        "theme": "String",
                        "risk_level": "String (Strictly 'Low', 'Moderate', or 'High')",
                        "risk_reason": "String (Short reason accounting for their health/safety profile)",
                        "activities": [
                            {
                                "time": "String",
                                "place": "String",
                                "type": "String (Strictly 'activity', 'food', or 'stay')",
                                "estimated_cost_inr": 0
                            }
                        ]
                    }
                ]
            }
        `;
    // ✅ Keep this: This calls YOUR backend safely.
const aiResponseRaw = await callSafenavAI(promptText);

if (!aiResponseRaw) throw new Error("AI engine failed to respond. Check backend connection.");

// ✅ Keep this: Your backend returns a string, so we parse it here.
const tripData = JSON.parse(aiResponseRaw);

        // ==========================================
        // 🎨 BUILD THE PREMIUM UI
        // ==========================================
        let htmlContent = `
            <div style="background: var(--input-bg); padding: 20px; border-radius: 12px; border-left: 4px solid var(--primary); margin-bottom: 25px;">
                <h4 style="color: var(--primary); margin-bottom: 8px;"><i class="fas fa-robot"></i> AI Trip Analysis</h4>
                <p style="font-size: 0.95rem; color: var(--text-muted); line-height: 1.6;">${tripData.trip_overview.why_this_plan}</p>
            </div>
        `;

        // 2. Transit Logistics (Only show if an origin was provided)
        if (tripData.trip_overview.transit_logistics.has_transit) {
            htmlContent += `
            <div style="background: linear-gradient(135deg, rgba(37,99,235,0.1), rgba(14,165,233,0.1)); padding: 20px; border-radius: 12px; margin-bottom: 25px; border: 1px solid rgba(37,99,235,0.2);">
                <h4 style="color: var(--primary-dark); margin-bottom: 12px;"><i class="fas fa-plane-departure"></i> Journey Logistics</h4>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Recommended Route</div>
                        <div style="font-weight: 600; color: var(--text-main);">${tripData.trip_overview.transit_logistics.route_advice}</div>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">When to Leave</div>
                        <div style="font-weight: 600; color: var(--warning);"><i class="fas fa-clock"></i> ${tripData.trip_overview.transit_logistics.departure_recommendation}</div>
                    </div>
                </div>
            </div>`;
        }

        // 3. Cost Breakdown Grid
        htmlContent += `
            <div class="budget-overview-card">
                <div style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 15px; margin-bottom: 15px;">
                        <div style="font-size:0.9rem; color:var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Total Estimated Budget</div>
                        <div style="font-size:2.2rem; font-weight:800; color:var(--accent);">₹${tripData.trip_overview.cost_breakdown.total.toLocaleString('en-IN')}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;">
                        <div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-bed"></i> Stay</div>
                            <div style="font-weight: 700; color: var(--text-main);">₹${tripData.trip_overview.cost_breakdown.stay.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-utensils"></i> Food</div>
                            <div style="font-weight: 700; color: var(--text-main);">₹${tripData.trip_overview.cost_breakdown.food.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-hiking"></i> Activities</div>
                            <div style="font-weight: 700; color: var(--text-main);">₹${tripData.trip_overview.cost_breakdown.activities.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-car"></i> Local Transit</div>
                            <div style="font-weight: 700; color: var(--text-main);">₹${tripData.trip_overview.cost_breakdown.transport.toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 4. Loop the Days
        for (let i = 0; i < tripData.itinerary.length; i++) {
            const day = tripData.itinerary[i];
            
            // Render the SafeNav Risk Badge based on the AI's risk level
            let riskColor = '#10b981'; // Green
            let riskIcon = 'fa-check-circle';
            if(day.risk_level === 'Moderate') { riskColor = '#f59e0b'; riskIcon = 'fa-exclamation-triangle'; }
            if(day.risk_level === 'High') { riskColor = '#ef4444'; riskIcon = 'fa-shield-alt'; }

            htmlContent += `
                <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px; border-bottom: 2px solid var(--glass-border); padding-bottom: 10px; margin: 40px 0 20px 0;">
                    <h3 style="color: var(--primary); margin: 0; font-weight: 800; font-size: 1.5rem;"><i class="fas fa-calendar-day"></i> Day ${day.day}: ${day.theme}</h3>
                    <div style="background: ${riskColor}15; color: ${riskColor}; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; border: 1px solid ${riskColor}40;">
                        <i class="fas ${riskIcon}"></i> ${day.risk_level} Risk: <span style="font-weight: 500;">${day.risk_reason}</span>
                    </div>
                </div>
            `;
            
           // Loop the Activities
            for (let j = 0; j < day.activities.length; j++) {
                const act = day.activities[j];
                let icon = 'fas fa-map-marker-alt';
                let color = 'var(--primary)';
                let buttonHtml = '';

                const exactSearchQuery = encodeURIComponent(act.place + " " + tripData.trip_overview.destination);

                if(act.type === 'stay') {
                    icon = 'fas fa-bed'; color = 'var(--accent)'; 
                    buttonHtml = `<a href="https://www.booking.com/searchresults.html?ss=${exactSearchQuery}&aid=2779272" target="_blank" class="btn-affiliate-book"><i class="fas fa-hotel"></i> Book on Booking.com</a>`;
                } else if (act.type === 'food') {
                    icon = 'fas fa-utensils'; color = '#f59e0b'; 
                    buttonHtml = `<a href="route.html?dest=${exactSearchQuery}" target="_blank" class="btn-navigate"><i class="fas fa-map-marked-alt"></i> View on Map</a>`;
                } else {
                    buttonHtml = `<a href="route.html?dest=${exactSearchQuery}" target="_blank" class="btn-navigate"><i class="fas fa-car"></i> Navigate Here</a>`;
                }

                // FETCH THE IMAGE
                const imageUrl = await fetchImage(act.place, tripData.trip_overview.destination, act.type);
                const imageHtml = `<img src="${imageUrl}" class="activity-image" alt="${act.place}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 12px;">`;

                // THE HTML WITH THE NEW SWAP BUTTON INJECTED
                htmlContent += `
                <div class="timeline-item" style="display: flex; gap: 15px; margin-bottom: 20px; position: relative;">
                    <div class="time-badge" style="background: var(--card-bg); border: 2px solid ${color}; color: ${color}; width: 75px; height: 75px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; flex-shrink: 0; box-shadow: var(--shadow-sm); z-index: 1;">
                        ${act.time.split(' ')[0]} <span style="font-size:0.6rem;">${act.time.split(' ')[1] || ''}</span>
                    </div>
                    <div class="activity-card" style="background: var(--card-bg); border: 1px solid var(--glass-border); border-left: 5px solid ${color}; border-radius: 16px; padding: 15px; flex: 1; display: flex; gap: 15px; box-shadow: var(--shadow-sm);">
                        ${imageHtml}
                        <div class="activity-content" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <div>
                                    <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);"><i class="${icon}" style="color:${color}; margin-right:8px;"></i>${act.place}</h4>
                                    <p style="color:var(--text-muted); font-size:0.85rem; margin-top:5px; text-transform: capitalize;">${act.type}</p>
                                </div>
                                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                                    <p class="cost" style="color: ${color}; font-weight: 700; margin: 0;">₹${act.estimated_cost_inr.toLocaleString('en-IN')}</p>
                                    <button onclick="swapActivity(this, '${act.place.replace(/'/g, "\\'")}', '${tripData.trip_overview.destination.replace(/'/g, "\\'")}', '${act.type}', '${act.time}', '${color}', '${icon}')" class="swap-btn" style="background: var(--bg-main); border: 1px solid var(--glass-border); padding: 4px 10px; border-radius: 8px; color: var(--text-muted); cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: 0.2s;">
                                        <i class="fas fa-sync-alt"></i> Swap
                                    </button>
                                </div>
                            </div>
                            <div>${buttonHtml}</div>
                        </div>
                    </div>
                </div>`;
            }
        }
        
        // ==========================================
        // 🎯 INJECT PREMIUM ACTION BUTTONS AT THE BOTTOM
        // ==========================================
        htmlContent += `
            <div class="itinerary-actions" style="display: flex; gap: 15px; margin-top: 40px; padding-top: 20px; border-top: 1px dashed var(--glass-border);">
                <button id="saveTripBtn" class="generate-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; background: #10b981;">
                    <i class="fas fa-cloud-upload-alt"></i> Save to Dashboard
                </button>
                <button id="printTripBtn" class="action-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; background: var(--card-bg); border: 1px solid var(--glass-border); color: var(--text-main);">
                    <i class="fas fa-file-pdf"></i> Save as PDF
                </button>
            </div>
        `;

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentState').style.display = 'block';
        
        const itineraryElement = document.getElementById('itineraryText');
        itineraryElement.innerHTML = htmlContent; 
        
        itineraryElement.style.opacity = 0;
        itineraryElement.style.animation = "fadeUp 0.6s ease-out forwards";
        
        document.querySelector('.output-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });

        // ==========================================
        // ☁️ ATTACH CLOUD SAVE EVENT LISTENER
        // ==========================================
        const saveBtn = document.getElementById('saveTripBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async function() {
                if (!currentUser) {
                    alert("Please log in to save trips!");
                    return;
                }

                const originalText = this.innerHTML;
                this.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving to Cloud...`;
                this.disabled = true;

                const db = firebase.firestore();
                const tripDataToSave = {
                    destination: document.getElementById('destination').value.trim(),
                    budget: document.getElementById('budget').value,
                    vibe: document.getElementById('vibe').value,
                    plan: document.getElementById('itineraryText').innerHTML, // Saves the generated HTML
                    date: new Date().toLocaleDateString(),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };

                try {
                    await db.collection('users').doc(currentUser.uid).collection('trips').add(tripDataToSave);
                    this.innerHTML = `<i class="fas fa-check"></i> Saved Successfully!`;
                    this.style.background = '#059669'; // Darker green
                } catch (error) {
                    console.error("Cloud Save Error:", error);
                    alert("Failed to save. Check your connection.");
                    this.innerHTML = originalText;
                    this.disabled = false;
                }
            });
        }

        // ==========================================
        // 🖨️ ATTACH PDF / PRINT EVENT LISTENER
        // ==========================================
        const printBtn = document.getElementById('printTripBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print(); // Triggers the browser's native PDF/Print dialog
            });
        }

    } catch (error) {
        console.error("Error:", error);
        showError("Server Error: " + error.message);
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('defaultState').style.display = 'flex';
    } finally {
        generateBtn.style.transform = '';
        generateBtn.disabled = false;
    }
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
    
    showSuccess('Trip saved to your profile!');
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

const style = document.createElement('style');
style.textContent = `@keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }`;
document.head.appendChild(style);
// ==========================================
// ☁️ CLOUD DATABASE: SAVE TRIP TO FIRESTORE
// ==========================================

async function saveTripToCloud() {
    // Make sure we have a logged-in user (currentUser is defined at the top of planner.js)
    if (!currentUser) {
        alert("You must be logged in to save trips!");
        return;
    }

    const saveBtn = document.getElementById('saveTripBtn'); // Assuming this is your save button ID
    const originalText = saveBtn.innerHTML;
    
    // UI Feedback
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving to Cloud...`;
    saveBtn.disabled = true;

    // Grab the trip data from the UI
    const destination = document.getElementById('destination').value.trim();
    const budget = document.getElementById('budget').value;
    const vibe = document.getElementById('vibe').value;
    const planHTML = document.getElementById('itineraryText').innerHTML; // The AI generated output

    const db = firebase.firestore();
    
    // Create the data package
    const tripData = {
        destination: destination,
        budget: budget,
        vibe: vibe,
        plan: planHTML,
        date: new Date().toLocaleDateString(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp() // Cloud timestamp
    };

    try {
        // Save to: users -> [User's ID] -> trips -> [Auto-Generated Trip ID]
        await db.collection('users').doc(currentUser.uid).collection('trips').add(tripData);
        
        // Success UI
        saveBtn.innerHTML = `<i class="fas fa-check"></i> Saved to Dashboard!`;
        saveBtn.style.background = '#10b981'; // Turn green
        saveBtn.style.color = 'white';
        
    } catch (error) {
        console.error("Error saving trip to cloud:", error);
        alert("Failed to save trip. Check your connection.");
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Attach this function to your Save Button 
// (Make sure your save button in planner.html has id="saveTripBtn")
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveTripBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTripToCloud);
    }
});
// ==========================================
// 🔄 PREMIUM FEATURE: SWAP ACTIVITY
// ==========================================

window.swapActivity = async function(btnElement, oldPlace, destination, type, time, color, icon) {
    // 1. Find the parent card and show a loading spinner
    const cardElement = btnElement.closest('.activity-card');
    const originalHTML = cardElement.innerHTML; 
    
    cardElement.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: ${color}; margin-bottom: 10px;"></i>
            <p style="color: var(--text-muted); font-size: 0.9rem; font-weight: 600;">Finding an alternative for ${oldPlace}...</p>
        </div>
    `;

    try {
        // 🚀 SECURE PROMPT CONSTRUCTION
        const promptText = `
            You are an expert travel planner. The user did not like the activity "${oldPlace}" in "${destination}" scheduled for "${time}". 
            Suggest exactly ONE highly-rated alternative activity of type "${type}" in "${destination}".
            
            Return ONLY a valid JSON object matching this exact structure:
            {
                "place": "Name of the new place",
                "estimated_cost_inr": 1500
            }
        `;

        // 🛡️ CALL SECURE BACKEND PROXY (Hides your API Key)
        const aiResponseRaw = await callSafenavAI(promptText);
        
        if (!aiResponseRaw) throw new Error("AI failed to find alternative.");

        const newAct = JSON.parse(aiResponseRaw);

        // 2. Fetch a new image via our secure proxy
        const newImgUrl = await fetchImage(newAct.place, destination, type);
        const exactSearchQuery = encodeURIComponent(newAct.place + " " + destination);

        // 3. Rebuild the Buttons
        let buttonHtml = '';
        if(type === 'stay') {
            buttonHtml = `<a href="https://www.booking.com/searchresults.html?ss=${exactSearchQuery}&aid=2779272" target="_blank" class="btn-affiliate-book"><i class="fas fa-hotel"></i> Book on Booking.com</a>`;
        } else if (type === 'food') {
            buttonHtml = `<a href="route.html?dest=${exactSearchQuery}" target="_blank" class="btn-navigate"><i class="fas fa-map-marked-alt"></i> View on Map</a>`;
        } else {
            buttonHtml = `<a href="route.html?dest=${exactSearchQuery}" target="_blank" class="btn-navigate"><i class="fas fa-car"></i> Navigate Here</a>`;
        }

        // 4. Inject the new HTML back into the card
        cardElement.innerHTML = `
            <img src="${newImgUrl}" class="activity-image" alt="${newAct.place}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 12px;">
            <div class="activity-content" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);"><i class="${icon}" style="color:${color}; margin-right:8px;"></i>${newAct.place}</h4>
                        <p style="color:var(--text-muted); font-size:0.85rem; margin-top:5px; text-transform: capitalize;">${type} <span style="color: #10b981; font-weight: 700; margin-left: 5px;">(Updated ✨)</span></p>
                    </div>
                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        <p class="cost" style="color: ${color}; font-weight: 700; margin: 0;">₹${newAct.estimated_cost_inr.toLocaleString('en-IN')}</p>
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