# Snip CLI

A zero-dependency Node.js CLI for the [Snip](https://github.com/web-1997/ai-sdlc-snip-demo) URL shortener backend.

## Requirements

Node.js ≥ 18 (global `fetch` is required).

## Quick start

```bash
# run directly
node cli.js help

# or use a wrapper
./snip help          # Unix/macOS
snip.cmd help        # Windows cmd
./snip.ps1 help      # PowerShell

# install globally via npm
npm install -g .
snip help
```

## Commands

| Command | Description |
|---|---|
| `snip add <url>` | Shorten a URL; prints the short link |
| `snip ls` | List all links with code, hit count, and original URL |
| `snip open <code>` | Open the destination URL in the default OS browser |
| `snip help` | Show usage |

## Configuration

| Variable | Default | Description |
|---|---|---|
| `SNIP_API` | `http://localhost:3000` | Base URL of the Snip backend |
