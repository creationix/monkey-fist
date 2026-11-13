// Fixed board dimensions. Difficulty changes dependencies and sliding depth;
// every candidate is densely packed and carries a replay-checked solution.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const L = node ? require('./levels.js') : MFLevels;
  const H = node ? require('./hex/engine.js') : root.MFHex;
  const C = node ? require('./twist-circuits.js') : root.MFTwistCircuits;
  const R = node ? require('./hex/mirrors.js') : root.MFHexMirrors;
  const point = (q, r) => ({ q, r });
  const key = H.key, pick = (rng, n) => Math.floor(rng() * n);
  const dirs = grid => grid === 'hex' ? H.DIRS : [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const cell = (grid, x, r) => point(x - (grid === 'hex' ? Math.floor(r / 2) : 0), r);
  const adjacent = (a, b, grid) => dirs(grid).some(d => b.q - a.q === d[0] && b.r - a.r === d[1]);
  const coverage = b => b.ropes.reduce((sum, path) => sum + path.length, 0) / (b.W * b.H);
  function valid(b) {
    const occupied = new Set(), features = new Set([...b.springs, ...b.mirrors.map(m => m.cell)].map(key));
    for (const path of b.ropes) {
      if (path.length < 2) return false;
      for (let i = 0; i < path.length; i++) {
        const p = path[i], at = key(p);
        if (occupied.has(at) || features.has(at) || (b.grid === 'hex' ? !H.inside(b, p) : p.q < 0 || p.r < 0 || p.q >= b.W || p.r >= b.H)) return false;
        if (i && !adjacent(path[i - 1], p, b.grid)) return false;
        occupied.add(at);
      }
    }
    return true;
  }
  function remix(path, grid, rng) {
    // Reconnect two adjacent edges and reverse the middle. This preserves a
    // Hamiltonian strand while varying its bends; its arrow stays at the edge.
    for (let k = 0; k < path.length * 3; k++) {
      const i = pick(rng, Math.max(1, path.length - 4)), j = i + 2 + pick(rng, Math.max(1, path.length - i - 4));
      if (j >= path.length - 2 || !adjacent(path[i], path[j], grid) || !adjacent(path[i + 1], path[j + 1], grid)) continue;
      path.splice(i + 1, j - i, ...path.slice(i + 1, j + 1).reverse());
    }
    return path;
  }
  function easy(grid, W, height, d, rng) {
    const ropes = [], keys = Math.max(1, Math.min(Math.floor(W / 3), 1 + Math.floor(d / 9))), span = W - keys;
    for (let x = span; x < W; x++) {
      const path = []; for (let r = height - 1; r >= 0; r--) path.push(cell(grid, x, r)); ropes.push(path);
    }
    for (let row = 0; row < height;) {
      const remaining = height - row, bands = [1, 3, 5].filter(h => h <= remaining), band = bands[pick(rng, bands.length)];
      const path = [];
      for (let r = row; r < row + band; r++) {
        const forward = (r - row) % 2 === 0;
        for (let i = 0; i < span; i++) path.push(cell(grid, forward ? i : span - 1 - i, r));
      }
      ropes.push(remix(path, grid, rng)); row += band;
    }
    if (grid === 'square') {
      const flipX = rng() < .5, flipY = rng() < .5;
      for (const path of ropes) for (const p of path) { if (flipX) p.q = W - 1 - p.q; if (flipY) p.r = height - 1 - p.r; }
    } else if (height % 2 === 0 && rng() < .5) {
      for (const path of ropes) for (const p of path) { p.q = W - 1 - (height - 2) / 2 - p.q; p.r = height - 1 - p.r; }
    }
    return { grid, W, H: height, ropes, locks: [], mirrors: [], springs: [], plan: ropes.map((_, i) => i) };
  }
  function woven(grid, W, height, d, rng) {
    const area = W * height, strength = d / 100, length = Math.max(7, Math.round(Math.min(W, height) * 2));
    if (grid === 'hex') return { ...H.build(rng, { W, H: height, stage: Math.round(d * .59), coverage: .99,
      length, minLength: 2, tapDepth: strength * 8, knots: Math.round(area / 32 * strength * strength) }), grid, mirrors: [], springs: [] };
    const cfg = { ...L.plan(rng, 0, 1000000, false, 0, true), W, H: height, keepBounds: true,
      lo: 0, hi: 1000000, lenLo: 3, lenHi: length, minLen: 2, floor: 0, cover: .99, bends: 1,
      wantAvg: strength * 7, tapDepth: strength * 8, tie: Math.round(area / 30 * strength),
      bait: Math.round(area / 70 * strength), pull: 5, slide: true };
    const raw = L.weave(rng, cfg); if (!raw) return null;
    return { W: raw.W, H: raw.H, grid, ropes: raw.ropes.map(path => path.map(p => point(p.x, p.y))),
      locks: [], mirrors: [], springs: [], plan: raw.taps };
  }
  function featured(grid, W, height, d, mirrors, springs, rng, attempt) {
    const count = attempt >= 6 ? 1 : Math.max(1, Math.min(5, Math.round(W * height / 100 * (.3 + d / 100))));
    const options = { coverage: .98, attemptsMultiplier: 24, allowEarly: true, minLength: 2, length: Math.max(8, Math.round(Math.min(W, height) * 1.5)) };
    if (grid === 'hex') {
      const raw = R.skeleton(rng, W, height, count, mirrors ? d < 35 ? 1 : 2 : 0, springs, 4, true);
      return raw && { ...R.populate(raw, rng, Math.round(d * .59), undefined, options), grid, locks: [] };
    }
    const kinds = [mirrors && 'mirrors', springs && 'springs'].filter(Boolean);
    const raw = C.skeleton(rng, W, height, kinds, count); if (!raw) return null;
    const b = C.populate(raw, rng, undefined, options), p = c => point(c % W, Math.floor(c / W));
    return { grid, W, H: height, ropes: b.ropes.map(path => path.map(p => point(p.x, p.y))), plan: b.solution,
      locks: [], core: count, springs: b.springs.map(p), mirrors: b.mirrors.map(m => ({ cell: p(m.cell), slope: m.slope })) };
  }
  function featuresUsed(b, G) {
    const wanted = new Set([...b.springs, ...b.mirrors.map(m => m.cell)].map(key));
    let paths = b.ropes;
    for (const i of b.plan) {
      const move = G.tap(b, paths, i); if (!move) return false;
      for (const p of move.route.slice(paths[i].length)) wanted.delete(key(p));
      paths = move.paths;
    }
    return wanted.size === 0;
  }
  function reorder(b, G) {
    let paths = b.ropes, prefer = b.plan, budget = Math.min(120, b.ropes.length * 6); const plan = [];
    const core = b.core || 1;
    while (paths.some(Boolean)) {
      if (G.allFree(b, paths)) { plan.push(...paths.flatMap((p, i) => p ? [i] : [])); break; }
      if (budget <= 0) { plan.push(...prefer); break; }
      const ready = current => {
        let value = 0;
        for (let i = 0; i < core; i++) if (current[i]) {
          const event = G.tap(b, current, i)?.event;
          value += event === 'exit' ? 4 : event === 'bounce' ? 3 : event === 'slide' ? 1 : 0;
        }
        return value;
      };
      const choices = paths.flatMap((p, i) => {
        const move = p && G.tap(b, paths, i);
        return move ? [{ i, move, ready: ready(move.paths), rank: prefer.indexOf(i) }] : [];
      });
      choices.sort((a, c) => c.ready - a.ready || Number(c.i < core) - Number(a.i < core) || a.rank - c.rank);
      let best = null;
      for (const candidate of choices.slice(0, 6)) {
        if (--budget < 0) break;
        const next = G.guide(b, candidate.move.paths, 0, prefer);
        if (!next.solved) continue;
        const cost = G.allFree(b, candidate.move.paths) ? 1 : 1 + G.replay(b, next.moves, candidate.move.paths).taps;
        if (!best || cost < best.cost) best = { ...candidate, cost, next };
      }
      if (!best) { plan.push(...prefer); break; }
      plan.push(best.i); paths = best.move.paths; prefer = best.next.moves;
    }
    const replayed = G.replay(b, plan);
    return replayed.solved ? { ...b, plan } : b;
  }
  function regional(b) {
    if (b.W < 8 || b.H < 8) return true;
    const area = [0,0,0,0], used = [0,0,0,0], cells = b.grid === 'hex' ? H.cells(b) : Array.from({ length: b.W * b.H }, (_, i) => point(i % b.W, Math.floor(i / b.W)));
    const zone = p => Number(p.q + (b.grid === 'hex' ? Math.floor(p.r / 2) : 0) >= b.W / 2) + 2 * Number(p.r >= b.H / 2);
    for (const p of cells) area[zone(p)]++;
    for (const path of b.ropes) for (const p of path) used[zone(p)]++;
    return area.every((n, i) => used[i] / n >= .55);
  }
  function target(d) { return .1 + 1.3 * Math.pow((d - 1) / 99, 1.25); }
  function score(b, G) {
    if (b.grid === 'square' && !b.mirrors.length && !b.springs.length) {
      const result = L.fewestPlayerTaps(b.ropes.map(path => path.map(p => ({ x: p.q, y: p.r }))), b.W, b.H, b.plan, b.ropes.length <= 12 ? 1800 : 100);
      return { plan: result.taps, par: result.count, exact: result.exact };
    }
    return b.ropes.length <= 12 ? G.minimumTaps(b, b.plan, 1200) : { plan: b.plan, par: G.replay(b, b.plan).taps, exact: false };
  }
  function generate(details, G) {
    const { grid, W, H: height, difficulty: d, mirrors, springs } = details;
    const rng = L.mulberry32(L.hashString('grid/3/' + details.seed));
    let best = null, bestValue = -Infinity;
    const minCoverage = mirrors || springs ? W * height <= 80 ? .8 : .84 : .85;
    for (let attempt = 0; attempt < (mirrors || springs ? 12 : 6); attempt++) {
      const b = mirrors || springs ? featured(grid, W, height, d, mirrors, springs, rng, attempt) : d <= 20 ? easy(grid, W, height, d, rng) : woven(grid, W, height, d, rng);
      if (!b || b.W !== W || b.H !== height || b.ropes.length < 2 || !valid(b) || G.allFree(b, b.ropes)) continue;
      const density = coverage(b); if (density < minCoverage || !regional(b)) continue;
      const replayed = G.replay(b, b.plan); if (!replayed.solved || !featuresUsed(b, G)) continue;
      const ordered = d <= 30 && (mirrors || springs) ? reorder(b, G) : b;
      const result = score(ordered, G), ratio = result.par / b.ropes.length;
      const value = density * 4 - Math.abs(ratio - target(d));
      if (value > bestValue) { bestValue = value; best = { ...b, ...details, mirrors: b.mirrors, springs: b.springs, locks: [], ...result, coverage: density }; }
      if (density >= .96 && Math.abs(ratio - target(d)) <= .2) break;
    }
    if (!best) throw Error('Could not densely weave these grid dimensions');
    return best;
  }
  const api = { generate, coverage, valid };
  if (node) module.exports = api; else root.MFGridGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
