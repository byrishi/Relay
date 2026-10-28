---
title: How Relay Works — Direct, Encrypted P2P File Transfer
description: A plain-language look at how Relay connects two devices and sends files directly between them with WebRTC, end-to-end encryption and no cloud upload.
h1: How Relay works
category: Relay
updated: 2026-10-28
related: how-p2p-file-transfer-works, webrtc-file-transfer, verify-safety-number, turn-vs-stun
---
Relay moves a file from your device to someone else's without storing it anywhere in between. Here is what happens when you press **Start sending**.

## 1. The devices find each other

Both browsers connect to Relay's small signaling server. You share a room code (like `amber-fox-123`), a QR code or an invite link, or you tap a device in the **Nearby** list if you are on the same network. The server's only job is to pass a few connection messages between the two browsers. It never sees your files, file names or messages.

## 2. A direct, encrypted connection

The browsers then open a [WebRTC](/webrtc-file-transfer) connection to each other. They try the most direct route first: straight across your local network, then across the internet using your public addresses (found with [STUN](/turn-vs-stun)). Only if both of those are blocked does the traffic go through a TURN relay, which forwards encrypted packets it cannot read.

Every WebRTC connection is encrypted with **DTLS**. The keys are created on the two devices. To make sure nobody swapped keys in the middle, both screens show a **[safety number](/verify-safety-number)**; if the numbers match, the connection is private end to end.

## 3. You stay in control

- A device that joins your room cannot receive anything until you press **Allow**.
- Every incoming file shows its name and size first; nothing is written until you press **Accept**.
- Rooms can have a password, and room codes cannot be guessed by brute force.

## 4. The file streams across

Relay reads your file in pieces and streams them over the encrypted channel. The receiver writes them straight to disk (Chrome and Edge) or to the browser's private storage. Progress and speed come from what the other device has actually received, so the numbers are honest.

If the connection drops, both sides keep what they have. When the link comes back, the transfer **resumes from the exact byte** where it stopped.

## What Relay does not do

- It does not store your files, so both devices must be online at the same time.
- It does not hide your IP address from the person you connect to.
- It cannot protect files from malware on either device.

Read more about the [security model](/security) or see the [FAQ](/faq).
