// Monkey Fist level generation. Pure logic, no DOM, so it can be unit tested on its own
// (see tests/). Everything here is deterministic: the same inputs give the same levels on
// every device, which is what makes a level set shareable by its code.
'use strict';
const MFLevels = (() => {
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  // ---------- seeded randomness ----------
  function mulberry32(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function hashString(s) { // FNV-1a, 32 bit
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }

  // ---------- rope geometry ----------
  // A rope is a path of cells from tail to head. It leaves in the direction of its last segment.
  const headDir = path => { const h = path[path.length - 1], p = path[path.length - 2]; return [h.x - p.x, h.y - p.y]; };

  // Walk forward from the head. Reports the first rope in the way, if any.
  function ray(path, occ, W, H) {
    const h = path[path.length - 1], d = headDir(path);
    let x = h.x + d[0], y = h.y + d[1], dist = 0;
    while (x >= 0 && y >= 0 && x < W && y < H) {
      const o = occ[y * W + x];
      if (o !== -1) return { clear: false, dist, blocker: o };
      x += d[0]; y += d[1]; dist++;
    }
    return { clear: true, dist, blocker: -1 };
  }
  function selfBlocked(path) {
    const h = path[path.length - 1], d = headDir(path);
    return path.some(p => (d[0] ? p.y === h.y && (p.x - h.x) * d[0] > 0 : p.x === h.x && (p.y - h.y) * d[1] > 0));
  }
  function occupancy(paths, W, H) {
    const occ = new Int16Array(W * H).fill(-1);
    paths.forEach((path, id) => { for (const p of path) occ[p.y * W + p.x] = id; });
    return occ;
  }

  // ---------- difficulty ----------
  // Every rope standing anywhere in a rope's exit path has to leave before it can.
  function blockersOf(paths, W, H) {
    const occ = occupancy(paths, W, H);
    return paths.map((path, id) => {
      const h = path[path.length - 1], d = headDir(path), seen = new Set();
      for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) {
        const o = occ[y * W + x];
        if (o !== -1) seen.add(o); // a rope's own body in its path counts too, and makes it unsolvable
      }
      return [...seen];
    });
  }
  // Block cost of each rope: how many layers of other ropes must be cleared before it can go.
  // A free rope costs 0. A rope whose way is blocked costs 1 more than the deepest rope
  // blocking it, so a chain "A waits for B waits for C ... 7 deep" gives A a cost of 7.
  // Returns null if the ropes block each other in a loop (the level cannot be solved).
  function blockCosts(paths, W, H) {
    const a = analyse(paths, W, H);
    return a.stuck.length ? null : a.cost;
  }
  // One pass that answers everything about a board: each rope's block cost, which ropes can
  // never leave, and which of those are the actual knot.
  //
  // It is a topological sort of the "waits for" graph (Kahn's algorithm): release every rope
  // nothing is blocking, which may free the ropes waiting on it, and so on. A rope's cost is
  // 1 + the largest cost among its blockers, settled at the moment its last blocker is released.
  //
  // Cost: finding blockers walks one straight line per rope, so with R ropes on a W x H board
  // this is O(W*H + R * max(W, H)) time and memory, and each rope and each "waits for" link is
  // handled once. No rope is ever re-scanned, however deep the chains go.
  function analyse(paths, W, H) {
    const blk = blockersOf(paths, W, H), n = paths.length;
    const waiting = blk.map(b => b.length), waitedBy = paths.map(() => []);
    blk.forEach((bs, i) => { for (const b of bs) waitedBy[b].push(i); });
    const cost = new Array(n).fill(0), queue = [];
    for (let i = 0; i < n; i++) if (!waiting[i]) queue.push(i);
    for (let q = 0; q < queue.length; q++) {
      const b = queue[q];
      for (const i of waitedBy[b]) {
        if (cost[b] + 1 > cost[i]) cost[i] = cost[b] + 1;
        if (--waiting[i] === 0) queue.push(i);
      }
    }
    const stuck = [];
    for (let i = 0; i < n; i++) if (waiting[i] > 0) stuck.push(i);
    if (!stuck.length) return { cost, stuck, knot: stuck };
    // Stuck ropes are either part of a loop or merely waiting behind one. Peel away the ones
    // nothing stuck is waiting on, repeatedly; what remains is the knot itself.
    const isStuck = new Uint8Array(n), holds = new Int32Array(n), peel = [];
    for (const i of stuck) isStuck[i] = 1;
    for (const i of stuck) for (const b of blk[i]) if (isStuck[b] && b !== i) holds[b]++;
    const selfLoop = i => blk[i].includes(i);
    for (const i of stuck) if (!holds[i] && !selfLoop(i)) peel.push(i);
    for (let q = 0; q < peel.length; q++) {
      const i = peel[q]; isStuck[i] = 0;
      for (const b of blk[i]) if (isStuck[b] && --holds[b] === 0 && !selfLoop(b)) peel.push(b);
    }
    return { cost, stuck, knot: stuck.filter(i => isStuck[i]) };
  }
  // How many corners a rope turns.
  function bendsOf(path) {
    let n = 0;
    for (let i = 2; i < path.length; i++) if (path[i].x - path[i - 1].x !== path[i - 1].x - path[i - 2].x || path[i].y - path[i - 1].y !== path[i - 1].y - path[i - 2].y) n++;
    return n;
  }
  // A rope's score is its block cost plus one for each bend in it: a rope that winds around
  // is harder to follow and to plan around than a straight one, whether or not it is blocked.
  // So the total only reaches 0 on an empty board (or one of straight, unblocked ropes);
  // "nothing is blocked" is a separate question, answered by nothingBlocked().
  function ropeScores(paths, costs) { return paths.map((p, i) => costs[i] + bendsOf(p)); }
  function nothingBlocked(paths, W, H) { const costs = blockCosts(paths, W, H); return !!costs && costs.every(c => c === 0); }
  const total = a => a.reduce((x, y) => x + y, 0);
  // A level's difficulty (its "tangle") is the sum of its ropes' scores.
  function difficulty(paths, W, H) {
    const costs = blockCosts(paths, W, H);
    return costs ? total(ropeScores(paths, costs)) : Infinity;
  }

  // ---------- building one level ----------
  // Levels are built backwards. Ropes are added one at a time, in the reverse of the order they
  // will be pulled out, under a single rule:
  //
  //     a new rope's own way out must be clear of every rope already on the board.
  //
  // A new rope therefore never waits on an older one, so every "waits for" link runs from an
  // older rope to a newer one and a loop is impossible: the board is solvable by construction,
  // with nothing to untangle afterwards. A new rope may, however, be laid across the way out of
  // older ropes, and that is how depth is made on purpose: lay it across the path of a rope at
  // the bottom of a long chain and every rope up that chain gets one deeper.
  //
  // Stage one lays ropes. Each rope's effect on the score is known before it is placed, so the
  // builder steers: it paces the score to arrive in the slot [lo, hi) about when the board is as
  // full as planned, keeps the average block cost per rope up near `wantAvg`, never adds more
  // than the slot allows, and never adds a rope the depth floor could not afford.
  //
  // Stage two runs only if the board filled up short of its slot: it turns ropes around, keeping
  // a turn when the board stays solvable and the total block cost rises without overshooting.
  //
  // Finally the empty outer rows and columns are trimmed off.
  //
  // cfg: { W, H, lenLo, lenHi, straight, minLen, lo, hi, wantAvg, floor, cover, bends }
  // Returns { W, H, ropes, costs }, with a score no higher than the slot's top but possibly
  // below its bottom (the caller decides what to do with it), or null if the board is no good.
  //
  // Cost, with R ropes. Stage one looks at up to 6 placements per rope; trying one walks a rope
  // (its length), a few ways out (a board side each) and the ropes whose cost it would raise
  // (at most R): O(R * (R + max(W, H))). Stage two makes at most 4R tries, each one topological
  // sort over lists worked out once: O(R * (R + links)). Both are a few thousand simple steps.
  const TRIES_PER_STEP = 6, MAX_STUCK = 4;
  function construct(rng, cfg) {
    const W = cfg.W, H = cfg.H, N = W * H;
    const occ = new Int16Array(N).fill(-1);
    const lanes = new Array(N);  // lanes[cell]: the ropes whose way out passes through this cell
    // waiters[i]: ropes waiting on rope i. up[i]: length of the longest chain above it. laneFree[i]: empty cells left on its way out.
    const paths = [], laneCells = [], laneFree = [], waiters = [], up = [];
    let cost = [], costSum = 0, bendSum = 0, covered = 0;
    const sMin = Math.ceil(cfg.lo), sMax = Math.ceil(cfg.hi) - 1; // the whole-number scores inside the slot
    const meanLen = (cfg.lenLo + cfg.lenHi) / 2 * 0.85, coverGoal = cfg.cover * N;
    const xy = c => ({ x: c % W, y: c / W | 0 });

    // A random walk through empty cells starting at `start`, optionally with its first step
    // forced in direction `first`. `straight` is the chance each step carries straight on.
    const grow = (start, first, straight) => {
      const want = cfg.lenLo + Math.floor(rng() * (cfg.lenHi - cfg.lenLo + 1)), cells = [start];
      let last = -1;
      occ[start] = -2;
      while (cells.length < want) {
        const c = cells[cells.length - 1], x = c % W, y = c / W | 0, opts = [];
        for (let d = 0; d < 4; d++) {
          const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && occ[ny * W + nx] === -1) opts.push(d);
        }
        if (!opts.length || (cells.length === 1 && first >= 0 && !opts.includes(first))) break;
        const d = cells.length === 1 && first >= 0 ? first : last >= 0 && opts.includes(last) && rng() < straight ? last : opts[Math.floor(rng() * opts.length)];
        last = d;
        const nc = (y + DIRS[d][1]) * W + x + DIRS[d][0];
        cells.push(nc); occ[nc] = -2;
      }
      for (const c of cells) occ[c] = -1;
      return cells;
    };
    // The cells from (x, y) to the edge in direction d, not counting (x, y) itself; null if a rope is standing in them.
    const wayOut = (x, y, d) => {
      const out = [];
      for (x += d[0], y += d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) {
        if (occ[y * W + x] !== -1) return null;
        out.push(y * W + x);
      }
      return out;
    };
    // Pick an existing rope to lay the next one across. 'deep' favours ropes at the bottom of
    // long chains, 'leaf' is any rope nothing is blocking yet, 'inner' is any rope already blocked.
    const pickParent = kind => {
      let sum = 0;
      const w = paths.map((_, i) => { // only ropes that still have room on their way out for another to be laid across it
        const v = !laneFree[i] ? 0 : kind === 'inner' ? (cost[i] > 0 ? 1 : 0) : cost[i] > 0 ? 0 : kind === 'deep' ? (up[i] + 1) * (up[i] + 1) : 1;
        sum += v; return v;
      });
      if (!sum) return -1;
      let r = rng() * sum;
      for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
      return w.length - 1;
    };
    // Shape a rope that includes `start`. Usually head-first: point the head from `start` along a
    // clear way out (longer ways favoured, since they leave room to extend the chain) and lay the
    // body out behind it. Otherwise walk a body through `start` and use whichever end can get out.
    const shape = (start, straight) => {
      const s = xy(start);
      if (rng() < 0.75) {
        const opts = []; let sum = 0;
        for (let d = 0; d < 4; d++) {
          const bx = s.x - DIRS[d][0], by = s.y - DIRS[d][1]; // the body's first cell sits behind the head
          if (bx < 0 || by < 0 || bx >= W || by >= H || occ[by * W + bx] !== -1) continue;
          const out = wayOut(s.x, s.y, DIRS[d]);
          if (out) { opts.push({ d, out, w: out.length + 1 }); sum += out.length + 1; }
        }
        if (opts.length) {
          let r = rng() * sum, o = opts[opts.length - 1];
          for (const cand of opts) { r -= cand.w; if (r < 0) { o = cand; break; } }
          const cells = grow(start, (o.d + 2) % 4, straight), path = cells.map(xy).reverse();
          if (cells.length >= cfg.minLen && !selfBlocked(path)) return { cells, path, out: o.out };
        }
      }
      const cells = grow(start, -1, straight);
      if (cells.length < cfg.minLen) return null;
      const a = cells.map(xy), b = a.slice().reverse(), ok = [];
      for (const p of [a, b]) if (!selfBlocked(p)) { const h = p[p.length - 1], out = wayOut(h.x, h.y, headDir(p)); if (out) ok.push({ cells, path: p, out }); }
      if (!ok.length) return null;
      return ok.length === 2 && (ok[1].out.length > ok[0].out.length || (ok[1].out.length === ok[0].out.length && rng() < 0.5)) ? ok[1] : ok[0];
    };
    // One possible next rope, with what it would do to the score. Null if it does not fit.
    // 'plain' is a straight rope anywhere: the only kind that can add nothing to the score.
    const candidate = kind => {
      let start = -1;
      const parent = kind === 'any' || kind === 'plain' ? -1 : pickParent(kind);
      if (parent >= 0) { const free = laneCells[parent].filter(c => occ[c] === -1); if (free.length) start = free[Math.floor(rng() * free.length)]; }
      for (let t = 0; start < 0 && t < 6; t++) { const c = Math.floor(rng() * N); if (occ[c] === -1) start = c; }
      if (start < 0) return null;
      const c = shape(start, kind === 'plain' ? 1 : cfg.straight);
      if (!c) return null;
      // Every rope whose way out this one lies across now waits on it; pass the rise up their chains.
      const above = new Set();
      for (const cell of c.cells) if (lanes[cell]) for (const id of lanes[cell]) above.add(id);
      const next = cost.slice(), queue = [];
      let gain = 0;
      for (const i of above) if (next[i] < 1) { gain += 1 - next[i]; next[i] = 1; queue.push(i); }
      for (let q = 0; q < queue.length; q++) {
        const i = queue[q];
        for (const j of waiters[i]) if (next[j] < next[i] + 1) { gain += next[i] + 1 - next[j]; next[j] = next[i] + 1; queue.push(j); }
      }
      return { path: c.path, out: c.out, cells: c.cells, above, next, gain, bends: bendsOf(c.path) };
    };
    const commit = c => {
      const id = paths.length;
      paths.push(c.path);
      for (const cell of c.cells) { occ[cell] = id; if (lanes[cell]) for (const i of lanes[cell]) laneFree[i]--; }
      covered += c.cells.length;
      cost = c.next; cost.push(0); costSum += c.gain; bendSum += c.bends;
      waiters.push([...c.above]);
      let u = 0; for (const i of c.above) if (up[i] + 1 > u) u = up[i] + 1;
      up.push(u);
      laneCells.push(c.out); laneFree.push(c.out.length);
      for (const cell of c.out) (lanes[cell] || (lanes[cell] = [])).push(id);
    };

    let stuck = 0;
    for (let guard = 0; guard < 2 * N; guard++) {
      const n = paths.length, score = costSum + bendSum;
      if (score >= sMin && n >= MIN_ROPES && covered >= MIN_COVERAGE * N) break;
      const budget = sMax - score; // the most this step may add
      // How much block cost should the next rope add? Two pulls, and the larger wins:
      //   pace  - spread what is still missing over the ropes there is still room for, so the
      //           score arrives in its slot about when the board is as full as planned;
      //   depth - keep the average block cost per rope up at `wantAvg`.
      const room = Math.max(1, (coverGoal - covered) / meanLen);
      const pace = ((sMin + sMax) / 2 - score) / room - cfg.bends, depth = cfg.wantAvg * (n + 1) - costSum;
      const desire = Math.max(0, Math.min(budget, Math.round(Math.max(pace, depth))));
      // What to try this step. Deep placements when the level needs depth, shallower ones as it
      // nears its slot (where a deep one would overshoot), and plain straight ropes when the score
      // must not move at all.
      const need = sMin - score;
      const kinds = !n ? ['any'] : budget < 1 ? ['plain'] : desire >= 2 ? ['deep', 'deep', 'leaf', 'inner', 'deep', 'any', 'leaf', 'inner'] : desire >= 1 ? ['leaf', 'inner', 'any', 'leaf', 'inner', 'plain', 'any', 'leaf'] : ['inner', 'any', 'plain', 'inner', 'any', 'plain', 'inner', 'any'];
      let best = null, bestMiss = Infinity;
      for (let k = 0; k < TRIES_PER_STEP; k++) {
        const c = candidate(kinds[k % kinds.length]);
        if (!c || c.gain + c.bends > budget) continue;
        // Never add a rope the depth floor cannot afford: with one more rope and its bends, the slot's
        // top score must still be able to cover the minimum average block cost for every rope.
        if (cfg.floor * (n + 1) + bendSum + c.bends > sMax) continue;
        // Closest to the cost wanted, with a little noise so equal choices vary. While the level still
        // needs to get deeper, favour ropes with a long way out: they leave room to extend the chain.
        // A rope that drops the score into its slot once the board is full enough beats any other.
        const lands = need > 0 && c.gain + c.bends >= need && covered + c.cells.length >= MIN_COVERAGE * N;
        const miss = Math.abs(c.gain - desire) + rng() * 0.6 - (desire >= 2 ? Math.min(c.out.length, 4) * 0.2 : 0) - (lands ? 100 : 0);
        if (miss < bestMiss) { best = c; bestMiss = miss; }
      }
      if (!best) { if (++stuck > MAX_STUCK) break; continue; }
      stuck = 0; commit(best);
    }
    // Second stage, if the board filled up before the score reached its slot: turn ropes around.
    // Take them in random order and keep a turn only if the board is still solvable and the total
    // block cost rose without overshooting the slot. Turning a rope never changes its bends, so
    // only block cost moves.
    //
    // Turning a rope does not change which cells are occupied, so what every rope would wait on,
    // facing either way, can be worked out once up front. Each try is then just a topological sort
    // over those lists: O(R + links), with no walking of the board. At most four sweeps of R tries.
    if (costSum + bendSum < sMin) {
      const n = paths.length;
      const waitsOn = path => { // the ropes standing in this path's way out; null if its own body is
        const h = path[path.length - 1], d = headDir(path), ids = [], me = occ[h.y * W + h.x];
        for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) {
          const o = occ[y * W + x];
          if (o === me) return null;
          if (o !== -1 && !ids.includes(o)) ids.push(o);
        }
        return ids;
      };
      const now = paths.map(waitsOn), turned = paths.map(p => waitsOn(p.slice().reverse())), flipped = new Uint8Array(n);
      const waiting = new Int16Array(n), by = paths.map(() => []), queue = new Int16Array(n);
      let trial = new Array(n);
      const evaluate = () => { // total block cost with the current lists, or -1 if they loop
        for (let i = 0; i < n; i++) { by[i].length = 0; trial[i] = 0; }
        for (let i = 0; i < n; i++) { waiting[i] = now[i].length; for (const b of now[i]) by[b].push(i); }
        let head = 0, tail = 0, sum = 0;
        for (let i = 0; i < n; i++) if (!waiting[i]) queue[tail++] = i;
        while (head < tail) {
          const b = queue[head++]; sum += trial[b];
          for (const i of by[b]) { if (trial[b] + 1 > trial[i]) trial[i] = trial[b] + 1; if (--waiting[i] === 0) queue[tail++] = i; }
        }
        return tail === n ? sum : -1;
      };
      for (let sweep = 0; sweep < 4 && costSum + bendSum < sMin; sweep++) {
        const order = paths.map((_, i) => i);
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
        let improved = false;
        for (const i of order) {
          if (costSum + bendSum >= sMin) break;
          if (!turned[i]) continue;
          const keep = now[i]; now[i] = turned[i]; turned[i] = keep;
          const s = evaluate();
          if (s > costSum && s + bendSum <= sMax) { costSum = s; const t = cost; cost = trial; trial = t.length === n ? t : new Array(n); flipped[i] ^= 1; improved = true; }
          else { turned[i] = now[i]; now[i] = keep; }
        }
        if (!improved) break;
      }
      for (let i = 0; i < n; i++) if (flipped[i]) paths[i] = paths[i].slice().reverse();
    }
    const n = paths.length;
    if (n < MIN_ROPES) return null;
    // Trim away empty outer rows and columns. Nothing depends on them (a way out that crossed
    // empty cells still crosses the same ropes), and it stops a level sitting in a half-empty board.
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const p of paths) for (const c of p) { if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x; if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y; }
    let w = x1 - x0 + 1, h = y1 - y0 + 1;
    const tall = h >= w; // keep boards portrait: if trimming left it wider than tall, turn it on its side
    const ropes = paths.map(p => p.map(c => (tall ? { x: c.x - x0, y: c.y - y0 } : { x: c.y - y0, y: c.x - x0 })));
    if (!tall) { const t = w; w = h; h = t; }
    if (!goodEnough(ropes, w, h, cost)) return null;
    return { W: w, H: h, ropes, costs: cost };
  }

  // ---------- level sets ----------
  // Every difficulty setting is a difficulty range plus a depth floor, and a set fills its range evenly.
  // (Difficulty = the sum of the ropes' scores, as above: block cost plus bends for every rope.)
  //
  // minAvgCost: the least a level's average block cost per rope may be. Without it the cheapest
  // way to a high score is a crowd of short ropes that barely block each other; with it, harder
  // settings have to be built from deeper chains.
  // The floor rises with difficulty: the more tangled a level is meant to be, the deeper its
  // chains must run. (A level of tangle 15 has too few ropes to average 4 deep; one of 150 does not.)
  // Each entry is [from this difficulty, minimum average block cost per rope].
  const FLOORS = [[150, 5.5], [100, 5], [60, 4], [40, 3], [20, 2.5], [10, 1.5]];
  const floorFor = d => { for (const f of FLOORS) if (d >= f[0]) return f[1]; return 0; };
  const MODES = {
    E: { name: 'Easy', range: [2, 40], minAvgCost: floorFor },
    N: { name: 'Normal', range: [20, 80], minAvgCost: floorFor },
    H: { name: 'Hard', range: [60, 130], minAvgCost: floorFor },
    X: { name: 'Extreme', range: [100, 200], minAvgCost: floorFor },
    C: { name: 'Built-in', range: [1, 200], ease: true, minAvgCost: floorFor }, // the built-in levels: the whole span, starting gently
  };
  const PLAYER_MODES = ['E', 'N', 'H', 'X'];
  const COUNTS = [10, 20, 30];

  // Rope styles. Every level draws one at random, so within any set some levels are made of
  // short straight ropes and others of long twisty ones. `straight` is the chance a growing
  // rope carries straight on instead of turning; `bends` is roughly how many corners a rope of
  // that style ends up with, used only to plan the board size.
  const STYLES = [
    { name: 'short', share: 0.4, minLen: 2, straight: 0.5, lenLo: 3, lenHi: () => 5, bends: 0.7 },
    { name: 'medium', share: 0.33, minLen: 2, straight: 0.35, lenLo: 4, lenHi: () => 8, bends: 1.3 },
    { name: 'twisty', share: 0.27, minLen: 3, straight: 0.2, lenLo: 6, lenHi: W => Math.max(8, W), bends: 2.4 },
  ];
  const TWISTY_W = 7; // long twisty ropes need a board at least this wide

  // Board sizes. `big` sets use longer ropes and may use the larger boards.
  const WIDTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  const BIG_WIDTHS = WIDTHS.concat([13, 14, 15, 16]);
  const heightFor = W => Math.min(22, Math.round(W * 1.35)); // 4x5 ... 12x16 ... 16x22

  // A board has to earn its size. Reject boards that are mostly empty, and boards beyond the
  // smallest sizes where most ropes can simply leave without waiting for anything.
  const MIN_ROPES = 3;
  const MIN_COVERAGE = 0.5;       // share of cells that must hold rope
  const MIN_BLOCKED_SHARE = 0.5;  // share of ropes that must be blocked, on boards 6 wide and up
  const SMALL_W = 5;              // boards this narrow may be simple (they are the gentle start)
  function quality(ropes, W, H, knownCosts) {
    const costs = knownCosts || blockCosts(ropes, W, H) || [];
    const cells = ropes.reduce((a, p) => a + p.length, 0);
    return { coverage: cells / (W * H), blockedShare: ropes.length ? costs.filter(c => c > 0).length / ropes.length : 0 };
  }
  function goodEnough(ropes, W, H, knownCosts) {
    if (ropes.length < MIN_ROPES) return false;
    const q = quality(ropes, W, H, knownCosts);
    return q.coverage >= MIN_COVERAGE && (W <= SMALL_W || q.blockedShare >= MIN_BLOCKED_SHARE);
  }

  // The slots a mode's range is cut into for `n` levels: slot j covers [edges[j], edges[j+1]).
  // Equal slices, except that the built-in set bunches its slots toward the easy end.
  function slotEdges(mode, n) {
    const M = MODES[mode], lo = M.range[0], width = M.range[1] - lo + 1, edges = [];
    for (let j = 0; j <= n; j++) { const t = j / n; edges.push(lo + width * (M.ease ? (t + t * t) / 2 : t)); }
    return edges;
  }

  // Decide what kind of level to build for one slot: rope style, how deep, and a board sized
  // to hold about the right number of ropes. `attempt` nudges the board size on retries.
  const SIZE_NUDGE = [0, -1, 1, -2, 2, 0, -1, 1];
  function plan(rng, mode, lo, hi, big, attempt) {
    const M = MODES[mode], target = (lo + hi) / 2, floor = M.minAvgCost(Math.ceil(hi) - 1);
    const u = rng();
    let s = u < STYLES[0].share ? 0 : u < STYLES[0].share + STYLES[1].share ? 1 : 2;
    // Aim a little past the floor. The very smallest targets cannot be deep: there has to be room for a few ropes.
    const wantAvg = Math.max(floor, Math.min(floor > 0 ? floor + 0.3 + rng() * 1.5 : 0.6 + rng() * 1.6, (target - 1) / 4));
    const stretch = big ? 1.5 : 1, widths = big ? BIG_WIDTHS : WIDTHS, cover = 0.58 + rng() * 0.17; // how full the board should end up
    let W = 0, st, lenLo, lenHi;
    for (let pass = 0; pass < 2; pass++) { // twice, because a twisty style needs a wide enough board
      st = STYLES[s];
      lenLo = Math.round(st.lenLo * stretch); lenHi = Math.round(st.lenHi(W || 9) * stretch);
      const ropes = Math.max(4, target / (wantAvg + st.bends)), area = ropes * (lenLo + lenHi) / 2 * 0.85 / cover;
      let i = widths.findIndex(w => w * heightFor(w) >= area); if (i < 0) i = widths.length - 1;
      W = widths[Math.max(0, Math.min(widths.length - 1, i + SIZE_NUDGE[attempt % SIZE_NUDGE.length]))];
      if (s === 2 && W < TWISTY_W) s = 1; else break;
    }
    return { W, H: heightFor(W), lenLo, lenHi: Math.max(lenLo, lenHi), straight: st.straight, minLen: Math.max(st.minLen, W >= 8 ? 3 : 2), // no two-cell stubs on the larger boards
      lo, hi, wantAvg, floor, cover, bends: st.bends, style: st.name, seed: Math.floor(rng() * 4294967296) >>> 0 };
  }

  // The algorithm, for a seed, a difficulty setting and a number of levels:
  //   1. Cut the setting's difficulty range into one slot per level. One level per slot means
  //      the set is spread evenly over the range and no two levels can share a difficulty.
  //   2. Aim at the empty slots in turn: plan a level for that slot (rope style, depth, board
  //      size) and build it to land there (see construct).
  //   3. The level takes whichever empty slot its score falls in, provided it meets that
  //      difficulty's depth floor. Usually that is the slot aimed at; a build that comes up short
  //      can still fill an easier one. Otherwise it is discarded.
  //   4. Stop when every slot is filled. Slots run from easiest to hardest, so the set comes out
  //      already sorted.
  // The work is bounded: at most count*60 builds, and it gives up if 600 builds in a row fill
  // nothing (the set then has fewer levels than asked for).
  // opts: { seed: string, mode: 'E'|'N'|'H'|'X', count: number, big: boolean }
  function generateSet(opts) {
    const mode = MODES[opts.mode] ? opts.mode : 'N', M = MODES[mode], seed = cleanSeed(opts.seed), big = !!opts.big;
    const count = Math.max(1, opts.count | 0), n = Math.min(count, M.range[1] - M.range[0] + 1);
    const rng = mulberry32(hashString('monkey-fist/8|' + mode + (big ? 'B|' : '|') + seed));
    const edges = slotEdges(mode, n), slots = new Array(n).fill(null);
    const slotOf = score => { let j = 0; while (j < n - 1 && score >= edges[j + 1]) j++; return j; };
    const maxBuilds = count * 60, maxStall = 600;
    let filled = 0, builds = 0, stall = 0, next = 0;
    while (filled < n && builds < maxBuilds && stall < maxStall) {
      builds++; stall++;
      while (slots[next % n]) next++;
      const aim = next++ % n, cfg = plan(rng, mode, edges[aim], edges[aim + 1], big, builds), L = construct(mulberry32(cfg.seed), cfg);
      if (!L) continue;
      const costSum = total(L.costs), score = costSum + total(L.ropes.map(bendsOf)), avgCost = costSum / L.ropes.length;
      if (score < M.range[0] || score > M.range[1] || avgCost < M.minAvgCost(score)) continue;
      const slot = slotOf(score); // a build that falls short of the slot it aimed at can still fill an easier one
      if (slots[slot]) continue;
      // W and H are the finished board; boardW and boardH are the one it was built on, which rebuilding needs.
      slots[slot] = Object.assign(cfg, { boardW: cfg.W, boardH: cfg.H, W: L.W, H: L.H, difficulty: score, ropes: L.ropes.length, avgCost });
      filled++; stall = 0;
    }
    const levels = slots.filter(Boolean);
    return { seed, mode, count, big, levels, builds, code: encodeCode({ seed, mode, count, big }) };
  }
  // Rebuild a level's ropes from its descriptor.
  function levelFrom(d) { return construct(mulberry32(d.seed), Object.assign({}, d, { W: d.boardW, H: d.boardH })); }

  // ---------- share codes: mode + count (+ B for bigger boards) + seed, e.g. "N20-K7F3Q" or "X30B-K7F3Q" ----------
  const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to mix up
  function randomSeed(rand) {
    let s = '';
    for (let i = 0; i < 5; i++) s += SEED_CHARS[Math.floor((rand || Math.random)() * SEED_CHARS.length)];
    return s;
  }
  const cleanSeed = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  function encodeCode(o) { return o.mode + o.count + (o.big ? 'B' : '') + '-' + cleanSeed(o.seed); }
  function parseCode(text) {
    const m = /^\s*([ENHX])\s*(\d{1,2})\s*(B?)\s*-\s*([A-Z0-9]{1,10})\s*$/i.exec(String(text));
    if (!m) return null;
    const count = +m[2];
    if (!COUNTS.includes(count)) return null;
    return { mode: m[1].toUpperCase(), count, big: !!m[3], seed: m[4].toUpperCase() };
  }

  // The built-in levels are simply one fixed set, kept to boards that fit a phone.
  const CAMPAIGN = { seed: 'MONKEYFIST', mode: 'C', count: 60, big: false };

  return { mulberry32, hashString, headDir, ray, selfBlocked, occupancy, blockersOf, analyse, blockCosts, bendsOf, ropeScores, nothingBlocked, difficulty,
    construct, plan, generateSet, levelFrom, slotEdges, randomSeed, cleanSeed, encodeCode, parseCode, quality, goodEnough, heightFor, FLOORS, floorFor,
    MODES, PLAYER_MODES, COUNTS, STYLES, WIDTHS, BIG_WIDTHS, CAMPAIGN, MIN_ROPES, MIN_COVERAGE, MIN_BLOCKED_SHARE, SMALL_W, TWISTY_W };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MFLevels;
