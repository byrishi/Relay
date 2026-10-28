/**
 * Build step (runs after `vite build`): turns content/*.md into
 *  - dist/<slug>.html     fully rendered page with its own title, meta, canonical, JSON-LD
 *  - dist/<slug>.md       clean markdown copy for AI agents (also /index.md for the home page)
 *  - dist/llms.txt        llmstxt.org index of the site, dist/llms-full.txt with every page
 *  - dist/sitemap.xml     with lastmod dates
 *  - dist/404.html
 * The browser app takes over after load; crawlers and AI tools get real content without JS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseDoc, Doc, SITE } from '../src/content/parse';
import { HOME } from '../src/content/site';
import {
  Head, esc, headForDoc, headForIndex, headForBrand, renderDocPage, renderDocsIndex, renderHomeStatic, renderBrandPage, brandMarkdown, docToMarkdown,
} from '../src/content/render';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--seo:start-->') || !template.includes('<!--app-->')) throw new Error('index.html is missing prerender markers');

const read = (dir: string, kind: 'article' | 'page') =>
  fs.readdirSync(path.join(root, 'content', dir)).filter((f) => f.endsWith('.md')).sort()
    .map((f) => parseDoc(fs.readFileSync(path.join(root, 'content', dir, f), 'utf8'), f.replace(/\.md$/, ''), kind));

const articles = read('articles', 'article');
const allPages = read('pages', 'page');
const homeDoc = allPages.find((p) => p.slug === 'index');
if (!homeDoc) throw new Error('content/pages/index.md missing');
const home: Doc = { ...homeDoc, slug: '', title: HOME.title, h1: HOME.h1, description: HOME.description };
const pages = allPages.filter((p) => p.slug !== 'index');
const bySlug = new Map([...articles, ...pages].map((d) => [d.slug, d]));
const redirects: Record<string, string> = JSON.parse(fs.readFileSync(path.join(root, 'content', 'redirects.json'), 'utf8'));

// ── sanity checks ───────────────────────────────────────────────────────────
const problems: string[] = [];
const known = new Set(['', 'articles', 'verify-identity', 'brand', ...bySlug.keys()]);
for (const d of [home, ...articles, ...pages]) {
  if (!d.description) problems.push(`${d.slug}: missing description`);
  if (d.description.length > 175) problems.push(`${d.slug}: description too long (${d.description.length})`);
  if (`${d.title} | Relay`.length > 75 && d.slug) problems.push(`${d.slug}: title long (${d.title.length + 8})`);
  for (const m of d.body.matchAll(/\]\((\/[^)#\s]*)/g)) {
    const target = m[1].replace(/^\//, '').replace(/\/$/, '');
    if (!known.has(target) && !redirects[target] && !/\.(md|txt|xml|png)$/.test(target)) problems.push(`${d.slug || 'home'}: broken link ${m[1]}`);
  }
  for (const r of d.related) if (!bySlug.has(r)) problems.push(`${d.slug}: unknown related ${r}`);
}
const dupTitles = new Map<string, string>();
for (const d of [...articles, ...pages]) {
  if (dupTitles.has(d.title)) problems.push(`duplicate title: ${d.slug} & ${dupTitles.get(d.title)}`);
  dupTitles.set(d.title, d.slug);
}
if (problems.length) {
  console.error('Content problems:\n  ' + problems.join('\n  '));
  if (process.env.STRICT_CONTENT !== '0') process.exit(1);
}

// Search-console ownership tags, set as environment variables on the host (optional).
const verification = [
  ['google-site-verification', process.env.GOOGLE_SITE_VERIFICATION],
  ['msvalidate.01', process.env.BING_SITE_VERIFICATION],
  ['yandex-verification', process.env.YANDEX_VERIFICATION],
].filter(([, v]) => v).map(([k, v]) => `<meta name="${k}" content="${esc(String(v))}" />`);

// ── HTML pages ──────────────────────────────────────────────────────────────
function page(head: Head, body: string) {
  const tags = [
    `<title>${esc(head.title)}</title>`,
    `<meta name="description" content="${esc(head.description)}" />`,
    `<link rel="canonical" href="${head.canonical}" />`,
    head.markdown ? `<link rel="alternate" type="text/markdown" href="${head.markdown}" />` : '',
    `<meta property="og:type" content="${head.ogType}" />`,
    `<meta property="og:url" content="${head.canonical}" />`,
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta name="twitter:title" content="${esc(head.title)}" />`,
    `<meta name="twitter:description" content="${esc(head.description)}" />`,
    `<meta property="og:image" content="${head.image || SITE.ogImage}" />`,
    `<meta property="og:image:alt" content="${esc(head.imageAlt || head.title)}" />`,
    `<meta name="twitter:image" content="${head.image || SITE.ogImage}" />`,
    ...verification,
    head.noindex ? '<meta name="robots" content="noindex" />' : '',
    ...head.jsonLd.map((o) => `<script type="application/ld+json" data-ld="page">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`),
  ].filter(Boolean).join('\n    ');
  return template
    .replace(/\n\s*<meta property="og:image" [^>]*>/, '')
    .replace(/\n\s*<meta property="og:image:alt" [^>]*>/, '')
    .replace(/\n\s*<meta name="twitter:image" [^>]*>/, '')
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, tags)
    .replace(/<meta name="robots"[^>]*>\n?\s*/, head.noindex ? '' : '$&')
    .replace('<!--app-->', body);
}

