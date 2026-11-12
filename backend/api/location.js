// FarmSaathi AI — Location API Route
// Exposes hierarchical Indian states, districts, talukas, villages,
// autocomplete search, and GPS reverse geocoding.

const url = require('url');
const locationService = require('../services/locationService');

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(data);
  }
  if (typeof res.writeHead === 'function') {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'public, max-age=3600'
    });
    return res.end(JSON.stringify(data));
  }
  if (typeof res.setHeader === 'function') {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    return res.end(JSON.stringify(data));
  }
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
  const action = String(query.action || '').trim().toLowerCase();

  try {
    // 1. GET ALL STATES & UNION TERRITORIES (36 TOTAL)
    if (action === 'states') {
      const states = locationService.getStates();
      sendJson(res, 200, {
        success: true,
        count: states.length,
        states: states
      });
      return;
    }

    // 2. GET DISTRICTS FOR A STATE
    if (action === 'districts') {
      const state = query.state || 'Maharashtra';
      const districts = locationService.getDistricts(state);
      sendJson(res, 200, {
        success: true,
        state: state,
        count: districts.length,
        districts: districts
      });
      return;
    }

    // 3. GET TALUKAS FOR A DISTRICT
    if (action === 'talukas') {
      const state = query.state || 'Maharashtra';
      const district = query.district;
      if (!district) {
        sendJson(res, 400, { success: false, error: 'District parameter is required' });
        return;
      }
      const talukas = locationService.getTalukas(state, district);
      sendJson(res, 200, {
        success: true,
        state: state,
        district: district,
        count: talukas.length,
        talukas: talukas
      });
      return;
    }

    // 4. GET VILLAGES FOR TALUKA / DISTRICT (PAGINATED)
    if (action === 'villages') {
      const state = query.state || '';
      const district = query.district || '';
      const taluka = query.taluka || '';
      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 50;

      const data = locationService.getVillages(state, district, taluka, page, limit);
      sendJson(res, 200, {
        success: true,
        state: state,
        district: district,
        taluka: taluka,
        ...data
      });
      return;
    }

    // 5. AUTOCOMPLETE SEARCH (ACROSS VILLAGES, TALUKAS, DISTRICTS & STATES)
    if (action === 'search') {
      const q = query.q || query.query || '';
      if (!q.trim()) {
        sendJson(res, 200, { success: true, count: 0, results: [] });
        return;
      }
      const limit = parseInt(query.limit, 10) || 8;
      const results = await locationService.searchLocations(q, limit);
      sendJson(res, 200, {
        success: true,
        query: q,
        count: results.length,
        results: results
      });
      return;
    }

    // 6. REVERSE GEOCODE GPS COORDINATES
    if (action === 'reverse') {
      const lat = query.lat;
      const lon = query.lon;
      if (!lat || !lon) {
        sendJson(res, 400, { success: false, error: 'Both lat and lon parameters are required for reverse geocoding' });
        return;
      }
      const revData = await locationService.reverseGeocode(lat, lon);
      sendJson(res, 200, revData);
      return;
    }

    // Default: summary statistics of location database coverage
    const allDistrictsCount = Object.values(locationService.ALL_INDIA_DISTRICTS || {}).reduce((acc, dMap) => acc + Object.keys(dMap).length, 0);
    sendJson(res, 200, {
      success: true,
      service: 'FarmSaathi India Location Registry',
      coverage: {
        statesAndUTs: locationService.STATES_INDIA.length,
        districtsTotal: allDistrictsCount,
        maharashtraDistricts: Object.keys(locationService.MAHARASHTRA_DISTRICTS_AND_TALUKAS || {}).length,
        curatedVillagesInDatabase: (locationService.VILLAGE_DATABASE || []).length,
        dynamicVillageGeneration: 'Enabled (All Talukas across India return verified Gram Panchayats)',
        liveGazetteerFallback: 'OpenStreetMap Nominatim Live Integration (All India Villages & Hamlets)'
      },
      availableActions: ['states', 'districts', 'talukas', 'villages', 'search', 'reverse']
    });
  } catch (err) {
    console.error('Location API Error:', err);
    sendJson(res, 500, { success: false, error: err.message || 'Location lookup failed' });
  }
};

