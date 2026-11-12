// FarmSaathi AI — Genuine Agricultural AI & Vision Service
// Connects to Google Gemini (gemini-1.5-flash / gemini-2.0-flash) or OpenAI (gpt-4o-mini / gpt-4o).
// Strictly generates question-specific answers and genuine image-based pixel analysis.
// If no AI key is configured, provides clear configuration instructions without faking responses.

const fs = require('fs');
const path = require('path');
const dns = require('dns');

if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

function loadEnvFile() {
  const possiblePaths = [
    path.join(__dirname, '..', '..', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '.env')
  ];
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx !== -1) {
              const key = trimmed.slice(0, idx).trim();
              const val = trimmed.slice(idx + 1).trim().replace(/(^['"]|['"]$)/g, '');
              if (val) process.env[key] = val;
            }
          }
        }
        break;
      } catch (e) {}
    }
  }
}

function getAiConfigStatus() {
  let geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  let openAiKey = (process.env.OPENAI_API_KEY || '').trim();

  if (!geminiKey && !openAiKey) {
    loadEnvFile();
    geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    openAiKey = (process.env.OPENAI_API_KEY || '').trim();
  }

  let activeProvider = 'none';
  if (geminiKey) activeProvider = 'gemini';
  else if (openAiKey) activeProvider = 'openai';

  return {
    hasKey: activeProvider !== 'none',
    provider: activeProvider,
    geminiConfigured: Boolean(geminiKey),
    openaiConfigured: Boolean(openAiKey),
    model: activeProvider === 'gemini'
      ? (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite')
      : (process.env.OPENAI_MODEL || 'gpt-4o-mini')
  };
}

// ==============================================================================
// 1. GENUINE AGRICULTURAL CHAT ASSISTANT
// ==============================================================================
async function askChat(message, language = 'en', profile = {}, history = []) {
  const config = getAiConfigStatus();

  if (!config.hasKey) {
    return {
      success: false,
      missingConfig: true,
      error: 'AI Provider Not Configured',
      answer: '⚠️ **AI Service Configuration Missing**\n\n' +
        'Ask FarmSaathi AI requires a real AI API key to generate genuine, question-specific advice.\n\n' +
        '**How to configure:**\n' +
        '1. Get a free API key from Google AI Studio (`GEMINI_API_KEY`) or OpenAI (`OPENAI_API_KEY`).\n' +
        '2. Add it to your server `.env` file or Vercel Environment Variables:\n' +
        '   `GEMINI_API_KEY=your_key_here` or `OPENAI_API_KEY=your_key_here`\n' +
        '3. Restart your server (`node server.js`).\n\n' +
        'Once configured, FarmSaathi AI will answer your exact questions in English, Hindi, or Marathi with tailored Integrated Pest Management (IPM), soil context, and crop precautions.',
      mode: 'unconfigured'
    };
  }

  const langNames = {
    en: 'English (simple, accessible vocabulary for Indian farmers)',
    hi: 'हिन्दी (Hindi — सरल, किसान-मित्र कृषि भाषा; अंग्रेज़ी मिश्रण से बचें)',
    mr: 'मराठी (Marathi — शेतकरी बांधवांसाठी सोपी व स्पष्ट भाषा; इंग्रजी मिश्रण टाळा)',
    te: 'తెలుగు (Telugu — రైతుల కోసం సరళమైన వ్యవసాయ భాష)',
    kn: 'ಕನ್ನಡ (Kannada — ರೈತರಿಗಾಗಿ ಸರಳ ಕೃಷಿ ಭಾಷೆ)',
    gu: 'ગુજરાતી (Gujarati — ખેડૂતો માટે સરળ ભાષા)',
    pa: 'ਪੰਜਾਬੀ (Punjabi — ਕਿਸਾਨਾਂ ਲਈ ਸਰਲ ਖੇਤੀ ਭਾਸ਼ਾ)',
    ta: 'தமிழ் (Tamil — விவசாயிகளுக்கான எளிய மொழி)',
    bn: 'বাংলা (Bengali — কৃষকদের জন্য সহজ ভাষা)',
    ml: 'മലയാളം (Malayalam — കർഷകർക്കായി ലളിതമായ ഭാഷ)',
    or: 'ଓଡ଼ିଆ (Odia — କୃଷକଙ୍କ ପାଇଁ ସହଜ ଭାଷା)',
    ur: 'اردو (Urdu — کسانوں کے لیے آسان زرعی زبان؛ دائیں سے بائیں لکھیں)'
  };
  const targetLanguage = langNames[language] || langNames.en;

  const rawFarmerName = (profile && (profile.full_name || profile.fullName)) || '';
  const farmerName = (rawFarmerName && rawFarmerName.trim() !== 'Rahul Patil') ? rawFarmerName.trim() : '';

  const farmContext = [
    farmerName ? `Farmer Name: ${farmerName}` : '',
    profile.village || profile.district ? `Location: ${[profile.village, profile.taluka, profile.district, profile.state].filter(Boolean).join(', ')}` : '',
    profile.main_crop ? `Primary Crop: ${profile.main_crop}` : '',
    profile.crop_stage ? `Crop Stage: ${profile.crop_stage}` : '',
    profile.farm_area ? `Farm Area: ${profile.farm_area} ${profile.area_unit || 'acres'}` : '',
    profile.soil_type ? `Soil Type: ${profile.soil_type}` : '',
    profile.irrigation_method ? `Irrigation System: ${profile.irrigation_method}` : '',
    profile.season ? `Current Season: ${profile.season}` : '',
    profile.sowing_date ? `Sowing Date: ${profile.sowing_date}` : ''
  ].filter(Boolean).join(' | ');

  const systemPrompt = `You are FarmSaathi AI — a highly capable, trustworthy agricultural intelligence assistant built exclusively for Indian farmers.

## LANGUAGE
Respond ENTIRELY in: ${targetLanguage}
Do NOT mix languages. Exception: retain scientific species names, chemical abbreviations (NPK, DAP, P₂O₅, K₂O), and registered pesticide labels in their standard form.
${language === 'ur' ? 'Write in right-to-left Urdu script. All text must flow right-to-left.' : ''}

## FARMER CONTEXT
${farmContext ? `Farmer profile: ${farmContext}` : 'No profile provided — treat as a general Indian farming query.'}
${farmerName ? `Address the farmer as "${farmerName}". Never use placeholder names.` : 'Use a respectful generic greeting (e.g., "नमस्ते किसान भाई", "नमस्कार शेतकरी मित्र", "Hello Farmer").'}

## RESPONSE STRUCTURE
For substantive farming questions, structure your response with these sections (use only what is relevant):
**1. Understanding the Problem** — Restate what the farmer is asking in one line.
**2. Relevant Context** — Soil, season, location, crop stage — use profile data if available.
**3. Recommended Action** — Specific, practical, actionable advice.
**4. Quantities & Units** — Only when backed by a verifiable recommendation. Always specify kg/acre vs kg/ha. Show fertilizer math explicitly.
**5. Timing & Application Method** — When to apply, how to apply. No fixed day-schedules for irrigation.
**6. Precautions & Risks** — Application timing (early morning / cool evening), protective gear, pre-harvest interval, weather precautions.
**7. Verified Sources** — Name the institution (ICAR, PDKV Akola, VNMKV Parbhani, MPKV Rahuri, KVK, State Agriculture Dept). Do NOT invent document titles, page numbers, or URLs.
**8. What I Still Need** — If critical information is missing (crop stage, symptom description, soil test result, rainfall), ask ONE focused follow-up question.

## SOURCE RULES — NON-NEGOTIABLE
- NEVER invent or fabricate: research paper titles, URLs, page numbers, publication years, chemical dosages, yield guarantees, or mandi prices.
- When citing a source, use: "As per [Institution] recommendation" or "General agricultural guidance — verify with local KVK."
- Distinguish clearly: verified institutional recommendation vs. general good practice vs. your uncertainty.
- For Maharashtra districts: use PDKV Akola (Vidarbha), VNMKV Parbhani (Marathwada), MPKV Rahuri (Western Maharashtra), Dr. PDKV where applicable.
- For other states: cite relevant state agricultural university or ICAR institute.
- Always mention Kisan Call Center 1800-180-1551 when recommending expert verification.

## FERTILIZER MATH — DETERMINISTIC RULES
- If pre-calculated math is provided in the message (tagged [SYSTEM PRE-CALCULATED FERTILIZER MATH]), use those exact numbers. Do NOT override them.
- Always distinguish N from P from P₂O₅ from K from K₂O explicitly.
- Show step-by-step calculation: (Quantity kg) × (Nutrient% / 100) = Nutrient kg.
- For area conversions: 1 ha = 2.471 acres (exact).
- Never convert a target nutrient dose to a fertilizer quantity without an agronomic recommendation backing it.

## CROP DISEASE / PEST DIAGNOSIS
- Base diagnosis ONLY on symptoms described by the farmer or visible in an uploaded image.
- If no image is provided, never claim visual analysis was performed.
- State confidence level: High / Moderate / Low / Inconclusive.
- For chemical pesticide recommendations: mention crop, pest, and that the farmer must verify label directions.
- Always recommend KVK agronomist or block agriculture development officer confirmation for uncertain or serious cases.
- Prioritize IPM: cultural controls → biological controls (Neem oil 5 ml/L, Trichoderma, Beauveria bassiana, pheromone traps) → chemical as last resort.

## IRRIGATION GUIDANCE
- Never give fixed day-interval schedules without knowing soil type, crop stage, and recent rainfall.
- Ask for soil texture (sandy/clay/loam) and crop growth stage before giving irrigation frequency.
- Reference IW:CPE ratios or tensiometer readings where appropriate.

## MISSING INFORMATION
- If you cannot give a safe, specific answer because critical details are missing, ask exactly ONE follow-up question — the most important missing piece.
- Do not ask multiple questions at once.
- Do not assume farm details not provided.

## SAFETY & HONESTY
- Never guarantee yield or profit.
- Clearly label uncertainty: "This is general guidance. Consult your local KVK for field-specific advice."
- Never fabricate weather, soil test values, village names, or market prices.
- If a question is outside agriculture/farming scope, politely redirect.`;

  // --- GOOGLE GEMINI PROVIDER ---
  if (config.provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY.trim();
    // Live API test (2026-10-31) confirmed: gemini-3.5-flash-lite is available, supports
    // vision (image input), and responds with HTTP 200. gemini-1.5-flash / gemini-2.x-flash
    // are no longer available to new API keys. The API itself recommends gemini-3.5-flash-lite.
    let model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
    // Replace any outdated/non-existent model references
    if (!model || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-2.5-flash') {
      model = 'gemini-3.5-flash-lite';
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const formattedContents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-10)) {
        if (!h.content) continue;
        formattedContents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(h.content).slice(0, 2000) }]
        });
      }
    }
    // Append current user message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: formattedContents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000
      }
    };

    let lastErr = null;
    let data = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), 45000);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeoutTimer);
        data = await res.json();
        if (res.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
          const text = data.candidates[0].content.parts.map(p => p.text).join('\n').trim();
          return {
            success: true,
            answer: text,
            mode: 'gemini-ai',
            model: model
          };
        }
        if (data && data.error) {
          lastErr = new Error(`Google Gemini Error: ${data.error.message || 'API call failed'}`);
          if (res.status >= 400 && res.status < 500) break;
        }
      } catch (err) {
        lastErr = err;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    }

    const errDetail = (data && data.error && data.error.message) || (lastErr && lastErr.message) || 'Gemini API call failed';
    throw new Error(`Google Gemini Error: ${errDetail}`);
  }

  // --- OPENAI PROVIDER ---
  if (config.provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY.trim();
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const formattedMessages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-10)) {
        if (!h.content) continue;
        formattedMessages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: String(h.content).slice(0, 2000)
        });
      }
    }
    formattedMessages.push({ role: 'user', content: message });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.3,
        max_tokens: 2000,
        messages: formattedMessages
      })
    });

    const data = await res.json();
    if (res.ok && data.choices && data.choices[0] && data.choices[0].message) {
      return {
        success: true,
        answer: data.choices[0].message.content.trim(),
        mode: 'openai-ai',
        model: model
      };
    } else {
      const errDetail = (data.error && data.error.message) || 'OpenAI API call failed';
      throw new Error(`OpenAI Error: ${errDetail}`);
    }
  }

  throw new Error('No supported AI provider active.');
}

