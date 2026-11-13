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
  function woven(grid, W, height, d, rng, style, options) {
    const area = W * height, strength = d / 100, length = options.longRopes ? Math.min(W, height) * 2 : Math.max(7, Math.round(Math.min(W, height) * 2));
    if (grid === 'hex') {
      const raw = H.build(rng, { W, H: height, stage: Math.round(d * .59), coverage: .99,
        length, minLength: 2, tapDepth: strength * 8,
        // Later small Hex lessons retain their minimum sliding knot.
        knots: Math.max(area >= 30 && d >= 20 ? 1 : 0, Math.round(area / (options.longRopes ? 50 : 32) * strength * strength)) });
      return { ...raw, grid, mirrors: [], springs: [], constructionStats: { intendedSlides: raw.slides, depth: raw.stats.depth, averageDepth: raw.stats.averageDepth } };
    }
    // Keep the old seeded short/medium/twisty mixture while choosing dimensions
    // independently. Asking plan() for an unreachable score collapsed every
    // candidate to its fallback short style before these values were overridden.
    const cfg = { W, H: height, keepBounds: true, style: style.name,
      lo: 0, hi: 1000000, lenLo: options.longRopes ? 6 : style.lenLo, lenHi: options.longRopes ? length : Math.max(style.lenLo, style.lenHi(Math.min(W, height))),
      minLen: options.longRopes ? 2 : style.minLen, straight: style.straight, floor: 0, cover: .99, bends: style.bends,
      wantAvg: strength * 7, tapDepth: strength * 8, tie: Math.round(area / (options.longRopes ? 40 : 30) * strength),
      bait: Math.round(area / 70 * strength), pull: 5, slide: true };
    const raw = L.weave(rng, cfg); if (!raw) return null;
    return { W: raw.W, H: raw.H, grid, style: style.name, ropes: raw.ropes.map(path => path.map(p => point(p.x, p.y))),
      locks: [], mirrors: [], springs: [], plan: raw.taps, constructionStats: { knots: raw.knots, traps: raw.traps, intendedSlides: raw.slides, depth: Math.max(0, ...raw.costs), averageDepth: raw.costs.reduce((sum, value) => sum + value, 0) / raw.costs.length } };
  }
  function featured(grid, W, height, d, mirrors, springs, rng, attempt, limits) {
    const count = limits.coreCount ? attempt ? 1 : Math.min(limits.coreCount, Math.max(1, Math.floor(W * height / 100))) : attempt >= 6 ? 1 : Math.max(1, Math.min(5, Math.round(W * height / 100 * (.3 + d / 100))));
    const options = { maxTapChecks: limits.maxTapChecks, coverage: .98, attemptsMultiplier: limits.populateAttempts || 24, allowEarly: true, minLength: 2, length: limits.longRopes ? Math.min(W, height) * 2 : Math.max(8, Math.round(Math.min(W, height) * 1.5)) };
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
  function target(d) { return MIN_RATIO + (1.4 - MIN_RATIO) * Math.pow((d - 1) / 99, 1.25); }
  function trivial(b, G) {
    // A bounded par search can retain a nonoptimal certificate on large boards.
    // Independently exclude any true one-tap auto-release with more than three ropes.
    return b.ropes.length > 3 && b.ropes.some((path, i) => {
      const move = G.tap(b, b.ropes, i); return move && G.allFree(b, move.paths);
    });
  }
  function score(b, G, skipSearch) {
    if (skipSearch) return { plan: b.plan, par: G.replay(b, b.plan).taps, exact: false };
    if (b.grid === 'square' && !b.mirrors.length && !b.springs.length) {
      const result = L.fewestPlayerTaps(b.ropes.map(path => path.map(p => ({ x: p.q, y: p.r }))), b.W, b.H, b.plan, b.ropes.length <= 12 ? 1800 : 100);
      return { plan: result.taps, par: result.count, exact: result.exact };
    }
    return b.ropes.length <= 12 ? G.minimumTaps(b, b.plan, 1200) : { plan: b.plan, par: G.replay(b, b.plan).taps, exact: false };
  }
  function generate(details, G) {
    const { grid, W, H: height, difficulty: d, mirrors, springs } = details;
    const rng = L.mulberry32(L.hashString('grid/3/' + details.seed));
    // Select a level's style once, so candidate scoring cannot wash out the
    // intended mixture by repeatedly preferring the short-rope variant.
    const roll = !mirrors && !springs && grid === 'square' ? rng() : 0;
    const twisty = Math.min(W, height) >= 7 && d >= 35;
    const style = L.STYLES[roll < .4 ? 0 : roll < .73 || !twisty ? 1 : 2];
    const colossal = !!details.colossal, limits = colossal ? { longRopes: true, coreCount: 1, populateAttempts: 8, maxTapChecks: 40000, skipSearch: true } : {};
    const hardness = Math.max(0, (d - 40) / 60), sampleLimit = colossal ? 3 : d >= 75 ? 16 : d >= 45 ? 12 : mirrors || springs ? 12 : d <= 20 ? 16 : 8;
    let best = null, bestValue = -Infinity;
    const featuredBoard = mirrors || springs, smallSlideBoard = W * height <= 48;
    const minCoverage = featuredBoard ? W * height <= 80 ? .8 : .84 : smallSlideBoard ? .8 : .85;
    for (let attempt = 0; attempt < sampleLimit; attempt++) {
      const b = mirrors || springs ? featured(grid, W, height, d, mirrors, springs, rng, attempt, limits) : woven(grid, W, height, d, rng, style, limits);
      if (!b || b.W !== W || b.H !== height || b.ropes.length < 2 || !valid(b) || G.allFree(b, b.ropes)) continue;
      const density = coverage(b); if (density < minCoverage || !regional(b)) continue;
      const replayed = G.replay(b, b.plan); if (!replayed.solved || !featuresUsed(b, G)) continue;
      const ordered = !colossal && d <= 30 && (mirrors || springs) ? reorder(b, G) : b;
      const result = score(ordered, G, limits.skipSearch), ratio = result.par / b.ropes.length;
      const slides = G.replay(b, result.plan).events.includes('slide');
      // A small sliding lesson needs a little vacant travel space. Accept it
      // only when the replayed final certificate actually uses that space.
      if (details.requireSlide && !slides || !featuredBoard && density < .85 && !slides) continue;
      if (result.par * 3 < b.ropes.length || trivial(b, G)) continue;
      const complexity = colossal ? null : Q.analyze(b, result.plan, result.par, G);
      // Ratios can reward a long, obvious chain. Advanced candidates also need
      // converging prerequisites, interleaved mutual waits, or repeated work on
      // ropes whose blockers changed. Mere route length adds nothing here.
      if (!colossal && d >= 75 && W * height >= 64 && !complexity.mutualWaitRopes && !complexity.revisitedRopes && (complexity.joins < 2 || complexity.branchingDepth < 2)) continue;
      const value = density * 4 - Math.abs(ratio - target(d)) + (colossal ? 0 : hardness * (complexity.interaction * 1.2 - complexity.initialExitFraction * 2));
      if (value > bestValue) { bestValue = value; best = { ...b, ...details, mirrors: b.mirrors, springs: b.springs, locks: [], ...result, coverage: density, complexity }; }
      if (colossal || !hardness && density >= .96 && Math.abs(ratio - target(d)) <= .2) break;
    }
    if (!best) throw Error('Could not densely weave these grid dimensions');
    return best;
  }
  const api = { generate, coverage, valid, MIN_RATIO };
  if (node) module.exports = api; else root.MFGridGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
