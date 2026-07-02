# Snip – Backend

A tiny URL-shortener API built with [Bun](https://bun.sh) — single file, zero npm dependencies.

## Quick start

```bash
bun run server.js   # or: bun start
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port to listen on |
| `BASE_URL` | `http://localhost:<PORT>` | Origin used in `shortUrl` values |
| `RAILWAY_PUBLIC_DOMAIN` | — | Auto-detected on Railway; used as `BASE_URL` fallback |
| `PUBLIC_DIR` | — | When set, static files are served from this directory |

## API

### Create a short link
```
POST /api/links
Content-Type: application/json

{ "url": "https://example.com/very/long/path" }
```
**201**
```json
{ "code": "aB3xYz", "url": "https://…", "shortUrl": "https://…/aB3xYz", "hits": 0, "createdAt": "2024-…" }
```
**400** on invalid JSON or a non-http(s) URL.

### List all links
```
GET /api/links
```
**200** — JSON array of link objects (same shape as above).

### Follow a short link
```
GET /:code
```
**302** redirect to the original URL; increments `hits`.  
**404** if the code is unknown.

## Notes

- Codes are 6 random base-62 characters (`[a-zA-Z0-9]`).
- Links are stored in memory; they are lost on restart (by design for this demo).
- When `PUBLIC_DIR` is set, an existing static file always wins over a same-named short code.
- Full CORS support (including OPTIONS pre-flight) is enabled for all routes.
