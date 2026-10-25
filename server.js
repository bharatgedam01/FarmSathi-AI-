// FarmSaathi AI - Local Development & Production Server
// Zero-dependency Node.js server with REST APIs, persistent JSON database, and static file serving.
// Usage: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const dns = require('dns');

// Prioritize IPv4 DNS resolution to prevent IPv6 socket connect timeouts
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Load environment variables from .env if present
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/(^['"]|['"]$)/g, '');
          if (val) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const routes = require('./backend/routes');
const PORT = process.env.PORT || 3000;
const FUNCTIONS_DIR = path.join(__dirname, 'netlify', 'functions');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Route through Backend REST API
  if (pathname.startsWith('/api/')) {
    const handled = await routes.handleApiRequest(req, res);
    if (handled) return;
  }

  // 2. Fallback to Netlify Functions endpoints if prefixed with /.netlify/functions/
  if (pathname.startsWith('/.netlify/functions/')) {
    const funcName = pathname.replace('/.netlify/functions/', '').replace(/\/$/, '');
    const funcFile = path.join(FUNCTIONS_DIR, `${funcName}.js`);

    if (fs.existsSync(funcFile)) {
      try {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            delete require.cache[require.resolve(funcFile)];
            const handler = require(funcFile).handler;

            const event = {
              httpMethod: req.method,
              path: pathname,
              headers: req.headers,
              queryStringParameters: parsedUrl.query,
              body: body
            };

            const result = await handler(event, {});
            const statusCode = result.statusCode || 200;
            const resHeaders = result.headers || { 'Content-Type': 'application/json' };

            res.writeHead(statusCode, resHeaders);
            res.end(result.body || '');
          } catch (funcErr) {
            console.error(`Error executing function ${funcName}:`, funcErr);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: funcErr.message || 'Internal Server Error' }));
          }
        });
        return;
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Function ${funcName} not found` }));
      return;
    }
  }

  // 3. Serve static files and clean page routes
  let cleanPath = pathname.split('?')[0];
  let safePath = path.normalize(cleanPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/frontend/index.html';

  // Check clean routes without .html extension in frontend/
  const cleanRouteMap = {
    '/login': '/frontend/login.html',
    '/register': '/frontend/register.html',
    '/dashboard': '/frontend/dashboard.html',
    '/reset-password': '/frontend/reset-password.html'
  };

  let filePath = path.join(__dirname, safePath);

  if (cleanPath.startsWith('/uploads/')) {
    filePath = path.join(__dirname, 'data', safePath);
  } else if (cleanRouteMap[cleanPath]) {
    filePath = path.join(__dirname, cleanRouteMap[cleanPath]);
  } else if (!fs.existsSync(filePath)) {
    // Check root css/js, then frontend/css/js
    const strippedPath = safePath.replace(/^[\/\\]/, '');
    const frontendAttempt = path.join(__dirname, 'frontend', strippedPath);
    if (fs.existsSync(frontendAttempt)) {
      filePath = frontendAttempt;
    } else if (fs.existsSync(`${frontendAttempt}.html`)) {
      filePath = `${frontendAttempt}.html`;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const isAssetRequest = Boolean(ext && ext !== '.html');

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Do not return HTML fallback for css, js, images, or api assets
      if (isAssetRequest) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Asset Not Found: ${cleanPath}`);
        return;
      }

      const fallbackIndexPath = fs.existsSync(path.join(__dirname, 'frontend', 'index.html'))
        ? path.join(__dirname, 'frontend', 'index.html')
        : path.join(__dirname, 'index.html');

      fs.readFile(fallbackIndexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
          res.end(content);
        }
      });
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Read Error');
      } else {
        const headers = { 'Content-Type': contentType };
        if (ext === '.html') {
          headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
          headers['Pragma'] = 'no-cache';
          headers['Expires'] = '0';
        }
        res.writeHead(200, headers);
        res.end(content);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🌱 FarmSaathi AI - Full-Stack Agriculture Server`);
  console.log(`======================================================`);
  console.log(`  Frontend Web:     http://localhost:${PORT}`);
  console.log(`  Health Status:    http://localhost:${PORT}/api/status`);
  console.log(`  Auth API:         http://localhost:${PORT}/api/auth/me`);
  console.log(`  Crops API:        http://localhost:${PORT}/api/crops`);
  console.log(`  Activities API:   http://localhost:${PORT}/api/activities`);
  console.log(`  Mandi API:        http://localhost:${PORT}/api/mandi`);
  console.log(`  Chat API:         http://localhost:${PORT}/api/chat`);
  console.log(`  Analyze API:      http://localhost:${PORT}/api/analyze`);
  console.log(`  Gov Schemes API:  http://localhost:${PORT}/api/schemes`);
  console.log(`  Gov Cron API:     http://localhost:${PORT}/api/cron/schemes`);
  console.log(`  Database File:    ./data/database.json`);
  console.log(`======================================================\n`);

  // Automated Background Government Schemes Discovery (24-hour cycle)
  const schemeService = require('./backend/services/schemeService');
  setTimeout(() => {
    schemeService.checkForUpdates().catch(e => console.warn('Initial Gov Schemes check notice:', e.message));
  }, 2500);

  setInterval(() => {
    schemeService.checkForUpdates().catch(e => console.warn('Scheduled Gov Schemes check notice:', e.message));
  }, 24 * 60 * 60 * 1000);
});

