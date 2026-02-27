document.addEventListener("DOMContentLoaded", () => {
    const placeholder = document.getElementById("navbar-placeholder");

    // Check if the page uses the dynamic placeholder
    if (placeholder) {
        fetch("navbar.html")
            .then(response => {
                if (!response.ok) throw new Error("Navbar failed to load");
                return response.text();
            })
            .then(html => {
                // 1. Inject the HTML
                placeholder.innerHTML = html;
                
                // 2. Run all your original logic NOW that the navbar actually exists on the page
                initNavbarFeatures();
            })
            .catch(error => console.error("Error loading navbar:", error));
    } else {
        // Fallback: If a page still has the hardcoded navbar, just run the logic immediately
        initNavbarFeatures();
    }
});

// All of your exact original logic, safely wrapped in a function
function initNavbarFeatures() {
    // 1. Mobile Toggle Logic
    const toggle = document.getElementById('navbarToggle');
    const menu = document.getElementById('navMenu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
        });
    }

    // 2. Active Page Highlight
    const current = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === current) {
            link.classList.add('active-page');
        } else {
            link.classList.remove('active-page'); // Clean up others just in case
        }
    });

    // 3. Global Dark Mode Toggle ("One button lights up all")
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Check LocalStorage for saved theme
    const savedTheme = localStorage.getItem('safenav_theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if(themeToggle) themeToggle.textContent = '☀️';
    }

    // Toggle click event
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('safenav_theme', 'dark');
                themeToggle.textContent = '☀️';
            } else {
                localStorage.setItem('safenav_theme', 'light');
                themeToggle.textContent = '🌙';
            }
        });
    }
}