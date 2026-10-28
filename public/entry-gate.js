/*
 * Runs before the first paint. When the entry screen is going to show, cover
 * the page in ultramarine straight away, so the home page never flashes
 * underneath while the app loads. Same rules as src/lib/entry.ts.
 */
(function () {
  try {
    var q = new URLSearchParams(location.search);
    var bot = navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent);
    if (location.pathname === '/' && !q.has('code') && !q.has('share') && !bot && !sessionStorage.getItem('relay-entered')) {
      document.documentElement.classList.add('entry-pending');
    }
  } catch (e) { /* storage blocked: show the page */ }
})();
