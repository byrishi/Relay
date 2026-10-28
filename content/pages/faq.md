---
title: Relay FAQ — P2P File Transfer Questions Answered
description: Answers about Relay: is it free, is it secure, size limits, phones, folders, what happens if the connection drops, and how it compares to WeTransfer and AirDrop.
h1: Frequently asked questions
category: Relay
updated: 2026-10-28
related: how-p2p-file-transfer-works, verify-safety-number, best-way-to-send-large-files, airdrop-alternative
---
## FAQ

### What is Relay?
Relay is a free, open-source web app for sending files directly between two devices. The files travel peer-to-peer over an encrypted WebRTC connection instead of being uploaded to a cloud service.

### Is Relay free?
Yes, completely. No plans, no limits, no ads. The code is MIT licensed on GitHub.

### Is Relay secure?
Every transfer is encrypted end to end by WebRTC (DTLS) with keys created on the two devices. You approve each device that joins and accept each file. To confirm nobody is intercepting the connection, compare the safety number shown on both screens. Read the full [security model](/security).

### Can the Relay server see my files?
No. File names, contents and messages only travel inside the encrypted connection between the two devices. The server only helps them find each other.

### Is there a file size limit?
Relay sets none. Chrome and Edge on desktop stream files straight to disk, so very large files work. Firefox, Safari and mobile browsers keep the file in browser storage until you save it, so free disk space is the limit.

### Do both devices need to be online?
Yes. Relay does not store files, so the sender keeps the tab open until the receiver has everything. If you need to send to someone who is offline, a cloud service is the better tool.

### What happens if my Wi-Fi drops?
Relay keeps what was already received. When the connection comes back (within about 10 minutes, with both tabs still open), the transfer continues from the exact byte where it stopped.

### Does it work between iPhone and Android, or Mac and Windows?
Yes. Relay runs in the browser, so any combination works: iPhone to Android, Android to Windows, Mac to Linux and so on. See [how to send files from iPhone to Android](/send-files-from-iphone-to-android).

### Can I send a folder?
Yes. Drop a folder or use **Send a folder**. The receiver can save it straight into a folder (Chrome, Edge) or download it as a .zip with the structure intact.

### Do I need to be on the same Wi-Fi?
No. Relay works across the internet with a room code. On the same network, devices also show up under **Nearby** so you can connect without a code, and transfers run at local network speed.

### What is the safety number?
A short number computed from both devices' encryption keys. If both screens show the same number, your connection is end to end and nobody is in the middle. [How to verify it](/verify-safety-number).

### Why does Relay show a device name like "Violet Fox"?
It is a random name so you can tell devices apart without revealing anything about you.

### Can I self-host Relay?
Yes. It is a single Node.js app. See [self-hosted file sharing with Relay](/self-hosted-file-sharing).

### How is Relay different from WeTransfer or AirDrop?
WeTransfer uploads your file to its servers and limits free transfers to 3 GB per 30 days. AirDrop only works between Apple devices. Relay works across every platform, has no size limit and never uploads your file. See [Relay vs WeTransfer](/relay-vs-wetransfer) and [AirDrop alternatives](/airdrop-alternative).
