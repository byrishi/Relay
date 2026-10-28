---
title: How to Transfer Files Between Mac and Windows (No Cable)
description: Move files between a Mac and a Windows PC without a USB drive or cloud upload: a browser-to-browser transfer, network sharing, or cloud storage. Step by step.
h1: Transfer files between Mac and Windows
category: How-to
date: 2026-10-28
updated: 2026-10-28
order: 28
keywords: transfer files mac to windows, mac to pc file transfer, windows to mac file transfer, share files between mac and windows, airdrop to windows
related: transfer-files-between-two-computers, airdrop-alternative, send-a-folder-online, share-files-on-same-wifi
---
**The quickest way is a browser-to-browser transfer: open Relay on both computers, connect them, and drop the files.** There is no AirDrop for Windows, but a browser works the same on both systems, needs no installs or accounts, and has no size limit. For a permanent link between them, set up a shared folder on your network.

## Option 1: browser to browser (fastest to set up)

1. On the Mac, open [relay.rishishah.in](/) in Safari or Chrome and press **Start sending**.
2. On the Windows PC, open the same site. On the same Wi-Fi, the Mac shows up under **Nearby**; otherwise type the room code.
3. Approve the PC, then drop files or a whole folder on the Mac.
4. On Windows, press **Accept**. In Chrome or Edge you can choose a folder and big files are written straight to disk.

Works the other way round too. Folder structure is kept. See [how to send a folder](/send-a-folder-online).

## Option 2: a shared folder on your network

Good if you move files between the same two computers every day.

**Share a Mac folder with Windows**
1. On the Mac: System Settings › General › Sharing › turn on **File Sharing**.
2. Under Options, turn on **SMB** and tick your user account.
3. On Windows, open File Explorer and type `\\` followed by the Mac's IP address shown in Sharing.

**Share a Windows folder with a Mac**
1. On Windows, right-click a folder › Properties › Sharing › **Share**.
2. On the Mac, Finder › Go › **Connect to Server** and enter `smb://` followed by the PC's name or IP.

This takes ten minutes to set up and needs both computers on the same network.

## Option 3: cloud storage

OneDrive, Google Drive, Dropbox and iCloud for Windows all run on both systems. Good when you also want a backup. The files are uploaded first, so large files take twice as long (up, then down) and count against your storage.

## Which to choose

| Situation | Best option |
|---|---|
| One-off transfer, any size | Browser to browser |
| Same two computers every day | Shared network folder |
| You also want a backup | Cloud storage |
| Work laptop where you can't install anything | Browser to browser |

## FAQ

### Is there AirDrop for Windows?
No. Apple has not made AirDrop for Windows. A browser tool like Relay gives a similar experience: nearby devices show up and you tap to send. See [AirDrop alternatives](/airdrop-alternative).

### How do I transfer large files from Mac to PC?
With Relay there is no size limit. Use Chrome or Edge on the PC so the file is written straight to disk as it arrives.

### Do both computers need to be on the same Wi-Fi?
Not for Relay: it works across networks with a room code. Network file sharing does need the same network.
