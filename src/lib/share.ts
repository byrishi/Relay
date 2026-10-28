/** Files the service worker received from the OS share sheet. Read once, then cleared. */
export async function takeSharedFiles(): Promise<File[]> {
  if (!new URLSearchParams(location.search).has('share') || !('indexedDB' in window)) return [];
  try {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const req = indexedDB.open('relay-share', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('items', { autoIncrement: true });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const items: { name: string; type: string; blob: Blob }[] = await new Promise((resolve, reject) => {
      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      const all = store.getAll();
      all.onsuccess = () => { store.clear(); resolve(all.result || []); };
      all.onerror = () => reject(all.error);
    });
    db.close();
    history.replaceState({}, document.title, location.pathname);
    return items.map((i) => new File([i.blob], i.name || 'shared', { type: i.type }));
  } catch {
    return [];
  }
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* optional */ });
  });
}
