# FarmSaathi AI — Backend Architecture & Services

Welcome to the backend architecture for **FarmSaathi AI**.

The backend is organized into clean, modular service layers and REST API endpoints compatible with both local Node.js development and serverless platforms like Vercel and Netlify.

---

## Directory Structure

```
backend/
├── api/
│   ├── status.js        # Health status, version probe, and integrations check
│   ├── chat.js          # Trilingual AI conversational assistant (OpenAI / Autonomous engine)
│   ├── analyze.js       # Multimodal plant disease & foliar photo triage
│   ├── mandi.js         # Verified APMC Mandi prices with state & search filters
│   ├── weather.js       # Open-Meteo weather proxy with agricultural advisories
│   ├── auth.js          # User registration, login, session validation, and logout
│   ├── profile.js       # Farmer land and crop profile records
│   ├── crops.js         # Active crops management (CRUD)
│   └── activities.js    # Farm tasks, calendar reminders, and toggle completions
├── services/
│   ├── aiService.js     # OpenAI API integration & built-in agronomic rule engines
│   ├── mandiService.js  # All-India APMC market records database & search algorithm
│   ├── weatherService.js# Indian city coordinate registry & Open-Meteo forecast client
│   └── dbService.js     # Persistent JSON database operations manager
├── db.js                # Low-level JSON database file operations
├── routes.js            # Unified HTTP router for local development server
└── README.md            # Backend architecture documentation (this file)
```

---

## API Endpoints Reference

### 1. System Health
- **`GET /api/status`**
  - Returns backend online status, AI configuration, and database record stats.

### 2. Conversational Agronomy (Chat)
- **`POST /api/chat`**
  - Headers: `Content-Type: application/json`
  - Body: `{ "message": "How do I control aphids?", "language": "en|hi|mr", "profile": {} }`
  - Uses OpenAI `gpt-4o-mini` when `OPENAI_API_KEY` is provided; seamlessly falls back to the autonomous agronomic engine.

### 3. Crop Disease Scanner (Vision)
- **`POST /api/analyze`**
  - Headers: `Content-Type: application/json`
  - Body: `{ "image": "base64...", "cropName": "Soybean", "fileName": "photo.jpg", "language": "en|hi|mr" }`
  - Returns structured triage with diagnosis, urgency, and organic/chemical treatments.

### 4. APMC Mandi Rates
- **`GET /api/mandi?state=Maharashtra&q=Soybean`**
  - Provides modal, minimum, and maximum prices in ₹/Quintal across APMC markets.

### 5. Weather & Forecast
- **`GET /api/weather?city=Gadchiroli&lat=20.18&lon=80.00`**
  - Returns current conditions, spray advisories, and 5-day daily forecasts.

### 6. Authentication & Profiles
- **`POST /api/auth/signup`** (`{ fullName, email, password }`)
- **`POST /api/auth/login`** (`{ email, password }`)
- **`POST /api/auth/logout`**
- **`GET /api/auth/me`** (Bearer token header)
- **`GET /api/profile`** / **`POST /api/profile`**

### 7. Crops & Activities
- **`GET /api/crops`** / **`POST /api/crops`** / **`DELETE /api/crops/:id`**
- **`GET /api/activities`** / **`POST /api/activities`** / **`DELETE /api/activities/:id`** / **`PATCH /api/activities/:id/toggle`**

---

## Vercel Serverless Function Compatibility

Each endpoint in `backend/api/` is a standard Node.js request handler `(req, res) => { ... }`.
The root `/api/` folder contains thin wrappers for Vercel discovery, ensuring seamless zero-config serverless deployments.
