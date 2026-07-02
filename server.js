import { join, resolve } from 'node:path';

const PORT    = parseInt(process.env.PORT) || 3000;
const BASE_URL = process.env.BASE_URL
  ?? (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${PORT}`);
const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? resolve(process.env.PUBLIC_DIR)
  : null;

// ── in-memory store ───────────────────────────────────────────────────────────
const links = new Map();

// ── helpers ───────────────────────────────────────────────────────────────────
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => BASE62[b % 62]).join('');
}

function toJSON(link) {
  return {
    code:     link.code,
    url:      link.url,
    shortUrl: `${BASE_URL}/${link.code}`,
    hits:     link.hits,
    createdAt: link.createdAt,
  };
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── static file serving ───────────────────────────────────────────────────────
async function serveStatic(pathname) {
  if (!PUBLIC_DIR) return null;

  const rel      = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = join(PUBLIC_DIR, rel);

  // Prevent path-traversal: resolved path must stay inside PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR + (PUBLIC_DIR.endsWith('/') || PUBLIC_DIR.endsWith('\\') ? '' : '/'))) {
    return null;
  }

  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file, { headers: { ...CORS } });
  }
  return null;
}

// ── server ────────────────────────────────────────────────────────────────────
Bun.serve({
  port: PORT,

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    // OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/links  – create a short link
    if (method === 'POST' && pathname === '/api/links') {
      let body;
      try   { body = await req.json(); }
      catch { return json({ error: 'Invalid JSON' }, 400); }

      const { url } = body ?? {};
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return json({ error: 'URL must be a valid http or https address' }, 400);
      }

      let code;
      do { code = generateCode(); } while (links.has(code));

      const link = { code, url, hits: 0, createdAt: new Date().toISOString() };
      links.set(code, link);
      return json(toJSON(link), 201);
    }

    // GET /api/links  – list all links
    if (method === 'GET' && pathname === '/api/links') {
      return json([...links.values()].map(toJSON));
    }

    // GET /*  – static files win over short codes
    if (method === 'GET') {
      const staticRes = await serveStatic(pathname);
      if (staticRes) return staticRes;

      const code = pathname.slice(1);   // strip leading /
      const link = links.get(code);
      if (link) {
        link.hits++;
        return new Response(null, {
          status:  302,
          headers: { ...CORS, Location: link.url },
        });
      }
      return json({ error: 'Not found' }, 404);
    }

    return json({ error: 'Method not allowed' }, 405);
  },
});

console.log(`Snip listening on :${PORT}  BASE_URL=${BASE_URL}`);
