# Contributing to Relay

Thanks for helping. Bug reports, fixes and new guides are all welcome.

## Getting started

```bash
git clone https://github.com/byrishi/Relay.git
cd Relay
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
- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org) style, for example `fix(transfer): resume after ICE restart` or `docs(content): add a guide for sending RAW photos`.
- Explain what changed and how you tested it. For UI changes, add a screenshot.
- Keep the app accessible: labelled controls, visible focus, enough contrast, and nothing that only works with a mouse.

## Writing guides

Guides live in `content/articles/` as Markdown with front matter. Copy an existing article for the fields. The build fails on broken internal links, duplicate titles and descriptions that are too long, so run `npm run build` before you push.

## Security

Please don't open public issues for security problems. Follow [SECURITY.md](SECURITY.md) instead.

## Images, icons and link previews

Favicons, app icons, the brand-kit files and one link preview per page (`public/og/<slug>.png`) are generated from the mark, the fonts and `content/*.md`. After adding or renaming an article, run:

```sh
npm i --no-save playwright && npx playwright install chromium
node scripts/brand-assets.mjs
```

and commit the changed images. The build itself never needs Playwright.
