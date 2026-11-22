// ============================
// firebase.js
// ============================

console.log("🔥 firebase.js loaded");

// Supply this object from an ignored config.js (see config.example.js).
// Never commit a real Firebase web config to a public repository.
const firebaseConfig = window.SAFENAV_FIREBASE_CONFIG;

if (!firebaseConfig) {
  console.error(
    "Firebase web config is missing. Create frontend/config.js from " +
    "config.example.js and set window.SAFENAV_FIREBASE_CONFIG."
  );
} else if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized");
}

// Firestore (optional)
if (firebase.apps.length && firebase.firestore) {
  window.db = firebase.firestore();
  console.log("🔥 Firestore ready");
} else {
  console.warn("⚠️ Firestore not initialized (missing config or SDK)");
}
