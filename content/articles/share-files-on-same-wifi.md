---
title: Share Files Between Devices on the Same Wi-Fi (No Code)
description: Send files between devices on the same Wi-Fi instantly: they appear under Nearby in Relay, no code or app needed. How it works, privacy, and when it falls back to codes.
h1: Share files between devices on the same Wi-Fi
category: How-to
date: 2026-10-28
updated: 2026-10-28
order: 23
keywords: share files on same wifi, transfer files over wifi, local network file sharing, send files over lan, nearby share
related: airdrop-alternative, relay-vs-localsend, send-files-from-phone-to-pc, how-p2p-file-transfer-works
---
**On the same Wi-Fi, devices running Relay find each other automatically under Nearby. Tap one, accept on the other, and send: no code and no app.** The file travels across your local network, so it's as fast as your Wi-Fi allows and never touches the internet.

## Steps

1. Open [relay.rishishah.in](/) on both devices.
2. Under **Nearby** you'll see the other device's random name, like *Violet Fox · Mac*.
3. Tap it. The other device gets an invitation; tap **Connect**.
4. Drop files, folders or a pasted screenshot.

## How Relay knows a device is "nearby"

Devices that reach the internet from the same public address (your router) are grouped together. Relay's server only keeps a one-way hash of that address, in memory, while the page is open. Once connected, the transfer goes over your local network directly. The connection badge shows **Direct · Local network**.

## When Nearby doesn't show a device

- **Guest or mesh networks** sometimes give devices different public addresses.
- **Mobile data or a VPN** on one device puts it on a different network.
- **Office networks** may block device-to-device traffic.

In those cases, press **Start sending** and use the code or QR instead.

## FAQ

### Can strangers on the same Wi-Fi see my device?
They can see your random device name while Relay is open. They can't connect without you accepting the invitation, and can't send you anything you don't accept.

### Does same-Wi-Fi sharing work without internet?
Relay needs internet to introduce the devices, even on the same network. For fully offline local sharing, LocalSend is a good option.

### Is local network transfer faster?
Yes. Data stays on your network, so speed is limited by your Wi-Fi or Ethernet, not your internet plan.
