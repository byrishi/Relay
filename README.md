# Relay
			
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/byrishi/Relay)

<a href="https://peerlist.io/rishhishah/project/relay" target="_blank" rel="noreferrer">
				<img
					src="https://peerlist.io/api/v1/projects/embed/PRJH6A7EDKK7QNB9MI99JDGADGN7RN?showUpvote=true&theme=dark"
					alt="Relay"
					style="width: auto; height: 72px;"
				/>
			</a>  



> Minimal, privacy-focused peer-to-peer file transfer built with WebRTC.

<p align="center">
<img width="250" height="250" alt="relay-wordmark" src="https://github.com/user-attachments/assets/e4183387-1376-4148-95d5-6e14733b9982" />
</p>

<p align="center">
  Direct browser-to-browser file transfer.<br/>
  No accounts. No cloud storage. No unnecessary infrastructure.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#architecture"><strong>Architecture</strong></a> ·
  <a href="#getting-started"><strong>Getting Started</strong></a> ·
  <a href="#deployment"><strong>Deployment</strong></a> ·
  <a href="#security--privacy"><strong>Security</strong></a> ·
  <a href="#limitations"><strong>Limitations</strong></a>
</p>

# What is Relay?

Relay is a lightweight peer-to-peer file transfer tool built with WebRTC.

Files are transferred directly between browsers whenever possible, without uploading them to a central storage server.

Relay focuses on:
- fast direct transfers
- minimal infrastructure
- privacy-focused architecture
- modern browser experience
- simple self-hosting

Unlike traditional upload-based platforms, Relay avoids storing user files on the server.

---

# Screenshots
<img width="1907" height="3748" alt="screencapture-relay-rishishah-in-2026-05-24-22_52_01" src="https://github.com/user-attachments/assets/e3ff4836-894c-4afd-853b-ea7f7a2d5b37" />
<img width="1907" height="3345" alt="screencapture-relay-rishishah-in-2026-05-24-22_55_53" src="https://github.com/user-attachments/assets/2faae0d7-b7e7-4ee8-ae6b-406899d0aeed" />


---

# Features

## Core Features

- Direct peer-to-peer file transfer
- WebRTC DataChannel transport
- Real-time transfer progress
- Multi-file sharing
- Drag & drop support
- QR room sharing
- Temporary room-based sessions
- Cross-platform browser support
- Responsive modern UI

---

## Privacy-Focused Design

- Files are not stored on the Relay server
- Transfers occur directly between peers whenever connectivity allows
- Signaling server only coordinates connection setup
- No database required
- No user accounts
- No file retention system

---

# Architecture

Relay uses WebRTC for direct browser-to-browser communication.

```text
┌─────────────┐        Signaling         ┌─────────────┐
│   Browser   │  ───────────────────▶   │   Server    │
│    Peer A   │  ◀───────────────────   │ (WebSocket) │
└──────┬──────┘                         └──────┬──────┘
       │                                        │
       │        ICE / SDP Negotiation           │
       └────────────────────────────────────────┘
                        │
                        ▼
              Direct WebRTC Connection
                        │
                        ▼
┌─────────────┐                         ┌─────────────┐
│ File Chunks │  ◀──────────────────▶  │ File Chunks │
│   Peer A    │                         │   Peer B    │
└─────────────┘                         └─────────────┘
```

---

## Transfer Flow

1. User creates or joins a room
2. Peers connect through the signaling server
3. WebRTC negotiation establishes a direct connection
4. Files are chunked and streamed through RTCDataChannel
5. Receiver reconstructs and downloads files locally

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- Framer Motion

## Networking

- WebRTC
- RTCDataChannel
- WebSocket Signaling

## Backend

- Node.js
- Express
- WebSocket Server

---

# Why WebRTC?

WebRTC enables direct peer-to-peer communication between browsers.

Benefits include:
- lower infrastructure costs
- reduced latency
- no centralized file uploads
- faster LAN transfers
- minimal server involvement

