<p align="center">
  <img src="frontend/assets/icon-192.png" alt="SafeNav Logo" width="120" />
</p>

<h1 align="center">SafeNav</h1>

<p align="center">
  <strong>AI-Powered Travel Safety Engine with Real-Time Environmental Intelligence</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-demo">Demo</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.12-blue?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/flask-3.1.2-green?logo=flask&logoColor=white" alt="Flask">
  <img src="https://img.shields.io/badge/gemini-AI--Powered-blueviolet?logo=google&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/firebase-auth%20%26%20hosting-orange?logo=firebase&logoColor=white" alt="Firebase">
  <img src="https://img.shields.io/badge/PWA-enabled-brightgreen?logo=pwa&logoColor=white" alt="PWA">
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="License">
</p>

---

## 📋 Overview

SafeNav is a full-stack, health-aware travel safety platform that synthesizes **live environmental data** (weather, air quality, traffic incidents) with **Google Gemini AI** to deliver personalized safety directives, optimized routing, and AI-generated itineraries — all tailored to individual user health profiles.

> **Deterministic Output Layer:** SafeNav transforms unstructured environmental data into deterministic, machine-readable safety signals using a hybrid of rule-based mathematical heuristics and LLM-assisted generation. This ensures stable and predictable safety scoring despite noisy, real-world inputs.

---

## 🎥 Demo

