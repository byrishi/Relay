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
  'prose prose-lg max-w-none',
  'prose-headings:font-sans prose-headings:font-semibold prose-headings:tracking-[-0.02em] prose-headings:text-ink',
  'prose-h2:text-[28px] md:prose-h2:text-[34px] prose-h2:mt-14 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8',
  'prose-p:text-ink-2 prose-p:leading-relaxed prose-li:text-ink-2 prose-strong:text-ink prose-li:marker:text-ink-3',
  'prose-a:text-indigo prose-a:underline prose-a:decoration-indigo/30 prose-a:underline-offset-4 hover:prose-a:decoration-indigo',
  'prose-code:text-ink prose-code:bg-paper prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-medium prose-code:before:content-none prose-code:after:content-none',
  'prose-th:text-ink prose-td:text-ink-2 prose-table:text-sm prose-thead:border-ink/15 prose-tr:border-ink/10',
  'prose-blockquote:border-indigo/40 prose-blockquote:text-ink-2 prose-blockquote:font-serif prose-blockquote:text-2xl prose-blockquote:not-italic',
  'prose-hr:border-ink/10',
].join(' ');

// a white reading sheet over the daylight scene
const PANEL = 'card-solid rounded-[36px]';

const card = 'group block p-6 rounded-3xl bg-white border border-ink/10 hover:border-ink/30 hover:-translate-y-0.5 transition-all';
const pill = 'inline-flex items-center h-7 px-3 rounded-full bg-paper text-ink-2 font-mono text-[11px] tracking-[0.16em] uppercase';
const eyebrow = 'font-mono text-[11px] tracking-[0.18em] uppercase text-ink-3';

function relatedHtml(related: Doc[]) {
  if (!related.length) return '';
  return `<nav aria-label="Related guides" class="mt-16"><h2 class="${eyebrow} mb-5">Related guides</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${related.map((d) => `<a href="/${d.slug}" data-internal="true" class="${card}"><span class="${eyebrow}">${esc(d.category)}</span><span class="block text-ink text-lg font-semibold tracking-tight mt-2 leading-snug">${esc(d.h1)}</span><span class="block text-ink-2 text-sm mt-1.5 leading-relaxed">${esc(d.description)}</span></a>`).join('')}</div></nav>`;
}

const ctaHtml = `<aside class="mt-16 p-8 md:p-10 rounded-[28px] bg-ink text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
<div><p class="text-2xl md:text-3xl font-semibold tracking-tight m-0">Send a file directly, <em class="font-serif italic font-normal">right now</em></p><p class="text-white/80 mt-2 mb-0">Free and open source. No account, no upload, encrypted end to end.</p></div>
<a href="/" data-internal="true" class="h-12 px-7 inline-flex items-center rounded-full bg-white text-ink font-medium hover:bg-paper transition-colors shrink-0">Open Relay</a></aside>`;

export function renderDocPage(doc: Doc, related: Doc[]): string {
  const isArticle = doc.kind === 'article';
  const crumbs = isArticle
    ? `<nav aria-label="Breadcrumb" class="text-sm text-ink-3 mb-8"><a href="/" data-internal="true" class="hover:text-ink">Relay</a> <span aria-hidden="true">/</span> <a href="/articles" data-internal="true" class="hover:text-ink">Guides</a> <span aria-hidden="true">/</span> <span class="text-ink-2">${esc(doc.category)}</span></nav>`
    : '';
  const meta = isArticle
    ? `<p class="text-sm text-ink-3 mt-6">By <a href="${SITE.author.url}" rel="author" class="text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink">${esc(SITE.author.name)}</a> · Updated <time datetime="${doc.updated}">${fmtDate(doc.updated)}</time> · ${doc.readingMinutes} min read</p>`
    : '';
  return `<div class="w-full max-w-[860px] mx-auto px-3 md:px-6 py-6 md:py-12"><div class="${PANEL} px-6 md:px-16 py-10 md:py-16 text-ink">
${crumbs}<header><span class="${pill} mb-6">${esc(doc.category)}</span>
<h1 class="text-[40px] md:text-[56px] font-semibold tracking-[-0.035em] leading-[1.04]">${esc(doc.h1)}</h1>
<p class="text-lg md:text-xl text-ink-2 mt-6 leading-relaxed">${esc(doc.description)}</p>${meta}</header>
<hr class="mt-10 border-ink/10" />
<article class="${PROSE} mt-10">${renderMarkdown(doc.body)}</article>
${relatedHtml(related)}${ctaHtml}</div></div>`;
}

export function renderDocsIndex(articles: Doc[]): string {
  const groups = new Map<string, Doc[]>();
  for (const d of articles) {
    if (!groups.has(d.category)) groups.set(d.category, []);
    groups.get(d.category)!.push(d);
  }
  const order = ['Guide', 'How-to', 'Security', 'Comparison', 'Alternatives', 'Explainer'];
  const cats = [...groups.keys()].sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
  return `<div class="w-full max-w-6xl mx-auto px-5 md:px-8 py-6 md:py-12 text-ink">
<header class="max-w-3xl"><p class="${eyebrow}">Guides · ${articles.length} articles</p>
<h1 class="mt-4 text-[44px] md:text-[72px] font-semibold tracking-[-0.045em] leading-[1]">File sharing, <em class="font-serif italic font-normal tracking-normal text-dawn pr-1">explained</em></h1>
<p class="text-lg md:text-xl text-ink-2 mt-6 leading-relaxed">Plain-language guides to peer-to-peer and secure file transfer, sending large files, and honest comparisons with the tools you already know.</p></header>
${cats.map((c) => `<section class="mt-16"><h2 class="${eyebrow} mb-5 pb-3 border-b border-ink/15">${esc(c)}</h2>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">${groups.get(c)!.sort((a, b) => a.order - b.order || a.h1.localeCompare(b.h1)).map((d) => `<a href="/${d.slug}" data-internal="true" class="${card}"><span class="block text-ink text-lg font-semibold tracking-tight leading-snug">${esc(d.h1)}</span><span class="block text-ink-2 text-sm mt-2 leading-relaxed">${esc(d.description)}</span><span class="mt-4 inline-block text-sm font-medium text-ink group-hover:text-indigo">Read →</span></a>`).join('')}</div></section>`).join('\n')}
</div>`;
}

/** What crawlers see on "/" before the app boots (the app replaces it). */
export function renderHomeStatic(home: Doc, featured: Doc[]): string {
  return `<div class="w-full max-w-4xl mx-auto px-6 py-20 text-ink">
<h1 class="text-5xl md:text-7xl font-semibold tracking-[-0.045em] leading-[1]">${esc(home.h1)}</h1>
<p class="text-lg md:text-xl text-ink-2 mt-6 max-w-2xl">${esc(home.description)}</p>
<p class="mt-10"><a href="/" class="btn-ink h-14 px-8">Start a transfer</a></p>
<article class="${PROSE} text-left mt-20">${renderMarkdown(home.body)}</article>
${relatedHtml(featured)}</div>`;
}

export function docToMarkdown(doc: Doc): string {
  const url = urlFor(doc.slug);
  const meta = doc.kind === 'article' ? `\n\n_${doc.category} · Updated ${doc.updated} · By ${SITE.author.name} · ${url}_` : `\n\n_${url}_`;
  return `# ${doc.h1}\n\n> ${doc.description}${meta}\n\n${doc.body}\n`;
}
