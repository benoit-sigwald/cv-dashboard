// CV dashboard — serves a live view of cv_applications from OCI PostgREST.
// The service key stays server-side (env). The page calls /api/applications.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE = (process.env.SUPABASE_URL || 'https://arx-mcp.duckdns.org/db-cv').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const INDEX = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

async function fetchApplications() {
  const url = `${BASE}/rest/v1/cv_applications?select=company,role,location,ats_score_after,status,salary_benchmark&order=ats_score_after.desc.nullslast,company.asc`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${KEY}`, apikey: KEY } });
  if (!r.ok) throw new Error(`PostgREST ${r.status}`);
  return r.json();
}

const server = http.createServer(async (req, res) => {
  // Coolify strips any path prefix, so we match on the tail.
  const url = req.url.split('?')[0].replace(/\/+$/, '') || '/';
  if (url.endsWith('/api/applications')) {
    try {
      const rows = await fetchApplications();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: true, count: rows.length, updated: new Date().toISOString(), rows }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
    return;
  }
  if (url.endsWith('/health')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(INDEX);
});

server.listen(PORT, () => console.log(`cv-dashboard on :${PORT} -> ${BASE}`));
