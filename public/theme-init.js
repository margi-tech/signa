/*
 * Rulează sincron în <head>, înainte de primul paint: pune tema și mărimea
 * textului pe <html>, ca să nu clipească tema deschisă la pornire.
 * Fișier separat (nu script inline) pentru că CSP-ul permite doar 'self'.
 * Oglindește `applyPrefs()` din src/lib/preferences.js — țin-le sincron.
 */
(function () {
  var theme = 'system';
  var scale = 1;
  try {
    var p = JSON.parse(localStorage.getItem('signa-prefs-v1') || 'null');
    if (p && (p.theme === 'light' || p.theme === 'dark' || p.theme === 'system')) theme = p.theme;
    if (p && [0.9, 1, 1.15, 1.3].indexOf(p.textScale) !== -1) scale = p.textScale;
  } catch (e) { /* preferințe implicite */ }
  if (theme === 'system') {
    try {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      theme = 'light';
    }
  }
  var root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.setProperty('--sg-text-scale', String(scale));
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#171512' : '#FFFBF3');
})();
