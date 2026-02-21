// ==========================================
// auth.js - Premium Authentication Engine
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔐 Premium Auth Script Loaded");
    
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.error("Firebase not loaded! Check your script tags.");
        return;
    }

    // Initialize Database & Auth
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- CONFIG: ADMIN EMAILS ---
    const ADMIN_EMAILS = [
        "shafeezchappi18@gmail.com", 
        "admin@safenav.com"
    ];

    // UI Elements
    const authMessage = document.getElementById('authMessage');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loader = document.getElementById("authLoader"); // Brought back your loader!

    // ============================================
    // 🎨 FIX: BROWSER AUTO-FILL OVERLAPPING TEXT
    // ============================================
    function fixFloatingLabels() {
        document.querySelectorAll('.floating-input').forEach(input => {
            if (input.value.trim() !== '') {
                input.parentElement.classList.add('focused');
                input.nextElementSibling.classList.add('floating');
            }
        });
    }

    // Run instantly, and again after 500ms for slow browser auto-fills
    fixFloatingLabels();
    setTimeout(fixFloatingLabels, 500);

    document.querySelectorAll('.floating-input').forEach(input => {
        input.addEventListener('focus', function() { 
            this.parentElement.classList.add('focused'); 
            this.nextElementSibling.classList.add('floating');
        });
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
            if (this.value.trim() === '') this.nextElementSibling.classList.remove('floating');
        });
        input.addEventListener('input', function() {
            if (this.value.trim() !== '') this.nextElementSibling.classList.add('floating');
        });
    });

    // ============================================
    // 🗣️ FIX: HUMAN-READABLE ERROR MESSAGES
    // ============================================
    function translateError(error) {
        switch (error.code) {
            case 'auth/user-not-found': return "We couldn't find an account with this email.";
            case 'auth/wrong-password': return "Incorrect password. Please try again.";
            case 'auth/email-already-in-use': return "This email is already registered. Try signing in!";
            case 'auth/weak-password': return "Your password is too weak. Use at least 6 characters.";
            case 'auth/invalid-email': return "Please enter a valid email address.";
            case 'auth/network-request-failed': return "Network error. Please check your internet connection.";
            case 'auth/too-many-requests': return "Too many attempts. Please try again later.";
            default: return "Something went wrong: " + error.message;
        }
    }

    function showMessage(msg, isError = true) {
        if(!authMessage) return;
        authMessage.style.display = 'block';
        authMessage.style.color = isError ? '#ef4444' : '#10b981';
        authMessage.style.backgroundColor = isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
        authMessage.innerText = msg;
    }

    // ============================================
    // 1. HELPER: SAVE USER TO DATABASE (Firestore)
    // ============================================
    async function saveUserToDB(user, name = null) {
        if (!user) return;
        const userRef = db.collection('users').doc(user.uid);
        
        try {
            const doc = await userRef.get();
            if (!doc.exists) {
                await userRef.set({
                    uid: user.uid,
                    email: user.email,
                    name: name || user.displayName || "Traveler",
                    role: ADMIN_EMAILS.includes(user.email) ? "admin" : "user",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    status: "active"
                });
                console.log("✅ New User Saved to Database");
            } else {
                await userRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("🔄 User Login Timestamp Updated");
            }
        } catch (error) {
            console.error("Database Save Error:", error);
        }
    }

    // ============================================
    // 2. PASSWORD VISIBILITY TOGGLE (Eye Icon)
    // ============================================
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', () => {
            const targetId = icon.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                icon.textContent = type === 'password' ? '👁️' : '🙈';
            }
        });
    });

    // ============================================
    // 3. PASSWORD STRENGTH METER
    // ============================================
    function checkStrength(password) {
        let strength = 0;
        if (password.length > 5) strength++;
        if (password.length > 9) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    }

    function updateStrengthBar(inputId) {
        const input = document.getElementById(inputId);
        const bar = input?.parentElement.querySelector('.password-strength .strength-bar');
        if (input && bar) {
            input.addEventListener('input', () => {
                const val = input.value;
                const score = checkStrength(val);
                const width = Math.min(100, (score / 5) * 100);
                
                let color = '#ef4444'; // Red
                if (score > 2) color = '#f59e0b'; // Yellow
                if (score > 3) color = '#10b981'; // Green

                bar.style.width = `${width}%`;
                bar.style.backgroundColor = color;
            });
        }
    }
    updateStrengthBar('signupPassword');
    updateStrengthBar('loginPassword');

    // ============================================
    // 4. LOGIN LOGIC
    // ============================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginBtn');

            if (!email || !password) return showMessage("Please fill in all fields.");

            btn.style.opacity = '0.7';
            btn.disabled = true;
            btn.innerHTML = `<span class="btn-content"><span>Logging in...</span></span>`;

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                showMessage("Login successful! Redirecting...", false);
                await saveUserToDB(userCredential.user);
            } catch (err) {
                showMessage(translateError(err));
                btn.style.opacity = '1';
                btn.disabled = false;
                btn.innerHTML = `<span class="btn-content"><span>Sign In</span> <i class="fas fa-arrow-right"></i></span>`;
            }
        });
    }

    // ============================================
    // 5. SIGNUP LOGIC
    // ============================================
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const btn = document.getElementById('signupBtn');

            if (!email || !password || !name) return showMessage("Please fill in all fields.");

            btn.style.opacity = '0.7';
            btn.disabled = true;
            btn.innerHTML = `<span class="btn-content"><span>Creating Account...</span></span>`;

            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await userCredential.user.updateProfile({ displayName: name });
                showMessage("Account created! Redirecting...", false);
                await saveUserToDB(userCredential.user, name);
            } catch (err) {
                showMessage(translateError(err));
                btn.style.opacity = '1';
                btn.disabled = false;
                btn.innerHTML = `<span class="btn-content"><span>Create Account</span> <i class="fas fa-check"></i></span>`;
            }
        });
    }

    // ============================================
    // 6. GOOGLE LOGIN
    // ============================================
    window.handleGoogleLogin = async function() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            showMessage("Google Login successful!", false);
            await saveUserToDB(result.user);
        } catch (error) {
            console.error("Google Login Error:", error);
            showMessage(translateError(error));
        }
    };

    // ============================================
    // 7. GLOBAL LOGOUT LOGIC
    // ============================================
    document.addEventListener('click', async (e) => {
        const logoutBtn = e.target.closest('#logoutBtn');
        if (logoutBtn) {
            e.preventDefault();
            if(confirm("Are you sure you want to log out?")) {
                await auth.signOut();
                window.location.href = 'login.html';
            }
        }
    });

    // ============================================
    // 8. AUTH STATE OBSERVER & ROUTING
    // ============================================
    auth.onAuthStateChanged(user => {
        const path = window.location.pathname;
        const isAuthPage = path.includes('login.html') || path.includes('signup.html');

        if (user) {
            console.log("👤 Verified User:", user.email);

            // A. ADMIN REDIRECT
            if (ADMIN_EMAILS.includes(user.email)) {
                if (!path.includes('admin.html')) {
                    window.location.href = 'admin.html';
                    return; 
                }
            } 
            // B. USER REDIRECT
            else {
                if (isAuthPage) {
                    window.location.href = 'dashboard.html'; 
                    return;
                }
            }
            
            // Hide Loader if user is valid
            if (loader) loader.style.display = 'none';

        } else {
            // C. NO USER (Show Login Page or Fade out loader if already there)
            if (!isAuthPage) {
                window.location.href = 'login.html';
            } else {
                if (loader) {
                    setTimeout(() => {
                        loader.style.opacity = "0";
                        loader.style.transition = "opacity 0.5s ease";
                        setTimeout(() => loader.style.display = 'none', 500);
                    }, 500); 
                }
            }
        }
    });

    // ============================================
    // 9. PASSWORD VISIBILITY & STRENGTH (Preserved)
    // ============================================
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', () => {
            const targetId = icon.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                icon.textContent = type === 'password' ? '👁️' : '🙈';
            }
        });
    });

    function checkStrength(password) {
        let strength = 0;
        if (password.length > 5) strength++;
        if (password.length > 9) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    }

    function updateStrengthBar(inputId) {
        const input = document.getElementById(inputId);
        const bar = input?.parentElement.querySelector('.password-strength .strength-bar');
        if (input && bar) {
            input.addEventListener('input', () => {
                const val = input.value;
                const score = checkStrength(val);
                const width = Math.min(100, (score / 5) * 100);
                let color = '#ef4444'; // Red
                if (score > 2) color = '#f59e0b'; // Yellow
                if (score > 3) color = '#10b981'; // Green
                bar.style.width = `${width}%`;
                bar.style.backgroundColor = color;
            });
        }
    }
    updateStrengthBar('signupPassword');
    updateStrengthBar('loginPassword');
});