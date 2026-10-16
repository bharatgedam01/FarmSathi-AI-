// FarmSaathi AI - Local Development & Production Server
// Zero-dependency Node.js server that runs static frontend and Netlify serverless functions locally.
// Usage: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Simple .env parser (zero-dependency)
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
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

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

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle Netlify Functions endpoints
  const isFunction = pathname.startsWith('/.netlify/functions/') || pathname.startsWith('/api/');
  if (isFunction) {
    const funcName = pathname
      .replace('/.netlify/functions/', '')
      .replace('/api/', '')
      .replace(/\/$/, '');

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

  // Serve static files with no-cache headers for instant updates
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const indexPath = path.join(__dirname, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
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

    const ext = path.extname(filePath).toLowerCase();
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
  console.log(`  🌱 FarmSaathi AI Server Running`);
  console.log(`======================================================`);
  console.log(`  Local URL:        http://localhost:${PORT}`);
  console.log(`  Mandi API:        http://localhost:${PORT}/.netlify/functions/mandi`);
  console.log(`  Chat API:         http://localhost:${PORT}/.netlify/functions/chat`);
  console.log(`  Analyze API:      http://localhost:${PORT}/.netlify/functions/analyze`);
  console.log(`======================================================\n`);
});
