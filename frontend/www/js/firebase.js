// ============================
// firebase.js
// ============================

console.log("🔥 firebase.js loaded");

const firebaseConfig = {
  apiKey: "AIzaSyB3xYi_hrjfhRalTK0XIrurY4SRS3B8azU",
  authDomain: "my-diaster-project-95132-a577c.firebaseapp.com",
  projectId: "my-diaster-project-95132-a577c",
  storageBucket: "my-diaster-project-95132-a577c.firebasestorage.app",
  messagingSenderId: "891281104626",
  appId: "1:891281104626:web:b2518d5c898f494fdf3a6b"
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
