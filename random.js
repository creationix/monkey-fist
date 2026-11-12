// Deterministic random primitives. Keep the sequence stable: shared level codes
// and saved progress depend on these exact draws and in-place shuffle order.
(function (root) {
  'use strict';
  function mulberry32(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function hashString(s) { // FNV-1a over UTF-16 code units, as in the original square generator.
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function shuffle(a, rng) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const api = { mulberry32, hashString, shuffle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MFRandom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
