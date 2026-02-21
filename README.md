# 🌍 SafeNav: AI-Powered Travel Safety & Itinerary Engine

SafeNav is a full-stack, AI-driven travel companion that generates dynamic itineraries and calculates real-time environmental risk scores. Unlike standard weather apps, SafeNav uses an **Adaptive Intelligence Engine** to personalize safety warnings based on a user's specific health profile (e.g., Heart Disease, Asthma, Elderly).

## ✨ Key Features

* **🧬 Adaptive Risk Engine:** Calculates a custom safety score using real-time AQI, humidity, and temperature data, adjusting thresholds strictly based on the user's medical profile.
* **🤖 AI Itinerary Generation:** Leverages the Google Gemini 1.5 Flash model to generate personalized, day-by-day travel plans that respect the user's budget, vibe, and physical limitations.
* **☁️ Cloud Sync & State Management:** Uses Firebase Auth and Firestore to save user profiles, sync health conditions across pages, and store generated trips to a personalized dashboard.
* **🛰️ Real-Time Environmental Radar:** Integrates OpenWeather API and WAQI (World Air Quality Index) with a live interactive Leaflet map and rain radar layers.
* **🎙️ Voice Alerts:** Built-in accessibility engine that provides spoken warnings for high-risk environmental conditions and hydration reminders.

## 🛠️ Tech Stack

**Frontend:**
* HTML5, CSS3 (Custom Glassmorphism UI)
* Vanilla JavaScript (Async/Await, LocalStorage state management)
* Leaflet.js (Interactive Mapping)
* Firebase (Authentication & Firestore Database)

**Backend:**
* Python (Flask)
* Google Generative AI SDK (Gemini)
* Flask-CORS (Cross-Origin Resource Sharing security)

**APIs & Integrations:**
* Google Gemini API (AI Analysis & Itinerary Generation)
* OpenWeather API (Live Weather & Heat Index)
* WAQI API (Live Air Quality Index)
* Unsplash API (Dynamic location imagery)

## 🚀 System Architecture

SafeNav operates on a decoupled architecture:
1.  **The Client (Frontend):** Manages user state (Firebase + LocalStorage) and requests analysis.
2.  **The Gateway (Flask API):** Receives the payload and securely proxies requests to external APIs.
3.  **The Logic Engine:** Parses raw satellite data, applies the health-specific mathematical multipliers (e.g., lowering heat thresholds for cardiac patients), and injects the context into the Gemini prompt.

## 💻 Local Installation & Setup

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/yourusername/safenav.git
cd safenav
\`\`\`

### 2. Set up the Python Backend
Navigate to the backend directory and install the dependencies:
\`\`\`bash
cd backend
pip install flask flask-cors requests google-generativeai
\`\`\`

Create a `.env` file in the `backend` folder with your API keys:
\`\`\`env
GOOGLE_API_KEY=your_gemini_key
OPENWEATHER_API_KEY=your_openweather_key
AQI_TOKEN=your_waqi_token
\`\`\`

Run the Flask server:
\`\`\`bash
python app.py
\`\`\`

### 3. Run the Frontend
Because the frontend uses ES6 modules and Firebase, run it through a local server (like the VS Code "Live Server" extension).
* Open `index.html` with Live Server.
* Ensure the `API_BASE_URL` in your JS files points to `http://localhost:5000` for local testing.

## 🔒 Security Notes
* **API Keys:** All sensitive API keys are stored securely on the backend server (Render) using Environment Variables. No keys are exposed to the client browser.
* **CORS:** The backend is hardened to only accept cross-origin requests from the verified frontend domain.

---
*Built with ❤️ by [Your Name] for safer, smarter travel.*