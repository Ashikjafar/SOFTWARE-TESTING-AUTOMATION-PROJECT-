// Sample web application used as the target (System Under Test) for the JMeter load test.
// Zero dependencies: only Node.js built-in modules.
//
// Response time grows with the number of in-flight requests, and the server starts
// returning HTTP 503 once it is overloaded. This makes load-test results realistic:
// fast at low load, slower at peak load, and failing at very high load.

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BASE_DELAY_MS = Number(process.env.BASE_DELAY_MS || 120); // minimum processing time
const PER_REQUEST_PENALTY_MS = Number(process.env.PENALTY_MS || 6); // extra ms per concurrent request
const OVERLOAD_THRESHOLD = Number(process.env.OVERLOAD || 120); // in-flight requests before errors start

const PRODUCTS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: 100 + i * 25,
  category: ['books', 'electronics', 'fashion', 'home'][i % 4],
}));

const USERS = { password: 'test123' }; // any username with password "test123" is valid
const sessions = new Set();
let inFlight = 0;
let totalRequests = 0;

function send(res, status, body, extraHeaders = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/html; charset=utf-8' : 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...extraHeaders,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

function getSession(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/SESSION=([a-f0-9]+)/);
  return m && sessions.has(m[1]) ? m[1] : null;
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === 'GET' && path === '/') {
    return send(res, 200, '<html><head><title>Sample Shop</title></head><body><h1>Welcome to Sample Shop</h1></body></html>');
  }

  if (req.method === 'POST' && path === '/login') {
    const params = new URLSearchParams(await readBody(req));
    const password = params.get('password');
    if (params.get('username') && password === USERS.password) {
      const sid = crypto.randomBytes(8).toString('hex');
      sessions.add(sid);
      return send(res, 200, { status: 'success', message: 'Login successful' }, { 'Set-Cookie': `SESSION=${sid}; Path=/` });
    }
    return send(res, 401, { status: 'error', message: 'Invalid credentials' });
  }

  if (req.method === 'GET' && path === '/products') {
    return send(res, 200, { status: 'success', count: PRODUCTS.length, products: PRODUCTS });
  }

  if (req.method === 'GET' && path === '/search') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const results = PRODUCTS.filter((p) => p.name.toLowerCase().includes(q) || p.category.includes(q));
    return send(res, 200, { status: 'success', query: q, count: results.length, products: results });
  }

  const detail = path.match(/^\/product\/(\d+)$/);
  if (req.method === 'GET' && detail) {
    const p = PRODUCTS.find((x) => x.id === Number(detail[1]));
    return p ? send(res, 200, { status: 'success', product: p }) : send(res, 404, { status: 'error', message: 'Not found' });
  }

  if (req.method === 'GET' && path === '/logout') {
    const sid = getSession(req);
    if (sid) sessions.delete(sid);
    return send(res, 200, { status: 'success', message: 'Logged out' });
  }

  if (req.method === 'GET' && path === '/health') {
    return send(res, 200, { status: 'UP', inFlight, totalRequests });
  }

  return send(res, 404, { status: 'error', message: 'Route not found' });
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') return route(req, res); // never delayed

  totalRequests++;
  inFlight++;
  const delay = BASE_DELAY_MS + Math.random() * 100 + inFlight * PER_REQUEST_PENALTY_MS;
  const overloaded = inFlight > OVERLOAD_THRESHOLD && Math.random() < 0.15;

  setTimeout(async () => {
    try {
      if (overloaded) send(res, 503, { status: 'error', message: 'Server overloaded' });
      else await route(req, res);
    } catch (e) {
      send(res, 500, { status: 'error', message: String(e) });
    } finally {
      inFlight--;
    }
  }, delay);
});

server.listen(PORT, () => {
  console.log(`Sample app running at http://localhost:${PORT}`);
  console.log(`Routes: GET / | POST /login | GET /products | GET /search?q= | GET /product/:id | GET /logout | GET /health`);
});
