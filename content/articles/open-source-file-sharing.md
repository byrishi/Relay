---
title: Open-Source File Sharing — Why It Matters and What to Use
description: Why open-source file sharing tools are easier to trust, how to check their claims, and the best open-source options: Relay, LocalSend, PairDrop and Magic Wormhole.
h1: Open-source file sharing
category: Guide
date: 2026-05-24
updated: 2026-10-28
order: 16
keywords: open source file sharing, open source file transfer, open source wetransfer alternative, self hosted file transfer
related: self-hosted-file-sharing, best-p2p-file-sharing-apps, secure-file-sharing, relay-vs-localsend
---
**Open-source file sharing tools publish their code, so anyone can check that they do what they claim: that files aren't uploaded, that encryption is real, that nothing is tracked.** You can also run them yourself.

## Why open source matters for file sharing

- **Verifiable claims.** "End-to-end encrypted" and "we don't store files" are promises. Open code lets experts confirm them.
- **No lock-in.** If the hosted service disappears, you can run your own.
- **Self-hosting.** Keep even the coordination server inside your organisation.

Open source isn't a guarantee by itself: code still needs review. Relay's [October 2026 security review](/security) found and fixed real issues, and is published openly.

## Open-source options

| Tool | Type | License | Notes |
|---|---|---|---|
| **Relay** | Web app | MIT | P2P over WebRTC, safety number, resume, self-hostable Node server |
| **LocalSend** | Native app | Apache-2.0 | Local network only, works offline |
| **PairDrop** | Web app | GPL-3.0 | Snapdrop fork with device pairing |
| **Magic Wormhole** | CLI | MIT | Short codes with PAKE encryption |

See the [full comparison](/best-p2p-file-sharing-apps).

## How to check an open-source tool

1. Is the code actually the code that runs? Self-host it, or look for reproducible builds.
2. Look at security documentation and issue history.
3. Read how keys are handled: are they generated on the device?

## FAQ

### Is Relay open source?
Yes, MIT licensed at [github.com/byrishi/Relay](https://github.com/byrishi/Relay).

### Can I self-host Relay?
Yes. It's a single Node.js server. See [self-hosted file sharing](/self-hosted-file-sharing).
