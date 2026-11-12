// FarmSaathi AI — Chat API Route
// Handles farmer questions in all 12 supported languages with Gemini AI.
// Pre-calculates deterministic fertilizer math and enriches context from conversation history.
// Automatically fetches REAL weather + mandi data for location-based questions.

'use strict';

const https = require('https');
const aiService = require('../services/aiService');
const { buildFertilizerContext } = require('../services/fertilizerCalc');
const weatherService = require('../services/weatherService');
const mandiService = require('../services/mandiService');

// ---------------------------------------------------------------------------
// HELPERS — Context extraction from history
// ---------------------------------------------------------------------------
function extractContextFromHistory(history) {
  const ctx = {};
  if (!Array.isArray(history) || history.length === 0) return ctx;

  const recentText = history.slice(-6)
    .map(h => String(h.content || '').toLowerCase())
    .join(' ');

  const stagePatterns = [
    { pattern: /\b(seedling|nursery|germination|उगवण|अंकुरण)\b/, stage: 'seedling' },
    { pattern: /\b(vegetative|tillering|vegetatif|वनस्पतिक|कायिक)\b/, stage: 'vegetative' },
    { pattern: /\b(flowering|blooming|फुलोरा|फूल)\b/, stage: 'flowering' },
    { pattern: /\b(pod.?fill|grain.?fill|दाणे भरणे|शेंगा)\b/, stage: 'grain filling' },
    { pattern: /\b(maturity|ripening|harvest|परिपक्व|काढणी|कापणी)\b/, stage: 'maturity/harvest' }
  ];
  for (const { pattern, stage } of stagePatterns) {
    if (pattern.test(recentText)) { ctx.crop_stage = stage; break; }
  }

  if (/\b(kharif|खरीप|खरिफ)\b/.test(recentText)) ctx.season = 'Kharif';
  else if (/\b(rabi|रब्बी|रबी)\b/.test(recentText)) ctx.season = 'Rabi';
  else if (/\b(zaid|summer|उन्हाळी|जायद)\b/.test(recentText)) ctx.season = 'Zaid/Summer';

  return ctx;
}

// ---------------------------------------------------------------------------
// HELPERS — Detect if message is asking about weather or mandi prices
// ---------------------------------------------------------------------------
const WEATHER_PATTERNS = [
  /\b(weather|temperature|temp|mausam|mausa[mw]|hawa|tapman|तापमान|मौसम|हवा|पाऊस|rain|rainfall|humid|wind|forecast|will it rain|barish|बारिश|varsha|varsha|उष्णता|थंडी|धुके|fog|cloud|thunder|storm|sunrise|sunset|उगवण|मावळ)\b/i,
  /\b(aaj ka mausam|aaj weather|आज का मौसम|आजचे हवामान|weather in|temperature in|temp in|weather of|climate|climate in|what is the weather)\b/i
];

const MANDI_PATTERNS = [
  /\b(mandi|market price|bhav|rate|rates|दर|भाव|market rate|cotton price|soybean price|wheat price|onion price|kapas|kapus|kapas bhav|सोयाबीन|कापूस|गहू|कांदा|price of|today.?s price|aaj ka bhav|आज का भाव|आजचा भाव|apmc|agmarknet|market today)\b/i,
  /\b(cheapest|highest price|modal price|min price|max price|nearest market|nearby market|which market)\b/i
];

function isWeatherQuestion(text) {
  return WEATHER_PATTERNS.some(p => p.test(text));
}

function isMandiQuestion(text) {
  return MANDI_PATTERNS.some(p => p.test(text));
}

// ---------------------------------------------------------------------------
// HELPERS — Extract location name from message
// ---------------------------------------------------------------------------
const KNOWN_LOCATIONS = [
  'nagpur', 'gadchiroli', 'armori', 'desaiganj', 'chandrapur', 'pune', 'nashik',
  'mumbai', 'amravati', 'akola', 'wardha', 'yavatmal', 'buldhana', 'washim',
  'jalgaon', 'dhule', 'nandurbar', 'nanded', 'latur', 'osmanabad', 'beed',
  'hingoli', 'parbhani', 'aurangabad', 'solapur', 'satara', 'sangli',
  'kolhapur', 'ratnagiri', 'sindhudurg', 'thane', 'raigad', 'ahmednagar',
  'bhandara', 'gondia', 'warora', 'brahmapuri', 'sironcha', 'mulchera',
  'delhi', 'lucknow', 'jaipur', 'bhopal', 'indore', 'hyderabad', 'bengaluru',
  'chennai', 'kolkata', 'ahmedabad', 'surat', 'rajkot', 'ludhiana', 'amritsar',
  'karnal', 'bathinda', 'guntur', 'warangal', 'nizamabad', 'patna', 'varanasi'
];

