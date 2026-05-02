// ==========================================
// 1. THE GLOBAL "ALWAYS-ON" LISTENER
// ==========================================
let clickLock = false;

document.addEventListener('click', function(e) {
    // Detect click on the avatar container or the image itself
    const isAvatar = e.target.closest('.profile-pic-nav') || e.target.id === 'navAvatar';
    
    if (isAvatar) {
        e.preventDefault();
        e.stopPropagation();

        if (clickLock) return;
        clickLock = true;
        setTimeout(() => clickLock = false, 300); // Prevent double-triggering

        const drawer = document.getElementById('profileDrawer');
        if (drawer) {
            console.log("🎯 Drawer Found - Toggling");
            drawer.classList.toggle('open');
            
            // Sync the manual style just in case CSS classes are being blocked
            if (drawer.classList.contains('open')) {
                drawer.style.right = "0px";
            } else {
                drawer.style.right = "-100%";
            }
        } else {
            console.warn("⚠️ Not on Dashboard. Redirecting...");
            window.location.href = "dashboard.html";
        }
    }
});

// ==========================================
// 2. NAVBAR HTML INJECTOR
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const placeholder = document.getElementById("navbar-placeholder");
    if (placeholder) {
        fetch("navbar.html")
            .then(res => res.text())
            .then(html => {
                placeholder.innerHTML = html;
                initNavbarUI();
            });
    } else {
        initNavbarUI();
    }
});

// ==========================================
// 3. UI INITIALIZATION (Themes, Menu)
// ==========================================
function initNavbarUI() {
    const toggle = document.getElementById('navbarToggle');
    const menu = document.getElementById('navMenu');
    if (toggle && menu) {
        toggle.onclick = () => menu.classList.toggle('active');
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        if (localStorage.getItem('safenav_theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        }
        themeToggle.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('safenav_theme', isDark ? 'dark' : 'light');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
        };
    }

    // Background Firebase Sync for the Avatar Image
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(user => {
            const avatarImg = document.getElementById('navAvatar');
            if (user && avatarImg) {
                const name = user.displayName || user.email || "User";
                avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`;
            }
        });
    }
}