| Resource | Link |
| :--- | :--- |
| **Video Walkthrough** | [Google Drive](https://drive.google.com/file/d/1Bc9oYDfGGSERi5KU-XpOtrF12JbCOkti/view?usp=drive_link) |
| **GitHub Repository** | [github.com/mohamad-shafeez/SafeNav](https://github.com/mohamad-shafeez/SafeNav) |

---

## ✨ Features

### 🛡️ Dynamic Risk Prediction Engine
- **Composite Safety Score (0–150)** computed from cumulative environmental stress and user-specific health vulnerabilities
- **Exposure Multiplier** — risk scales non-linearly with travel duration (30 min = 1.0×, 60 min = 1.5×, 120+ min = 2.0×)
- **Adaptive Thresholds** — heat limits dynamically adjust based on medical profile (31°C for cardiac/elderly vs. 38°C for standard)
- **Physical Exertion Penalty** — walking in extreme conditions triggers a heart-strain penalty proportional to duration
- **AQI Sensitivity** — respiratory health alerts fire at 55 AQI for asthma profiles vs. 100 AQI for standard users

### 🗺️ Intelligent Route Engine
- **TomTom-powered routing** with real-time traffic delay analysis from `trafficDelayInSeconds`
- **Live Incident Intelligence** — BBox scanning fetches accidents, fog, lane closures (capped at 50 items) via TomTom's `incidentDetails` API
- **Dual-Engine Scoring** — SafeNav route (green, health-optimized) vs. Fastest route (orange/red, speed-optimized)
- **Comprehensive Analytics** — fuel consumption, CO₂ emissions, toll costs, safety score, road type breakdown
- **Haversine Distance** — server-side geodesic calculations for precise coordinate math

### 🤖 Gemini AI Integration
- **Safety Directives** — `gemini-1.5-flash` generates 1-sentence personalized safety advice in raw text
- **Itinerary Generator** — `gemini-1.5-flash` produces structured JSON travel plans respecting budget, vibe, health constraints
- **Smart Chat** — conversational AI travel assistant
- **Image Analysis (OCR)** — extract and translate text from images using Gemini Vision
- **Document Translation** — translate PDF/TXT documents across 19 languages
- **Retry Shield** — exponential backoff (wait = attempt × 20s) with API key rotation for 429/503 resilience

### 🏨 Stay Safety Analysis
- **Real-time Weather Risk Scoring** — thunderstorm and flood risk penalties from OpenWeatherMap
- **Regional Heuristics** — latitude-based risk adjustments for seasonal hazard zones
- **Tiered Classification** — Low / Medium / High risk with TTS-ready alert messages

### 📄 Secure Document Vault
- **Multi-Tier Encryption** — Standard (AES-256), Military-Grade (AES + HMAC), Biometric, and Quantum-Resistant tiers
- **AI Document Analysis** — Gemini Vision extracts and validates data from Passports, Visas, IDs, Medical Reports
- **File Integrity** — SHA-256 checksums and entropy validation before storage
- **22 Document Types** — Passport, Aadhar, PAN, Visa, Travel Insurance, Medical Reports, Forex Receipts, and more
- **Secure Lifecycle** — upload → AI analysis → encryption → storage → decryption → secure wipe

### 🔊 Voice & Accessibility Engine
- **Real-Time Voice Alerts** — TTS-powered spoken warnings for extreme heat, poor air quality along the active route
- **Hydration Reminders** — periodic alerts for walking users based on live heat-strain parameters
- **Multi-Language TTS** — supports 19 languages including Hindi, Tamil, Telugu, Japanese, Korean, and more
- **Speech-to-Text Analysis** — audio file transcription via Google Cloud Speech API

### 🌐 AI Travel Toolkit
- **Smart Chat** — context-aware conversational travel assistant
- **Universal Translator** — text, image (OCR), and document translation across 19 languages
- **Itinerary Planner** — budget-aware, health-conscious AI trip planning with structured JSON output
- **Image Proxy** — secure Unsplash integration for destination imagery

### 🛡️ Admin Command Center
- **JWT-Verified Admin Dashboard** — Firebase token authentication with hardcoded admin whitelist
- **User Management** — ban, unban, delete users, and modify roles via Firebase Auth + Firestore
- **Kill Switch** — system-wide threat level control (L0–L3) with immutable audit logging
- **API Quota Monitoring** — real-time tracking of OpenWeatherMap, WAQI, Gemini, and Nominatim usage
- **Vault Purge** — admin-level document force-deletion with audit trail
- **Health Profile Analytics** — aggregated user health condition statistics

### ⚡ Progressive Web App (PWA)
- **Stale-While-Revalidate** caching strategy — app shell loads instantly while assets refresh in background
- **Offline Fallback** — graceful 404 page when navigation fails offline
- **Smart Cache Exclusions** — API calls, Firebase, external map tiles, and weather radar are never cached
- **Installable** — standalone display with maskable icons (192px, 512px)

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Custom Glassmorphism UI), Vanilla JavaScript (ES6+), MapLibre GL JS, Leaflet.js, Capacitor |
| **Backend** | Python 3.12, Flask 3.1.2, Flask-CORS, Gunicorn 25.1.0 |
| **AI / ML** | Google Gemini 1.5 Flash (`google-generativeai` 0.8.6, `google-genai` 1.64.0) |
| **Navigation** | TomTom Routing API, TomTom Incidents API, Polyline Encoding |
| **Environmental** | OpenWeatherMap (Weather), WAQI (Air Quality Index), RainViewer (Radar) |
| **Image** | Unsplash API (Destination Imagery), Pillow (Image Processing) |
| **Document** | PyPDF2 (PDF Parsing), Gemini Vision (OCR & Validation) |
| **Security** | Firebase Admin SDK, JWT Verification, Fernet Encryption (AES-256-CBC), PBKDF2-HMAC-SHA256, SHA-256 Checksums |
| **PWA** | Service Workers (Stale-While-Revalidate), Web App Manifest, Capacitor (Native Bridge) |
| **Hosting** | Render (Backend API), Firebase Hosting (Frontend), Vercel (Serverless Fallback) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Frontend)                          │
│  HTML5 + CSS3 (Glassmorphism) + Vanilla JS + MapLibre + Leaflet   │
│  Firebase Auth (JWT) │ Service Worker (PWA) │ Capacitor (Mobile)   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS / REST API
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        GATEWAY (Flask API)                         │
│          CORS Enforcement │ Blueprint Router │ JWT Validation       │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Route   │ │Prediction│ │ Planner  │ │  Vault   │ │  Admin   │ │
│  │ Blueprint│ │ Blueprint│ │ Blueprint│ │ Blueprint│ │ Blueprint│ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
└───────┼────────────┼────────────┼────────────┼────────────┼────────┘
        ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LOGIC ENGINE (Services)                       │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  Route Engine    │  │Prediction Engine │  │ Documents Engine  │  │
│  │  (TomTom API)    │  │(Weather+AQI+AI)  │  │ (Encrypt+AI+OCR) │  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬──────────┘  │
│  ┌────────┴────────┐  ┌────────┴─────────┐  ┌────────┴──────────┐  │
│  │  Stay Engine    │  │ Planner Engine   │  │ Security Manager  │  │
│  │(Weather+Heuristic) │(Gemini Itinerary)│  │(Fernet+AES+HMAC) │  │
│  └─────────────────┘  └──────────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
        │                     │                      │
        ▼                     ▼                      ▼
