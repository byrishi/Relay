# Changelog

All notable changes to Relay are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Entry screen on the home page: the mark assembles, and visitors enter with sound on (the default) or off. Skipped for room links, guides and crawlers.
- A shared soundtrack player: the Sound key in the header, a one-time invitation on guide pages, and lock-screen controls.
- Eleven new guides: best free file transfer sites, file size limits, emailing large files, large WhatsApp videos, SHAREit and Xender alternatives, Quick Share alternatives, Mac and Windows, two computers, sending without signing up, whether WeTransfer is safe, and a glossary.
- Brand kit at /brand with logo, mark and app icon downloads, colours, type, usage and an approved description.
- A link preview image for every page, a favicon set that survives round crops in search results, richer structured data, an "On this page" list on long guides, IndexNow submission after deploys, and optional search-console verification tags.

- Optional soundtrack, “Relay — Straight” and “Relay — Across” by Thepla Theorist and Rishi Shah, behind a Sound key in the header. Off by default, nothing downloads until it is turned on, and it streams from jsDelivr so it does not use the host's bandwidth.
- Room codes and device names made from Sanskrit words found in the Vedas, Upanishads and the Gita.

### Changed

- New design: cool paper and a single ultramarine. The working app is the home page's hero, drawn as one ultramarine sheet with Send and Receive side by side; the waiting room and the connected screen use the same sheet. Display type is Aujournuit on a variable width axis, text is Apfel Grotezk, and Departure Mono is kept for room codes and safety numbers.
- New pixel R logo, favicon, app icons and link preview.
- QR codes redrawn in the same pixel language; they still use error correction level H.
- Guides and content pages rebuilt on the same grid with a metadata column.
- A cursor for mouse and trackpad that wraps buttons and links in their own shape, plus headline reveals, smooth FAQ answers, and smooth scrolling, all off when the system asks for reduced motion.

### Removed

- The Dark and Light designs, the design switch and the `?design=` parameter, the WebGL background, and the Inter and Geist font packages.

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
- Two designs, Dark and Light, with a switch in the header and a `?design=` link parameter.
- Dockerfile, Render blueprint and CI.

### Changed

- Transfer engine rewritten: speed and progress come from receiver acknowledgements, files are sent one at a time per device, and flow control respects the browser's buffers.
- New interface with the app shown in a window on the home page, reworked for phones (larger touch targets, phone-first layouts for the waiting room, comparison and connected screens).
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
