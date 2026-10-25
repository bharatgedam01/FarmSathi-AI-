// FarmSaathi AI — Farmer Profile API Route
// Handles retrieving and saving farmer land and crop profile records.

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

  if (method === 'GET') {
    const profile = dbService.getProfile(userId);
    sendJson(res, 200, { success: true, profile });
    return;
  }

  if (method === 'POST' || method === 'PUT') {
    const body = await parseBody(req);
    const updated = dbService.saveProfile(userId, body);
    sendJson(res, 200, { success: true, message: 'Profile updated successfully', profile: updated });
    return;
  }

  sendJson(res, 405, { success: false, error: 'Method not allowed' });
};
