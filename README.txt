==============================================================================
FARMSAATHI AI — PRODUCTION WEB APPLICATION
==============================================================================

Welcome to FarmSaathi AI! This application includes a responsive frontend,
Netlify serverless functions, Open-Meteo live weather integration, APMC Mandi
price explorer, multimodal plant disease triage, and a complete Supabase SQL schema.

For complete documentation, architecture diagrams, and full guides, refer to:
  README.md

QUICK START (LOCAL TESTING):
----------------------------
1. Open PowerShell or Command Prompt in this folder.
2. Run:
     node server.js
3. Open your browser at:
     http://localhost:3000

KEY FILES:
----------
- index.html                   : Complete responsive web application
- server.js                    : Zero-dependency Node.js dev server & API simulator
- netlify.toml                 : Netlify configuration, headers & API redirects
- .env.example                 : Environment variable template
- netlify/functions/chat.js    : AI Assistant endpoint (OpenAI chat)
- netlify/functions/analyze.js : Crop photo triage endpoint (OpenAI vision)
- netlify/functions/mandi.js   : APMC Mandi market prices endpoint
- netlify/functions/status.js  : System configuration & health probe
- supabase/schema.sql          : PostgreSQL database tables, RLS policies & triggers
- README.md                    : Detailed setup, testing, and deployment manual

DEPLOYING TO NETLIFY:
---------------------
1. Go to https://app.netlify.com and select "Add new site" > "Deploy manually".
2. Drag and drop this extracted folder into the deploy drop zone.
3. In Site Configuration > Environment Variables, add:
     OPENAI_API_KEY = your_openai_api_key
4. Your application will be live at: https://your-site-name.netlify.app

==============================================================================
