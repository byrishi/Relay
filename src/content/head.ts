import type { Head } from './render';

/** Keep <head> in sync on client-side navigation (prerendered pages already have it). */
export function applyHead(h: Head) {
  document.title = h.title;
  const set = (sel: string, attr: string, val: string, create: () => HTMLElement) => {
    let el = document.head.querySelector(sel) as HTMLElement | null;
    if (!el) { el = create(); document.head.appendChild(el); }
    el.setAttribute(attr, val);
  };
  const meta = (key: string, isProp = false) => () => { const m = document.createElement('meta'); m.setAttribute(isProp ? 'property' : 'name', key); return m; };
  set('meta[name="description"]', 'content', h.description, meta('description'));
  set('meta[property="og:title"]', 'content', h.title, meta('og:title', true));
  set('meta[property="og:description"]', 'content', h.description, meta('og:description', true));
  set('meta[property="og:url"]', 'content', h.canonical, meta('og:url', true));
  set('meta[property="og:type"]', 'content', h.ogType, meta('og:type', true));
  set('meta[name="twitter:title"]', 'content', h.title, meta('twitter:title'));
  set('meta[name="twitter:description"]', 'content', h.description, meta('twitter:description'));
  if (h.image) {
    set('meta[property="og:image"]', 'content', h.image, meta('og:image', true));
    set('meta[name="twitter:image"]', 'content', h.image, meta('twitter:image'));
    set('meta[property="og:image:alt"]', 'content', h.imageAlt || h.title, meta('og:image:alt', true));
  }
  set('link[rel="canonical"]', 'href', h.canonical, () => { const l = document.createElement('link'); l.rel = 'canonical'; return l; });
  const alt = document.head.querySelector('link[rel="alternate"][type="text/markdown"]');
  if (h.markdown) {
    set('link[rel="alternate"][type="text/markdown"]', 'href', h.markdown, () => { const l = document.createElement('link'); l.rel = 'alternate'; l.type = 'text/markdown'; return l; });
  } else alt?.remove();
  document.head.querySelectorAll('script[data-ld="page"]').forEach((s) => s.remove());
  for (const obj of h.jsonLd) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.dataset.ld = 'page';
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }
}
