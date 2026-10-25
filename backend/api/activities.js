// FarmSaathi AI — Farm Activities API Route
// Handles farmer activity reminders: listing, scheduling, toggling, and deleting tasks.

const url = require('url');
const dbService = require('../services/dbService');

function getAuthUserId(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader) {
    const user = dbService.getUserByToken(authHeader);
    if (user) return user.id;
  }
  return 'user_demo';
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
  // /api/activities/:id or /api/activities/:id/toggle
  const isToggle = parts.includes('toggle');
  let actId = '';
  if (parts.length > 3 && parts[parts.length - 1] !== 'activities') {
    actId = isToggle ? parts[parts.indexOf('toggle') - 1] : parts[parts.length - 1];
  } else if (parsedUrl.query.id) {
    actId = parsedUrl.query.id;
  }

  if (method === 'GET') {
    if (actId) {
      const activities = dbService.getActivities(userId);
      const act = activities.find(a => String(a.id) === String(actId));
      if (act) {
        sendJson(res, 200, { success: true, activity: act });
      } else {
        sendJson(res, 404, { success: false, error: 'Activity not found' });
      }
      return;
    }
    const activities = dbService.getActivities(userId);
    sendJson(res, 200, { success: true, count: activities.length, activities });
    return;
  }

  if (method === 'POST' && !isToggle) {
    const body = await parseBody(req);
    const newAct = dbService.addActivity(userId, body);
    sendJson(res, 201, { success: true, message: 'Activity scheduled successfully', activity: newAct });
    return;
  }

  if (method === 'PUT' || (method === 'PATCH' && !isToggle)) {
    if (!actId) {
      sendJson(res, 400, { success: false, error: 'Activity ID is required for update' });
      return;
    }
    const body = await parseBody(req);
    const updated = dbService.updateActivity(userId, actId, body);
    sendJson(res, 200, { success: !!updated, message: updated ? 'Activity updated' : 'Activity not found', activity: updated });
    return;
  }

  if (isToggle && (method === 'POST' || method === 'PATCH')) {
    const updated = dbService.toggleActivity(userId, actId);
    sendJson(res, 200, { success: !!updated, activity: updated });
    return;
  }

  if (method === 'DELETE') {
    if (!actId) {
      sendJson(res, 400, { success: false, error: 'Activity ID is required for deletion' });
      return;
    }
    const deleted = dbService.deleteActivity(userId, actId);
    sendJson(res, 200, { success: deleted, message: deleted ? 'Activity removed' : 'Activity not found' });
    return;
  }

  sendJson(res, 405, { success: false, error: 'Method not allowed' });
};
