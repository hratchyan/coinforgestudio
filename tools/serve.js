/* Tiny zero-dependency static server for developing/testing over http.
   Usage: node tools/serve.js [port] [folder]   (folder default: app)      */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..', process.argv[3] || 'app');
const port = parseInt(process.argv[2], 10) || 8123;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  /* dev-only: the page can POST a canvas dataURL here to save a screenshot */
  if (req.method === 'POST' && urlPath === '/__snap') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const b64 = body.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(path.join(__dirname, '.snap.png'), Buffer.from(b64, 'base64'));
        res.writeHead(200); res.end('ok');
      } catch (e) { res.writeHead(500); res.end(String(e)); }
    });
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.join(rootDir, urlPath);
  if (!file.startsWith(rootDir)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + urlPath); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`CoinForge dev server: http://localhost:${port}/`));