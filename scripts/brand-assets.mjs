/**
 * Regenerates the favicon set, app icons and every link-preview image
 * (public/og/<slug>.png) from the Relay mark, the fonts and content/*.md.
 *
 * Run after adding or renaming an article:
 *   npx -y playwright@1 install chromium   (once)
 *   node scripts/brand-assets.mjs
 *
 * Playwright is not a project dependency, so the build never needs it.
 * The generated images are committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('Playwright is needed: npm i --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const pub = (p) => path.join(root, 'public', p);
const font = (f) => `file://${path.join(root, 'public', 'fonts', f)}`;

// ── The mark: an R on a 5×7 grid plus one pixel leaving its shoulder ─────────
const R = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [4, 1], [0, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3], [0, 4], [2, 4], [0, 5], [3, 5], [0, 6], [4, 6]];
const BLUE = '#1631E0', PALE = '#8FA0FF', PAPER = '#F2F3F7';
const g = 0.14, s = 1 - g;
const cells = (fill) => `<g fill="${fill}">${R.map(([x, y]) => `<rect x="${x + g / 2}" y="${y + g / 2}" width="${s}" height="${s}"/>`).join('')}</g>`;
const packet = `<rect x="${5 + g / 2}" y="${g / 2}" width="${s}" height="${s}" fill="${PALE}"/>`;
const markSvg = (h, fill = '#fff') => `<svg height="${h}" viewBox="0 0 6 7" shape-rendering="crispEdges">${cells(fill)}${packet}</svg>`;

/**
 * Icon tile: ultramarine square, white R. `k` = mark height as a share of the tile.
 * At k ≤ 0.56 the whole mark sits inside the inscribed circle, so Google's
 * round favicon crop and Android's maskable crop never cut it.
 */
