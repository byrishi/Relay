---
title: File Transfer Glossary — P2P, WebRTC, E2EE, TURN Explained
description: Plain-English definitions of the terms behind file sharing: peer to peer, WebRTC, end-to-end encryption, DTLS, signaling, NAT, STUN, TURN, safety numbers and more.
h1: File transfer glossary
category: Explainer
date: 2026-10-28
updated: 2026-10-28
order: 33
keywords: file transfer terms, what is p2p, what is webrtc, what is end to end encryption, what is a turn server, what is signaling, file sharing glossary
related: how-p2p-file-transfer-works, turn-vs-stun, webrtc-security, end-to-end-encrypted-file-transfer
---
**A short, plain-English reference for the words that come up when you send files online.** Each entry says what the term means and why it matters when you choose a tool.

## Peer to peer (P2P)
Two devices exchange data directly instead of through a server that stores it. In file transfer, P2P means the file goes from the sender's device to the receiver's without being uploaded first. More: [peer-to-peer file sharing](/peer-to-peer-file-sharing).

## Cloud transfer
The sender uploads the file to a company's server and the receiver downloads it later from a link. WeTransfer, Google Drive and Dropbox work this way. The upside is that the receiver doesn't need to be online at the same time; the downside is a size cap and a stored copy.

## WebRTC
A technology built into every modern browser for real-time connections between devices. It powers video calls and lets browser apps like Relay send files directly with nothing installed. More: [WebRTC file transfer](/webrtc-file-transfer).

## End-to-end encryption (E2EE)
Data is encrypted on the sending device and can only be decrypted on the receiving device. Nobody in between, including the service that runs the app, holds the keys. Contrast with "encrypted in transit" and "encrypted at rest", where the company can still read your data. More: [end-to-end encrypted file transfer](/end-to-end-encrypted-file-transfer).

## Encryption in transit
Data is encrypted between your device and the company's server (usually TLS, the padlock in the address bar). It protects against eavesdroppers on your Wi-Fi but not against the company itself.

## Encryption at rest
Stored files are encrypted on the company's disks. It protects against stolen hardware, not against the company, which holds the keys.

## DTLS
Datagram Transport Layer Security: the version of TLS that WebRTC uses to encrypt every connection. In a direct transfer, the keys are created on the two devices.

## Signaling
The step where two devices exchange the small messages they need to find each other and agree on a connection. A signaling server passes these messages; in Relay it never sees the files.

## NAT
Network Address Translation: how a home router lets many devices share one public internet address. It's the reason two devices can't simply dial each other, and why P2P apps need STUN.

## STUN
A small server that tells a device what its public address looks like from the internet, so two devices behind routers can find a direct path. More: [TURN vs STUN](/turn-vs-stun).

## TURN
A relay server used when a direct path is impossible, for example on strict office networks. It forwards the data, which stays end-to-end encrypted, so the relay can't read it.

## Safety number
A number derived from both devices' encryption keys and shown on both screens. If the numbers match, nobody is intercepting the connection. More: [verify a safety number](/verify-safety-number).

## Man-in-the-middle (MITM)
An attacker who secretly sits between two devices and relays, reads or alters what they send. Comparing safety numbers rules this out.

## Resumable transfer
A transfer that continues from where it stopped after the connection drops, instead of starting over. More: [resume an interrupted transfer](/resume-interrupted-file-transfer).

## Checksum
A short fingerprint of a file, used to check that what arrived is exactly what was sent.

## Room code
A short, temporary code that puts two devices in the same session. In Relay it looks like `satya-ganga-108`: two Sanskrit words and a number.

## FAQ

### What is the difference between P2P and cloud file transfer?
P2P sends the file directly between devices while both are online. Cloud transfer uploads it to a server first, so the receiver can download it later.

### Is WebRTC encrypted?
Yes. WebRTC always encrypts its connections with DTLS and SRTP; unencrypted WebRTC isn't allowed. See [WebRTC security](/webrtc-security).
