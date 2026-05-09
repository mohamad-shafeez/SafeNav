---
name: SafeNav Architecture
description: Three-tier system design with Firebase backend and risk scoring logic
type: reference
---

## Three-Tier Architecture

### 1. Frontend Client (`/frontend`)
- Static HTML served from Firebase Hosting
- Firebase Auth handles user login/signup
- LocalStorage + Firestore for state management
- Leaflet.js for interactive mapping
- Service worker for offline support

**Key files:**
- `index.html` — Main landing page + route entry
- `auth.js` — Firebase authentication, admin email list
- `route-core.js` — Route calculation UI + map interaction
- `prediction.js` — Environmental risk visualization
- `planner.js` — Itinerary generation interface
- `config.js` — API keys (TomTom, Backend URL)

### 2. Flask API Gateway (`/backend`)
- Express blueprint pattern for modular routes
- JWT token verification via Firebase Admin SDK
- CORS policies enforced at route level
- Firestore integration for analytics + audit logging
- API call tracking for quota management

**Route structure:**
```
/api/auth        — User authentication
/api/route       — Route safety predictions
/api/prediction  — Environmental risk at location
/api/planner     — AI itinerary generation
/api/admin       — Dashboard (JWT protected)
/api/documents   — OCR + document processing
```

### 3. Business Logic Services (`/backend/services/`)
- `route_engine.py` — Real-time risk calculation (1000s/day scale)
- `prediction_engine.py` — Health-aware thresholds
- `planner_engine.py` — Gemini LLM calls with retry logic
- `documents_engine.py` — OCR via Gemini Vision
- Each service is stateless; all state in Firestore

## Data Models

### Firestore Collections
- **`users/{uid}`** → Email, health conditions, preferences
- **`trips/{tripId}`** → Generated itineraries (planner output)
- **`analytics/daily_stats`** → Routes/day, API calls
- **`analytics/api_usage`** → Per-API call counter
- **`audit_logs`** → Admin actions with timestamps

## Security Layers

**Frontend:**
- Admin email list in `auth.js` (redundant check)
- Firebase Auth provides JWT

**Backend:**
- `verify_admin_token()` verifies JWT via Firebase Admin SDK
- `AUTHORIZED_ADMINS` whitelist in `dashboard.py`
- Audit log tracks who did what

## Risk Scoring Algorithm

**Inputs:** Temperature, AQI, Alerts, User health profile, Activity duration

**Multipliers:**
- Cardiac patients: Heat risk multiplier 1.3x (threshold drops to 28°C)
- Respiratory: AQI weight increases 1.5x
- Diabetes: Activity duration capped at 2 hours

**Output:** 0–100 risk score with deterministic logic (no randomness)

## External API Dependencies

| API | Purpose | Rate Limit | Fallback |
|-----|---------|-----------|----------|
| OpenWeather | Weather + forecasts | 1000/day | Cached data or "unavailable" |
| WAQI | Air quality | 100/day | Show null/warning |
| Gemini | AI generation | 1000 req/min free | Retry with backoff; fallback message |
| Nominatim | Geocoding | 1 req/sec | OSM nominatim.openstreetmap.org |
| Firebase | Auth + data | Unlimited | Local-only fallback |

**Retry Strategy:** Exponential backoff for Gemini (429/503); no retry for WAQI (quota hard limit)

## Important File Paths

- **`backend/app.py`** — Flask factory + blueprint registration
- **`backend/routes/dashboard.py`** — Admin security + audit logging
- **`backend/services/route_engine.py`** — Risk calculation core
- **`backend/services/planner_engine.py`** — Gemini LLM calls
- **`frontend/js/auth.js`** — Firebase auth flow
- **`frontend/js/route-core.js`** — Route UI logic
- **`CLAUDE.md`** — Full developer guide
