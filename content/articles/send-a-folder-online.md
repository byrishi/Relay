---
title: How to Send a Folder Online (Keep the Folder Structure)
description: Send a whole folder online without zipping it first. The receiver saves it straight into a folder or as a ZIP, with every subfolder intact. Free, no size limit.
h1: How to send a folder online
category: How-to
date: 2026-10-28
updated: 2026-10-28
order: 25
keywords: send a folder online, share folder online, send folder without zipping, transfer folder between computers
related: best-way-to-send-large-files, send-large-video-files, send-files-from-phone-to-pc
---
**With Relay you can send a whole folder, including subfolders, without zipping it first.** The receiver accepts it once and either saves it straight into a folder on their computer or downloads a ZIP with the same structure.

## Steps

1. Connect two devices in [Relay](/).
2. **Drag the folder** onto the page, or click **Send a folder** and choose it.
3. The receiver sees one request, for example *photos · 4 files · 5.5 MB*, and chooses:
   - **Save to folder…** (Chrome and Edge): pick a destination and the folder tree is recreated there as files arrive.
   - **Accept**: files arrive in browser storage; press **Save .zip** to download everything as one ZIP with the original structure.

## Why not zip it yourself?

- Zipping a large folder takes time and doubles the disk space needed.
- Relay streams each file as-is, and it can [resume](/resume-interrupted-file-transfer) if the connection drops.
- ZIPs that Relay builds use "store" mode (no recompression), so creating them is instant even for gigabytes; very large folders use ZIP64 automatically.

## Limits

- Choosing a folder to send needs a desktop browser; most phones only let you pick files.
- Empty folders aren't sent (only files and their paths).

## FAQ

### Can I send a folder without compressing it?
Yes. Relay sends each file in the folder and rebuilds the structure on the other side.

### Is there a size limit for folders?
No. With **Save to folder…** in Chrome or Edge, files go straight to disk.

### Does it keep subfolders?
Yes, every file's relative path is preserved.
