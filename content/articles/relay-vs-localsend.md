---
title: Relay vs LocalSend — Browser P2P vs Local Network App
description: Relay vs LocalSend: both are free and open source. LocalSend is a native app for your local network; Relay runs in the browser and works across the internet.
h1: Relay vs LocalSend
category: Comparison
date: 2026-10-28
updated: 2026-10-28
order: 45
keywords: relay vs localsend, localsend alternative, localsend over internet, localsend vs browser
related: best-p2p-file-sharing-apps, share-files-on-same-wifi, airdrop-alternative, relay-vs-pairdrop
---
**LocalSend and Relay are both free, open-source ways to send files directly between devices. LocalSend is a native app that works only on your local network (even offline); Relay runs in any browser and works both on the same network and across the internet.**

## Comparison

| | Relay | LocalSend |
|---|---|---|
| Runs as | Web app (installable) | Native app for Windows, macOS, Linux, Android, iOS |
| Install needed | No | Yes, on every device |
| Same network | Yes (Nearby) | Yes |
| Across the internet | Yes (room code, QR) | No |
| Works with no internet at all | No; needs the signaling server | Yes, on a local network |
| Encryption | WebRTC DTLS end to end + safety number | HTTPS, optional PIN |
| Large files | No limit; streams to disk in Chrome/Edge | No limit |
| Resume after drop | Yes | No |
| Folders | Yes | Yes |
| License | MIT | Apache-2.0 |

## Pick LocalSend if

- you mostly share between your own devices at home or in the office;
- you sometimes have no internet connection;
- you're happy installing an app on each device.

## Pick Relay if

- the other person is somewhere else;
- you can't install software (work laptop, borrowed phone);
- you want to verify the encryption with a [safety number](/verify-safety-number), or resume big transfers.

Many people use both: LocalSend at home, Relay for everything else.

## FAQ

### Does LocalSend work over the internet?
No. LocalSend is designed for devices on the same local network. For internet transfers, use a tool like Relay.

### Is Relay or LocalSend faster?
On the same network, both run at local network speed. Relay also works when the devices are on different networks.
