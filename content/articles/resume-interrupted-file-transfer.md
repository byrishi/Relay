---
title: Resume an Interrupted File Transfer (No Starting Over)
description: Wi-Fi dropped at 80%? Relay resumes interrupted transfers from the exact byte where they stopped. How resume works, how long it waits, and tips for long transfers.
h1: Resume an interrupted file transfer
category: How-to
date: 2026-10-28
updated: 2026-10-28
order: 24
keywords: resume file transfer, interrupted file transfer, file transfer failed, continue download, resume large file transfer
related: best-way-to-send-large-files, send-large-video-files, how-p2p-file-transfer-works
---
**If the connection drops in the middle of a Relay transfer, you don't start over. Both sides keep what they have, and when the link comes back the transfer continues from the exact byte where it stopped.**

## What you'll see

1. The transfer card turns yellow: **connection lost · will resume**.
2. Relay reconnects automatically, usually within seconds once the network is back.
3. The progress bar continues from where it was, and the finished file is byte-for-byte identical.

There's nothing to click.

## How it works

- The receiver writes data to disk as it arrives and keeps the partial file when the link drops.
- After reconnecting, the sender offers the same file again. The receiver answers with how many bytes it already has.
- The sender skips straight to that position and streams only the rest.

## Limits

- **Keep both tabs open.** The partial file lives in the receiving browser, and the sender needs the original file.
- **About 10 minutes.** If the devices can't reconnect within roughly ten minutes, the transfer is marked as failed.
- **Same transfer only.** Resuming works for the transfer that was interrupted, not for a file sent again later from a new room.

## Tips for long transfers

- Turn off sleep on both devices and keep phones plugged in with the screen on.
- Prefer the same network or Ethernet for very large files.
- Use **Save as…** in Chrome or Edge so huge files stream straight to disk.

## FAQ

### Do I need to do anything to resume?
No. Relay reconnects and resumes automatically.

### Will a resumed file be corrupted?
No. Relay checks the size on completion, and the data is delivered in order over an encrypted, reliable channel.

### What if I close the tab by accident?
Then the partial file is discarded and you'll need to send it again.
