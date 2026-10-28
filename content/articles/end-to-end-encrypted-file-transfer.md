---
title: End-to-End Encrypted File Transfer — How It Works
description: What end-to-end encrypted file transfer means, how WebRTC encrypts files between browsers, and how to confirm nobody is in the middle with a safety number.
h1: End-to-end encrypted file transfer
category: Security
date: 2026-10-28
updated: 2026-10-28
order: 5
keywords: end to end encrypted file transfer, encrypted file transfer, e2ee file sharing, encrypted file sharing, send encrypted files
related: verify-safety-number, webrtc-security, secure-file-sharing, private-file-transfer
---
**An end-to-end encrypted file transfer is one where the file is encrypted on the sender's device and can only be decrypted on the recipient's device.** No server along the way, including the service you are using, has the keys.

## Encrypted "in transit" is not the same thing

Most services say files are "encrypted in transit". Usually that means HTTPS between you and *their* server. The server decrypts the file, stores it (often encrypted at rest with keys it controls), and re-encrypts it for the recipient. The company can read it. End-to-end encryption removes that middle step.

## How Relay encrypts files end to end

Relay sends files over **WebRTC**, the technology browsers use for video calls. Every WebRTC connection is encrypted with **DTLS**:

1. Each browser creates its own certificate and key pair.
2. The browsers exchange certificate **fingerprints** while connecting.
3. They run a DTLS handshake directly with each other and derive fresh session keys (with forward secrecy).
4. Every file chunk, message and clipboard text is encrypted with those keys, typically AES-GCM.

The keys never leave the two devices. Relay's server only relays the connection setup.

## The man-in-the-middle question

There is one catch common to every system where a server introduces two parties: the server passes the fingerprints along. A malicious server could swap them and sit in the middle, decrypting and re-encrypting.

Relay closes this gap with a **safety number**. Each device computes it from *both* fingerprints. If someone swapped a key, the two screens show different numbers. Compare them, in person or over a call, and you know the connection is truly end to end. [How to verify a safety number](/verify-safety-number).

## What end-to-end encryption does not cover

- **Endpoints:** malware on either device can read files before or after transfer.
- **Metadata:** the server knows two devices connected, and their IP addresses, but not what was sent.
- **The recipient:** once delivered, the file is theirs to share.

## FAQ

### Is WebRTC file transfer end-to-end encrypted?
Yes. WebRTC always encrypts data channels with DTLS between the two browsers. To be sure no server swapped keys, verify the fingerprints, which is what Relay's safety number does.

### Can Relay decrypt my files?
No. The keys exist only on the two devices. If both screens show the same safety number, no one, including Relay, could have intercepted the connection.

### Which encryption does Relay use?
DTLS 1.2 or later, negotiated by the browsers, usually with AES-128-GCM or ChaCha20-Poly1305 for the data and ECDHE for key exchange.
