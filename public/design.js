// Applies the chosen design before first paint, so there is no flash.
// ?design=light or ?design=dark in the URL wins, then the saved choice.
(function () {
  var d = 'dark';
  try {
    var q = new URLSearchParams(location.search).get('design');
    if (q === 'light' || q === 'dark') { d = q; localStorage.setItem('relay-design', q); }
    else if (localStorage.getItem('relay-design') === 'light') d = 'light';
  } catch (e) { /* storage blocked */ }
  document.documentElement.dataset.design = d;
  if (d === 'light') { var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', '#FFFFFF'); }
})();
