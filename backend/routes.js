// FarmSaathi AI - Backend REST API Router
// Zero-dependency Node.js router that connects HTTP requests to persistent JSON database and AI engines.

const url = require('url');
const path = require('path');
const db = require('./db');
const aiService = require('./services/aiService');
const mandiService = require('./services/mandiService');
const weatherService = require('./services/weatherService');
const schemeService = require('./services/schemeService');

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

// Extract authenticated user or fallback to neutral anonymous session
function getAuthUser(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader) {
    // 1. Try local session token
    const user = db.getUserByToken(authHeader);
    if (user) return user;

    // 2. Try Supabase JWT
    const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const parts = cleanToken.split('.');
    if (parts.length === 3) {
      try {
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(payloadBase64, 'base64').toString('utf8');
        const payload = JSON.parse(json);
        if (payload && (payload.sub || payload.id)) {
          const meta = payload.user_metadata || {};
          return {
            id: payload.sub || payload.id,
            fullName: meta.full_name || '',
            email: payload.email || '',
            isSupabase: true
          };
        }
      } catch (e) {}
    }
  }
  // Neutral anonymous fallback - never return another user's profile or hardcoded name
  return { id: 'anonymous', fullName: '', email: '' };
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
  if (req.body && typeof req.body === 'object') {
    body = req.body;
  } else if (typeof req.body === 'string' && req.body.trim()) {
    try { body = JSON.parse(req.body); } catch (e) { body = {}; }
  } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      let raw = '';
      if (!req.readableEnded) {
        await new Promise((resolve, reject) => {
          req.on('data', chunk => { raw += chunk; });
          req.on('end', resolve);
          req.on('error', reject);
        });
      }
      rawBodyText = raw;
      if (raw && raw.trim()) {
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
      const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
      const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');
      const hasAiKey = hasGeminiKey || hasOpenAiKey;
      const activeProvider = hasGeminiKey ? 'Google Gemini' : (hasOpenAiKey ? 'OpenAI' : 'None');
      const chatModel = hasGeminiKey ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

      sendJson(res, 200, {
        success: true,
        status: 'online',
        name: 'FarmSaathi AI Backend Server',
        version: '2.0.0',
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        aiConfigured: hasAiKey,
        aiProvider: activeProvider,
        chatModel: hasAiKey ? chatModel : 'Unconfigured (Awaiting GEMINI_API_KEY)',
        visionConfigured: hasAiKey,
        visionModel: hasAiKey ? chatModel : 'Unconfigured (Awaiting GEMINI_API_KEY)',
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

      if (method === 'PUT' || method === 'PATCH') {
        const updated = db.updateActivity(user.id, actId, body);
        sendJson(res, 200, { success: !!updated, message: updated ? 'Activity updated' : 'Activity not found', activity: updated });
        return true;
      }

      if (method === 'GET') {
        const activities = db.getActivities(user.id);
        const act = activities.find(a => String(a.id) === String(actId));
        if (act) {
          sendJson(res, 200, { success: true, activity: act });
        } else {
          sendJson(res, 404, { success: false, error: 'Activity not found' });
        }
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
      const clientProfile = Object.assign({}, body.profile || {});
      if (!clientProfile.full_name || clientProfile.full_name === 'Rahul Patil') {
        clientProfile.full_name = (user && user.fullName) || '';
      }
      const chatRes = await aiService.askChat(message, body.language || 'en', clientProfile, body.history || []);
      sendJson(res, 200, { 
        success: !chatRes.missingConfig, 
        missingConfig: Boolean(chatRes.missingConfig),
        answer: chatRes.answer, 
        mode: chatRes.mode 
      });
      return true;
    }

    if (pathname === '/api/analyze' && method === 'POST') {
      const image = (body && (body.image || body.imageBase64 || body.photo)) || null;
      const cropName = (body && body.cropName) || '';
      const fileName = (body && body.fileName) || 'crop_leaf.jpg';
      const language = (body && body.language) || 'en';

      // Persist uploaded image to disk for permanent reference in Analysis History
      let savedImageUrl = null;
      if (image && typeof image === 'string' && image.startsWith('data:')) {
        try {
          const fs = require('fs');
          const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
          const extMatch = image.match(/data:image\/([a-zA-Z0-9+]+);base64/);
          const ext = extMatch ? `.${extMatch[1]}` : '.jpg';
          const cleanName = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
          const filePath = path.join(uploadsDir, cleanName);
          const base64Content = image.split(',')[1];
          if (base64Content) {
            fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
            savedImageUrl = `/uploads/${cleanName}`;
          }
        } catch (saveErr) {
          console.warn('Could not save photo to disk in routes.js:', saveErr.message);
        }
      }

      const analyzeRes = await aiService.analyzeCropPhoto(image, 'image/jpeg', cropName, fileName, language);
      sendJson(res, 200, { 
        success: !analyzeRes.missingConfig, 
        missingConfig: Boolean(analyzeRes.missingConfig),
        report: analyzeRes.report, 
        crop: analyzeRes.crop, 
        imageUrl: savedImageUrl || null,
        mode: analyzeRes.mode 
      });
      return true;
    }

    if (pathname === '/api/mandi' && method === 'GET') {
      const state = query.state || '';
      const search = query.q || query.search || query.crop || '';
      const sort = query.sort || '';
      const forceRefresh = query.refresh === 'true' || query.refresh === '1';
      const mandiRes = await mandiService.queryMandiPrices({ state, query: search, sort, forceRefresh });
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

    // -------------------------------------------------------------
    // 9. AUTOMATED GOVERNMENT SCHEMES & MONITORING ENDPOINTS
    // -------------------------------------------------------------
    if (pathname === '/api/schemes' && method === 'GET') {
      const userProfile = db.getProfile(user.id);
      const schemes = schemeService.getSchemes({
        category: query.category,
        state: query.state,
        search: query.q || query.search
      }, userProfile);

      sendJson(res, 200, {
        success: true,
        count: schemes.length,
        schemes: schemes
      });
      return true;
    }

    if (pathname === '/api/schemes/announcements' && method === 'GET') {
      const announcements = schemeService.getAnnouncements(parseInt(query.limit, 10) || 20);
      sendJson(res, 200, {
        success: true,
        count: announcements.length,
        announcements: announcements
      });
      return true;
    }

    if (pathname === '/api/schemes/status' && method === 'GET') {
      const status = schemeService.getMonitoringStatus();
      sendJson(res, 200, {
        success: true,
        monitoring: status
      });
      return true;
    }

    // Secure Cron & Manual Sync trigger (Vercel Cron & Administrator execution)
    if ((pathname === '/api/cron/schemes' || pathname === '/api/schemes/sync') && (method === 'GET' || method === 'POST')) {
      const authHeader = req.headers['authorization'] || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const providedSecret = req.headers['x-cron-secret'] || query.secret || query.key || bearerToken;
      const expectedSecret = process.env.CRON_SECRET || 'farmsaathi-cron-secret-2026';

      const isAuthorized = (providedSecret && providedSecret === expectedSecret) || (user && user.id && user.id !== 'anonymous');
      if (!isAuthorized) {
        sendJson(res, 401, { success: false, error: 'Unauthorized: CRON_SECRET or authenticated session required' });
        return true;
      }

      const syncResult = await schemeService.checkForUpdates(true);
      sendJson(res, 200, {
        success: true,
        message: 'Automated Government Schemes & Announcements check completed',
        result: syncResult
      });
      return true;
    }

    if (pathname.startsWith('/api/schemes/') && method === 'GET') {
      const schemeId = pathname.replace('/api/schemes/', '');
      const userProfile = db.getProfile(user.id);
      const scheme = schemeService.getSchemeById(schemeId, userProfile);
      if (scheme) {
        sendJson(res, 200, { success: true, scheme: scheme });
      } else {
        sendJson(res, 404, { success: false, error: 'Scheme not found' });
      }
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
