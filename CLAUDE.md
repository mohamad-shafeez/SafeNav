# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SafeNav** is an AI-powered travel safety engine that transforms unstructured environmental data (weather, air quality, health alerts) into deterministic safety signals, then uses Gemini LLM to generate personalized travel itineraries.

**Key Design Philosophy:** 
- LLM powers generation, not critical calculations
- All risk scoring is rule-based and deterministic
- Graceful degradation when external APIs fail

---

## System Architecture

### Three-Tier Decoupled Design

1. **Frontend Client** (`/frontend`)
   - HTML5/CSS3 with custom glassmorphism UI
   - ES6+ JavaScript with Firebase Auth
   - LocalStorage for UI state, Firestore for persistent health profile
   - Integrates Leaflet.js for interactive mapping

2. **Flask API Gateway** (`/backend/app.py`)
   - Blueprint-based route registration at `/api/*` endpoints
   - CORS-hardened with strict origin policies
   - Firebase Admin SDK for token verification and Firestore writes
   - API call tracking for analytics

3. **Business Logic Engines** (`/backend/services/`)
   - `route_engine.py`: Real-time risk calculation (OpenWeather + WAQI)
   - `prediction_engine.py`: Health-aware safety scoring
   - `planner_engine.py`: Itinerary generation via Gemini
   - `documents_engine.py`: OCR and document processing

### Request Flow
```
Frontend (Firebase Auth) 
    → Flask Gateway (JWT verify + CORS check)
    → Service Engine (rule-based calculation or LLM call)
    → Firestore (for persistence/analytics)
    → Response back to Frontend
```

---

## Backend Routes & Modules

### Core Blueprints
- **`/api/auth`** → User sign-up, login, Firebase token exchange
- **`/api/route`** → Real-time route safety predictions (lat/lng + travel mode)
- **`/api/prediction`** → Environmental risk assessment for a location
- **`/api/planner`** → AI-generated multi-day itineraries
- **`/api/admin`** → Dashboard: user management, analytics, audit logs
- **`/api/documents`** → OCR for passports, visas, travel docs
- **`/api/stays`** → Accommodation recommendations
- **`/api/voice`** → Text-to-speech accessibility features

### Admin Dashboard Security
- **Authorization:** Whitelist of admin emails (`AUTHORIZED_ADMINS` in `dashboard.py`)
- **Verification:** JWT token checked via Firebase Admin SDK
- **Audit Logging:** All admin actions tracked in Firestore `audit_logs` collection
- **Analytics:** API usage and daily stats tracked in `analytics` collection

### Health-Aware Risk Calculation
The `prediction_engine.calculate_risk()` function adjusts thresholds based on user health profile:
- **Cardiac patients:** Lowered heat tolerance (risk increases above 28°C vs. 35°C for standard)
- **Respiratory conditions (Asthma):** AQI thresholds stricter
- **Diabetes:** Hydration reminders and activity duration limits

---

## Firebase Integration

### Firestore Collections
- **`users/{uid}`** → User profile, health conditions, preferences
- **`trips/{tripId}`** → Generated itineraries (planner output)
- **`analytics/daily_stats`** → Routes generated, API calls per day
- **`analytics/api_usage`** → Counter for each external API (nominatim, owm, waqi, gemini)
- **`audit_logs`** → Admin actions with severity levels

### Authentication Flow
1. Frontend calls `firebase.auth().signInWithEmailAndPassword()`
2. Firebase returns `idToken`
3. Frontend sends token in `Authorization: Bearer <idToken>` header
4. Backend: `firebase_admin.auth.verify_id_token(token)` extracts email and uid
5. Admin routes check email against `AUTHORIZED_ADMINS`

---

## Configuration & Secrets

### Environment Variables (`.env`)
```
GEMINI_API_KEY=<your-key>
PLANNER_API_KEY=<fallback-key>
FIREBASE_PROJECT_ID=my-disaster-project-95132-a577c
OPENWEATHER_API_KEY=<key>
WAQI_API_KEY=<key>
SECRET_KEY=<flask-secret>
```

### Frontend Config (`/frontend/config.js`)
```javascript
CONFIG = {
    TOMTOM_KEY: window.TOMTOM_API_KEY || "...",  // Falls back to env or hardcoded
    BACKEND_URL: window.BACKEND_URL || "http://127.0.0.1:5000"
};
```

### Firebase Service Account
- Download `serviceAccountKey.json` from Firebase Console
- Place in `/backend/` (already in `.gitignore`)
- `app.py` auto-initializes with this file if present; falls back to Project ID

### Security Considerations
- **TomTom API key:** Exposed in frontend; rotate regularly
- **Gemini/OpenWeather keys:** Backend-only; never expose to client
- **Firebase Private Key:** In `.gitignore`; excluded from commits
- **Admin Emails:** Hardcoded in `dashboard.py` and `auth.js` for quick revocation

---

## LLM Integration

### Gemini 2.5 Flash (Latest Standard)
Used in planner and documents engines for:
- Itinerary generation with JSON output
- Passport/visa document analysis

