// One set format and gameplay API for square and Hex. Board coordinates are q/r
// in the view; the original square kernels keep their own x/y representation.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const L = node ? require('./levels.js') : MFLevels;
  const M = node ? require('./mechanics.js') : root.MFMechanics;
  const H = node ? require('./hex/engine.js') : root.MFHex;
  const R = node ? require('./hex/mirrors.js') : root.MFHexMirrors;
  const F = node ? require('./grid-generator.js') : root.MFGridGenerator;
  const K = node ? require('./grid-journey.js') : root.MFGridJourney;
  // Bump when generated boards change, so saved scores no longer apply.
  const GRID_VERSION = 7;
  const DEFAULT = { kind: 'journey', seed: 'MONKEYFIST', grid: 'mixed', count: 120, min: 1, max: 100, width: 10, height: 14, mirrors: true, springs: true };
  const GRIDS = { square: 'S', hex: 'H', mixed: 'M' }, GRID_NAMES = { S: 'square', H: 'hex', M: 'mixed' };
  const clamp = (v, lo, hi, fallback) => Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : fallback;
  // Mechanics need room to turn and bounce; colossal maps allow larger grids.
  const sizeLimits = o => [o.mirrors || o.springs ? 8 : 4, o.colossal ? 48 : 24];
  function normalize(opts = {}) {
    if (opts.kind === 'journey') return { ...DEFAULT };
    const min = clamp(opts.min, 1, 100, 1), max = clamp(opts.max, min, 100, 100), [lo, hi] = sizeLimits(opts);
    return { kind: 'custom', seed: H.cleanSeed(opts.seed), grid: GRIDS[opts.grid] ? opts.grid : 'mixed', count: clamp(opts.count, 1, 200, 120), min, max,
      width: clamp(opts.width, lo, hi, 10), height: clamp(opts.height, lo, hi, 14), mirrors: !!opts.mirrors, springs: !!opts.springs, ...(opts.colossal ? { colossal: true } : {}) };
  }
  function code(input) {
    const o = normalize(input);
    return o.kind === 'journey' ? 'J3-' + DEFAULT.seed : ['U3', GRIDS[o.grid], o.min, o.max, o.width, o.height, o.count,
      (o.mirrors ? 'M' : '') + (o.springs ? 'S' : '') + (o.colossal ? 'C' : '') || 'N', o.seed].join('-');
  }
  function parseCode(text) {
    text = String(text || '').trim().toUpperCase();
    if (text === code(DEFAULT)) return { ...DEFAULT };
    const m = /^U3-([SHM])-(\d{1,3})-(\d{1,3})-(\d{1,2})-(\d{1,2})-(\d{1,3})-(N|M|S|MS|C|MC|SC|MSC)-([A-Z0-9]{1,12})$/.exec(text);
    if (!m) return null;
    const o = { grid: GRID_NAMES[m[1]], min: +m[2], max: +m[3], width: +m[4], height: +m[5], count: +m[6], mirrors: m[7].includes('M'), springs: m[7].includes('S'), colossal: m[7].includes('C'), seed: m[8] };
    const [lo, hi] = sizeLimits(o);
    if (o.min < 1 || o.max > 100 || o.min > o.max || o.width < lo || o.width > hi || o.height < lo || o.height > hi || o.count < 1 || o.count > 200) return null;
    return normalize(o);
  }
  function spec(input, index) {
    const o = normalize(input), i = clamp(index, 0, o.count - 1, 0);
    if (o.kind === 'journey') return { ...K[i], index: i };
    return { grid: o.grid === 'mixed' ? i % 2 ? 'hex' : 'square' : o.grid, difficulty: o.min + (o.max - o.min) * i / Math.max(1, o.count - 1), ...(o.colossal ? { colossal: true } : {}),
      W: o.width, H: o.height, seed: L.hashString('grid/3/' + code(o) + '/' + i).toString(36).toUpperCase(), index: i, mirrors: o.mirrors, springs: o.springs };
  }
  const xy = paths => paths.map(path => path && path.map(p => ({ x: p.q, y: p.r })));
  const qr = paths => paths.map(path => path && path.map(p => ({ q: p.x, r: p.y })));
  const featured = b => !!(b.mirrors?.length || b.springs?.length);
  // Without spinners every rope keeps one fixed track, mirrors included, so the
  // compact offset kernels (with their dead-board pruning) apply. Woven boards
  // never have a track that enters a cell twice; older routed mirror boards can,
  // across separate moves, so those keep the full-geometry rules.
  const simpleTracks = new WeakMap();
  function tracked(b) {
    if (b.springs?.length) return false;
    if (!b.mirrors?.length) return true;
    if (!simpleTracks.has(b)) {
      let simple = true;
      try { if (b.grid === 'hex') H.compile({ ...b, locks: b.locks || [] }, b.ropes); else L.tracksOf(xy(b.ropes), b.W, b.H, squareMirrors(b)); }
      catch { simple = false; }
      simpleTracks.set(b, simple);
    }
    return simpleTracks.get(b);
  }
  const squareMirrors = b => new Map((b.mirrors || []).map(m => [m.cell.r * b.W + m.cell.q, m.slope]));
  // The square offset kernels index ropes densely; drop ropes that have left.
  function compact(paths) {
    const ids = paths.flatMap((p, i) => p ? [i] : []);
    return { ids, paths: xy(ids.map(i => paths[i])), local: new Map(ids.map((id, k) => [id, k])) };
  }
  const nativeCache = new WeakMap();
  function native(b) {
    if (!nativeCache.has(b)) nativeCache.set(b, { W: b.W, H: b.H,
      mirrors: (b.mirrors || []).map(m => ({ cell: m.cell.r * b.W + m.cell.q, slope: m.slope })),
      springs: (b.springs || []).map(p => p.r * b.W + p.q), gates: [] });
    return nativeCache.get(b);
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
    if (b.grid === 'hex' && tracked(b)) return H.replay(b, moves, paths);
    let taps = 0, automatic = false; const events = [];
    for (const i of moves) {
      const move = tap(b, paths, i); if (!move) return { solved: false, paths, taps, events };
      if (!automatic) taps++;
      paths = move.paths; events.push(move.event); if (allFree(b, paths)) automatic = true;
    }
    return { solved: paths.every(p => !p), paths, taps, events };
  }
  function solve(b, paths = b.ropes, budget = 900, prefer = []) {
    if (b.grid === 'hex') return (tracked(b) ? H : R).solve(b, paths, budget, prefer);
    if (!tracked(b)) return M.solve(native(b), xy(paths), budget, prefer);
    const c = compact(paths), result = L.solve(c.paths, b.W, b.H, budget, prefer.filter(i => c.local.has(i)).map(i => c.local.get(i)), squareMirrors(b));
    return { ...result, moves: result.moves.map(k => c.ids[k]) };
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
    if (tracked(b)) {
      if (b.grid === 'hex') return H.compile(b, paths).frozen();
      const c = compact(paths);
      return L.frozenRopes(c.paths, b.W, b.H, squareMirrors(b)).map(i => c.ids[i]);
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
    const board = F.generate(spec(options, options.index), api);
    return { ...board, layoutKey: layoutKey(board) };
  }
  const project = (p, b) => b.grid === 'hex' ? H.project(p) : { x: p.q, y: p.r };
  const cells = b => b.grid === 'hex' ? H.cells(b) : Array.from({ length: b.W * b.H }, (_, i) => ({ q: i % b.W, r: Math.floor(i / b.W) }));
  const available = (o, chapters = 1) => normalize(o).kind === 'journey' ? Math.min(120, Math.max(1, chapters) * 10) : normalize(o).count;
  const unlock = (chapters, index) => index % 10 === 9 ? Math.min(12, Math.max(chapters, Math.floor(index / 10) + 2)) : chapters;
  const api = { GRID_VERSION, DEFAULT, normalize, code, parseCode, spec, generate, layoutKey, minimumTaps, frozenRopes, reachableFeatures, tap, replay, solve, guide, allFree, direction, project, cells, available, unlock, add: H.add, DIRS: H.DIRS, cleanSeed: H.cleanSeed };
  if (node) module.exports = api; else root.MFGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
