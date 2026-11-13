// FarmSaathi AI — Mandi Prices API Route
// Serves verified APMC mandi records across all Indian states with search and filter support.
// ?probe=true  — connectivity diagnostic (no API key used in probe response)
// ?refresh=true — bypass 1-hour cache and re-fetch from data.gov.in

const url = require('url');
const https = require('https');
const mandiService = require('../services/mandiService');

// ---------------------------------------------------------------------------
// Connectivity probe: tests DNS + TLS to api.data.gov.in without the API key
// Safe to call publicly — no secrets in request or response.
// ---------------------------------------------------------------------------
function probeHTTPS(hostname, path, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.request(
      { hostname, path, method: 'GET', timeout: timeoutMs },
      (res) => {
        res.resume();
        resolve({ ok: true, status: res.statusCode, latencyMs: Date.now() - start });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'TIMEOUT', latencyMs: Date.now() - start });
    });
    req.on('error', (err) => {
      resolve({
        ok: false,
        error: err.message,
        errorName: err.name,
        causeCode:    err.cause && err.cause.code    ? err.cause.code    : null,
        causeMessage: err.cause && err.cause.message ? err.cause.message : null,
        latencyMs: Date.now() - start
      });
    });
    req.end();
  });
}

function sendJson(res, data) {
  const payload = JSON.stringify(data, null, 2);
  if (res.writeHead) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' });
    res.end(payload);
  } else {
    res.status(200).set('Content-Type', 'application/json; charset=UTF-8').send(payload);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead ? res.writeHead(204).end() : res.status(204).end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const query = req.query || parsedUrl.query || {};

  // ----- PROBE MODE: ?probe=true -----
  if (query.probe === 'true' || query.probe === '1') {
    const region     = process.env.VERCEL_REGION || process.env.AWS_REGION || 'unknown';
    const nodeVer    = process.version;
    const hasApiKey  = Boolean(process.env.DATA_GOV_IN_API_KEY && process.env.DATA_GOV_IN_API_KEY.trim());
    let fetchAvail   = false;
    try { fetchAvail = typeof fetch === 'function'; } catch (_) {}

    // Test 1: data.gov.in root (no key — just checking TCP/TLS)
    const rootProbe = await probeHTTPS('api.data.gov.in', '/', 10000);
    // Test 2: resource endpoint without key (expect 400/401/403 — proves connectivity)
    const resourceProbe = await probeHTTPS(
      'api.data.gov.in',
      '/resource/9ef84268-d588-465a-a308-a864a43d0070?format=json&limit=1',
      10000
    );

    sendJson(res, {
      timestamp:      new Date().toISOString(),
      region,
      nodeVersion:    nodeVer,
      fetchAvailable: fetchAvail,
      hasApiKey,
      probes: {
        dataGovInRoot:     rootProbe,
        dataGovInResource: resourceProbe
      },
      summary: rootProbe.ok
        ? `✅ data.gov.in reachable from region=${region} (HTTP ${rootProbe.status}, ${rootProbe.latencyMs}ms)`
        : `❌ data.gov.in NOT reachable from region=${region}: ${rootProbe.error} (causeCode=${rootProbe.causeCode})`
    });
    return;
  }

  // ----- NORMAL MANDI DATA MODE -----
  const state       = query.state || '';
  const search      = query.q || query.search || query.crop || '';
  const sort        = query.sort || '';
  const forceRefresh = query.refresh === 'true' || query.refresh === '1';

  const result = await mandiService.queryMandiPrices({ state, query: search, sort, forceRefresh });
  sendJson(res, result);
};