const tile = (k, radius = 0) => {
  const h = k * 100, w = (h * 6) / 7, ox = (100 - w) / 2, oy = (100 - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" shape-rendering="crispEdges"><rect width="100" height="100" rx="${radius}" fill="${BLUE}"/><g transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${(h / 7).toFixed(4)})">${cells('#fff')}${packet}</g></svg>`;
};

fs.writeFileSync(pub('favicon.svg'), tile(0.56, 22));

const tmp = path.join((await import('node:os')).tmpdir(), 'relay-brand.html');
const browser = await chromium.launch();
const page = await browser.newPage();
const shot = async (svgOrHtml, w, h, out, isHtml = false) => {
  await page.setViewportSize({ width: w, height: h });
  const html = isHtml ? svgOrHtml : `<html><body style="margin:0"><img src="data:image/svg+xml;base64,${Buffer.from(svgOrHtml).toString('base64')}" width="${w}" height="${h}" style="display:block"></body></html>`;
  // A real file:// page, so the local fonts are allowed to load.
  fs.writeFileSync(tmp, html);
  await page.goto(`file://${tmp}`, { waitUntil: 'load' });
  if (isHtml) await page.waitForSelector('body[data-ready]');
  await page.screenshot({ path: out });
};

fs.mkdirSync(pub('icons'), { recursive: true });
for (const [size, file] of [[48, 'favicon-48.png'], [96, 'favicon-96.png'], [32, 'favicon-32.png'], [16, 'favicon-16.png']]) await shot(tile(0.56), size, size, pub(`icons/${file}`));
await shot(tile(0.56), 192, 192, pub('icons/icon-192.png'));
await shot(tile(0.56), 512, 512, pub('icons/icon-512.png'));
await shot(tile(0.42), 512, 512, pub('icons/icon-maskable-512.png'));
await shot(tile(0.56), 180, 180, pub('icons/apple-touch-icon.png'));
await shot(tile(0.56), 256, 256, pub('favicon.png'));

// favicon.ico with 16, 32 and 48 px images (PNG-compressed ICO)
{
  const imgs = [16, 32, 48].map((n) => [n, fs.readFileSync(pub(`icons/favicon-${n}.png`))]);
  const head = Buffer.alloc(6 + 16 * imgs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
  let off = head.length;
  imgs.forEach(([n, buf], i) => {
    const e = 6 + i * 16;
    head.writeUInt8(n, e); head.writeUInt8(n, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12);
    off += buf.length;
  });
  fs.writeFileSync(pub('favicon.ico'), Buffer.concat([head, ...imgs.map(([, b]) => b)]));
  fs.rmSync(pub('icons/favicon-16.png'));
}

// ── Link previews ───────────────────────────────────────────────────────────
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const og = ({ title, kicker }) => `<!doctype html><html><head><style>
@font-face{font-family:A;src:url(${font('Aujournuit-VariableVF.woff2')})}
@font-face{font-family:G;src:url(${font('ApfelGrotezk-Regular.woff2')});font-weight:400}
@font-face{font-family:G;src:url(${font('ApfelGrotezk-Fett.woff2')});font-weight:700}
body{margin:0;width:1200px;height:630px;overflow:hidden;background:${PAPER};font-family:G}
.sheet{position:absolute;inset:28px;border-radius:36px;background:${BLUE};color:#fff;padding:50px 60px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center}
.logo{display:flex;align-items:center;gap:12px;font-weight:700;font-size:30px;letter-spacing:-.03em}
.k{font-size:24px;color:#D3D9FF}
h1{margin:auto 0 0;font-family:A;font-weight:400;line-height:.92;letter-spacing:-.01em;font-variation-settings:"wdth" 3.4;max-width:1000px}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:34px;font-size:23px;color:#D3D9FF}
.u{background:#fff;color:${BLUE};border-radius:999px;padding:9px 20px}
</style></head><body><div class="sheet"><div class="top"><div class="logo">${markSvg(30)}Relay</div><span class="k">${esc(kicker)}</span></div>
<h1 id="t">${esc(title)}</h1><div class="foot"><span>Free, peer to peer, nothing uploaded</span><span class="u">relay.rishishah.in</span></div></div>
<script>const t=document.getElementById('t');let s=128;t.style.fontSize=s+'px';document.fonts.ready.then(()=>{while((t.scrollHeight>330||t.scrollWidth>1080)&&s>56){s-=4;t.style.fontSize=s+'px';}document.body.dataset.ready='1'})</script></body></html>`;

const front = (file) => {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  const get = (k) => m?.[1].match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1].trim() || '';
  return { h1: get('h1'), title: get('title'), category: get('category') };
};
fs.mkdirSync(pub('og'), { recursive: true });
const jobs = [{ slug: 'index', title: 'Send files straight to another device.', kicker: 'Free file transfer' }, { slug: 'articles', title: 'File sharing, explained.', kicker: 'Guides' }, { slug: 'brand', title: 'Brand kit', kicker: 'Relay' }, { slug: 'verify-identity', title: 'Check Relay for yourself.', kicker: 'Trust' }];
for (const dir of ['articles', 'pages']) {
  for (const f of fs.readdirSync(path.join(root, 'content', dir)).filter((x) => x.endsWith('.md'))) {
    const slug = f.replace(/\.md$/, '');
    if (slug === 'index') continue;
    const d = front(path.join(root, 'content', dir, f));
    jobs.push({ slug, title: d.h1 || d.title, kicker: d.category || 'Relay' });
  }
}
for (const j of jobs) await shot(og(j), 1200, 630, pub(`og/${j.slug}.png`), true);
fs.copyFileSync(pub('og/index.png'), pub('og.png'));

// ── Brand kit downloads (public/brandkit) ──────────────────────────────────────
fs.mkdirSync(pub('brandkit'), { recursive: true });
const mark = (fill, pkt = PALE) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 7" width="600" height="700" shape-rendering="crispEdges">${cells(fill)}<rect x="${5 + g / 2}" y="${g / 2}" width="${s}" height="${s}" fill="${pkt}"/></svg>`;
fs.writeFileSync(pub('brandkit/relay-mark.svg'), mark(BLUE));
fs.writeFileSync(pub('brandkit/relay-mark-white.svg'), mark('#FFFFFF'));
fs.writeFileSync(pub('brandkit/relay-mark-ink.svg'), mark('#0E1233', '#8C90AD'));
fs.writeFileSync(pub('brandkit/relay-app-icon.svg'), tile(0.56, 22));
fs.copyFileSync(pub('icons/icon-512.png'), pub('brandkit/relay-app-icon-512.png'));
const lockup = (fill, word) => `<!doctype html><html><head><style>@font-face{font-family:G;src:url(${font('ApfelGrotezk-Fett.woff2')});font-weight:700}
html,body{margin:0;background:transparent}div{display:inline-flex;align-items:center;gap:56px;padding:40px;font-family:G;font-weight:700;font-size:220px;letter-spacing:-.03em;color:${word}}</style></head>
<body><div id="l">${markSvg(200, fill).replace('<svg ', '<svg style="height:200px" ')}<span>Relay</span></div><script>document.fonts.ready.then(()=>document.body.dataset.ready='1')</script></body></html>`;
for (const [name, fill, word] of [['relay-logo', BLUE, '#0E1233'], ['relay-logo-white', '#FFFFFF', '#FFFFFF']]) {
  fs.writeFileSync(tmp, lockup(fill, word));
  await page.setViewportSize({ width: 1400, height: 400 });
  await page.goto(`file://${tmp}`); await page.waitForSelector('body[data-ready]');
  await page.locator('#l').screenshot({ path: pub(`brand/${name}.png`), omitBackground: true });
}
for (const [name, fill] of [['relay-mark', BLUE], ['relay-mark-white', '#FFFFFF']]) {
  fs.writeFileSync(tmp, `<html><body style="margin:0;background:transparent"><div id="m" style="display:inline-block;padding:0">${mark(fill)}</div></body></html>`);
  await page.setViewportSize({ width: 600, height: 700 });
  await page.goto(`file://${tmp}`);
  await page.locator('#m').screenshot({ path: pub(`brand/${name}.png`), omitBackground: true });
}
await browser.close();

// Shrink the previews: 8-bit palette PNGs are a fraction of the size and look identical here.
try { execFileSync('python3', ['-c', `
import glob
from PIL import Image
for p in glob.glob(${JSON.stringify(pub('og') + '/*.png')}) + [${JSON.stringify(pub('og.png'))}]:
    Image.open(p).convert('RGB').quantize(colors=128, method=Image.Quantize.MEDIANCUT).save(p, optimize=True)
`]); } catch { /* optional */ }
console.log(`icons, favicons and ${jobs.length} link previews written`);
