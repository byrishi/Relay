---
title: Relay vs PairDrop — Two Open-Source Browser File Sharers
description: Relay and PairDrop both share files browser to browser. Compare pairing and rooms, encryption verification, large-file handling, resume, folders and self-hosting.
h1: Relay vs PairDrop
category: Comparison
date: 2026-10-28
updated: 2026-10-28
order: 46
keywords: relay vs pairdrop, pairdrop alternative, pairdrop vs snapdrop, browser file sharing
related: relay-vs-snapdrop, relay-vs-sharedrop, best-p2p-file-sharing-apps, airdrop-alternative
---
**PairDrop and Relay are both open-source, browser-based tools for sending files directly between devices. PairDrop focuses on persistent pairing between your own devices; Relay focuses on verifiable security and large, resumable transfers.**

## About PairDrop

PairDrop is a fork of Snapdrop. Devices on the same network see each other. You can pair devices permanently with a 6-digit code or QR, or join temporary public rooms with a 5-letter code for internet transfers; a TURN server handles difficult networks. It adds share-menu integration, ZIP downloads and more. It is GPL-3.0 licensed.

## Comparison

| | Relay | PairDrop |
|---|---|---|
| Same-network discovery | Yes | Yes |
| Internet transfers | Room code (adjective-noun-number), QR, optional password | Public rooms (5 letters) or paired devices |
| Persistent pairing | No (rooms are per session) | Yes |
| Verify encryption (safety number) | Yes | No |
| Approve each device | Yes | Paired devices are trusted |
| Accept / decline before bytes are sent | Yes | Yes |
| Save straight to disk | Yes (Chrome, Edge) | No |
| Resume after a dropped connection | Yes | No |
| Folders with structure | Yes | ZIP of multiple files |
| License | MIT | GPL-3.0 |

## Which one?

- **PairDrop** if you mainly move files between your own devices and want them paired permanently.
- **Relay** for sending to other people, sensitive files you want to verify, or very large files.

## FAQ

### Is PairDrop the same as Snapdrop?
PairDrop is a maintained fork of Snapdrop with extra features. Snapdrop.net now points to PairDrop.

### Which is more secure, Relay or PairDrop?
Both use WebRTC's end-to-end encryption. Relay adds a safety number to detect a man-in-the-middle, device approval, and rate-limited room codes.
