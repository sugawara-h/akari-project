'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const APP_DIR  = path.join(__dirname, '..', 'app');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function readStore(key) {
  const file = path.join(DATA_DIR, key + '.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function writeStore(key, data) {
  const file = path.join(DATA_DIR, key + '.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
  const urlObj   = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  // API: GET/POST /api/store/:key
  const apiMatch = pathname.match(/^\/api\/store\/([a-z0-9-]+)$/);
  if (apiMatch) {
    const key = apiMatch[1];
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
      const data = readStore(key);
      res.writeHead(200);
      res.end(JSON.stringify(data));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          writeStore(key, JSON.parse(body));
          res.writeHead(200);
          res.end('{"ok":true}');
        } catch {
          res.writeHead(400);
          res.end('{"error":"Invalid JSON"}');
        }
      });
      return;
    }

    res.writeHead(405);
    res.end('{"error":"Method not allowed"}');
    return;
  }

  // Static files from app/
  const relPath  = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.join(APP_DIR, relPath);

  if (!filePath.startsWith(APP_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}`);
});
