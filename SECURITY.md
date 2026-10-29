# Security

Relay sends files directly between browsers over WebRTC. This document describes what is
protected, what is not, and the results of the October 2026 review of the codebase.

## What protects your files

| Layer | What it does |
|---|---|
| **WebRTC DTLS** | Every byte (files, messages, clipboard) is encrypted between the two browsers with keys created on the devices. The cipher suite is negotiated by the browsers (typically AES-128-GCM or ChaCha20-Poly1305) — Relay does not choose it. |
| **Safety number** | Both screens show a number derived from both devices' DTLS certificate fingerprints. If it matches, nobody — including the Relay server — is in the middle. |
| **Device approval** | A device that joins your room cannot receive anything until you press *Allow*. Blocked devices are disconnected. |
| **Accept / decline** | Nothing is written to your device until you accept the file. |
| **Room codes** | ~54 million readable codes (`adjective-noun-123`). Wrong guesses are limited to 12 per IP per 10 minutes, after which even correct codes are refused. Optional room password (scrypt-hashed, in memory). |
| **Room-scoped signaling** | The server only relays connection setup between members of the same room. |
| **TURN** | If a relay is needed, it only forwards encrypted packets. Credentials are issued for 6 hours by the server (`TURN_SECRET`) instead of being shipped in the app. |
| **HTTP hardening** | Content-Security-Policy (no third-party scripts, no framing), `nosniff`, HSTS etc. via Helmet. Only `/api` is rate limited, so normal page loads are never blocked. |

## What the server sees

The signaling server sees: the room code, the device name you appear as, your IP address,
and the WebRTC connection setup (SDP), which includes your IP addresses and certificate
fingerprints. It never sees file names, file contents, messages or clipboard text — those
travel inside the encrypted peer-to-peer channel. All server state is in memory; nothing is
written to disk and nothing is logged by Relay. Your hosting provider may keep access logs.

Because the server relays the certificate fingerprints, a **malicious or compromised server
could attempt a man-in-the-middle attack**. That is the reason for the safety number: if the
numbers on both devices match, the attack did not happen.

## Out of scope

- Your peer learns your IP address (that is how a direct connection works).
- Malware on either device can read files before or after transfer.
- A peer you approve can send you any file — open received files with care.
- If you skip the safety-number check, you are trusting the server operator.

## Review — October 2026

Issues found and fixed:

| Severity | Issue | Fix |
|---|---|---|
| High | Room codes (6 hex chars) could be brute-forced: join attempts were unlimited, and a joiner was silently connected and received every file sent afterwards. | Wrong-guess rate limit; host must approve each device; files need the receiver's acceptance; optional password. |
| High | Nothing let users detect a man-in-the-middle by the signaling server, yet the site claimed "we couldn't look at your data even if we tried". | Safety number from both DTLS fingerprints; copy corrected. |
| High (availability) | Behind any hosting proxy every visitor shares the proxy's IP, so the 20-connections/minute and 100-requests/15-minutes limits (which also counted CSS, JS and fonts) would have locked out all users. | `trust proxy` support; limits keyed to the real client IP; static files never rate limited. |
| Medium | Any connected client could send signaling messages to any socket ID, not just members of its own room. | Signaling restricted to the same room; 64 KB size cap. |
| Medium | Incoming files were written to browser storage automatically. | Accept / decline before any byte is sent. |
| Medium | Static TURN credentials would have been embedded in the public JavaScript bundle. | Short-lived credentials from `/api/turn`. |
| Low | No Content-Security-Policy. | CSP in production. |
| Low | Received byte counts were trusted; a peer could send more data than it announced. | Size enforced; transfers verified on completion. |
| Low | Connection-limit map grew forever (one entry per IP). | Pruned every minute. |
| Copy | "AES-256-GCM", "military-grade", "SRTP" for data channels, "encrypted SDP", "mathematically impossible" to intercept. | Replaced with accurate statements. |

Remaining notes:

- The footer loads brand icons from the Iconify API at runtime, which exposes visitors' IP
  addresses to that third party. Bundling the three icons locally would remove this.
- There has been no third-party audit. The cryptography is the browsers' own WebRTC stack.

## Reporting a vulnerability

Please do **not** open a public issue. Contact the maintainer privately (see the repository
profile or https://rishishah.in) with a description, reproduction steps and, if possible,
a proof of concept. We aim to respond within 72 hours. Only the latest `main` is supported.
