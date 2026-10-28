---
title: How to Verify a Safety Number in Relay
description: A step-by-step guide to checking Relay's safety number, what it proves about your encrypted connection, and what to do if the numbers don't match.
h1: How to verify a safety number
category: How-to
date: 2026-10-28
updated: 2026-10-28
order: 20
keywords: safety number, verify encryption, man in the middle protection, verify connection, relay safety number
related: end-to-end-encrypted-file-transfer, webrtc-security, secure-file-sharing
---
**A safety number proves that your Relay connection is end to end: if both screens show the same number, nobody, not even Relay's server, is intercepting it.** Checking takes ten seconds.

## Steps

1. Connect the two devices as usual.
2. On each device, click the other device's name in the **Secure link** panel. The safety number appears: five groups of four digits, for example `4821 0937 5512 7710 2046`.
3. Compare the numbers **through a channel you trust**: side by side in person, read aloud on a phone or video call, or in a chat app you already trust.
4. **If they match**, the connection is private end to end. Send away.
5. **If they don't match**, press **Disconnect**. Something is in the middle. Start a new room and try again on a different network.

The number is also shown when someone asks to join your room, so you can check before pressing **Allow**.

## What the number is

When two browsers connect with WebRTC, each creates its own encryption certificate. Relay takes the fingerprints of **both** certificates, sorts them, hashes them with SHA-256 and shows the first digits. Each device calculates this on its own.

If an attacker, or a compromised signaling server, swapped in its own certificate to read your traffic, each device would see a different fingerprint pair and so a different number.

## When to bother

- Always, for sensitive documents, credentials or private photos.
- When you connected through a code shared in a public place.
- Once per session is enough; the number stays the same while the connection lasts.

## FAQ

### Do I need to check the safety number every time?
For everyday files, it's optional. For anything sensitive, yes. It only takes a few seconds.

### Why is the safety number different every session?
Browsers create fresh certificates for new connections, so each session has its own number. That's expected.

### Can Relay fake the safety number?
Not without changing the code in your browser. The number is computed on your device from the actual connection, and Relay's code is open source so this can be checked.