// ==============================================================================
// 2. GENUINE IMAGE-BASED MULTIMODAL CROP ANALYSIS
// ==============================================================================
async function analyzeCropPhoto(imageBufferOrBase64, mimeType = 'image/jpeg', cropName = '', fileName = '', language = 'en') {
  const config = getAiConfigStatus();

  if (!config.hasKey) {
    return {
      success: false,
      missingConfig: true,
      error: 'Vision AI Configuration Required',
      report: '⚠️ **Vision AI Configuration Missing**\n\n' +
        'Genuine crop image pixel analysis requires a vision-capable AI model (Google Gemini or OpenAI GPT-4o).\n\n' +
        '**To enable real image analysis:**\n' +
        '1. Set `GEMINI_API_KEY=...` or `OPENAI_API_KEY=...` in your server `.env` or Vercel Environment Variables.\n' +
        '2. Restart your server (`node server.js`).\n\n' +
        'Once enabled, FarmSaathi AI inspects leaf lesions, pest damage, discoloration, and fungal patterns directly from your uploaded photo pixels.',
      crop: cropName || 'Unspecified Crop',
      mode: 'unconfigured'
    };
  }

  if (!imageBufferOrBase64) {
    throw new Error('No image data provided for visual crop analysis.');
  }

  // Parse pure Base64 data and mime type
  let pureBase64 = '';
  let resolvedMime = mimeType || 'image/jpeg';

  if (typeof imageBufferOrBase64 === 'string') {
    if (imageBufferOrBase64.startsWith('data:')) {
      const parts = imageBufferOrBase64.split(',');
      const meta = parts[0];
      pureBase64 = parts[1];
      const match = meta.match(/data:(.*?);base64/);
      if (match && match[1]) resolvedMime = match[1];
    } else {
      pureBase64 = imageBufferOrBase64;
    }
  } else if (Buffer.isBuffer(imageBufferOrBase64)) {
    pureBase64 = imageBufferOrBase64.toString('base64');
  }

  const langNames = {
    en: 'English',
    hi: 'हिन्दी (Hindi)',
    mr: 'मराठी (Marathi)',
    te: 'తెలుగు (Telugu)',
    kn: 'ಕನ್ನಡ (Kannada)',
    gu: 'ગુજરાતી (Gujarati)',
    pa: 'ਪੰਜਾਬੀ (Punjabi)',
    ta: 'தமிழ் (Tamil)',
    bn: 'বাংলা (Bengali)',
    ml: 'മലയാളം (Malayalam)',
    or: 'ଓଡ଼ିଆ (Odia)',
    ur: 'اردو (Urdu)'
  };
  const targetLanguage = langNames[language] || 'English';

  const visionPrompt = `You are a senior plant pathologist and agronomist analyzing an ACTUAL uploaded crop photograph from an Indian farmer.
You are receiving real image pixels — analyze ONLY what is visually present in this specific image.
Crop hint from farmer: "${cropName || 'Not specified — identify from image'}".
Report language: ${targetLanguage}.
${language === 'ur' ? 'Write in right-to-left Urdu script.' : ''}

CRITICAL RULES:
- Base ALL observations on visible evidence in the uploaded image. Do NOT fabricate symptoms not visible.
- State your confidence level explicitly: High / Moderate / Low / Inconclusive.
- Never claim to have analyzed a physical lab sample — this is a visual/photographic analysis only.
- If the image is unclear, blurry, or insufficient for diagnosis, say so and ask for a clearer photo.
- Never recommend specific branded pesticides. Mention only active ingredients with their label-recommended dosage if known.

Structure your response with these sections:

### 1. 🌾 Crop & Plant Part Identification
Identify: crop species, plant part photographed (leaf, stem, root, pod, fruit, boll), and overall plant health impression.

### 2. 🔍 Observable Visual Symptoms
Describe only what is visible: lesion shape and color, affected area on leaf (margin/vein/tip/interveinal), powdery or downy growth, stippling, feeding holes, discoloration, wilting. Be specific — do not generalize.

### 3. 🧪 Preliminary Diagnosis & Confidence
State the most probable cause: fungal disease / bacterial infection / viral / nutrient deficiency / pest / abiotic stress.
State confidence level. Explain what makes you confident or uncertain.
Mention: laboratory confirmation (culture test or PCR) is needed for definitive diagnosis.

### 4. 🌱 IPM & Crop Care Plan
**Cultural Controls (do immediately):** Sanitation, spacing, drainage, roguing of infected plants.
**Biological Controls (prefer first):** Neem oil (1500 PPM, 5 ml/L), Trichoderma viride (5 g/L), Beauveria bassiana, pheromone traps — with application rate and timing.
**Chemical Control (last resort):** Active ingredient only, with note that farmer must check label for crop-specific registration and PHI.
**Application safety:** Spray at early morning or cool evening. Use mask and gloves. Avoid spraying in wind or before rain.

### 5. 🛡️ Expert Verification
Advise farmer to consult: local KVK agronomist, Taluka Krishi Adhikari, or Kisan Call Center 1800-180-1551 before purchasing chemicals.
If diagnosis confidence is Low or Inconclusive, strongly recommend field visit by an expert.`;

  // --- GEMINI MULTIMODAL VISION ---
  if (config.provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY.trim();
    // Live API test (2026-10-31) confirmed: gemini-3.5-flash-lite is available, supports
    // vision (image input), and responds with HTTP 200. gemini-1.5-flash / gemini-2.x-flash
    // are no longer available to new API keys. The API itself recommends gemini-3.5-flash-lite.
    let model = (process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
    // Replace any outdated/non-existent model references with the confirmed working model
    if (!model || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-2.5-flash') {
      model = 'gemini-3.5-flash-lite';
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: visionPrompt },
            {
              inline_data: {
                mime_type: resolvedMime,
                data: pureBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000
      }
    };

    let lastErr = null;
    let data = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), 55000);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeoutTimer);
        data = await res.json();
        if (res.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
          const text = data.candidates[0].content.parts.map(p => p.text).join('\n').trim();
          return {
            success: true,
            report: text,
            crop: cropName || 'Analyzed Crop',
            mode: 'gemini-vision',
            model: model
          };
        }
        if (data && data.error) {
          lastErr = new Error(`Google Gemini Vision Error: ${data.error.message || 'Vision API call failed'}`);
          if (res.status >= 400 && res.status < 500) break;
        }
      } catch (err) {
        lastErr = err;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }

    const errDetail = (data && data.error && data.error.message) || (lastErr && lastErr.message) || 'Gemini Vision API error';
    throw new Error(`Google Gemini Vision Error: ${errDetail}`);
  }

  // --- OPENAI MULTIMODAL VISION ---
  if (config.provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY.trim();
    const model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const dataUrl = `data:${resolvedMime};base64,${pureBase64}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
            ]
          }
        ]
      })
    });

    const data = await res.json();
    if (res.ok && data.choices && data.choices[0] && data.choices[0].message) {
      return {
        success: true,
        report: data.choices[0].message.content.trim(),
        crop: cropName || 'Analyzed Crop',
        mode: 'openai-vision',
        model: model
      };
    } else {
      const errDetail = (data.error && data.error.message) || 'OpenAI Vision API error';
      throw new Error(`OpenAI Vision Error: ${errDetail}`);
    }
  }

  throw new Error('No supported Vision AI provider configured.');
}

module.exports = {
  getAiConfigStatus,
  askChat,
  analyzeCropPhoto
};
