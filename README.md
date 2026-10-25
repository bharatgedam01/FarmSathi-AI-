# 🌱 FarmSaathi AI — Smart Farmer Assistance Platform

FarmSaathi AI is an AI-powered agricultural intelligence platform designed specifically for Indian farmers. It combines agronomic guidance, multimodal plant disease triage, real-time weather alerts, verified APMC mandi market tracking, and farm operation records into a clean, modern, responsive architecture supporting **English**, **हिन्दी (Hindi)**, and **मराठी (Marathi)**.

---

## 📂 Modular Architecture & Project Structure

The project is structured with strict separation of frontend, backend, database, and serverless API endpoints:

```
FarmSaathi-AI/
├── frontend/
│   ├── index.html               # Clean, accessible semantic single-page web app
│   ├── css/
│   │   ├── style.css            # Design tokens, variables, component styles, dark green palette
│   │   └── responsive.css       # Mobile and tablet layout adaptations
│   ├── js/
│   │   ├── supabase-client.js   # Supabase cloud auth, RLS compliance & farm_records sync
│   │   ├── navigation.js        # Section routing, breadcrumb titles, and loader dispatch
│   │   ├── auth.js              # Supabase/Backend login, signup, session restoration, demo mode
│   │   ├── dashboard.js         # KPI stat counters, quick questions, and overview actions
│   │   ├── farmer-profile.js    # Farmer profile form, soil types, and GPS coordinates
│   │   ├── farms-crops.js       # Sowing logs, growth stages, variety tracking, and CRUD
│   │   ├── farm-activities.js   # Calendar reminders, task scheduling, and completion toggle
│   │   ├── weather.js           # Open-Meteo live sync, 5-day forecast, and spray advisories
│   │   ├── mandi-prices.js      # All-India APMC market rates, state & commodity search
│   │   ├── crop-analysis.js     # Multimodal plant health triage & scan history
│   │   └── app.js               # Application orchestrator, trilingual dictionary, sync engine
│   └── assets/                  # Static assets and icons
├── backend/
│   ├── api/                     # REST API route handlers
│   │   ├── status.js            # System health probe and integration status
│   │   ├── chat.js              # Conversational agricultural AI endpoint
│   │   ├── analyze.js           # Multimodal crop disease analysis endpoint
│   │   ├── mandi.js             # APMC mandi market price queries
│   │   ├── weather.js           # Weather proxy endpoint
│   │   ├── auth.js              # Authentication (signup, login, session, logout)
│   │   ├── profile.js           # Farmer land and crop profile records
│   │   ├── crops.js             # Crops management
│   │   └── activities.js        # Farm reminders & tasks
│   ├── services/                # Business logic and domain service layer
│   │   ├── aiService.js         # OpenAI integration & autonomous agronomic rule engine
│   │   ├── mandiService.js      # All-India APMC market records and filtering
│   │   ├── weatherService.js    # Indian cities registry and weather fetcher
│   │   └── dbService.js         # Unified database service wrapper
│   ├── db.js                    # Persistent JSON database operations
│   ├── routes.js                # API router for local development server
│   └── README.md                # Backend architecture guide
├── database/
│   └── schema.sql               # PostgreSQL schema: RLS, farm_records, profiles, crops, triggers
├── api/                         # Vercel Serverless Function entry points
│   ├── status.js
│   ├── chat.js
│   ├── analyze.js
│   ├── mandi.js
│   ├── weather.js
│   ├── auth.js
│   ├── profile.js
│   ├── crops.js
│   └── activities.js
├── data/
│   └── database.json            # Local persistent JSON database
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules (secrets protected)
├── vercel.json                  # Vercel routing, rewrites, and security headers
├── server.js                    # Zero-dependency local Node.js development server
└── README.md                    # Platform documentation (this file)
```

---

## ⚡ Quick Start (Local Development)

1. **Start the local server:**
   ```bash
   node server.js
   ```

2. **Open in browser:**
   ```
   http://localhost:3000
   ```

3. **Built-in Demo Credentials:**
   - **Email:** `farmer@farmsaathi.in`
   - **Password:** `farmer123`
   - *(You can also click **"Demo Mode"** in the login modal for instant 1-click access)*

