---
name: SafeNav Project Overview
description: AI-powered travel safety engine combining environmental data and health-aware risk modeling
type: project
---

## SafeNav: AI Travel Safety & Itinerary Engine

**What it does:**
- Aggregates real-time environmental data (OpenWeather, WAQI, Gemini AI)
- Calculates personalized safety scores based on user health profiles
- Generates multi-day travel itineraries using Gemini LLM
- Provides real-time route safety predictions and warnings
- Supports document processing (passports, visas) via OCR

**Key Design Philosophy:**
- LLM powers *generation* (itineraries, document analysis), not critical calculations
- All risk scoring is deterministic rule-based logic in Python
- Graceful degradation when external APIs fail
- Normalized data pipeline ensures consistent output despite noisy inputs

**Tech Stack:**
- Frontend: HTML5/CSS3 glassmorphism UI + Firebase Auth + Leaflet.js mapping
- Backend: Python Flask + Firebase Admin SDK + Gemini 2.5 Flash
- Database: Firebase Firestore (analytics, audit logs, user profiles)
- Deployment: Render (backend) + Firebase Hosting (frontend)

**Key Features:**
- Adaptive risk engine adjusts thresholds for cardiac/respiratory/diabetes patients
- Voice alerts for high-risk conditions
- Real-time route planning with interactive maps
- Admin dashboard with audit logging and API usage tracking
- Service worker for offline support

**Critical APIs:**
- OpenWeather (weather + forecasts)
- WAQI (air quality index)
- Gemini 2.5 Flash (itinerary generation + OCR)
- Nominatim/OSM (geocoding)
- Firebase (auth + data persistence)
