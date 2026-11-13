// Fixed board dimensions. Difficulty changes dependencies and sliding depth;
// every candidate is densely packed and carries a replay-checked solution.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const L = node ? require('./levels.js') : MFLevels;
  const H = node ? require('./hex/engine.js') : root.MFHex;
  const C = node ? require('./twist-circuits.js') : root.MFTwistCircuits;
  const R = node ? require('./hex/mirrors.js') : root.MFHexMirrors;
  const Q = node ? require('./dependency-metrics.js') : root.MFDependencyMetrics;
  const point = (q, r) => ({ q, r });
  const key = H.key, MIN_RATIO = 1 / 3;
  const dirs = grid => grid === 'hex' ? H.DIRS : [[1, 0], [0, 1], [-1, 0], [0, -1]];
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
  function repeatedCore(grid, W, height, d, rng, G, depthHint) {
    const options = [];
    // Leave room around the repeated pair for other interdependent ropes.
    const maximum = Math.min(10, Math.floor(Math.min(W, height) / 2), Math.max(W, height) - 4), wanted = depthHint ?? Math.round(3 + Math.max(0, Math.min(1, (d - 60) / 40)) * (maximum - 3));
    for (let depth = Math.min(maximum, wanted); depth >= 3; depth--) {
      const roomy = Math.min(W, height) >= 10;
      const extra = roomy ? Math.floor(rng() * 3) : 0, bottom = roomy ? 2 + Math.floor(rng() * 3) : 2, side = roomy ? 1 + Math.floor(rng() * 2) : 1;
      const a = [], b = [], left = -depth - 3 - extra;
      for (let r = 1; r <= depth; r++) a.push(point(0, r));
      for (let q = -1; q >= left; q--) a.push(point(q, depth));
      let column = left;
      for (let r = depth - 1; r >= 0; r--) {
        const next = extra && r > 0 && r % 3 === 1 ? left - 1 : left;
        if (next !== column) a.push(point(next, r + 1));
        a.push(point(next, r)); column = next;
      }
      for (let q = left + 1; q <= -depth - 2; q++) a.push(point(q, 0));
      for (let q = -depth; q <= -1; q++) b.push(point(q, 0));
      for (let q = -1; q >= -side; q--) b.push(point(q, -1));
      for (let r = -2; r >= -bottom; r--) b.push(point(-side, r));
      for (let q = 1 - side; q <= 0; q++) b.push(point(q, -bottom));
      for (let r = 1 - bottom; r <= -1; r++) b.push(point(0, r));
      for (let turn = 0; turn < (grid === 'hex' ? 6 : 4); turn++) for (const flip of [false, true]) {
        const ropes = [a, b].map(path => path.map(p => {
          let q = p.q, r = p.r; if (flip) [q, r] = [r, q];
          for (let k = 0; k < turn; k++) [q, r] = grid === 'hex' ? [-r, q + r] : [-r, q];
          return point(q, r);
        }));
        const points = ropes.flat(), r0 = Math.min(...points.map(p => p.r)), rows = Math.max(...points.map(p => p.r)) - r0 + 1;
        if (rows > height) continue;
        const row = Math.floor(rng() * (height - rows + 1));
        const columns = points.map(p => p.q + (grid === 'hex' ? Math.floor((p.r - r0 + row) / 2) : 0));
        const x0 = Math.min(...columns), width = Math.max(...columns) - x0 + 1;
        if (width > W) continue;
        const column = Math.floor(rng() * (W - width + 1));
        options.push({ depth, ropes: ropes.map(path => path.map(p => point(p.q - x0 + column, p.r - r0 + row))) });
      }
      if (options.length) break;
    }
    if (!options.length) return null;
    const chosen = options[Math.floor(rng() * options.length)], board = { grid, W, H: height, ropes: chosen.ropes, mirrors: [], springs: [], locks: [] };
    const solution = G.solve(board, board.ropes, 2000); if (!solution.solved) return null;
    const proven = G.minimumTaps(board, solution.moves, 20000);
    const stops = board.ropes.map(() => []), offsets = board.ropes.map(() => 0); let paths = board.ropes;
    for (const i of proven.plan) {
      const move = G.tap(board, paths, i); if (!move) return null;
      if (move.event === 'slide') { offsets[i] += move.distance; stops[i].push(offsets[i]); }
      paths = move.paths;
    }
    return { initialRopes: board.ropes, initialStops: stops, initialPlan: proven.plan, corePar: proven.par, coreExact: proven.exact, depth: chosen.depth };
  }
  // Cell index used by each kernel: row-major for square, offset columns for Hex.
  const indexOf = (grid, W, p) => grid === 'hex' ? H.cellIndex(p, W) : p.r * W + p.q;
  // Interior cells, apart from each other and from `avoid` (cell indices).
  function placeMirrors(grid, W, height, count, rng, avoid) {
    const all = grid === 'hex' ? H.cells({ W, H: height }) : Array.from({ length: W * height }, (_, i) => point(i % W, Math.floor(i / W)));
    const cells = all.filter(p => { const column = p.q + (grid === 'hex' ? Math.floor(p.r / 2) : 0); return column > 0 && column < W - 1 && p.r > 0 && p.r < height - 1 && !avoid.has(indexOf(grid, W, p)); });
    const out = [], near = new Set();
    for (let tries = 0; out.length < count && cells.length && tries < count * 40; tries++) {
      const p = cells[Math.floor(rng() * cells.length)]; if (near.has(key(p))) continue;
      out.push(grid === 'hex' ? { cell: p, axis: Math.floor(rng() * 3) } : { cell: p, slope: rng() < .5 ? '/' : '\\' });
      near.add(key(p)); for (const d of dirs(grid)) near.add(key(point(p.q + d[0], p.r + d[1])));
    }
    return out;
  }
  // Knots and traps asked for, as in the J1 generator: about 0.6 √T of each for a
  // tangle target T = 300 (d/100)^1.3. Asking for fewer was the main reason later
  // fixed-size boards forced so few slides (docs/research, section 5.4).
  const knotsFor = d => L.knotsWanted(300 * Math.pow(Math.max(0, d) / 100, 1.3));
  // Weave a straight-track or mirrored sliding board. Mirrors, when asked for, are
  // fixed before any rope: tracks bend on them, so the kernels' knots, traps,
  // replay and searches work unchanged. Mirrors no rope turns on are removed.
  function woven(grid, W, height, d, rng, style, options, G, extra = {}) {
    const area = W * height, strength = d / 100, length = options.longRopes ? Math.min(W, height) * 2 : Math.max(7, Math.round(Math.min(W, height) * 2));
    const core = extra.core && !options.longRopes ? repeatedCore(grid, W, height, d, rng, G) : null;
    let mirrors = [];
    if (extra.mirrors) {
      const avoid = new Set();
      if (core) { // keep the core's ways out straight, so its proven stops still hold
        const tracks = grid === 'hex' ? H.compile({ W, H: height, ropes: core.initialRopes, locks: [] }).tracks : L.tracksOf(core.initialRopes.map(path => path.map(p => ({ x: p.q, y: p.r }))), W, height);
        for (const track of tracks) for (const c of track) avoid.add(c);
      }
      mirrors = placeMirrors(grid, W, height, extra.mirrors, rng, avoid);
      if (!mirrors.length) return null;
    }
    const coreStats = core ? { seededRopes: core.initialRopes.length, corePar: core.corePar, coreExact: core.coreExact, repeatedDepth: core.depth } : {};
    if (grid === 'hex') {
      const knots = Math.max(area >= 30 && d >= 20 ? 1 : 0, Math.round(area / (options.longRopes ? 50 : 32) * strength * strength), options.longRopes ? 0 : Math.round(knotsFor(d) * Math.min(1, area / 150) * .7));
      let raw;
      const traps = options.longRopes ? 0 : Math.round(knotsFor(d) * Math.min(1, area / 150));
      try { raw = H.build(rng, { W, H: height, stage: Math.round(d * .59), coverage: .99, length, minLength: 2, tapDepth: strength * 8, ...(core || {}), mirrors, knots, traps }); }
      catch (error) { if (/twice/.test(error.message)) return null; throw error; }
      if (!raw) return null;
      const turning = mirrors.length ? H.turningMirrors({ ...raw, mirrors }) : new Set();
      return { ...raw, grid, mirrors: mirrors.filter(m => turning.has(indexOf(grid, W, m.cell))), springs: [],
        constructionStats: { intendedSlides: raw.slides, traps: raw.traps, depth: raw.stats.depth, averageDepth: raw.stats.averageDepth, ...coreStats } };
    }
    // Keep the old seeded short/medium/twisty mixture while choosing dimensions
    // independently. Asking plan() for an unreachable score collapsed every
    // candidate to its fallback short style before these values were overridden.
    const knots = options.longRopes ? Math.round(area / 40 * strength) : knotsFor(d), traps = options.longRopes ? Math.round(area / 70 * strength) : knotsFor(d);
    const mirrorMap = new Map(mirrors.map(m => [indexOf(grid, W, m.cell), m.slope]));
    const cfg = { W, H: height, keepBounds: true, style: style.name,
      lo: 0, hi: 1000000, lenLo: options.longRopes ? 6 : style.lenLo, lenHi: options.longRopes ? length : Math.max(style.lenLo, style.lenHi(Math.min(W, height))),
      minLen: options.longRopes ? 2 : style.minLen, straight: style.straight, floor: 0, cover: .99, bends: style.bends,
      wantAvg: strength * 7, tapDepth: strength * 8, tie: knots, bait: traps, pull: options.longRopes ? 5 : 3, slide: true, mirrors: mirrorMap,
      ...(core ? { ...core, initialRopes: core.initialRopes.map(path => path.map(p => ({ x: p.q, y: p.r }))) } : {}) };
    const raw = L.weave(rng, cfg); if (!raw) return null;
    const used = new Set(mirrors.length ? L.tracksOf(raw.ropes, W, height, mirrorMap).flat() : []);
    return { W: raw.W, H: raw.H, grid, style: style.name, ropes: raw.ropes.map(path => path.map(p => point(p.x, p.y))),
      locks: [], mirrors: mirrors.filter(m => used.has(indexOf(grid, W, m.cell))), springs: [], plan: raw.taps,
      constructionStats: { knots: raw.knots, traps: raw.traps, intendedSlides: raw.slides, depth: Math.max(0, ...raw.costs), averageDepth: raw.costs.reduce((sum, value) => sum + value, 0) / raw.costs.length, ...coreStats } };
  }
  function combineRepeated(grid, raw, d, rng, G) {
    const W = raw.W, height = raw.H, p = cell => point(cell % W, Math.floor(cell / W));
    const base = grid === 'hex' ? { ...raw, grid } : { grid, W, H: height, locks: [],
      ropes: raw.ropes.map(path => path.map(p => point(p.x, p.y))), plan: raw.solution,
      mirrors: raw.mirrors.map(m => ({ cell: p(m.cell), slope: m.slope })), springs: raw.springs.map(p) };
    const occupied = new Set([...base.ropes.flat(), ...base.springs, ...base.mirrors.map(m => m.cell)].map(key));
    for (let trial = 0; trial < 20; trial++) {
      // A compact repeated-slide knot leaves room for the routed strands and
      // ordinary blockers. Dense population below couples them further.
      const pair = repeatedCore(grid, W, height, d, rng, G, 4); if (!pair) continue;
      if (pair.initialRopes.flat().some(p => occupied.has(key(p)))) continue;
      const offset = base.ropes.length, b = { ...base, ropes: base.ropes.concat(pair.initialRopes),
        plan: base.plan.concat(pair.initialPlan.map(i => i + offset)) };
      const replayed = G.replay(b, b.plan), solved = replayed.solved ? { solved: true, moves: b.plan } : G.solve(b, b.ropes, 5000, b.plan);
      if (!solved.solved) continue;
      const best = G.minimumTaps(b, solved.moves, 5000), trace = G.replay(b, best.plan);
      if (!trace.solved || trace.events.slice(0, best.par).filter(event => event === 'slide').length < 3) continue;
      if (grid === 'hex') return { ...b, plan: best.plan, repeatedFeatured: true };
      return { W, H: height, ropes: b.ropes.map(path => path.map(p => ({ x: p.q, y: p.r }))),
        mirrors: b.mirrors.map(m => ({ cell: m.cell.r * W + m.cell.q, slope: m.slope })),
        springs: b.springs.map(p => p.r * W + p.q), gates: [], solution: best.plan, repeatedFeatured: true };
    }
    return null;
  }
  function featured(grid, W, height, d, mirrors, springs, rng, attempt, limits, details, G) {
    const requested = details.coreRopes || 0, distinct = details.minSprings || 0;
    const count = requested ? Math.max(distinct, attempt >= 6 ? Math.min(requested, Math.max(2, requested - 1)) : requested) : limits.coreCount ? attempt ? 1 : Math.min(limits.coreCount, Math.max(1, Math.floor(W * height / 100))) : attempt >= 6 ? 1 : Math.max(1, Math.min(5, Math.round(W * height / 100 * (.3 + d / 100))));
    const tryRepeated = !limits.longRopes && (details.minPartialSlides || d >= 75 && W * height >= 150 && attempt < 8);
    const options = { maxTapChecks: limits.maxTapChecks, coverage: .98, attemptsMultiplier: limits.populateAttempts || 24, allowEarly: true, minLength: 2, length: limits.longRopes ? Math.min(W, height) * 2 : Math.max(8, Math.round(Math.min(W, height) * 1.5)) };
    if (grid === 'hex') {
      // Each Hex core route places its own turning mirrors; meet a requested minimum.
      const turns = mirrors ? Math.max(d < 35 ? 1 : 2, Math.ceil((details.minMirrors || 0) / count)) : 0;
      let raw = R.skeleton(rng, W, height, count, turns, springs, 4, true, { minDistinctSprings: distinct });
      if (raw && tryRepeated) { const combined = combineRepeated(grid, raw, d, rng, G); if (combined || details.minPartialSlides) raw = combined; }
      return raw && { ...R.populate(raw, rng, Math.round(d * .59), undefined, options), grid, locks: [] };
    }
    const kinds = [mirrors && 'mirrors', springs && 'springs'].filter(Boolean);
    let raw = C.skeleton(rng, W, height, kinds, count, { minDistinctSprings: distinct });
    if (raw && tryRepeated) { const combined = combineRepeated(grid, raw, d, rng, G); if (combined || details.minPartialSlides) raw = combined; }
    if (!raw) return null;
    const b = C.populate(raw, rng, undefined, options), p = c => point(c % W, Math.floor(c / W));
    return { grid, W, H: height, ropes: b.ropes.map(path => path.map(p => point(p.x, p.y))), plan: b.solution,
      locks: [], core: b.circuit?.core || count, ...(raw.repeatedFeatured ? { repeatedFeatured: true } : {}), springs: b.springs.map(p), mirrors: b.mirrors.map(m => ({ cell: p(m.cell), slope: m.slope })) };
  }
  // Spinners on a woven board. Candidate cells are empty cells some rope's way out
  // crosses, tried in seeded order; a spinner stays only if the board still solves
  // under the full rules and that solution bounces off it before automatic release.
  // The woven board's knots and traps are kept, so a careless slide can still lose.
  function addSpinners(b, G, rng, count) {
    let board = b;
    for (let n = 0; n < count; n++) {
      const blocked = new Set([...board.ropes.flat(), ...board.mirrors.map(m => m.cell), ...board.springs].map(key));
      // A spinner straight in front of a head would bounce a rope that has not moved.
      for (const path of board.ropes) { const d = G.direction(board, path); blocked.add(key(point(path.at(-1).q + d[0], path.at(-1).r + d[1]))); }
      const tracks = board.grid === 'hex' ? H.compile({ ...board, springs: [] }).tracks.map(t => t.map(c => point(c % board.W - Math.floor(Math.floor(c / board.W) / 2), Math.floor(c / board.W))))
        : L.tracksOf(xyOf(board), board.W, board.H, squareMirrors(board)).map(t => t.map(c => point(c % board.W, Math.floor(c / board.W))));
      const seen = new Set(), cells = [];
      tracks.forEach((track, i) => { for (const p of track.slice(board.ropes[i].length)) if (!blocked.has(key(p)) && !seen.has(key(p))) { seen.add(key(p)); cells.push(p); } });
      for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
      let placed = null;
      for (const cell of cells.slice(0, 8)) {
        const v = { ...board, springs: board.springs.concat(cell) }, solution = G.solve(v, v.ropes, 600, board.plan);
        if (solution.solved !== true) continue;
        const played = G.replay(v, solution.moves); if (!played.solved) continue;
        let paths = v.ropes, used = false;
        for (let step = 0; step < played.taps && !used; step++) {
          const move = G.tap(v, paths, solution.moves[step]);
          used = move.event === 'bounce' && key(move.route.at(-1)) === key(cell); paths = move.paths;
        }
        if (used) { placed = { ...v, plan: solution.moves }; break; }
      }
      if (!placed) return null;
      board = placed;
    }
    return board;
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
  function featureStats(board, plan, manualTaps, G) {
    const mirrors = new Map(board.mirrors.map(m => [key(m.cell), m]));
    const turned = new Set(), bounced = new Set(), manualTurns = new Set(), manualBounces = new Set();
    let paths = board.ropes;
    for (let step = 0; step < plan.length; step++) {
      const i = plan[step], path = paths[i], move = G.tap(board, paths, i); if (!move) return null;
      for (let at = path.length; at < move.route.length; at++) {
        const p = move.route[at], mirror = mirrors.get(key(p)); if (!mirror) continue;
        const before = move.route[at - 1]; let dq = p.q - before.q, dr = p.r - before.r, oq, or;
        if (board.grid === 'hex') {
          const incoming = G.DIRS.findIndex(d => d[0] === dq && d[1] === dr);
          [oq, or] = G.DIRS[(2 * mirror.axis - incoming + 6) % 6];
        } else [oq, or] = mirror.slope === '/' ? [-dr, -dq] : [dr, dq];
        if (oq !== dq || or !== dr) { turned.add(key(p)); if (step < manualTaps) manualTurns.add(key(p)); }
      }
      if (move.event === 'bounce') { const at = key(move.route.at(-1)); bounced.add(at); if (step < manualTaps) manualBounces.add(at); }
      paths = move.paths;
    }
    return { usedMirrors: turned.size, usedSprings: bounced.size, manualMirrors: manualTurns.size, manualSprings: manualBounces.size };
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
  function trivial(b, G) {
    // A bounded par search can retain a nonoptimal certificate on large boards.
    // Independently exclude any true one-tap auto-release with more than three ropes.
    return b.ropes.length > 3 && b.ropes.some((path, i) => {
      const move = G.tap(b, b.ropes, i); return move && G.allFree(b, move.paths);
    });
  }
  const squareMirrors = b => new Map(b.mirrors.map(m => [m.cell.r * b.W + m.cell.q, m.slope]));
  const xyOf = b => b.ropes.map(path => path.map(p => ({ x: p.q, y: p.r })));
  // Move exits the rest of a routed solution does not need to the automatic release.
  function postpone(b, G, plan) {
    let best = plan, taps = G.replay(b, plan).taps;
    for (let k = Math.min(taps, best.length) - 1; k >= 0; k--) {
      const i = best[k]; if (best.indexOf(i, k + 1) >= 0) continue;
      const trial = best.slice(0, k).concat(best.slice(k + 1), i), r = G.replay(b, trial);
      if (r.solved && r.taps < taps) { best = trial; taps = r.taps; }
    }
    return best;
  }
  // Par is the fewest player taps found. Unneeded exits are first postponed to the
  // automatic release, then a bounded search looks for fewer taps from there. On
  // boards without spinners both run on the compact offset kernels, mirrors included.
  function score(b, G, skipSearch, budget = 2500) {
    if (skipSearch) return { plan: b.plan, par: G.replay(b, b.plan).taps, exact: false };
    if (!b.springs.length && b.grid === 'square') {
      const paths = xyOf(b), mirrors = squareMirrors(b), start = L.postponeExits(paths, b.W, b.H, b.plan, mirrors);
      const result = L.fewestPlayerTaps(paths, b.W, b.H, start ? start.taps : b.plan, budget, mirrors);
      return { plan: result.taps, par: result.count, exact: result.exact };
    }
    if (!b.springs.length) {
      const start = H.postponeExits(b, b.plan), result = H.fewestPlayerTaps(b, start ? start.plan : b.plan, budget);
      return { plan: result.plan, par: result.par, exact: result.exact };
    }
    const start = postpone(b, G, b.plan);
    return b.ropes.length <= 12 ? G.minimumTaps(b, start, 1200) : { plan: start, par: G.replay(b, start).taps, exact: false };
  }
  // The casual player (docs/research, section 4): an exit if one exists, otherwise
  // any legal move, at random. Its win rate falls as a board offers more wrong slides.
  function casualRate(b, G, rng, games) {
    if (!b.springs.length && b.grid === 'square') return L.casualWins(xyOf(b), b.W, b.H, rng, games, squareMirrors(b));
    if (!b.springs.length) return H.casualWins(b, rng, games);
    let wins = 0;
    for (let g = 0; g < games; g++) {
      let paths = b.ropes;
      for (let step = 0; step < b.ropes.length * 6 + 20; step++) {
        const moves = paths.flatMap((p, i) => { const m = p && G.tap(b, paths, i); return m ? [m] : []; });
        if (!moves.length) break;
        const exits = moves.filter(m => m.event === 'exit'), pool = exits.length ? exits : moves;
        paths = pool[Math.floor(rng() * pool.length)].paths;
        if (paths.every(p => !p)) { wins++; break; }
      }
    }
    return wins / Math.max(1, games);
  }
  // Measured challenge: the manual slides and bounces of the par solution, plus up to
  // six for how often the casual player loses. The difficulty setting maps to a target.
  const challengeOf = (work, wins) => work + 6 * (1 - wins);
  const targetChallenge = d => .5 + 9.5 * Math.pow(Math.max(0, Math.min(100, d)) / 100, 1.3);
  // Harder settings should be losable: above this casual win rate a candidate is
  // penalised, so forced but safe work cannot stand in for real decisions.
  const winCeiling = d => d < 40 ? 1 : 1 - .5 * Math.min(1, (d - 40) / 60);
  function generate(details, G) {
    const { grid, W, H: height, difficulty: d, mirrors, springs } = details;
    const rng = L.mulberry32(L.hashString('grid/3/' + details.seed));
    // Select a level's style once, so candidate scoring cannot wash out the
    // intended mixture by repeatedly preferring the short-rope variant.
    const roll = !mirrors && !springs && grid === 'square' ? rng() : 0;
    const twisty = Math.min(W, height) >= 7 && d >= 35;
    const style = L.STYLES[roll < .4 ? 0 : roll < .73 || !twisty ? 1 : 2];
    const colossal = !!details.colossal, limits = colossal ? { longRopes: true, coreCount: 1, populateAttempts: 8, maxTapChecks: 40000, skipSearch: true } : {};
    // Spinners need routed circuits; so do colossal mirror maps. Every other board,
    // mirrored or not, is woven on the track kernels with knots and traps.
    // Colossal maps with mechanics use routed circuits. Every other board is woven
    // on the track kernels with knots and traps; spinners are placed afterwards.
    const routed = colossal && (springs || mirrors), strength = d / 100;
    const spinnerCount = springs && !routed ? Math.max(1, details.minSprings || 1) : 0;
    const mirrorCount = !mirrors || routed ? 0 : Math.min(Math.round(W * height / 14), grid === 'hex' ? 2 * (details.minMirrors || 2) + 2 : (details.minMirrors || 2) + 2 + Math.round(2 * strength));
    // The repeated-slide core is used when a specification demands repeated or
    // interleaved work, and otherwise on alternate hard candidates; play decides.
    const wantsCore = attempt => !!(details.minRepeatedRopes || details.minInterleavedRopes) || d >= 60 && attempt % 2 === 0;
    const hardness = Math.max(0, (d - 40) / 60), sampleLimit = colossal ? 3 : spinnerCount ? 6 : d >= 75 ? 12 : 10;
    let best = null, bestValue = -Infinity, richCandidates = 0;
    const featuredBoard = mirrors || springs, smallSlideBoard = W * height <= 48;
    const minCoverage = featuredBoard ? W * height <= 80 ? .8 : .84 : smallSlideBoard ? .8 : .85;
    for (let attempt = 0; attempt < sampleLimit; attempt++) {
      let b = routed ? featured(grid, W, height, d, mirrors, springs, rng, attempt, limits, details, G) : woven(grid, W, height, d, rng, style, limits, G, { mirrors: mirrorCount, core: wantsCore(attempt) });
      if (b && spinnerCount && valid(b)) b = addSpinners(b, G, rng, spinnerCount);
      if (!b || b.W !== W || b.H !== height || b.ropes.length < 2 || !valid(b) || G.allFree(b, b.ropes)) continue;
      if (mirrors && !b.mirrors.length || springs && !b.springs.length) continue;
      const density = coverage(b); if (density < minCoverage || !regional(b)) continue;
      const replayed = G.replay(b, b.plan); if (!replayed.solved || !featuresUsed(b, G)) continue;
      const ordered = !colossal && d <= 30 && b.core ? reorder(b, G) : b;
      const result = score(ordered, G, limits.skipSearch), ratio = result.par / b.ropes.length;
      const mechanicStats = details.minMirrors || details.minSprings ? featureStats(b, result.plan, result.par, G) : null;
      if (mechanicStats && (b.mirrors.length < (details.minMirrors || 0) || b.springs.length < (details.minSprings || 0) ||
          mechanicStats.usedMirrors !== b.mirrors.length || mechanicStats.usedSprings !== b.springs.length ||
          mechanicStats.manualMirrors < (details.minMirrors || 0) || mechanicStats.manualSprings < (details.minSprings || 0))) continue;
      const played = G.replay(b, result.plan), manualEvents = played.events.slice(0, result.par);
      const manualPlan = result.plan.slice(0, result.par), seededRopes = b.constructionStats?.seededRopes || b.core || 0;
      const firstCore = seededRopes ? manualPlan.findIndex(i => i < seededRopes) : -1;
      const lastCore = seededRopes ? manualPlan.findLastIndex(i => i < seededRopes) : -1;
      const actions = new Uint16Array(b.ropes.length);
      manualEvents.forEach((event, step) => { if (event === 'slide') actions[result.plan[step]]++; });
      const slideStats = { manualSlides: manualEvents.filter(event => event === 'slide').length,
        manualBounces: manualEvents.filter(event => event === 'bounce').length,
        repeatedRopes: Array.from(actions).filter(count => count >= 2).length,
        interleavedRopes: firstCore < 0 ? 0 : new Set(manualPlan.slice(firstCore, lastCore + 1).filter(i => i >= seededRopes)).size,
        automaticRopes: played.events.slice(result.par).filter(event => event === 'exit').length };
      const slides = played.events.includes('slide');
      // A small sliding lesson needs a little vacant travel space. Accept it
      // only when the replayed final certificate actually uses that space.
      if (details.requireSlide && !slides || !featuredBoard && density < .85 && !slides) continue;
      if (result.par * 3 < b.ropes.length || trivial(b, G)) continue;
      if (slideStats.manualSlides < (details.minPartialSlides || 0) || slideStats.repeatedRopes < (details.minRepeatedRopes || 0) || slideStats.interleavedRopes < (details.minInterleavedRopes || 0) || ratio < (details.minParRatio || 0)) continue;
      const complexity = colossal ? null : Q.analyze(b, result.plan, result.par, G);
      // Ratios can reward a long, obvious chain. Advanced candidates also need
      // converging prerequisites, interleaved mutual waits, or repeated work on
      // ropes whose blockers changed. Mere route length adds nothing here.
      if (!colossal && d >= 75 && W * height >= 64 && !complexity.mutualWaitRopes && !complexity.revisitedRopes && (complexity.joins < 2 || complexity.branchingDepth < 2)) continue;
      // Choose by play, not by the shape of one certificate: forced work and how
      // often a casual player loses, against the difficulty setting's target.
      const wins = colossal ? 1 : casualRate(b, G, L.mulberry32(L.hashString('casual/' + details.seed + '/' + attempt)), b.springs.length ? 10 : 32);
      const work = slideStats.manualSlides + slideStats.manualBounces, challenge = challengeOf(work, wins);
      const value = density * 3 - Math.abs(challenge - targetChallenge(d)) * .5 - Math.max(0, wins - winCeiling(d)) * 4 + (colossal ? 0 : hardness * complexity.interaction * .25);
      if (value > bestValue) { bestValue = value; best = { ...b, ...details, mirrors: b.mirrors, springs: b.springs, locks: [], ...result, coverage: density, complexity, slideStats,
        play: { casualWins: wins, work, challenge: Number(challenge.toFixed(3)) }, ...(mechanicStats ? { mechanicStats } : {}) }; }
      if (routed && (details.minPartialSlides || b.repeatedFeatured) && ++richCandidates >= 2) break;
      if (colossal || density >= .9 && Math.abs(challenge - targetChallenge(d)) <= .5 && wins <= winCeiling(d)) break;
    }
    if (!best) throw Error('Could not densely weave these grid dimensions');
    return best;
  }
  const api = { generate, coverage, valid, featureStats, score, casualRate, challengeOf, targetChallenge, winCeiling, knotsFor, MIN_RATIO };

  if (node) module.exports = api; else root.MFGridGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
