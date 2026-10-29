# Relay

Peer-to-peer, end-to-end encrypted file transfer in the browser. Files go straight from one device to another: nothing is uploaded, there is no account and no size limit.

This repository is the open-source core of Relay:

- **Transfer engine** (`src/lib/webrtc.ts`, `src/lib/sinks.ts`): WebRTC data channels, flow control, resume, folder transfer, integrity checks and the safety number.
- **Signaling server** (`server.ts`): introduces two devices to each other. File bytes never pass through it.
- **Session hook** (`src/hooks/useRelay.ts`): rooms, device approval, offers and transfers as a React hook.
- **Reference client** (`src/client/`): a deliberately plain interface that shows every step, so you can build your own on top of the hook.

The hosted app at https://relay.rishishah.in is built on this core. Its interface, design and content are not part of this repository.

## How it works

1. One device creates a room and gets a readable code such as `satya-ganga-108`.
2. The other device joins with the code or a link. The creator must approve it.
3. The server relays only connection setup between the two. The browsers then open a WebRTC connection to each other, directly if they can and through a TURN relay if they must.
4. Both screens show a safety number derived from both devices' certificate fingerprints. If the numbers match, nobody is in the middle.
5. The receiver accepts each file before anything is written, and the file streams across, encrypted by the browsers (DTLS).

See [SECURITY.md](SECURITY.md) for what is protected, what the server can see, and the review notes.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build      # client and server bundle in dist/
npm start
```

Node 22 is recommended (see `.nvmrc`).

## Self-host

One Node process serves the client and the signaling server.

```bash
docker build -t relay .
docker run -p 3000:3000 relay
```

or deploy it to any Node host. `render.yaml` is a ready blueprint for Render.

| Variable | Purpose |
|---|---|
| `PORT` | Port to listen on (default 3000). |
| `TRUST_PROXY` | Number of reverse proxies in front of the server (default 1 in production), so rate limits see real client IPs. |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to use the server from another site. |
| `TURN_URLS`, `TURN_SECRET` | Optional [coturn](https://github.com/coturn/coturn) relay (`use-auth-secret`) for strict networks. The server hands out short-lived credentials. |

Most networks connect directly. Some offices, universities and mobile carriers block direct connections, and those need a TURN relay.

## Use the engine in your own interface

`useRelay()` returns the whole session as plain state and methods: `createRoom`, `joinRoom`, `approvePeer`, `sendFiles`, `respondToOffer`, `manageTransfer`, plus `peers`, `offers` and `transfers`. `src/client/App.tsx` is a complete example in about 200 lines.

## Project layout

```
server.ts                signaling server (Socket.IO), rate limits, CSP, TURN credentials
src/lib/webrtc.ts        transfer engine: offers, flow control, resume, safety number
src/lib/sinks.ts         where received bytes go (disk, folder, browser storage) and the ZIP builder
src/hooks/useRelay.ts    session logic: rooms, peers, approvals, nearby devices
src/client/              reference client
```

## Limitations

- Both devices must be online during the transfer; Relay stores nothing.
- Saving straight to disk needs Chrome or Edge on desktop; other browsers buffer in browser storage first.
- Your peer can see your IP address, as with any direct connection.

## Contributing and security

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues privately, as described in [SECURITY.md](SECURITY.md). Release notes are in [CHANGELOG.md](CHANGELOG.md).

## License

[Apache License 2.0](LICENSE) © 2026 Rishi Shah. If you use or redistribute Relay, keep the [NOTICE](NOTICE) file and credit Rishi Shah.
