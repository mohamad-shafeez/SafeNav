// ============================================
// CONFIGURATION 
// ============================================

// Google Sheets Configuration
const CONFIG = {
    // Using the direct CSV export URL from your published sheet
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCl70kD24n28sG2P-Xy5qvL0kPyQvOQVuUK1iASjoqJxWHW7fv6H4vhBnGJpSThQ/pub?output=csv',
    
    // Configuration
    ITEMS_PER_PAGE: 12,
    ENABLE_ANIMATIONS: true,
    ENABLE_COUNTERS: true
};

// ============================================
// GLOBAL VARIABLES
// ============================================

let allPackages = [];
let filteredPackages = [];
let currentPage = 1;
let hasMorePackages = false;
let uniqueCategories = new Set();
let uniqueLocations = new Set();
let currentTheme = localStorage.getItem('theme') || 'light';

// DOM Elements
const DOM = {
    // Theme
    themeToggle: document.getElementById('themeToggle'),
    body: document.body,
    
    // Hero
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    
    // Statistics
    statNumbers: document.querySelectorAll('.stat-number'),
    
    // Categories
    categoriesGrid: document.getElementById('categoriesGrid'),
    
    // Filters
    categoryFilter: document.getElementById('categoryFilter'),
    locationFilter: document.getElementById('locationFilter'),
    sourceFilter: document.getElementById('sourceFilter'),
    seasonFilter: document.getElementById('seasonFilter'),
    clearFilters: document.getElementById('clearFilters'),
    activeFilters: document.getElementById('activeFilters'),
    
    // Results
    sortSelect: document.getElementById('sortSelect'),
    viewButtons: document.querySelectorAll('.view-btn'),
    packagesGrid: document.getElementById('packagesGrid'),
    packageCount: document.getElementById('packageCount'),
    resultsSubtitle: document.getElementById('resultsSubtitle'),
    
    // Loading & Pagination
    noResults: document.getElementById('noResults'),
    resetAll: document.getElementById('resetAll'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loadMore: document.getElementById('loadMore'),
    remainingCount: document.getElementById('remainingCount'),
    
    // Back to top
    backToTop: document.getElementById('backToTop')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPrice(price) {
    if (!price || price.trim() === '') return 'Check official site';
    
    // Try to extract numeric value
    const numericMatch = price.match(/\d+(,\d+)*(\.\d+)?/);
    if (numericMatch) {
        const num = parseFloat(numericMatch[0].replace(/,/g, ''));
        if (!isNaN(num)) {
            return `₹${num.toLocaleString('en-IN')}`;
        }
    }
    
    return price;
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    // Remove all non-numeric characters
    return phone.replace(/\D/g, '');
}

function animateCounter(element, target) {
    if (!CONFIG.ENABLE_COUNTERS || !element) {
        if (element) element.textContent = target;
        return;
    }
    
    const duration = 1500;
    const step = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// ============================================
// DATA LOADING & PARSING - SIMPLIFIED VERSION
// ============================================

async function loadPackages() {
    try {
        console.log('🔄 Loading packages from Google Sheets...');
        console.log('Sheet URL:', CONFIG.SHEET_URL);
        
        // Show loading state
        showLoadingState();
        
        // Add cache-busting parameter to avoid caching issues
        const timestamp = new Date().getTime();
        const url = `${CONFIG.SHEET_URL}&_=${timestamp}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('CSV data received, length:', csvText.length);
        
        if (!csvText || csvText.trim().length < 10) {
            throw new Error('CSV data is empty or too short');
        }
        
        // Parse CSV using Papa Parse style parsing
        const packages = parseCSV(csvText);
        console.log(`Parsed ${packages.length} packages`);
        
        if (packages.length === 0) {
            throw new Error('No valid packages found in CSV');
        }
        
        // Store and process packages
        allPackages = packages;
        filteredPackages = [...packages];
        
        // Extract unique values for filters
        extractFilterValues(packages);
        
        // Update statistics
        updateStatistics(packages);
        
        // Render categories
        renderCategories();
        
        // Render packages
        renderPackages();
        
        console.log('✅ Packages loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading packages:', error);
        showErrorState(error.message || 'Failed to load packages. Please check your internet connection.');
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const packages = [];
    
    if (lines.length < 2) return packages;
    
 // This removes accidental spaces from your sheet headers
const headers = parseCSVLine(lines[0]).map(header => header.trim());
    console.log('Headers found:', headers);
    
    // Process data lines
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        
        // Create package object
        const packageData = {};
        headers.forEach((header, index) => {
            let value = values[index] || '';
            // Clean up the value
            value = value.toString().trim();
            value = value.replace(/^"|"$/g, '');
            packageData[header] = value;
        });
        
        // Only add packages with title and location
        if (packageData['Package Title'] && packageData['Package Title'].trim() !== '' && 
            packageData['Location'] && packageData['Location'].trim() !== '') {
            packages.push(packageData);
        }
    }
    
    return packages;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last value
    values.push(current);
    
    return values;
}

function extractFilterValues(packages) {
    // Clear existing options except the first one
    DOM.categoryFilter.innerHTML = '<option value="">All Categories</option>';
    DOM.locationFilter.innerHTML = '<option value="">All Locations</option>';
    
    packages.forEach(pkg => {
        const category = pkg['Category'];
        const location = pkg['Location'];
        
        if (category && category.trim() !== '') {
            uniqueCategories.add(category);
        }
        if (location && location.trim() !== '') {
            uniqueLocations.add(location);
        }
    });
    
    // Populate category filter
    const sortedCategories = Array.from(uniqueCategories).sort();
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        DOM.categoryFilter.appendChild(option);
    });
    
    // Populate location filter
    const sortedLocations = Array.from(uniqueLocations).sort();
    sortedLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        DOM.locationFilter.appendChild(option);
    });
}

function updateStatistics(packages) {
    const uniqueLocs = new Set(packages.map(p => p['Location']).filter(Boolean));
    const uniqueOps = new Set(packages.map(p => p['Operator Name']).filter(Boolean));
    
    // Update statistics in hero section
    const statElements = document.querySelectorAll('.stat-number');
    const statData = [
        Math.min(uniqueLocs.size, 50),    // Destinations
        Math.min(uniqueOps.size, 30),     // Operators
        Math.min(packages.length, 200),   // Packages
        100                               // Verified
    ];
    
    // Animate counters
    statElements.forEach((stat, index) => {
        if (statData[index] !== undefined) {
            animateCounter(stat, statData[index]);
        }
    });
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderCategories() {
    const categoryCounts = {};
    
    allPackages.forEach(pkg => {
        const category = pkg['Category'];
        if (category && category.trim() !== '') {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
    });
    
    const categories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    if (categories.length === 0) {
        DOM.categoriesGrid.innerHTML = `
            <div class="category-card" onclick="filterByCategory('')">
                <div class="category-icon">
                    <i class="fas fa-map-marked-alt"></i>
                </div>
                <h4 class="category-name">All Packages</h4>
                <span class="category-count">${allPackages.length} packages</span>
            </div>
        `;
        return;
    }
    
    DOM.categoriesGrid.innerHTML = categories.map(([name, count]) => `
        <div class="category-card" onclick="filterByCategory('${escapeHTML(name)}')">
            <div class="category-icon">
                <i class="${getCategoryIcon(name)}"></i>
            </div>
            <h4 class="category-name">${escapeHTML(name)}</h4>
            <span class="category-count">${count} packages</span>
        </div>
    `).join('');
}

function getCategoryIcon(category) {
    if (!category) return 'fas fa-map-marked-alt';
    
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('hill') || categoryLower.includes('mountain')) {
        return 'fas fa-mountain';
    } else if (categoryLower.includes('beach') || categoryLower.includes('sea')) {
        return 'fas fa-umbrella-beach';
    } else if (categoryLower.includes('wildlife') || categoryLower.includes('animal')) {
        return 'fas fa-paw';
    } else if (categoryLower.includes('heritage') || categoryLower.includes('historic')) {
        return 'fas fa-landmark';
    } else if (categoryLower.includes('pilgrimage') || categoryLower.includes('temple')) {
        return 'fas fa-place-of-worship';
    } else if (categoryLower.includes('adventure') || categoryLower.includes('trek')) {
        return 'fas fa-hiking';
    } else if (categoryLower.includes('cultural') || categoryLower.includes('art')) {
        return 'fas fa-theater-masks';
    } else if (categoryLower.includes('weekend') || categoryLower.includes('short')) {
        return 'fas fa-home';
    } else if (categoryLower.includes('luxury') || categoryLower.includes('premium')) {
        return 'fas fa-crown';
    } else if (categoryLower.includes('budget') || categoryLower.includes('economy')) {
        return 'fas fa-wallet';
    } else if (categoryLower.includes('family') || categoryLower.includes('kids')) {
        return 'fas fa-users';
    } else if (categoryLower.includes('honeymoon') || categoryLower.includes('romantic')) {
        return 'fas fa-heart';
    }
    
    return 'fas fa-map-marked-alt';
}

function renderPackages() {
    const start = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    const end = start + CONFIG.ITEMS_PER_PAGE;
    const packagesToShow = filteredPackages.slice(start, end);
    
    // Check if we have more packages to load
    hasMorePackages = end < filteredPackages.length;
    
    if (filteredPackages.length === 0) {
        DOM.noResults.style.display = 'block';
        DOM.packagesGrid.style.display = 'none';
        DOM.loadMoreContainer.style.display = 'none';
        DOM.packageCount.textContent = '0';
        DOM.resultsSubtitle.textContent = 'No packages found';
        return;
    }
    
    DOM.noResults.style.display = 'none';
    DOM.packagesGrid.style.display = 'grid';
    DOM.packageCount.textContent = filteredPackages.length;
    DOM.resultsSubtitle.textContent = packagesToShow.length === filteredPackages.length 
        ? `${filteredPackages.length} packages available`
        : `Showing ${Math.min(end, filteredPackages.length)} of ${filteredPackages.length}`;
    
    // Update load more button
    if (hasMorePackages) {
        DOM.loadMoreContainer.style.display = 'block';
        const remaining = filteredPackages.length - end;
        DOM.remainingCount.textContent = `+${remaining}`;
    } else {
        DOM.loadMoreContainer.style.display = 'none';
    }
    
    // Clear and render packages
    if (currentPage === 1) {
        DOM.packagesGrid.innerHTML = '';
    }
    
    packagesToShow.forEach((pkg, index) => {
        const card = createPackageCard(pkg);
        DOM.packagesGrid.appendChild(card);
        
        // Add staggered animation
        if (CONFIG.ENABLE_ANIMATIONS && currentPage === 1) {
            card.style.animationDelay = `${index * 0.05}s`;
        }
    });
}

function createPackageCard(pkg) {
    const card = document.createElement('div');
    card.className = 'package-card';
    
    // --- 1. SMART DATA FETCHING ---
    
    // WhatsApp: Checks 'WhatsApp Number', 'WhatsApp', 'Contact', or 'wa'
    const whatsapp = pkg['WhatsApp Number'] || pkg['WhatsApp'] || pkg['whatsapp'] || pkg['Contact'] || pkg['wa'] || '';

    // Email: Checks 'Email', 'Gmail', or 'email'
    const email = pkg['Email'] || pkg['email'] || pkg['Gmail'] || pkg['gmail'] || '';

    // Phone: Checks 'Phone Number', 'Phone', or 'Mobile'
    const phone = pkg['Phone Number'] || pkg['Phone'] || pkg['Mobile'] || '';

    // Booking: Checks 'Booking URL', 'Booking Link', or just 'Link'
    const bookingUrl = pkg['Booking URL'] || pkg['Booking Link'] || pkg['Link'] || pkg['url'] || '';

    // Image: Checks 'Image URL' or just 'Image'
    const imageUrl = pkg['Image URL'] || pkg['Image'] || '';
    
    // Description: Checks 'Short Description', 'Description', or 'desc'
    const description = pkg['Short Description'] || pkg['Description'] || pkg['desc'] || '';

    // Other basics
    const title = pkg['Package Title'] || pkg['Title'] || 'Untitled Package';
    const location = pkg['Location'] || pkg['Place'] || 'Location not specified';
    const price = pkg['Starting Price'] || pkg['Price'] || '';
    const duration = pkg['Duration'] || '';
    const season = pkg['Best Season'] || pkg['Season'] || '';
    const operator = pkg['Operator Name'] || pkg['Operator'] || '';
    const source = pkg['Source'] || '';
    const coordinates = pkg['Coordinates'] || '';

    // Badge Color Logic
    const badgeColors = {
        'Kerala Tourism': '#10b981',
        'Karnataka Tourism': '#3b82f6',
        'IRCTC': '#ef4444',
        'Official': '#2563eb',
        'default': '#f59e0b'
    };
    const badgeColor = badgeColors[source] || badgeColors.default;
    
    // --- 2. HTML GENERATION (Fixed Structure) ---
    
  // --- 2. HTML GENERATION (Paste this exactly) ---
    card.innerHTML = `
        <div class="card-image-container">
            ${imageUrl ? `
                <img src="${escapeHTML(imageUrl)}" 
                     alt="${escapeHTML(title)}" 
                     class="card-image"
                     loading="lazy"
                     onerror="this.src=''; this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-mountain\\'></i></div>';">
            ` : `
                <div class="no-image">
                    <i class="fas fa-mountain"></i>
                </div>
            `}
            <div class="image-overlay"></div>
            ${source ? `
                <div class="card-badge" style="background: ${badgeColor}">
                    ${escapeHTML(source)}
                </div>
            ` : ''}
        </div>
        
        <div class="card-content">
            <div class="card-header">
                <h3 class="card-title">${escapeHTML(title)}</h3>
                <div class="card-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${escapeHTML(location)}</span>
                </div>
            </div>
            
            <div class="card-details">
                ${duration ? `
                    <div class="card-detail">
                        <i class="fas fa-clock"></i>
                        <span>Duration:</span> ${escapeHTML(duration)}
                    </div>
                ` : ''}
                
                <div class="card-detail">
                    <i class="fas fa-rupee-sign"></i>
                    <span>Price:</span> 
                    ${formatPrice(price)}
                </div>
            </div>
            
            ${description ? `
                <div class="card-description">
                    ${escapeHTML(description)}
                </div>
            ` : ''}
            
            <div class="contact-buttons">
                ${whatsapp ? `
                    <a href="https://wa.me/${formatPhoneNumber(whatsapp)}" 
                       target="_blank" 
                       class="contact-btn whatsapp">
                        <i class="fab fa-whatsapp"></i> Chat
                    </a>
                ` : ''}
                
                ${phone ? `
                    <a href="tel:${formatPhoneNumber(phone)}" 
                       class="contact-btn phone">
                        <i class="fas fa-phone"></i> Call
                    </a>
                ` : ''}
                
                ${email ? `
                    <a href="mailto:${email}" 
                       class="contact-btn email">
                        <i class="fas fa-envelope"></i> Email
                    </a>
                ` : ''}
            </div>
            
            <div class="action-buttons">
                ${bookingUrl ? `
                    <a href="${escapeHTML(bookingUrl)}" 
                       target="_blank" 
                       class="primary-action-btn">
                        <i class="fas fa-external-link-alt"></i> Book
                    </a>
                ` : `
                    <button class="primary-action-btn" disabled>
                        No Link
                    </button>
                `}
                
                <button class="route-btn" 
                        onclick="viewRoute('${escapeHTML(location)}', '${escapeHTML(coordinates)}')">
                    <i class="fas fa-route"></i> Route
                </button>
            </div>
        </div>
    `;
    
    return card;
}
function getButtonText(source) {
    const buttonTexts = {
        'Kerala Tourism': 'Book via Kerala Tourism',
        'Karnataka Tourism': 'Book via Karnataka Tourism',
        'IRCTC': 'View on IRCTC',
        'Official': 'Visit Official Website',
        'default': 'View Details'
    };
    
    return buttonTexts[source] || buttonTexts.default;
}

function viewRoute(destination, coordinates) {
    // Encode parameters
    const params = new URLSearchParams({
        destination: encodeURIComponent(destination),
        coordinates: coordinates || ''
    });
    
    // Redirect to route.html
    window.location.href = `route.html?${params.toString()}`;
}

// ============================================
// FILTERING & SORTING
// ============================================

function filterPackages() {
    currentPage = 1;
    
    const searchTerm = DOM.searchInput.value.toLowerCase();
    const selectedCategory = DOM.categoryFilter.value;
    const selectedLocation = DOM.locationFilter.value;
    const selectedSource = DOM.sourceFilter.value;
    const selectedSeason = DOM.seasonFilter.value;
    
    filteredPackages = allPackages.filter(pkg => {
        // Search filter
        const matchesSearch = !searchTerm || 
            (pkg['Package Title'] && pkg['Package Title'].toLowerCase().includes(searchTerm)) ||
            (pkg['Location'] && pkg['Location'].toLowerCase().includes(searchTerm)) ||
            (pkg['Category'] && pkg['Category'].toLowerCase().includes(searchTerm)) ||
            (pkg['Operator Name'] && pkg['Operator Name'].toLowerCase().includes(searchTerm)) ||
            (pkg['Short Description'] && pkg['Short Description'].toLowerCase().includes(searchTerm));
        
        // Category filter
        const matchesCategory = !selectedCategory || pkg['Category'] === selectedCategory;
        
        // Location filter
        const matchesLocation = !selectedLocation || pkg['Location'] === selectedLocation;
        
        // Source filter
        let matchesSource = true;
        if (selectedSource) {
            if (selectedSource === 'Official') {
                matchesSource = pkg['Source'] === 'Official';
            } else if (selectedSource === 'Other') {
                matchesSource = !['Kerala Tourism', 'Karnataka Tourism', 'IRCTC', 'Official'].includes(pkg['Source']);
            } else {
                matchesSource = pkg['Source'] === selectedSource;
            }
        }
        
        // Season filter
        const matchesSeason = !selectedSeason || 
            (pkg['Best Season'] && pkg['Best Season'].toLowerCase().includes(selectedSeason.toLowerCase()));
        
        return matchesSearch && matchesCategory && matchesLocation && matchesSource && matchesSeason;
    });
    
    // Sort packages
    sortPackages();
    
    // Update active filters display
    updateActiveFilters();
    
    // Render packages
    renderPackages();
}

function sortPackages() {
    const sortBy = DOM.sortSelect.value;
    
    filteredPackages.sort((a, b) => {
        switch(sortBy) {
            case 'name':
                return (a['Package Title'] || '').localeCompare(b['Package Title'] || '');
            case 'nameDesc':
                return (b['Package Title'] || '').localeCompare(a['Package Title'] || '');
            case 'price':
                const priceA = parseFloat(a['Starting Price']?.replace(/[^0-9.]/g, '') || 9999999);
                const priceB = parseFloat(b['Starting Price']?.replace(/[^0-9.]/g, '') || 9999999);
                return priceA - priceB;
            case 'priceDesc':
                const priceA2 = parseFloat(a['Starting Price']?.replace(/[^0-9.]/g, '') || 0);
                const priceB2 = parseFloat(b['Starting Price']?.replace(/[^0-9.]/g, '') || 0);
                return priceB2 - priceA2;
            case 'duration':
                const durA = parseInt(a['Duration']?.split(' ')[0] || 0);
                const durB = parseInt(b['Duration']?.split(' ')[0] || 0);
                return durA - durB;
            case 'popular':
                return Math.random() - 0.5;
            default:
                return 0;
        }
    });
}

function updateActiveFilters() {
    const activeFilters = [];
    
    if (DOM.searchInput.value) {
        activeFilters.push({
            label: `Search: ${DOM.searchInput.value}`,
            clear: () => DOM.searchInput.value = ''
        });
    }
    
    if (DOM.categoryFilter.value) {
        activeFilters.push({
            label: `Category: ${DOM.categoryFilter.value}`,
            clear: () => DOM.categoryFilter.value = ''
        });
    }
    
    if (DOM.locationFilter.value) {
        activeFilters.push({
            label: `Location: ${DOM.locationFilter.value}`,
            clear: () => DOM.locationFilter.value = ''
        });
    }
    
    if (DOM.sourceFilter.value) {
        activeFilters.push({
            label: `Source: ${DOM.sourceFilter.value}`,
            clear: () => DOM.sourceFilter.value = ''
        });
    }
    
    if (DOM.seasonFilter.value) {
        activeFilters.push({
            label: `Season: ${DOM.seasonFilter.value}`,
            clear: () => DOM.seasonFilter.value = ''
        });
    }
    
    if (activeFilters.length > 0) {
        DOM.activeFilters.innerHTML = activeFilters.map((filter, index) => `
            <div class="filter-tag">
                ${filter.label}
                <button onclick="clearFilter(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    } else {
        DOM.activeFilters.innerHTML = '';
    }
}

function clearFilter(index) {
    const activeFilters = [];
    
    if (DOM.searchInput.value) activeFilters.push(() => DOM.searchInput.value = '');
    if (DOM.categoryFilter.value) activeFilters.push(() => DOM.categoryFilter.value = '');
    if (DOM.locationFilter.value) activeFilters.push(() => DOM.locationFilter.value = '');
    if (DOM.sourceFilter.value) activeFilters.push(() => DOM.sourceFilter.value = '');
    if (DOM.seasonFilter.value) activeFilters.push(() => DOM.seasonFilter.value = '');
    
    if (activeFilters[index]) {
        activeFilters[index]();
        filterPackages();
    }
}

// ============================================
// UI STATE MANAGEMENT
// ============================================

function showLoadingState() {
    DOM.packagesGrid.innerHTML = `
        <div class="loading-state">
            <div class="loader">
                <div class="plane">
                    <i class="fas fa-plane"></i>
                </div>
                <div class="loading-text">
                    <p>Loading authentic travel experiences...</p>
                    <div class="loading-progress">
                        <div class="progress-bar"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showErrorState(message) {
    DOM.packagesGrid.innerHTML = `
        <div class="no-results">
            <div class="no-results-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to load packages</h3>
                <p>${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                    <button onclick="loadPackages()" class="primary-btn">
                        <i class="fas fa-redo"></i>
                        Try Again
                    </button>
                    <button onclick="useSampleData()" class="secondary-btn" style="background: var(--accent);">
                        <i class="fas fa-eye"></i>
                        View Sample Data
                    </button>
                </div>
            </div>
        </div>
    `;
}

function useSampleData() {
    console.log('Using sample data...');
    // Create some sample data for testing
    const sampleData = [
        {
            'Package Title': 'Munnar Hill Station Tour',
            'Location': 'Munnar, Kerala',
            'Starting Price': '₹12,500',
            'Category': 'Hill Station',
            'Operator Name': 'Kerala Tourism',
            'Source': 'Kerala Tourism',
            'Duration': '3 Days 2 Nights',
            'Best Season': 'Winter',
            'Short Description': 'Experience the tea gardens and misty hills of Munnar',
            'Image URL': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
            'Booking URL': 'https://www.keralatourism.org'
        },
        {
            'Package Title': 'Coorg Coffee Plantation Stay',
            'Location': 'Coorg, Karnataka',
            'Starting Price': '₹15,000',
            'Category': 'Hill Station',
            'Operator Name': 'Karnataka Tourism',
            'Source': 'Karnataka Tourism',
            'Duration': '4 Days 3 Nights',
            'Best Season': 'All Year',
            'Short Description': 'Stay in a coffee plantation and explore the Western Ghats',
            'Image URL': 'https://images.unsplash.com/photo-1591608971362-f08b2a75731a?w=800',
            'Booking URL': 'https://www.karnatakatourism.org'
        }
    ];
    
    allPackages = sampleData;
    filteredPackages = [...sampleData];
    extractFilterValues(sampleData);
    updateStatistics(sampleData);
    renderCategories();
    renderPackages();
}

function toggleView(view) {
    DOM.packagesGrid.setAttribute('data-view', view);
    DOM.viewButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
}

function loadMorePackages() {
    if (!hasMorePackages) return;
    
    currentPage++;
    renderPackages();
}

function filterByCategory(category) {
    DOM.categoryFilter.value = category;
    filterPackages();
    
    // Scroll to packages section
    document.querySelector('#packages').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// THEME MANAGEMENT
// ============================================

function setTheme(theme) {
    DOM.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    currentTheme = theme;
}

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Theme toggle
    if (DOM.themeToggle) {
        DOM.themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Search
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', filterPackages);
    }
    
    if (DOM.clearSearch) {
        DOM.clearSearch.addEventListener('click', () => {
            DOM.searchInput.value = '';
            filterPackages();
        });
    }
    
    // Filters
    if (DOM.categoryFilter) {
        DOM.categoryFilter.addEventListener('change', filterPackages);
    }
    
    if (DOM.locationFilter) {
        DOM.locationFilter.addEventListener('change', filterPackages);
    }
    
    if (DOM.sourceFilter) {
        DOM.sourceFilter.addEventListener('change', filterPackages);
    }
    
    if (DOM.seasonFilter) {
        DOM.seasonFilter.addEventListener('change', filterPackages);
    }
    
    if (DOM.clearFilters) {
        DOM.clearFilters.addEventListener('click', () => {
            DOM.searchInput.value = '';
            DOM.categoryFilter.value = '';
            DOM.locationFilter.value = '';
            DOM.sourceFilter.value = '';
            DOM.seasonFilter.value = '';
            filterPackages();
        });
    }
    
    // Sorting
    if (DOM.sortSelect) {
        DOM.sortSelect.addEventListener('change', () => {
            sortPackages();
            renderPackages();
        });
    }
    
    // View toggle
    DOM.viewButtons.forEach(btn => {
        btn.addEventListener('click', () => toggleView(btn.dataset.view));
    });
    
    // Reset all
    if (DOM.resetAll) {
        DOM.resetAll.addEventListener('click', () => {
            DOM.searchInput.value = '';
            DOM.categoryFilter.value = '';
            DOM.locationFilter.value = '';
            DOM.sourceFilter.value = '';
            DOM.seasonFilter.value = '';
            DOM.sortSelect.value = 'name';
            toggleView('grid');
            filterPackages();
        });
    }
    
    // Load more
    if (DOM.loadMore) {
        DOM.loadMore.addEventListener('click', loadMorePackages);
    }
    
    // Back to top
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            DOM.backToTop.classList.add('visible');
        } else {
            DOM.backToTop.classList.remove('visible');
        }
    });
    
    if (DOM.backToTop) {
        DOM.backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    console.log('🚀 Initializing TravelDiscover...');
    
    // Set initial theme
    setTheme(currentTheme);
    
    // Setup event listeners
    setupEventListeners();
    
    // Load packages
    loadPackages();
    
    console.log('✅ TravelDiscover initialized successfully');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Make functions available globally
window.viewRoute = viewRoute;
window.clearFilter = clearFilter;
window.loadPackages = loadPackages;
window.filterByCategory = filterByCategory;
window.useSampleData = useSampleData;