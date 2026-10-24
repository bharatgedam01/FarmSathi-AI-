# 🌱 FarmSaathi AI — Smart Farmer Assistance Platform (Full-Stack Edition)

FarmSaathi AI is an AI-powered farming assistance platform designed specifically for Indian farmers. It combines agronomic guidance, multimodal crop disease triage, real-time weather alerts, APMC mandi market tracking, and crop management into an intuitive, responsive web application supporting **English**, **हिन्दी (Hindi)**, and **मराठी (Marathi)**.

Now equipped with a **zero-dependency Node.js backend** and **persistent JSON database** (`data/database.json`), along with seamless offline fallback!

---

## 📑 Table of Contents
1. [Architecture & Backend Overview](#1-architecture--backend-overview)
2. [REST API Documentation](#2-rest-api-documentation)
3. [Quick Local Setup (Zero Dependencies)](#3-quick-local-setup-zero-dependencies)
4. [Built-in Test Accounts](#4-built-in-test-accounts)
5. [Feature Status Matrix](#5-feature-status-matrix)
6. [Backend AI Configuration (Optional OpenAI Key)](#6-backend-ai-configuration-optional-openai-key)
7. [GitHub Repository & Deployment Guide](#7-github-repository--deployment-guide)
8. [Agricultural Guardrails & Safety Notices](#8-agricultural-guardrails--safety-notices)

---

## 1. Architecture & Backend Overview

FarmSaathi AI is architected with a dual-mode engine:
1. **Full-Stack Mode (Node.js Server):** Runs an HTTP server with REST APIs, scrypt-based session authentication, and atomic JSON database storage.
2. **Autonomous Offline Mode:** When opened directly without a server (`file:///...`), it gracefully operates using localStorage and autonomous agronomic engines with **zero `Failed to fetch` errors**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FarmSaathi AI Full-Stack App                       │
├─────────────────────────────────────────────────────────────────────────┤
│ Frontend: Responsive Single-Page App (HTML5, Modern CSS, Vanilla JS)    │
│ Languages: English (EN) | हिन्दी (HI) | मराठी (MR)                      │
├─────────────────────────────────────────────────────────────────────────┤
│ Node.js Backend Server (Zero External Dependencies):                    │
│  ├─ server.js           → HTTP server & static file dispatcher          │
│  ├─ backend/routes.js   → REST API router (/api/*)                      │
│  ├─ backend/db.js       → Persistent JSON database engine (data/)       │
│  ├─ netlify/functions/  → Serverless AI chat, vision triage, mandi     │
│  └─ data/database.json  → Auto-seeded, atomic disk persistence          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. REST API Documentation

| Endpoint | Method | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `/api/status` | `GET` | Server health, version, uptime, and database stats | No |
| `/api/auth/signup` | `POST` | Create a new farmer account (`fullName, email, password, phone`) | No |
| `/api/auth/login` | `POST` | Authenticate with email & password, returns session token | No |
| `/api/auth/logout`| `POST` | Invalidate session token | Optional |
| `/api/auth/me` | `GET` | Get current authenticated user profile | Bearer Token |
| `/api/profile` | `GET` | Retrieve farmer's farm and soil profile | Optional (Defaults to demo) |
| `/api/profile` | `POST` | Update farmer's farm, soil, area, crop details | Optional |
| `/api/crops` | `GET` | List all registered farm crops & growth stages | Optional |
| `/api/crops` | `POST` | Add a new crop plot (`cropName, fieldName, sowingDate, growthStage`) | Optional |
| `/api/crops/:id` | `DELETE` | Delete a crop plot by ID | Optional |
| `/api/activities` | `GET` | List farm activity reminders (Irrigation, Spraying, Fertilizers) | Optional |
| `/api/activities` | `POST` | Add a farm reminder (`name, category, date, notes`) | Optional |
| `/api/activities/:id` | `DELETE` | Delete an activity reminder | Optional |
| `/api/history` | `GET` | Retrieve crop disease scan history & reports | Optional |
| `/api/history` | `POST` | Save a new scan triage report | Optional |
| `/api/history/:id` | `DELETE` | Delete a scan record | Optional |
| `/api/mandi` | `GET` | All-India APMC market rates with query & state filters | No |
| `/api/chat` | `POST` | Trilingual AI agronomic advisory engine | No |
| `/api/analyze` | `POST` | Multimodal crop leaf health triage report generator | No |
| `/api/weather` | `GET` | Weather proxy and 5-day agricultural forecast | No |

---

## 3. Quick Local Setup (Zero Dependencies)

The server uses standard Node.js libraries (`http`, `fs`, `path`, `crypto`). **No `npm install` is required!**

### Step 1: Open Terminal in the Project Directory
```powershell
cd "path\to\FarmSaathi_AI_Complete"
```

### Step 2: Start the Backend Server
```bash
node server.js
```

### Step 3: Open in Browser
Open `http://localhost:3000` in Google Chrome, Microsoft Edge, or Firefox.
* The account indicator in the header will display **`🟢 Backend Connected`**.
* All crop additions, activities, and profile changes will save directly into `data/database.json`.

---

## 4. Built-in Test Accounts

For instant testing, the database is auto-seeded with a verified demo farmer account:

* **Email:** `farmer@farmsaathi.in`
* **Password:** `farmer123`
* **Farmer Name:** Rahul Patil (Chamorshi, Gadchiroli, Maharashtra)
* **Sample Crops:** Soybean (JS-335), BT Cotton
* **Sample Reminders:** Irrigation, Spraying, Soil Testing

You can also click **"Create Account"** to register your own custom email and password.

---

## 5. Feature Status Matrix

| Module | Feature | Implementation Status |
| :--- | :--- | :--- |
| **Backend Server** | Node.js Zero-Dependency REST API | **Fully Working** ✅ |
| **Database** | Persistent JSON DB with scrypt Auth | **Fully Working** ✅ |
| **Design & UI** | Responsive Mobile, Tablet & Desktop Layout | **Fully Working** ✅ |
| **Localization** | Multi-language (English / हिन्दी / मराठी) | **Fully Working** ✅ |
| **Weather** | Real-time Weather & 5-Day Agricultural Forecast | **Fully Working** ✅ |
| **Mandi Prices**| APMC Mandi Rates for All States in India | **Fully Working** ✅ |
| **Crops & Farms**| Farm & Crop Tracking with Stages | **Fully Working** ✅ |
| **Activities** | Farm Activity Reminders & Calendar | **Fully Working** ✅ |
| **Farmer Profile**| Multi-field Farmer Profile & GPS | **Fully Working** ✅ |
| **AI Assistant** | Multilingual Farm Q&A | **Fully Working** ✅ |
| **Farm Intelligence**| Crop Photo Scanner & Disease Triage | **Fully Working** ✅ |
| **Offline Mode**| Autonomous Engine (No Fetch Failures) | **Fully Working** ✅ |

---

## 6. Backend AI Configuration (Optional OpenAI Key)

The built-in agronomic engine already answers farming, fertilizer, and pest management questions in English, Hindi, and Marathi without any API key.

If you wish to attach a live OpenAI key:
1. Create a `.env` file in the project folder:
```env
PORT=3000
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o-mini
```
2. Restart `node server.js`.

---

## 7. GitHub Repository & Deployment Guide

### GitHub Repository
* Repository URL: `https://github.com/bharatgedam01/FarmSathi-AI-.git`

To push the latest code updates to GitHub:
```bash
git add .
git commit -m "Add full Node.js backend, persistent JSON database, and REST APIs"
git push origin main
```

### Free Cloud Deployment Options
1. **Render.com / Railway.app / Fly.io (Full-Stack Node.js)**
   * Connect your GitHub repository.
   * Build Command: *(leave empty or `npm test`)*
   * Start Command: `node server.js`
   * Your complete backend and frontend will be live with full REST APIs!

2. **Netlify / Vercel (Frontend + Serverless Functions)**
   * Deploy the repository directly.
   * Netlify automatically runs the functions in `netlify/functions/` as serverless APIs.

---

## 8. Agricultural Guardrails & Safety Notices

1. **Preliminary Triage:** Visual photo inspection provides preliminary triage hypotheses. It does not replace laboratory microscopic tests.
2. **Chemical Safety:** The AI assistant promotes Integrated Pest Management (IPM), bio-pesticides (Neem oil, Trichoderma viride), and safe practices.
3. **Emergency Helplines:** Farmers are provided direct contact to:
   * **Kisan Call Centre (Toll-Free):** 1800-180-1551
   * **MahaAgri Helpline:** 1800-233-4000
   * Local **Krishi Vigyan Kendra (KVK)** extension offices.

---

*© 2026 FarmSaathi AI · Built for Indian Farmers with Care and Integrity.*
