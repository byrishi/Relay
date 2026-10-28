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
  'prose prose-invert max-w-none text-[16.5px]',
  'prose-headings:font-semibold prose-headings:tracking-[-0.03em] prose-headings:text-fg',
  'prose-h2:text-[28px] prose-h2:mt-14 prose-h2:mb-4 prose-h3:text-[20px] prose-h3:mt-9',
  'prose-p:text-fg-2 prose-p:leading-[1.75] prose-li:text-fg-2 prose-li:leading-[1.7] prose-strong:text-fg prose-li:marker:text-fg-3',
  'prose-a:text-fg prose-a:font-normal prose-a:underline prose-a:decoration-white/25 prose-a:underline-offset-4 hover:prose-a:decoration-white',
  'prose-code:text-fg prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
  'prose-pre:bg-s1 prose-pre:ring-1 prose-pre:ring-white/10',
  'prose-th:text-fg prose-th:font-medium prose-td:text-fg-2 prose-table:text-[14.5px] prose-thead:border-white/15 prose-tr:border-white/[0.08]',
  'prose-blockquote:border-acc/50 prose-blockquote:text-fg-2 prose-blockquote:not-italic prose-blockquote:font-normal',
  'prose-hr:border-white/10',
].join(' ');

const card = 'group block p-6 rounded-2xl panel hover:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)] transition-shadow';

function relatedHtml(related: Doc[]) {
  if (!related.length) return '';
  return `<nav aria-label="Related guides" class="mt-20 pt-10 border-t border-line"><h2 class="text-[13px] font-medium text-fg-3 mb-5">Related guides</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${related.map((d) => `<a href="/${d.slug}" data-internal="true" class="${card}"><span class="text-[12.5px] text-acc">${esc(d.category)}</span><span class="block text-fg text-[16.5px] font-semibold tracking-[-0.02em] mt-1.5 leading-snug">${esc(d.h1)}</span><span class="block text-fg-2 text-[14px] mt-1.5 leading-relaxed">${esc(d.description)}</span></a>`).join('')}</div></nav>`;
}

const ctaHtml = `<aside class="mt-16 relative overflow-hidden p-8 md:p-10 rounded-2xl panel flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
<div><p class="text-[22px] md:text-[26px] font-semibold tracking-[-0.03em] m-0 text-fg">Send a file directly, right now.</p><p class="text-fg-2 mt-2 mb-0">Free and open source. No account, no upload, encrypted end to end.</p></div>
<a href="/" data-internal="true" class="btn btn-w btn-lg shrink-0">Start sending</a></aside>`;

export function renderDocPage(doc: Doc, related: Doc[]): string {
  const isArticle = doc.kind === 'article';
  const crumbs = isArticle
    ? `<nav aria-label="Breadcrumb" class="text-[13.5px] text-fg-3 mb-10"><a href="/articles" data-internal="true" class="hover:text-fg">Guides</a> <span aria-hidden="true" class="mx-1.5">/</span> <span class="text-fg-2">${esc(doc.category)}</span></nav>`
    : '';
  const meta = isArticle
    ? `<p class="text-[13.5px] text-fg-3 mt-8">By <a href="${SITE.author.url}" rel="author" class="text-fg-2 hover:text-fg">${esc(SITE.author.name)}</a> <span aria-hidden="true" class="mx-1">·</span> Updated <time datetime="${doc.updated}">${fmtDate(doc.updated)}</time> <span aria-hidden="true" class="mx-1">·</span> ${doc.readingMinutes} min read</p>`
    : '';
  return `<div class="relative w-full"><div class="hero-glow absolute left-1/2 -translate-x-1/2 -top-56 w-[1000px] h-[640px] pointer-events-none" aria-hidden="true"></div>
<div class="relative w-full max-w-[740px] mx-auto px-6 pt-16 md:pt-24 pb-8 text-fg">
${crumbs}<header>
<h1 class="text-[40px] md:text-[56px] font-semibold tracking-[-0.045em] leading-[1.02] h-hero pb-1">${esc(doc.h1)}</h1>
<p class="text-[18px] md:text-[20px] text-fg-2 mt-6 leading-relaxed">${esc(doc.description)}</p>${meta}</header>
<article class="${PROSE} mt-12 pt-12 border-t border-line">${renderMarkdown(doc.body)}</article>
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
  return `<div class="relative w-full"><div class="hero-glow absolute left-1/2 -translate-x-1/2 -top-56 w-[1100px] h-[700px] pointer-events-none" aria-hidden="true"></div>
<div class="relative w-full max-w-[1200px] mx-auto px-6 pt-16 md:pt-24 text-fg">
<header class="max-w-[720px]"><p class="text-[14px] font-medium text-acc">Guides</p>
<h1 class="mt-3 text-[44px] md:text-[64px] font-semibold tracking-[-0.045em] leading-[1] h-hero pb-1">File sharing, explained.</h1>
<p class="text-[18px] md:text-[20px] text-fg-2 mt-6 leading-relaxed">${articles.length} plain-language guides to peer-to-peer and secure file transfer, sending large files, and honest comparisons with the tools you already know.</p></header>
${cats.map((c) => `<section class="mt-20"><h2 class="text-[20px] font-semibold tracking-[-0.025em] mb-6">${esc(c)}</h2>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">${groups.get(c)!.sort((a, b) => a.order - b.order || a.h1.localeCompare(b.h1)).map((d) => `<a href="/${d.slug}" data-internal="true" class="${card}"><span class="block text-fg text-[16.5px] font-semibold tracking-[-0.02em] leading-snug">${esc(d.h1)}</span><span class="block text-fg-2 text-[14px] mt-2 leading-relaxed">${esc(d.description)}</span></a>`).join('')}</div></section>`).join('\n')}
</div></div>`;
}

/** What crawlers see on "/" before the app boots (the app replaces it). */
export function renderHomeStatic(home: Doc, featured: Doc[]): string {
  return `<div class="w-full max-w-[740px] mx-auto px-6 pt-24 text-fg">
<h1 class="text-[48px] md:text-[72px] font-semibold tracking-[-0.045em] leading-[1] h-hero pb-1">${esc(home.h1)}</h1>
<p class="text-[18px] md:text-[20px] text-fg-2 mt-6">${esc(home.description)}</p>
<p class="mt-10"><a href="/" class="btn btn-w btn-lg">Start sending</a></p>
<article class="${PROSE} text-left mt-20">${renderMarkdown(home.body)}</article>
${relatedHtml(featured)}</div>`;
}

export function docToMarkdown(doc: Doc): string {
  const url = urlFor(doc.slug);
  const meta = doc.kind === 'article' ? `\n\n_${doc.category} · Updated ${doc.updated} · By ${SITE.author.name} · ${url}_` : `\n\n_${url}_`;
  return `# ${doc.h1}\n\n> ${doc.description}${meta}\n\n${doc.body}\n`;
}
