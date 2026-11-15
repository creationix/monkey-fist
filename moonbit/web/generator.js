/* global MFGame, MFCore */
'use strict';
// The game's board generator: MoonBit, as the wasm-gc build where the browser runs
// it and as the plain JS build (an ES2020 script) on older Safari without wasm-gc.
// Node (tests, the Journey builder) uses the JS build synchronously.
(function (root) {
  const node = typeof module === 'object' && module.exports;
  const engine = () => root.MFGame || require('../../game-engine.js');
  // The output buffer: the board, its par certificate and layout key, then the
  // measured play (see put_level in src/gen/gen.mbt).
  const decode = (out, f) => {
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
    const [manualSlides, manualBounces, repeatedRopes, automaticRopes, usedMirrors, usedSprings, manualMirrors, manualSprings] = out.slice(k);
    return { grid: hex ? 'hex' : 'square', W, H, par, exact, ropes, mirrors, springs, plan, layoutKey, coverage: f(2),
      play: { casualWins: f(0), work: manualSlides + manualBounces, challenge: Number(f(1).toFixed(3)) },
      slideStats: { manualSlides, manualBounces, repeatedRopes, automaticRopes },
      ...(usedMirrors >= 0 ? { mechanicStats: { usedMirrors, usedSprings, manualMirrors, manualSprings } } : {}) };
  };
  // x: the exports of either build.
  const wrap = (x, backend) => {
    const input = s => { x.in_reset(); for (let i = 0; i < s.length; i++) x.in_push(s.charCodeAt(i)); };
    const board = (made, what) => {
      if (!made) throw Error('No board fits ' + what);
      const n = x.out_len(), out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = x.out_get(i);
      return decode(out, x.outf_get);
    };
    return {
      backend,
      // A level of a set (options as MFGame.normalize takes them, plus index).
      generate(options = {}) {
        const E = engine(), spec = E.spec(options, options.index), code = E.code(options);
        input(code);
        return { ...spec, ...board(x.generate(spec.index), code + ' level ' + (spec.index + 1)) };
      },
      // A board for any specification: grid, W, H, difficulty, seed and optional mechanics.
      generateSpec(s) {
        input(s.seed);
        return { ...s, ...board(x.generate_spec(s.grid === 'hex' ? 1 : 0, s.W, s.H, s.difficulty, +!!s.mirrors, +!!s.springs, +!!s.requireSlide,
          s.minMirrors || 0, s.minSprings || 0, +!!s.colossal), JSON.stringify(s)) };
      },
      // The casual win rate of the board made last, over games seeded by seed.
      measure(seed, games) { input(seed); return x.measure(games); },
      targetChallenge: d => x.target_challenge(d),
      winCeiling: d => x.win_ceiling(d),
    };
  };
  // base: the URL of the moonbit/ directory. Resolves to the generator, or rejects
  // if neither build loads.
  async function load(base) {
    if (typeof WebAssembly === 'object') try {
      const bytes = await (await fetch(base + 'dist/gen.wasm?v=2')).arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      return wrap(instance.exports, 'wasm-gc');
    } catch { /* No wasm-gc (Safari before 18.2): use the JS build. */ }
    if (!root.MFCore) {
      if (typeof importScripts === 'function') importScripts(base + 'dist/gen.js?v=2');
      else await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = base + 'dist/gen.js?v=2'; s.onload = resolve; s.onerror = () => reject(Error('Could not load the generator'));
        document.head.append(s);
      });
    }
    return wrap(root.MFCore, 'js');
  }
  // generate(options): a Promise of the board, loading the generator on first use.
  let loading = null;
  const generate = (options, base = 'moonbit/') => (loading ||= load(base).catch(e => { loading = null; throw e; })).then(g => g.generate(options));
  // The JS build, synchronously: in Node, or once a page has loaded dist/gen.js.
  let sync = null;
  const local = () => sync ||= (node && !root.MFCore && require('../dist/gen.js'), wrap(root.MFCore, 'js'));
  const api = { load, wrap, decode, generate, local };
  if (node) module.exports = api; else root.MFMoonBit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
