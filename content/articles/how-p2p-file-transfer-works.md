---
title: How P2P File Transfer Works (Signaling, NAT, WebRTC)
description: A clear technical walkthrough of peer-to-peer file transfer: how devices find each other, get through NAT and firewalls, encrypt the link, and stream files reliably.
h1: How peer-to-peer file transfer works
category: Explainer
date: 2026-05-24
updated: 2026-10-28
order: 30
keywords: how p2p file transfer works, direct file transfer, how does peer to peer work, nat traversal, webrtc data channel
related: file-transfer-glossary, webrtc-file-transfer, turn-vs-stun, webrtc-security, peer-to-peer-file-sharing
---
**Peer-to-peer file transfer has four steps: the devices find each other through a signaling server, they discover a network route with STUN (or a TURN relay), they set up an encrypted channel, and the file streams across in chunks with flow control.** Here is each step, using Relay as the example.

## 1. Signaling: introducing the devices

Two devices on different networks can't simply call each other; neither knows the other's address. A **signaling server** acts as the introduction desk. In Relay, both browsers connect to it over a WebSocket and join the same room (via the code, QR or nearby list). The server then relays three kinds of short messages between them:

- an **offer** and an **answer** (SDP), which describe each side's capabilities and its encryption certificate fingerprint;
- **ICE candidates**: possible network addresses where each device might be reachable.

The server never handles file data.

## 2. NAT traversal: finding a route

Most devices sit behind a router doing Network Address Translation (NAT), so their real address isn't reachable from outside. WebRTC's ICE process tries routes in order:

1. **Host candidates**: local addresses. If both devices are on the same Wi-Fi, this direct route wins and traffic never leaves your network.
2. **Server-reflexive candidates**: your public address, discovered by asking a **STUN** server "what do I look like from outside?". This lets most home connections link up directly across the internet.
3. **Relay candidates**: if both sides are behind strict firewalls, a **TURN** server forwards the (still encrypted) packets.

Relay shows which route you got: *Direct · Local network*, *Direct · Peer-to-peer* or *Relayed via TURN*. More in [TURN vs STUN](/turn-vs-stun).

## 3. Encryption: DTLS between the browsers

Once a route works, the browsers run a DTLS handshake directly with each other, checking that each certificate matches the fingerprint received during signaling. All data is then encrypted with session keys known only to the two devices. Relay's [safety number](/verify-safety-number) lets you confirm the fingerprints weren't swapped.

## 4. Streaming the file

Data travels over an SCTP **data channel** inside the DTLS connection, reliable and in order. Relay's transfer engine:

- **asks first:** the receiver sees the name and size and accepts or declines;
- **chunks the file** into pieces up to 256 KB and reads ahead from disk so the network is never idle;
- **applies back-pressure:** it pauses when the send buffer is full and when the receiver hasn't written enough to disk yet, so memory stays flat even for huge files;
- **writes to disk in batches** on the receiving side (or straight to a file you chose, in Chrome and Edge);
- **acknowledges progress**, so both sides show real delivered bytes and speed;
- **resumes**: after a dropped connection, the receiver reports how many bytes it has and the sender continues from there.

## FAQ

### Does P2P file transfer need a server at all?
A small one, to introduce the devices (and optionally a TURN relay for strict networks). The file itself goes directly between the devices.

### Why do some P2P connections fail?
Usually because both networks block direct connections (symmetric NAT, corporate firewalls) and no TURN relay is available.

### Is P2P transfer faster than uploading to the cloud?
Generally yes: the data crosses the network once instead of twice, and on a local network it never touches the internet.
