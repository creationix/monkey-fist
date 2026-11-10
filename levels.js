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
  // A level's difficulty is the sum of its ropes' block costs.
  function difficulty(paths, W, H) {
    const costs = blockCosts(paths, W, H);
    return costs ? costs.reduce((a, b) => a + b, 0) : Infinity;
  }

  // ---------- building one level ----------
  // cfg: { W, H, maxLen, fill, straight }. Fills the board with random ropes, then untangles any
  // deadlock so the result is always solvable.
  function build(rng, cfg) {
    const { W, H } = cfg, occ = new Int16Array(W * H).fill(-1), ns = [];
    const straight = cfg.straight == null ? 0.5 : cfg.straight; // chance a growing rope carries straight on rather than turning
    const minLen = Math.max(2, cfg.minLen | 0);                  // ropes that get boxed in shorter than this are discarded
    const cells = [...Array(W * H).keys()];
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    let filled = 0;
    for (const c of cells) {
      if (filled >= cfg.fill * W * H) break;
      if (occ[c] !== -1) continue;
      const want = 2 + Math.floor(rng() * (cfg.maxLen - 1)), id = ns.length, path = [{ x: c % W, y: c / W | 0 }];
      occ[c] = id;
      let last = -1;
      while (path.length < want) {
        const h = path[path.length - 1], opts = [];
        for (let d = 0; d < 4; d++) {
          const nx = h.x + DIRS[d][0], ny = h.y + DIRS[d][1];
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && occ[ny * W + nx] === -1) opts.push(d);
        }
        if (!opts.length) break;
        const d = last >= 0 && opts.includes(last) && rng() < straight ? last : opts[Math.floor(rng() * opts.length)];
        last = d;
        const np = { x: h.x + DIRS[d][0], y: h.y + DIRS[d][1] };
        path.push(np); occ[np.y * W + np.x] = id;
      }
      const drop = () => { for (const p of path) occ[p.y * W + p.x] = -1; };
      if (path.length < minLen) { drop(); continue; }
      const rev = path.slice().reverse(), okA = !selfBlocked(path), okB = !selfBlocked(rev);
      if (!okA && !okB) { drop(); continue; }
      const useRev = okA && okB ? rng() < 0.5 : okB;
      ns.push({ path: useRev ? rev : path, flipped: false, dead: false });
      filled += path.length;
    }
    // Untangle deadlocks: pick a rope from the knot and turn it around, or drop it if it has
    // already been turned. Each rope is turned at most once and dropped at most once, so this
    // loop runs at most 2R times, each pass a linear analyse(): O(R * (W*H + R * max(W, H))) worst case.
    let live = ns, a;
    for (;;) {
      a = analyse(live.map(n => n.path), W, H);
      if (!a.stuck.length) break;
      const n = live[a.knot[Math.floor(rng() * a.knot.length)]];
      const rev = n.path.slice().reverse();
      if (!n.flipped && !selfBlocked(rev)) { n.path = rev; n.flipped = true; }
      else live = live.filter(m => m !== n);
    }
    return { W, H, ropes: live.map(n => n.path), costs: a.cost };
  }

  // ---------- level sets ----------
  // How each difficulty setting draws from the candidate pool, as shares of the
  // easiest third, the middle third and the hardest third.
  const MODES = {
    E: { name: 'Easy', weights: [0.7, 0.2, 0.1] },
    N: { name: 'Normal', weights: [1 / 3, 1 / 3, 1 / 3] },
    H: { name: 'Hard', weights: [0.1, 0.2, 0.7] },
    // Extreme works differently: it aims straight at a difficulty range and fills it evenly,
    // so no level scores below 100. See generateRange().
    X: { name: 'Extreme', range: [100, 200] },
  };
  const COUNTS = [10, 20, 30];
  const MIN_ROPES = 3;

  // A candidate's board size, rope length and crowding are all random. Bigger, fuller
  // boards score higher, so the difficulty setting ends up deciding the size.
  // With `twisty` on, every board is 7 wide or more and its ropes run up to about twice the
  // board width, turn far more often, and are never shorter than 4. Long ropes mean fewer ropes,
  // so twisty sets score lower overall and offer a narrower spread of difficulties.
  const TWISTY_W = 7;
  function randomCfg(rng, twisty) {
    const W = twisty ? TWISTY_W + Math.floor(Math.min(rng(), rng()) * (11 - TWISTY_W)) // 7..10, leaning small
      : 4 + Math.floor(Math.min(rng(), rng()) * 7);                                // 4..10, leaning small
    const H = Math.min(14, Math.round(W * 1.35));
    if (twisty) return { W, H, maxLen: 8 + Math.floor(rng() * (W * 2 - 7)), fill: 0.6 + rng() * 0.36, straight: 0.2, minLen: 4 };
    return { W, H, maxLen: 3 + Math.floor(rng() * Math.min(7, W)), fill: 0.6 + rng() * 0.36, straight: 0.5, minLen: 2 };
  }
  // A board has to earn its size. Reject boards that are mostly empty, and boards beyond the
  // smallest sizes where most ropes can simply leave without waiting for anything.
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
  // Split `n` picks across the three thirds by weight (largest-remainder rounding), then move
  // any picks a third cannot supply to the thirds this mode favours most.
  function quotas(n, weights, avail) {
    const exact = weights.map(w => n * w), q = exact.map(Math.floor);
    const order = [0, 1, 2].sort((a, b) => (exact[b] - q[b]) - (exact[a] - q[a]) || weights[b] - weights[a] || a - b);
    for (let i = 0, left = n - q[0] - q[1] - q[2]; left > 0; i++, left--) q[order[i % 3]]++;
    const pref = [0, 1, 2].sort((a, b) => weights[b] - weights[a] || a - b);
    let spare = 0;
    for (let i = 0; i < 3; i++) if (q[i] > avail[i]) { spare += q[i] - avail[i]; q[i] = avail[i]; }
    for (const i of pref) { const take = Math.min(spare, avail[i] - q[i]); q[i] += take; spare -= take; }
    return q;
  }
  // The algorithm:
  //   1. From the seed, generate candidate levels until there are 3x as many as needed,
  //      keeping only one level per difficulty score so every level's difficulty is unique.
  //   2. Sort the candidates by difficulty and cut them into thirds.
  //   3. Easy takes mostly from the easiest third, Normal evenly from all three,
  //      Hard mostly from the hardest third.
  //   4. Return the picks in order from simplest to hardest.
  // opts: { seed: string, mode: 'E'|'N'|'H', count: number, twisty: boolean }
  function generateSet(opts) {
    const mode = MODES[opts.mode] ? opts.mode : 'N', count = Math.max(1, opts.count | 0), seed = cleanSeed(opts.seed), twisty = !!opts.twisty;
    if (MODES[mode].range) return generateRange(seed, mode, count);
    const rng = mulberry32(hashString('monkey-fist/1|' + (twisty ? 'T|' : '') + seed));
    // Stop at 3x the levels needed. Difficulty scores only span a limited range, so a large
    // request can run out of unused scores; give up once new ones stop turning up rather than
    // grinding on. Both limits keep the work bounded: at most count*60 builds, each a few
    // thousand simple steps.
    const want = count * 3, maxBuilds = count * 60, maxStall = 600, byScore = new Map();
    let stall = 0;
    let builds = 0;
    while (byScore.size < want && builds < maxBuilds && stall < maxStall) {
      builds++; stall++;
      const cfg = randomCfg(rng, twisty), lvSeed = Math.floor(rng() * 4294967296) >>> 0;
      const L = build(mulberry32(lvSeed), cfg);
      if (!goodEnough(L.ropes, L.W, L.H, L.costs)) continue;
      const score = L.costs.reduce((x, y) => x + y, 0); // costs come straight from the build's final analysis
      if (!byScore.has(score)) stall = 0;
      if (!byScore.has(score)) byScore.set(score, { W: cfg.W, H: cfg.H, maxLen: cfg.maxLen, fill: cfg.fill, straight: cfg.straight, minLen: cfg.minLen, seed: lvSeed, difficulty: score, ropes: L.ropes.length });
    }
    const pool = [...byScore.values()].sort((a, b) => a.difficulty - b.difficulty);
    const P = pool.length, n = Math.min(count, P), cuts = [0, Math.floor(P / 3), Math.floor(2 * P / 3), P];
    const avail = [0, 1, 2].map(i => cuts[i + 1] - cuts[i]);
    const q = quotas(n, MODES[mode].weights, avail);
    const levels = [];
    for (let t = 0; t < 3; t++) {
      for (let j = 0; j < q[t]; j++) { // spread the picks evenly across the third
        const lv = pool[cuts[t] + Math.floor((j + 0.5) * avail[t] / q[t])];
        levels.push(Object.assign({ third: t }, lv));
      }
    }
    levels.sort((a, b) => a.difficulty - b.difficulty);
    return { seed, mode, count, twisty, levels, pool: P, poolScores: pool.map(l => l.difficulty), builds, code: encodeCode({ seed, mode, count, twisty }) };
  }
  // ---------- range-targeted sets ----------
  // For a mode with a difficulty range, the range itself is the goal:
  //   1. Cut the range into one equal slot per level wanted. One level per slot means the set
  //      fills the range evenly and no two levels can share a difficulty.
  //   2. Aim at the empty slots in turn. For the slot's difficulty, pick the board width most
  //      likely to land near it, then build a level with random rope length and crowding.
  //   3. If the level's difficulty falls in a slot that is still empty, it takes that slot
  //      (whichever slot that is, not only the one aimed at). Otherwise it is discarded.
  //   4. Stop as soon as every slot is filled.
  // Aiming is what keeps this cheap: without it, the rare slots at the top of the range would
  // take hundreds of wasted builds to hit by chance. Work is bounded the same way as elsewhere:
  // at most count*60 builds, and it gives up if 600 builds in a row fill nothing.
  //
  // GUESS is the typical difficulty of an ordinary board of each width (about 0.012 * cells^1.9,
  // measured). It only has to be roughly right: a running ratio of the difficulties actually
  // seen to the guesses made corrects it for the rope style in use.
  const GUESS = { 4: 3.5, 5: 10, 6: 19, 7: 32, 8: 59, 9: 88, 10: 143, 11: 196, 12: 260 };
  const RANGE_WIDTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  const heightFor = W => Math.min(16, Math.round(W * 1.35)); // up to 12x16
  //
  // Range-targeted sets always use ordinary ropes. Long twisty ropes mean far fewer ropes per
  // board, and on boards up to 12x16 they cannot reach the top of the 100-200 range reliably.
  function generateRange(seed, mode, count) {
    const lo = MODES[mode].range[0], hi = MODES[mode].range[1], twisty = false;
    const rng = mulberry32(hashString('monkey-fist/2|' + mode + '|' + seed));
    const n = Math.min(count, hi - lo + 1), span = (hi - lo + 1) / n, slots = new Array(n).fill(null);
    const widths = RANGE_WIDTHS;
    const maxBuilds = count * 60, maxStall = 600;
    let filled = 0, builds = 0, stall = 0, next = 0, seenSum = 0, guessSum = 0;
    while (filled < n && builds < maxBuilds && stall < maxStall) {
      builds++; stall++;
      while (slots[next % n]) next++;
      const target = lo + (next++ % n + 0.5) * span;
      const scale = guessSum ? seenSum / guessSum : 1;
      let pick = 0, best = Infinity;
      widths.forEach((W, i) => { const r = GUESS[W] * scale / target, miss = r > 1 ? r : 1 / r; if (miss < best) { best = miss; pick = i; } });
      const W = widths[Math.max(0, Math.min(widths.length - 1, pick + Math.floor(rng() * 3) - 1))]; // one size either side, for variety
      const cfg = { W, H: heightFor(W), maxLen: 3 + Math.floor(rng() * 5), fill: 0.7 + rng() * 0.27, straight: 0.5, minLen: 2 };
      const lvSeed = Math.floor(rng() * 4294967296) >>> 0, L = build(mulberry32(lvSeed), cfg);
      if (!goodEnough(L.ropes, L.W, L.H, L.costs)) continue;
      const score = L.costs.reduce((x, y) => x + y, 0);
      seenSum += score; guessSum += GUESS[W];
      if (score < lo || score > hi) continue;
      const slot = Math.min(n - 1, Math.floor((score - lo) / span));
      if (slots[slot]) continue;
      slots[slot] = { W: cfg.W, H: cfg.H, maxLen: cfg.maxLen, fill: cfg.fill, straight: cfg.straight, minLen: cfg.minLen, seed: lvSeed, difficulty: score, ropes: L.ropes.length };
      filled++; stall = 0;
    }
    const levels = slots.filter(Boolean), P = levels.length; // already in order: slots run from easiest to hardest
    levels.forEach((lv, i) => { lv.third = i < Math.floor(P / 3) ? 0 : i < Math.floor(2 * P / 3) ? 1 : 2; });
    return { seed, mode, count, twisty, levels, pool: P, poolScores: levels.map(l => l.difficulty), builds, code: encodeCode({ seed, mode, count, twisty }) };
  }

  // Rebuild a level's ropes from its descriptor.
  function levelFrom(d) { return build(mulberry32(d.seed), d); }

  // ---------- share codes: mode + count (+ T for twisty) + seed, e.g. "N20-K7F3Q" or "H30T-K7F3Q" ----------
  const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to mix up
  function randomSeed(rand) {
    let s = '';
    for (let i = 0; i < 5; i++) s += SEED_CHARS[Math.floor((rand || Math.random)() * SEED_CHARS.length)];
    return s;
  }
  const cleanSeed = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  function encodeCode(o) { return o.mode + o.count + (o.twisty && !(MODES[o.mode] || {}).range ? 'T' : '') + '-' + cleanSeed(o.seed); }
  function parseCode(text) {
    const m = /^\s*([ENHX])\s*(\d{1,2})\s*(T?)\s*-\s*([A-Z0-9]{1,10})\s*$/i.exec(String(text));
    if (!m) return null;
    const count = +m[2];
    if (!COUNTS.includes(count)) return null;
    const mode = m[1].toUpperCase();
    return { mode, count, twisty: !!m[3] && !MODES[mode].range, seed: m[4].toUpperCase() }; // range modes have no twisty variant
  }

  // The built-in levels are simply one fixed set.
  const CAMPAIGN = { seed: 'MONKEYFIST', mode: 'N', count: 60, twisty: false };

  return { mulberry32, hashString, headDir, ray, selfBlocked, occupancy, blockersOf, analyse, blockCosts, difficulty, build, generateSet, levelFrom,
    randomSeed, cleanSeed, encodeCode, parseCode, quotas, quality, goodEnough, MODES, COUNTS, CAMPAIGN, MIN_ROPES, MIN_COVERAGE, MIN_BLOCKED_SHARE, SMALL_W, TWISTY_W };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MFLevels;