function extractLocationFromMessage(text) {
  const lower = text.toLowerCase();

  // Patterns like "in Nagpur", "at Gadchiroli", "of Armori", "Nagpur weather"
  const locationPatterns = [
    /\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /\bat\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /\bof\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:weather|mandi|price|bhav|rate|temperature|temp)/g,
    /(?:weather|mandi|price|bhav|rate|temperature|temp)\s+(?:in\s+|at\s+|of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g
  ];

  for (const pat of locationPatterns) {
    pat.lastIndex = 0;
    let match;
    while ((match = pat.exec(text)) !== null) {
      const candidate = match[1] ? match[1].trim() : '';
      if (candidate && candidate.length >= 3) return candidate;
    }
  }

  // Check known locations by substring
  for (const loc of KNOWN_LOCATIONS) {
    if (lower.includes(loc)) {
      return loc.charAt(0).toUpperCase() + loc.slice(1);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// HELPERS — Geocode a city name via Open-Meteo (backend-to-backend)
// ---------------------------------------------------------------------------
async function geocodeCityName(cityName) {
  if (!cityName) return null;
  return new Promise((resolve) => {
    const params = new URLSearchParams({
      name: cityName.trim(),
      count: '3',
      language: 'en',
      format: 'json',
      countryCode: 'IN'
    });
    const req = https.request({
      hostname: 'geocoding-api.open-meteo.com',
      path: '/v1/search?' + params.toString(),
      method: 'GET',
      headers: { 'User-Agent': 'FarmSaathi-AI/2.0', 'Accept': 'application/json' },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && Array.isArray(parsed.results) && parsed.results.length > 0) {
            const r = parsed.results[0];
            resolve({ lat: r.latitude, lon: r.longitude, name: r.name, state: r.admin1 || '', district: r.admin2 || '' });
          } else {
            resolve(null);
          }
        } catch (e) { resolve(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// ---------------------------------------------------------------------------
// HELPERS — Build weather context string from API data
// ---------------------------------------------------------------------------
function buildWeatherContext(weatherData, locationName) {
  if (!weatherData || !weatherData.success) {
    return `\n\n[WEATHER DATA: Unable to fetch live weather for ${locationName}. The weather service is currently unavailable.]`;
  }

  const cur = weatherData.current;
  const loc = weatherData.location || {};
  const daily = weatherData.daily || [];
  const today = daily[0] || {};
  const tomorrow = daily[1] || {};

  let ctx = `\n\n[LIVE WEATHER DATA — Use this exact data to answer weather questions. Do NOT fabricate any values.]
Location: ${loc.name || locationName} (${loc.lat ? loc.lat.toFixed(4) : '?'}°N, ${loc.lon ? loc.lon.toFixed(4) : '?'}°E)
Observation Time: ${cur.observed_time || 'recent'} IST
Data Source: Open-Meteo NWP (ECMWF/ICON model blend) — model estimate, not IMD station observation

CURRENT CONDITIONS:
- Temperature: ${cur.temperature !== undefined ? cur.temperature + '°C' : 'N/A'}
- Feels Like: ${cur.feels_like !== undefined ? cur.feels_like + '°C' : 'N/A'}
- Weather: ${cur.condition || 'N/A'} (${cur.description || ''})
- Humidity: ${cur.humidity !== undefined ? cur.humidity + '%' : 'N/A'}
- Wind: ${cur.wind_speed !== undefined ? cur.wind_speed + ' km/h ' + (cur.wind_direction_compass || '') : 'N/A'}
- Precipitation (last hour): ${cur.precipitation !== undefined ? cur.precipitation + ' mm' : '0 mm'}
- Cloud Cover: ${cur.cloud_cover !== undefined ? cur.cloud_cover + '%' : 'N/A'}`;

  if (today.date) {
    ctx += `

TODAY (${today.date}):
- Max Temp: ${today.temp_max !== null ? Math.round(today.temp_max) + '°C' : 'N/A'}
- Min Temp: ${today.temp_min !== null ? Math.round(today.temp_min) + '°C' : 'N/A'}
- Rain Probability: ${today.precipitation_probability_max || 0}%
- Expected Rain: ${today.precipitation_sum || 0} mm
- Sunrise: ${today.sunrise ? today.sunrise.slice(11, 16) + ' IST' : 'N/A'}
- Sunset: ${today.sunset ? today.sunset.slice(11, 16) + ' IST' : 'N/A'}`;
  }

  if (tomorrow.date) {
    ctx += `

TOMORROW (${tomorrow.date}):
- Max Temp: ${tomorrow.temp_max !== null ? Math.round(tomorrow.temp_max) + '°C' : 'N/A'}
- Min Temp: ${tomorrow.temp_min !== null ? Math.round(tomorrow.temp_min) + '°C' : 'N/A'}
- Rain Probability: ${tomorrow.precipitation_probability_max || 0}%
- Expected Rain: ${tomorrow.precipitation_sum || 0} mm`;
  }

  if (daily.length > 2) {
    ctx += `\n\n7-DAY FORECAST:`;
    daily.slice(0, 7).forEach((d, i) => {
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.date;
      ctx += `\n  ${label}: ${d.condition || 'Fair'}, Max ${d.temp_max !== null ? Math.round(d.temp_max) + '°C' : '?'}, Min ${d.temp_min !== null ? Math.round(d.temp_min) + '°C' : '?'}, Rain ${d.precipitation_probability_max || 0}% (${d.precipitation_sum || 0}mm)`;
    });
  }

  ctx += `\n\nINSTRUCTION: Use ONLY the above verified API data to answer weather questions. Do NOT generate random temperatures or guess values.]`;
  return ctx;
}

// ---------------------------------------------------------------------------
// HELPERS — Build mandi context string from API data
// ---------------------------------------------------------------------------
function buildMandiContext(mandiData, cropQuery, locationName) {
  if (!mandiData || !mandiData.success || !mandiData.records || mandiData.records.length === 0) {
    const reason = mandiData && mandiData.message
      ? mandiData.message
      : 'No mandi price data available. DATA_GOV_IN_API_KEY may not be configured.';
    return `\n\n[MANDI PRICE DATA: ${reason}. Do NOT invent or guess mandi prices. Tell the farmer the data is currently unavailable and suggest they check at their local APMC or Agmarknet.gov.in directly.]`;
  }

  const records = mandiData.records.slice(0, 20); // cap at 20 records for context
  let ctx = `\n\n[LIVE MANDI PRICE DATA — Use only these verified prices. Do NOT fabricate any price values.]
Source: ${mandiData.source || 'Data.gov.in / Agmarknet'}
Latest Observation Date: ${mandiData.latestObservationDate || 'See per-record dates'}
${locationName ? 'Queried for: ' + locationName : ''}

MARKET PRICE RECORDS:`;

  records.forEach((r, i) => {
    ctx += `
${i + 1}. ${r.crop}${r.variety ? ' (' + r.variety + ')' : ''} @ ${r.market}, ${r.district ? r.district + ', ' : ''}${r.state}
   Min: ₹${r.min_price}/Qtl | Modal: ₹${r.modal_price}/Qtl | Max: ₹${r.max_price}/Qtl
   Per kg (approx): ₹${(r.modal_price / 100).toFixed(1)} | Date: ${r.arrival_date || 'N/A'}`;
  });

  ctx += `\n\nINSTRUCTION: Use ONLY the above verified market data to answer mandi price questions. Never invent prices or use MSP as market price. If Armori market is not listed, say clearly that no Armori data was returned today and show the nearest available markets.]`;
  return ctx;
}

// ---------------------------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------------------------
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead ? res.writeHead(204).end() : res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    const err = { success: false, error: 'Method not allowed. Use POST.' };
    if (res.writeHead) {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(err));
    } else {
      res.status(405).json(err);
    }
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    } else if (!body && req.on) {
      let raw = '';
      await new Promise((resolve, reject) => {
        req.on('data', chunk => { raw += chunk; });
        req.on('end', resolve);
        req.on('error', reject);
      });
      try { body = JSON.parse(raw); } catch (e) { body = {}; }
    }

    const message = String((body && body.message) || '').trim();
    if (!message) {
      const err = { success: false, error: 'Please enter a farming question.' };
      if (res.writeHead) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(err));
      } else {
        res.status(400).json(err);
      }
      return;
    }

    const language = body.language || 'en';
    const history = Array.isArray(body.history) ? body.history : [];

    // Merge submitted profile with any context implied from conversation history
    const submittedProfile = body.profile || {};
    const historyContext = extractContextFromHistory(history);
    const profile = Object.assign({}, submittedProfile, historyContext);

    // Pre-calculate fertilizer math for deterministic accuracy
    const fertilizerContext = buildFertilizerContext(message);

    // -------------------------------------------------------------------------
    // DETECT WEATHER / MANDI QUESTIONS AND INJECT REAL API DATA
    // -------------------------------------------------------------------------
    const needsWeather = isWeatherQuestion(message);
    const needsMandi = isMandiQuestion(message);

    let weatherContext = '';
    let mandiContext = '';

    if (needsWeather || needsMandi) {
      // Extract location from message, fall back to profile location
      const mentionedLocation = extractLocationFromMessage(message);
      const profileLocation = profile.village || profile.taluka || profile.district || profile.city || '';
      const targetLocation = mentionedLocation || profileLocation;

      // Geocode the location
      let resolvedCoords = null;
      if (targetLocation) {
        resolvedCoords = await geocodeCityName(targetLocation);
      }

      // Fetch weather data in parallel with mandi data
      const fetchPromises = [];

      if (needsWeather && resolvedCoords) {
        fetchPromises.push(
          weatherService.getWeatherData({
            lat: resolvedCoords.lat,
            lon: resolvedCoords.lon,
            city: resolvedCoords.name || targetLocation,
            district: resolvedCoords.district || (profile.district || ''),
            state: resolvedCoords.state || (profile.state || ''),
            isGps: false
          }).then(data => ({ type: 'weather', data, location: resolvedCoords.name || targetLocation }))
            .catch(() => ({ type: 'weather', data: null, location: targetLocation }))
        );
      } else if (needsWeather && !resolvedCoords && targetLocation) {
        // Could not geocode — build failure context
        weatherContext = `\n\n[WEATHER DATA: Could not resolve coordinates for "${targetLocation}". Do not guess or fabricate weather. Tell the farmer you need their exact location.]`;
      } else if (needsWeather) {
        weatherContext = `\n\n[WEATHER DATA: No location specified. Ask the farmer which city/village they want weather for.]`;
      }

      if (needsMandi) {
        // Extract crop from message for mandi filter
        const cropMatches = message.match(/\b(cotton|kapas|kapus|soybean|soya|wheat|gehun|onion|pyaz|tomato|maize|makka|paddy|dhan|rice|tur|arhar|gram|chana|groundnut|moong|sugarcane)\b/i);
        const cropQuery = cropMatches ? cropMatches[0] : (profile.main_crop || '');
        const stateForMandi = resolvedCoords && resolvedCoords.state ? resolvedCoords.state :
          (profile.state || (targetLocation && targetLocation.match(/maharashtra/i) ? 'Maharashtra' : ''));

        fetchPromises.push(
          mandiService.queryMandiPrices({
            state: stateForMandi,
            query: cropQuery,
            sort: 'date_desc',
            forceRefresh: false
          }).then(data => ({ type: 'mandi', data, cropQuery, location: targetLocation }))
            .catch(() => ({ type: 'mandi', data: null, cropQuery, location: targetLocation }))
        );
      }

      // Await all fetches in parallel
      if (fetchPromises.length > 0) {
        const results = await Promise.allSettled(fetchPromises);
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) {
            if (r.value.type === 'weather') {
              weatherContext = buildWeatherContext(r.value.data, r.value.location);
            } else if (r.value.type === 'mandi') {
              mandiContext = buildMandiContext(r.value.data, r.value.cropQuery, r.value.location);
            }
          }
        }
      }
    }

    // Build the final message with all context injected
    let messageWithContext = message;
    if (fertilizerContext) messageWithContext += fertilizerContext;
    if (weatherContext) messageWithContext += weatherContext;
    if (mandiContext) messageWithContext += mandiContext;

    const result = await aiService.askChat(messageWithContext, language, profile, history);

    const payload = {
      success: !result.missingConfig,
      missingConfig: Boolean(result.missingConfig),
      answer: result.answer,
      error: result.error || null,
      mode: result.mode,
      model: result.model || null
    };

    const statusCode = 200;
    if (res.writeHead) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(payload));
    } else {
      res.status(statusCode).json(payload);
    }

  } catch (err) {
    console.error('Chat API Error:', err);
    const isNetworkErr = err.message && (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED'));
    const userFacingMsg = isNetworkErr
      ? '⚠️ **AI service is temporarily unreachable.** Please check your internet connection and API key, then try again.'
      : `⚠️ **AI Service Error:** ${err.message || 'Unable to connect to AI model.'}`;
    const payload = {
      success: false,
      error: err.message || 'Internal AI Error.',
      answer: userFacingMsg
    };
    if (res.writeHead) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify(payload));
    } else {
      res.status(200).json(payload);
    }
  }
};
