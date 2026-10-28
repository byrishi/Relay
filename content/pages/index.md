---
title: "Relay: Free File Transfer, No Upload, No Size Limit"
description: Free file transfer in your browser. Send files of any size straight to another device, peer to peer and encrypted end to end. No upload, no account, no limits.
h1: Free file transfer: send files straight to another device.
updated: 2026-10-28
---
## What is Relay?

Relay is a free, open-source web app that sends files **directly from one device to another**. Open it on both devices, connect them with a room code, a QR code or the nearby-devices list, and drop a file. The file streams peer-to-peer over WebRTC and is encrypted end to end. It is never uploaded to a server, so there is no file size limit, no account and nothing left behind in the cloud.

It works in any modern browser: Chrome, Edge, Firefox and Safari, on Windows, macOS, Linux, Android, iPhone and iPad.

## How to send a file

1. Open [relay.rishishah.in](/) and press **Start sending**. You get a code like `satya-ganga-108` and a QR code.
2. On the other device, open Relay and type the code or scan the QR. On the same Wi-Fi, just tap the device under **Nearby**.
3. Approve the device, drop your files, folders or a screenshot, and the other side presses **Accept**.

## Free file transfer, without the usual catch

Most free file transfer sites upload your file to their servers, so they have to limit it: WeTransfer allows 3 GB per 30 days, Filemail 5 GB per transfer, and links expire after a few days. Relay never uploads anything. The file goes from your device to theirs while both are open, so there is nothing to store, nothing to cap and nothing to expire. Compare the options in [the best free file transfer sites](/best-free-file-transfer-sites).

## Why people use it

- **No size limit.** Files go device to device. On Chrome and Edge they stream straight to the folder you pick.
- **Private by design.** No upload, no account, no tracking. Our server only introduces the two devices.
- **Verifiable encryption.** Both screens show a safety number. If they match, nobody is in the middle, not even us. See [how Relay keeps transfers secure](/security).
- **Survives bad Wi-Fi.** If the connection drops, the transfer resumes from the exact byte where it stopped.
- **Folders, paste and share.** Send whole folders, paste screenshots with Ctrl/⌘+V, or install Relay and use *Share to Relay* on Android.
- **Open source.** Read, audit or self-host the code on [GitHub](https://github.com/byrishi/Relay).

## FAQ

### Is Relay really free?
Yes. Relay is free and open source under the MIT license. There are no paid plans, no transfer caps and no ads.

### Do files go through your servers?
No. Files travel directly between the two browsers over an encrypted WebRTC connection. The server only helps the devices find each other. If a network is too strict for a direct connection, a TURN relay can forward the still-encrypted data.

### Is there a file size limit?
Relay sets no limit. In Chrome and Edge on desktop, files stream straight to disk, so even 100 GB works. Other browsers keep the file in browser storage until you press Save, which is limited by free disk space.

### How can Relay be free?
Relay never stores or forwards your files, so it costs very little to run: the server only introduces the two devices. There is no paid plan to upsell.

### Does it work between iPhone and Android, or Mac and Windows?
Yes. Relay runs in the browser, so any two devices work together: iPhone to Windows, Android to Mac, Linux to anything. See [iPhone and Android](/send-files-from-iphone-to-android) and [Mac and Windows](/transfer-files-between-mac-and-windows).

### Do I need to install anything?
No. Relay runs in the browser. You can optionally install it as an app from the browser menu.
