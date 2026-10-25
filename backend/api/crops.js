// FarmSaathi AI — Crops API Route
// Handles farmer crops: listing, adding, and removing crop records.

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

  // Extract ID if path has /api/crops/:id or query has ?id=
  const parts = pathname.split('/');
  const cropId = (parts.length > 3 && parts[parts.length - 1] !== 'crops')
    ? parts[parts.length - 1]
    : (parsedUrl.query.id || '');

  if (method === 'GET') {
    const crops = dbService.getCrops(userId);
    sendJson(res, 200, { success: true, count: crops.length, crops });
    return;
  }

  if (method === 'POST') {
    const body = await parseBody(req);
    const newCrop = dbService.addCrop(userId, body);
    sendJson(res, 201, { success: true, message: 'Crop added successfully', crop: newCrop });
    return;
  }

  if (method === 'DELETE') {
    if (!cropId) {
      sendJson(res, 400, { success: false, error: 'Crop ID is required for deletion' });
      return;
    }
    const deleted = dbService.deleteCrop(userId, cropId);
    sendJson(res, 200, { success: deleted, message: deleted ? 'Crop removed' : 'Crop not found' });
    return;
  }

  sendJson(res, 405, { success: false, error: 'Method not allowed' });
};
