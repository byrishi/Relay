---
title: TURN vs STUN — How WebRTC Connects Through Firewalls
description: STUN helps devices find their public address for a direct connection; TURN relays encrypted traffic when a direct path is impossible. How they differ and when each is used.
h1: TURN vs STUN
category: Explainer
date: 2026-05-24
updated: 2026-10-28
order: 32
keywords: turn vs stun, stun server, turn server, webrtc nat traversal, webrtc firewall
related: how-p2p-file-transfer-works, webrtc-file-transfer, webrtc-security, self-hosted-file-sharing
---
**STUN tells a device what its public internet address is, so two devices can connect directly. TURN is a relay that forwards traffic when a direct connection is impossible.** WebRTC tries direct routes first and only falls back to TURN when it has to.

## STUN in one sentence

A STUN server answers one question: "what IP address and port do I appear to have from the outside?" Your browser shares that address with the other device, which lets most home networks punch a direct path through their routers. STUN servers handle a tiny amount of traffic and never see your data. Relay uses public STUN servers from Google and Cloudflare.

## TURN in one sentence

A TURN server is a relay with a public address. If both devices are behind strict firewalls or symmetric NAT (common in offices, universities and some mobile carriers), they both connect to the TURN server and it forwards packets between them.

## Comparison

| | STUN | TURN |
|---|---|---|
| Purpose | Discover your public address | Relay traffic when direct fails |
| Carries your data? | No | Yes, encrypted |
| Can it read your files? | No | No (DTLS end to end) |
| Bandwidth cost | Tiny | All relayed data |
| Speed | Direct path, fastest | Extra hop, slower |
| Needed for | Most internet connections | Strict networks only |

## Does TURN weaken encryption?

No. WebRTC's DTLS encryption runs end to end between the browsers. A TURN server only sees encrypted packets. Relay also shows **Relayed via TURN** on the connection badge so you always know.

## Running your own TURN server

If you self-host Relay, run [coturn](https://github.com/coturn/coturn) with `use-auth-secret` and set `TURN_SECRET` and `TURN_URLS` on the Relay server. Relay then hands out short-lived credentials, so no permanent password ships to browsers. See [self-hosted file sharing](/self-hosted-file-sharing).

## FAQ

### Do I need a TURN server for WebRTC?
Not for most connections. Same-network and most home-to-home transfers connect directly. TURN matters for corporate networks, some universities and some mobile carriers.

### Is STUN a security risk?
No. STUN only reflects your public address back to you. Your peer learns that address anyway when connecting directly.

### Why does my transfer say "Relayed via TURN"?
A direct path was blocked by a firewall or NAT, so the encrypted traffic is going through a relay. It's still end-to-end encrypted, just a little slower.
