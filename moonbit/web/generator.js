/* global MFGame, MFCore */
'use strict';
// The MoonBit generator behind MFGame.generate's interface. It loads the wasm-gc
// build where the browser runs it and the plain JS build (an ES2020 script, for
// older Safari without wasm-gc) everywhere else. Both make the same boards as
// grid-generator.js, several times faster. Needs game-engine.js for the set code
// and level specification.
(function (root) {
  const decode = out => {
    let k = 0; const next = () => out[k++];
    const hex = next() === 1, W = next(), H = next(), par = next(), exact = next() === 1;
    const ropes = Array.from({ length: next() }, () => Array.from({ length: next() }, () => ({ q: next(), r: next() })));
    const mirrors = Array.from({ length: next() }, () => {
      const q = next(), r = next(), kind = next();
      return hex ? { cell: { q, r }, axis: kind } : { cell: { q, r }, slope: kind ? '\\' : '/' };
    });
    const springs = Array.from({ length: next() }, () => ({ q: next(), r: next() }));
    const plan = Array.from({ length: next() }, () => next());
    const layoutKey = String.fromCharCode(...Array.from({ length: next() }, () => next()));
    return { grid: hex ? 'hex' : 'square', W, H, par, exact, ropes, mirrors, springs, plan, layoutKey };
  };
  // x: the exports of either build (in_reset, in_push, generate, out_len, out_get).
  const wrap = (x, backend) => ({
    backend,
    generate(options = {}) {
      const spec = MFGame.spec(options, options.index), code = MFGame.code(options);
      x.in_reset(); for (let i = 0; i < code.length; i++) x.in_push(code.charCodeAt(i));
      if (!x.generate(spec.index)) throw Error('No board fits ' + code + ' level ' + (spec.index + 1));
      const n = x.out_len(), out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = x.out_get(i);
      return { ...spec, ...decode(out) };
    },
  });
  // base: the URL of the moonbit/ directory, ending in a slash.
  // load(): Promise of the generator; rejects only if neither build loads.
  async function load(base, { wasm = true } = {}) {
    if (wasm && typeof WebAssembly === 'object') try {
      const bytes = await (await fetch(base + 'dist/gen.wasm?v=1')).arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      return wrap(instance.exports, 'wasm-gc');
    } catch { /* No wasm-gc (Safari before 18.2): use the JS build. */ }
    if (!root.MFCore) {
      if (typeof importScripts === 'function') importScripts(base + 'dist/gen.js?v=1');
      else await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = base + 'dist/gen.js?v=1'; s.onload = resolve; s.onerror = () => reject(Error('Could not load the generator'));
        document.head.append(s);
      });
    }
    return wrap(root.MFCore, 'js');
  }
  // generate(options, fallback): a Promise of the board, loading the generator on
  // first use; fallback (MFGame.generate) makes it if neither build loads or runs.
  let loading = null;
  async function generate(options, fallback, base = 'moonbit/') {
    const generator = await (loading ||= load(base).catch(() => null));
    try { if (generator) return generator.generate(options); } catch { /* Use the fallback. */ }
    return fallback(options);
  }
  const api = { load, wrap, decode, generate };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.MFMoonBit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
