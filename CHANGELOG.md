# Changelog

All notable changes to Relay are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-10-28

### Added

- Device approval before anything is sent, and an explicit accept for every incoming file.
- Safety number from both DTLS fingerprints, to rule out a man-in-the-middle.
- Resume an interrupted transfer from the exact byte.
- Save straight to disk or into a folder (File System Access API); send whole folders and save them as a ZIP (ZIP64).
- Nearby-device discovery and invites on the same network.
- Optional room passwords.
- Pick files before the other device joins; they are sent as soon as it is approved.
- Paste to send, clipboard sync (beta), live speed graph and local history.
- Installable PWA with a share target.
- Prerendered pages, 33 guides, `llms.txt` and a Markdown copy of every page.
- Branded QR codes with the Relay mark.
- Dockerfile, Render blueprint and CI.

### Changed

- Transfer engine rewritten: speed and progress come from receiver acknowledgements, files are sent one at a time per device, and flow control respects the browser's buffers.
- New dark interface, with the app shown in a window on the home page.
- Logo redrawn in the brand gradient from the original line-drawn R.

### Security

- Signaling messages are scoped to members of the same room and size-capped.
- Rate limits work behind a proxy; wrong room-code guesses are limited per IP.
- Short-lived TURN credentials and a strict Content Security Policy in production.
- Inaccurate encryption claims removed from the documentation. See [SECURITY.md](SECURITY.md).

### Removed

- Unused dependencies and leftover AI Studio configuration.

## [1.0.0] - 2026-05-29

- First public release.

[2.0.0]: https://github.com/byrishi/Relay/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/byrishi/Relay/releases/tag/v1.0.0
