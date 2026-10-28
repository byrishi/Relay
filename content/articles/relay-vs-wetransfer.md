---
title: Relay vs WeTransfer — Free Limits, Privacy and Speed
description: Relay vs WeTransfer compared: free limits (WeTransfer's 3 GB per 30 days), privacy, encryption, speed, and when each one is the better choice.
h1: Relay vs WeTransfer
category: Comparison
date: 2026-05-24
updated: 2026-10-28
order: 40
keywords: relay vs wetransfer, wetransfer comparison, wetransfer free limit, wetransfer vs p2p
related: wetransfer-alternative, best-way-to-send-large-files, relay-vs-google-drive, temporary-file-sharing
---
**WeTransfer uploads your file to its servers and gives the recipient a download link; Relay streams the file straight to the other device and stores nothing.** WeTransfer is better when the recipient will download later. Relay is better for large files, privacy, and when you're both online.

## At a glance

| | Relay | WeTransfer (free) |
|---|---|---|
| How it works | Direct device-to-device (P2P) | Upload to servers, recipient downloads |
| Free limit | None | 10 transfers or 3 GB total per rolling 30 days |
| Link lifetime | Live session | Expires after 3 days |
| Account | Not needed | Required for some features |
| End-to-end encryption | Yes (WebRTC DTLS, verifiable) | No; encrypted in transit and at rest with keys the provider holds |
| Recipient can download later | No, both online | Yes |
| Speed | One trip; LAN speed on same Wi-Fi | Full upload, then full download |
| Open source | Yes | No |
| Price | Free | Free plan; paid plans for more |

_WeTransfer figures from its help center, October 2026._

## Choose Relay when

- the file is bigger than 3 GB, or you send often;
- the content is private and you don't want a copy on anyone's servers;
- you're in the same room or on a call with the recipient;
- you want to move files between your own devices.

## Choose WeTransfer when

- the recipient will download hours later or in another time zone;
- you need to email a link to several people;
- you want a branded or tracked delivery (paid plans).

## FAQ

### Is Relay a free WeTransfer alternative?
Yes. Relay is free with no size or transfer caps, but both people need to be online at the same time. See [WeTransfer alternatives](/wetransfer-alternative).

### Is WeTransfer end-to-end encrypted?
No. Files are encrypted in transit and at rest, but WeTransfer controls the keys and stores the file until it expires.

### Can I send more than 3 GB for free?
With Relay, yes. There is no limit because the file is never stored.
