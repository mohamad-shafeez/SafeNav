// Rename this file to config.js and add your actual API keys.
// This file is intentionally ignored by Git.
const CONFIG = {
    TOMTOM_KEY: window.TOMTOM_API_KEY || "YOUR_TOMTOM_API_KEY_HERE",
    BACKEND_URL: window.BACKEND_URL || "http://127.0.0.1:5000"
};

// Optional: only used to choose the admin redirect in the browser. The backend
// still enforces ADMIN_EMAILS on every /api/admin request.
window.SAFENAV_ADMIN_EMAILS = window.SAFENAV_ADMIN_EMAILS || [];

// Optional: supply a real Firebase web config here or in a separate script.
// window.SAFENAV_FIREBASE_CONFIG = {
//   apiKey: "...",
//   authDomain: "...",
//   projectId: "...",
//   storageBucket: "...",
//   messagingSenderId: "...",
//   appId: "..."
// };