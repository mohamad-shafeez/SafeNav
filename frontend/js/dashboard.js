// ==========================================
// NEW DASHBOARD.JS - TravelDiscover Ecosystem
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Module 1: AI Trips
    loadSavedTrips();
    
    // 2. Initialize Module 2: Map Routes
    loadSavedRoutes(); 
    
    // 3. 📍 TRIGGER LIVE GPS TRACKING
    initLiveLocation();

    // 4. Wire up the Logout Buttons
    const logoutBtnMain = document.getElementById('logoutBtn');
    const logoutBtnDrawer = document.getElementById('logoutBtnDrawer');
    if(logoutBtnMain) logoutBtnMain.addEventListener('click', logoutUser);
    if(logoutBtnDrawer) logoutBtnDrawer.addEventListener('click', logoutUser);
    
    // 5. Firebase Auth Check
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(user => {
            if (!user) {
                console.log("User not logged in. Redirecting to login...");
                window.location.href = "login.html"; // 👈 Un-commented to enforce security!
            } else {
                console.log("User authenticated:", user.email);
            }
        });
    }
    
  // 6. Listen for Modal Clicks
    window.onclick = function(event) {
        const modal = document.getElementById('tripModal');
        if (event.target == modal) {
            closeModal();
        }
    }

  // 👉 7. WIRE UP THE PROFILE DRAWER (With Anti-Reload Fix)
    const profileAvatar = document.getElementById('navAvatar'); 
    if (profileAvatar) {
        profileAvatar.addEventListener('click', function(event) {
            event.preventDefault(); 
            toggleProfileDrawer();
        });
        profileAvatar.style.cursor = 'pointer'; 
    }

});

// ==========================================
// MODULE 1: CLOUD SAVED AI ITINERARIES
// ==========================================

// Global array to temporarily hold the loaded cloud trips for the modal viewer
window.currentCloudTrips = [];