---

## ☁️ Supabase Configuration Guide

FarmSaathi AI supports full cloud authentication and data persistence using **Supabase** with **Row Level Security (RLS)**.

### Step 1: Create a Supabase Project
1. Log in to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **Publishable Anon Key** from `Project Settings > API`.

### Step 2: Run the SQL Schema
1. In the Supabase Dashboard, go to the **SQL Editor**.
2. Open `database/schema.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. This script creates:
   - `public.profiles` — Farmer details, land size, soil type, language
   - `public.farms` — Farm plots
   - `public.crops` — Registered crops, sowing dates, growth stages
   - `public.farm_activities` — Calendar tasks, irrigation reminders
   - `public.crop_analyses` — Crop scan diagnosis reports
   - `public.chat_conversations` & `public.chat_messages`
   - `public.farm_records` — Unified polymorphic table supporting custom farmer records
   - **Row Level Security (RLS) Policies** on every table ensuring each user can only read, insert, update, and delete their own records (`auth.uid() = user_id`)
   - Automatic profile generation trigger on user signup (`on_auth_user_created`).

### Step 3: Configure Frontend Credentials
You can configure Supabase in two ways:
1. **Via the UI:** Open FarmSaathi AI, go to **Settings > Supabase Cloud Configuration**, paste your Project URL and Anon Key, and click **Save Supabase Settings**.
2. **Via Code:** In `frontend/js/supabase-client.js`, set `CONFIG.supabaseUrl` and `CONFIG.supabaseAnonKey`.

> [!NOTE]
> **Security Notice:** Only the **Supabase Project URL** and **Publishable Anon Key** should ever be in frontend code. Never expose the `service_role` secret key.

---

## 🚀 Vercel Deployment Guide

FarmSaathi AI is fully pre-configured for Vercel with dedicated serverless functions and asset routing.

### Step 1: Deploy with Vercel CLI or Git
- **Via GitHub:** Push your repository to GitHub, go to [vercel.com](https://vercel.com), select **Import Project**, and click **Deploy**.
- **Via CLI:** Run `npx vercel` in the project root directory.

### Step 2: Configure Environment Variables in Vercel
In your Vercel Dashboard, navigate to **Project Settings > Environment Variables** and add:

| Variable Name | Required | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `OPENAI_API_KEY` | Optional | OpenAI API key for live AI chat & crop image diagnosis | `sk-proj-...` |
| `OPENAI_MODEL` | Optional | Model for conversational agronomy | `gpt-4o-mini` |
| `OPENAI_VISION_MODEL` | Optional | Model for crop photo analysis | `gpt-4o-mini` |
| `DATA_GOV_IN_API_KEY` | Optional | Live Indian Mandi feed API key | *(leave empty for verified APMC records)* |
| `SUPABASE_URL` | Optional | Supabase Project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Optional | Supabase Public Publishable Anon Key | `eyJhbGciOi...` |

### Step 3: Verification
Once deployed, Vercel will:
- Serve static frontend assets (`css/style.css`, `css/responsive.css`, `js/*.js`, `index.html`) from `/frontend`.
- Route API requests to serverless functions in `/api/*`.

---

## 🛡️ Agricultural Guardrails & Safety Notice

FarmSaathi AI implements strict agricultural safety guardrails:
- Recommends non-chemical **Integrated Pest Management (IPM)**, biological agents (*Beauveria bassiana*, *Trichoderma viride*), and Neem oil (1500 PPM) as first-line measures.
- Never prescribes high-risk or unverified chemical dosages without emphasizing local consultation.
- Prominently directs farmers to the **Kisan Call Centre (1800-180-1551)** and their district **Krishi Vigyan Kendra (KVK)** for acute outbreaks.

---

## 🧪 Testing Verification

The codebase includes an automated test suite (`scratch/test_suite.js`) validating:
- Static delivery of all 11 modular JavaScript files and CSS tokens.
- REST endpoints for Status, Weather, Mandis, AI Chat, Vision Analysis, Auth, Profiles, Crops, and Activities.
- Data isolation: Authenticated user records are strictly inaccessible to other users.
