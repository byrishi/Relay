/** Browser-side content registry (bundled into the lazily loaded docs chunk). */
import { Doc, parseDoc } from './parse';

const articleFiles = import.meta.glob('/content/articles/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const pageFiles = import.meta.glob('/content/pages/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const base = (p: string) => p.split('/').pop()!.replace(/\.md$/, '');

export const articles: Doc[] = Object.entries(articleFiles).map(([p, raw]) => parseDoc(raw, base(p), 'article'));
export const pages: Doc[] = Object.entries(pageFiles)
  .filter(([p]) => base(p) !== 'index')
  .map(([p, raw]) => parseDoc(raw, base(p), 'page'));

const bySlug = new Map<string, Doc>([...articles, ...pages].map((d) => [d.slug, d]));
export const getDoc = (slug: string) => bySlug.get(slug);

export function relatedFor(doc: Doc, n = 4): Doc[] {
  const picked = doc.related.map((s) => bySlug.get(s)).filter((d): d is Doc => !!d && d.kind === 'article');
  for (const d of articles) {
    if (picked.length >= n) break;
    if (d.slug !== doc.slug && d.category === doc.category && !picked.includes(d)) picked.push(d);
  }
  return picked.slice(0, n);
}
