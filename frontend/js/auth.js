// ==========================================
// auth.js - SafeNav Premium Authentication Engine
// Optimized: deduped, no redundant listeners, fast routing
// ==========================================

document.addEventListener("DOMContentLoaded", () => {


    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.error("Firebase not loaded! Check your script tags.");
        return;
    }

    const auth = firebase.auth();
    const db   = firebase.firestore();

    const ADMIN_EMAILS = [
        "shafeezchappi18@gmail.com",
        "admin@safenav.com"
    ];

    const authMessage = document.getElementById('authMessage');
    const loginForm   = document.getElementById('loginForm');
    const signupForm  = document.getElementById('signupForm');
    const loader      = document.getElementById('authLoader');

    // ════════════════════════════════════════════════
    // UTIL: Translate Firebase errors
    // ════════════════════════════════════════════════
    function translateError(error) {
        const map = {
            'auth/user-not-found':         "We couldn't find an account with this email.",
            'auth/wrong-password':         "Incorrect password. Please try again.",
            'auth/email-already-in-use':   "This email is already registered. Try signing in!",
            'auth/weak-password':          "Password too weak. Use at least 6 characters.",
            'auth/invalid-email':          "Please enter a valid email address.",
            'auth/network-request-failed': "Network error. Check your internet connection.",
            'auth/too-many-requests':      "Too many attempts. Please try again later.",
            'auth/invalid-credential':     "Invalid email or password. Please try again.",
        };
        return map[error.code] || ("Something went wrong: " + error.message);
    }

    function showMessage(msg, isError = true) {
        if (!authMessage) return;
        authMessage.style.display         = 'block';
        authMessage.style.color           = isError ? '#ef4444' : '#34d399';
        authMessage.style.backgroundColor = isError ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)';
        authMessage.innerText = msg;
    }

    // ════════════════════════════════════════════════
    // Floating label autofill fix
    // ════════════════════════════════════════════════
    function fixFloatingLabels() {
        document.querySelectorAll('.floating-input').forEach(input => {
            if (input.value.trim() !== '') {
                const lbl = input.nextElementSibling;
                if (lbl?.classList.contains('floating-label')) lbl.classList.add('floating');
            }
        });
    }
    fixFloatingLabels();
    setTimeout(fixFloatingLabels, 600);

    document.querySelectorAll('.floating-input').forEach(input => {
        const getLabel = () => input.nextElementSibling;
        input.addEventListener('focus', () => getLabel()?.classList.add('floating'));
        input.addEventListener('blur',  () => {
            if (input.value.trim() === '') getLabel()?.classList.remove('floating');
        });
        input.addEventListener('input', () => {
            if (input.value.trim() !== '') getLabel()?.classList.add('floating');
        });
    });

    // ════════════════════════════════════════════════
    // 1. Save user to Firestore
    // ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// UNIFIED FIRESTORE SYNC (The Final Fix)