**Key Pattern:**
```python
from google import genai
client = genai.Client(api_key=selected_key)
response = client.models.generate_content(
    model='gemini-2.5-flash-lite',
    contents=prompt_text,
    config={"response_mime_type": "application/json", "max_output_tokens": 8192}
)
```

### Retry Logic
- Exponential backoff for 429 (Quota) and 503 (Service Unavailable)
- Dual API keys for fallback (`GEMINI_API_KEY` and `PLANNER_API_KEY`)
- Max 3 attempts per request

### Prompt Design
- **Pass structured data, not raw API responses** — Inject pre-calculated risk scores, not raw weather JSON
- **Use templates** — Constraint outputs to consistent schema (e.g., day-by-day itinerary array)
- **Avoid critical math in LLM** — All risk calculations must be rule-based in Python

---

## External APIs

| API | Purpose | Rate Limit | Fallback |
|-----|---------|-----------|----------|
| OpenWeather | Real-time weather, forecasts | 1000 calls/day | Cached data |
| WAQI | Air Quality Index | 100 calls/day | None; graceful degrade |
| Gemini 2.5 Flash | AI generation | 1000/min free tier | Retry with exponential backoff |
| Nominatim (OSM) | Geocoding | 1 req/sec | User Agent required |
| TomTom Maps | Interactive mapping (frontend) | Based on plan | None |

---

## Development Workflow

### Setup
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env with API keys
echo "GEMINI_API_KEY=..." > .env

# Frontend (if needed)
cd frontend
npm install  # Only if modifying build process
```

### Run Locally
```bash
# Backend (port 5000)
cd backend
python app.py

# Frontend (open in browser)
# No build step needed; serve static HTML from /frontend
```

### Testing
- Backend: Unit tests for engines in `/backend/services/test_*.py`
- Frontend: Manual testing in browser (no automated tests currently)

### Linting & Format
- Backend: Follow PEP 8; use descriptive variable names
- Frontend: ES6+ conventions; no automated linting

---

## Common Development Tasks

### Adding a New Route
1. Create a new Blueprint in `/backend/routes/`
2. Implement the handler function with proper error handling
3. Register in `app.py` with `app.register_blueprint(your_bp, url_prefix="/api/...")`
4. Frontend: Call via `fetch(CONFIG.BACKEND_URL + "/api/...")`

### Adding a New Health Condition
1. Update `HEALTH_CONDITIONS` in `/backend/services/prediction_engine.py`
2. Define risk thresholds for temperature, AQI, activity duration
3. Update frontend health profile selector (`admin.html`, `dashboard.html`)

### Calling Gemini
- Use the pattern in `planner_engine.py`
- Always pass `response_mime_type: "application/json"` for structured output
- Wrap in try/except; log errors and return None on failure
- Frontend should show graceful fallback message if AI fails

### Debugging API Calls
- **Backend logs:** Flask logs to console (check terminal where `python app.py` runs)
- **Analytics:** Check Firestore `analytics/api_usage` for call counts
- **Audit trail:** Admin dashboard shows recent actions in Firestore `audit_logs`

---

## Known Issues & Edge Cases

1. **Line Ending Warnings (LF/CRLF):** Run `git config core.autocrlf true` in repo root
2. **Firebase Initialization:** If `serviceAccountKey.json` missing, falls back to Project ID (some features may degrade)
3. **Gemini Model Versions:** Currently uses `gemini-2.5-flash-lite`; if deprecated, update in `planner_engine.py` and test thoroughly
4. **WAQI Rate Limits:** If 100 calls/day exceeded, AQI shows stale data; no automatic retry
5. **Cross-Origin Requests:** All `/api/*` endpoints allow `*` origins; hardening needed for production

---

## Important Files

- **`backend/app.py`** — Flask factory, blueprint registration, Firebase init
- **`backend/routes/dashboard.py`** — Admin security, audit logging
- **`backend/services/route_engine.py`** — Core risk calculation logic
- **`backend/services/planner_engine.py`** — Itinerary generation via Gemini
- **`frontend/index.html`** — Main landing page, navbar, route entry
- **`frontend/js/auth.js`** — Firebase auth, error handling, token management
- **`frontend/js/route-core.js`** — Route calculation, map interaction
- **`frontend/js/prediction.js`** — Risk display, health profile selection
- **`frontend/config.js`** — API keys, backend URL

---

## Deployment

- **Backend:** Render (gunicorn + Flask)
- **Frontend:** Firebase Hosting (static files)
- **Database:** Firebase Firestore (cloud-managed)
- **Environment variables:** Set in Render dashboard and Firebase config

**Pre-deployment Checklist:**
- [ ] `.env` keys are production keys, not dev
- [ ] Admin emails updated in `dashboard.py` and `auth.js`
- [ ] CORS origins hardened (replace `*` with actual domain)
- [ ] Gemini model version compatible with SDK version
- [ ] Service account key is present and `.gitignore` verified
