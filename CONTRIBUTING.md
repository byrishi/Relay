# Contributing to Relay

Thanks for helping. Bug reports and fixes are welcome.

## Getting started

```bash
git clone https://github.com/byrishi/relay.git
cd relay
npm install
npm run dev          # http://localhost:3000
```

Use Node.js 22 (see `.nvmrc`). Before opening a pull request, make sure both of these pass:

```bash
npm run typecheck
npm run build
```

## Pull requests

- Branch from `main` and keep each pull request to one change.
- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org) style, for example `fix(transfer): resume after ICE restart`.
- Explain what changed and how you tested it. Transfers are easiest to test with two browser windows on one machine.
- Keep the reference client accessible: labelled controls, visible focus, enough contrast, and nothing that only works with a mouse.

## Scope

This repository is the transfer engine, the signaling server and a plain reference client. Visual design for the hosted app is kept elsewhere, so changes that restyle the reference client are unlikely to be merged.

## Security

Please don't open public issues for security problems. Follow [SECURITY.md](SECURITY.md) instead.
