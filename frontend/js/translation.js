// ==========================================
//  TRANSLATOR ENGINE
// ==========================================
const translations = {
    en: {
        app_title: "SafeNav AI",
        search_placeholder: "Where to?",
        start_nav: "Start Navigation",
        stop_nav: "Stop Navigation",
        sos_btn: "SOS Emergency",
        ai_guard: "AI Guard",
        status_active: "ACTIVE",
        status_sleep: "WAKE UP!",
        settings: "Settings",
        login: "Login",
        logout: "Logout",
        welcome: "Welcome to SafeNav",
        camera_alert: "Speed Camera Ahead",
        helmet_alert: "Please Wear Helmet"
    },
    hi: { // Hindi
        app_title: "सेफ-नैव AI",
        search_placeholder: "कहाँ जाना है?",
        start_nav: "नेविगेशन शुरू करें",
        stop_nav: "रुकें",
        sos_btn: "आपातकालीन SOS",
        ai_guard: "AI सुरक्षा",
        status_active: "सक्रिय",
        status_sleep: "जाग जाओ!",
        settings: "सेटिंग्स",
        login: "लॉग इन",
        logout: "लॉग आउट",
        welcome: "सेफ-नैव में आपका स्वागत है",
        camera_alert: "आगे स्पीड कैमरा है",
        helmet_alert: "कृपया हेलमेट पहनें"
    },
    kn: { // Kannada
        app_title: "ಸೇಫ್-ನ್ಯಾವ್ AI",
        search_placeholder: "ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?",
        start_nav: "ನ್ಯಾವಿಗೇಷನ್ ಪ್ರಾರಂಭಿಸಿ",
        stop_nav: "ನಿಲ್ಲಿಸಿ",
        sos_btn: "ತುರ್ತು SOS",
        ai_guard: "AI ರಕ್ಷಕ",
        status_active: "ಸಕ್ರಿಯ",
        status_sleep: "ಎದ್ದೇಳಿ!",
        settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
        login: "ಲಾಗಿನ್",
        logout: "ಲಾಗ್ ಔಟ್",
        welcome: "ಸೇಫ್-ನ್ಯಾವ್‌ಗೆ ಸುಸ್ವಾಗತ",
        camera_alert: "ಮುಂದೆ ವೇಗದ ಕ್ಯಾಮೆರಾ ಇದೆ",
        helmet_alert: "ದಯವಿಟ್ಟು ಹೆಲ್ಮೆಟ್ ಧರಿಸಿ"
    },
    es: { // Spanish
        app_title: "SafeNav AI",
        search_placeholder: "¿A dónde vas?",
        start_nav: "Iniciar Navegación",
        stop_nav: "Detener",
        sos_btn: "Emergencia SOS",
        ai_guard: "Guardia IA",
        status_active: "ACTIVO",
        status_sleep: "¡DESPIERTA!",
        settings: "Ajustes",
        login: "Acceso",
        logout: "Cerrar Sesión",
        welcome: "Bienvenido a SafeNav",
        camera_alert: "Cámara de velocidad adelante",
        helmet_alert: "Por favor use casco"
    }
};

// Make translations globally available so other scripts can read them
window.translations = translations;

// FUNCTION TO CHANGE LANGUAGE
function changeLanguage(langCode) {
    if (!translations[langCode]) return;

    // 1. Save preference
    localStorage.setItem('preferredLanguage', langCode);
    
    // 2. Update all text elements
    const elements = document.querySelectorAll('[data-lang-key]');
    
    elements.forEach(el => {
        const key = el.getAttribute('data-lang-key');
        if (translations[langCode][key]) {
            // Update placeholder for inputs, text for others
            if (el.tagName === 'INPUT') {
                el.placeholder = translations[langCode][key];
            } else {
                el.textContent = translations[langCode][key];
            }
        }
    });

    // 3. Update HTML lang tag (for accessibility)
    document.documentElement.lang = langCode;
    console.log(`🌍 Language switched to: ${langCode}`);
}

// AUTO-LOAD SAVED LANGUAGE
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    
    // Update the dropdown if it exists
    const selector = document.getElementById('languageSelector');
    if (selector) selector.value = savedLang;
    
    // Apply translations
    changeLanguage(savedLang);
});