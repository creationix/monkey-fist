// One set format and gameplay API for square and Hex. Board coordinates are q/r
// in the view; the original square kernels keep their own x/y representation.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const L = node ? require('./levels.js') : MFLevels;
  const M = node ? require('./mechanics.js') : root.MFMechanics;
  const T = node ? require('./twists.js') : root.MFTwists;
  const H = node ? require('./hex/engine.js') : root.MFHex;
  const R = node ? require('./hex/mirrors.js') : root.MFHexMirrors;
  const D = node ? require('./difficulty.js') : root.MFDifficulty;
  const J = node ? require('./journey.js') : root.MFJourney;
  const F = node ? require('./grid-generator.js') : root.MFGridGenerator;
  const K = node ? require('./grid-journey.js') : root.MFGridJourney;
  const VERSION = 1, GRID_VERSION = 4;
  const LEGACY_DEFAULT = { kind: 'journey', revision: 1, seed: 'MONKEYFIST', grid: 'mixed', count: 120, min: 1, max: 100, mirrors: true, springs: true };
  const ROPE_DEFAULT = { ...LEGACY_DEFAULT, revision: 2, sizeMin: 4, sizeMax: 60 };
  const DEFAULT = { ...LEGACY_DEFAULT, revision: 3, width: 10, height: 14 };
  const clamp = (v, lo, hi, fallback) => Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : fallback;
  function normalize(opts = {}) {
    if (opts.kind === 'journey') return { ...(opts.revision === 1 ? LEGACY_DEFAULT : opts.revision === 2 ? ROPE_DEFAULT : DEFAULT) };
    const min = clamp(opts.min, 1, 100, 1), max = clamp(opts.max, min, 100, 100);
    const fixed = opts.revision === 3, minimum = opts.mirrors || opts.springs ? 8 : 4, maximum = opts.colossal ? 48 : 24;
    const sized = !fixed && (opts.revision === 2 || opts.sizeMin != null);
    const sizeMin = clamp(opts.sizeMin, 2, 200, 6), sizeMax = clamp(opts.sizeMax, sizeMin, 200, Math.max(sizeMin, 40));
    return { ...(fixed ? { revision: 3, width: clamp(opts.width, minimum, maximum, 10), height: clamp(opts.height, minimum, maximum, 14), ...(opts.colossal ? { colossal: true } : {}) } : sized ? { revision: 2, sizeMin, sizeMax } : {}), kind: 'custom', seed: H.cleanSeed(opts.seed), grid: ['square', 'hex', 'mixed'].includes(opts.grid) ? opts.grid : 'mixed',
      count: clamp(opts.count, 1, fixed ? 200 : 500, 120), min, max, mirrors: !!opts.mirrors, springs: !!opts.springs };
  }
  function code(input) {
    const o = normalize(input);
    return o.kind === 'journey' ? 'J' + o.revision + '-MONKEYFIST' : [o.revision === 3 ? 'U3' : o.revision === 2 ? 'U2' : 'U1', { square: 'S', hex: 'H', mixed: 'M' }[o.grid], o.min, o.max, ...(o.revision === 3 ? [o.width, o.height] : o.revision === 2 ? [o.sizeMin, o.sizeMax] : []), o.count,
      (o.mirrors ? 'M' : '') + (o.springs ? 'S' : '') + (o.colossal ? 'C' : '') || 'N', o.seed].join('-');
  }
  function parseCode(text) {
    text = String(text || '').trim().toUpperCase(); if (text === 'J1-MONKEYFIST') return { ...LEGACY_DEFAULT };
    if (text === 'J2-MONKEYFIST') return { ...ROPE_DEFAULT };
    if (text === 'J3-MONKEYFIST') return { ...DEFAULT };
    const v3 = /^U3-([SHM])-(\d{1,3})-(\d{1,3})-(\d{1,2})-(\d{1,2})-(\d{1,3})-(N|M|S|MS|C|MC|SC|MSC)-([A-Z0-9]{1,12})$/.exec(text);
    if (v3) {
      const minimum = /[MS]/.test(v3[7]) ? 8 : 4, maximum = v3[7].includes('C') ? 48 : 24;
      if (+v3[2] < 1 || +v3[3] > 100 || +v3[2] > +v3[3] || +v3[4] < minimum || +v3[4] > maximum || +v3[5] < minimum || +v3[5] > maximum || +v3[6] < 1 || +v3[6] > 200) return null;
      return normalize({ revision: 3, grid: { S: 'square', H: 'hex', M: 'mixed' }[v3[1]], min: +v3[2], max: +v3[3], width: +v3[4], height: +v3[5], count: +v3[6], mirrors: v3[7].includes('M'), springs: v3[7].includes('S'), colossal: v3[7].includes('C'), seed: v3[8] });
    }
    const v2 = /^U2-([SHM])-(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})-(N|M|S|MS)-([A-Z0-9]{1,12})$/.exec(text);
    if (v2) {
      if (+v2[2] < 1 || +v2[3] > 100 || +v2[2] > +v2[3] || +v2[4] < 2 || +v2[5] > 200 || +v2[4] > +v2[5] || +v2[6] < 1 || +v2[6] > 500) return null;
      return normalize({ revision: 2, grid: { S: 'square', H: 'hex', M: 'mixed' }[v2[1]], min: +v2[2], max: +v2[3], sizeMin: +v2[4], sizeMax: +v2[5], count: +v2[6], mirrors: v2[7].includes('M'), springs: v2[7].includes('S'), seed: v2[8] });
    }
    const m = /^U1-([SHM])-(\d{1,3})-(\d{1,3})-(\d{1,3})-(N|M|S|MS)-([A-Z0-9]{1,12})$/.exec(text);
    if (m) {
      if (+m[2] < 1 || +m[3] > 100 || +m[2] > +m[3] || +m[4] < 1 || +m[4] > 500) return null;
      return normalize({ grid: { S: 'square', H: 'hex', M: 'mixed' }[m[1]], min: +m[2], max: +m[3], count: +m[4], mirrors: m[5].includes('M'), springs: m[5].includes('S'), seed: m[6] });
    }
    // Old shared links open the matching settings in the unified custom screen.
    const hex = H.parseCode(text); if (hex) return normalize({ ...hex, grid: 'hex', min: 1, max: hex.big ? 100 : 80 });
    const square = L.parseCode(text);
    if (square) { const ranges = { C: [1, 100], E: [1, 20], N: [20, 50], H: [50, 80], X: [80, 100], T: [25, 80] }, range = ranges[square.mode];
      return normalize({ ...square, grid: 'square', min: range[0], max: range[1], mirrors: square.mode === 'T', springs: square.mode === 'T' }); }
    return null;
  }
  function spec(input, index) {
    const o = normalize(input), i = clamp(index, 0, o.count - 1, 0), journey = o.kind === 'journey';
    if (o.revision === 3 && journey) return { ...K[i], index: i };
    if (o.revision === 3) return { grid: o.grid === 'mixed' ? i % 2 ? 'hex' : 'square' : o.grid, difficulty: o.min + (o.max - o.min) * i / Math.max(1, o.count - 1), ...(o.colossal ? { colossal: true } : {}), W: o.width, H: o.height, seed: L.hashString('grid/3/' + code(o) + '/' + i).toString(36).toUpperCase(), index: i, mirrors: o.mirrors, springs: o.springs };
    if (o.revision === 2 && journey) return { ...J[i], index: i };
    if (o.revision === 2) {
      const seed = L.hashString('independent/2/' + code(o) + '/' + i).toString(36).toUpperCase();
      const rng = L.mulberry32(L.hashString('size/2/' + o.seed + '/' + o.grid + '/' + i));
      return { grid: o.grid === 'mixed' ? i % 2 ? 'hex' : 'square' : o.grid, difficulty: o.min + (o.max - o.min) * i / Math.max(1, o.count - 1), size: o.sizeMin + Math.floor(rng() * (o.sizeMax - o.sizeMin + 1)), seed, index: i, mirrors: o.mirrors, springs: o.springs };
    }
    let grid = o.grid === 'mixed' ? i < 5 ? 'square' : i < 10 ? 'hex' : i % 2 ? 'hex' : 'square' : o.grid;
    if (o.grid === 'mixed' && o.count < 10) grid = i % 2 ? 'hex' : 'square';
    const difficulty = journey ? i < 10 ? 1 + (i % 5) * 1.5 : 7 + 93 * Math.pow((i - 10) / 109, 1.15) : o.min + (o.max - o.min) * i / Math.max(1, o.count - 1);
    return { grid, difficulty, index: i, mirrors: o.mirrors && (!journey || i >= 30 && i % 10 >= 4),
      springs: o.springs && (!journey || i >= 60 && [2, 7].includes(i % 10)),
      seed: L.hashString('unified/' + VERSION + '/' + code(o) + '/' + i).toString(36).toUpperCase() };
  }
  const xy = paths => paths.map(path => path && path.map(p => ({ x: p.q, y: p.r })));
  const qr = paths => paths.map(path => path && path.map(p => ({ q: p.x, r: p.y })));
  const featured = b => !!(b.mirrors?.length || b.springs?.length);
  const nativeCache = new WeakMap();
  function native(b) {
    if (!nativeCache.has(b)) nativeCache.set(b, { W: b.W, H: b.H,
      mirrors: (b.mirrors || []).map(m => ({ cell: m.cell.r * b.W + m.cell.q, slope: m.slope })),
      springs: (b.springs || []).map(p => p.r * b.W + p.q), gates: [] });
    return nativeCache.get(b);
  }
  function fromSquare(raw, details) {
    const definition = raw.definition || raw;
    const point = c => ({ q: c % raw.W, r: Math.floor(c / raw.W) });
    return { ...details, W: raw.W, H: raw.H, ropes: qr(raw.ropes), locks: [],
      mirrors: (definition.mirrors || []).map(m => ({ cell: point(m.cell), slope: m.slope })), springs: (definition.springs || []).map(point),
      plan: (raw.best || raw.taps).slice(), par: raw.par, exact: !!raw.parExact };
  }
  function tap(b, paths, i) {
    if (b.grid === 'hex') return (featured(b) ? R : H).tap(b, paths, i);
    const move = M.tap(native(b), xy(paths), i);
    return move && { ...move, paths: qr(move.paths), route: move.route.map(p => ({ q: p.x, r: p.y })) };
  }
  function allFree(b, paths) {
    if (b.grid === 'hex') return (featured(b) ? R : H).allFree(b, paths);
    return featured(b) ? M.allFree(native(b), xy(paths)) : L.nothingBlocked(xy(paths).filter(Boolean), b.W, b.H);
  }
  function replay(b, moves, paths = b.ropes) {
    // Keep the compact track replay on mega Hex boards; rebuilding every route
    // after every move makes checking an alternate tap unnecessarily expensive.
    if (b.grid === 'hex' && !featured(b)) return H.replay(b, moves, paths);
    let taps = 0, automatic = false; const events = [];
    for (const i of moves) {
      const move = tap(b, paths, i); if (!move) return { solved: false, paths, taps, events };
      if (!automatic) taps++;
      paths = move.paths; events.push(move.event); if (allFree(b, paths)) automatic = true;
    }
    return { solved: paths.every(p => !p), paths, taps, events };
  }
  function solve(b, paths = b.ropes, budget = 900, prefer = []) {
    if (b.grid === 'hex') return (featured(b) ? R : H).solve(b, paths, budget, prefer);
    return featured(b) ? M.solve(native(b), xy(paths), budget, prefer) : L.solve(xy(paths), b.W, b.H, budget, prefer);
  }
  function guide(b, paths, budget = 900, prefer = []) {
    // An earlier exit can make later taps of the same rope redundant. Trim those
    // before searching again; the old certificate often still contains a solution.
    let current = paths; const moves = [];
    for (const i of prefer) {
      if (!current[i]) continue;
      const move = tap(b, current, i); if (!move) break;
      moves.push(i); current = move.paths;
    }
    if (current.every(p => !p)) return { solved: true, moves, nodes: 0 };
    return solve(b, paths, budget, prefer);
  }
  function direction(b, path) {
    if (b.grid === 'hex') return featured(b) ? R.direction(b, path) : H.direction(path);
    return M.direction(native(b), xy([path])[0]);
  }
  function reachableFeatures(b, paths = b.ropes, budget = 10000) {
    const key = H.key, mirrors = new Map((b.mirrors || []).map(m => [key(m.cell), m])), springs = new Set((b.springs || []).map(key));
    const all = new Set([...mirrors.keys(), ...springs]), live = new Set(); let visited = 0;
    if (!all.size) return [];
    // Remove other ropes and allow stopping after every unit step. This is a
    // superset of actual play, including pauses on mirrors and later reversals.
    // A rope's trajectory is otherwise deterministic. Only a feature absent
    // from every optimistic trajectory can safely disappear. Budget exhaustion
    // keeps everything, rather than treating an unfinished search as proof.
    for (const original of paths) {
      if (!original) continue;
      let path = original; const seen = new Set();
      for (;;) {
        if (visited++ >= budget) return [...all];
        const cells = path.map(key), state = cells.join(';'); if (seen.has(state)) break; seen.add(state);
        const head = path.at(-1), previous = path.at(-2), mirror = mirrors.get(key(head));
        let dq = head.q - previous.q, dr = head.r - previous.r;
        if (mirror) {
          live.add(key(head));
          if (b.grid === 'hex') {
            const incoming = H.DIRS.findIndex(d => d[0] === dq && d[1] === dr);
            [dq, dr] = H.DIRS[(2 * mirror.axis - incoming + 6) % 6];
          } else if (mirror.slope === '/') [dq, dr] = [-dr, -dq];
          else [dq, dr] = [dr, dq];
        }
        const next = { q: head.q + dq, r: head.r + dr }, at = key(next);
        const inside = b.grid === 'hex' ? H.inside(b, next) : next.q >= 0 && next.r >= 0 && next.q < b.W && next.r < b.H;
        if (!inside || cells.includes(at)) break;
        if (all.has(at)) live.add(at);
        if (live.size === all.size) return [...all];
        path = path.slice(1).concat(next);
        if (springs.has(at)) path.reverse();
      }
    }
    return [...live];
  }
  function frozenRopes(b, paths = b.ropes) {
    if (!featured(b)) {
      if (b.grid === 'hex') return H.compile(b, paths).frozen();
      const ids = paths.flatMap((p, i) => p ? [i] : []);
      return L.frozenRopes(xy(ids.map(i => paths[i])), b.W, b.H).map(i => ids[i]);
    }
    // Optimistically erase any rope that has a legal first move, even if that
    // move would only slide or reverse it. Repeat as blockers disappear. Every
    // survivor is still unable to move with all those ropes removed: none of
    // the survivors can make a first move, so this is a permanent knot.
    // This deliberately misses ambiguous cases rather than guessing from a
    // solver timeout or using straight-track assumptions around reflectors.
    const remaining = paths.slice(); let changed;
    do {
      changed = false;
      for (let i = 0; i < remaining.length; i++) if (remaining[i] && tap(b, remaining, i)) {
        remaining[i] = null; changed = true;
      }
    } while (changed);
    return remaining.flatMap((p, i) => p ? [i] : []);
  }
  // Breadth-first search counts only player taps. Once every remaining rope
  // has a clear exit, the rest of the certificate is an automatic suffix.
  function minimumTaps(b, fallback = b.plan, budget = 5000) {
    const verified = replay(b, fallback);
    if (!verified.solved) throw Error('Par requires a complete solution');
    const best = { plan: fallback.slice(), par: verified.taps, exact: false };
    const queue = [{ paths: b.ropes, parent: -1, move: -1, depth: 0 }], seen = new Set([JSON.stringify(b.ropes)]);
    for (let q = 0; q < queue.length; q++) {
      if (q >= budget) return { ...best, nodes: q };
      const state = queue[q];
      if (state.depth >= best.par) continue;
      if (allFree(b, state.paths)) {
        const plan = [];
        for (let node = state; node.parent >= 0; node = queue[node.parent]) plan.push(node.move);
        plan.reverse(); plan.push(...state.paths.flatMap((p, i) => p ? [i] : []));
        return { plan, par: Math.max(state.paths.some(Boolean) ? 1 : 0, state.depth), exact: true, nodes: q + 1 };
      }
      for (let i = 0; i < state.paths.length; i++) {
        if (!state.paths[i]) continue;
        const next = tap(b, state.paths, i); if (!next) continue;
        const key = JSON.stringify(next.paths); if (seen.has(key)) continue;
        seen.add(key); queue.push({ paths: next.paths, parent: q, move: i, depth: state.depth + 1 });
      }
    }
    return { ...best, exact: true, nodes: queue.length };
  }
  function layoutKey(board) {
    const data = JSON.stringify([board.grid, board.W, board.H,
      board.ropes.map(path => path.map(p => [p.q, p.r])),
      (board.mirrors || []).map(m => [m.cell.q, m.cell.r, m.axis ?? m.slope]),
      (board.springs || []).map(p => [p.q, p.r])]);
    return L.hashString(data).toString(36) + '-' + L.hashString('layout:' + data).toString(36);
  }
  function generate(options = {}) {
    const o = normalize(options), details = spec(o, options.index), d = details.difficulty;
    if (o.revision === 3) { const board = F.generate(details, api); return { ...board, layoutKey: layoutKey(board) }; }
    if (o.revision === 2) return D.generate(details, api);
    for (let attempt = 0; attempt < 24; attempt++) {
      const seed = details.seed + attempt.toString(36).toUpperCase(); let b;
      if (details.grid === 'hex') {
        const index = Math.max(attempt >= 12 ? 2 : 0, Math.round((d - 1) / 99 * 59));
        const opts = { seed, index, count: 60, big: d >= 80, mirrors: details.mirrors, springs: details.springs };
        let raw;
        try { raw = (details.mirrors || details.springs ? R : H).generate(opts); }
        catch (error) { if (error.message === 'Could not weave a mirror tangle') continue; throw error; }
        // The per-level spec contains feature flags; the generated board contains tiles.
        b = { ...raw, ...details, mirrors: raw.mirrors || [], springs: raw.springs || [] };
      } else if (details.mirrors || details.springs) {
        const kinds = [details.springs && 'springs', details.mirrors && 'mirrors'].filter(Boolean);
        b = fromSquare(T.levelFrom({ seed, index: Math.round(d / 100 * 59), big: d >= 80, kinds }), details);
      } else {
        const rng = L.mulberry32(L.hashString(seed)), target = Math.max(attempt >= 12 ? 12 : 2, Math.pow(d / 100, 1.3) * (d >= 80 ? 500 : 300));
        const cfg = L.plan(rng, target, target + Math.max(5, target * .08), d >= 80, attempt, true), raw = L.weave(L.mulberry32(cfg.seed), cfg);
        if (!raw) continue;
        const best = L.fewestPlayerTaps(raw.ropes, raw.W, raw.H, raw.taps, raw.ropes.length < 12 ? 1500 : 150);
        b = fromSquare({ ...raw, best: best.taps, par: best.count, parExact: best.exact }, details);
      }
      // Never publish a pre-solved board. This applies to every setting and seed,
      // including the smallest introductions; retries are deterministic and bounded.
      const springs = new Set((b.springs || []).map(H.key));
      const adjacentBouncer = b.ropes.some(path => springs.has(H.key(H.add(path.at(-1), direction(b, path)))));
      if (b.ropes.length < 2 || allFree(b, b.ropes) || adjacentBouncer) continue;
      const certificate = replay(b, b.plan); if (!certificate.solved) continue;
      const target = b.ropes.length <= 12 ? minimumTaps(b) : { plan: b.plan, par: certificate.taps, exact: b.exact && b.par === certificate.taps };
      return { ...b, ...target };
    }
    throw Error('Could not weave a blocked, solvable board for these settings');
  }
  const project = (p, b) => b.grid === 'hex' ? H.project(p) : { x: p.q, y: p.r };
  const cells = b => b.grid === 'hex' ? H.cells(b) : Array.from({ length: b.W * b.H }, (_, i) => ({ q: i % b.W, r: Math.floor(i / b.W) }));
  const available = (o, chapters = 1) => normalize(o).kind === 'journey' ? Math.min(120, Math.max(1, chapters) * 10) : normalize(o).count;
  const unlock = (chapters, index) => index % 10 === 9 ? Math.min(12, Math.max(chapters, Math.floor(index / 10) + 2)) : chapters;
  const api = { VERSION, GRID_VERSION, DEFAULT, LEGACY_DEFAULT, ROPE_DEFAULT, normalize, code, parseCode, spec, generate, layoutKey, minimumTaps, frozenRopes, reachableFeatures, tap, replay, solve, guide, allFree, direction, project, cells, available, unlock, add: H.add, DIRS: H.DIRS, cleanSeed: H.cleanSeed };
  if (node) module.exports = api; else root.MFGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
