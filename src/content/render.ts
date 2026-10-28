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
  'prose prose-invert prose-lg max-w-none',
  'prose-headings:font-sans prose-headings:tracking-tight prose-headings:text-white',
  'prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-14 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8',
  'prose-p:text-white/75 prose-p:leading-relaxed prose-li:text-white/75 prose-strong:text-white',
  'prose-a:text-brand-neon prose-a:no-underline hover:prose-a:underline',
  'prose-code:text-brand-neon prose-code:before:content-none prose-code:after:content-none',
  'prose-th:text-white prose-td:text-white/75 prose-table:text-sm',
  'prose-blockquote:border-brand-neon/40 prose-blockquote:text-white/70',
].join(' ');

// dark reading panel so text stays legible over the particle scene
const PANEL = 'rounded-3xl bg-[#03040a]/80 backdrop-blur-xl border border-white/[0.06] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]';

const card = 'block p-5 rounded-xl bg-[#070a16]/60 border border-white/[0.08] hover:border-brand-neon/40 transition-colors';

function relatedHtml(related: Doc[]) {
  if (!related.length) return '';
  return `<nav aria-label="Related guides" class="mt-16"><h2 class="text-sm uppercase tracking-[0.2em] text-white/50 font-pixel-grid mb-5">Related guides</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${related.map((d) => `<a href="/${d.slug}" data-internal="true" class="${card}"><span class="text-[10px] uppercase tracking-[0.2em] text-brand-neon/80">${esc(d.category)}</span><span class="block text-white font-semibold mt-1">${esc(d.h1)}</span><span class="block text-white/55 text-sm mt-1">${esc(d.description)}</span></a>`).join('')}</div></nav>`;
}

const ctaHtml = `<aside class="mt-16 p-8 rounded-2xl bg-[#070a16]/60 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
<div><p class="text-2xl font-semibold text-white m-0">Send a file directly, right now</p><p class="text-white/60 mt-2 mb-0">Free and open source. No account, no upload, encrypted end to end.</p></div>
<a href="/" data-internal="true" class="px-7 py-3.5 rounded-lg bg-brand-neon text-black font-semibold hover:bg-white transition-colors shrink-0">Open Relay</a></aside>`;

export function renderDocPage(doc: Doc, related: Doc[]): string {
  const isArticle = doc.kind === 'article';
  const crumbs = isArticle
    ? `<nav aria-label="Breadcrumb" class="text-xs text-white/45 mb-8"><a href="/" data-internal="true" class="hover:text-white">Relay</a> <span aria-hidden="true">/</span> <a href="/articles" data-internal="true" class="hover:text-white">Guides</a> <span aria-hidden="true">/</span> <span class="text-white/70">${esc(doc.category)}</span></nav>`
    : '';
  const meta = isArticle
    ? `<p class="text-xs text-white/45 mt-6">By <a href="${SITE.author.url}" rel="author" class="text-white/70 hover:text-white">${esc(SITE.author.name)}</a> · Updated <time datetime="${doc.updated}">${fmtDate(doc.updated)}</time> · ${doc.readingMinutes} min read</p>`
    : '';
  return `<div class="w-full max-w-3xl mx-auto px-3 md:px-6 py-8 md:py-14"><div class="${PANEL} px-6 md:px-12 py-10 md:py-14 text-white">
${crumbs}<header><span class="inline-block px-3 py-1 rounded border border-brand-neon/30 bg-brand-neon/5 text-[10px] tracking-[0.2em] uppercase text-brand-neon font-pixel-grid mb-6">${esc(doc.category)}</span>
<h1 class="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">${esc(doc.h1)}</h1>
<p class="text-lg md:text-xl text-white/70 mt-6 leading-relaxed">${esc(doc.description)}</p>${meta}</header>
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
  return `<div class="w-full max-w-5xl mx-auto px-3 md:px-6 py-8 md:py-14"><div class="${PANEL} px-6 md:px-12 py-10 md:py-14 text-white">
<header class="max-w-3xl"><span class="inline-block px-3 py-1 rounded border border-brand-neon/30 bg-brand-neon/5 text-[10px] tracking-[0.2em] uppercase text-brand-neon font-pixel-grid mb-6">Guides</span>
<h1 class="text-4xl md:text-5xl font-bold tracking-tight">File sharing guides</h1>
<p class="text-lg text-white/70 mt-5 leading-relaxed">Plain-language guides to peer-to-peer and secure file transfer, sending large files, and honest comparisons with the tools you already know.</p></header>
${cats.map((c) => `<section class="mt-14"><h2 class="text-sm uppercase tracking-[0.2em] text-white/50 font-pixel-grid mb-5">${esc(c)}</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${groups.get(c)!.sort((a, b) => a.order - b.order || a.h1.localeCompare(b.h1)).map((d) => `<a href="/${d.slug}" data-internal="true" class="${card}"><span class="block text-white font-semibold">${esc(d.h1)}</span><span class="block text-white/55 text-sm mt-1.5">${esc(d.description)}</span></a>`).join('')}</div></section>`).join('\n')}
</div></div>`;
}

/** What crawlers see on "/" before the app boots (the app replaces it). */
export function renderHomeStatic(home: Doc, featured: Doc[]): string {
  return `<div class="w-full max-w-4xl mx-auto px-6 py-20 text-center text-white">
<h1 class="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.05]">${esc(home.h1)}</h1>
<p class="text-lg md:text-xl text-white/80 mt-6 max-w-2xl mx-auto">${esc(home.description)}</p>
<p class="mt-10"><a href="/" class="px-8 py-4 rounded-lg bg-brand-neon text-black font-semibold">Start a transfer</a></p>
<article class="${PROSE} text-left mt-20">${renderMarkdown(home.body)}</article>
${relatedHtml(featured)}</div>`;
}

export function docToMarkdown(doc: Doc): string {
  const url = urlFor(doc.slug);
  const meta = doc.kind === 'article' ? `\n\n_${doc.category} · Updated ${doc.updated} · By ${SITE.author.name} · ${url}_` : `\n\n_${url}_`;
  return `# ${doc.h1}\n\n> ${doc.description}${meta}\n\n${doc.body}\n`;
}
