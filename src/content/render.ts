/**
 * HTML + metadata builders shared by the browser (article pages) and the prerender
 * script, so crawlers and users get exactly the same markup.
 */
import { Doc, SITE, renderMarkdown, urlFor } from './parse';

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export interface Head {
  title: string;
  description: string;
  canonical: string;
  ogType: 'website' | 'article';
  markdown?: string;          // path of the .md alternate
  jsonLd: object[];
  noindex?: boolean;
}

// ── JSON-LD ──────────────────────────────────────────────────────────────────
const org = {
  '@type': 'Organization',
  '@id': `${SITE.url}/#org`,
  name: SITE.name,
  url: SITE.url + '/',
  logo: `${SITE.url}/icons/icon-512.png`,
  sameAs: [SITE.github],
  founder: { '@type': 'Person', name: SITE.author.name, url: SITE.author.url },
};

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
      author: { '@type': 'Person', name: SITE.author.name, url: SITE.author.url },
      publisher: { '@id': `${SITE.url}/#org` },
    },
    { '@context': 'https://schema.org', ...org },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE.url}/#site`,
      name: SITE.name,
      url: SITE.url + '/',
      publisher: { '@id': `${SITE.url}/#org` },
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
      title: doc.title, description: doc.description, canonical: url, ogType: 'website', markdown: '/index.md',
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
      image: SITE.ogImage,
      keywords: doc.keywords.join(', '),
      articleSection: doc.category,
      author: { '@type': 'Person', name: SITE.author.name, url: SITE.author.url },
      publisher: { '@id': `${SITE.url}/#org`, '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: `${SITE.url}/icons/icon-512.png` } },
      about: { '@id': `${SITE.url}/#app` },
    });
  }
  return { title: `${doc.title} | Relay`, description: doc.description, canonical: url, ogType: doc.kind === 'article' ? 'article' : 'website', markdown: `/${doc.slug}.md`, jsonLd: ld };
}

export function headForIndex(): Head {
  return {
    title: 'Guides: P2P file sharing, secure transfer & large files | Relay',
    description: 'Guides and honest comparisons on peer-to-peer file sharing, secure and encrypted file transfer, sending large files, and alternatives to WeTransfer, AirDrop and more.',
    canonical: `${SITE.url}/articles`,
    ogType: 'website',
    markdown: '/articles.md',
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
const item = (d: Doc, kicker = '') => `<a href="/${d.slug}" data-internal="true" data-cursor="Read" class="group block py-6 border-t border-line">${kicker ? `<span class="block text-[14px] text-signal mb-1.5">${esc(kicker)}</span>` : ''}<span class="block text-ink text-[21px] font-medium leading-snug group-hover:text-signal transition-colors">${esc(d.h1)}</span><span class="block text-ink-2 text-[16px] mt-2 leading-relaxed max-w-[56ch]">${esc(d.description)}</span></a>`;

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
  return `<div class="wrap pt-8 md:pt-10 text-ink">${crumbs}
<header class="mt-8 md:mt-12 grid md:grid-cols-12"><h1 class="display md:col-span-11 text-[46px] sm:text-[62px] md:text-[84px] xl:text-[100px] text-balance text-signal" ${W(3.4)}>${esc(doc.h1)}</h1>
<p class="md:col-start-4 md:col-span-7 text-[20px] md:text-[23px] text-ink leading-[1.4] mt-8 md:mt-10">${esc(doc.description)}</p></header>
<div class="mt-12 md:mt-16 grid md:grid-cols-12 gap-y-10">
<aside aria-label="About this page" class="md:col-span-3 md:pr-8"><div class="md:sticky md:top-24">${aside}</div></aside>
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
<header class="grid md:grid-cols-12"><h1 class="display md:col-span-9 text-[60px] sm:text-[88px] md:text-[128px] xl:text-[150px] text-signal" ${W(3.4)}>File sharing, explained.</h1>
<p class="md:col-start-7 md:col-span-6 text-[19px] md:text-[21px] text-ink-2 mt-8 leading-relaxed">Plain-language guides to peer-to-peer and secure file transfer, sending large files, and honest comparisons with the tools you already use.</p></header>
${cats.map((c) => `<section class="mt-20 md:mt-28 grid md:grid-cols-12 gap-y-4"><h2 class="md:col-span-3 display text-[36px] md:text-[44px]" ${W(3.5)}>${esc(c)}</h2>
<div class="md:col-span-9 grid grid-cols-1 lg:grid-cols-2 gap-x-10">${groups.get(c)!.sort((a, b) => a.order - b.order || a.h1.localeCompare(b.h1)).map((d) => item(d)).join('')}</div></section>`).join('\n')}
</div>`;
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
