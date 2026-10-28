---
title: Private File Transfer — Share Files Without Being Tracked
description: How to transfer files privately: no account, no cloud copy, end-to-end encryption, verified recipient, minimal metadata. What Relay can and can't keep private.
h1: Private file transfer
category: Security
date: 2026-05-24
updated: 2026-10-28
order: 11
keywords: private file transfer, private file sharing, anonymous file transfer, share files privately, confidential file transfer
related: secure-file-sharing, end-to-end-encrypted-file-transfer, send-files-without-uploading, temporary-file-sharing
---
**A private file transfer keeps the content readable only by you and the recipient, leaves no copy on anyone's servers, and collects as little information about you as possible.** Relay is designed around all three.

## What "private" should mean

1. **Nobody else can read it:** end-to-end encryption with keys only on the two devices.
2. **Nobody keeps it:** no upload, no stored copy, nothing to expire.
3. **Nobody profiles you:** no account, no tracking, minimal logs.

## How Relay handles each

- **Content:** WebRTC encrypts everything between the browsers. A [safety number](/verify-safety-number) proves no one is in the middle.
- **Storage:** files stream directly; Relay's servers never store them.
- **Identity:** no account, no email. You appear as a random name like *Violet Fox*. No analytics or ad trackers.
- **Server data:** room codes, device names and connection details live only in memory and disappear when the room ends. See the [privacy policy](/privacy).

## What stays visible

- The person you connect to sees your **IP address**; that's how direct connections work. Use a VPN if that matters, at some cost to speed.
- Relay's server knows two devices connected and when, but not what they sent.
- Your hosting provider and network operator can see that you visited Relay.

## Tips for sensitive files

- Compare the safety number every time.
- Add a room password if the code is shared somewhere public.
- Turn off transfer history on shared computers.
- Close the tab when done.

## FAQ

### Is Relay anonymous?
It doesn't ask who you are, and you appear under a random name. It isn't fully anonymous: your peer sees your IP address, as with any direct connection.

### Does Relay keep logs?
Relay keeps connection data in memory only and writes no logs of it. The hosting provider may keep standard access logs.

### Can I use Relay for confidential work files?
Yes, with the usual care: verify the safety number, and check your organisation's policies.
