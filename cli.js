#!/usr/bin/env node
'use strict';

const { execFile } = require('child_process');
const http  = require('http');
const https = require('https');

const BASE = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');

// ── helpers ───────────────────────────────────────────────────────────────────
function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

function usage() {
  process.stdout.write(
    'Usage:\n' +
    '  snip add <url>    Shorten a URL and print the short link\n' +
    '  snip ls           List all short links\n' +
    '  snip open <code>  Open a short link in the default browser\n' +
    '  snip help         Show this message\n'
  );
}

/** fetch() wrapper — exits 1 with a friendly message on network failure. */
async function apiFetch(path, init) {
  try {
    return await fetch(BASE + path, init);
  } catch (err) {
    die('Error: Cannot reach backend at ' + BASE + ' \u2014 ' + err.message);
  }
}

/**
 * Issue a GET that never follows redirects and return { status, location }.
 * fetch() with redirect:'manual' exposes an opaque-redirect response in Node
 * (status 0, headers filtered), so we use the native http/https module here.
 */
function getNoFollow(url) {
  return new Promise(function (resolve, reject) {
    var mod = url.startsWith('https') ? https : http;
    var req = mod.request(url, { method: 'GET' }, function (res) {
      res.resume(); // drain so the socket is freed
      resolve({ status: res.statusCode, location: res.headers.location || null });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── commands ──────────────────────────────────────────────────────────────────
async function cmdAdd(url) {
  if (!url) die('Usage: snip add <url>');
  if (!/^https?:\/\/.+/i.test(url)) {
    die('Error: URL must start with http:// or https://');
  }

  var res = await apiFetch('/api/links', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url: url }),
  });
  var body = await res.json().catch(function () { return {}; });
  if (!res.ok) die('Error: ' + (body.error || res.statusText));

  console.log(body.shortUrl);
}

async function cmdLs() {
  var res   = await apiFetch('/api/links');
  var links = await res.json().catch(function () { return null; });
  if (!res.ok || !Array.isArray(links)) die('Error: ' + res.statusText);

  if (links.length === 0) { console.log('No links yet.'); return; }

  var codeW = Math.max(4, Math.max.apply(null, links.map(function (l) { return l.code.length; })));
  var hitsW = Math.max(4, Math.max.apply(null, links.map(function (l) { return String(l.hits).length; })));

  function pad(s, w) { return String(s).padEnd(w); }

  console.log(pad('CODE', codeW) + '  ' + pad('HITS', hitsW) + '  URL');
  console.log('-'.repeat(codeW) + '  ' + '-'.repeat(hitsW) + '  ' + '-'.repeat(40));
  links.forEach(function (l) {
    console.log(pad(l.code, codeW) + '  ' + pad(l.hits, hitsW) + '  ' + l.url);
  });
}

async function cmdOpen(code) {
  if (!code) die('Usage: snip open <code>');

  var result;
  try {
    result = await getNoFollow(BASE + '/' + code);
  } catch (err) {
    die('Error: Cannot reach backend at ' + BASE + ' \u2014 ' + err.message);
  }

  if (result.status === 404 || !result.location) {
    die('Error: Unknown code "' + code + '"');
  }

  var target = result.location;

  if (process.platform === 'win32') {
    // 'start' is a cmd built-in; empty string is the title so URLs aren't
    // mistaken for the window title
    execFile('cmd', ['/c', 'start', '', target], function (err) {
      if (err) die('Error: Could not open browser \u2014 ' + err.message);
    });
  } else if (process.platform === 'darwin') {
    execFile('open', [target], function (err) {
      if (err) die('Error: Could not open browser \u2014 ' + err.message);
    });
  } else {
    execFile('xdg-open', [target], function (err) {
      if (err) die('Error: Could not open browser \u2014 ' + err.message);
    });
  }
}

// ── dispatch ──────────────────────────────────────────────────────────────────
var cmd = process.argv[2];
var arg = process.argv[3];

switch (cmd) {
  case 'add':
    cmdAdd(arg).catch(function (err) { die('Error: ' + err.message); });
    break;
  case 'ls':
    cmdLs().catch(function (err) { die('Error: ' + err.message); });
    break;
  case 'open':
    cmdOpen(arg).catch(function (err) { die('Error: ' + err.message); });
    break;
  case 'help':
  case '--help':
  case '-h':
  default:
    usage();
    break;
}
