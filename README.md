# SafeNav: AI-Powered Travel Safety & Itinerary Engine

SafeNav is an AI-powered travel safety engine that combines live environmental data and health-aware risk modeling to generate personalized itineraries and real-time safety guidance. 

> Designed to transform unstructured environmental data into deterministic, machine-readable safety signals using a hybrid of rule-based logic and LLM-assisted generation.

**Deterministic Output Layer:** Ensures stable and predictable safety scoring despite noisy, real-world inputs.

## 🚧 Live Demo (In Progress)
The production deployment is currently being optimized for UI stability and API efficiency. 
* **GitHub Repository:** https://github.com/mohamad-shafeez/safenav
*(A live screen demo and architecture walkthrough are available upon request).*

## ✨ Key Features
* **🧬 Adaptive Risk Engine:** Calculates custom safety scores adjusting thresholds strictly based on the user's medical profile (e.g., Heart Disease, Asthma).
* **🤖 AI Itinerary Generation:** Leverages Gemini 1.5 Flash to generate personalized, day-by-day travel plans that respect physical limitations and safety parameters.
* **☁️ State Management:** Uses Firebase Auth and Firestore to sync health conditions across modules and store generated trips.
* **🛰️ Real-Time Radar:** Integrates OpenWeather and WAQI with a live interactive map and rain radar layers.
* **🎙️ Accessibility Engine:** Provides spoken warnings for high-risk environmental conditions and hydration reminders.

## ⚡ System Capabilities & Metrics
* **Real-time Multi-API Aggregation:** Synchronizes OpenWeather, WAQI, and Google Gemini data into a single payload.
* **Low-Latency Risk Scoring:** Processes environmental variables and personalized health math in < 2 seconds.
* **Secure Deployment:** Hosted on Render with strict environment-isolated API keys and CORS-hardened endpoints.

## Tech Stack

**Frontend:**
* HTML5, CSS3 (Custom Glassmorphism UI)
* JavaScript (ES6+, async architecture, LocalStorage state management)
* Leaflet.js (Interactive Mapping)
* Firebase (Authentication & Cloud Firestore)

**Backend:**
* Python (Flask)
* Google Generative AI SDK (Gemini 1.5 Flash)
* Flask-CORS (Cross-Origin Resource Sharing)

## 🏗️ System Architecture

SafeNav is designed to convert inconsistent, unstructured environmental data into a stable, machine-readable safety signal.

### Challenges:
- APIs return data in different formats (JSON structures vary)
- Missing or delayed data from external sources
- No standardized risk scale across weather, AQI, and alerts

### Approach:
- Normalized all inputs into a unified internal schema
- Applied weighted heuristics to combine signals (AQI, temperature, alerts)
- Implemented fallback logic when APIs fail or return incomplete data
- Ensured deterministic output even with partial inputs

This layer acts as a bridge between raw real-world data and structured decision-making.

## 🤖 LLM Integration Logic

SafeNav uses Gemini 1.5 Flash to generate contextual travel plans based on structured safety inputs.

### Key Design Decisions:
- Inject structured safety scores into prompts rather than raw API data
- Constrain outputs using prompt templates to ensure consistent itinerary formats
- Avoid reliance on LLM for critical calculations (handled in backend logic)

This hybrid approach ensures reliability while still leveraging generative capabilities.

## ⚠️ Failure Handling & Edge Cases

- Handles missing API responses using cached or fallback values
- Prevents extreme fluctuations in safety score due to sudden data spikes
- Ensures graceful degradation when external services are unavailable
- Maintains consistent output format even under partial system failure

SafeNav operates on a decoupled architecture designed for scalability and fault tolerance:
1. **The Client (Frontend):** Manages user state via Firebase and LocalStorage, handling UI rendering and asynchronous API requests.
2. **The Gateway (Flask API):** Receives the payload, enforces CORS policies, and securely proxies requests to external APIs.
3. **The Logic Engine:** Parses raw satellite data, applies health-specific mathematical multipliers (e.g., lowering heat thresholds for cardiac patients), and injects the synthesized context into the LLM prompt.

## Local Installation & Setup

1. **Clone the repository:**
```bash
git clone [https://github.com/mohamad-shafeez/safenav.git](https://github.com/mohamad-shafeez/safenav.git)
cd safenav