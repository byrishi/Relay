---
title: Relay vs Wormhole — Encrypted File Sharing Compared
description: Relay vs Wormhole (wormhole.app): both end-to-end encrypted. Wormhole stores files up to 5 GB for 24 hours; Relay streams directly and stores nothing.
h1: Relay vs Wormhole
category: Comparison
date: 2026-10-28
updated: 2026-10-28
order: 47
keywords: relay vs wormhole, wormhole.app alternative, wormhole file transfer, encrypted file sharing link
related: wetransfer-alternative, end-to-end-encrypted-file-transfer, temporary-file-sharing, best-p2p-file-sharing-apps
---
**Wormhole and Relay both encrypt files end to end in the browser. The difference is storage: Wormhole keeps files up to 5 GB on its servers for 24 hours so the recipient can download later; Relay streams directly and never stores anything.**

## Comparison

| | Relay | Wormhole (wormhole.app) |
|---|---|---|
| Model | Live device-to-device stream | Encrypted upload + link (P2P above 5 GB) |
| Stored on servers | Never | Files up to 5 GB, deleted after 24 hours |
| Recipient downloads later | No | Yes, within 24 hours |
| Size limit | None | Over 5 GB the sender must keep the page open |
| Encryption | WebRTC DTLS + safety number | AES-128-GCM in the browser; key in the link |
| Verify the connection | Safety number | Share the link privately |
| Open source | Yes (MIT) | No |
| Account | No | No |

_Wormhole details from its FAQ, October 2026._

## Choose Wormhole when

the recipient isn't online now and the file is under 5 GB. Sharing a link is convenient.

## Choose Relay when

you're both online, the file is large, you want nothing stored anywhere even encrypted, or you want an open-source tool you can self-host.

## FAQ

### Is Wormhole peer-to-peer?
Partly. Files up to 5 GB are encrypted and stored on its servers for 24 hours; larger files are sent peer-to-peer while the sender's page stays open.

### Which is more private?
Both encrypt end to end. Relay leaves no copy on any server and is open source; Wormhole keeps an encrypted copy for up to a day.
