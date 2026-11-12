// FarmSaathi AI — Farmer Profile API Route
// Handles retrieving and saving farmer land and crop profile records.

const crypto = require('crypto');
const dbService = require('../services/dbService');

function getAuthUserId(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader) {
    const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (cleanToken.startsWith('fs_sess.')) {
      try {
        const parts = cleanToken.split('.');
        if (parts.length === 3) {
          const secret = dbService.getSessionSecret ? dbService.getSessionSecret() : (process.env.SESSION_SECRET || process.env.CRON_SECRET || 'farmsaathi-secure-session-salt-2026');
          const expectedSig = crypto.createHmac('sha256', secret).update(parts[1]).digest('base64url');
          if (parts[2] === expectedSig) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            if (payload.exp && payload.exp > Date.now()) {
              return payload.userId;
            }
          }
        }
      } catch (e) {}
    }
    const user = dbService.getUserByToken(authHeader);
    if (user && user.id) return user.id;
  }
  return null;
}

function sendJson(res, statusCode, data) {
  if (res.writeHead) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead ? res.writeHead(204).end() : res.status(204).end();
    return;
  }

  const userId = getAuthUserId(req);
  const method = req.method.toUpperCase();

  try {
    if (method === 'GET') {
      if (!userId) {
        sendJson(res, 200, { success: true, profile: null });
        return;
      }
      const profile = await dbService.getProfile(userId);
      sendJson(res, 200, { success: true, profile });
      return;
    }

    if (method === 'POST' || method === 'PUT') {
      if (!userId) {
        sendJson(res, 401, { success: false, error: 'Unauthorized. Please sign in to save profile.' });
        return;
      }
      const body = await parseBody(req);
      const updated = await dbService.saveProfile(userId, body);
      sendJson(res, 200, { success: true, message: 'Profile updated successfully', profile: updated });
      return;
    }

    sendJson(res, 405, { success: false, error: 'Method not allowed' });
  } catch (err) {
    sendJson(res, 500, { success: false, error: err.message });
  }
};
