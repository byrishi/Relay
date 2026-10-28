/**
 * HTML + metadata builders shared by the browser (article pages) and the prerender
 * script, so crawlers and users get exactly the same markup.
 */
import { Doc, SITE, renderMarkdown, urlFor, slugify, stripMd } from './parse';

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export interface Head {
  title: string;
  description: string;
  canonical: string;
  ogType: 'website' | 'article';
  image?: string;             // absolute URL of the 1200×630 link preview
  imageAlt?: string;
  markdown?: string;          // path of the .md alternate
  jsonLd: object[];
  noindex?: boolean;
}

// ── JSON-LD ──────────────────────────────────────────────────────────────────
const person = { '@type': 'Person', '@id': `${SITE.url}/#author`, name: SITE.author.name, url: SITE.author.url, sameAs: SITE.author.sameAs };
const org = {
  '@type': 'Organization',
  '@id': `${SITE.url}/#org`,
  name: SITE.name,
  url: SITE.url + '/',
  logo: { '@type': 'ImageObject', url: `${SITE.url}/icons/icon-512.png`, width: 512, height: 512 },
  image: SITE.ogImage,
  sameAs: [SITE.github],
  founder: { '@id': `${SITE.url}/#author` },
};
export const ogFor = (slug: string) => `${SITE.url}/og/${slug || 'index'}.png`;

export function appJsonLd(): object[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${SITE.url}/#app`,
      name: 'Relay',
      alternateName: 'Relay P2P File Transfer',
      url: SITE.url + '/',
      description: 'Relay sends files directly between devices in the browser: peer-to-peer, end-to-end encrypted with WebRTC, no account, no upload, no size limit. Free and open source.',
      applicationCategory: 'UtilitiesApplication',
      applicationSubCategory: 'File transfer',
      operatingSystem: 'Any (web browser): Windows, macOS, Linux, Android, iOS, ChromeOS',
      browserRequirements: 'Requires a modern browser with WebRTC (Chrome, Edge, Firefox, Safari).',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: 'https://opensource.org/licenses/MIT',
      codeRepository: SITE.github,
      featureList: [
        'Peer-to-peer file transfer over WebRTC',
        'End-to-end encryption (DTLS) with a safety number to verify the connection',
        'No account, no cloud upload, no file size limit',
        'Accept or decline every incoming file',
        'Save directly to disk (Chrome and Edge)',
        'Resume interrupted transfers',
        'Send whole folders',
        'Nearby devices on the same network',
        'Room codes, QR codes and optional room passwords',
        'Installable app with Share to Relay',
      ],
      screenshot: SITE.ogImage,
      image: SITE.ogImage,
      inLanguage: 'en',
      author: { '@id': `${SITE.url}/#author` },
      publisher: { '@id': `${SITE.url}/#org` },
    },
    { '@context': 'https://schema.org', ...org },
    { '@context': 'https://schema.org', ...person },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE.url}/#site`,
      name: SITE.name,
      url: SITE.url + '/',
      publisher: { '@id': `${SITE.url}/#org` },
      inLanguage: 'en',
      description: 'Free, open-source, peer-to-peer file transfer in the browser.',
    },
  ];
}

function faqLd(doc: Doc) {
  if (!doc.faq.length) return [];
  return [{
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: doc.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }];
}

function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

