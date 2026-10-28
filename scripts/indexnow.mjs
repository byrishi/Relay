/**
 * Tells IndexNow search engines (Bing, Yandex, Seznam, Naver; Bing also feeds
 * ChatGPT search and Copilot) that pages changed, so they recrawl in minutes
 * instead of weeks. Reads the live sitemap and submits every URL.
 *
 *   node scripts/indexnow.mjs            (runs in CI after each deploy)
 *
 * The key is public by design: IndexNow checks that /<key>.txt on the site
 * contains it, which proves we own the host.
 */
const SITE = process.env.SITE_URL || 'https://relay.rishishah.in';
const KEY = 'a916a27bb6baccbeec80a1ac7bb558ae';

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error('no URLs in sitemap');

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: ${res.status} for ${urlList.length} URLs`);
if (res.status >= 400 && res.status !== 429) process.exit(1);
