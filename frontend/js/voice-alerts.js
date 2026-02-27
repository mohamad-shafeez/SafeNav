// ===============================
// 🗣️ PREMIUM VOICE ALERT SYSTEM 
// ===============================

let premiumVoice = null;
let lastSpokenInstruction = "";
let currentVoiceGender = "female"; // Default voice gender
window.isMuted = false; // 🔥 Global Mute State

function updateVoiceSelection() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;
    
    let preferredNames = [];
    
    if (currentVoiceGender === "female") {
        preferredNames = [
            'Google UK English Female',
            'Google US English Female',
            'Samantha',                 
            'Karen', 
            'Moira',                    
            'Microsoft Zira'            
        ];
    } else {
        preferredNames = [
            'Google UK English Male',
            'Google US English Male',
            'Daniel',                   
            'Alex',                     
            'Arthur',                   
            'Microsoft David'           
        ];
    }

    premiumVoice = null;

    // Strict English Enforcement! (Prevents Spanish 'Alex')
    for (let name of preferredNames) {
        premiumVoice = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
        if (premiumVoice) break; 
    }

    if (!premiumVoice) {
        premiumVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes(currentVoiceGender));
    }
    if (!premiumVoice) {
        premiumVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB');
    }
    
    console.log(`🗣️ Voice Engine Ready (${currentVoiceGender}):`, premiumVoice ? premiumVoice.name : "Default");
}

window.speechSynthesis.onvoiceschanged = updateVoiceSelection;

window.setVoiceGender = function(gender) {
    if (gender === 'male' || gender === 'female') {
        currentVoiceGender = gender;
        updateVoiceSelection();
        if (!window.isMuted) {
            speak(`Voice changed to ${gender} profile`, true); 
        }
    }
};

// Toggle Mute Function
window.toggleVoiceMute = function() {
    window.isMuted = !window.isMuted;
    if (window.isMuted) {
        window.speechSynthesis.cancel(); // Instantly shut up if currently talking
        console.log("🔇 Voice Navigation Muted");
    } else {
        console.log("🔊 Voice Navigation Unmuted");
        speak("Voice navigation enabled", true);
    }
    return window.isMuted;
};

function speak(text, priority = false) {
    if (!('speechSynthesis' in window)) return;
    if (window.isMuted) return; // 🔥 THE MUTE KILL SWITCH

    if (priority) {
        window.speechSynthesis.cancel();
    }

    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    msg.rate = 0.95; 
    msg.pitch = 1;
    msg.volume = 1;

    if (premiumVoice) {
        msg.voice = premiumVoice;
    } else {
        const voices = window.speechSynthesis.getVoices();
        msg.voice = voices.find(v => v.lang === 'en-US');
    }

    window.speechSynthesis.speak(msg);
}
// ===============================
// 🔀 DYNAMIC TURN-BY-TURN ALERT
// ===============================
window.speakTurnInstruction = function(instructionText) {
    if (instructionText && instructionText !== lastSpokenInstruction) {
        lastSpokenInstruction = instructionText;
        
        // 🔊 ONLY SPEAK IF NOT MUTED
        if (!window.isMuted) {
            console.log("🗣️ Speaking Nav:", instructionText);
            speak(instructionText, true); 
        }
    }
};

window.resetVoiceMemory = function() {
    lastSpokenInstruction = "";
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
    }
};

// ===============================
// 🛡️ ROUTE RISK ALERT
// ===============================
window.speakRouteRisk = function (riskLevel) {
    let message = '';

    if (riskLevel === 'low') {
        message = 'This route is safe. No major risks detected.';
    } else if (riskLevel === 'medium') {
        message = 'Caution. This route has moderate risk. Stay alert.';
    } else if (riskLevel === 'high') {
        message = 'Warning! High risk route detected. Consider an alternative path.';
    }

    speak(message, true);
};

// ===============================
// 🌪️ DISASTER PREDICTION ALERT
// ===============================
window.speakDisasterRisk = function (risk, confidence) {
    let message = `Disaster risk level is ${risk}.`;

    if (confidence) {
        message += ` Prediction confidence is ${confidence} percent.`;
    }

    if (risk === 'high') {
        message += ' Please follow safety instructions immediately.';
    }

    speak(message, true);
};

// ===============================
// 🚨 SOS ALERT
// ===============================
window.speakSOS = function () {
    speak(
        'Emergency SOS activated. Nearby police and hospitals are being located.',
        true
    );
};