export function headForDoc(doc: Doc): Head {
  const url = urlFor(doc.slug);
  if (!doc.slug) {
    return {
      title: doc.title, description: doc.description, canonical: url, ogType: 'website', markdown: '/index.md', image: ogFor(''), imageAlt: 'Relay: send files straight to another device',
      jsonLd: [...appJsonLd(), ...faqLd(doc)],
    };
  }
  const crumbs = doc.kind === 'article'
    ? [{ name: 'Relay', url: SITE.url + '/' }, { name: 'Guides', url: `${SITE.url}/articles` }, { name: doc.h1, url }]
    : [{ name: 'Relay', url: SITE.url + '/' }, { name: doc.h1, url }];
  const ld: object[] = [breadcrumbs(crumbs), ...faqLd(doc)];
  if (doc.kind === 'article') {
    ld.unshift({
      '@context': 'https://schema.org',
      '@type': doc.category === 'How-to' ? 'TechArticle' : 'Article',
      headline: doc.h1,
      description: doc.description,
      url,
      mainEntityOfPage: url,
      datePublished: doc.date,
      dateModified: doc.updated,
      image: ogFor(doc.slug),
      inLanguage: 'en',
      wordCount: doc.body.split(/\s+/).length,
      keywords: doc.keywords.join(', '),
      articleSection: doc.category,
      author: { '@type': 'Person', '@id': `${SITE.url}/#author`, name: SITE.author.name, url: SITE.author.url },
      publisher: { '@id': `${SITE.url}/#org`, '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: `${SITE.url}/icons/icon-512.png` } },
      about: { '@id': `${SITE.url}/#app` },
    });
  }
  return { title: `${doc.title} | Relay`, description: doc.description, canonical: url, ogType: doc.kind === 'article' ? 'article' : 'website', markdown: `/${doc.slug}.md`, image: ogFor(doc.slug), imageAlt: doc.h1, jsonLd: ld };
}

export function headForIndex(): Head {
  return {
    title: 'Guides: P2P file sharing, secure transfer & large files | Relay',
    description: 'Guides and honest comparisons on peer-to-peer file sharing, secure and encrypted file transfer, sending large files, and alternatives to WeTransfer, AirDrop and more.',
    canonical: `${SITE.url}/articles`,
    ogType: 'website',
    markdown: '/articles.md',
    image: ogFor('articles'),
    imageAlt: 'Relay guides: file sharing, explained',
    jsonLd: [breadcrumbs([{ name: 'Relay', url: SITE.url + '/' }, { name: 'Guides', url: `${SITE.url}/articles` }])],
  };
}

// ── Markup ───────────────────────────────────────────────────────────────────
const PROSE = [
  'prose max-w-none text-[17.5px]',
  'prose-headings:font-medium prose-headings:text-ink prose-headings:tracking-[-0.02em]',
  'prose-h2:text-[32px] prose-h2:leading-[1.1] prose-h2:mt-16 prose-h2:mb-5  prose-h3:text-[21px] prose-h3:mt-10',
  'prose-p:text-ink-2 prose-p:leading-[1.7] prose-li:text-ink-2 prose-li:leading-[1.7] prose-strong:text-ink prose-strong:font-medium prose-li:marker:text-signal',
  'prose-a:text-ink prose-a:font-normal prose-a:underline prose-a:decoration-line-2 prose-a:underline-offset-4 hover:prose-a:decoration-signal',
  'prose-code:font-mono prose-code:text-ink prose-code:bg-bg-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:text-[.88em] prose-code:before:content-none prose-code:after:content-none',
  'prose-pre:bg-ink prose-pre:text-bg prose-pre:rounded-2xl',
  'prose-th:text-ink prose-th:font-medium prose-td:text-ink-2 prose-table:text-[15.5px] prose-thead:border-line-2 prose-tr:border-line',
  'prose-blockquote:border-l-signal prose-blockquote:border-l-4 prose-blockquote:text-ink prose-blockquote:not-italic prose-blockquote:font-normal',
  'prose-hr:border-line',
].join(' ');

const W = (w: number) => `style="--w:${w}"`;
const item = (d: Doc, kicker = '') => `<a href="/${d.slug}" data-internal="true" data-cursor="Read" class="group block py-6 border-t border-line transition-[padding] duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:pl-3">${kicker ? `<span class="block text-[14px] text-signal mb-1.5">${esc(kicker)}</span>` : ''}<span class="block text-ink text-[21px] font-medium leading-snug group-hover:text-signal transition-colors">${esc(d.h1)}</span><span class="block text-ink-2 text-[16px] mt-2 leading-relaxed max-w-[56ch]">${esc(d.description)}</span></a>`;

function relatedHtml(related: Doc[]) {
  if (!related.length) return '';
  return `<nav aria-label="Related guides" class="mt-24"><div class="flex items-baseline justify-between"><h2 class="display text-[40px] md:text-[48px]" ${W(3.5)}>Keep reading</h2><a href="/articles" data-internal="true" class="link text-ink-2 text-[15px]">All guides</a></div>
<div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-10">${related.map((d) => item(d, d.category)).join('')}</div></nav>`;
}

const ctaHtml = `<aside aria-label="Try Relay" class="mt-20 rounded-[28px] bg-signal text-white p-7 md:p-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
<div><p class="display text-[44px] md:text-[60px] m-0" ${W(3.4)}>Send a file now.</p><p class="text-dev-fg-2 mt-3 mb-0">Free and open source. No account, no upload, encrypted end to end.</p></div>
<a href="/" data-internal="true" class="key key-signal shrink-0">Start sending</a></aside>`;

const metaRow = (k: string, v: string) => `<div class="py-3 border-b border-line"><dt class="text-[14px] text-ink-3">${k}</dt><dd class="mt-0.5 text-[15.5px] text-ink">${v}</dd></div>`;

export function renderDocPage(doc: Doc, related: Doc[]): string {
  const isArticle = doc.kind === 'article';
  const crumbs = `<nav aria-label="Breadcrumb" class="text-[15px] text-ink-3"><a href="/" data-internal="true" class="hover:text-signal">Relay</a> <span aria-hidden="true" class="mx-1">/</span> ${isArticle ? `<a href="/articles" data-internal="true" class="hover:text-signal">Guides</a>` : `<span class="text-ink">${esc(doc.h1)}</span>`}</nav>`;
  const aside = isArticle
    ? `<dl class="grid grid-cols-2 md:grid-cols-1 gap-x-4">${metaRow('Written by', `<a href="${SITE.author.url}" rel="author" class="link">${esc(SITE.author.name)}</a>`)}${metaRow('Updated', `<time datetime="${doc.updated}">${fmtDate(doc.updated)}</time>`)}${metaRow('Reading time', `${doc.readingMinutes} minutes`)}${metaRow('Topic', esc(doc.category))}</dl>`
    : '';
  const heads = [...doc.body.matchAll(/^##\s+(.+)$/gm)].map((m) => stripMd(m[1]));
  const toc = heads.length >= 3
    ? `<nav aria-label="On this page" class="hidden md:block mt-8"><h2 class="text-[14px] text-ink-3">On this page</h2><ol class="mt-3 flex flex-col gap-2 text-[15px] leading-snug">${heads.map((h) => `<li><a href="#${slugify(h)}" class="text-ink-2 hover:text-signal">${esc(h)}</a></li>`).join('')}</ol></nav>`
    : '';
  return `<div class="wrap pt-8 md:pt-10 text-ink">${crumbs}
<header class="mt-8 md:mt-12 grid md:grid-cols-12"><h1 class="rise display md:col-span-11 text-[46px] sm:text-[62px] md:text-[84px] xl:text-[100px] text-balance text-signal" ${W(3.4)}>${esc(doc.h1)}</h1>
<p class="rise rise-2 md:col-start-4 md:col-span-7 text-[20px] md:text-[23px] text-ink leading-[1.4] mt-8 md:mt-10">${esc(doc.description)}</p></header>
<div class="mt-12 md:mt-16 grid md:grid-cols-12 gap-y-10">
<aside aria-label="About this page" class="md:col-span-3 md:pr-8"><div class="md:sticky md:top-24">${aside}${toc}</div></aside>
<div class="md:col-span-7 min-w-0"><article class="${PROSE}">${renderMarkdown(doc.body)}</article>
${relatedHtml(related)}${ctaHtml}</div></div></div>`;
}

export function renderDocsIndex(articles: Doc[]): string {
  const groups = new Map<string, Doc[]>();
  for (const d of articles) {
    if (!groups.has(d.category)) groups.set(d.category, []);
    groups.get(d.category)!.push(d);
  }
  const order = ['Guide', 'How-to', 'Security', 'Comparison', 'Alternatives', 'Explainer'];
  const cats = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
  return `<div class="wrap pt-8 md:pt-10 text-ink">
<header class="grid md:grid-cols-12"><h1 class="rise display md:col-span-9 text-[60px] sm:text-[88px] md:text-[128px] xl:text-[150px] text-signal" ${W(3.4)}>File sharing, explained.</h1>
<p class="rise rise-2 md:col-start-7 md:col-span-6 text-[19px] md:text-[21px] text-ink-2 mt-8 leading-relaxed">Plain-language guides to peer-to-peer and secure file transfer, sending large files, and honest comparisons with the tools you already use.</p></header>
${cats.map((c) => `<section class="mt-20 md:mt-28 grid md:grid-cols-12 gap-y-4"><h2 class="md:col-span-3 display text-[36px] md:text-[44px]" ${W(3.5)}>${esc(c)}</h2>
<div class="md:col-span-9 grid grid-cols-1 lg:grid-cols-2 gap-x-10">${groups.get(c)!.sort((a, b) => a.order - b.order || a.h1.localeCompare(b.h1)).map((d) => item(d)).join('')}</div></section>`).join('\n')}
</div>`;
}

// ── Brand kit ────────────────────────────────────────────────────────────────
export const BRAND = {
  short: 'Relay is a free, open-source app for sending files directly between devices in the browser, end-to-end encrypted and never uploaded.',
  long: 'Relay sends files of any size straight from one device to another, peer to peer over WebRTC. Files are encrypted end to end and never stored on a server, there is no account and no size limit, and it works in any modern browser on iPhone, Android, Windows, macOS and Linux. Relay is free and open source under the MIT licence, built by Rishi Shah in Ahmedabad.',
  colors: [
    ['Ultramarine', '#1631E0', 'The app, links and every action. The only accent.'],
    ['Ink', '#0E1233', 'Text and the wordmark on light backgrounds.'],
    ['Paper', '#F2F3F7', 'Page background.'],
    ['Pale', '#DCE1FF', 'Quiet highlights on paper.'],
    ['Packet', '#8FA0FF', 'Only the moving pixel in the mark.'],
  ] as [string, string, string][],
  type: [
    ['Aujournuit', 'Collletttivo', 'Headlines, on its width axis', 'https://collletttivo.it'],
    ['Apfel Grotezk', 'Collletttivo', 'Text and interface', 'https://collletttivo.it'],
    ['Departure Mono', 'Helena Zhang', 'Room codes and safety numbers only', 'https://departuremono.com'],
  ] as [string, string, string, string][],
};

export function headForBrand(): Head {
  return {
    title: 'Brand kit: Relay logo, colours and type | Relay',
    description: 'Download the Relay logo, mark and app icon in SVG and PNG, with colours, typefaces, usage rules and a ready-to-paste description of Relay.',
    canonical: `${SITE.url}/brand`, ogType: 'website', markdown: '/brand.md', image: ogFor('brand'), imageAlt: 'Relay brand kit',
    jsonLd: [breadcrumbs([{ name: 'Relay', url: SITE.url + '/' }, { name: 'Brand kit', url: `${SITE.url}/brand` }])],
  };
}

const dl = (file: string, label: string) => `<a href="/brandkit/${file}" download class="link text-ink">${label}</a>`;
const asset = (name: string, bg: string, img: string, links: string) => `<figure class="m-0"><div class="rounded-[24px] ${bg} aspect-[4/3] flex items-center justify-center p-10"><img src="/brandkit/${img}" alt="${esc(name)}" class="max-h-full max-w-[70%] object-contain" loading="lazy" /></div><figcaption class="mt-3 flex flex-wrap items-baseline justify-between gap-2"><span class="font-medium">${esc(name)}</span><span class="text-[15px] text-ink-2 flex gap-4">${links}</span></figcaption></figure>`;

export function renderBrandPage(): string {
  const H2 = (t: string) => `<h2 class="display text-[40px] md:text-[56px]" ${W(3.5)}>${t}</h2>`;
  return `<div class="wrap pt-8 md:pt-10 text-ink">
<nav aria-label="Breadcrumb" class="text-[15px] text-ink-3"><a href="/" data-internal="true" class="hover:text-signal">Relay</a> <span aria-hidden="true" class="mx-1">/</span> <span class="text-ink">Brand kit</span></nav>
<header class="mt-8 md:mt-12 grid md:grid-cols-12"><h1 class="rise display md:col-span-9 text-[60px] sm:text-[88px] md:text-[128px] text-signal" ${W(3.4)}>Brand kit</h1>
<p class="md:col-start-7 md:col-span-6 text-[19px] md:text-[21px] text-ink-2 mt-8 leading-relaxed">Logos, colours, type and words for writing about Relay. Use them freely to link to or talk about Relay. Please don't change the mark or use it for another product.</p></header>

<section class="mt-20 md:mt-28">${H2('Logo')}
<div class="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
${asset('Logo', 'bg-paper shadow-[inset_0_0_0_1px_var(--color-line)]', 'relay-logo.png', `${dl('relay-logo.png', 'PNG')}`)}
${asset('Logo, reversed', 'bg-signal', 'relay-logo-white.png', `${dl('relay-logo-white.png', 'PNG')}`)}
${asset('App icon', 'bg-paper shadow-[inset_0_0_0_1px_var(--color-line)]', 'relay-app-icon-512.png', `${dl('relay-app-icon.svg', 'SVG')}${dl('relay-app-icon-512.png', 'PNG')}`)}
${asset('Mark', 'bg-paper shadow-[inset_0_0_0_1px_var(--color-line)]', 'relay-mark.svg', `${dl('relay-mark.svg', 'SVG')}${dl('relay-mark.png', 'PNG')}`)}
${asset('Mark, reversed', 'bg-signal', 'relay-mark-white.svg', `${dl('relay-mark-white.svg', 'SVG')}${dl('relay-mark-white.png', 'PNG')}`)}
${asset('Mark, one colour', 'bg-paper shadow-[inset_0_0_0_1px_var(--color-line)]', 'relay-mark-ink.svg', `${dl('relay-mark-ink.svg', 'SVG')}`)}
</div>
<div class="mt-10 grid md:grid-cols-2 gap-x-16 gap-y-4 text-ink-2 leading-relaxed max-w-[1000px]">
<p><strong class="text-ink font-medium">What the mark means.</strong> An R drawn on a 5 × 7 pixel grid, with one pale pixel leaving its shoulder: a file on its way to another device.</p>
<p><strong class="text-ink font-medium">Clear space.</strong> Keep at least two pixel cells of empty space around the mark. The smallest size is 16 px tall on screen.</p>
<p><strong class="text-ink font-medium">Colours.</strong> Ultramarine on paper or white on ultramarine. On photos, use the app icon.</p>
<p><strong class="text-ink font-medium">Please don't</strong> round the pixels, rotate or stretch the mark, move the packet pixel, or add effects.</p>
</div></section>

<section class="mt-20 md:mt-28">${H2('Colour')}
<div class="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">${BRAND.colors.map(([n, hex, use]) => `<div><div class="rounded-[20px] aspect-square md:aspect-[3/4] shadow-[inset_0_0_0_1px_var(--color-line)]" style="background:${hex}"></div>
<p class="mt-3 font-medium">${n}</p><p class="text-[15px]"><button type="button" data-copy="${hex}" class="font-mono text-ink-2 hover:text-signal" aria-label="Copy ${n} ${hex}">${hex}</button></p><p class="text-[14px] text-ink-3 mt-1 leading-snug">${use}</p></div>`).join('')}</div></section>

<section class="mt-20 md:mt-28">${H2('Type')}
<div class="mt-8">${BRAND.type.map(([f, by, use, url], i) => `<div class="py-6 border-t border-line grid md:grid-cols-12 gap-3 items-baseline"><p class="md:col-span-6 ${i === 0 ? 'display text-[56px] md:text-[72px]' : i === 1 ? 'text-[40px] md:text-[48px] font-medium tracking-[-0.02em]' : 'font-mono text-[32px] md:text-[40px]'}" ${i === 0 ? W(3.4) : ''}>${f}</p><p class="md:col-span-6 text-ink-2">${use}. By ${by}, SIL Open Font License. <a href="${url}" class="link text-ink" rel="noopener">Get it</a></p></div>`).join('')}</div></section>

<section class="mt-20 md:mt-28 grid md:grid-cols-12 gap-y-6"><div class="md:col-span-4">${H2('Words')}<p class="mt-4 text-ink-2">Write <strong class="text-ink font-medium">Relay</strong>, with a capital R. Not "RELAY" or "Relay app".</p></div>
<div class="md:col-span-8 flex flex-col gap-4">
<div class="rounded-[20px] bg-paper p-6 shadow-[inset_0_0_0_1px_var(--color-line)]"><div class="flex justify-between gap-4"><h3 class="font-medium">One line</h3><button type="button" data-copy="${esc(BRAND.short)}" class="text-[15px] text-signal hover:underline">Copy</button></div><p class="mt-2 text-ink-2 leading-relaxed">${esc(BRAND.short)}</p></div>
<div class="rounded-[20px] bg-paper p-6 shadow-[inset_0_0_0_1px_var(--color-line)]"><div class="flex justify-between gap-4"><h3 class="font-medium">Paragraph</h3><button type="button" data-copy="${esc(BRAND.long)}" class="text-[15px] text-signal hover:underline">Copy</button></div><p class="mt-2 text-ink-2 leading-relaxed">${esc(BRAND.long)}</p></div>
</div></section>

<section class="mt-20 md:mt-28 grid md:grid-cols-12 gap-y-4"><div class="md:col-span-4">${H2('Music')}</div>
<p class="md:col-span-8 text-ink-2 leading-relaxed text-[18px]">The Relay soundtrack, “Relay — Straight” and “Relay — Across”, is by Thepla Theorist and Rishi Shah. The recordings are all rights reserved and are not part of the open-source licence; please ask before using them.</p></section>

<section class="mt-20 md:mt-28 grid md:grid-cols-12 gap-y-4"><div class="md:col-span-4">${H2('Contact')}</div>
<p class="md:col-span-8 text-ink-2 leading-relaxed text-[18px]">For press and partnerships, reach ${esc(SITE.author.name)} through <a href="${SITE.author.url}" class="link text-ink" rel="author">${SITE.author.url.replace('https://', '')}</a>. Bugs and ideas go to <a href="${SITE.github}/issues" class="link text-ink">GitHub issues</a>.</p></section>
</div>`;
}

export function brandMarkdown(): string {
  return `# Relay brand kit\n\n> ${BRAND.short}\n\n_${SITE.url}/brand_\n\n## Description\n\n${BRAND.long}\n\n## Logo files\n\n${['relay-logo.png', 'relay-logo-white.png', 'relay-app-icon.svg', 'relay-app-icon-512.png', 'relay-mark.svg', 'relay-mark.png', 'relay-mark-white.svg', 'relay-mark-white.png', 'relay-mark-ink.svg'].map((f) => `- ${SITE.url}/brandkit/${f}`).join('\n')}\n\nThe mark is an R on a 5 × 7 pixel grid with one pale pixel leaving its shoulder: a file on its way. Keep two pixel cells of clear space; don't round, rotate, stretch or recolour it.\n\n## Colours\n\n${BRAND.colors.map(([n, h, u]) => `- **${n}** ${h}: ${u}`).join('\n')}\n\n## Type\n\n${BRAND.type.map(([f, by, u]) => `- **${f}** by ${by} (SIL OFL): ${u}`).join('\n')}\n\n## Music\n\n“Relay — Straight” and “Relay — Across” by Thepla Theorist and Rishi Shah. All rights reserved.\n`;
}

/** What crawlers see on "/" before the app boots (the app replaces it). */
export function renderHomeStatic(home: Doc, featured: Doc[]): string {
  return `<div class="wrap pt-16 text-ink"><div class="max-w-[760px]">
<h1 class="display text-[56px] md:text-[96px]" ${W(3.5)}>${esc(home.h1)}</h1>
<p class="text-[19px] md:text-[21px] text-ink-2 mt-6">${esc(home.description)}</p>
<p class="mt-10"><a href="/" class="btn btn-signal">Start sending</a></p>
<article class="${PROSE} text-left mt-20">${renderMarkdown(home.body)}</article>
${relatedHtml(featured)}</div></div>`;
}

export function docToMarkdown(doc: Doc): string {
  const url = urlFor(doc.slug);
  const meta = doc.kind === 'article' ? `\n\n_${doc.category} · Updated ${doc.updated} · By ${SITE.author.name} · ${url}_` : `\n\n_${url}_`;
  return `# ${doc.h1}\n\n> ${doc.description}${meta}\n\n${doc.body}\n`;
}
