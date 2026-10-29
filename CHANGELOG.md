# Changelog

All notable changes to Relay are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0]

### Changed

- This repository now contains the open-source core of Relay: the transfer engine, the signaling server, the session hook and a plain reference client. The hosted app's interface and content are maintained separately.
- Licensed under the Apache License 2.0, with a NOTICE file that asks for credit. Earlier versions remain available under MIT.

### Included

- Peer-to-peer transfer over WebRTC with end-to-end encryption, device approval, a safety number, resume, folder transfer and saving straight to disk in Chrome and Edge.
- A signaling server with rate limits, an optional room password, nearby-device discovery and short-lived TURN credentials.
