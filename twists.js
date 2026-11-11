// Seeded routed puzzles: construct ropes, search mechanic placements, replay-check the result.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const L = node ? require('./levels.js') : MFLevels;
  const M = node ? require('./mechanics.js') : root.MFMechanics;
  const VERSION = 1, cache = new Map();
  const id = (p, W) => p.y * W + p.x;
  const inside = (p, b) => p.x >= 0 && p.y >= 0 && p.x < b.W && p.y < b.H;
  function shuffle(a, rng) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function featuresFor(index) {
    if (index < 2) return ['mirrors'];
    if (index < 4) return ['gates'];
    if (index < 6) return ['springs'];
    if (index === 6) return ['mirrors', 'gates'];
    if (index === 7) return ['springs', 'mirrors'];
    if (index === 8) return ['springs', 'gates'];
    return ['springs', 'mirrors', 'gates'];
  }
  const label = kinds => kinds.map(k => ({ mirrors: 'Mirrors', gates: 'Key gates', springs: 'Springs' })[k]).join(' + ');
  function transform(level, bits) {
    const W = level.W, H = level.H, flipX = !!(bits & 1), flipY = !!(bits & 2), transpose = !!(bits & 4);
    const point = p => {
      const x = flipX ? W - 1 - p.x : p.x, y = flipY ? H - 1 - p.y : p.y;
      return transpose ? { x: y, y: x } : { x, y };
    };
    const width = transpose ? H : W, height = transpose ? W : H;
    const cell = c => { const p = point({ x: c % W, y: Math.floor(c / W) }); return id(p, width); };
    return { ...level, W: width, H: height, ropes: level.ropes.map(path => path.map(point)),
      mirrors: level.mirrors.map(m => ({ cell: cell(m.cell), slope: flipX !== flipY ? (m.slope === '/' ? '\\' : '/') : m.slope })),
      springs: level.springs.map(cell), gates: level.gates.map(g => ({ cell: cell(g.cell), key: g.key })) };
  }
  // A decoration is not enough: the certified route must hit its mirrors and springs.
  function uses(level, moves, kind) {
    let paths = level.ropes;
    for (const i of moves) {
      const next = M.tap(level, paths, i); if (!next) return false;
      if (kind === 'springs' && next.event === 'bounce') return true;
      if (kind === 'mirrors' && next.route.slice(paths[i].length).some(p => inside(p, level) && level.mirrors.some(m => m.cell === id(p, level.W)))) return true;
      if (kind === 'gates' && next.route.slice(paths[i].length).some(p => inside(p, level) && level.gates.some(g => g.cell === id(p, level.W) && !paths[g.key]))) return true;
      paths = next.paths;
    }
    return false;
  }
  // The key exits before the certified route first crosses this cell. The gate must
  // also change an available move while closed, rather than being an irrelevant tile.
  function addGate(level, moves, empty, rng) {
    const candidates = [], states = [];
    let paths = level.ropes;
    const exited = [];
    for (const i of moves) {
      states.push(paths);
      const next = M.tap(level, paths, i); if (!next) return null;
      for (const p of next.route.slice(paths[i].length)) {
        const cell = id(p, level.W);
        if (!inside(p, level) || !empty.includes(cell)) continue;
        for (const key of exited) if (key !== i) candidates.push({ cell, key });
      }
      if (next.event === 'exit') exited.push(i);
      paths = next.paths;
    }
    for (const gate of shuffle(candidates, rng)) {
      const variant = { ...level, gates: [gate] };
      // Reject a gate crossed earlier in the replay by another rope.
      if (!M.replay(variant, moves).solved) continue;
      const relevant = states.some(state => state[gate.key] && state.some((p, i) => {
        if (!p) return false;
        const a = M.tap(level, state, i), b = M.tap(variant, state, i);
        return JSON.stringify(a && [a.event, a.paths[i]]) !== JSON.stringify(b && [b.event, b.paths[i]]);
      }));
      if (relevant) return variant;
    }
    return null;
  }
  function certify(level, fallback, kinds) {
    const best = M.minimum(level, 1800, fallback);
    if (best.par === null || !M.replay(level, best.moves).solved ||
        kinds.some(k => !uses(level, best.moves, k))) return null;
    return { ...level, solution: best.moves, par: best.par, parExact: best.exact };
  }
  // Bounded constructive escape hatch, not a stored board. A randomly bent,
  // x-monotone rope has a clear reverse exit; a spring sends it there. Optional
  // mirrors turn that exit, and a separate random key opens the forward gate.
  function construct(rng, kinds, big) {
    const W = (big ? 14 : 11) + Math.floor(rng() * 4), H = 7 + Math.floor(rng() * (big ? 7 : 4));
    const row = 2 + Math.floor(rng() * 2), tailRow = row + Math.floor(rng() * (H - row - 1));
    const path = [{ x: 2, y: tailRow }, { x: 3, y: tailRow }, { x: 4, y: tailRow }];
    let y = tailRow;
    for (let x = 5; x <= W - 5; x++) {
      path.push({ x, y });
      const target = x === W - 5 ? row : row + Math.floor(rng() * (H - row - 1));
      while (y !== target) { y += Math.sign(target - y); path.push({ x, y }); }
    }
    path.push({ x: W - 4, y });
    const level = { W, H, ropes: [path], mirrors: [], springs: [], gates: [] };
    if (kinds.includes('springs')) level.springs.push(row * W + W - 2);
    if (kinds.includes('mirrors')) level.mirrors.push(kinds.includes('springs') ?
      { cell: tailRow * W + 1, slope: '\\' } : { cell: row * W + W - 2, slope: '/' });
    if (kinds.includes('gates')) {
      const keyY = 1 + Math.floor(rng() * (H - 2));
      level.ropes.push([{ x: W - 1, y: keyY + 1 }, { x: W - 1, y: keyY }]);
      level.gates.push({ cell: row * W + W - 3, key: 1 });
    }
    const moves = kinds.includes('gates') ? [1, 0] : [0];
    if (kinds.includes('springs')) moves.push(0);
    const verified = certify(level, moves, kinds);
    if (!verified) throw new Error('Invalid procedural Twists construction');
    return transform(verified, Math.floor(rng() * 8));
  }
  function generate(d) {
    const kinds = featuresFor(d.index), rng = L.mulberry32(L.hashString('twists/' + VERSION + '|' + d.seed + '|' + d.index + '|' + !!d.big));
    let searches = 0;
    for (let attempt = 0; attempt < 36 && searches < 100; attempt++) {
      const target = 10 + Math.min(d.index, 20) + (d.big ? 10 : 0);
      const cfg = L.plan(rng, target, target + 10, d.big, attempt, true);
      const base = L.weave(L.mulberry32(cfg.seed), cfg);
      if (!base || base.ropes.length > (d.big ? 12 : 10)) continue;
      let level = { W: base.W, H: base.H, ropes: base.ropes, mirrors: [], springs: [], gates: [] }, moves = base.taps;
      const occupied = new Set(base.ropes.flat().map(p => id(p, base.W)));
      let empty = shuffle(Array.from({ length: base.W * base.H }, (_, c) => c).filter(c => !occupied.has(c)), rng), ok = true;
      for (const kind of kinds) {
        if (kind === 'gates') {
          const gated = addGate(level, moves, empty, rng);
          if (!gated) { ok = false; break; }
          level = gated; continue;
        }
        let found = false;
        for (const cell of empty.slice(0, 12)) {
          for (const slope of kind === 'mirrors' ? shuffle(['/', '\\'], rng) : ['']) {
            if (++searches > 100) break;
            const variant = { ...level, [kind]: kind === 'mirrors' ? [{ cell, slope }] : [cell] };
            const solution = M.solve(variant, variant.ropes, 500);
            if (!solution.solved || !uses(variant, solution.moves, kind) ||
                kinds.some(k => k !== 'gates' && level[k].length && !uses(variant, solution.moves, k))) continue;
            level = variant; moves = solution.moves; empty = empty.filter(c => c !== cell); found = true; break;
          }
          if (found || searches > 100) break;
        }
        if (!found) { ok = false; break; }
      }
      if (ok) {
        const verified = certify(level, moves, kinds);
        if (verified) return { ...verified, construction: 'weave' };
      }
    }
    return { ...construct(rng, kinds, d.big), construction: 'corridor' };
  }
  function generateSet(opts) {
    const seed = L.cleanSeed(opts.seed) || 'MONKEYFIST', count = [...L.SET_COUNTS, 12].includes(opts.count) ? opts.count : 20, big = !!opts.big;
    const config = { seed, mode: 'T', count, big, slide: true };
    return { ...config, code: L.encodeCode(config), levels: Array.from({ length: count }, (_, index) =>
      ({ twist: true, index, seed, big, difficulty: index + 1, title: label(featuresFor(index)) })) };
  }
  function levelFrom(d) {
    const key = d.seed + '|' + d.index + '|' + !!d.big;
    if (!cache.has(key)) {
      const definition = generate(d);
      definition.title = label(featuresFor(d.index));
      definition.note = d.index < 2 ? 'Two-sided mirrors turn a rope 90°. Its body follows the head.' :
        d.index < 4 ? 'Free a lettered key rope to open its matching gate.' : d.index < 6 ?
        'A spring swaps head and tail on contact. Once all ropes have clear exits, they leave automatically.' :
        'Plan your exits around the mirrors, key gates, and springs. Every move is still a simple tap.';
      if (cache.size >= 64) cache.delete(cache.keys().next().value);
      cache.set(key, definition);
    }
    const definition = cache.get(key);
    return { W: definition.W, H: definition.H, ropes: definition.ropes, definition, twist: true,
      best: definition.solution.slice(), taps: definition.solution.slice(), par: definition.par, parExact: definition.parExact };
  }
  const api = { VERSION, featuresFor, uses, construct, transform, generateSet, levelFrom };
  if (node) module.exports = api; else root.MFTwists = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