Relay uses the server only for signaling and peer coordination.

The server does not participate in actual file transfers.

---

# Getting Started

## Prerequisites

- Node.js 18+
- npm / pnpm / yarn

---

## Clone Repository

```bash
git clone https://github.com/byrishi/Relay.git
cd Relay
```

---

## Install Dependencies

```bash
npm install
```

---

## Run Development Environment

### Frontend

```bash
npm run dev
```

### Signaling Server

```bash
cd server
npm install
npm run dev
```

---

# Environment Variables

## Frontend

```env
VITE_SIGNALING_SERVER=wss://your-domain.com
```

---

## Backend

```env
PORT=3001
NODE_ENV=production
```

---

# Deployment

## Recommended Setup

| Service | Recommendation |
|---|---|
| Frontend | Vercel / Netlify / Cloudflare Pages |
| Signaling Server | Railway / Render / Fly.io / VPS |

---

## Important Requirements

WebRTC requires:
- HTTPS
- Secure WebSocket connections (WSS)
- Proper reverse proxy configuration

---

## Example Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
    }

    location /ws {
        proxy_pass http://localhost:3001;

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

# Security & Privacy

Relay is designed around direct peer-to-peer communication and minimal infrastructure.

However:

This project should not be treated as hardened enterprise-grade infrastructure.

Please review the architecture and threat model before using Relay in highly sensitive environments.

---

## What Relay Does

- Transfers files directly between peers whenever possible
- Avoids centralized file storage
- Uses encrypted WebRTC transport
- Minimizes server involvement

---

## What Relay Does NOT Do

- Guarantee anonymity
- Persist transfers across disconnects
- Prevent endpoint compromise
- Bypass restrictive enterprise firewalls
- Provide advanced metadata protection

---

# STUN / TURN

Relay currently uses public STUN servers for NAT traversal.

This works well for many standard home and office environments.

Some restrictive networks may require TURN relay support.

Examples include:
- corporate networks
- university networks
- CGNAT mobile carriers
- restrictive public WiFi

TURN support is planned for future releases.

---

# Limitations

Relay intentionally prioritizes simplicity and lightweight infrastructure.

Current limitations include:

- Some restrictive networks may fail to establish peer connections
- Safari support may be less stable than Chromium browsers
- Mobile browsers may throttle transfers in background tabs
- Interrupted transfers are not yet resumable
- Both peers must remain online during transfers
- Browser memory limits may affect extremely large files

---

# Browser Support

| Browser | Status |
|---|---|
| Chrome | Supported |
| Edge | Supported |
| Firefox | Supported |
| Safari | Partial |
| Mobile Browsers | Experimental |

---

# Project Structure

```text
Relay/
├── client/
├── server/
├── components/
├── hooks/
├── lib/
├── public/
├── README.md
└── package.json
```

---

# Development Philosophy

Relay intentionally prioritizes:
- simplicity over feature bloat
- direct transfers over cloud infrastructure
- transparency over exaggerated claims
- understandable architecture
- lightweight deployment

The goal is to build a focused, self-hostable transfer tool that remains easy to understand and maintain.

---

# Contributing

Contributions are welcome.

Before opening a pull request:

1. Read `CONTRIBUTING.md`
2. Open an issue for major changes
3. Keep pull requests focused and minimal
4. Follow existing code style

---

# Running Tests

```bash
npm run test
```

---

# Security Reporting

If you discover a security issue, please report it privately through `SECURITY.md` before opening a public issue.

---

# License

MIT License.

See `LICENSE` for more information.

---

# Acknowledgements

Built with:
- WebRTC
- React
- TypeScript
- Open web standards

Inspired by the idea that simple tools should remain simple.

---

# Final Notes

Relay is an evolving open-source project.

It is already usable today, but still actively improving.

If you are looking for:
- direct browser-to-browser file transfer
- minimal infrastructure
- privacy-focused architecture
- self-hostable deployment

then Relay may fit your workflow well.

Feedback, issues, and contributions are always appreciated.
