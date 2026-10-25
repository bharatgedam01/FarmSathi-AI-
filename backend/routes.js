// FarmSaathi AI - Backend REST API Router
// Zero-dependency Node.js router that connects HTTP requests to persistent JSON database and AI engines.

const url = require('url');
const path = require('path');
const db = require('./db');
const aiService = require('./services/aiService');
const mandiService = require('./services/mandiService');
const weatherService = require('./services/weatherService');

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

// Parse request body as JSON
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) { // 15MB limit (for crop photo uploads)
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        // Return raw body or error
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

// Extract authenticated user or fallback to demo
function getAuthUser(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader) {
    const user = db.getUserByToken(authHeader);
    if (user) return user;
  }
  // Default fallback user for open demo access
  return { id: 'user_demo', fullName: 'Rahul Patil', email: 'farmer@farmsaathi.in' };
}

// Dispatch to Netlify Function if existing
async function dispatchNetlifyFunction(funcName, req, pathname, query, rawBody) {
  const funcFile = path.join(FUNCTIONS_DIR, `${funcName}.js`);
  const fs = require('fs');
  if (!fs.existsSync(funcFile)) return null;

  delete require.cache[require.resolve(funcFile)];
  const handler = require(funcFile).handler;

  const event = {
    httpMethod: req.method,
    path: pathname,
    headers: req.headers,
    queryStringParameters: query,
    body: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)
  };

  const result = await handler(event, {});
  return {
    statusCode: result.statusCode || 200,
    headers: result.headers || { 'Content-Type': 'application/json' },
    body: result.body || ''
  };
}