┌───────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ External APIs │  │  Firebase / GCP  │  │   Local Storage    │
│ TomTom        │  │  Firestore       │  │  vault_storage/    │
│ OpenWeatherMap│  │  Auth             │  │  encrypted_files/  │
│ WAQI          │  │  Analytics        │  │  keys/             │
│ Unsplash      │  │  Audit Logs       │  │  metadata.json     │
│ Nominatim     │  │                    │  │                    │
└───────────────┘  └──────────────────┘  └────────────────────┘
```

---

## 📂 Project Structure

```
safenav/
├── backend/
│   ├── app.py                        # Flask application factory & entry point
│   ├── config.py                     # Vault storage paths & file validation
│   ├── vercel.json                   # Vercel serverless deployment config
│   ├── requirements.txt              # Python dependencies (pinned versions)
│   │
│   ├── routes/                       # Flask Blueprints (API layer)
│   │   ├── auth.py                   # Authentication endpoint stub
│   │   ├── route.py                  # Routing, analytics, cost, weather, optimization
│   │   ├── prediction.py             # Environmental risk prediction endpoint
│   │   ├── planner.py                # AI trip planner endpoint
│   │   ├── stays.py                  # Stay safety analysis endpoint
│   │   ├── tools.py                  # Chat, translate, OCR, itinerary, image proxy
│   │   ├── voice.py                  # TTS synthesis & speech-to-text
│   │   ├── documents.py              # Document data models & enums
│   │   ├── documents_routes.py       # Vault CRUD API (upload/download/delete)
│   │   └── dashboard.py              # Admin command center & analytics API
│   │
│   ├── services/                     # Core business logic
│   │   ├── route_engine.py           # TomTom routing, incidents, fuel & CO₂ math
│   │   ├── prediction_engine.py      # Weather + AQI + Gemini risk calculator
│   │   ├── planner_engine.py         # Gemini itinerary generator with retry shield
│   │   ├── stay_engine.py            # Weather-aware stay risk scoring
│   │   ├── documents_engine.py       # Full vault lifecycle (AI + encryption + storage)
│   │   └── image_service.py          # Unsplash destination image fetcher
│   │
│   ├── utils/                        # Shared utilities
│   │   ├── security_utils.py         # SecurityManager (Fernet, AES-256, checksums)
│   │   ├── data_manager.py           # JSON metadata CRUD, audit logging, statistics
│   │   ├── firebase_admin.py         # Firebase Admin SDK initialization helper
│   │   ├── firebase_auth.py          # Firebase authentication utilities
│   │   ├── jwt_helper.py             # JWT token utilities
│   │   └── risk_logic.py             # Basic speed/distance risk heuristics
│   │
│   └── models/                       # Data models
│       ├── user.py                   # User model
│       └── stay.py                   # Stay model
│
├── frontend/
│   ├── index.html                    # Main application gateway
│   ├── route.html                    # Route planning & navigation interface
│   ├── prediction.html               # Environmental risk prediction dashboard
│   ├── planner.html                  # AI trip planner interface
│   ├── stays.html                    # Stay safety analysis interface
│   ├── documents.html                # Secure document vault interface
│   ├── tools.html                    # AI toolkit (chat, translate, OCR)
│   ├── dashboard.html                # User dashboard
│   ├── admin.html                    # Admin command center
│   ├── package.html                  # Travel package explorer
│   ├── login.html                    # Authentication - login
│   ├── signup.html                   # Authentication - registration
│   ├── navbar.html                   # Shared navigation component
│   ├── 404.html                      # Offline fallback page
│   ├── sw.js                         # Service Worker (Stale-While-Revalidate)
│   ├── service-worker.js             # Service Worker (alternate registration)
│   ├── manifest.json                 # PWA manifest (icons, theme, display)
│   ├── capacitor.config.json         # Capacitor native mobile bridge config
│   ├── config.example.js             # Frontend config template (API keys)
│   │
│   ├── js/                           # Frontend logic modules
│   │   ├── route-core.js             # Core routing logic & map rendering
│   │   ├── route-premium.js          # Premium route features
│   │   ├── prediction.js             # Risk prediction UI logic
│   │   ├── planner.js                # AI planner UI logic
│   │   ├── stays.js                  # Stay analysis UI logic
│   │   ├── vault.js                  # Document vault UI logic
│   │   ├── tools.js                  # AI toolkit UI logic
│   │   ├── dashboard.js              # Dashboard UI logic
│   │   ├── admin-dashboard.js        # Admin command center UI
│   │   ├── package.js                # Travel packages UI
│   │   ├── auth.js                   # Firebase authentication logic
│   │   ├── firebase.js               # Firebase SDK initialization
│   │   ├── navbar.js                 # Navigation component logic
│   │   ├── bg-canvas.js              # Background canvas animations
│   │   ├── translation.js            # Translation module
│   │   ├── voice-alerts.js           # Voice alert & TTS controller
│   │   └── service-worker.js         # Service worker registration
│   │
│   ├── css/                          # Stylesheets
│   │   ├── style.css                 # Global design tokens
│   │   ├── auth.css                  # Authentication pages
│   │   ├── dashboard.css             # Dashboard styles
│   │   ├── route.css                 # Route planner styles
│   │   ├── prediction.css            # Prediction dashboard styles
│   │   ├── planner.css               # AI planner styles
│   │   ├── stays.css                 # Stay analysis styles
│   │   ├── vault.css                 # Document vault styles
│   │   ├── tools.css                 # AI toolkit styles
│   │   ├── package.css               # Travel package styles
│   │   ├── navbar.css                # Navigation styles
│   │   └── admin-analytics.css       # Admin dashboard styles
│   │
│   └── assets/                       # Static media assets
│       └── icon-192.png              # PWA icon (192×192)
│
├── firebase.json                     # Firebase Hosting configuration
├── .firebaserc                       # Firebase project alias
├── requirements.txt                  # Root-level Python dependencies
└── .gitignore                        # Git exclusion rules
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.10+
- **Node.js** 16+ (optional, for Capacitor builds)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/mohamad-shafeez/SafeNav.git
cd SafeNav
```

### 2. Set Up the Backend

```bash
# Create and activate a virtual environment
python -m venv backend/venv
source backend/venv/bin/activate        # macOS/Linux
backend\venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# --- AI Engine ---
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_API_KEY=your_gemini_api_key_backup
PLANNER_API_KEY=your_planner_gemini_key

