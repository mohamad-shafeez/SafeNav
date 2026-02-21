// ================= CONFIGURATION =================
const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:5000' 
    : 'https://safenav-18sk.onrender.com';
// Note: Currency API key is okay here if it's a free public tier, 
// but ideally move to backend later. For now, we focus on AI.
const EXCHANGE_API_KEY = "767d15c92cbc866c2e3d4159";
// ================= LANGUAGES SUPPORT =================
const languages = {
    // Indian Languages
    en: { name: "English", native: "English", flag: "🇺🇸" },
    hi: { name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
    ta: { name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
    te: { name: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
    kn: { name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
    ml: { name: "Malayalam", native: "മലയാളം", flag: "🇮🇳" },
    bn: { name: "Bengali", native: "বাংলা", flag: "🇮🇳" },
    mr: { name: "Marathi", native: "मराठी", flag: "🇮🇳" },
    gu: { name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳" },
    pa: { name: "Punjabi", native: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
    ur: { name: "Urdu", native: "اردو", flag: "🇵🇰" },
    or: { name: "Odia", native: "ଓଡ଼ିଆ", flag: "🇮🇳" },
    as: { name: "Assamese", native: "অসমীয়া", flag: "🇮🇳" },
    // Foreign Languages
    fr: { name: "French", native: "Français", flag: "🇫🇷" },
    de: { name: "German", native: "Deutsch", flag: "🇩🇪" },
    es: { name: "Spanish", native: "Español", flag: "🇪🇸" },
    ja: { name: "Japanese", native: "日本語", flag: "🇯🇵" },
    ko: { name: "Korean", native: "한국어", flag: "🇰🇷" },
    zh: { name: "Chinese", native: "中文", flag: "🇨🇳" },
    ru: { name: "Russian", native: "Русский", flag: "🇷🇺" },
    ar: { name: "Arabic", native: "العربية", flag: "🇸🇦" },
    pt: { name: "Portuguese", native: "Português", flag: "🇵🇹" },
    it: { name: "Italian", native: "Italiano", flag: "🇮🇹" },
    nl: { name: "Dutch", native: "Nederlands", flag: "🇳🇱" },
    tr: { name: "Turkish", native: "Türkçe", flag: "🇹🇷" },
    pl: { name: "Polish", native: "Polski", flag: "🇵🇱" }
};

// ================= CURRENCIES =================
const currencies = {
    USD: { name: "US Dollar", symbol: "$" },
    INR: { name: "Indian Rupee", symbol: "₹" },
    EUR: { name: "Euro", symbol: "€" },
    GBP: { name: "British Pound", symbol: "£" },
    JPY: { name: "Japanese Yen", symbol: "¥" },
    AUD: { name: "Australian Dollar", symbol: "A$" },
    CAD: { name: "Canadian Dollar", symbol: "C$" },
    CHF: { name: "Swiss Franc", symbol: "CHF" },
    CNY: { name: "Chinese Yuan", symbol: "¥" },
    SGD: { name: "Singapore Dollar", symbol: "S$" },
    AED: { name: "UAE Dirham", symbol: "د.إ" },
    SAR: { name: "Saudi Riyal", symbol: "ر.س" },
    PKR: { name: "Pakistani Rupee", symbol: "₨" },
    BDT: { name: "Bangladeshi Taka", symbol: "৳" },
    LKR: { name: "Sri Lankan Rupee", symbol: "Rs" },
    NPR: { name: "Nepalese Rupee", symbol: "₨" }
};

// ================= INITIALIZATION =================
let recognizing = false;
let recognition = null;
let currentImage = null;
let chatHistory = [];
let currentImageFile = null; 
let convoRecognition = null;
let isListeningA = false;
let isListeningB = false;

// Initialize speech recognition
function initSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
            recognizing = true;
            document.getElementById('micBtn').classList.add('listening');
            document.getElementById('micStatus').textContent = "Listening...";
            showToast("Listening... Speak now", "info");
        };
        
        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('voiceResult').textContent = transcript;
            updateTextStats('voiceResult');
            
            // Auto-translate if both languages are different
            const fromLang = document.getElementById('voiceFrom').value;
            const toLang = document.getElementById('voiceTo').value;
            
            if (fromLang !== toLang) {
                await translateVoiceText();
            }
            
            showToast("Speech recognized successfully", "success");
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showToast(`Speech recognition error: ${event.error}`, "error");
        };
        
        recognition.onend = () => {
            recognizing = false;
            document.getElementById('micBtn').classList.remove('listening');
            document.getElementById('micStatus').textContent = "Ready";
        };
    } else {
        showToast("Speech recognition not supported in this browser", "error");
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Populate language dropdowns
    populateLanguageSelects();
    
    // Populate currency dropdowns
    populateCurrencySelects();
    
    // Initialize speech recognition
    initSpeechRecognition();
    
    // Initialize theme
    initTheme();
    
    // Initialize event listeners
    initEventListeners();
    
    // Populate language tags
    populateLanguageTags();
    
    // Load chat history from localStorage
    loadChatHistory();
    
    // Initialize text statistics
    updateTextStats('voiceResult');
    updateTextStats('imageResult');
    // POWER FEATURE: Auto Re-translate when "To" language changes
    document.getElementById('voiceTo').addEventListener('change', function() {
        const currentText = document.getElementById('voiceResult').textContent;
        // Only re-translate if there is actual text there
        if(currentText && !currentText.includes("Translated text will appear") && !currentText.includes("Heard:")) {
            const targetLang = this.value;
            // Re-run the translation function
            translateVoiceText(currentText, targetLang);
        }
    });
});

// ================= UTILITY FUNCTIONS =================
function showToast(message, type = "info") {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading(message = "Processing...") {
    const modal = document.getElementById('loadingModal');
    const textElement = document.getElementById('loadingText');
    
    // SAFETY CHECKS:
    if (textElement) textElement.textContent = message;
    if (modal) modal.style.display = 'flex';
}

function hideLoading() {
    const modal = document.getElementById('loadingModal');
    if (modal) modal.style.display = 'none';
}

function populateLanguageSelects() {
    const selects = ['voiceFrom', 'voiceTo', 'imageLang', 'chatLang'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '';
        
        Object.entries(languages).forEach(([code, lang]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${lang.flag} ${lang.name} (${lang.native})`;
            
            // Set defaults
            if (selectId === 'voiceFrom' && code === 'en') option.selected = true;
            if (selectId === 'voiceTo' && code === 'hi') option.selected = true;
            if (selectId === 'imageLang' && code === 'en') option.selected = true;
            if (selectId === 'chatLang' && code === 'en') option.selected = true;
            
            select.appendChild(option);
        });
    });
}

function populateCurrencySelects() {
    const fromSelect = document.getElementById('fromCurrency');
    const toSelect = document.getElementById('toCurrency');
    
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    
    Object.entries(currencies).forEach(([code, currency]) => {
        const option1 = document.createElement('option');
        option1.value = code;
        option1.textContent = `${code} - ${currency.name}`;
        
        const option2 = option1.cloneNode(true);
        
        if (code === 'USD') {
            option1.selected = true;
            document.getElementById('fromSymbol').textContent = currency.symbol;
        }
        if (code === 'INR') option2.selected = true;
        
        fromSelect.appendChild(option1);
        toSelect.appendChild(option2);
    });
}
function populateLanguageTags() {
    const container = document.getElementById('languageTags');
    // ADD THIS SAFETY CHECK:
    if (!container) return; 
    
    container.innerHTML = '';
    Object.entries(languages).forEach(([code, lang]) => {
        const tag = document.createElement('span');
        tag.className = 'language-tag';
        tag.textContent = `${lang.flag} ${lang.name}`;
        tag.title = lang.native;
        container.appendChild(tag);
    });
}

function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        showToast(`Switched to ${newTheme} theme`, "info");
    });
}

function initEventListeners() {
    // Enter key for chat
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });
    
    // Real-time text statistics
    document.getElementById('voiceResult').addEventListener('input', () => updateTextStats('voiceResult'));
    document.getElementById('imageResult').addEventListener('input', () => updateTextStats('imageResult'));
    
    // Voice input for chat
    document.getElementById('voiceInputBtn').addEventListener('click', startVoiceChatInput);
    
    // Auto-detect language from voice input
    document.getElementById('voiceFrom').addEventListener('change', function() {
        if (recognition) {
            recognition.lang = this.value;
        }
    });
    
    // Currency symbol update
    document.getElementById('fromCurrency').addEventListener('change', function() {
        const currency = currencies[this.value];
        if (currency) {
            document.getElementById('fromSymbol').textContent = currency.symbol;
        }
    });
}

function updateTextStats(textAreaId) {
    const textArea = document.getElementById(textAreaId);
    const text = textArea.value || textArea.textContent;
    
    const charCount = text.length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    
    document.getElementById(`${textAreaId === 'voiceResult' ? 'char' : 'ocrChar'}Count`).textContent = `Characters: ${charCount}`;
    document.getElementById(`${textAreaId === 'voiceResult' ? 'word' : 'ocrWord'}Count`).textContent = `Words: ${wordCount}`;
}

// ================= AI CHAT FUNCTIONS =================
async function sendChat() {
    const input = document.getElementById('chatInput');
    const chatWindow = document.getElementById('chatWindow');
    const message = input.value.trim();
    
    if (!message) {
        showToast("Please enter a message", "warning");
        return;
    }
    
    // Add user message to chat
    addChatMessage(message, 'user');
    input.value = '';
    
    showLoading("AI is thinking...");
    
    try {
        const targetLang = document.getElementById('chatLang').value;
        const response = await fetchGeminiAI(message, targetLang);
        
        // Add AI response to chat
        addChatMessage(response, 'ai');
        
        // Save to chat history
        saveToChatHistory(message, response);
        
    } catch (error) {
        console.error('Chat error:', error);
        addChatMessage("Sorry, I encountered an error. Please try again.", 'ai');
        showToast("AI chat error occurred", "error");
    } finally {
        hideLoading();
    }
}

async function fetchGeminiAI(message, targetLang = 'en') {
    try {
        // 1. Call Python Backend for Chat
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || "Failed to get response");
        }

        let aiText = data.reply;
        
        // 2. Translate if needed (using our new translate function)
        if (targetLang !== 'en') {
            aiText = await translateText(aiText, targetLang);
        }
        
        return aiText;

    } catch (error) {
        console.error('Backend AI error:', error);
        throw error;
    }
}
function addChatMessage(text, sender) {
    const chatWindow = document.getElementById('chatWindow');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="avatar">${sender === 'ai' ? 'AI' : 'You'}</div>
        <div class="message-content">
            <p>${text.replace(/\n/g, '<br>')}</p>
            <span class="message-time">${time}</span>
        </div>
    `;
    
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function quickChat(prompt) {
    document.getElementById('chatInput').value = prompt;
    sendChat();
}

function startVoiceChatInput() {
    if (!recognition) {
        showToast("Voice input not supported", "error");
        return;
    }
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('chatInput').value = transcript;
        showToast("Voice input captured", "success");
    };
    
    recognition.start();
}

function loadChatHistory() {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
        try {
            chatHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.error('Error loading chat history:', e);
            chatHistory = [];
        }
    }
}

function saveToChatHistory(userMessage, aiResponse) {
    chatHistory.push({
        user: userMessage,
        ai: aiResponse,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 messages
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }
    
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

async function translateText(text, targetLang) {
    if (!text || targetLang === 'en') return text;
    
    showLoading(`Translating to ${languages[targetLang]?.name || targetLang}...`);
    
    try {
        // Call Python Backend
        const response = await fetch(`${API_BASE_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                targetLang: targetLang
            })
        });
        
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Translation failed");
        }
        
        return data.translation;

    } catch (error) {
        console.error('Translation error:', error);
        showToast("Translation failed. Using original text.", "error");
        return text;
    } finally {
        hideLoading();
    }
}
async function translateVoiceText() {
    const text = document.getElementById('voiceResult').textContent;
    const targetLang = document.getElementById('voiceTo').value;
    
    if (!text.trim()) {
        showToast("No text to translate", "warning");
        return;
    }
    
    const translated = await translateText(text, targetLang);
    document.getElementById('voiceResult').textContent = translated;
    updateTextStats('voiceResult');
}

function swapLanguages() {
    const fromSelect = document.getElementById('voiceFrom');
    const toSelect = document.getElementById('voiceTo');
    
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    
    // Update speech recognition language
    if (recognition) {
        recognition.lang = fromSelect.value;
    }
    
    showToast("Languages swapped", "success");
}

function speakTranslation() {
    const text = document.getElementById('voiceResult').textContent;
    const lang = document.getElementById('voiceTo').value;
    
    if (!text.trim()) {
        showToast("No text to speak", "warning");
        return;
    }
    
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        utterance.onstart = () => {
            showToast("Speaking...", "info");
        };
        
        utterance.onend = () => {
            showToast("Speech completed", "success");
        };
        
        speechSynthesis.speak(utterance);
    } else {
        showToast("Text-to-speech not supported", "error");
    }
}

function copyTranslation() {
    const text = document.getElementById('voiceResult').textContent;
    
    if (!text.trim()) {
        showToast("No text to copy", "warning");
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied to clipboard", "success");
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast("Copy failed", "error");
    });
}

function clearTranslation() {
    document.getElementById('voiceResult').textContent = '';
    updateTextStats('voiceResult');
    showToast("Translation cleared", "info");
}

// ================= IMAGE OCR FUNCTIONS (SERVER-SIDE) =================



function processImage(input) {
    const file = input.files[0];
    if (!file) return;
    
    currentImageFile = file; // Save file for uploading

    const preview = document.getElementById('imagePreview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // Show preview
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width:100%;height:100%;object-fit:contain;">`;
        currentImage = e.target.result; 
        showToast("Image loaded successfully", "success");
    };
    
    reader.readAsDataURL(file);
}

function captureImage() {
    const preview = document.getElementById('imagePreview');
    const video = preview.querySelector('video');
    
    // Create a high-quality canvas capture
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    // 1. Convert to File Object (Crucial for Backend)
    canvas.toBlob(function(blob) {
        // Create a fake "file" from the camera blob
        currentImageFile = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
        
        // 2. Display Preview
        currentImage = canvas.toDataURL('image/jpeg');
        preview.innerHTML = `<img src="${currentImage}" alt="Captured" style="width:100%;height:100%;object-fit:contain;">`;
        
        stopCamera();
        showToast("Image captured! Ready to extract.", "success");
    }, 'image/jpeg', 0.95); // 0.95 = High Quality
}
async function extractText() {
    // FIX: Check both global window variable AND local variable
    const fileToUpload = window.currentImageFile || currentImageFile;

    if (!fileToUpload) {
        showToast("Please select or capture an image first", "warning");
        return;
    }
    
    showLoading("AI is analyzing text (High Accuracy)...");
    
    try {
        const targetLang = document.getElementById('imageLang').value;
        
        // Prepare data to send to Python Backend
        const formData = new FormData();
        formData.append('image', fileToUpload); // Use the variable we found above
        formData.append('targetLang', targetLang);

        // Call your new Python endpoint
        const response = await fetch(`${API_BASE_URL}/analyze-image`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('imageResult').value = data.result;
            updateTextStats('imageResult');
            showToast("Text extracted & translated!", "success");
        } else {
            document.getElementById('imageResult').value = "Error: " + (data.error || "Unknown error");
            showToast("Failed to analyze image", "error");
        }

    } catch (error) {
        console.error('OCR error:', error);
        showToast("Server error during image analysis", "error");
    } finally {
        hideLoading();
    }
}
async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `
            <video autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video>
            <div class="camera-controls">
                <button class="capture-btn" onclick="captureImage()">
                    <i class="fas fa-camera"></i>
                </button>
                <button class="cancel-btn" onclick="stopCamera()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        const video = preview.querySelector('video');
        video.srcObject = stream;
        
        // Store the stream for cleanup
        window.cameraStream = stream;
        
    } catch (error) {
        console.error('Camera error:', error);
        showToast("Failed to access camera: " + error.message, "error");
    }
}

// FIXED: Captures image and saves it as a file for the backend
function captureImage() {
    const preview = document.getElementById('imagePreview');
    const video = preview.querySelector('video');
    
    if (!video) {
        console.error("No video element found");
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    // Convert the canvas to a Blob, then to a File
    canvas.toBlob(function(blob) {
        // This is the CRITICAL line that fixes your error:
        // We assign the blob to the global variable expected by extractText()
        window.currentImageFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
        
        // Show Preview
        const url = URL.createObjectURL(blob);
        preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;">`;
        
        stopCamera();
    }, 'image/jpeg', 0.95);
}

function stopCamera() {
    if (window.cameraStream) {
        window.cameraStream.getTracks().forEach(track => track.stop());
        window.cameraStream = null;
    }
}

function clearImage() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `
        <div class="preview-placeholder">
            <i class="fas fa-image"></i>
            <p>No image selected</p>
        </div>
    `;
    document.getElementById('imageResult').value = '';
    currentImage = null;
    updateTextStats('imageResult');
    showToast("Image cleared", "info");
}

function copyOcrText() {
    const text = document.getElementById('imageResult').value;
    
    if (!text.trim()) {
        showToast("No text to copy", "warning");
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast("OCR text copied to clipboard", "success");
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast("Copy failed", "error");
    });
}
// Helper to make speech snappy (cancels previous audio immediately)
function speakText(text, lang) {
    if (!text.trim()) {
        showToast("No text to speak", "warning");
        return;
    }
    
    if ('speechSynthesis' in window) {
        // 1. THIS LINE FIXES THE LAG: Stop any current speech immediately
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0; // Slightly faster for a natural feel
        
        window.speechSynthesis.speak(utterance);
        showToast("Speaking...", "info");
    } else {
        showToast("Text-to-speech not supported", "error");
    }
}

// Update the OCR speak button to use the new helper
function speakOcrText() {
    const text = document.getElementById('imageResult').value;
    const lang = document.getElementById('imageLang').value;
    speakText(text, lang);
}

// Update the Voice Translator speak button too (optional but recommended)
function speakTranslation() {
    const text = document.getElementById('voiceResult').textContent;
    const lang = document.getElementById('voiceTo').value;
    speakText(text, lang);
}
// ================= CURRENCY CONVERTER FUNCTIONS =================
async function convertCurrency() {
    const amount = parseFloat(document.getElementById('amount').value);
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    
    if (!amount || amount <= 0) {
        showToast("Please enter a valid amount", "warning");
        return;
    }
    
    showLoading("Fetching exchange rates...");
    
    try {
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${fromCurrency}`);
        
        if (!response.ok) {
            throw new Error(`Currency API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.result !== 'success') {
            throw new Error(data['error-type'] || 'Unknown error');
        }
        
        const rate = data.conversion_rates[toCurrency];
        const convertedAmount = (amount * rate).toFixed(2);
        
        document.getElementById('exchangeRate').textContent = `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
        document.getElementById('lastUpdated').textContent = new Date(data.time_last_update_utc).toLocaleDateString();
        
        document.getElementById('rateResult').innerHTML = `
            <div class="result-display">
                <div class="amount-original">${amount.toFixed(2)} ${fromCurrency}</div>
                <div class="conversion-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="amount-converted">${convertedAmount} ${toCurrency}</div>
                <div class="conversion-rate">Rate: 1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}</div>
            </div>
        `;
        
        showToast("Conversion successful", "success");
    } catch (error) {
        console.error('Currency conversion error:', error);
        document.getElementById('rateResult').innerHTML = `
            <div class="result-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to fetch exchange rates. Please try again.</p>
            </div>
        `;
        showToast("Currency conversion failed", "error");
    } finally {
        hideLoading();
    }
}

function swapCurrencies() {
    const fromSelect = document.getElementById('fromCurrency');
    const toSelect = document.getElementById('toCurrency');
    
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    
    // Update currency symbol
    const currency = currencies[fromSelect.value];
    if (currency) {
        document.getElementById('fromSymbol').textContent = currency.symbol;
    }
    
    // Convert immediately if amount exists
    const amount = document.getElementById('amount').value;
    if (amount && amount > 0) {
        convertCurrency();
    }
    
    showToast("Currencies swapped", "success");
}

function quickConvert(from, to) {
    document.getElementById('fromCurrency').value = from;
    document.getElementById('toCurrency').value = to;
    
    // Update currency symbol
    const currency = currencies[from];
    if (currency) {
        document.getElementById('fromSymbol').textContent = currency.symbol;
    }
    
    // Convert if amount exists
    const amount = document.getElementById('amount').value;
    if (amount && amount > 0) {
        convertCurrency();
    } else {
        document.getElementById('amount').value = '100';
        convertCurrency();
    }
}

// ================= VOICE TRANSLATOR =================
function toggleMic() {
    if (!recognition) {
        showToast("Speech recognition not available", "error");
        return;
    }
    
    if (!recognizing) {
        // Set language for recognition
        const fromLang = document.getElementById('voiceFrom').value;
        recognition.lang = fromLang;
        recognition.start();
    } else {
        recognition.stop();
    }
}

// ================= ADDITIONAL FEATURES =================
// ================= DOCUMENT TRANSLATOR =================

function openDocumentTranslator() {
    document.getElementById('docModal').style.display = 'flex';
}

function closeDocTranslator() {
    document.getElementById('docModal').style.display = 'none';
}

// Handle Drag & Drop styling
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('click', () => document.getElementById('docInput').click());

// Handle Upload Logic
async function uploadAndTranslateDoc() {
    const fileInput = document.getElementById('docInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Please select a file first!");
        return;
    }

    const btn = document.querySelector('.btn-primary'); // The translate button
    btn.innerHTML = "Reading & Translating... (This may take time)";
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('targetLang', document.getElementById('docLang').value);

        const response = await fetch(`${API_BASE_URL}/translate-doc`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('docResult').style.display = 'block';
            document.getElementById('docOutput').innerText = data.translation;
        } else {
            alert("Error: " + data.error);
        }
    } catch (error) {
        console.error(error);
        alert("Server Error during upload.");
    } finally {
        btn.innerHTML = "Translate Document";
        btn.disabled = false;
    }
}

function downloadDoc() {
    const text = document.getElementById('docOutput').innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "translated_document.txt";
    a.click();
}

// ================= CONVERSATION MODE =================
// 1. ROBUST LANGUAGE MAPPING (Fixes "Not Working" languages)
// Browsers need 'hi-IN', not just 'hi'
const langMap = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'kn': 'kn-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'ml': 'ml-IN',
    'bn': 'bn-IN',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'ja': 'ja-JP',
    'zh': 'zh-CN',
    'ar': 'ar-SA',
    'ru': 'ru-RU'
};

function openConversationMode() {
    document.getElementById('conversationModal').style.display = 'flex';
    // Force browser to load voices immediately
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
    }
}

function closeConversationMode() {
    document.getElementById('conversationModal').style.display = 'none';
    stopConvo();
}

function stopConvo() {
    if (convoRecognition) {
        try { convoRecognition.stop(); } catch(e){}
        convoRecognition = null;
    }
    isListeningA = false;
    isListeningB = false;
    resetMicUI('A');
    resetMicUI('B');
}

function resetMicUI(person) {
    const btn = document.getElementById(`micBtn${person}`);
    const icon = btn ? btn.querySelector('i') : null;
    const panel = document.getElementById(`panel${person}`);
    const status = document.getElementById(`status${person}`);

    if(icon) icon.className = 'fas fa-microphone';
    if(btn) btn.classList.remove('listening');
    if(panel) panel.classList.remove('active');
    if(status) status.textContent = "Tap Mic to Speak";
}

function toggleConvoMic(person) {
    if ((person === 'A' && isListeningA) || (person === 'B' && isListeningB)) {
        stopConvo(); // Click to STOP
        return;
    }
    stopConvo(); // Stop others
    startListening(person); // Start THIS one
}

function startListening(person) {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        alert("Speech API not supported");
        return;
    }

    // Get selected codes (e.g., 'hi') and convert to 'hi-IN'
    const rawLangA = document.getElementById('convoLangA').value;
    const rawLangB = document.getElementById('convoLangB').value;
    
    const langCode = (person === 'A') ? langMap[rawLangA] : langMap[rawLangB];

    // UI Update
    if (person === 'A') isListeningA = true; else isListeningB = true;
    
    const btn = document.getElementById(`micBtn${person}`);
    const icon = btn.querySelector('i');
    icon.className = 'fas fa-stop'; // Stop Icon
    btn.classList.add('listening');
    document.getElementById(`panel${person}`).classList.add('active');
    document.getElementById(`status${person}`).textContent = "Listening... (Tap to Stop)";

    // Start Recognition
    convoRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    convoRecognition.lang = langCode; 
    convoRecognition.continuous = false;
    convoRecognition.interimResults = false;

    convoRecognition.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        
        // Show Heard Text
        document.getElementById(`result${person}`).textContent = text;
        document.getElementById(`status${person}`).textContent = "Translating...";
        
        stopConvo(); // Stop recording

        // Determine Targets
        const targetRawLang = (person === 'A') ? rawLangB : rawLangA; // 'kn'
        const targetLangCode = (person === 'A') ? langMap[rawLangB] : langMap[rawLangA]; // 'kn-IN'
        const targetPanel = (person === 'A') ? 'B' : 'A';

        try {
            const response = await fetch(`${API_BASE_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, targetLang: targetRawLang })
            });

            const data = await response.json();
            
            if (data.success) {
                // Show Translation
                document.getElementById(`result${targetPanel}`).textContent = data.translation;
                
                // Speak Result
                speakConvoResult(data.translation, targetLangCode);
            }
        } catch (e) {
            console.error(e);
        }
    };

    convoRecognition.onerror = (e) => {
        console.error("Speech Error:", e);
        stopConvo();
    };

    convoRecognition.start();
}

function speakConvoResult(text, langCode) {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode; // Use the fixed 'hi-IN' code
    u.rate = 1.0; 
    
    // Attempt to force the correct voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === langCode) || voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
    
    if (voice) {
        u.voice = voice;
        console.log(`Speaking with voice: ${voice.name}`);
    } else {
        console.warn(`No voice found for ${langCode}. Using default.`);
        // Fallback: Some browsers need to just be told the lang code without a specific voice object
    }

    window.speechSynthesis.speak(u);
}
// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('conversationModal');
    if (event.target == modal) {
        closeConversationMode();
    }
}

function openHistory() {
    showToast("History feature coming soon!", "info");
}

function openSettings() {
    showToast("Settings feature coming soon!", "info");
}