// ════════════════════════════════════════════════
async function saveUserToDB(user, name = null, extraData = {}) {
    if (!user) return;

    // Use Firestore (db) to match the Command Center logic
    const userRef = db.collection('users').doc(user.uid);
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    try {
        const doc = await userRef.get();
        
        if (!doc.exists) {
            // New user entry with full medical and contact metadata
            await userRef.set({
                uid:       user.uid,
                email:     user.email,
                name:      name || user.displayName || "Traveler",
                role:      ADMIN_EMAILS.includes(user.email) ? "admin" : "user",
                status:    "active",
                createdAt: timestamp,
                lastLogin: timestamp,
                lastActive: timestamp,
                ...extraData 
            });
            console.log("New traveler synchronized with Command Center.");
        } else {
            // Returning user update
            await userRef.set({
                lastLogin: timestamp,
                lastActive: timestamp,
                status:    "active"
            }, { merge: true });
            console.log("Traveler status updated.");
        }
    } catch (err) {
        console.error("Database Sync Error:", err);
    }
}

    // ════════════════════════════════════════════════
    // 2. Password visibility toggle
    // ════════════════════════════════════════════════
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', () => {
            const input = document.getElementById(icon.getAttribute('data-target'));
            if (!input) return;
            const show   = input.type === 'password';
            input.type   = show ? 'text' : 'password';
            icon.textContent = show ? '🙈' : '👁️';
        });
    });

    // ════════════════════════════════════════════════
    // 3. Password strength meter
    // ════════════════════════════════════════════════
    function checkStrength(pw) {
        let s = 0;
        if (pw.length > 5) s++;
        if (pw.length > 9) s++;
        if (/[A-Z]/.test(pw)) s++;
        if (/[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        return s;
    }

    function attachStrengthBar(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const bar = input.parentElement.querySelector('.strength-bar');
        if (!bar) return;
        input.addEventListener('input', () => {
            const score = checkStrength(input.value);
            bar.style.width = Math.min(100, (score / 5) * 100) + '%';
            bar.style.backgroundColor = score > 3 ? '#34d399' : score > 2 ? '#fbbf24' : '#ef4444';
        });
    }
    attachStrengthBar('signupPassword');
    attachStrengthBar('loginPassword');

    // ════════════════════════════════════════════════
    // 4. Login
    // ════════════════════════════════════════════════
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email    = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn      = document.getElementById('loginBtn');
            if (!email || !password) return showMessage("Please fill in all fields.");
            btn.disabled  = true;
            btn.innerHTML = `<span class="btn-content"><span>Logging in...</span></span>`;
            try {
                const cred = await auth.signInWithEmailAndPassword(email, password);
                showMessage("Login successful! Redirecting...", false);
                await saveUserToDB(cred.user);
            } catch (err) {
                showMessage(translateError(err));
                btn.disabled  = false;
                btn.innerHTML = `<span class="btn-content"><span>Sign In</span><i class="fas fa-arrow-right"></i></span><div class="shimmer"></div>`;
            }
        });
    }

    // ════════════════════════════════════════════════
    // 4.5 Forgot password
    // ════════════════════════════════════════════════
    const showForgotBtn = document.getElementById('showForgotBtn');
    const showLoginBtn  = document.getElementById('showLoginBtn');
    const forgotForm    = document.getElementById('forgotForm');

    if (showForgotBtn && forgotForm) {
        showForgotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display  = 'none';
            forgotForm.style.display = 'block';
            if (authMessage) authMessage.style.display = 'none';
        });
    }
    if (showLoginBtn && forgotForm) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            forgotForm.style.display = 'none';
            loginForm.style.display  = 'block';
            if (authMessage) authMessage.style.display = 'none';
        });
    }

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value.trim();
            const btn   = document.getElementById('resetBtn');
            if (!email) return showMessage("Please enter your email.");
            btn.disabled  = true;
            btn.innerHTML = `<span class="btn-content"><span>Sending...</span></span>`;
            try {
                await auth.sendPasswordResetEmail(email);
                showMessage("Reset link sent! Check your inbox.", false);
                setTimeout(() => {
                    forgotForm.style.display = 'none';
                    loginForm.style.display  = 'block';
                    btn.disabled  = false;
                    btn.innerHTML = `<span class="btn-content"><span>Send Reset Link</span><i class="fas fa-paper-plane"></i></span><div class="shimmer"></div>`;
                }, 3000);
            } catch (err) {
                showMessage(translateError(err));
                btn.disabled  = false;
                btn.innerHTML = `<span class="btn-content"><span>Send Reset Link</span><i class="fas fa-paper-plane"></i></span><div class="shimmer"></div>`;
            }
        });
    }

    // ════════════════════════════════════════════════
    // 5. Signup (3-step wizard)
    // ════════════════════════════════════════════════
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name      = document.getElementById('signupName').value.trim();
            const age       = document.getElementById('signupAge')?.value    || '';
            const gender    = document.getElementById('signupGender')?.value || '';
            const phone     = document.getElementById('signupPhone')?.value  || '';
            const medical   = document.getElementById('signupMedical')?.value   || '';
            const heatSense = document.getElementById('signupHeatSense')?.value || '3';
            const airSense  = document.getElementById('signupAirSense')?.value  || '3';

            const fitnessRadio  = document.querySelector('input[name="signupFitness"]:checked');
            const fitness       = fitnessRadio?.value || document.getElementById('signupFitness')?.value || 'moderate';

            const travelRadio   = document.querySelector('input[name="signupTravelMode"]:checked');
            const travelMode    = travelRadio?.value  || document.getElementById('signupTravelMode')?.value || 'car';

            const riskTolerance = document.getElementById('signupRiskTolerance')?.value || '3';
            const emergency     = document.getElementById('signupEmergency')?.value     || '';
            const consent       = document.getElementById('signupConsent')?.checked;
            const email         = document.getElementById('signupEmail').value.trim();
            const password      = document.getElementById('signupPassword').value;
            const btn           = document.getElementById('signupBtn');

            if (!consent) return showMessage("You must agree to the health data terms.");

            btn.disabled  = true;
            btn.innerHTML = `<span class="btn-content"><span>Building Profile...</span></span>`;

            try {
                const cred = await auth.createUserWithEmailAndPassword(email, password);
                await cred.user.updateProfile({ displayName: name });
                
                // 🛡️ ALIGN WITH DASHBOARD.JS SCHEMA
                await saveUserToDB(cred.user, name, {
                    age, 
                    gender, 
                    phone,
                    healthProfile: medical || "standard", // Matches dashboard!
                    heatSensitivity: heatSense,
                    airSensitivity:  airSense,
                    fitnessLevel:    fitness,
                    travelMode,
                    riskTolerance,
                    emergency: { name: "", phone: emergency } // Matches dashboard object structure!
                });
                
                showMessage("Account created! Logging you in...", false);
                
                // 🚀 THE FIX: We do NOT redirect here. 
                // We let the onAuthStateChanged observer handle the routing so it doesn't glitch!
                
            } catch (err) {
                showMessage(translateError(err));
                btn.disabled  = false;
                btn.innerHTML = `<span class="btn-content"><span>Complete Setup</span><i class="fas fa-check"></i></span><div class="shimmer"></div>`;
            }
        });
    }

    // ════════════════════════════════════════════════
    // 6. Google login
    // ════════════════════════════════════════════════
    window.handleGoogleLogin = async function () {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            showMessage("Google login successful!", false);
            await saveUserToDB(result.user);
        } catch (err) {
            showMessage(translateError(err));
        }
    };

   // ════════════════════════════════════════════════
