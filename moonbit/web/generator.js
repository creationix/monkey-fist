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
    const read = () => { const n = x.out_len(), out = new Array(n); for (let i = 0; i < n; i++) out[i] = x.out_get(i); return out; };
    // A board and position in the layout read_position (src/gen/gen.mbt) expects.
    const position = (b, paths, prefer = []) => {
      const list = [b.grid === 'hex' ? 1 : 0, b.W, b.H], cells = path => { list.push(path ? path.length : 0); for (const p of path || []) list.push(p.q, p.r); };
      list.push((b.ropes || []).length); (b.ropes || []).forEach(cells);
      list.push((b.mirrors || []).length); for (const m of b.mirrors || []) list.push(m.cell.q, m.cell.r, b.grid === 'hex' ? m.axis : m.slope === '\\' ? 1 : 0);
      cells(b.springs || []);
      list.push(paths.length); paths.forEach(cells);
      list.push(prefer.length, ...prefer);
      x.in_reset(); for (const n of list) x.in_push(n);
    };
    const board = (made, what) => {
      if (!made) throw Error('No board fits ' + what);
      return decode(read(), x.outf_get);
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
      // A plan from paths (game-engine.js guide): { solved: true, false, or null
      // when the budget ran out, moves, nodes }.
      guide(b, paths, budget = 900, prefer = []) {
        position(b, paths, prefer); x.guide(budget);
        const out = read();
        return { solved: out[0] === 1 ? true : out[0] === 0 ? false : null, moves: out.slice(2), nodes: out[1] };
      },
      // The keys ('q,r') of the mirrors and springs some rope could still reach.
      reachableFeatures(b, paths = b.ropes, budget = 10000) {
        position(b, paths); x.features(budget);
        const cells = [...(b.mirrors || []).map(m => m.cell), ...(b.springs || [])];
        return read().map(i => cells[i].q + ',' + cells[i].r);
      },
    };
  };
  // base: the URL of the moonbit/ directory. Resolves to the generator, or rejects
  // if neither build loads.
  async function load(base) {
    if (typeof WebAssembly === 'object') try {
      const bytes = await (await fetch(base + 'dist/gen.wasm?v=3')).arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      return wrap(instance.exports, 'wasm-gc');
    } catch { /* No wasm-gc (Safari before 18.2): use the JS build. */ }
    if (!root.MFCore) {
      if (typeof importScripts === 'function') importScripts(base + 'dist/gen.js?v=3');
      else await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = base + 'dist/gen.js?v=3'; s.onload = resolve; s.onerror = () => reject(Error('Could not load the generator'));
        document.head.append(s);
      });
    }
    return wrap(root.MFCore, 'js');
  }
  // ready(): a Promise of the generator, loading it on first use.
  let loading = null;
  const ready = (base = 'moonbit/') => loading ||= load(base).catch(e => { loading = null; throw e; });
  const generate = options => ready().then(g => g.generate(options));
  // The JS build, synchronously: in Node, or once a page has loaded dist/gen.js.
  let sync = null;
  const local = () => sync ||= (node && !root.MFCore && require('../dist/gen.js'), wrap(root.MFCore, 'js'));
  const api = { load, wrap, decode, ready, generate, local };
  if (node) module.exports = api; else root.MFMoonBit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
