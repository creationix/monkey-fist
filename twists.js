// Seeded routed puzzles: construct ropes, search mechanic placements, replay-check the result.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const L = node ? require('./levels.js') : MFLevels;
  const M = node ? require('./mechanics.js') : root.MFMechanics;
  const C = node ? require('./twist-circuits.js') : root.MFTwistCircuits;
  const { shuffle } = node ? require('./random.js') : root.MFRandom;
  const VERSION = 3, cache = new Map();
  const id = (p, W) => p.y * W + p.x;
  const inside = (p, b) => p.x >= 0 && p.y >= 0 && p.x < b.W && p.y < b.H;
  function featuresFor(index) {
    if (index < 2) return ['mirrors'];
    if (index < 4) return ['gates'];
    if (index < 6) return ['springs'];
    if (index === 6) return ['mirrors', 'gates'];
    if (index === 7) return ['springs', 'mirrors'];
    if (index === 8) return ['springs', 'gates'];
    return ['springs', 'mirrors', 'gates'];
  }
  function progressiveFeatures(index, count) {
    return L.progressiveStage(index, count) < 8 ? [] : ['gates'];
  }
  function integrate(set) {
    if (!['C', 'E', 'N', 'H', 'X'].includes(set.mode) || !set.slide) return set;
    return { ...set, levels: set.levels.map((base, index) => {
      const kinds = progressiveFeatures(index, set.levels.length);
      const limit = { E: 2, N: 4, C: 6, H: 6, X: 8 }[set.mode];
      return kinds.length ? { twist: true, locks: true, base, kinds, index, seed: set.seed, big: set.big,
        lockCount: Math.min(limit, Math.floor(L.progressiveStage(index, set.levels.length) / 8)),
        difficulty: base.difficulty, title: 'Ropes & locks' } : base;
    }) };
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
      if (level.gates.some(g => g.cell === gate.cell || g.key === gate.key)) continue;
      const variant = { ...level, gates: [...level.gates, gate] };
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
    const n = level.ropes.length;
    // Never exhaustively enumerate a large board just to display a par. Its
    // certificate remains playable; the UI labels an unproved par as best known.
    const best = M.minimum(level, n <= 10 ? 1800 : n <= 18 ? 150 : 35, fallback);
    if (best.par === null || !M.replay(level, best.moves).solved ||
        kinds.some(k => !uses(level, best.moves, k))) return null;
    return { ...level, solution: best.moves, par: best.par, parExact: best.exact };
  }
  // Bounded constructive escape hatch, not a stored board. A randomly bent,
  // x-monotone rope has a clear reverse exit; a spring sends it there. Optional
  // mirrors turn that exit, and a separate random key opens the forward gate.
  function construct(rng, kinds, big, size = {}) {
    const W = Math.max(11, size.W || (big ? 14 : 11) + Math.floor(rng() * 4)), H = Math.max(7, size.H || 7 + Math.floor(rng() * (big ? 7 : 4)));
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
  // Grow a full puzzle backwards from a certified mechanic route. Each new rope
  // can exit first; later additions may block earlier ones, building dependency
  // chains. The extended certificate follows by induction, without a global search.
  function grow(level, rng) {
    const occupied = new Set(level.ropes.flat().map(p => id(p, level.W)));
    const tiles = new Set([...level.springs, ...level.mirrors.map(m => m.cell), ...level.gates.map(g => g.cell)]);
    const ropes = level.ropes.slice(), moves = level.solution.slice(), area = level.W * level.H;
    for (let attempt = 0; attempt < area * 10 && occupied.size < area * .8; attempt++) {
      const cell = Math.floor(rng() * area); if (occupied.has(cell) || tiles.has(cell)) continue;
      const path = [{ x: cell % level.W, y: Math.floor(cell / level.W) }], used = new Set([cell]);
      const want = 3 + Math.floor(rng() * 6);
      while (path.length < want) {
        const p = path[path.length - 1];
        const choices = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy }))
          .filter(q => inside(q, level) && !occupied.has(id(q, level.W)) && !tiles.has(id(q, level.W)) && !used.has(id(q, level.W)));
        if (!choices.length) break;
        const q = choices[Math.floor(rng() * choices.length)]; path.push(q); used.add(id(q, level.W));
      }
      if (path.length < 3) continue;
      const i = ropes.length, variant = { ...level, ropes: ropes.concat([path]) };
      const next = M.tap(variant, variant.ropes, i);
      if (!next || next.event !== 'exit') continue;
      ropes.push(path); moves.unshift(i); for (const c of used) occupied.add(c);
    }
    return { ...level, ropes, solution: moves };
  }
  function generate(d) {
    if (d.locks) return generateLocks(d);
    const kinds = d.kinds || featuresFor(d.index), rng = L.mulberry32(L.hashString('twists/' + VERSION + '|' + d.seed + '|' + d.index + '|' + !!d.big));
    // Standalone Twists climbs into the same board sizes as the main campaign.
    const target = Math.min(d.big ? 600 : 300, 10 + d.index * (d.big ? 10 : 5));
    let size = d.base ? { W: d.base.W, H: d.base.H } : L.plan(rng, target, target + 12, d.big, 0, true);
    // Advanced boards are built around connected mechanic routes, not decorated
    // after the ordinary weaving generator has already decided their solution.
    if (size.W * size.H >= 70 && (kinds.length >= 2 || kinds.includes('springs'))) {
      let circuit = C.generate(rng, size.W, size.H, kinds);
      if (!circuit) circuit = C.generate(rng, Math.max(size.W, 10), Math.max(size.H, 14), kinds);
      if (!circuit) throw Error('Could not construct a connected Twists circuit');
      const par = M.score(circuit, circuit.solution);
      if (par === null || !M.replay(circuit, circuit.solution).solved) throw Error('Unverified Twists circuit');
      return { ...circuit, par, parExact: false };
    }
    let searches = 0;
    for (let attempt = 0; attempt < 12 && searches < 45; attempt++) {
      const cfg = d.base && attempt === 0 ? { ...d.base, W: d.base.boardW, H: d.base.boardH } :
        L.plan(rng, d.base ? Math.max(10, d.difficulty - 8) : target, d.base ? d.difficulty + 12 : target + 12, d.big, attempt, true);
      const base = L.weave(L.mulberry32(cfg.seed), cfg);
      if (!base) continue;
      size = { W: base.W, H: base.H };
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
            if (++searches > 45) break;
            const variant = { ...level, [kind]: kind === 'mirrors' ? [{ cell, slope }] : [cell] };
            const unchanged = M.replay(variant, moves);
            const solution = unchanged.solved ? { solved: true, moves } : M.solve(variant, variant.ropes, 100, moves);
            if (!solution.solved || !uses(variant, solution.moves, kind) ||
                kinds.some(k => k !== 'gates' && level[k].length && !uses(variant, solution.moves, k))) continue;
            level = variant; moves = solution.moves; empty = empty.filter(c => c !== cell); found = true; break;
          }
          if (found || searches > 45) break;
        }
        if (!found) { ok = false; break; }
      }
      if (ok) {
        const verified = certify(level, moves, kinds);
        if (verified) return { ...verified, construction: 'weave' };
      }
    }
    const fallback = grow(construct(rng, kinds, d.big, size), rng);
    // An alternate short route may bypass a tile. Keep the construction's
    // certificate in that case, rather than failing a perfectly playable seed.
    const verified = certify(fallback, fallback.solution, kinds) ||
      { ...fallback, par: M.score(fallback, fallback.solution), parExact: false };
    if (verified.par === null || !M.replay(verified, verified.solution).solved) throw new Error('Invalid grown Twists certificate');
    return { ...verified, construction: 'grown' };
  }
  // Retain the ordinary woven puzzle, including its sliding knots and traps.
  // Gates add certified dependencies without changing any rope's direction.
  function generateLocks(d) {
    const base = L.weave(L.mulberry32(d.base.seed), { ...d.base, W: d.base.boardW, H: d.base.boardH });
    const rng = L.mulberry32(L.hashString('locks/1|' + d.seed + '|' + d.index + '|' + !!d.big));
    function decorate(level) {
      const occupied = new Set(level.ropes.flat().map(p => id(p, level.W)));
      const empty = Array.from({ length: level.W * level.H }, (_, c) => c).filter(c => !occupied.has(c));
      for (let n = 0; n < d.lockCount; n++) {
        const next = addGate(level, base.taps, empty, rng); if (!next) break;
        level = next;
      }
      return level;
    }
    let level = decorate({ W: base.W, H: base.H, ropes: base.ropes, mirrors: [], springs: [], gates: [] });
    // Tiny, almost-full introductions may have no spare lane cell. Add an empty
    // border rather than replace their woven puzzle with a different mechanic.
    if (!level.gates.length) level = decorate({ W: base.W + 2, H: base.H + 2, offset: 1,
      ropes: base.ropes.map(path => path.map(p => ({ x: p.x + 1, y: p.y + 1 }))), mirrors: [], springs: [], gates: [] });
    let certificate = base.taps;
    // A fully ordered introductory tangle can have no useful extra dependency
    // between its existing ropes. Give it a new key in the empty border instead.
    if (!level.gates.length) {
      const corners = [
        [{ x: 0, y: 1 }, { x: 0, y: 0 }],
        [{ x: level.W - 1, y: 1 }, { x: level.W - 1, y: 0 }],
        [{ x: 0, y: level.H - 2 }, { x: 0, y: level.H - 1 }],
        [{ x: level.W - 1, y: level.H - 2 }, { x: level.W - 1, y: level.H - 1 }]
      ];
      for (const path of shuffle(corners, rng)) {
        const key = level.ropes.length, candidate = { ...level, ropes: level.ropes.concat([path]) };
        const occupied = new Set(candidate.ropes.flat().map(p => id(p, candidate.W)));
        const empty = Array.from({ length: candidate.W * candidate.H }, (_, c) => c).filter(c => !occupied.has(c));
        const moves = [key, ...base.taps], gated = addGate(candidate, moves, empty, rng);
        if (gated) { level = gated; certificate = moves; break; }
      }
    }
    const best = M.minimum(level, level.ropes.length <= 10 ? 1800 : 80, certificate);
    if (best.par === null || !M.replay(level, best.moves).solved) throw Error('Unverified lock puzzle');
    return { ...level, solution: best.moves, par: best.par, parExact: best.exact, construction: 'locks',
      note: 'Free a lettered rope to open its matching lock. You can tap other ropes while it moves.' };
  }
  function generateSet(opts) {
    const seed = L.cleanSeed(opts.seed) || 'MONKEYFIST', count = [...L.SET_COUNTS, 12].includes(opts.count) ? opts.count : 20, big = !!opts.big;
    const config = { seed, mode: 'T', count, big, slide: true };
    return { ...config, code: L.encodeCode(config), levels: Array.from({ length: count }, (_, index) =>
      ({ twist: true, index, seed, big, difficulty: index + 1, title: label(featuresFor(index)) })) };
  }
  function levelFrom(d) {
    const key = JSON.stringify([d.seed, d.index, !!d.big, d.base || null, d.kinds || null, d.lockCount || 0]);
    if (!cache.has(key)) {
      const definition = generate(d);
      const kinds = d.kinds || featuresFor(d.index);
      definition.title = label(kinds);
      definition.note = kinds.length === 1 && kinds[0] === 'mirrors' ? 'Two-sided mirrors turn a rope 90°. Its body follows the head.' :
        kinds.length === 1 && kinds[0] === 'gates' ? 'Free a lettered key rope to open its matching gate.' : kinds.length === 1 && kinds[0] === 'springs' ?
        'A spring swaps head and tail on contact. Once all ropes have clear exits, they leave automatically.' :
        'Plan your exits around the mirrors, key gates, and springs. Every move is still a simple tap.';
      if (definition.circuit && kinds.includes('gates')) definition.note = 'The keys are tangled too. Open their routes, then free the ropes waiting behind them.';
      if (d.locks) definition.note = 'Free a lettered rope to open its matching lock. You can tap other ropes while it moves.';
      if (cache.size >= 64) cache.delete(cache.keys().next().value);
      cache.set(key, definition);
    }
    const definition = cache.get(key);
    return { W: definition.W, H: definition.H, ropes: definition.ropes, definition, twist: true,
      best: definition.solution.slice(), taps: definition.solution.slice(), par: definition.par, parExact: definition.parExact };
  }
  const api = { VERSION, featuresFor, progressiveFeatures, integrate, uses, construct, grow, transform, generateSet, levelFrom };
  if (node) module.exports = api; else root.MFTwists = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
