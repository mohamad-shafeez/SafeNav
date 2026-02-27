// ===============================
// VOICE ALERT SYSTEM 
// ===============================

function speak(text, priority = false) {
  if (!('speechSynthesis' in window)) return;

  // Stop previous speech if priority
  if (priority) {
    speechSynthesis.cancel();
  }

  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'en-US';
  msg.rate = 0.95;
  msg.pitch = 1;
  msg.volume = 1;

  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang === 'en-US');
  if (preferred) msg.voice = preferred;

  speechSynthesis.speak(msg);
}

// ===============================
// ROUTE RISK ALERT
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
// DISASTER PREDICTION ALERT
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
// SOS ALERT
// ===============================
window.speakSOS = function () {
  speak(
    'Emergency SOS activated. Nearby police and hospitals are being located.',
    true
  );
};
