# SafeNav: Decoupled AI-Powered Travel Safety PWA

SafeNav is an AI-powered travel safety engine that combines live environmental data and health-aware risk modeling to generate personalized itineraries and real-time safety guidance. It synthesizes live environmental variables (Weather, AQI, Traffic) with Google’s Gemini AI to deliver context-aware safety directives tailored to individual user health profiles.

> **Deterministic Output Layer:** SafeNav transforms unstructured environmental data into deterministic, machine-readable safety signals using a hybrid of rule-based mathematical heuristics and LLM-assisted generation. This ensures stable and predictable safety scoring despite noisy, real-world inputs.

---

## 🚧 Live Demo
The video demonstration and architecture walkthrough are available here: [Google Drive Walkthrough](https://drive.google.com/file/d/1Bc9oYDfGGSERi5KU-XpOtrF12JbCOkti/view?usp=drive_link)

* **GitHub Repository:** [SafeNav Repository](https://github.com/mohamad-shafeez/safenav)
*(A live screen demo and architecture walkthrough are available upon request).*

---

## 🛠️ Tech Stack Matrix

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Custom Glassmorphism UI), Vanilla JavaScript (ES6+), MapLibre GL JS & Leaflet.js (Interactive Mapping), Capacitor (Mobile Bridge) |
| **Backend** | Python 3.12, Flask 3.1.2, Gunicorn |
| **AI Engine** | Google Gemini 1.5 Flash & 2.5 Flash Lite (`google-genai` & `google-generativeai` SDKs) |
| **Navigation** | TomTom Routing & Incidents API, Polyline Encoding |
| **Environmental** | OpenWeatherMap (Weather), WAQI (Air Quality Index), RainViewer (Radar) |
| **PWA Features** | Service Workers (Stale-While-Revalidate Strategy), Web App Manifest |
| **Security/Auth** | Firebase Admin SDK, JWT, Fernet Encryption (Cryptography.io), LocalStorage State |
| **Hosting** | Render (Live API), Vercel (Production/Fallback Builds), Firebase (Hosting) |

---

## 🧠 System Capabilities & Implementation Logic

### 1. Dynamic Risk Calculation Heuristics
The core engine (implemented in `prediction_engine.py`) computes a **Safety Score** (0-100) based on cumulative environmental stress and health vulnerabilities:
- **Exposure Multiplier**: Risk scales non-linearly with travel duration:
  - $30 \text{ min} = 1.0x$
  - $60 \text{ min} = 1.5x$
  - $120+ \text{ min} = 2.0x$
- **Adaptive Heat Thresholds**: Temperature limits are dynamically set based on the user's medical profile (e.g., 31°C for cardiac/elderly vs. 38°C for standard).
- **Physical Exertion Penalty**: Walking in extreme temperatures (>30°C) or poor air quality (>70 AQI) adds a direct `+15 * duration_multiplier` heart-strain penalty.
- **AQI Sensitivity**: Triggers respiratory health alerts at 55 AQI for asthma profiles vs. 100 AQI for standard users.

### 2. TomTom Incident Intelligence
Real-time hazard monitoring is executed along the active route (see `route_engine.py`):
- **BBox Incident Scanning**: The system calculates a bounding box from route coordinates and fetches live incidents from TomTom's `incidentDetails` service.
- **Incident Limit**: Critical hazards (Accidents, Fog, Lane Closures) are capped at **50 items** to prevent frontend browser rendering lag.
- **Traffic Delay Analysis**: Real-time delays are extracted from TomTom `trafficDelayInSeconds` to categorize congestion levels (Light, Medium, Heavy).

### 3. Gemini AI Integration & Directive Engine
SafeNav leverages multiple Google Gemini models for contextual travel guidance:
- **Safety Directive Engine**: Uses `gemini-1.5-flash` to process structured user profiles, environmental factors, and risk scores, generating low-latency, 1-sentence safety directives in raw text format.
- **Itinerary Generator**: Utilizes `gemini-2.5-flash-lite` for high-performance and structured itinerary JSON planning, respecting budget constraints and user preferences.
- **Retry Shield & Failover**: Implements exponential backoff retry logic ($wait = attempt \times 20s$) and API key rotation across configured developer profiles to protect against 429 quota and 503 service limits.

### 4. Spoken Warnings & Accessibility Engine
A native TTS-powered accessibility engine (implemented in `voice.py` and `voice-alerts.js`):
- **Real-Time Voice Alerts**: Announces spoken warnings for high-risk environmental factors (e.g., extreme heat warnings, poor air quality) along the active route.
- **Hydration Reminders**: Periodically alerts walking users of necessary hydration intervals based on live heat-strain parameters.

### 5. SafeNav Secure Vault
A dedicated document management system (implemented in `documents_engine.py`):
- **Encryption Tiers**: Supports Standard, **Military-Grade (AES + HMAC)**, and Biometric-locked encryption.
- **AI Analysis**: Uses Gemini Vision to extract and validate data from Passports, Visas, and IDs.
- **Integrity Check**: Calculates file entropy to verify document integrity before storage.

---

## 📂 Project Directory Structure

```text
safenav/
├── backend/
│   ├── routes/              # Flask Blueprints (Route, Planner, Auth, Voice)
│   ├── services/            # Core Logic (Prediction, Route, Stay, Documents)
│   ├── app.py               # API Entry Point
│   ├── vercel.json          # Deployment Config
│   └── requirements.txt     # Backend Dependencies
├── frontend/
│   ├── js/                  # Logic Modules (Route-Core, Auth, Translation)
│   ├── css/                 # Cyberpunk UI Tokens & Glassmorphism Styles
│   ├── sw.js                # Service Worker Engine (Zero-Latency Strategy)
│   └── index.html           # Main UI Gateway
├── firebase.json            # Firebase Hosting/Function Config
└── capacitor.config.json    # Native Mobile Build Settings
```

---

## 🚀 Deployment Config
- **Production Backend**: Hosted on **Render** (`safenav-18sk.onrender.com`).
- **Serverless Fallback**: Configured for Vercel using `@vercel/python` in `backend/vercel.json`.
- **PWA Strategy**: Uses a **Stale-While-Revalidate** caching policy in `sw.js` to ensure the app shell loads in 0ms while refreshing assets in the background.

---

## ⚠️ Failure Handling & Edge Cases
- Handles missing API responses using cached or fallback values.
- Prevents extreme fluctuations in safety score due to sudden data spikes.
- Ensures graceful degradation when external services are unavailable.
- Maintains consistent output format even under partial system failure.

SafeNav operates on a decoupled architecture designed for scalability and fault tolerance:
1. **The Client (Frontend)**: Manages user state via Firebase and LocalStorage, handling UI rendering and asynchronous API requests.
2. **The Gateway (Flask API)**: Receives the payload, enforces CORS policies, and securely proxies requests to external APIs.
3. **The Logic Engine**: Parses raw satellite data, applies health-specific mathematical multipliers (e.g., lowering heat thresholds for cardiac patients), and injects the synthesized context into the LLM prompt.

---

## 🔧 Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mohamad-shafeez/SafeNav.git
   cd SafeNav
   ```
2. **Set up the Backend environment:**
   Create a `.env` file in the `backend` directory and add your API keys (see `backend/.env.example` if available, or populate keys for TomTom, OpenWeatherMap, WAQI, and Gemini).
3. **Start the Flask server:**
   ```bash
   python backend/app.py
   ```
4. **Deploy the frontend:**
   Open `frontend/index.html` locally or deploy using Firebase Hosting.

---
*Developed for Final Year Project (FYP).*
