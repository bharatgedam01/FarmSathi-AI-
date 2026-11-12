// FarmSaathi AI — Open-Meteo Geocoding API Proxy
// No API key required. Supports all Indian cities and towns.
// GET /api/geocode?q=Mumbai&limit=8
// Returns: [{name, lat, lon, country, admin1, admin2, admin3, display}]

'use strict';

const https = require('https');
const url = require('url');

// 15-minute in-memory cache
const geocodeCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function fetchGeocodeResults(query, limit) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      name: query,
      count: String(Math.min(limit || 8, 15)),
      language: 'en',
      format: 'json'
    });

    const options = {
      hostname: 'geocoding-api.open-meteo.com',
      path: '/v1/search?' + params.toString(),
      method: 'GET',
      headers: {
        'User-Agent': 'FarmSaathi-AI/1.0 (agricultural-assistant)',
        'Accept': 'application/json'
      },
      timeout: 8000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Invalid JSON from geocoding API'));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Geocoding API timeout'));
    });

    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (res.writeHead) res.writeHead(204); else res.status(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const query = (req.query && req.query.q) || parsedUrl.query.q || '';
  const limit = parseInt((req.query && req.query.limit) || parsedUrl.query.limit || '8', 10);

  const send = (statusCode, body) => {
    const payload = JSON.stringify(body);
    if (res.writeHead) {
      res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'public, max-age=900'
      });
      res.end(payload);
    } else {
      res.status(statusCode).json(body);
    }
  };

  if (!query || query.trim().length < 2) {
    return send(400, { success: false, message: 'Query must be at least 2 characters.' });
  }

  const cacheKey = query.trim().toLowerCase() + ':' + limit;
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return send(200, { success: true, results: cached.results, cached: true });
  }

  try {
    const raw = await fetchGeocodeResults(query.trim(), limit);

    if (!raw || !Array.isArray(raw.results)) {
      return send(200, { success: true, results: [] });
    }

    const results = raw.results.map(r => {
      // Build a clean display string: "City, State, Country"
      const parts = [r.name];
      if (r.admin2 && r.admin2 !== r.name) parts.push(r.admin2);
      if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
      if (r.country_code && r.country_code !== 'IN') parts.push(r.country || r.country_code);

      return {
        name: r.name || '',
        lat: r.latitude,
        lon: r.longitude,
        country: r.country || '',
        country_code: r.country_code || '',
        admin1: r.admin1 || '',   // State
        admin2: r.admin2 || '',   // District
        admin3: r.admin3 || '',   // Sub-district / Taluka
        elevation: r.elevation || null,
        timezone: r.timezone || 'Asia/Kolkata',
        display: parts.join(', ')
      };
    });

    geocodeCache.set(cacheKey, { results, ts: Date.now() });
    return send(200, { success: true, results });

  } catch (err) {
    console.error('[Geocode] Error:', err.message);
    return send(502, {
      success: false,
      message: 'Geocoding service temporarily unavailable. Please try again.',
      error: err.message
    });
  }
};

