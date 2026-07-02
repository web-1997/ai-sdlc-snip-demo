#!/usr/bin/env node
/**
 * scripts/build-bundle.mjs
 *
 * Assembles the "bundle" submodule from the backend / frontend / cli sources,
 * commits the result inside bundle/, then bumps the submodule pointer in the
 * superproject.  Safe to run repeatedly — exits cleanly when nothing changed.
 *
 * Usage:
 *   node scripts/build-bundle.mjs          # assemble + commit locally
 *   node scripts/build-bundle.mjs --push   # also push bundle and main
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, readdirSync,
  rmSync, writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

// ── helpers ───────────────────────────────────────────────────────────────────

const ROOT   = resolve(import.meta.dirname, '..');   // superproject root
const PUSH   = process.argv.includes('--push');
const WIN    = process.platform === 'win32';

// On Windows, npm/npx/ng are .cmd scripts and must be invoked through cmd
const NPM = WIN ? 'npm.cmd' : 'npm';
const NG  = WIN ? 'ng.cmd'  : 'ng';

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT, stdio: 'inherit', encoding: 'utf8', ...opts,
  });
  if (result.status !== 0) {
    process.stderr.write(`\n\u2716 "${cmd} ${args.join(' ')}" exited ${result.status}\n`);
    process.exit(result.status ?? 1);
  }
}

// npm and ng are .cmd scripts on Windows — they need shell:true to launch.
// Git and Node are real executables and must NOT use shell (avoids quoting issues).
function runShell(cmd, args, opts = {}) {
  run(cmd, args, { shell: WIN, ...opts });
}

function capture(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: ROOT, encoding: 'utf8', ...opts,
  }).trim();
}

function log(msg) { process.stdout.write(msg + '\n'); }

// Copy a directory tree, (re)creating the destination.
function copyDir(src, dest) {
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

// Returns true when `git diff --cached` has any staged content.
function hasStagedChanges(cwd) {
  const r = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd });
  return r.status !== 0;            // exit 1 = changes present; 0 = empty
}

// ── Step 1: update submodules to their branch tips ────────────────────────────
log('\n▶ Updating backend / frontend / cli submodules …');
run('git', ['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);

// ── Step 2: build the Angular frontend ───────────────────────────────────────
const FRONTEND_DIR  = join(ROOT, 'frontend');
const DIST_BROWSER  = join(FRONTEND_DIR, 'dist', 'snip-frontend', 'browser');

log('\n\u25b6 Installing frontend dependencies \u2026');
runShell(NPM, ['install', '--prefer-offline'], { cwd: FRONTEND_DIR });

log('\n\u25b6 Building Angular app \u2026');
// Resolve the local ng binary rather than relying on a global install
const ngBin = join(
  FRONTEND_DIR, 'node_modules', '.bin',
  WIN ? 'ng.cmd' : 'ng',
);
runShell(ngBin, ['build'], { cwd: FRONTEND_DIR });

if (!existsSync(join(DIST_BROWSER, 'index.html'))) {
  process.stderr.write(
    `\n✖ Build succeeded but ${DIST_BROWSER}/index.html is missing.\n`,
  );
  process.exit(1);
}
log('  ✔ frontend/dist/snip-frontend/browser/index.html exists');

// ── Step 3: assemble bundle/ ─────────────────────────────────────────────────
const BUNDLE_DIR = join(ROOT, 'bundle');
log('\n▶ Assembling bundle/ …');

// server.js — straight copy from backend
cpSync(join(ROOT, 'backend', 'server.js'), join(BUNDLE_DIR, 'server.js'));
log('  · copied backend/server.js');

// cli.js — straight copy from cli
cpSync(join(ROOT, 'cli', 'cli.js'), join(BUNDLE_DIR, 'cli.js'));
log('  · copied cli/cli.js');

// public/ — Angular build output
copyDir(DIST_BROWSER, join(BUNDLE_DIR, 'public'));
log(`  · copied ${readdirSync(join(BUNDLE_DIR, 'public')).length} files → bundle/public`);

// .env — tells Bun's server to serve static files from ./public
writeFileSync(join(BUNDLE_DIR, '.env'), 'PUBLIC_DIR=./public\n');
log('  · wrote .env  (PUBLIC_DIR=./public)');

// package.json — no "type" field so cli.js stays CJS-compatible under plain node
writeFileSync(
  join(BUNDLE_DIR, 'package.json'),
  JSON.stringify(
    {
      name:        'snip-bundle',
      version:     '1.0.0',
      description: 'Snip – self-contained bundle (backend + frontend)',
      scripts: { start: 'bun server.js' },
      engines: { bun: '>=1.0.0' },
    },
    null, 2,
  ) + '\n',
);
log('  · wrote package.json');

// Dockerfile
writeFileSync(
  join(BUNDLE_DIR, 'Dockerfile'),
  [
    'FROM oven/bun:1-alpine',
    'WORKDIR /app',
    'COPY . .',
    'ENV PORT=3000',
    'EXPOSE 3000',
    'CMD bun server.js',
    '',
  ].join('\n'),
);
log('  · wrote Dockerfile');

// .dockerignore
writeFileSync(
  join(BUNDLE_DIR, '.dockerignore'),
  ['node_modules/', '.git/', '*.md', ''].join('\n'),
);
log('  · wrote .dockerignore');

// railway.json — use the Dockerfile builder
writeFileSync(
  join(BUNDLE_DIR, 'railway.json'),
  JSON.stringify({ '$schema': 'https://railway.app/railway.schema.json', build: { builder: 'DOCKERFILE' } }, null, 2) + '\n',
);
log('  · wrote railway.json');

// ── Step 4: commit inside bundle/ ────────────────────────────────────────────
log('\n▶ Committing inside bundle/ …');
run('git', ['add', '-A'], { cwd: BUNDLE_DIR });

if (!hasStagedChanges(BUNDLE_DIR)) {
  log('  ↳ nothing to commit in bundle/ (no-op)');
} else {
  const msg = `chore: bundle ${new Date().toISOString().slice(0, 10)}`;
  run('git', ['commit', '-m', msg], { cwd: BUNDLE_DIR });
  log(`  ✔ committed: "${msg}"`);
}

if (PUSH) {
  log('\n\u25b6 Pushing bundle branch \u2026');
  // Submodule checkouts are detached; push HEAD explicitly to the bundle branch
  run('git', ['push', 'origin', 'HEAD:bundle'], { cwd: BUNDLE_DIR });
}

// ── Step 5: bump bundle pointer in superproject ───────────────────────────────
log('\n▶ Bumping bundle submodule pointer in superproject …');
run('git', ['add', 'bundle']);

if (!hasStagedChanges(ROOT)) {
  log('  ↳ bundle pointer unchanged (no-op)');
} else {
  const bHash = capture('git', ['rev-parse', '--short', 'HEAD'], { cwd: BUNDLE_DIR });
  const msg   = `chore: bump bundle submodule → ${bHash}`;
  run('git', ['commit', '-m', msg]);
  log(`  ✔ committed: "${msg}"`);
}

if (PUSH) {
  log('\n\u25b6 Pushing main \u2026');
  run('git', ['push', 'origin', 'main']);
}

log('\n✅  build-bundle complete.\n');