window.loadSavedTrips = async function() {
    const container = document.getElementById('savedTripsContainer');
    const noTripsMsg = document.getElementById('noTripsMessage');
    
    if (!container || !noTripsMsg) return;

    // Wait slightly to ensure Firebase Auth has verified the user
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return; // Not logged in
        
        // Load the Elite Profile Data automatically!
        loadUserProfile(user);
        
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Syncing from cloud...</div>';
        
        const db = firebase.firestore();
        
        try {
            // Fetch trips from Firestore, ordered by newest first
            const snapshot = await db.collection('users').doc(user.uid).collection('trips').orderBy('timestamp', 'desc').get();
            
            container.innerHTML = '';
            window.currentCloudTrips = []; // Clear array

            if (snapshot.empty) {
                container.style.display = 'none';
                noTripsMsg.style.display = 'block';
                return;
            }

            container.style.display = 'grid';
            noTripsMsg.style.display = 'none';

            // Loop through cloud documents and build cards
            snapshot.forEach(doc => {
                const trip = doc.data();
                trip.id = doc.id; // The unique Firebase document ID
                window.currentCloudTrips.push(trip); // Save to local array for the modal

                const card = document.createElement('div');
                card.className = 'trip-card';
                
                card.innerHTML = `
                    <div class="trip-card-header">
                        <div>
                            <h4 class="trip-destination">${trip.destination}</h4>
                            <div class="trip-date"><i class="fas fa-calendar-alt"></i> Saved: ${trip.date}</div>
                        </div>
                        <div class="trip-badge">${trip.vibe.split(' ')[0]}</div>
                    </div>
                    
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px;">
                        <div><i class="fas fa-wallet" style="width: 20px;"></i> ${trip.budget}</div>
                    </div>

                    <div class="trip-actions">
                       <button class="btn-view" onclick="event.stopPropagation(); viewTrip('${trip.id}')">
    <i class="fas fa-eye"></i> View Itinerary
</button>
                        <button class="btn-delete" onclick="deleteTrip('${trip.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                container.appendChild(card);
            });

        } catch (error) {
            console.error("Cloud Sync Error:", error);
            container.innerHTML = '<div style="color: var(--danger); grid-column: 1/-1;">Error loading trips from cloud. Please refresh.</div>';
        }
    });
}

// Open the beautiful dark modal to read the trip from the Cloud
window.viewTrip = function(tripId) {
    // 1. Find the trip in our temporary cloud array
    const trip = window.currentCloudTrips.find(t => t.id === tripId);
    
    if(trip) {
        console.log("Opening Trip:", trip.destination); 
        const modal = document.getElementById('tripModal');
        const modalContent = document.getElementById('modalContent');
        
        if (modal && modalContent) {
            modalContent.innerHTML = `
                <h2 style="color: var(--primary-blue); margin-bottom: 20px; font-size: 2rem;">Journey to ${trip.destination}</h2>
                <div class="itinerary-content-wrapper">
                    ${trip.plan}
                </div>
            `;
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; 
        }
    } else {
        console.warn("Trip not found in local memory. ID:", tripId);
    }
}

// Delete a trip from the Cloud
window.deleteTrip = async function(tripId) {
    if(confirm("Are you sure you want to delete this trip permanently from the cloud?")) {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const db = firebase.firestore();
        
        try {
            // Delete the exact document from Firestore
            await db.collection('users').doc(user.uid).collection('trips').doc(tripId).delete();
            
            // Reload the UI instantly to reflect the deletion
            loadSavedTrips(); 
        } catch (error) {
            console.error("Error deleting trip:", error);
            alert("Could not delete trip. Try again.");
        }
    }
}

// Close the modal
window.closeModal = function() {
    const modal = document.getElementById('tripModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore background scrolling
    }
}

// ==========================================
// MODULE 2: SAFENAV MAP ROUTES
// ==========================================

window.loadSavedRoutes = function() {
    const container = document.getElementById('savedRoutesContainer');
    const noRoutesMsg = document.getElementById('noRoutesMessage');
    
    if (!container || !noRoutesMsg) return;

    // Fetch routes from browser memory (Saved by your route map)
    const savedRoutes = JSON.parse(localStorage.getItem('routes')) || [];

    container.innerHTML = ''; // Clear container

    if (savedRoutes.length === 0) {
        container.style.display = 'none';
        noRoutesMsg.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    noRoutesMsg.style.display = 'none';

    // Copy and reverse the array so newest routes show up first
    [...savedRoutes].reverse().forEach((route, index) => {
        
        // Dynamically style the risk badge based on the AI's risk level
        let riskColor = '#10b981'; // Green for Low
        let riskText = route.risk || 'Low Risk';
        if (riskText.toLowerCase().includes('medium')) riskColor = '#f59e0b'; // Orange
        if (riskText.toLowerCase().includes('high')) riskColor = '#ef4444';   // Red

        const card = document.createElement('div');
        card.className = 'trip-card';
        card.style.borderLeft = `4px solid ${riskColor}`; // Colored edge based on risk!
        
        card.innerHTML = `
            <div class="trip-card-header" style="display: block; margin-bottom: 10px;">
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
                    <i class="fas fa-map-marker-alt" style="color: var(--primary); width: 15px;"></i> ${route.from || 'Current Location'}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 600;">
                    <i class="fas fa-flag-checkered" style="color: var(--accent); width: 15px;"></i> ${route.to}
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-main); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                <div style="text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Distance</div>
                    <div style="font-weight: 700; color: var(--text-main);">${route.distance || '-- km'}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Est. Time</div>
                    <div style="font-weight: 700; color: var(--text-main);">${route.duration || '-- min'}</div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--glass-border); padding-top: 15px;">
                <div style="background: ${riskColor}15; color: ${riskColor}; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">
                    <i class="fas fa-shield-alt"></i> ${riskText}
                </div>
                <button class="btn-delete" onclick="deleteRoute(${index})" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fas fa-trash"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Delete a route from memory
window.deleteRoute = function(reversedIndex) {
    if(confirm("Are you sure you want to delete this route?")) {
        let savedRoutes = JSON.parse(localStorage.getItem('routes')) || [];
        
        // Calculate the actual index in the original un-reversed array
        const actualIndex = savedRoutes.length - 1 - reversedIndex;
        
        savedRoutes.splice(actualIndex, 1);
        localStorage.setItem('routes', JSON.stringify(savedRoutes));
        
        // Reload UI
        loadSavedRoutes(); 
    }
}

// ==========================================
// 🚖 ONE-TAP SAFETY RIDE ENGINE
// ==========================================
window.bookSafeRide = function(platform) {
    const statusText = document.getElementById('gpsStatus');
    statusText.style.display = 'block';
    statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting exact coordinates...';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                statusText.style.display = 'none';

                let url = "";
                if (platform === 'uber') {
                    // Universal link for Uber
                    url = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${lat}&pickup[longitude]=${lng}`;
                } else if (platform === 'rapido') {
                    // Deep link for Rapido
                    url = `rapido://pickup?lat=${lat}&lng=${lng}`;
                }
                
                // Open the app on their phone
                window.open(url, '_blank');
            },
            (error) => {
                console.error("GPS Error:", error);
                statusText.innerHTML = '<span style="color: #ef4444;">Please enable location permissions.</span>';
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    } else {
        statusText.innerHTML = "Geolocation is not supported by this browser.";
    }
}

// ==========================================
// 👤 ELITE PROFILE & SETTINGS ENGINE
// ==========================================
window.loadUserProfile = async function(user) {
    if (!user) return;
    
    document.getElementById('profEmail').value = user.email;
    document.getElementById('navAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=2563eb&color=fff`;

    const db = firebase.firestore();
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const data = doc.data();
            
            // 1. Identity
            if(data.name) document.getElementById('profName').value = data.name;
            if(data.country) document.getElementById('profCountry').value = data.country;
            if(data.currency) document.getElementById('profCurrency').value = data.currency;
            
            // 2. Safety Engine & Settings Drawer
            if(data.safetyMode) document.getElementById('profSafetyMode').value = data.safetyMode;
            if(data.healthProfile) document.getElementById('profHealth').value = data.healthProfile;
            
            // 👉 NEW: Load Radar Settings
            if(data.radarAlertType) document.getElementById('profRadarType').value = data.radarAlertType;
            if(data.radarThreshold) document.getElementById('profRadarDistance').value = data.radarThreshold;
            
            // 👉 SMART SYNC 1: Predict Page Dropdown
            const predictDropdown = document.getElementById('userProfile'); 
            if (predictDropdown && data.healthProfile) {
                Array.from(predictDropdown.options).forEach(opt => {
                    if (opt.value.toLowerCase() === data.healthProfile.toLowerCase() || 
                        opt.text.toLowerCase() === data.healthProfile.toLowerCase()) {
                        predictDropdown.value = opt.value; 
                        predictDropdown.dispatchEvent(new Event('change')); 
                    }
                });
            }

            // 👉 SMART SYNC 2: Planner Page Dropdown 
            // ⚠️ Pro Tip: Make sure this ID is 'plannerHealthProfile' if you used that in your HTML earlier!
            const plannerDropdown = document.getElementById('plannerHealthProfile'); 
            if (plannerDropdown && data.healthProfile) {
                Array.from(plannerDropdown.options).forEach(opt => {
                    if (opt.value.toLowerCase() === data.healthProfile.toLowerCase() || 
                        opt.text.toLowerCase() === data.healthProfile.toLowerCase()) {
                        plannerDropdown.value = opt.value; 
                    }
                });
            }
            
            if(data.autoApplyHealth !== undefined) document.getElementById('profAutoApplyHealth').checked = data.autoApplyHealth;
            
            // 3. Travel Defaults
            if(data.tripStyle) document.getElementById('profStyle').value = data.tripStyle;
            if(data.budgetDefault) document.getElementById('profBudget').value = data.budgetDefault;
            if(data.travelGroup) document.getElementById('profGroup').value = data.travelGroup;
            if(data.transportDefault) document.getElementById('profTransport').value = data.transportDefault;
            if(data.foodDefault) document.getElementById('profFood').value = data.foodDefault;
            
            // 4. Emergency
            if(data.emergency) {
                if(data.emergency.name) document.getElementById('profIceName').value = data.emergency.name;
                if(data.emergency.phone) document.getElementById('profIcePhone').value = data.emergency.phone;
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
};

window.saveUserProfile = async function() {
    const user = firebase.auth().currentUser;
    if (!user) return alert("You must be logged in to save settings.");

    // FIX 1: Look for the new 'btn-primary' class instead of the old 'generate-btn'
    const saveBtn = document.querySelector('.profile-drawer .btn-primary');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    saveBtn.disabled = true;

    const profileData = {
        name: document.getElementById('profName').value.trim(),
        country: document.getElementById('profCountry').value.trim(),
        currency: document.getElementById('profCurrency').value,
        
        // 🛡️ Safety Engine Settings
        safetyMode: document.getElementById('profSafetyMode').value,
        healthProfile: document.getElementById('profHealth').value,
        autoApplyHealth: document.getElementById('profAutoApplyHealth').checked,
        
        // 👉 NEW: Save Radar Settings right here!
        radarAlertType: document.getElementById('profRadarType').value,
        radarThreshold: parseFloat(document.getElementById('profRadarDistance').value) || 5,
        
        // 🧳 Trip Defaults
        tripStyle: document.getElementById('profStyle').value,
        budgetDefault: document.getElementById('profBudget').value,
        travelGroup: document.getElementById('profGroup').value,
        transportDefault: document.getElementById('profTransport').value,
        foodDefault: document.getElementById('profFood').value,
        
        emergency: {
            name: document.getElementById('profIceName').value.trim(),
            phone: document.getElementById('profIcePhone').value.trim()
        },
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    const db = firebase.firestore();
    try {
        await db.collection('users').doc(user.uid).set(profileData, { merge: true });
        
        if (profileData.name) {
            await user.updateProfile({ displayName: profileData.name });
            // Update the top right avatar image immediately
            document.getElementById('navAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name)}&background=2563eb&color=fff`;
        }

        saveBtn.innerHTML = `<i class="fas fa-check"></i> Intelligence Updated`;
        saveBtn.style.background = '#10b981'; // Turn green for success
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            // FIX 2: Reset to our new blue variable
            saveBtn.style.background = 'var(--primary-blue)';
            saveBtn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save profile. Please check your connection.");
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        saveBtn.style.background = 'var(--primary-blue)';
    }
};
// ==========================================
// 📍 LIVE GPS & REVERSE GEOCODING ENGINE
// ==========================================

window.initLiveLocation = function() {
    const addressText = document.getElementById('currentAddress');
    const gpsBadge = document.getElementById('gpsBadge');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Update badge to Green
                gpsBadge.innerHTML = '<i class="fas fa-check-circle"></i> GPS Active';
                gpsBadge.style.background = '#10b98120';
                gpsBadge.style.color = '#10b981';

try {
    // Swapped to BigDataCloud API which allows local browser testing without CORS blocks!
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    const data = await response.json();
    
    // BigDataCloud formats their data slightly differently
    if (data && (data.city || data.locality)) {
        const locationName = data.locality || data.city || data.principalSubdivision;
        addressText.innerHTML = `<i class="fas fa-map-marker-alt" style="color: var(--danger-red); margin-right: 5px;"></i> <strong>You are near:</strong><br>${locationName}, ${data.countryName}`;
    } else {
        addressText.innerHTML = "Coordinates secured, but street name unavailable.";
    }
} catch (error) {
    console.error("Geocoding Error:", error);
    addressText.innerHTML = `Location locked at Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
}
            },
            (error) => {
                console.warn("GPS Permission Denied or Failed:", error);
                gpsBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> GPS Off';
                gpsBadge.style.background = '#ef444420';
                gpsBadge.style.color = '#ef4444';
                addressText.innerHTML = "Please enable location permissions in your browser to use the Safe Exit feature.";
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        addressText.innerHTML = "Geolocation is not supported by this browser.";
    }
};

// ==========================================
// 🔐 SECURE LOGOUT ENGINE
// ==========================================

window.logoutUser = function() {
    if(confirm("Are you sure you want to log out of SafeNav?")) {
        firebase.auth().signOut().then(() => {
            // Successfully signed out
            window.location.href = "login.html";
        }).catch((error) => {
            console.error("Logout Error:", error);
            alert("An error occurred while logging out. Please try again.");
        });
    }
};
// ==========================================
// 👤 TOGGLE PROFILE DRAWER
// ==========================================
window.toggleProfileDrawer = function(event) {
    if (event) {
        event.preventDefault(); 
    }
    
    const drawer = document.getElementById('profileDrawer'); 
    if (drawer) {
        drawer.classList.toggle('open');
    } else {
        console.warn("Profile drawer element not found in HTML");
    }
};
