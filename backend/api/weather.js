// FarmSaathi AI — Weather API Route
// Handles lat/lon weather queries. When only a city name is provided,
// resolves it via Open-Meteo Geocoding API first, then local location DB.
// NEVER uses hardcoded fallback coordinates or fabricated temperatures.

const url = require('url');
const https = require('https');
const weatherService = require('../services/weatherService');
const locationService = require('../services/locationService');

function sendJson(res, statusCode, data) {
  if (res.writeHead) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': statusCode === 200 ? 'public, max-age=600' : 'no-store'
    });
    res.end(JSON.stringify(data));
  } else {
    res.status(statusCode).json(data);
  }
}

/**
 * Resolve city/village name to lat/lon using Open-Meteo Geocoding API.
 * Falls back to local location DB if geocoding API fails.
 * NEVER uses hardcoded coordinates.
 */
async function resolveLocationByName(cityName, localLocationService) {
  if (!cityName || !cityName.trim()) return null;

  // 1. Try Open-Meteo Geocoding API first (supports Indian cities, districts, talukas, villages)
  try {
    const params = new URLSearchParams({
      name: cityName.trim(),
      count: '5',
      language: 'en',
      format: 'json',
      countryCode: 'IN'
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'geocoding-api.open-meteo.com',
        path: '/v1/search?' + params.toString(),
        method: 'GET',
        headers: { 'User-Agent': 'FarmSaathi-AI/2.0', 'Accept': 'application/json' },
        timeout: 6000
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Invalid JSON from geocoding')); }
        });
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('Geocoding timeout')); });
      req.on('error', reject);
      req.end();
    });

    if (result && Array.isArray(result.results) && result.results.length > 0) {
      const r = result.results[0];
      return {
        lat: r.latitude,
        lon: r.longitude,
        name: r.name || cityName,
        admin1: r.admin1 || '',  // State
        admin2: r.admin2 || '',  // District
        admin3: r.admin3 || '',  // Taluka
        source: 'open-meteo-geocoding'
      };
    }
  } catch (err) {
    console.warn('[Weather API] Open-Meteo geocoding failed:', err.message, '— trying local DB');
  }

  // 2. Fall back to local location DB
  try {
    const matches = await localLocationService.searchLocations(cityName, 1);
    if (matches && matches.length > 0) {
      return {
        lat: matches[0].lat,
        lon: matches[0].lon,
        name: matches[0].name || cityName,
        admin1: matches[0].state || '',
        admin2: matches[0].district || '',
        admin3: matches[0].taluka || '',
        source: 'local-db'
      };
    }
  } catch (err) {
    console.warn('[Weather API] Local location DB search failed:', err.message);
  }

  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead ? res.writeHead(204).end() : res.status(204).end();
    return;
  }

  const reqUrl = req.url || '';
  const parsedUrl = reqUrl ? url.parse(reqUrl, true) : { query: {} };
  const query = req.query || parsedUrl.query || {};

  let lat = query.lat ? parseFloat(query.lat) : null;
  let lon = query.lon ? parseFloat(query.lon) : null;
  let city = (query.city || query.location || '').trim();
  let taluka = (query.taluka || '').trim();
  let district = (query.district || '').trim();
  let state = (query.state || '').trim();
  const isGps = query.isGps === 'true' || query.isGps === true || query.isGps === '1';

  // If coordinates not directly provided, resolve from city name
  if (lat === null || isNaN(lat) || lon === null || isNaN(lon)) {
    if (city) {
      const resolved = await resolveLocationByName(city, locationService);
      if (resolved) {
        lat = resolved.lat;
        lon = resolved.lon;
        // Only override admin fields if not already provided
        if (!state && resolved.admin1) state = resolved.admin1;
        if (!district && resolved.admin2) district = resolved.admin2;
        if (!taluka && resolved.admin3) taluka = resolved.admin3;
        // Use resolved name as city display name if city was vague
        if (!city || city.length < 3) city = resolved.name;
      }
    }
  }

  // STRICT: DO NOT DEFAULT TO GADCHIROLI, PUNE, OR ANY HARDCODED CITY
  if (lat === null || isNaN(lat) || lon === null || isNaN(lon)) {
    return sendJson(res, 400, {
      success: false,
      error: city
        ? `Could not find geographic coordinates for "${city}". Please try a different spelling, e.g. "Nagpur", "Gadchiroli", "Armori", "Chandrapur", or use the GPS button.`
        : 'Latitude and longitude (lat, lon) or a valid city/village name are required to fetch weather.',
      isLive: false
    });
  }

  const result = await weatherService.getWeatherData({
    lat,
    lon,
    city: city || `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
    taluka,
    district,
    state,
    isGps
  });

  const statusCode = result.success ? 200 : 503;
  sendJson(res, statusCode, result);
};
