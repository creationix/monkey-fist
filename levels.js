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
    // Untangle deadlocks. Each pass analyses the board and, if there is a knot, turns around
    // about a third of the knot's ropes that have not been turned yet (turning costs nothing,
    // so several go at once). Only when none are left to turn is a rope dropped, one per pass,
    // so the board keeps as many ropes as it can. Each rope is turned at most once and dropped
    // at most once: at most 2R passes of a linear analyse(), O(R * (W*H + R * max(W, H))) worst case.
    let live = ns, a;
    for (;;) {
      a = analyse(live.map(n => n.path), W, H);
      if (!a.stuck.length) break;
      const fresh = a.knot.filter(i => !live[i].flipped);
      let turned = 0;
      for (let k = Math.ceil(fresh.length / 3); k > 0; k--) {
        const n = live[fresh.splice(Math.floor(rng() * fresh.length), 1)[0]], rev = n.path.slice().reverse();
        n.flipped = true; // tried, whether or not it could turn
        if (!selfBlocked(rev)) { n.path = rev; turned++; }
      }
      if (!turned) { const n = live[a.knot[Math.floor(rng() * a.knot.length)]]; live = live.filter(m => m !== n); }
    }
    return { W, H, ropes: live.map(n => n.path), costs: a.cost };
  }

  // ---------- level sets ----------
  // Every difficulty setting is a difficulty range, and a set fills its range evenly.
  // (Difficulty = the sum of the ropes' scores, as above: block cost plus bends for every rope.)
  const MODES = {
    E: { name: 'Easy', range: [2, 40] },
    N: { name: 'Normal', range: [20, 80] },
    H: { name: 'Hard', range: [60, 130] },
    X: { name: 'Extreme', range: [100, 200] },
    C: { name: 'Built-in', range: [1, 200], ease: true }, // the built-in levels: the whole span, starting gently
  };
  const PLAYER_MODES = ['E', 'N', 'H', 'X'];
  const COUNTS = [10, 20, 30];

  // Rope styles. Every board draws one at random, so within any set some levels are made of
  // short straight ropes and others of long twisty ones. `straight` is the chance a growing
  // rope carries straight on instead of turning. Longer ropes mean fewer ropes on a board and
  // so a lower score for its size; `scale` is a first estimate of that, corrected while generating.
  const STYLES = [
    { name: 'short', share: 0.45, minLen: 2, straight: 0.5, lenLo: 3, lenHi: () => 5, scale: 1.1 },
    { name: 'medium', share: 0.3, minLen: 2, straight: 0.35, lenLo: 5, lenHi: () => 8, scale: 0.9 },
    { name: 'twisty', share: 0.25, minLen: 3, straight: 0.2, lenLo: 6, lenHi: W => Math.max(8, W), scale: 0.8 },
  ];
  const TWISTY_W = 7; // long twisty ropes need a board at least this wide

  // Board sizes. `big` sets may use the larger ones, which makes the hard end of a range much
  // easier to reach (and lets twisty boards get there too) at the cost of small cells on a phone.
  const WIDTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  const BIG_WIDTHS = WIDTHS.concat([13, 14, 15, 16]);
  const heightFor = W => Math.min(22, Math.round(W * 1.35)); // 4x5 ... 12x16 ... 16x22
  // Typical difficulty of a board of each width with short ropes: about 0.012 * cells^1.9,
  // measured. Only used to aim, so it just has to be roughly right.
  const GUESS = { 4: 3.5, 5: 10, 6: 19, 7: 32, 8: 59, 9: 88, 10: 143, 11: 196, 12: 260, 13: 380, 14: 485, 15: 610, 16: 827 };

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

  // The algorithm, for a seed, a difficulty setting and a number of levels:
  //   1. Cut the setting's difficulty range into one slot per level. One level per slot means
  //      the set is spread evenly over the range and no two levels can share a difficulty.
  //   2. Aim at the empty slots in turn. Pick a rope style at random, then the board width most
  //      likely to land near that slot's difficulty with that style, and build a level.
  //   3. If the level's difficulty falls in a slot that is still empty it takes that slot
  //      (whichever slot it is, not only the one aimed at). Otherwise it is discarded.
  //   4. Stop as soon as every slot is filled. Slots run from easiest to hardest, so the set
  //      comes out already sorted.
  // Aiming is what keeps this cheap: unaimed, the slots at the hard end of a range would take
  // hundreds of wasted builds to hit by chance. The work is bounded: at most count*60 builds,
  // and it gives up if 600 builds in a row fill nothing (the set then has fewer levels).
  // opts: { seed: string, mode: 'E'|'N'|'H'|'X', count: number, big: boolean }
  function generateSet(opts) {
    const mode = MODES[opts.mode] ? opts.mode : 'N', M = MODES[mode], seed = cleanSeed(opts.seed), big = !!opts.big;
    const count = Math.max(1, opts.count | 0), n = Math.min(count, M.range[1] - M.range[0] + 1);
    const rng = mulberry32(hashString('monkey-fist/5|' + mode + (big ? 'B|' : '|') + seed));
    const edges = slotEdges(mode, n), slots = new Array(n).fill(null);
    const slotOf = score => { let j = 0; while (j < n - 1 && score >= edges[j + 1]) j++; return j; };
    const widths = big ? BIG_WIDTHS : WIDTHS, top = widths[widths.length - 1];
    // Running totals per style of the difficulties actually seen against the guesses made.
    const seen = STYLES.map(() => 0), guessed = STYLES.map(() => 0);
    const scaleOf = s => Math.max(0.05, guessed[s] ? seen[s] / guessed[s] : STYLES[s].scale);
    const maxBuilds = count * 60, maxStall = 600;
    let filled = 0, builds = 0, stall = 0, next = 0;
    while (filled < n && builds < maxBuilds && stall < maxStall) {
      builds++; stall++;
      while (slots[next % n]) next++;
      const aim = next++ % n, target = (edges[aim] + edges[aim + 1]) / 2;
      const u = rng();
      let s = u < STYLES[0].share ? 0 : u < STYLES[0].share + STYLES[1].share ? 1 : 2;
      while (s > 0 && GUESS[top] * scaleOf(s) < target * 0.8) s--; // this style can't get that high even on the largest board
      const scale = scaleOf(s);
      let pick = 0, best = Infinity;
      widths.forEach((W, i) => { const r = GUESS[W] * scale / target, miss = r > 1 ? r : 1 / r; if (miss < best) { best = miss; pick = i; } });
      const W = widths[Math.max(0, Math.min(widths.length - 1, pick + Math.floor(rng() * 3) - 1))]; // one size either side, for variety
      if (s === 2 && W < TWISTY_W) s = 1;
      const st = STYLES[s], lenHi = st.lenHi(W);
      const cfg = { W, H: heightFor(W), maxLen: st.lenLo + Math.floor(rng() * (lenHi - st.lenLo + 1)), fill: target < 6 ? 0.5 + rng() * 0.25 : 0.7 + rng() * 0.27, straight: st.straight, minLen: st.minLen }; // the very easiest slots need sparse boards
      const lvSeed = Math.floor(rng() * 4294967296) >>> 0, L = build(mulberry32(lvSeed), cfg);
      const score = total(ropeScores(L.ropes, L.costs)); // block costs come straight from the build's final analysis
      seen[s] += score; guessed[s] += GUESS[W];
      if (score < M.range[0] || score > M.range[1] || !goodEnough(L.ropes, L.W, L.H, L.costs)) continue;
      const slot = slotOf(score);
      if (slots[slot]) continue;
      slots[slot] = { W: cfg.W, H: cfg.H, maxLen: cfg.maxLen, fill: cfg.fill, straight: cfg.straight, minLen: cfg.minLen, seed: lvSeed, difficulty: score, ropes: L.ropes.length, style: st.name };
      filled++; stall = 0;
    }
    return { seed, mode, count, big, levels: slots.filter(Boolean), builds, code: encodeCode({ seed, mode, count, big }) };
  }
  // Rebuild a level's ropes from its descriptor.
  function levelFrom(d) { return build(mulberry32(d.seed), d); }

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

  return { mulberry32, hashString, headDir, ray, selfBlocked, occupancy, blockersOf, analyse, blockCosts, bendsOf, ropeScores, nothingBlocked, difficulty, build, generateSet, levelFrom, slotEdges,
    randomSeed, cleanSeed, encodeCode, parseCode, quality, goodEnough, heightFor,
    MODES, PLAYER_MODES, COUNTS, STYLES, WIDTHS, BIG_WIDTHS, CAMPAIGN, MIN_ROPES, MIN_COVERAGE, MIN_BLOCKED_SHARE, SMALL_W, TWISTY_W };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MFLevels;
