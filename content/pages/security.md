---
title: Security — How Relay Protects Your Files
description: What Relay encrypts, what the server can and cannot see, how safety numbers stop man-in-the-middle attacks, and the limits of the design. Reviewed October 2026.
h1: Security
category: Relay
updated: 2026-10-28
related: verify-safety-number, end-to-end-encrypted-file-transfer, webrtc-security, is-p2p-file-sharing-safe
---
Relay is built so that your files never touch our servers and nobody but the two devices can read them. This page explains exactly how, and where the limits are.

## What protects your files

| Layer | What it does |
|---|---|
| **WebRTC DTLS** | Every file, message and clipboard text is encrypted between the two browsers with keys created on the devices. The browsers negotiate the cipher (typically AES-GCM or ChaCha20-Poly1305). |
| **Safety number** | Both screens show a number derived from both devices' certificate fingerprints. If it matches, nobody, including the Relay server, is in the middle. |
| **Device approval** | A device that joins your room cannot receive anything until you press *Allow*. Blocked devices are disconnected. |
| **Accept or decline** | Nothing is written to your device until you accept the file. |
| **Room codes** | About 54 million readable codes. After 12 wrong guesses an IP address is blocked for 10 minutes. Rooms can also have a password. |
| **Scoped signaling** | The server only relays connection messages between devices in the same room. |
| **TURN** | If a relay is needed, it only forwards encrypted packets it cannot read. Credentials expire after six hours. |
| **Hardened web app** | A strict Content-Security-Policy (no third-party scripts, no framing) and standard security headers. |

## What our server sees

The signaling server sees the room code, the device name you appear as (a random name like *Violet Fox*), your IP address, and the WebRTC setup messages, which contain IP addresses and certificate fingerprints. It never sees file names, file contents, messages or clipboard text. Everything is held in memory and nothing is written to disk or logged by Relay. The hosting provider may keep its own access logs.

## Why the safety number matters

Because the server passes the two devices' certificate fingerprints to each other, a compromised or malicious server could try to place itself in the middle. The safety number is the defence: it is computed on each device from **both** fingerprints, so a swapped key produces different numbers on the two screens. Comparing the numbers, in person or over a call, rules the attack out. See [how to verify a safety number](/verify-safety-number).

## What Relay does not protect against

- **Your IP address** is visible to the device you connect to. That is how direct connections work.
- **Malware** on either device can read files before they are sent or after they arrive.
- **Approved devices** can send you any file, so open received files with the usual care.
- If you skip the safety number, you are trusting whoever runs the server.

## Review history

In October 2026 the code was reviewed and these issues were fixed: brute-forceable room codes with silent joins, no way to detect a man-in-the-middle, rate limits that would block all users behind a proxy, signaling that was not limited to a room, automatic saving of incoming files, and overstated encryption claims. The full report is in [SECURITY.md on GitHub](https://github.com/byrishi/Relay/blob/main/SECURITY.md). There has been no third-party audit; the cryptography is the browsers' own WebRTC implementation.

Found a vulnerability? Please report it privately to the maintainer via [rishishah.in](https://rishishah.in) rather than opening a public issue.