const related = (d: Doc) => {
  const picked = d.related.map((s) => bySlug.get(s)).filter((x): x is Doc => !!x && x.kind === 'article');
  for (const a of articles) { if (picked.length >= 4) break; if (a.slug !== d.slug && a.category === d.category && !picked.includes(a)) picked.push(a); }
  return picked.slice(0, 4);
};

const write = (rel: string, content: string) => {
  const p = path.join(dist, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

const featured = ['peer-to-peer-file-sharing', 'secure-file-sharing', 'best-way-to-send-large-files', 'best-p2p-file-sharing-apps'].map((s) => bySlug.get(s)).filter((x): x is Doc => !!x);
write('index.html', page(headForDoc(home), renderHomeStatic(home, featured)));
write('index.md', docToMarkdown(home));
for (const d of [...articles, ...pages]) {
  write(`${d.slug}.html`, page(headForDoc(d), renderDocPage(d, related(d))));
  write(`${d.slug}.md`, docToMarkdown(d));
}
write('articles.html', page(headForIndex(), renderDocsIndex(articles)));
write('articles.md', `# Relay guides\n\n${articles.map((a) => `- [${a.h1}](${SITE.url}/${a.slug}.md): ${a.description}`).join('\n')}\n`);
write('brand.html', page(headForBrand(), renderBrandPage()));
write('brand.md', brandMarkdown());
write('verify-identity.html', page({
  title: 'Verify Relay independently | Relay', description: 'Check what Relay is, who builds it and how it works using independent AI and search tools and the public source code.',
  canonical: `${SITE.url}/verify-identity`, ogType: 'website', jsonLd: [],
}, ''));
write('404.html', page({ title: 'Page not found | Relay', description: 'This page does not exist.', canonical: `${SITE.url}/`, ogType: 'website', jsonLd: [], noindex: true }, ''));

// ── llms.txt (https://llmstxt.org) ──────────────────────────────────────────
const line = (d: Doc) => `- [${d.h1}](${SITE.url}/${d.slug}.md): ${d.description}`;
const cats = [...new Set(articles.map((a) => a.category))];
const llms = `# Relay

> Relay (${SITE.url}) is a free, open-source web app for sending files directly between devices. Files travel peer-to-peer over WebRTC, end-to-end encrypted (DTLS), and are never uploaded to a server. No account, no file size limit, works in any modern browser on Windows, macOS, Linux, Android and iOS. Source: ${SITE.github} (MIT).

Key facts:
- How it works: open ${SITE.url} on both devices, share a room code / QR code (or pick a nearby device), approve the device, and send. The signaling server only introduces the devices.
- Security: WebRTC DTLS encryption; both screens show a safety number to rule out a man-in-the-middle; each new device must be approved; every file must be accepted; optional room password; rate-limited room codes. Details: ${SITE.url}/security.md
- Features: no size limit, save directly to disk (Chrome/Edge), resume interrupted transfers, send folders, paste to send, nearby devices on the same network, installable app with Share to Relay, self-hostable.
- Limits: both devices must be online at the same time; very strict networks need a TURN relay; your peer sees your IP address.
- Built by ${SITE.author.name} (${SITE.author.url}).

## Product
- [Home](${SITE.url}/index.md): What Relay is and how to send a file.
- [Brand kit](${SITE.url}/brand.md): Logo files, colours, type and an approved description of Relay.
${pages.map(line).join('\n')}

${cats.map((c) => `## ${c}\n${articles.filter((a) => a.category === c).sort((a, b) => a.order - b.order).map(line).join('\n')}`).join('\n\n')}

## Optional
- [Full text of every page](${SITE.url}/llms-full.txt)
- [Source code](${SITE.github})
`;
write('llms.txt', llms);
write('llm.txt', llms);
write('llms-full.txt', [docToMarkdown(home), ...pages.map(docToMarkdown), ...articles.map(docToMarkdown)].join('\n\n---\n\n'));

// ── sitemap ─────────────────────────────────────────────────────────────────
const newest = [...articles, ...pages].reduce((m, d) => (d.updated > m ? d.updated : m), home.updated);
const urls: [string, string, string][] = [
  [`${SITE.url}/`, newest, '1.0'],
  [`${SITE.url}/articles`, newest, '0.8'],
  [`${SITE.url}/brand`, newest, '0.4'],
  ...pages.map((d) => [`${SITE.url}/${d.slug}`, d.updated, '0.7'] as [string, string, string]),
  ...articles.map((d) => [`${SITE.url}/${d.slug}`, d.updated, d.order <= 10 ? '0.9' : '0.8'] as [string, string, string]),
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d, p]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(dist, 'redirects.json'), JSON.stringify(redirects));

console.log(`prerendered ${articles.length} articles, ${pages.length} pages, home, index, llms.txt, sitemap (${urls.length} urls)`);
