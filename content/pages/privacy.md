---
title: Privacy Policy
description: Relay's privacy policy in plain language: no accounts, no file uploads, no tracking. What the signaling server sees, what stays on your device, and for how long.
h1: Privacy policy
category: Relay
updated: 2026-10-28
---
_Last updated: October 28, 2026_

Relay is built to collect as little as possible. This policy covers the hosted app at relay.rishishah.in. If you self-host Relay, your own policy applies.

## What we do not collect

- **Your files.** Files go directly from one browser to another over an encrypted WebRTC connection. They never pass through or rest on our servers.
- **Your identity.** There are no accounts. We never ask for your name, email or phone number.
- **Your messages and clipboard.** Text you send in Relay travels inside the same encrypted connection as files.
- **Analytics or ads.** Relay has no tracking scripts, analytics cookies or advertising.

## What the signaling server handles

To connect two devices, the signaling server briefly handles:

- the **room code** and optional room password (stored only as a salted hash),
- the **device name** you appear as (a random name such as *Violet Fox · Mac*),
- your **IP address** and the WebRTC connection details (SDP and ICE candidates), which include IP addresses and encryption certificate fingerprints.

All of this lives in memory only. Rooms disappear when everyone leaves, or after 24 hours at most. Rate limiting keeps IP addresses in memory for up to 10 minutes. Nearby-device discovery groups devices by a one-way hash of their public IP address, also only in memory. Relay itself writes no logs of this data. Our hosting provider may keep standard access logs.

## Third parties

- **STUN servers** (Google and Cloudflare) help your browser learn its public address. They see your IP address but no files.
- **TURN relay**, when a direct connection is impossible, forwards encrypted packets it cannot read.
- **AI and search links** in the footer only open those services if you click them.

## What stays on your device

Relay stores a few things in your own browser, never on our servers:

- a random device name and a per-tab device ID,
- your **transfer history** (file names, sizes, speeds and dates, never contents), which you can switch off or clear at any time,
- received files in the browser's private storage until you save them; leftovers are deleted automatically after six hours.

## Your choices

You can clear history from the transfer screen, clear site data in your browser to remove everything Relay stored, or self-host Relay to keep even the signaling server under your control.

## Contact

Questions about privacy: contact the maintainer via [rishishah.in](https://rishishah.in).