# --- Navigation ---
TOMTOM_API_KEY=your_tomtom_api_key

# --- Environmental Data ---
OPENWEATHER_API_KEY=your_openweathermap_key
AQI_TOKEN=your_waqi_token

# --- Image Service ---
UNSPLASH_ACCESS_KEY=your_unsplash_key

# --- Firebase ---
FIREBASE_PROJECT_ID=your_firebase_project_id

# --- App ---
SECRET_KEY=your_flask_secret_key
```

### 4. Configure Firebase (Optional)

Place your `serviceAccountKey.json` in the `backend/` directory for Firebase Admin SDK initialization. Without it, the app falls back to project ID–based initialization.

### 5. Configure the Frontend

```bash
# Copy the config template
cp frontend/config.example.js frontend/config.js

# Edit config.js with your API keys
```

### 6. Start the Development Server

```bash
python backend/app.py
```

The API server will start at `http://127.0.0.1:5000`.

### 7. Open the Frontend

Open `frontend/index.html` in your browser, or deploy via Firebase Hosting:

```bash
firebase deploy --only hosting
```

---

## 🌐 Environment Variables

| Variable | Service | Required | Description |
| :--- | :--- | :---: | :--- |
| `GOOGLE_API_KEY` | Gemini AI | ✅ | Primary Gemini API key for prediction & directives |
| `GEMINI_API_KEY` | Gemini AI | ⚡ | Backup key for retry shield rotation |
| `PLANNER_API_KEY` | Gemini AI | ⚡ | Dedicated key for itinerary generation |
| `TOMTOM_API_KEY` | TomTom | ✅ | Routing, traffic, and incident data |
| `OPENWEATHER_API_KEY` | OpenWeatherMap | ✅ | Real-time weather data |
| `AQI_TOKEN` | WAQI | ✅ | Air Quality Index data |
| `UNSPLASH_ACCESS_KEY` | Unsplash | ⚡ | Destination imagery |
| `FIREBASE_PROJECT_ID` | Firebase | ⚡ | Fallback if `serviceAccountKey.json` is missing |
| `SECRET_KEY` | Flask | ⚡ | Flask session secret key |

> ✅ = Required for core functionality &nbsp;&nbsp; ⚡ = Optional / Fallback

---

## 📡 API Reference

### Health Check

```
GET  /api/health
```

### Prediction Engine

```
POST /api/prediction/predict
```

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `lat` | float | — | Latitude (required) |
| `lng` | float | — | Longitude (required) |
| `time` | string | `"day"` | Time of day (`day` / `night`) |
| `travel_mode` | string | `"walking"` | Mode of travel |
| `user_profile` | string | `"standard"` | Health profile |
| `duration_mins` | int | `30` | Exposure duration in minutes |

