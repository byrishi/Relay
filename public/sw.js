/*
 * Relay service worker.
 * - Makes Relay installable.
 * - Receives files from the OS share sheet ("Share to Relay") and hands them to the page.
 * It deliberately caches nothing: Relay needs the network to connect anyway, and not
 * caching avoids ever serving a stale build.
 */
const DB = 'relay-share';
const STORE = 'items';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function stash(files) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const f of files) store.add({ name: f.name, type: f.type, blob: f });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      try {
        const form = await event.request.formData();
        const files = form.getAll('files').filter((f) => f && typeof f === 'object' && 'size' in f);
        const text = [form.get('title'), form.get('text'), form.get('url')].filter(Boolean).join('\n').trim();
        if (text) files.push(new File([text], 'shared-text.txt', { type: 'text/plain' }));
        if (files.length) await stash(files);
      } catch (e) {
        // fall through to the app; nothing to hand over
      }
      return Response.redirect('/?share=1', 303);
    })());
  }
  // everything else: straight to the network
});
