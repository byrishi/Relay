# Security Policy

Relay is designed to prioritize data privacy and minimize trust-based infrastructure. This document outlines our security model, reporting guidelines, and known limitations.

## Threat Model & Architecture

### What Relay Addresses
- **Storage-free Architecture**: Relay does not provide central cloud storage. Files transit directly from sender to receiver.
- **End-to-End Encryption**: WebRTC `RTCDataChannel` mandates encryption logic via Datagram Transport Layer Security (DTLS) and Secure Real-time Transport Protocol (SRTP). All data payloads are encrypted natively by your browser before hitting the network interface.
- **Minimal Server Footprint**: The central server (signaling server) is strictly used for WebRTC SDP (Session Description Protocol) handshakes. No file bytes traverse the server unless a TURN relay is mandated by restrictive network topologies. Even in the case of a TURN relay, the payloads remain fully E2EE.

### Out of Scope
Relay is a lightweight consumer tool, **not** a formalized enterprise endpoint suite. 
- It does **not** conceal your IP address from the peer you are connecting with.
- It does **not** provide protections against endpoint (device-level) malware viewing files before they enter the browser sandbox or after they are saved.
- It does **not** protect against malicious peers; if you join a room with an untrusted party, they can send you arbitrary files. Always parse/run received files with caution.

## Reporting a Vulnerability

We take all security considerations seriously. If you discover a bug that bypasses our zero-trust design, undermines WebRTC encryption, or exposes signaling data improperly, please report it.

**Do NOT open a public issue** for a vulnerability. Instead, please report it via one of the following methods:

1. Reach out privately to the repository maintainer.
2. Email the core team using the contact address specified in the repository profile or project website.

Please provide:
- A clear description of the vulnerability.
- Steps to reproduce it.
- A proof-of-concept (PoC) if applicable.

We will try to acknowledge your report within 48-72 hours. 

## Supported Versions

Currently, the `main` branch is the only officially supported and patched version. Please ensure you are running the latest commit before reporting issues that may have been previously patched.

| Version | Supported          |
| ------- | ------------------ |
| Main    | :white_check_mark: |
| Older   | :x:                |

## Security Audits

Relay relies significantly on the cryptographic implementations of modern web browsers (Chrome, Edge, Firefox, Safari) rather than rolling custom crypto, which severely limits the attack surface. 

There are currently no formal third-party audits of the Relay repository itself. Use it carefully based on your personal risk assessment.
