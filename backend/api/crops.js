// FarmSaathi AI — Crops API Route
// Handles farmer crops: listing, adding, and removing crop records.

const url = require('url');
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

function getTodayIST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function isPastDateIST(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const cleanDate = dateStr.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate < getTodayIST();
  }
  return false;
}

function sendJson(res, statusCode, data) {
  if (res.writeHead) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead ? res.writeHead(204).end() : res.status(204).end();
    return;
  }

  const userId = getAuthUserId(req);
  const method = req.method.toUpperCase();
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/$/, '');

  const parts = pathname.split('/');
  const cropId = (parts.length > 3 && parts[parts.length - 1] !== 'crops')
    ? parts[parts.length - 1]
    : (parsedUrl.query.id || '');

  try {
    if (method === 'GET') {
      if (!userId) {
        sendJson(res, 200, { success: true, count: 0, crops: [] });
        return;
      }
      const crops = await dbService.getCrops(userId);
      sendJson(res, 200, { success: true, count: crops.length, crops });
      return;
    }

    if (method === 'POST') {
      if (!userId) {
        sendJson(res, 401, { success: false, error: 'Unauthorized. Please sign in to add crops.' });
        return;
      }
      const body = await parseBody(req);
      const sowingDate = body.sowingDate || body.sowing_date;
      if (sowingDate && isPastDateIST(sowingDate)) {
        sendJson(res, 400, {
          success: false,
          error: 'Past dates are not allowed. Please select today or a future date (Asia/Kolkata).'
        });
        return;
      }
      const newCrop = await dbService.addCrop(userId, body);
      sendJson(res, 201, { success: true, message: 'Crop added successfully', crop: newCrop });
      return;
    }

    if (method === 'DELETE') {
      if (!userId) {
        sendJson(res, 401, { success: false, error: 'Unauthorized. Please sign in to remove crops.' });
        return;
      }
      if (!cropId) {
        sendJson(res, 400, { success: false, error: 'Crop ID is required for deletion' });
        return;
      }
      const deleted = await dbService.deleteCrop(userId, cropId);
      sendJson(res, 200, { success: deleted, message: deleted ? 'Crop removed' : 'Crop not found' });
      return;
    }

    sendJson(res, 405, { success: false, error: 'Method not allowed' });
  } catch (err) {
    sendJson(res, 500, { success: false, error: err.message });
  }
};
