---
title: Self-Hosted File Sharing with Relay (Docker, Render, VPS)
description: Run your own Relay server: one Node.js app or Docker container. Deploy on a VPS, Render or Docker, add TURN with coturn, and configure proxies, origins and limits.
h1: Self-hosted file sharing with Relay
category: How-to
date: 2026-05-24
updated: 2026-10-28
order: 27
keywords: self hosted file sharing, self host file transfer, self hosted wetransfer, docker file sharing, private file sharing server
related: open-source-file-sharing, turn-vs-stun, secure-file-sharing, how-p2p-file-transfer-works
---
**Relay is a single Node.js app that serves the web app and the signaling server, so self-hosting is one container.** Files still go device to device; your server only introduces them.

## Option 1: Docker

```bash
git clone https://github.com/byrishi/Relay.git
cd Relay
docker build -t relay .
docker run -d -p 3000:3000 -e TRUST_PROXY=1 --name relay relay
```

Put it behind HTTPS (Caddy, Nginx or your platform's proxy). Browsers only allow WebRTC and the clipboard on secure origins.

## Option 2: Render (free tier)

The repository includes a `render.yaml`. Create a new **Blueprint** on Render, point it at your fork, and deploy. Free instances sleep after 15 minutes without traffic; activity on open connections keeps them awake.

## Option 3: Any VPS with Node.js 20+

```bash
npm ci --include=dev
npm run build
NODE_ENV=production TRUST_PROXY=1 PORT=3000 npm start
```

Use systemd or pm2 to keep it running, and Nginx or Caddy for HTTPS and WebSockets.

## Configuration

| Variable | Purpose |
|---|---|
| `PORT` | Port to listen on (default 3000) |
| `TRUST_PROXY` | Number of proxies in front (1 behind Nginx, Render, Fly). Needed for correct rate limiting |
| `ALLOWED_ORIGINS` | Comma-separated origins if the frontend is on another domain |
| `TURN_SECRET`, `TURN_URLS` | Enable TURN with short-lived credentials (coturn `use-auth-secret`) |

`GET /healthz` returns `ok` for uptime checks.

## Adding a TURN server

For users behind strict firewalls, run [coturn](https://github.com/coturn/coturn) on a VPS:

```ini
listening-port=3478
tls-listening-port=5349
use-auth-secret
static-auth-secret=CHANGE_ME_LONG_RANDOM
realm=relay.example.com
```

Then set `TURN_SECRET` to the same secret and `TURN_URLS=turn:relay.example.com:3478,turns:relay.example.com:5349`. Relay issues credentials valid for six hours. See [TURN vs STUN](/turn-vs-stun).

## FAQ

### Do files pass through my self-hosted server?
No. Only connection setup does. Files go directly between devices, or through your TURN server, still encrypted, when a direct path is impossible.

### How much does it cost to run?
The signaling server is tiny; a free tier or the smallest VPS is enough. TURN uses bandwidth, so budget for it if many users are on strict networks.
