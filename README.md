# 🌱 FarmSaathi AI — Smart Farmer Assistance Platform

FarmSaathi AI is an AI-powered farming assistance platform designed specifically for Indian farmers. It combines agronomic guidance, multimodal crop disease triage, real-time weather alerts, APMC mandi market tracking, and crop management into an intuitive, responsive web application supporting **English**, **हिन्दी (Hindi)**, and **मराठी (Marathi)**.

---

## 📑 Table of Contents
1. [Architecture & System Overview](#1-architecture--system-overview)
2. [Feature Status Matrix](#2-feature-status-matrix)
3. [Quick Local Setup (Zero-Config)](#3-quick-local-setup-zero-config)
4. [Backend AI Configuration (OpenAI)](#4-backend-ai-configuration-openai)
5. [Database & Authentication Setup (Supabase)](#5-database--authentication-setup-supabase)
6. [Deployment to Netlify (Public HTTPS)](#6-deployment-to-netlify-public-https)
7. [Agricultural Guardrails & Safety Notices](#7-agricultural-guardrails--safety-notices)
8. [Manual Testing Checklist](#8-manual-testing-checklist)

---

## 1. Architecture & System Overview

FarmSaathi AI is architected with a decoupled, serverless approach designed for high reliability, offline resilience, and data protection:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FarmSaathi AI                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ Frontend: Responsive Single-Page App (HTML5, Modern CSS, Vanilla JS)    │
│ Languages: English (EN) | हिन्दी (HI) | मराठी (MR)                      │
├─────────────────────────────────────────────────────────────────────────┤
│ Serverless Backend (Netlify Functions / Node.js Local Server):          │
│  ├─ /.netlify/functions/chat      → OpenAI Chat (Farmer advisory)       │
│  ├─ /.netlify/functions/analyze   → OpenAI Vision (Crop photo triage)   │
│  ├─ /.netlify/functions/mandi     → APMC Mandi price bulletins feed     │
│  └─ /.netlify/functions/status    → System health & configuration probe │
├─────────────────────────────────────────────────────────────────────────┤
│ Cloud Database & Storage:                                               │
│  └─ Supabase PostgreSQL (Row-Level Security RLS + Auth + Storage)       │
│ Offline Fallback:                                                       │
│  └─ Browser Local Storage (Works seamlessly without credentials)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Feature Status Matrix

| Module | Feature | Implementation Status | Notes / Requirements |
| :--- | :--- | :--- | :--- |
| **Design & UI** | Responsive Mobile, Tablet & Desktop Layout | **Fully Working** ✅ | Agricultural green/lime theme; tested for touch screens |
| **Localization** | Multi-language (EN / HI / MR) | **Fully Working** ✅ | Translates navigation, labels, notices, and AI system prompts |
| **Weather** | Real-time Weather & 5-Day Forecast | **Fully Working** ✅ | Connects to Open-Meteo REST API (No API key required) |
| **Weather** | Smart Agricultural Advisories | **Fully Working** ✅ | High wind spraying alerts, heavy rain warnings, heat stress |
| **Mandi Prices**| APMC Mandi Rates & Filtering | **Fully Working** ✅ | Modal prices, min-max ranges, commodity search, state filters |
| **Crops & Farms**| Farm & Crop Tracking with Stages | **Fully Working** ✅ | Sowing date, variety, plot name, notes; CRUD operations |
| **Activities** | Farm Activity Reminders & Calendar | **Fully Working** ✅ | Irrigation, spraying, fertilizer scheduling with status |
| **Farmer Profile**| Multi-field Farmer Profile & GPS | **Fully Working** ✅ | Village, district, state, soil type, irrigation method, area |
| **AI Assistant** | Multilingual Farm Q&A | **Fully Configured** ⚡ | Working with `OPENAI_API_KEY`; honest prompt if unconfigured |
| **Farm Intelligence**| Crop Photo Scanner & Triage | **Fully Configured** ⚡ | Multimodal vision model with structured triage report |
| **Offline Mode**| Demo Triage Mode | **Fully Working** ✅ | Clear test mode allows full UI evaluation without API keys |
| **Cloud Database**| Supabase PostgreSQL + Auth | **Ready to Deploy** ⚡ | Full schema (`schema.sql`) with RLS policies and auto-triggers |

---

## 3. Quick Local Setup (Zero-Config)

You can run the entire platform on your local machine using the included zero-dependency Node.js server:

### Step 1: Open Terminal in Project Directory
```powershell
# Navigate to the project directory
cd
```

### Step 2: Start Local Server
```bash
node server.js
```

### Step 3: Open in Browser
Visit `http://localhost:3000` in your web browser.
* All static assets and Netlify serverless functions (`/api/*` and `/.netlify/functions/*`) are served automatically!

---

## 4. Backend AI Configuration (OpenAI)

To enable live AI answers and multimodal crop photo analysis:

### 1. Obtain an API Key
Sign up or log in at [OpenAI Platform](https://platform.openai.com/api-keys) and generate an API key.

### 2. Configure Locally
Create a `.env` file in the project folder (or copy from `.env.example`):
```env
PORT=3000
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o-mini
```

Restart `node server.js` to apply changes.

### 3. Configure in Netlify
When deployed to Netlify:
1. Navigate to **Site Configuration** > **Environment Variables**.
2. Add `OPENAI_API_KEY` = your secret key.
3. Trigger a redeploy.
4. The app will immediately detect the key and show `AI Online (gpt-4o-mini)` in the settings checklist!

---

## 5. Database & Authentication Setup (Supabase)

FarmSaathi AI operates in **Local Demo Mode** by default, storing records locally in the farmer's browser. To enable multi-device cloud synchronization and secure email accounts:

### 1. Create a Supabase Project
Sign in to [Supabase](https://supabase.com) and create a new project.

### 2. Execute SQL Migration
1. Open your Supabase Dashboard and go to the **SQL Editor**.
2. Copy the entire contents of [`supabase/schema.sql`](./supabase/schema.sql).
3. Click **Run**. This will create:
   - `profiles`, `farms`, `crops`, `chat_conversations`, `chat_messages`, `crop_analyses`, and `farm_activities` tables.
   - Row Level Security (RLS) policies ensuring farmers can only read/edit their own data.
   - Triggers for automatic profile initialization upon email signup.

### 3. Add Client Keys to `index.html`
Open `index.html` and locate the `CONFIG` object at line ~800:
```javascript
const CONFIG = {
  supabaseUrl: 'https://your-project-id.supabase.co',
  supabaseAnonKey: 'your-public-anon-key'
};
```
*(These public keys are safe in client JavaScript because all security is enforced by PostgreSQL Row Level Security).*

---

## 6. Deployment to Netlify (Public HTTPS)

Deploying FarmSaathi AI to a live public HTTPS URL takes under 2 minutes:

### Option A: Drag & Drop (Manual Deploy)
1. Go to your [Netlify Dashboard](https://app.netlify.com).
2. Click **Add new site** > **Deploy manually**.
3. Drag the folder containing `index.html`, `netlify.toml`, and `netlify/` into the upload zone.
4. Once deployed, open **Site configuration** > **Environment variables** and add `OPENAI_API_KEY`.
5. Your app is live at `https://your-site-name.netlify.app`!

### Option B: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

---

## 7. Agricultural Guardrails & Safety Notices

FarmSaathi AI was designed with responsible agricultural engineering safeguards:

1. **No Fabricated Diagnoses:** Visual photo inspection only generates preliminary triage hypotheses. It never claims 100% lab certainty.
2. **Chemical Safety:** The AI assistant strictly refuses to provide arbitrary pesticide mixing ratios or hazardous agrochemical cocktails.
3. **Local Expert Advisory:** For acute crop symptoms, farmers are directed to their nearest **Krishi Vigyan Kendra (KVK)** or the **Kisan Call Centre (Toll-Free: 1800-180-1551)**.
4. **Honest Data Transparency:** Mandi rates and weather are clearly watermarked with their data source and update timestamp.

---

## 8. Manual Testing Checklist

Use this checklist to verify all features:

- [x] **Language Switching:** Switch between English, हिन्दी, and मराठी. Check that navigation, headers, forms, and alerts update immediately.
- [x] **Farmer Profile:** Fill in name, village, district, soil type, and main crop. Click Save and reload the page to confirm persistence.
- [x] **GPS Location:** Tap "Detect Farm GPS Coordinates" and verify permission prompt and coordinate capture.
- [x] **Crops Management:** Add a crop (e.g. Soybean, JS-335, Flowering stage). Verify it appears in active crops with stage badge.
- [x] **Activity Reminders:** Add an activity (e.g. "Irrigate Soybean"). Verify it appears and can be marked done/deleted.
- [x] **Live Weather:** Search for "Gadchiroli", "Nagpur", or "Pune". Confirm live temperature, feels like, humidity, and 5-day forecast.
- [x] **Weather Advisories:** Verify smart advisories trigger based on wind/rain/heat thresholds.
- [x] **Mandi Explorer:** Filter by State (Maharashtra) or search "Soybean". Verify APMC modal rates, min-max ranges, and trends.
- [x] **Crop Health Scanner:** Upload a plant photo. Verify preview, file validation, and "Replace Photo" controls.
- [x] **Demo Triage:** Click "Test with Demo Triage" to verify structured report generation in English, Hindi, and Marathi.
- [x] **Analysis History:** Save report. Open "Analysis History" and click "View Full" to see the modal report.
- [x] **AI Assistant:** Type a farming question. Verify response adheres to the selected language and includes agricultural disclaimers.
- [x] **Help & Helplines:** Verify Kisan Call Centre (1800-180-1551) and MahaAgri helplines are prominently displayed.
- [x] **Export Data:** In Settings, click "Export Farm Data (JSON)" to download a full local backup.

---

*© 2026 FarmSaathi AI · Built for Indian Farmers with Care and Integrity.*
