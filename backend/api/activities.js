// FarmSaathi AI — Farm Activities API Route
// Handles farmer activity reminders: listing, scheduling, toggling, and deleting tasks.

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
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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
  const isToggle = parts.includes('toggle');
  let actId = '';
  if (parts.length > 3 && parts[parts.length - 1] !== 'activities') {
    actId = isToggle ? parts[parts.indexOf('toggle') - 1] : parts[parts.length - 1];
  } else if (parsedUrl.query.id) {
    actId = parsedUrl.query.id;
  }

  try {
    if (method === 'GET') {
      if (!userId) {
        sendJson(res, 200, { success: true, count: 0, activities: [] });
        return;
      }
      const activities = await dbService.getActivities(userId);
      if (actId) {
        const act = activities.find(a => String(a.id) === String(actId));
        if (act) {
          sendJson(res, 200, { success: true, activity: act });
        } else {
          sendJson(res, 404, { success: false, error: 'Activity not found' });
        }
        return;
      }
      sendJson(res, 200, { success: true, count: activities.length, activities });
      return;
    }

    if (!userId) {
      sendJson(res, 401, { success: false, error: 'Unauthorized. Please sign in to manage activities.' });
      return;
    }

    if (method === 'POST' && !isToggle) {
      const body = await parseBody(req);
      const actDate = body.date || body.activity_date;
      if (actDate && isPastDateIST(actDate)) {
        sendJson(res, 400, {
          success: false,
          error: 'Past dates are not allowed. Please select today or a future date (Asia/Kolkata).'
        });
        return;
      }
      const newAct = await dbService.addActivity(userId, body);
      sendJson(res, 201, { success: true, message: 'Activity scheduled successfully', activity: newAct });
      return;
    }

    if (method === 'PUT' || (method === 'PATCH' && !isToggle)) {
      if (!actId) {
        sendJson(res, 400, { success: false, error: 'Activity ID is required for update' });
        return;
      }
      const body = await parseBody(req);
      const actDate = body.date || body.activity_date;
      if (actDate && isPastDateIST(actDate)) {
        sendJson(res, 400, {
          success: false,
          error: 'Past dates are not allowed. Please select today or a future date (Asia/Kolkata).'
        });
        return;
      }
      const updated = await dbService.updateActivity(userId, actId, body);
      sendJson(res, 200, { success: !!updated, message: updated ? 'Activity updated' : 'Activity not found', activity: updated });
      return;
    }

    if (isToggle && (method === 'POST' || method === 'PATCH')) {
      const updated = await dbService.toggleActivity(userId, actId);
      sendJson(res, 200, { success: !!updated, activity: updated });
      return;
    }

    if (method === 'DELETE') {
      if (!actId) {
        sendJson(res, 400, { success: false, error: 'Activity ID is required for deletion' });
        return;
      }
      const deleted = await dbService.deleteActivity(userId, actId);
      sendJson(res, 200, { success: deleted, message: deleted ? 'Activity removed' : 'Activity not found' });
      return;
    }

    sendJson(res, 405, { success: false, error: 'Method not allowed' });
  } catch (err) {
    sendJson(res, 500, { success: false, error: err.message });
  }
};
