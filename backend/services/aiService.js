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
    en: 'English (simple, accessible vocabulary for Indian agriculture)',
    hi: 'हिन्दी (Hindi - सरल एवं स्पष्ट कृषि भाषा)',
    mr: 'मराठी (Marathi - शेतकरी बांधवांसाठी सोपी व स्पष्ट भाषा)'
  };
  const targetLanguage = langNames[language] || langNames.en;

  const rawFarmerName = (profile && (profile.full_name || profile.fullName)) || '';
  const farmerName = (rawFarmerName && rawFarmerName.trim() !== 'Rahul Patil') ? rawFarmerName.trim() : '';

  const farmContext = [
    farmerName ? `Farmer Name: ${farmerName}` : '',
    profile.village || profile.district ? `Location: ${[profile.village, profile.district, profile.state].filter(Boolean).join(', ')}` : '',
    profile.main_crop ? `Primary Crop: ${profile.main_crop}` : '',
    profile.farm_area ? `Farm Area: ${profile.farm_area} ${profile.area_unit || 'acres'}` : '',
    profile.soil_type ? `Soil Type: ${profile.soil_type}` : '',
    profile.irrigation_method ? `Irrigation System: ${profile.irrigation_method}` : '',
    profile.season ? `Current Season: ${profile.season}` : ''
  ].filter(Boolean).join(' | ');

  const systemPrompt = `You are FarmSaathi AI, an expert, trustworthy agricultural advisor created specifically for Indian farmers.
Target Language: Respond purely in ${targetLanguage}.
Available Farmer Farm Profile: ${farmContext || 'General Indian farming context'}.

CRITICAL INSTRUCTIONS:
1. GREETING: If greeting the farmer, ${farmerName ? `address them warmly as "${farmerName}"` : `use a respectful neutral greeting (such as "Hello Farmer", "नमस्ते किसान भाई", or "नमस्कार शेतकरी मित्र")`}. NEVER greet with any placeholder or assumed name like "Rahul Patil".
2. Address the farmer's SPECIFIC question directly. Do not give generic or boilerplate speeches.
3. Consider their crop, soil, location, and season whenever provided in the farm profile or chat history.
4. If critical details are missing to give a safe recommendation (such as exact crop stage, pest symptom appearance, or recent rainfall), politely ask the necessary follow-up question.
5. Emphasize sustainable Integrated Pest Management (IPM), biological controls (e.g., Neem oil, Trichoderma, Beauveria bassiana, pheromone traps), and balanced soil nutrition.
6. PRECAUTIONS & TIMING: When mentioning any agricultural inputs, specify application timing (early morning or late evening), wind direction, protective gear (mask and gloves), and pre-harvest intervals.
7. AVOID unsupported facts: Never invent chemical dosages, guarantee harvest yields, or fabricate specific brand claims.
8. Clearly acknowledge uncertainty for ambiguous symptoms and advise consulting the nearest Krishi Vigyan Kendra (KVK) or calling the Kisan Call Center toll-free at 1800-180-1551.
9. Maintain conversation continuity: review previous messages to answer follow-up questions cohesively.`;

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
      for (const h of history.slice(-6)) {
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
        maxOutputTokens: 1200
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
      for (const h of history.slice(-6)) {
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
        max_tokens: 1200,
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
    mr: 'मराठी (Marathi)'
  };
  const targetLanguage = langNames[language] || 'English';

  const visionPrompt = `You are a senior plant pathologist and agronomist analyzing an actual farmer crop photo from India.
Context Crop Hint provided by farmer: "${cropName || 'Not specified - identify from image'}".
Image File: "${fileName || 'crop_photo.jpg'}".
Language for Report: Respond in ${targetLanguage}.

Perform a detailed, scientific, and practical diagnosis based on visible visual evidence in the image:

Structure your response with clear Markdown headings:
### 1. 🌾 Crop & Plant Part Identification
- Identify the crop/plant shown in the image and the specific organ (leaf, stem, pod, boll, root, fruit).
- Assess overall plant vitality and vigor visible.

### 2. 🔍 Observable Visual Symptoms
- Describe observable visual signs in detail: lesion geometry (concentric rings, angular water-soaked spots, irregular blotches), color variations (yellow chlorosis, brown necrosis, reddish margins, purple patches), fungal powdery/downy growth, sucking pest stippling, or insect feeding holes.
- State which part of the leaf/organ is affected (veins, interveinal tissue, margins, tips).

### 3. 🧪 Preliminary Diagnosis & Likelihood
- State the most probable disease, pest infestation, or physiological/nutrient disorder.
- Clearly distinguish between a preliminary visual diagnosis and a certified laboratory culture test.
- Confidence Level: State confidence (e.g., High, Moderate, Inconclusive) and state if additional angle photos or leaf underside photos are needed.

### 4. 🌱 Integrated Pest Management (IPM) & Crop Care Plan
- **Immediate Cultural Actions:** Infected leaf sanitation, spacing, weeding, or drainage adjustments.
- **Organic & Biological Solutions:** Safe sprays (e.g., 1500 PPM Neem oil at 5ml/L, Trichoderma viride, Beauveria bassiana, or cow urine/buttermilk formulations).
- **Nutrient Balancing:** Micro-nutrients or foliar supplements to help crop recovery.
- **Application Precautions:** Time of spray (early morning / cool evening), use of mask/gloves, spray drift precautions.

### 5. 🛡️ Advisory & Expert Verification
- Remind the farmer to consult their local Krishi Vigyan Kendra (KVK) agronomist or block agriculture development officer (Taluka Krishi Adhikari) before purchasing commercial chemicals.`;

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
        maxOutputTokens: 1400
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
        max_tokens: 1400,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } }
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