// 7. Logout (Updated to clear status)
// ════════════════════════════════════════════════
document.addEventListener('click', async (e) => {
    if (e.target.closest('#logoutBtn') || e.target.closest('#logoutBtnDrawer')) {
        e.preventDefault();
        if (confirm("Are you sure you want to log out?")) {
            const user = auth.currentUser;
            if (user) {
                // 🔥 THE FIX: Tell the DB we are offline BEFORE signing out
                try {
                    await db.collection('users').doc(user.uid).update({
                        status: 'Offline',
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (err) {
                    console.warn("Status update failed during logout, signing out anyway.");
                }
            }
            await auth.signOut();
            window.location.replace('login.html');
        }
    }
});
// ════════════════════════════════════════════════
    // 8. Auth state & Bulletproof Routing
    // ════════════════════════════════════════════════
    auth.onAuthStateChanged(user => {
        const path       = window.location.pathname.toLowerCase();
        const isAuthPage = path.includes('login') || path.includes('signup') || path === '/' || path.endsWith('safenav/');

        if (user) {
            // 🟢 USER IS LOGGED IN
            
            // 🔥 IMMEDIATE HEARTBEAT: Mark them as Active right now!
            updateActiveHeartbeat(user);

            if (isAuthPage) {
                // If they are on Login/Signup, push them inside the app
                if (ADMIN_EMAILS.includes(user.email)) {
                    window.location.replace('admin.html');
                } else {
                    window.location.replace('dashboard.html');
                }
                return;
            }
            // If they are on route.html, dashboard.html, or admin.html... let them stay!
            if (loader) loader.style.display = 'none';
            
        } else {
            // 🔴 USER IS LOGGED OUT
            if (!isAuthPage) {
                window.location.replace('login.html');
            } else {
                if (loader) {
                    loader.style.opacity    = '0';
                    loader.style.transition = 'opacity 0.4s ease';
                    setTimeout(() => loader.style.display = 'none', 420);
                }
            }
        }
    });

}); 

// ════════════════════════════════════════════════
// 9. THE HEARTBEAT ENGINE (Keep them active)
// ════════════════════════════════════════════════
function updateActiveHeartbeat(user) {
    if (!user) return;
    
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // We use geolocation here if available, otherwise just update the timestamp
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                firebase.firestore().collection('users').doc(user.uid).set({
                    lastActive: timestamp,
                    lastSeen: timestamp,
                    status: 'active',
                    location: new firebase.firestore.GeoPoint(position.coords.latitude, position.coords.longitude)
                }, { merge: true });
            },
            (error) => {
                // If they block location, just update the timestamp
                firebase.firestore().collection('users').doc(user.uid).set({
                    lastActive: timestamp,
                    lastSeen: timestamp,
                    status: 'active'
                }, { merge: true });
            }
        );
    } else {
        firebase.firestore().collection('users').doc(user.uid).set({
            lastActive: timestamp,
            lastSeen: timestamp,
            status: 'active'
        }, { merge: true });
    }
}
// 🔥 THIS IS THE FINAL LINE OF AUTH.JS
// Updates the "active" status every 4 minutes
setInterval(() => {
    const user = firebase.auth().currentUser;
    if (user) updateActiveHeartbeat(user);
}, 240000);