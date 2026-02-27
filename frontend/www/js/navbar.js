// ============================================
// navbar.js - 
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Find the placeholder in your HTML pages
    const navPlaceholder = document.getElementById("navbar-placeholder");

    if (navPlaceholder) {
        // 2. Fetch the Premium Navbar HTML
        fetch("navbar.html")
            .then(response => {
                if (!response.ok) throw new Error("Navbar file not found");
                return response.text();
            })
            .then(data => {
                // 3. Insert HTML into the page
                navPlaceholder.innerHTML = data;
                
                // 4. RUN LOGIC (Important: Must happen after HTML is inserted)
                initializeNavbarLogic();
            })
            .catch(error => console.error("Error loading navbar:", error));
    }
});

// ============================================
// Helper Function: The "Premium" Features
// ============================================
function initializeNavbarLogic() {
    
    // A. Mobile Hamburger Toggle
    const toggle = document.getElementById('navbarToggle');
    const menu = document.getElementById('navMenu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
            
            // Optional: Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target) && !toggle.contains(e.target)) {
                    menu.classList.remove('active');
                }
            });
        });
    }

    // B. Highlight "Active" Page (The Blue Line)
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        // Get the href value (e.g., "route.html")
        const linkHref = link.getAttribute('href');
        
        // If it matches the current URL, add class 'active-page'
        if (linkHref === currentPath) {
            link.classList.add('active-page');
        }
    });

    // C. Theme Toggle (Optional)
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        // Load saved theme
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeBtn.textContent = '☀️';
        }

        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            themeBtn.textContent = isDark ? '☀️' : '🌙';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
}
