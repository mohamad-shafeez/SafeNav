// ============================
// firebase.js
// ============================

console.log("🔥 firebase.js loaded");

const firebaseConfig = {
  apiKey: "your_actual_new_api_key_here",
  authDomain: "xxxxxxxxx",
  projectId: "xxxxxxxxx",
  storageBucket: "xxxxxxxxxxxxx",
  messagingSenderId: "xxxxxxxxxx",
  appId: "xxxxxxxxxxxxxxxxxxxxxxxxx"
};

// Initialize Firebase ONLY ONCE
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized");
}

// Firestore (optional)
if (firebase.firestore) {
  window.db = firebase.firestore();
  console.log("🔥 Firestore ready");
} else {
  console.warn("⚠️ Firestore not loaded (safe)");
}