async function handleApiRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/$/, '');
  const method = req.method.toUpperCase();
  const query = parsedUrl.query;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  // Parse body for write methods
  let body = {};
  let rawBodyText = '';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      let raw = '';
      await new Promise((resolve, reject) => {
        req.on('data', chunk => { raw += chunk; });
        req.on('end', resolve);
        req.on('error', reject);
      });
      rawBodyText = raw;
      if (raw.trim()) {
        try { body = JSON.parse(raw); } catch (e) { body = { raw }; }
      }
    } catch (e) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body: ' + e.message });
      return true;
    }
  }

  const user = getAuthUser(req);

  try {
    // -------------------------------------------------------------
    // 1. SYSTEM & HEALTH STATUS
    // -------------------------------------------------------------
    if (pathname === '/api/status' || pathname === '/api/health') {
      const stats = db.getStats();
      sendJson(res, 200, {
        success: true,
        status: 'online',
        name: 'FarmSaathi AI Backend Server',
        version: '2.0.0',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        stats: stats
      });
      return true;
    }

    // -------------------------------------------------------------
    // 2. AUTHENTICATION ENDPOINTS
    // -------------------------------------------------------------
    if (pathname === '/api/auth/signup' && method === 'POST') {
      const { fullName, email, password, phone } = body;
      if (!fullName || !fullName.trim() || !email || !email.includes('@') || !password || password.length < 6) {
        sendJson(res, 400, { success: false, error: 'Full name, valid email, and password (at least 6 characters) are required' });
        return true;
      }
      try {
        const newUser = db.createUser(fullName, email, password, phone);
        const token = db.createSession(newUser.id);
        const profile = db.getProfile(newUser.id);
        sendJson(res, 201, {
          success: true,
          message: 'Account created successfully',
          token: token,
          user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email, phone: newUser.phone },
          profile: profile
        });
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) {
        sendJson(res, 400, { success: false, error: 'Email and password are required' });
        return true;
      }
      try {
        const authUser = db.authenticateUser(email, password);
        const token = db.createSession(authUser.id);
        const profile = db.getProfile(authUser.id);
        sendJson(res, 200, {
          success: true,
          message: 'Logged in successfully',
          token: token,
          user: { id: authUser.id, fullName: authUser.fullName, email: authUser.email, phone: authUser.phone },
          profile: profile
        });
      } catch (err) {
        sendJson(res, 401, { success: false, error: err.message });
      }
      return true;
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const authHeader = req.headers['authorization'];
      if (authHeader) db.deleteSession(authHeader);
      sendJson(res, 200, { success: true, message: 'Logged out successfully' });
      return true;
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        sendJson(res, 200, {
          success: true,
          authenticated: false,
          user: user,
          profile: db.getProfile('user_demo')
        });
        return true;
      }
      const verified = db.getUserByToken(authHeader);
      if (!verified) {
        sendJson(res, 401, { success: false, error: 'Session expired or invalid' });
        return true;
      }
      const profile = db.getProfile(verified.id);
      sendJson(res, 200, {
        success: true,
        authenticated: true,
        user: verified,
        profile: profile
      });
      return true;
    }

    // -------------------------------------------------------------
    // 3. FARMER PROFILE ENDPOINTS
    // -------------------------------------------------------------
    if (pathname === '/api/profile') {
      if (method === 'GET') {
        const profile = db.getProfile(user.id);
        sendJson(res, 200, { success: true, profile: profile });
        return true;
      }
      if (method === 'POST' || method === 'PUT') {
        const updated = db.saveProfile(user.id, body);
        sendJson(res, 200, { success: true, message: 'Profile updated', profile: updated });
        return true;
      }
    }

    // -------------------------------------------------------------
    // 4. CROPS MANAGEMENT ENDPOINTS
    // -------------------------------------------------------------
    if (pathname === '/api/crops') {
      if (method === 'GET') {
        const crops = db.getCrops(user.id);
        sendJson(res, 200, { success: true, crops: crops, count: crops.length });
        return true;
      }
      if (method === 'POST') {
        const newCrop = db.addCrop(user.id, body);
        sendJson(res, 201, { success: true, message: 'Crop added', crop: newCrop });
        return true;
      }
    }

    if (pathname.startsWith('/api/crops/')) {
      const cropId = pathname.replace('/api/crops/', '');
      if (method === 'DELETE') {
        const deleted = db.deleteCrop(user.id, cropId);
        sendJson(res, 200, { success: deleted, message: deleted ? 'Crop removed' : 'Crop not found' });
        return true;
      }
    }

    // -------------------------------------------------------------
    // 5. FARM ACTIVITIES ENDPOINTS
    // -------------------------------------------------------------
    if (pathname === '/api/activities') {
      if (method === 'GET') {
        const activities = db.getActivities(user.id);
        sendJson(res, 200, { success: true, activities: activities, count: activities.length });
        return true;
      }
      if (method === 'POST') {
        const newAct = db.addActivity(user.id, body);
        sendJson(res, 201, { success: true, message: 'Activity scheduled', activity: newAct });
        return true;
      }
    }

    if (pathname.startsWith('/api/activities/')) {
      const parts = pathname.replace('/api/activities/', '').split('/');
      const actId = parts[0];
      const subAction = parts[1];

      if (subAction === 'toggle' && (method === 'POST' || method === 'PATCH')) {
        const updated = db.toggleActivity(user.id, actId);
        sendJson(res, 200, { success: !!updated, activity: updated });
        return true;
      }

      if (method === 'DELETE') {
        const deleted = db.deleteActivity(user.id, actId);
        sendJson(res, 200, { success: deleted, message: deleted ? 'Activity removed' : 'Activity not found' });
        return true;
      }
    }

    // -------------------------------------------------------------
    // 6. CROP PHOTO ANALYSIS HISTORY ENDPOINTS
    // -------------------------------------------------------------
    if (pathname === '/api/history' || pathname === '/api/analyses') {
      if (method === 'GET') {
        const list = db.getAnalyses(user.id);
        sendJson(res, 200, { success: true, analyses: list, count: list.length });
        return true;
      }
      if (method === 'POST') {
        const record = db.addAnalysis(user.id, body);
        sendJson(res, 201, { success: true, message: 'Analysis saved', record: record });
        return true;
      }
      if (method === 'DELETE') {
        db.clearAnalyses(user.id);
        sendJson(res, 200, { success: true, message: 'History cleared' });
        return true;
      }
    }

    if (pathname.startsWith('/api/history/') || pathname.startsWith('/api/analyses/')) {
      const scanId = pathname.replace(/^\/api\/(history|analyses)\//, '');
      if (method === 'DELETE') {
        const deleted = db.deleteAnalysis(user.id, scanId);
        sendJson(res, 200, { success: deleted, message: deleted ? 'Scan removed' : 'Scan not found' });
        return true;
      }
    }

    // -------------------------------------------------------------
    // 7. CHAT, ANALYZE, MANDI ENDPOINTS
    // -------------------------------------------------------------
    if (pathname === '/api/chat' && method === 'POST') {
      const message = String((body && body.message) || '').trim();
      if (!message) {
        sendJson(res, 400, { success: false, error: 'Please enter a farming question.' });
        return true;
      }
      const chatRes = await aiService.askChat(message, body.language || 'en', body.profile || {}, body.history || []);
      sendJson(res, 200, { success: true, answer: chatRes.answer, mode: chatRes.mode });
      return true;
    }

    if (pathname === '/api/analyze' && method === 'POST') {
      const image = (body && (body.image || body.imageBase64 || body.photo)) || null;
      const cropName = (body && body.cropName) || '';
      const fileName = (body && body.fileName) || 'crop_leaf.jpg';
      const language = (body && body.language) || 'en';
      const analyzeRes = await aiService.analyzeCropPhoto(image, 'image/jpeg', cropName, fileName, language);
      sendJson(res, 200, { success: true, report: analyzeRes.report, crop: analyzeRes.crop, mode: analyzeRes.mode });
      return true;
    }

    if (pathname === '/api/mandi' && method === 'GET') {
      const state = query.state || '';
      const search = query.q || query.search || query.crop || '';
      const mandiRes = mandiService.queryMandiPrices({ state, query: search });
      sendJson(res, 200, mandiRes);
      return true;
    }

    // -------------------------------------------------------------
    // 8. RESILIENT WEATHER PROXY ENDPOINT
    // -------------------------------------------------------------
    if (pathname === '/api/weather') {
      const city = query.city || query.location || 'Gadchiroli';
      const lat = query.lat;
      const lon = query.lon;
      const weatherData = await weatherService.getWeatherData({ city, lat, lon });
      sendJson(res, 200, weatherData);
      return true;
    }

    return false; // Not handled by custom routes
  } catch (err) {
    console.error('API Router Error on ' + pathname + ':', err);
    sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
    return true;
  }
}

module.exports = {
  handleApiRequest
};
