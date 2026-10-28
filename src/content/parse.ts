/**
 * Markdown content model shared by the app (articles render in the browser) and the
 * build-time prerender script (static HTML, .md copies, llms.txt, sitemap).
 * Pure functions only — no Vite or Node APIs here.
 */
import { Marked } from 'marked';

import { SITE } from './site';
export { SITE };

export type DocKind = 'article' | 'page';

export interface Faq { q: string; a: string }

export interface Doc {
  slug: string;              // '' for the home page
  kind: DocKind;
  title: string;             // <title> (without " | Relay")
  description: string;       // meta description, 140–160 chars
  h1: string;
  category: string;          // e.g. Guide, Comparison, Security
  date: string;              // ISO date published
  updated: string;           // ISO date modified
  keywords: string[];
  related: string[];         // slugs
  order: number;             // sort hint for listings
  body: string;              // markdown without front matter
  faq: Faq[];
  readingMinutes: number;
}

export function parseDoc(raw: string, slug: string, kind: DocKind): Doc {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  const meta: Record<string, string> = {};
  let body = raw;
  if (m) {
    body = m[2];
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1');
    }
  }
  const list = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug: meta.slug ?? slug,
    kind,
    title: meta.title || meta.h1 || slug,
    description: meta.description || '',
    h1: meta.h1 || meta.title || slug,
    category: meta.category || (kind === 'page' ? 'Relay' : 'Guide'),
    date: meta.date || '2026-10-28',
    updated: meta.updated || meta.date || '2026-10-28',
    keywords: list(meta.keywords),
    related: list(meta.related),
    order: Number(meta.order) || 100,
    body: body.trim(),
    faq: extractFaq(body),
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}

/** "## FAQ" section → question/answer pairs (### Question + paragraphs). */
export function extractFaq(body: string): Faq[] {
  const start = body.search(/^##\s+(FAQ|Frequently asked questions)\s*$/im);
  if (start < 0) return [];
  const rest = body.slice(start).split(/\r?\n/).slice(1);
  const out: Faq[] = [];
  let cur: Faq | null = null;
  for (const line of rest) {
    if (/^##\s/.test(line)) break;
    const q = /^###\s+(.*)$/.exec(line);
    if (q) { if (cur) out.push(cur); cur = { q: q[1].trim(), a: '' }; continue; }
    if (cur) cur.a += line + '\n';
  }
  if (cur) out.push(cur);
  return out.map((f) => ({ q: f.q, a: stripMd(f.a.trim()) })).filter((f) => f.a);
}

export function stripMd(s: string) {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);

const md = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(text)}">${text}</h${depth}>\n`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href) && !href.startsWith(SITE.url);
      const t = title ? ` title="${title}"` : '';
      return external
        ? `<a href="${href}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`
        : `<a href="${href}"${t} data-internal="true">${text}</a>`;
    },
  },
});

export function renderMarkdown(body: string): string {
  const html = md.parse(body, { async: false }) as string;
  let n = 0;
  return html.replace(/<table>/g, () => `<div class="table-wrap" tabindex="0" role="region" aria-label="Table ${++n}"><table>`).replace(/<\/table>/g, '</table></div>');
}

export const urlFor = (slug: string) => (slug ? `${SITE.url}/${slug}` : `${SITE.url}/`);
