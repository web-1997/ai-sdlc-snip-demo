# Snip – URL Shortener (monorepo overview)

One backend, two clients — each layer lives on its own branch and is mounted here
as a Git submodule so a single clone materialises the whole application.

```
snip-demo/ (main)
├── backend/    ← branch: backend   Bun HTTP server, in-memory store
├── frontend/   ← branch: frontend  Angular 19 single-page app
├── cli/        ← branch: cli       Zero-dependency Node.js CLI
├── bundle/     ← branch: bundle    GENERATED — assembled by scripts/build-bundle.mjs
└── scripts/
    └── build-bundle.mjs            Build + release automation
```

---

## Building the release bundle

`scripts/build-bundle.mjs` pulls the latest source from every layer, compiles the
Angular app, and assembles a self-contained deployment artefact in `bundle/`:

```
bundle/
├── server.js       ← Bun backend (unchanged)
├── cli.js          ← Node CLI (unchanged)
├── public/         ← Angular build output
├── .env            PUBLIC_DIR=./public  (tells Bun to also serve the UI)
├── package.json    "start": "bun server.js"
├── Dockerfile      FROM oven/bun:1-alpine
├── .dockerignore
└── railway.json    builder: DOCKERFILE
```

**Run locally (no push):**
```bash
node scripts/build-bundle.mjs
```

**Run and push both the `bundle` branch and `main`:**
```bash
node scripts/build-bundle.mjs --push
```

The script is a **safe no-op** when sources haven't changed — it checks the staged
diff before every `git commit` and skips quietly.

---

## API contract

All requests target the backend (default `http://localhost:3000`).

| Method | Path | Body / params | Success | Error |
|--------|------|---------------|---------|-------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201 { code, url, shortUrl, hits, createdAt }` | `400 { error }` |
| `GET`  | `/api/links` | — | `200` array of link objects | — |
| `GET`  | `/:code`     | — | `302` → original URL (increments `hits`) | `404` |

CORS is open on all routes; `OPTIONS` preflight returns `204`.

---

## Branch-per-layer layout

| Branch | Contents | Key file |
|--------|----------|----------|
| `backend` | Bun server, zero npm deps | `server.js` |
| `frontend` | Angular 19 app | `src/app/app.component.ts` |
| `cli` | Node CLI, zero npm deps | `cli.js` |
| `main` | This README + `.gitmodules` only | — |

Each branch is a standalone project with its own `package.json` and `README.md`.
The `main` branch never contains application code — it is purely the aggregator.

---

## Clone (always use `--recurse-submodules`)

```bash
git clone --recurse-submodules https://github.com/web-1997/ai-sdlc-snip-demo.git
cd ai-sdlc-snip-demo
# backend/, frontend/, cli/ are now populated
```

> A plain `git clone` leaves the submodule folders **empty**.  
> Fix a forgotten clone with: `git submodule update --init --recursive`

---

## Running the stack

### 1 · Backend

```bash
cd backend
bun run server.js          # or: bun start
# Listening on :3000 by default; set PORT / BASE_URL / PUBLIC_DIR as needed
```

### 2 · Frontend (Angular dev server)

```bash
cd frontend
npm install
npx ng serve               # http://localhost:4200
# Points at http://localhost:3000 by default
```

### 3 · CLI

```bash
cd cli
node cli.js help

node cli.js add https://example.com/very/long/path
node cli.js ls
node cli.js open <code>

# Or install globally:
npm install -g .
snip help
```

`SNIP_API` overrides the backend base URL for both the CLI and the Angular app's
`SnipService`.

---

## Update workflow

To ship a change in a submodule and record the new pointer in the superproject:

```bash
# 1. Work inside the submodule as a normal repo
cd backend          # (or frontend / cli)
# ... edit, commit ...
git push

# 2. Back in the superproject, pull the latest commit on the tracked branch
cd ..
git submodule update --remote backend
git add backend
git commit -m "chore: bump backend submodule"
git push
```

To pull all submodule updates at once:

```bash
git submodule update --remote
git add backend frontend cli
git commit -m "chore: bump all submodules"
git push
```
