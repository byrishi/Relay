---
title: WebRTC File Transfer — Send Files Browser to Browser
description: How WebRTC file transfer works, why it's encrypted by default, its strengths and limits, and how to send files between browsers with no upload and no install.
h1: WebRTC file transfer
category: Explainer
date: 2026-05-24
updated: 2026-10-28
order: 31
keywords: webrtc file transfer, webrtc file sharing, webrtc data channel file transfer, send files with webrtc, how webrtc file sharing works
related: how-p2p-file-transfer-works, webrtc-security, browser-to-browser-file-transfer, turn-vs-stun
---
**WebRTC file transfer sends a file directly from one browser to another over an encrypted peer-to-peer connection, with no plugin and no server storing the file.** It is the same technology that powers video calls in Google Meet and Discord, used here for data instead of audio and video.

## How it works in one paragraph

Two browsers exchange connection details through a signaling server, use ICE (with STUN, and TURN if needed) to find a network path, perform a DTLS handshake to agree on encryption keys, and open an `RTCDataChannel`. The sender reads the file in chunks and writes them to the channel; the receiver reassembles them. The full walkthrough is in [how P2P file transfer works](/how-p2p-file-transfer-works).

## Why WebRTC is a good fit for file sharing

- **Built into every modern browser:** Chrome, Edge, Firefox and Safari on desktop and mobile. Nothing to install.
- **Encrypted by default:** data channels always run over DTLS. Browsers will not open an unencrypted one.
- **Direct path:** on the same network data stays local; across the internet it usually goes straight between the two devices.
- **Reliable mode:** data channels can be ordered and reliable (like TCP), which is what you want for files.

## The hard parts, and how Relay handles them

| Challenge | Naive approach | What Relay does |
|---|---|---|
| Large files and memory | Read the whole file into memory | Streams chunks, reads ahead from disk, writes to disk as they arrive |
| Flooding the channel | Send as fast as possible | Pauses on buffer limits and waits for the receiver's disk writes |
| Accurate progress | Count bytes handed to the buffer | Counts bytes the receiver acknowledged |
| Dropped connections | Start over | Resumes from the last received byte |
| Unwanted files | Auto-download | Receiver accepts or declines each file |
| Key verification | Trust the server | Safety number from both certificate fingerprints |

## Limits of WebRTC file transfer

- Both browsers must stay open during the transfer.
- Some corporate and mobile networks require a TURN relay.
- Browsers other than Chrome and Edge can't yet write straight to a file you choose, so they buffer in browser storage first.

## Try it

Open [Relay](/) on two devices and send a file. It's free and [open source](/open-source-file-sharing).

## FAQ

### Is WebRTC file transfer secure?
Yes. WebRTC encrypts all data with DTLS between the two browsers. To rule out a man-in-the-middle at the signaling step, compare a safety number, as Relay offers. See [WebRTC security](/webrtc-security).

### Does WebRTC file transfer work on phones?
Yes. Mobile Chrome, Safari and Firefox all support WebRTC data channels.

### What is the maximum file size for WebRTC?
WebRTC itself has no file size limit. Limits come from how the app stores data. Relay streams to disk, so there is no practical limit in Chrome and Edge.
