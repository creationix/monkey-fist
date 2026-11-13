// Rope count chooses size. Player taps per rope chooses difficulty. Every
// construction carries a replayable certificate; no boards are stored here.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const L = node ? require('./levels.js') : MFLevels;
  const H = node ? require('./hex/engine.js') : root.MFHex;
  const C = node ? require('./twist-circuits.js') : root.MFTwistCircuits;
  const R = node ? require('./hex/mirrors.js') : root.MFHexMirrors;
  const point = (q, r) => ({ q, r });
  const key = H.key, pick = (rng, n) => Math.floor(rng() * n);
  const ratio = d => .1 + 2.9 * Math.pow((d - 1) / 99, 1.6);
  function frame(b) {
    const points = [...b.ropes.flat(), ...b.springs, ...b.mirrors.map(m => m.cell)];
    const y0 = Math.min(...points.map(p => p.r)) - 1;
    // Hex uses an offset rectangular viewport, while the rules use axial cells.
    const x0 = Math.min(...points.map(p => p.q + (b.grid === 'hex' ? Math.floor((p.r - y0) / 2) : 0))) - 1;
    const move = p => point(p.q - x0, p.r - y0);
    const moved = points.map(move);
    return { ...b, W: Math.max(...moved.map(p => p.q + (b.grid === 'hex' ? Math.floor(p.r / 2) : 0))) + 2,
      H: Math.max(...moved.map(p => p.r)) + 2, ropes: b.ropes.map(path => path.map(move)), springs: b.springs.map(move), mirrors: b.mirrors.map(m => ({ ...m, cell: move(m.cell) })) };
  }
  // A small number of vertical keys holds a whole fan of winding ropes. Unlike
  // independent free exits, removing a key really unlocks the automatic suffix.
  function fan(grid, n, taps, rng, mirrors = false, springs = false) {
    const k = Math.max(1, Math.min(n - 1, taps)), f = n - k, ropes = [];
    for (let j = 0; j < k; j++) {
      const path = [point(j * 2, f * 2 + 1)];
      for (let r = f * 2; r >= 0; r--) {
        const q = j * 2 + Number(!mirrors && !springs && (r % 4 === 2 || r % 4 === 1));
        if (path.at(-1).q !== q) path.push(point(q, path.at(-1).r));
        path.push(point(q, r));
      }
      // A straight last segment ensures the keys face the clear upper edge.
      path.push(point(j * 2, -1)); ropes.push(path);
    }
    for (let j = 0; j < f; j++) {
      const path = [], length = 3 + pick(rng, 6), row = j * 2 + 1;
      let r = row;
      for (let q = -length; q <= -2; q++) {
        path.push(point(q, r));
        if (q < -2 && rng() < .5) { r = r === row ? row + 1 : row; path.push(point(q, r)); }
      }
      if (r !== row) path.push(point(-2, row));
      path.push(point(-1, row)); ropes.push(path);
    }
    return frame({ grid, ropes, plan: [...(springs ? [0] : []), ...Array.from({ length: n }, (_, i) => i)],
      springs: springs ? [point(mirrors ? 3 : 0, -3)] : [],
      mirrors: mirrors ? [{ cell: point(0, -3), ...(grid === 'hex' ? { axis: 2 } : { slope: '/' }) }] : [], locks: [] });
  }
  // Two interleaved tails form a zipper. Alternating slides uncover one more
  // step each time. Its depth is independent of how many ropes a board contains.
  function zipper(grid, depth, rng, G, extra = false) {
    const a = [], b = [], left = -depth - (extra ? 5 : 3) - pick(rng, 4), bottom = 2 + pick(rng, 3);
    for (let r = 1; r <= depth; r++) a.push(point(0, r));
    for (let q = -1; q >= left; q--) a.push(point(q, depth));
    for (let r = depth - 1; r >= 0; r--) a.push(point(left, r));
    for (let q = left + 1; q <= -depth - 2; q++) a.push(point(q, 0));
    for (let q = -depth; q <= -1; q++) b.push(point(q, 0));
    for (let r = -1; r >= -bottom; r--) b.push(point(-1, r));
    b.push(point(0, -bottom)); for (let r = 1 - bottom; r <= -1; r++) b.push(point(0, r));
    const swap = rng() < .5, orient = p => swap ? point(p.r, -p.q) : point(p.q, -p.r);
    const paths = [a, b];
    if (extra) paths.push([point(left + 1, -3), point(left + 1, -2), point(left + 1, -1)]);
    const level = frame({ grid, ropes: paths.map(path => path.map(orient)), mirrors: [], springs: [], locks: [] });
    const solved = G.solve(level, level.ropes, 2000);
    if (!solved.solved) throw Error('Invalid zipper construction');
    return { ...level, plan: solved.moves };
  }
  function features(grid, n, difficulty, mirrors, springs, rng, G) {
    const size = Math.max(11, Math.ceil(Math.sqrt(n * 26))), stage = Math.round(difficulty * .59);
    const core = Math.max(1, Math.min(n - 1, 1 + Math.floor((n - 2) * difficulty / 300), 5));
    for (let attempt = 0; attempt < 32; attempt++) {
      let b;
      if (grid === 'hex') {
        const raw = R.skeleton(rng, size, size + 2, core, mirrors ? 2 : 0, springs, 4, true);
        if (!raw) continue;
        b = { ...R.populate(raw, rng, stage, n), grid };
      } else {
        const kinds = [mirrors && 'mirrors', springs && 'springs'].filter(Boolean);
        const raw = C.skeleton(rng, size, size + 2, kinds, core); if (!raw) continue;
        const grown = C.populate(raw, rng, n), p = cell => point(cell % size, Math.floor(cell / size));
        b = { ...grown, grid, ropes: grown.ropes.map(path => path.map(p => point(p.x, p.y))),
          mirrors: grown.mirrors.map(m => ({ cell: p(m.cell), slope: m.slope })), springs: grown.springs.map(p), plan: grown.solution, locks: [] };
      }
      if (b.ropes.length !== n) continue;
      let paths = b.ropes, okay = true, hitMirror = !mirrors, hitSpring = !springs;
      for (const i of b.plan) {
        const move = G.tap(b, paths, i); if (!move) { okay = false; break; }
        if (move.event === 'bounce') hitSpring = true;
        if (move.route.slice(paths[i].length).some(p => b.mirrors.some(m => key(m.cell) === key(p)))) hitMirror = true;
        paths = move.paths;
      }
      if (okay && hitMirror && hitSpring && paths.every(p => !p) && !G.allFree(b, b.ropes)) return b;
    }
    return null;
  }
  function weave(grid, n, d, rng) {
    const W = Math.max(5, Math.ceil(Math.sqrt(n * 17 * .8))), height = Math.ceil(n * 17 / W);
    if (grid === 'hex') return { ...H.build(rng, { W, H: height, stage: 25, length: 22, knots: Math.round(n * d / 180), coverage: .8, tapDepth: d / 20, ropeCount: n }), grid, mirrors: [], springs: [] };
    const cfg = { ...L.plan(rng, 0, 100000, false, 0, true), W, H: height, lenLo: 4, lenHi: 22, minLen: 3, lo: 0, hi: 100000,
      wantAvg: d / 20, floor: 0, cover: .8, bends: 1, slide: true, tie: Math.round(n * d / 180), bait: Math.round(n * d / 300), pull: 5, tapDepth: d / 20, ropeCount: n };
    const raw = L.weave(rng, cfg); if (!raw) return null;
    return { W: raw.W, H: raw.H, ropes: raw.ropes.map(path => path.map(p => point(p.x, p.y))), plan: raw.taps, grid, mirrors: [], springs: [], locks: [] };
  }
  function decorate(b, mirrors, springs, rng, G) {
    let paths = b.ropes;
    for (let step = 0; step < b.plan.length; step++) {
      const i = b.plan[step], move = G.tap(b, paths, i);
      if (move.event === 'exit') {
        const end = move.route.at(-1), previous = move.route.at(-2), dq = end.q - previous.q, dr = end.r - previous.r;
        for (let attempt = 0; attempt < 8; attempt++) {
          const gap = 2 + attempt - paths[i].length, cell = point(end.q + dq * gap, end.r + dr * gap);
          let out = [dq, dr], mirror;
          if (mirrors) {
            if (b.grid === 'hex') {
              const incoming = H.DIRS.findIndex(d => d[0] === dq && d[1] === dr);
              const axis = (incoming + 1 + pick(rng, 2)) % 3;
              out = H.DIRS[(2 * axis - incoming + 6) % 6]; mirror = { cell, axis };
            } else { const slope = rng() < .5 ? '/' : '\\'; out = slope === '/' ? [-dr, -dq] : [dr, dq]; mirror = { cell, slope }; }
          }
          const spring = point(cell.q + out[0] * (2 + attempt), cell.r + out[1] * (2 + attempt));
          const plan = b.plan.slice(); if (springs) plan.splice(step + 1, 0, i);
          const variant = frame({ ...b, plan, mirrors: mirror ? [mirror] : [], springs: springs ? [spring] : [] });
          if (G.replay(variant, plan).solved) return variant;
        }
      }
      paths = move.paths;
    }
    return null;
  }
  function rooms(grid, n, d, mirrors, springs, rng, G) {
    if (n <= 3 && (mirrors || springs)) {
      const base = zipper(grid, Math.max(1, Math.round(ratio(d) * n) - (n % 2 ? 2 : 1)), rng, G, n % 2 === 1);
      if (n === 2 || n === 3) return decorate(base, mirrors, springs, rng, G);
    }
    const modules = [], hasFeatures = mirrors || springs;
    let feature = null, remaining = n;
    if (hasFeatures) {
      const count = n % 2 ? 3 : 2;
      feature = features(grid, count, d, mirrors, springs, rng, G);
      if (!feature) return null; remaining -= count;
    }
    const pairs = Math.floor(remaining / 2);
    const depth = Math.max(1, Math.min(8, Math.round((ratio(d) * n - (feature?.plan.length || 0) + 1) / Math.max(1, pairs) - 2)));
    for (let k = 0; k < pairs; k++) modules.push(zipper(grid, Math.max(1, depth + pick(rng, 3) - 1), rng, G));
    if (remaining % 2 && pairs) modules.splice(modules.length - 1, 1, zipper(grid, depth + 1, rng, G, true)); // 2p+1 = 2(p-1)+3
    if (feature) modules.push(feature); // Bottom-left: its tiles cannot reroute any earlier exit.
    if (!modules.length) return null;
    const columns = Math.max(1, Math.round(Math.sqrt(modules.length)));
    const w = Math.max(...modules.map(b => b.W)) + 2, h = Math.max(...modules.map(b => b.H)) + 2;
    let level = { grid, ropes: [], mirrors: [], springs: [], locks: [], plan: [] };
    for (let i = 0; i < modules.length; i++) {
      const b = modules[i], r = Math.floor(i / columns) * h, q = (columns - 1 - i % columns) * w - (grid === 'hex' ? Math.floor(r / 2) : 0);
      const move = p => point(p.q + q, p.r + r), offset = level.ropes.length;
      level.ropes.push(...b.ropes.map(path => path.map(move)));
      level.mirrors.push(...b.mirrors.map(m => ({ ...m, cell: move(m.cell) }))); level.springs.push(...b.springs.map(move));
      level.plan.push(...b.plan.map(id => id + offset));
    }
    level = frame(level);
    if (level.ropes.length !== n || !G.replay(level, level.plan).solved) return null;
    return level;
  }
  function valid(b) {
    const occupied = new Set(), dirs = b.grid === 'hex' ? H.DIRS : [[1,0],[-1,0],[0,1],[0,-1]];
    for (const path of b.ropes) for (let i = 0; i < path.length; i++) {
      const p = path[i], cell = key(p);
      if (occupied.has(cell) || (b.grid === 'hex' ? !H.inside(b, p) : p.q < 0 || p.r < 0 || p.q >= b.W || p.r >= b.H)) return false;
      occupied.add(cell);
      if (i && !dirs.some(d => p.q - path[i - 1].q === d[0] && p.r - path[i - 1].r === d[1])) return false;
    }
    return true;
  }
  function generate(details, G) {
    const { grid, difficulty: d, size: n, mirrors, springs } = details;
    const rng = L.mulberry32(L.hashString('difficulty/2/' + details.seed));
    let best = null, error = Infinity;
    for (let attempt = 0; attempt < 12; attempt++) {
      let b = d <= 25 ? fan(grid, n, Math.round(n * ratio(d)), rng, mirrors, springs) : d >= 58 ? rooms(grid, n, d, mirrors, springs, rng, G) : mirrors || springs ? features(grid, n, d, mirrors, springs, rng, G) :
        d <= 25 || n < 4 ? fan(grid, n, Math.round(n * ratio(d)), rng) : weave(grid, n, d, rng);
      if (!b || b.ropes.length !== n || !valid(b) || G.allFree(b, b.ropes)) continue;
      const checked = G.replay(b, b.plan); if (!checked.solved) continue;
      const score = n <= 10 ? G.minimumTaps(b, b.plan, 1800) : { plan: b.plan, par: checked.taps, exact: false };
      const distance = Math.abs(score.par / n - ratio(d));
      if (distance < error) { error = distance; best = { ...b, ...details, mirrors: b.mirrors, springs: b.springs, locks: [], ...score }; }
      if (distance < Math.max(.1, 1 / n)) break;
    }
    if (!best) throw Error('Could not construct this size and difficulty');
    return best;
  }
  const api = { generate, ratio };
  if (node) module.exports = api; else root.MFDifficulty = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
