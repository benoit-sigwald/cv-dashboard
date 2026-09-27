// CV dashboard — serves a live view of cv_applications from OCI PostgREST.
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const BASE = (process.env.CV_DB_URL || process.env.SUPABASE_URL || 'https://arx-mcp.duckdns.org/db-cv').replace(/\/$/, '');
const KEY = process.env.CV_DB_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function fetchApplications() {
  const fields = [
    'id', 'company', 'role', 'location', 'lang', 'job_spec', 'keywords',
    'hard_gates', 'positioning', 'company_analysis', 'ats_score_before',
    'ats_score_after', 'cv_notes', 'cover_letter', 'status', 'created_at',
    'updated_at', 'salary_benchmark'
  ].join(',');
  const queryUrl = `${BASE}/rest/v1/cv_applications?select=${fields}&order=ats_score_after.desc.nullslast,company.asc`;
  const r = await fetch(queryUrl, {
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY }
  });
  if (!r.ok) throw new Error(`PostgREST error ${r.status}`);
  return r.json();
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname || '/';

  // Domain redirect from arx-sites.duckdns.org to https://arx-consulting.com/candidatures
  const host = (req.headers.host || '').toLowerCase();
  if (host.includes('arx-sites.duckdns.org')) {
    const cleanPath = pathname.startsWith('/candidatures') ? pathname : '/candidatures' + pathname;
    const dest = 'https://arx-consulting.com' + cleanPath + (parsedUrl.search || '');
    res.writeHead(301, { 'Location': dest });
    res.end();
    return;
  }

  // Handle prefix stripping if mounted on /candidatures
  if (pathname === '/candidatures') {
    res.writeHead(301, { 'Location': '/candidatures/' + (parsedUrl.search || '') });
    res.end();
    return;
  }
  if (pathname.startsWith('/candidatures/')) {
    pathname = pathname.slice('/candidatures'.length) || '/';
  }

  // API: Applications
  if (pathname === '/api/applications') {
    try {
      const rows = await fetchApplications();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ ok: true, count: rows.length, updated: new Date().toISOString(), rows }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
    return;
  }

  // Health check
  if (pathname === '/health' || pathname === '/sante') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'cv-dashboard' }));
    return;
  }

  // Static Assets (including subdirectories like assets/...)
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath.startsWith('/') || safePath.startsWith('\\')) safePath = safePath.slice(1);
  const filePath = path.join(PUBLIC_DIR, safePath || 'index.html');

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isCacheable = ext === '.png' || ext === '.ico' || ext === '.svg';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': isCacheable ? 'public, max-age=86400' : 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback to index.html for root or SPA navigation
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => console.log(`cv-dashboard on :${PORT} -> ${BASE}`));
