// Test-only echo server for Phase 3. NOT part of the app or package.json.
// Run: node scratch/echo-server.mjs   (listens on http://localhost:8787)
//
// Permissive CORS so the browser app can hit it. Routes:
//   /status/404, /status/500, /status/429  -> that status code
//   /slow                                  -> responds after 35s (to trip the 30s timeout)
//   anything else                          -> 200 echo of method/url/headers/body

import http from 'node:http';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const server = http.createServer((req, res) => {
  console.log(new Date().toISOString(), req.method, req.url);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  const status = req.url.match(/^\/status\/(\d{3})/);
  if (status) {
    res.writeHead(Number(status[1]), CORS);
    return res.end(`status ${status[1]}`);
  }

  if (req.url.startsWith('/slow')) {
    setTimeout(() => {
      res.writeHead(200, CORS);
      res.end('slow done');
    }, 35_000);
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body }));
  });
});

server.listen(8787, () => console.log('echo server on http://localhost:8787'));
