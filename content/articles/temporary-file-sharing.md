---
title: Temporary File Sharing — Send Files That Leave No Trace
description: Share files temporarily with nothing left behind: no stored copy, no lingering link. How live P2P transfer compares with expiring links from cloud services.
h1: Temporary file sharing
category: Guide
date: 2026-05-24
updated: 2026-10-28
order: 15
keywords: temporary file sharing, share files temporarily, expiring file link, disposable file sharing, one time file transfer
related: send-files-without-uploading, private-file-transfer, relay-vs-wormhole, wetransfer-alternative
---
**The most temporary way to share a file is a live transfer that never stores it: once the other device has it, nothing remains anywhere else.** Expiring links are the next best thing, but they still keep a copy on a server until they expire.

## Two kinds of temporary

| | Live transfer (Relay) | Expiring link (WeTransfer, Wormhole) |
|---|---|---|
| Copy on a server | Never | Until expiry (Wormhole: 24 h, WeTransfer free: 3 days) |
| Link can be forwarded | No link exists | Yes, until it expires |
| Recipient can be offline | No | Yes |

## How Relay keeps it temporary

- Rooms exist only while devices are connected, and at most 24 hours.
- Files go straight between the browsers.
- Files received into browser storage are cleaned up automatically after six hours if you don't save them.
- History, if you keep it, stores only names and sizes on your own device. You can turn it off.

## FAQ

### What's the best way to share a file temporarily?
If the recipient is online, a live transfer like Relay: nothing is stored. If not, use an encrypted expiring link.

### Does Relay delete files after sending?
Relay never stores them in the first place. The recipient keeps the file they saved; nothing else remains.
