// FarmSaathi AI — Mandi network connectivity probe
// Tests outbound HTTPS to api.data.gov.in WITHOUT using the API key.
// Safe to call publicly — no secrets in request or response.
// Use: GET /api/mandi-probe
// Returns: DNS, TLS, and HTTP reachability diagnostics for data.gov.in

const https = require('https');

function probeHTTPS(hostname, path, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.request(
      { hostname, path, method: 'GET', timeout: timeoutMs },
      (res) => {
        res.resume(); // drain response body
        resolve({
          ok: true,
          status: res.statusCode,
          latencyMs: Date.now() - start
        });
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
        causeCode: err.cause && err.cause.code ? err.cause.code : null,
        causeMessage: err.cause && err.cause.message ? err.cause.message : null,
        latencyMs: Date.now() - start
      });
    });
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');

  const region = process.env.VERCEL_REGION || process.env.AWS_REGION || 'unknown';
  const runtime = process.version;

  // Test 1: data.gov.in root (no key needed — just checking connectivity)
  const rootProbe = await probeHTTPS('api.data.gov.in', '/', 10000);

  // Test 2: data.gov.in resource endpoint (without api-key — will get 401 or redirect, but that proves connectivity)
  const resourceProbe = await probeHTTPS(
    'api.data.gov.in',
    '/resource/9ef84268-d588-465a-a308-a864a43d0070?format=json&limit=1',
    10000
  );

  // Test 3: global fetch availability
  let fetchAvailable = false;
  try { fetchAvailable = typeof fetch === 'function'; } catch (_) {}

  const result = {
    timestamp: new Date().toISOString(),
    region,
    nodeVersion: runtime,
    fetchAvailable,
    hasApiKey: Boolean(process.env.DATA_GOV_IN_API_KEY && process.env.DATA_GOV_IN_API_KEY.trim()),
    probes: {
      dataGovInRoot: rootProbe,
      dataGovInResource: resourceProbe
    },
    summary: rootProbe.ok
      ? `✅ data.gov.in is reachable from region=${region} (HTTP ${rootProbe.status}, ${rootProbe.latencyMs}ms)`
      : `❌ data.gov.in is NOT reachable from region=${region}: ${rootProbe.error}`
  };

  res.end(JSON.stringify(result, null, 2));
};
