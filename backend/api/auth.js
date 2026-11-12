// FarmSaathi AI — Auth API Route
// Handles farmer signup, login, session check, and logout.

const url = require('url');
const crypto = require('crypto');
const dbService = require('../services/dbService');

function sendJson(res, statusCode, data) {
  if (res.writeHead) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(data));
  } else {
    res.status(statusCode).json(data);
  }
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  let raw = '';
  await new Promise((resolve, reject) => {
    req.on('data', chunk => { raw += chunk; });
    req.on('end', resolve);
    req.on('error', reject);
  });
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead ? res.writeHead(204).end() : res.status(204).end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = (parsedUrl.pathname || '').replace(/\/$/, '');
  const method = req.method.toUpperCase();
  const action = (parsedUrl.query && parsedUrl.query.action) ? String(parsedUrl.query.action).toLowerCase() : '';

  try {
    // 1. SIGNUP
    if ((pathname.endsWith('/signup') || action === 'signup') && method === 'POST') {
      const body = await parseBody(req);
      const { fullName, email, password, phone } = body;
      if (!email || !password) {
        sendJson(res, 400, { success: false, error: 'Email and password are required' });
        return;
      }
      try {
        const newUser = await dbService.createUser(fullName, email, password, phone);
        const token = dbService.createSession(newUser.id);
        const profile = await dbService.getProfile(newUser.id);
        sendJson(res, 201, {
          success: true,
          message: 'Account created successfully',
          token,
          user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email, phone: newUser.phone },
          profile
        });
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return;
    }

    // 2. LOGIN
    if ((pathname.endsWith('/login') || action === 'login') && method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      if (!email || !password) {
        sendJson(res, 400, { success: false, error: 'Email and password are required' });
        return;
      }
      try {
        const authUser = await dbService.authenticateUser(email, password);
        const token = dbService.createSession(authUser.id);
        const profile = await dbService.getProfile(authUser.id);
        sendJson(res, 200, {
          success: true,
          message: 'Logged in successfully',
          token,
          user: { id: authUser.id, fullName: authUser.fullName, email: authUser.email, phone: authUser.phone },
          profile
        });
      } catch (err) {
        sendJson(res, 401, { success: false, error: err.message });
      }
      return;
    }

    // 3. LOGOUT
    if ((pathname.endsWith('/logout') || action === 'logout') && method === 'POST') {
      const authHeader = req.headers['authorization'];
      if (authHeader) dbService.deleteSession(authHeader);
      sendJson(res, 200, { success: true, message: 'Logged out successfully' });
      return;
    }

    // 4. GET CURRENT USER (ME)
    if ((pathname.endsWith('/me') || action === 'me' || pathname.endsWith('/auth')) && method === 'GET') {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        sendJson(res, 200, {
          success: true,
          authenticated: false,
          user: null,
          profile: null
        });
        return;
      }

      let verified = await dbService.getUserByToken(authHeader);
      if (!verified) {
        const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();
        const parts = cleanToken.split('.');
        if (parts.length === 3) {
          try {
            const secret = dbService.getSessionSecret ? dbService.getSessionSecret() : (process.env.SESSION_SECRET || process.env.CRON_SECRET || 'farmsaathi-secure-session-salt-2026');
            const expectedSig = crypto.createHmac('sha256', secret).update(parts[1]).digest('base64url');
            if (parts[2] === expectedSig) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
              if (payload.exp && payload.exp > Date.now()) {
                verified = { id: payload.userId, fullName: 'Farmer', email: '', phone: '' };
              }
            }
          } catch (e) {}
        }
      }

      if (!verified) {
        sendJson(res, 200, {
          success: true,
          authenticated: false,
          user: null,
          profile: null
        });
        return;
      }

      const profile = await dbService.getProfile(verified.id);
      sendJson(res, 200, {
        success: true,
        authenticated: true,
        user: {
          id: verified.id,
          fullName: verified.fullName || (profile && profile.fullName) || 'Farmer',
          email: verified.email || '',
          phone: verified.phone || (profile && profile.phone) || ''
        },
        profile
      });
      return;
    }

    sendJson(res, 405, { success: false, error: 'Method not allowed' });
  } catch (err) {
    sendJson(res, 500, { success: false, error: err.message });
  }
};
