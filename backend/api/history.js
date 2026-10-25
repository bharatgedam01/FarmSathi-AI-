// FarmSaathi AI — Analysis History API Route
// Handles listing, saving, and deleting crop health analyses.

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

  const parts = pathname.split('/');
  const scanId = (parts.length > 3 && parts[parts.length - 1] !== 'history' && parts[parts.length - 1] !== 'analyses')
    ? parts[parts.length - 1]
    : (parsedUrl.query.id || '');

  if (method === 'GET') {
    const list = dbService.getAnalyses(userId);
    sendJson(res, 200, { success: true, count: list.length, analyses: list });
    return;
  }

  if (method === 'POST') {
    const body = await parseBody(req);
    const record = dbService.addAnalysis(userId, body);
    sendJson(res, 201, { success: true, message: 'Analysis saved successfully', record });
    return;
  }

  if (method === 'DELETE') {
    if (scanId) {
      const deleted = dbService.deleteAnalysis(userId, scanId);
      sendJson(res, 200, { success: deleted, message: deleted ? 'Analysis scan removed' : 'Analysis not found' });
    } else {
      dbService.clearAnalyses(userId);
      sendJson(res, 200, { success: true, message: 'Analysis history cleared' });
    }
    return;
  }

  sendJson(res, 405, { success: false, error: 'Method not allowed' });
};