### Route Engine

```
POST /api/route/calculate
POST /api/route/multiple-routes
POST /api/route/route-analytics
POST /api/route/route-safety
POST /api/route/route-cost
POST /api/route/route-weather
POST /api/route/real-time-update
POST /api/route/optimize-route
POST /api/route/analyze
GET  /api/route/health
```

### AI Trip Planner

```
POST /api/planner/generate
```

### Stay Safety Analysis

```
POST /api/stays/analyze
```

### AI Toolkit

```
POST /api/chat
POST /api/translate
POST /api/analyze-image
POST /api/generate-itinerary
POST /api/translate-doc
GET  /api/get-image?query={destination}
```

### Voice Engine

```
POST /api/voice/speak
POST /api/voice/analyze-speech
```

### Document Vault

```
POST   /api/documents/upload
GET    /api/documents/list
GET    /api/documents/download/{doc_id}
DELETE /api/documents/delete/{doc_id}
PATCH  /api/documents/update/{doc_id}
GET    /api/documents/statistics
GET    /api/documents/export/summary
```

### Admin Command Center (JWT Required)

```
POST /api/admin/user-action
POST /api/admin/vault-purge
POST /api/admin/vault-update
POST /api/admin/kill-switch
POST /api/admin/track-event
GET  /api/admin/analytics/system-health
GET  /api/admin/analytics/audit-logs
GET  /api/admin/analytics/users
GET  /api/admin/analytics/health-profiles
GET  /api/admin/analytics/api-quota
GET  /api/admin/analytics/routes-today
GET  /api/admin/analytics/recent-activity
```

---

## 🚀 Deployment

### Backend (Render)

The production backend is hosted on **Render** at `safenav-18sk.onrender.com`. The app is served via **Gunicorn**:

```bash
gunicorn backend.app:app --bind 0.0.0.0:$PORT
```

### Backend (Vercel — Serverless Fallback)

Configured via `backend/vercel.json` using `@vercel/python` runtime. All requests are routed to `app.py`.

### Frontend (Firebase Hosting)

```bash
firebase deploy --only hosting
```

The `firebase.json` serves the `frontend/` directory as the public root.

---

## ⚠️ Failure Handling & Resilience

| Strategy | Implementation |
| :--- | :--- |
| **API Retry Shield** | Exponential backoff with key rotation for Gemini 429/503 errors |
| **Graceful Degradation** | Cached/fallback values when external APIs are unreachable |
| **Score Clamping** | Safety scores capped at 150 to prevent extreme fluctuations |
| **Firebase Fallback** | Project ID–based init when `serviceAccountKey.json` is absent |
| **Offline PWA** | Service Worker serves cached app shell; 404 page for navigation failures |
| **Database Recovery** | Automatic backup restoration when `metadata.json` is corrupted |
| **Audit Trail** | All admin actions logged to Firestore with immutable timestamps |

---

## 🔒 Security

- **Encryption** — Fernet (AES-256-CBC) with PBKDF2-HMAC-SHA256 key derivation
- **Key Management** — Auto-generated keys with timestamped backup rotation
- **Data Integrity** — SHA-256 checksums on all encrypted documents
- **Authentication** — Firebase Auth with JWT token verification on all admin endpoints
- **Admin Whitelist** — Hardcoded email allowlist for admin access (backend-enforced)
- **CORS** — Configured per-blueprint with wildcard restriction on production
- **Secrets** — All API keys, service account files, and encryption keys excluded via `.gitignore`

---

## 🧠 Technical Deep Dive

### Risk Score Formula

```
Exposure Multiplier = min(2.0, max(1.0, duration_mins / 30))

Score += (50 × multiplier)   if real_feel > adaptive_heat_limit
Score += (40 × multiplier)   if AQI > profile_threshold
Score += (15 × multiplier)   if walking in extreme conditions
Score += 10                  if nighttime
```

### Fuel & Emissions Model

```
Fuel (L)  = Σ (segment_km / 100) × road_type_rate
CO₂ (kg)  = Fuel × 2.31 kg/L
Cost ($)  = Fuel × price + Toll + Maintenance (0.05/km) + Depreciation (0.10/km)
```

### Safety Score (Route)

```
Base = 85
  −5   if distance > 100 km
  −2n  for each complex maneuver (roundabouts, forks)
Clamped to [0, 100]
```

---

## 📄 License

This project was developed as a **Final Year Project (FYP)**.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/mohamad-shafeez">Mohamad Shafeez</a>
</p>
