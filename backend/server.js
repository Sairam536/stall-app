/**
 * StallPay - Node.js Backend Server with Supabase Integration
 * Zero external dependencies required - standard Node.js runtime.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Simple, reliable .env parser (reads backend/.env or root .env)
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'backend', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        });
        console.log(`[StallPay Server] Loaded environment variables from: ${envPath}`);
        break;
      } catch (e) {
        console.warn(`Could not load ${envPath}:`, e.message);
      }
    }
  }
}

loadEnv();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// 2. HTTP Server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // ----------------------------------------------------------------------------
  // API ROUTE: /api/config (Public Configuration for Frontend)
  // ----------------------------------------------------------------------------
  if (pathname === '/api/config' && req.method === 'GET') {
    return sendJson(res, 200, {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      stallName: process.env.STALL_NAME || 'Entrepreneur Club Stall',
      stallEvent: process.env.STALL_EVENT || 'College Fest 2026',
      stallUpiId: process.env.STALL_UPI_ID || 'stallpay.ecell@upi',
      stallPayeeName: process.env.STALL_PAYEE_NAME || 'College Entrepreneur Club'
    });
  }

  // ----------------------------------------------------------------------------
  // API ROUTE: /api/health
  // ----------------------------------------------------------------------------
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      supabaseConfigured: Boolean(process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('your-project-id')),
      nodeVersion: process.version
    });
  }

  // ----------------------------------------------------------------------------
  // API ROUTE: /api/verify-payment (Backend Verification Endpoint)
  // ----------------------------------------------------------------------------
  if (pathname === '/api/verify-payment' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { transactionId, pin, verifiedBy } = payload;

        // Verify team PIN
        const expectedPin = process.env.TEAM_SECRET_PIN || '1234';
        if (String(pin).trim() !== String(expectedPin).trim()) {
          return sendJson(res, 401, { error: 'Invalid Team Access PIN' });
        }

        // Return verified acknowledgment
        return sendJson(res, 200, {
          success: true,
          message: 'Payment verification recorded by backend server',
          transactionId,
          verifiedAt: new Date().toISOString(),
          verifiedBy: verifiedBy || 'Desk Coordinator'
        });
      } catch (err) {
        return sendJson(res, 400, { error: 'Invalid JSON request payload' });
      }
    });
    return;
  }

  // ----------------------------------------------------------------------------
  // STATIC ASSET SERVING
  // ----------------------------------------------------------------------------
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Security: Prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  StallPay - College Stall Management System`);
  console.log(`  Backend Server & Static Host Active`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Supabase: ${process.env.SUPABASE_URL ? 'Configured' : 'Not configured (Local mode)'}`);
  console.log(`  Press Ctrl + C to stop`);
  console.log(`======================================================\n`);
});
