// Monkey Fist level generation. Pure logic, no DOM, so it can be unit tested on its own
// (see tests/). Everything here is deterministic: the same inputs give the same levels on
// every device, which is what makes a level set shareable by its code.
//
// There are two games on the same kind of board. In the original, a tapped rope leaves if its
// way out is clear and otherwise bumps and springs back. In the sliding game it slides forward
// until it meets something and stays there, which makes knots that only the right slide undoes.
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
  // Every rope standing anywhere in a rope's way out: it cannot leave until each has got out of the way.
  function blockersOf(paths, W, H) {
    const occ = occupancy(paths, W, H);
    return paths.map((path, id) => {
      const h = path[path.length - 1], d = headDir(path), seen = new Set();
      for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) {
        const o = occ[y * W + x];
        if (o !== -1) seen.add(o); // a rope's own body in its path counts too: it can never leave
      }
      return [...seen];
    });
  }
  // Block cost of each rope in the original game: how many layers of other ropes must be cleared before it can go.
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

  // ---------- sliding ----------
  // The sliding game: a tapped rope slides forward, arrow first, following its own bends and
  // then straight on, until its head meets another rope or it has left the board. Where it stops
  // it stays. Ropes only ever go forwards, so a careless slide can tie the board in a knot, and
  // some boards start with knots that only the right slide will undo.

  // The same rope after sliding forward k cells.
  function advance(path, k) {
    const h = path[path.length - 1], d = headDir(path), out = path.slice();
    for (let j = 1; j <= k; j++) out.push({ x: h.x + d[0] * j, y: h.y + d[1] * j });
    return out.slice(k);
  }
  // Group the ropes by the loops they are tied in. Ropes are in the same group when each waits
  // on the other, directly or round a circle of others; a rope in no loop is a group of its own.
  // (The strongly connected parts of the "waits for" links, by Tarjan's algorithm: O(R + links).)
  // Groups come out deepest first: every group a group waits on is listed before it.
  function groupsOf(blk) {
    const n = blk.length, index = new Int32Array(n).fill(-1), low = new Int32Array(n), on = new Uint8Array(n), stack = [], groups = [];
    let next = 0;
    for (let root = 0; root < n; root++) {
      if (index[root] >= 0) continue;
      const work = [[root, 0]]; index[root] = low[root] = next++; stack.push(root); on[root] = 1;
      while (work.length) {
        const top = work[work.length - 1], v = top[0];
        if (top[1] < blk[v].length) {
          const w = blk[v][top[1]++];
          if (index[w] < 0) { index[w] = low[w] = next++; stack.push(w); on[w] = 1; work.push([w, 0]); }
          else if (on[w] && index[w] < low[v]) low[v] = index[w];
        } else {
          work.pop();
          if (work.length) { const u = work[work.length - 1][0]; if (low[v] < low[u]) low[u] = low[v]; }
          if (low[v] === index[v]) {
            const group = []; let w;
            do { w = stack.pop(); on[w] = 0; group.push(w); } while (w !== v);
            groups.push(group);
          }
        }
      }
    }
    return groups;
  }
  // The loops on a board: each a list of ropes that wait on one another in a circle, so that none
  // of them can leave until one slides far enough to let another by.
  function loopsOf(paths, W, H) {
    return groupsOf(blockersOf(paths, W, H)).filter(g => g.length > 1).map(g => g.sort((x, y) => x - y));
  }
  // A board in compact form, for the analysis and the solver. A rope can only ever occupy the
  // cells of its own track: its body as first laid, then the straight line ahead of its head
  // to the edge. seq[i] is that track, len[i] the rope's length, and off[i] how far along it has
  // slid (so it sits on seq[i][off[i]] ... seq[i][off[i] + len[i] - 1]); off[i] is -1 once it has left.
  function boardOf(paths, W, H) {
    const n = paths.length, occ = new Int16Array(W * H).fill(-1), at = new Int16Array(W * H), seq = [], len = new Int16Array(n);
    paths.forEach((path, i) => {
      const h = path[path.length - 1], d = headDir(path), s = path.map(p => p.y * W + p.x);
      for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) s.push(y * W + x);
      seq.push(Int16Array.from(s)); len[i] = path.length;
      s.slice(0, path.length).forEach((c, j) => { occ[c] = i; at[c] = j; }); // at[cell]: where on its rope's track the cell is
    });
    return { n, left: n, occ, at, seq, len, off: new Int16Array(n), was: new Int16Array(n), now: new Int16Array(n) };
  }
  // Where rope i would stop if tapped: its new offset, or -1 if it would leave the board.
  function slideTo(b, i) {
    const s = b.seq[i]; let p = b.off[i] + b.len[i];
    while (p < s.length && b.occ[s[p]] === -1) p++;
    return p === s.length ? -1 : p - b.len[i];
  }
  // Put rope i at offset `to` (-1 takes it off the board). Also used to take a move back.
  function place(b, i, to) {
    const s = b.seq[i], L = b.len[i], from = b.off[i];
    if (from >= 0) { for (let p = from; p < from + L; p++) b.occ[s[p]] = -1; b.left--; }
    if (to >= 0) { for (let p = to; p < to + L; p++) { b.occ[s[p]] = i; b.at[s[p]] = p; } b.left++; }
    b.off[i] = to;
  }

  // Can the board still be solved? `relax` finds the ropes that certainly can never leave.
  //
  // It lets every rope move as freely as it ever could. In rounds, each rope pushes forward as
  // far as it could have got given what the others managed in the rounds before: through empty
  // cells freely, and through a cell another rope sits on once that rope has slid clear of it or
  // left. That is generous: it ignores that one rope sliding forward may get in another's way. So
  // a rope that does not get out here can never leave whatever is tapped: it is part of a knot
  // that cannot be undone, and the level is lost. (The reverse does not hold. A board that passes
  // may still be past saving, which takes `solve` to find out.)
  //
  // Returns how many such ropes there are. Cost: each rope's push only ever moves forward along
  // its track, so the work is the total length of the tracks plus one look per rope per round:
  // O(W*H + R * (max(W, H) + rounds)).
  const GONE = 32767;
  function relax(b) {
    const n = b.n, was = b.was, now = b.now;
    let waiting = 0;
    for (let i = 0; i < n; i++) { was[i] = now[i] = b.off[i] < 0 ? GONE : b.off[i]; if (b.off[i] >= 0) waiting++; }
    for (let moved = true; moved && waiting;) {
      moved = false;
      for (let i = 0; i < n; i++) {
        if (was[i] === GONE) continue;
        const s = b.seq[i], L = b.len[i];
        let r = was[i];
        for (;;) {
          const p = r + L;
          if (p >= s.length) { r = GONE; break; }
          const c = s[p], z = b.occ[c];
          if (z !== -1 && (z === i || was[z] <= b.at[c])) break; // still in the way (its own body always is)
          r++;
        }
        if (r !== was[i]) { now[i] = r; moved = true; if (r === GONE) waiting--; }
      }
      was.set(now);
    }
    return waiting;
  }
  // The ropes that can never leave. Empty on any board that can still be solved.
  function deadRopes(paths, W, H) {
    const b = boardOf(paths, W, H), dead = [];
    if (relax(b)) for (let i = 0; i < b.n; i++) if (b.now[i] !== GONE) dead.push(i);
    return dead;
  }
  // ---------- solving ----------
  // Find an order of taps that clears the board. Because a slide cannot be taken back, this is a
  // search: try a tap, and if the board that leaves cannot be finished, take it back and try
  // another. Three things keep it short:
  //   - a board with a knot that cannot be undone (see relax) is given up on at once;
  //   - the most promising taps are tried first: those of `prefer`, a list of ropes in the order a
  //     known solution taps them (the level's own, or the last one found), then ropes that can
  //     leave, then ropes that can only slide;
  //   - every board found to be hopeless is remembered, so it is never explored twice.
  // `budget` caps the number of boards looked at. Returns { solved, moves, nodes }: solved is true
  // with `moves` the ropes to tap in order, false if there is certainly no way, or null if the
  // budget ran out first.
  function solve(paths, W, H, budget, prefer) {
    const b = boardOf(paths, W, H), n = b.n, hopeless = new Set(), moves = [], limit = budget || 20000;
    // rank[i]: where rope i first comes in the preferred order; later[i]: where it comes last (a
    // knot is tapped twice, to slide and then to leave), used once it has moved.
    const rank = new Int32Array(n).fill(1e6), later = new Int32Array(n).fill(1e6);
    (prefer || []).forEach((i, k) => { if (i >= 0 && i < n) { if (rank[i] === 1e6) rank[i] = k; later[i] = k; } });
    let nodes = 0, gaveUp = false;
    const search = () => {
      if (!b.left) return true;
      if (++nodes > limit) { gaveUp = true; return false; }
      const key = String.fromCharCode.apply(null, b.off.map(o => o + 1));
      if (hopeless.has(key)) return false;
      if (relax(b)) { hopeless.add(key); return false; }
      const tries = [];
      for (let i = 0; i < n; i++) {
        if (b.off[i] < 0) continue;
        const to = slideTo(b, i);
        if (to !== b.off[i]) tries.push({ i, to, order: (b.off[i] ? later[i] : rank[i]) * 2 + (to < 0 ? 0 : 1) });
      }
      tries.sort((x, y) => x.order - y.order || x.i - y.i);
      for (const t of tries) {
        const from = b.off[t.i];
        place(b, t.i, t.to); moves.push(t.i);
        if (search()) return true;
        moves.pop(); place(b, t.i, from);
        if (gaveUp) return false;
      }
      hopeless.add(key);
      return false;
    };
    const solved = search();
    return { solved: solved ? true : gaveUp ? null : false, moves, nodes };
  }
  // Play a list of taps and report what is left: the paths still on the board (null where a rope
  // has gone). Used to check a solution, and by the tests.
  function play(paths, W, H, taps) {
    const b = boardOf(paths, W, H);
    for (const i of taps) if (b.off[i] >= 0) place(b, i, slideTo(b, i));
    return paths.map((p, i) => (b.off[i] < 0 ? null : advance(p, b.off[i])));
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
  // Ropes are added one at a time under a single rule:
  //
  //     a new rope must never close a loop.
  //
  // A new rope waits on whatever stands in its way out, and every rope whose way out it lies
  // across now waits on it. Before it is placed, the builder follows the chain down from the
  // ropes it would wait on; if that reaches any rope that would wait on it, the placement is
  // refused. So the "waits for" links can never form a loop, and the board is solvable by
  // construction with nothing to untangle afterwards.
  //
  // That lets the builder do two things on purpose. It can lay a rope across the way out of a
  // rope at the bottom of a long chain, making every rope up that chain one deeper. And it can
  // drop a rope into an enclosed pocket, where it simply waits on the ropes around it, which is
  // what lets a board be packed full.
  //
  // Stage one lays ropes. Each rope's effect on the score is known before it is placed, so the
  // builder steers: it paces the score to arrive in the slot [lo, hi) about when the board is
  // full, keeps the average block cost per rope up near `wantAvg`, never adds more than the slot
  // allows, and never adds a rope the depth floor could not afford. It then goes round the cells
  // still empty and packs a rope into each gap that will take one.
  //
  // Stage two runs only if the board is still short of its slot: it turns ropes around, keeping
  // a turn when the board stays solvable and the total block cost rises without overshooting.
  //
  // Finally any empty outer rows and columns are trimmed off.
  //
  // For the sliding game (cfg.slide) the same board is built, with knots and traps laid into it
  // as it goes: up to cfg.tie knots and cfg.bait traps, each reaching up to cfg.pull cells. The
  // board that is built is the level with its knots already undone, so it is loop-free like any
  // other and everything above still holds; the level then starts with each knot pulled back. Its
  // difficulty is that of the board built, and the knots are counted separately.
  //
  // cfg: { W, H, lenLo, lenHi, straight, minLen, lo, hi, wantAvg, floor, cover, bends, slide, tie, bait, pull }
  // Returns { W, H, ropes, costs, score, taps, slides, knots, traps }, or null if the board is no good.
  //   ropes  - the level as it starts.
  //   costs  - each rope's block cost on the board as built (knots undone), and score its difficulty:
  //            no higher than the slot's top but possibly below its bottom (the caller decides what to do with it).
  //   taps   - one way to solve it: the ropes to tap, in order. The first `slides` of them slide a knot forward.
  //   knots  - how many ropes start tied in a loop that only sliding them undoes.
  //   traps  - how many of the slides open at the start would tie the board for good.
  //
  // Cost, with R ropes. Stage one tries a bounded number of placements per rope (6 while laying,
  // 3 per empty cell while packing); trying one walks the rope, a few ways out (a board side
  // each), the chain below it for the loop check and the ropes whose cost it would raise, each
  // at most R ropes and their links. Stage two makes at most 4R tries, each one topological sort
  // over lists worked out once. All of it is a few thousand simple steps per level.
  const TRIES_PER_STEP = 6, KNOT_TRIES = 12, MAX_STUCK = 4; // KNOT_TRIES: tries per step at a knot, and as many again at a trap
  function construct(rng, cfg) {
    const W = cfg.W, H = cfg.H, N = W * H;
    const occ = new Int16Array(N).fill(-1);
    const lanes = new Array(N);  // lanes[cell]: the ropes whose way out passes through this cell
    // waiters[i]: ropes waiting on rope i. waitsOn[i]: ropes it waits on. up[i]: roughly how long the chain above it is. laneFree[i]: empty cells left on its way out.
    const paths = [], laneCells = [], laneFree = [], waiters = [], waitsOn = [], up = [];
    const firsts = [];           // firsts[i]: where rope i starts the level if it is a knot (pulled back), else null
    const KEPT = -3;             // a cell kept for a knot's tail, or kept empty in front of a trap: nothing else may be laid there
    let cost = [], costSum = 0, bendSum = 0, covered = 0, knots = 0, traps = 0;
    const sMin = Math.ceil(cfg.lo), sMax = Math.ceil(cfg.hi) - 1; // the whole-number scores inside the slot
    const meanLen = (cfg.lenLo + cfg.lenHi) / 2 * 0.85, coverGoal = cfg.cover * N;
    const xy = c => ({ x: c % W, y: c / W | 0 });

    // A random walk through empty cells starting at `start`, optionally with its first step (or
    // first `forced` steps) made in direction `first`. `straight` is the chance each later step
    // carries straight on. `extra` asks for that many cells more than a rope's usual length.
    const grow = (start, first, straight, forced, extra) => {
      const want = cfg.lenLo + Math.floor(rng() * (cfg.lenHi - cfg.lenLo + 1)) + (extra || 0), lead = forced || 1, cells = [start];
      let last = -1;
      occ[start] = -2;
      while (cells.length < want) {
        const c = cells[cells.length - 1], x = c % W, y = c / W | 0, opts = [];
        for (let d = 0; d < 4; d++) {
          const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && occ[ny * W + nx] === -1) opts.push(d);
        }
        if (!opts.length || (cells.length <= lead && first >= 0 && !opts.includes(first))) break;
        const d = cells.length <= lead && first >= 0 ? first : last >= 0 && opts.includes(last) && rng() < straight ? last : opts[Math.floor(rng() * opts.length)];
        last = d;
        const nc = (y + DIRS[d][1]) * W + x + DIRS[d][0];
        cells.push(nc); occ[nc] = -2;
      }
      for (const c of cells) occ[c] = -1;
      return cells;
    };
    // The way out from (x, y) in direction d, not counting (x, y) itself: every cell to the edge,
    // how many of them are empty, and the ropes standing in it.
    const wayOut = (x, y, d) => {
      const cells = [], ids = [];
      let free = 0;
      for (x += d[0], y += d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) {
        const c = y * W + x, o = occ[c];
        cells.push(c);
        if (o === -1) free++; else if (o >= 0 && !ids.includes(o)) ids.push(o);
      }
      return { cells, free, ids };
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
    // Shape a rope that includes `start`. Usually head-first: point the head from `start` (longer
    // ways out favoured: they cross more of the board) and lay the body out behind it. Otherwise
    // walk a body through `start` and take whichever end has the longer way out.
    const shape = (start, straight) => {
      const s = xy(start);
      if (rng() < 0.75) {
        const opts = []; let sum = 0;
        for (let d = 0; d < 4; d++) {
          const bx = s.x - DIRS[d][0], by = s.y - DIRS[d][1]; // the body's first cell sits behind the head
          if (bx < 0 || by < 0 || bx >= W || by >= H || occ[by * W + bx] !== -1) continue;
          const lane = wayOut(s.x, s.y, DIRS[d]);
          opts.push({ d, lane, w: lane.cells.length + 1 }); sum += lane.cells.length + 1;
        }
        if (opts.length) {
          let r = rng() * sum, o = opts[opts.length - 1];
          for (const cand of opts) { r -= cand.w; if (r < 0) { o = cand; break; } }
          const cells = grow(start, (o.d + 2) % 4, straight), path = cells.map(xy).reverse();
          if (cells.length >= cfg.minLen && !selfBlocked(path)) return { cells, path, lane: o.lane };
        }
      }
      const cells = grow(start, -1, straight);
      if (cells.length < cfg.minLen) return null;
      const a = cells.map(xy), b = a.slice().reverse(), ok = [];
      for (const p of [a, b]) if (!selfBlocked(p)) { const h = p[p.length - 1]; ok.push({ cells, path: p, lane: wayOut(h.x, h.y, headDir(p)) }); }
      if (!ok.length) return null;
      return ok.length === 2 && (ok[1].lane.cells.length > ok[0].lane.cells.length || (ok[1].lane.cells.length === ok[0].lane.cells.length && rng() < 0.5)) ? ok[1] : ok[0];
    };
    // Would the ropes in `above` end up waiting, down some chain, on themselves? `blockers` are
    // the ropes the new one would wait on; follow everything they wait on in turn.
    const mark = new Int32Array(N + 1); let stamp = 0;
    const closesLoop = (blockers, above) => {
      if (!blockers.length || !above.size) return false;
      stamp++;
      const stack = blockers.slice();
      for (const b of stack) mark[b] = stamp;
      while (stack.length) { const x = stack.pop(); for (const y of waitsOn[x]) if (mark[y] !== stamp) { mark[y] = stamp; stack.push(y); } }
      for (const u of above) if (mark[u] === stamp) return true;
      return false;
    };
    // What laying rope `c` ({ cells, path, lane }) would do to the score. Null if it would close a loop.
    const weigh = c => {
      // The ropes whose way out this one would lie across (they would wait on it), and the ropes
      // standing in its own way out (it would wait on them). It must not close a loop.
      const above = new Set(), blockers = c.lane.ids;
      for (const cell of c.cells) if (lanes[cell]) for (const id of lanes[cell]) above.add(id);
      if (closesLoop(blockers, above)) return null;
      // Its own block cost, then the rise it causes in the ropes above it, passed up their chains.
      let own = 0;
      for (const b of blockers) if (cost[b] + 1 > own) own = cost[b] + 1;
      const next = cost.slice(), queue = [];
      let gain = own;
      for (const i of above) if (next[i] < own + 1) { gain += own + 1 - next[i]; next[i] = own + 1; queue.push(i); }
      for (let q = 0; q < queue.length; q++) {
        const i = queue[q];
        for (const j of waiters[i]) if (next[j] < next[i] + 1) { gain += next[i] + 1 - next[j]; next[j] = next[i] + 1; queue.push(j); }
      }
      return { path: c.path, lane: c.lane, cells: c.cells, above, blockers, own, next, gain, bends: bendsOf(c.path) };
    };
    // One possible next rope, with what it would do to the score. Null if it does not fit.
    // 'plain' is a straight rope anywhere: the kind least likely to move the score.
    const candidate = (kind, at) => {
      let start = at >= 0 ? at : -1;
      const parent = start >= 0 || kind === 'any' || kind === 'plain' ? -1 : pickParent(kind);
      if (parent >= 0) { const free = laneCells[parent].filter(c => occ[c] === -1); if (free.length) start = free[Math.floor(rng() * free.length)]; }
      for (let t = 0; start < 0 && t < 6; t++) { const c = Math.floor(rng() * N); if (occ[c] === -1) start = c; }
      if (start < 0) return null;
      const c = shape(start, kind === 'plain' ? 1 : cfg.straight);
      return c && weigh(c);
    };
    // The sliding game's two special ropes. Both are laid like any other rope, loop-free where
    // they lie, so the rest of the board is built around them as usual.
    //
    // A knot starts the level pulled back from where it belongs, with its tail lying across the
    // way out of a rope it is itself waiting on. Nothing in that loop can leave until this rope is
    // slid forward, which draws its tail clear. It is laid in the place it slides to: head hard
    // against another rope, its first k + 2 cells straight so that it can start k cells back, and
    // the k cells its tail then reaches into kept empty for it.
    //
    // A trap is the opposite: a rope with a gap in front of it that it must not be slid into,
    // because there it would lie across the way out of a rope it is waiting on, hard against its
    // blocker with nowhere left to go. The gap is kept empty so the temptation stays.
    //
    // spots() lists where either could go: an empty cell for the head and a direction, with a rope
    // directly ahead (and how much straight room there is behind), or a rope a gap ahead.
    const spots = () => {
      const tight = [], gapped = [];
      for (let c = 0; c < N; c++) {
        if (occ[c] !== -1) continue;
        const x = c % W, y = c / W | 0;
        for (let di = 0; di < 4; di++) {
          const d = DIRS[di];
          let gap = 0, nx = x + d[0], ny = y + d[1];
          while (gap <= cfg.pull && nx >= 0 && ny >= 0 && nx < W && ny < H && occ[ny * W + nx] === -1) { gap++; nx += d[0]; ny += d[1]; }
          if (gap > cfg.pull || nx < 0 || ny < 0 || nx >= W || ny >= H || occ[ny * W + nx] < 0) continue; // nothing to stop against
          if (gap) { gapped.push({ c, di, gap }); continue; }
          let room = 0, bx = x - d[0], by = y - d[1];
          while (room <= cfg.pull && bx >= 0 && by >= 0 && bx < W && by < H && occ[by * W + bx] === -1) { room++; bx -= d[0]; by -= d[1]; }
          if (room >= 2) tight.push({ c, di, room });
        }
      }
      return { tight, gapped };
    };
    // Mark every rope the ropes in `blockers` are waiting on, directly or down a chain. A cell is
    // `tied` if one of them has its way out through it: a rope lying there would close a loop.
    const below = blockers => {
      stamp++;
      const stack = blockers.slice();
      for (const b of stack) mark[b] = stamp;
      while (stack.length) { const x = stack.pop(); for (const y of waitsOn[x]) if (mark[y] !== stamp) { mark[y] = stamp; stack.push(y); } }
    };
    const tied = cell => { const l = lanes[cell]; if (l) for (const id of l) if (mark[id] === stamp) return true; return false; };
    const special = (spot, isKnot) => {
      const d = DIRS[spot.di], back = (spot.di + 2) % 4, sx = spot.c % W, sy = spot.c / W | 0, lane = wayOut(sx, sy, d);
      below(lane.ids);
      if (tied(spot.c)) return null;
      const k = isKnot ? 1 + Math.floor(rng() * Math.min(cfg.pull, spot.room - 1)) : 0;
      // Walk the body out behind the head, keeping off tied cells so that it is loop-free where it lies.
      const want = Math.max(k + 2, cfg.lenLo + Math.floor(rng() * (cfg.lenHi - cfg.lenLo + 1))), cells = [spot.c], tail = [];
      let last = back, got = false;
      occ[spot.c] = -2;
      while (cells.length + tail.length < want + k) {
        const body = cells.length < want, c = body ? cells[cells.length - 1] : tail.length ? tail[tail.length - 1] : cells[cells.length - 1], x = c % W, y = c / W | 0, opts = [];
        for (let di = 0; di < 4; di++) {
          const nx = x + DIRS[di][0], ny = y + DIRS[di][1], nc = ny * W + nx;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && occ[nc] === -1 && (!body || !tied(nc))) opts.push(di);
        }
        if (!opts.length) break;
        let di;
        if (body) { // the first step is straight back, and a knot's first k + 1 are
          if (cells.length <= k + 1) { if (!opts.includes(back)) break; di = back; }
          else di = opts.includes(last) && rng() < cfg.straight ? last : opts[Math.floor(rng() * opts.length)];
        } else { // the tail of a knot heads for a tied cell if it has not found one yet
          const ties = got ? [] : opts.filter(o => tied((y + DIRS[o][1]) * W + x + DIRS[o][0]));
          di = ties.length ? ties[Math.floor(rng() * ties.length)] : opts[Math.floor(rng() * opts.length)];
        }
        last = di;
        const nc = (y + DIRS[di][1]) * W + x + DIRS[di][0];
        occ[nc] = -2;
        if (body) cells.push(nc); else { tail.push(nc); if (tied(nc)) got = true; }
      }
      for (const c of cells) occ[c] = -1;
      for (const c of tail) occ[c] = -1;
      if (cells.length < Math.max(cfg.minLen, k + 2)) return null;
      const path = cells.map(xy).reverse();
      if (selfBlocked(path)) return null;
      let gap = null, first = null;
      if (isKnot) {
        if (tail.length < k || !got) return null; // the tail must tie a loop
        first = cells.slice(k).concat(tail).map(xy).reverse();
        if (selfBlocked(first)) return null;
      } else {
        gap = lane.cells.slice(0, spot.gap);
        if (!gap.some(tied)) return null; // sliding into the gap must close a loop
      }
      const c = weigh({ cells, path, lane });
      if (!c) return null;
      if (isKnot) { c.tail = tail; c.first = first; } else c.gap = gap;
      return c;
    };
    const commit = c => {
      const id = paths.length;
      paths.push(c.path);
      for (const cell of c.cells) { occ[cell] = id; if (lanes[cell]) for (const i of lanes[cell]) laneFree[i]--; }
      covered += c.cells.length;
      cost = c.next; cost.push(c.own); costSum += c.gain; bendSum += c.bends;
      waitsOn.push(c.blockers); for (const b of c.blockers) waiters[b].push(id);
      waiters.push([...c.above]); for (const u of c.above) waitsOn[u].push(id); // the ropes it lies across now wait on it
      let u = 0; for (const i of c.above) if (up[i] + 1 > u) u = up[i] + 1;
      up.push(u);
      laneCells.push(c.lane.cells); laneFree.push(c.lane.free);
      for (const cell of c.lane.cells) if (occ[cell] === -1) (lanes[cell] || (lanes[cell] = [])).push(id);
      firsts.push(c.first || null);
      if (c.tail) knots++; else if (c.gap) traps++;
      for (const cell of c.tail || c.gap || []) { occ[cell] = KEPT; if (lanes[cell]) for (const i of lanes[cell]) laneFree[i]--; }
    };

    let stuck = 0;
    for (let guard = 0; guard < 2 * N; guard++) {
      const n = paths.length, score = costSum + bendSum;
      if (score >= sMin && n >= MIN_ROPES && covered >= coverGoal) break;
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
      // While the level still wants knots or traps, try for one first, spreading them over the build.
      // Places for them are scarce, so one that fits is taken.
      const wantKnots = (cfg.tie || 0) - knots, wantTraps = (cfg.bait || 0) - traps;
      if (n >= 2 && (wantKnots > 0 || wantTraps > 0) && rng() < 2 * (wantKnots + wantTraps) / room) {
        // Whichever kind the level is shorter of gets the first tries, and the other kind the rest.
        const sp = spots(), knotFirst = wantKnots > 0 && (wantTraps <= 0 || knots <= traps);
        for (let k = 0; k < 2 * KNOT_TRIES && !best; k++) {
          const isKnot = k < KNOT_TRIES ? knotFirst : !knotFirst, list = isKnot ? sp.tight : sp.gapped;
          if (!list.length || (isKnot ? wantKnots : wantTraps) <= 0) { k = k < KNOT_TRIES ? KNOT_TRIES - 1 : 2 * KNOT_TRIES; continue; }
          const c = special(list[Math.floor(rng() * list.length)], isKnot);
          if (c && c.gain + c.bends <= budget && cfg.floor * (n + 1) + bendSum + c.bends <= sMax) best = c;
        }
      }
      for (let k = 0; k < TRIES_PER_STEP && !(best && (best.tail || best.gap)); k++) {
        const c = candidate(kinds[k % kinds.length]);
        if (!c || c.gain + c.bends > budget) continue;
        // Never add a rope the depth floor cannot afford: with one more rope and its bends, the slot's
        // top score must still be able to cover the minimum average block cost for every rope.
        if (cfg.floor * (n + 1) + bendSum + c.bends > sMax) continue;
        // Closest to the cost wanted, with a little noise so equal choices vary. While the level still
        // needs to get deeper, favour ropes with a long way out: they leave room to extend the chain.
        // A rope that drops the score into its slot once the board is full enough beats any other.
        const lands = need > 0 && c.gain + c.bends >= need && covered + c.cells.length >= MIN_COVERAGE * N;
        const miss = Math.abs(c.gain - desire) + rng() * 0.6 - (desire >= 2 ? Math.min(c.lane.free, 4) * 0.2 : 0) - (lands ? 100 : 0);
        if (miss < bestMiss) { best = c; bestMiss = miss; }
      }
      if (!best) { if (++stuck > MAX_STUCK) break; continue; }
      stuck = 0; commit(best);
    }
    // Pack the gaps. Go round the cells still empty, in random order, and fit a rope into each
    // gap that will take one, under the same rules as before: a clear way out, no more score
    // than the slot allows, and no more ropes than the depth floor can afford. Two sweeps, three
    // tries per empty cell.
    for (let sweep = 0; sweep < 2; sweep++) {
      const empty = [];
      for (let c = 0; c < N; c++) if (occ[c] === -1) empty.push(c);
      for (let i = empty.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = empty[i]; empty[i] = empty[j]; empty[j] = t; }
      for (const cell of empty) {
        if (occ[cell] !== -1) continue;
        const n = paths.length, budget = sMax - costSum - bendSum;
        for (let t = 0; t < 3; t++) {
          const c = candidate(budget < 1 ? 'plain' : 'any', cell);
          if (!c || c.gain + c.bends > budget || cfg.floor * (n + 1) + bendSum + c.bends > sMax) continue;
          commit(c); break;
        }
      }
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
      const facing = path => { // the ropes standing in this path's way out; null if its own body is
        const h = path[path.length - 1], d = headDir(path), ids = [], me = occ[h.y * W + h.x];
        for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) {
          const o = occ[y * W + x];
          if (o === me) return null;
          if (o >= 0 && !ids.includes(o)) ids.push(o);
        }
        return ids;
      };
      const now = paths.map(facing), turned = paths.map((p, i) => (firsts[i] ? null : facing(p.slice().reverse()))), flipped = new Uint8Array(n); // a knot is never turned
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
    // That is the board with its knots undone, and it is what the level's difficulty is taken from.
    // The level itself starts with every knot pulled back. One way to solve it: slide each knot
    // forward (oldest first, since a later one may come to rest against an earlier one), which
    // gives the loop-free board that was built, then take the ropes out in order of block cost.
    const start = paths.map((p, i) => firsts[i] || p), taps = [];
    for (let i = 0; i < n; i++) if (firsts[i]) taps.push(i);
    const slides = taps.length;
    const order = paths.map((_, i) => i).sort((a, b) => cost[a] - cost[b] || a - b);
    for (const i of order) taps.push(i);
    // Trim away empty outer rows and columns. Nothing depends on them (a rope sliding over empty
    // cells meets the same ropes), and it stops a level sitting in a half-empty board.
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const p of start) for (const c of p) { if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x; if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y; }
    let w = x1 - x0 + 1, h = y1 - y0 + 1;
    const tall = h >= w; // keep boards portrait: if trimming left it wider than tall, turn it on its side
    const ropes = start.map(p => p.map(c => (tall ? { x: c.x - x0, y: c.y - y0 } : { x: c.y - y0, y: c.x - x0 })));
    if (!tall) { const t = w; w = h; h = t; }
    if (!goodEnough(ropes, w, h, cost, cfg.slide)) return null;
    let knotted = 0, fatal = 0;
    if (cfg.slide) {
      if (play(ropes, w, h, taps).some(Boolean)) return null; // cannot happen; but never hand out a level without its solution
      // Count the knots that really are one (starting in a loop, which only a slide can undo),
      // and the slides open at the start that would tie the board for good.
      const looped = new Set([].concat(...loopsOf(ropes, w, h))), b = boardOf(ropes, w, h);
      for (let i = 0; i < n; i++) {
        if (firsts[i] && looped.has(i)) knotted++;
        const to = slideTo(b, i);
        if (to > 0) { place(b, i, to); if (relax(b)) fatal++; place(b, i, 0); }
      }
    }
    return { W: w, H: h, ropes, costs: cost, score: costSum + bendSum, taps, slides, knots: knotted, traps: fatal };
  }

  // ---------- level sets ----------
  // Every difficulty setting is a difficulty range, and a set fills its range evenly.
  // (Difficulty = the sum of the ropes' scores, as above: block cost plus bends for every rope.)
  // Extreme runs right up to what a packed 12x16 board can reach.
  const MODES = {
    E: { name: 'Easy', range: [2, 40] },
    N: { name: 'Normal', range: [20, 80] },
    H: { name: 'Hard', range: [60, 150] },
    X: { name: 'Extreme', range: [150, 500] },
    C: { name: 'Built-in', range: [1, 300], ease: true }, // the built-in levels: a long span, starting gently
  };
  const PLAYER_MODES = ['E', 'N', 'H', 'X'];
  const COUNTS = [10, 20, 30];
  // With bigger boards allowed there is room for far more rope, so the top of every range doubles.
  const rangeFor = (mode, big) => { const r = MODES[mode].range; return big ? [r[0], r[1] * 2] : r; };

  // The depth floor: the least a level's average block cost per rope may be. It rises with
  // difficulty, so the more tangled a level is meant to be, the deeper its chains must run, and
  // a high score cannot be made from a crowd of ropes that barely block each other.
  // Each entry is [from this difficulty, minimum average block cost per rope].
  const FLOORS = [[400, 8], [250, 6.5], [150, 5], [100, 4], [60, 3], [40, 2.5], [20, 2], [10, 1.5]];
  const floorFor = d => { for (const f of FLOORS) if (d >= f[0]) return f[1]; return 0; };

  // The sliding game's knots. A level is built with about as many knots, and as many traps, as
  // knotsWanted says for its difficulty (fewer if the board will not take them), and must have
  // at least the knot floor: [from this difficulty, fewest knots].
  const knotsWanted = d => (d < 12 ? 0 : Math.round(0.6 * Math.sqrt(d)));
  const KNOT_FLOORS = [[250, 5], [150, 4], [80, 3], [40, 2], [15, 1]];
  const knotFloorFor = d => { for (const f of KNOT_FLOORS) if (d >= f[0]) return f[1]; return 0; };

  // Rope styles. Every level draws one at random, so within any set some levels are made of
  // short straight ropes and others of long twisty ones. `straight` is the chance a growing
  // rope carries straight on instead of turning.
  //
  // `full` and `ropes` are measurements used to choose a board: for boards 4 to 16 wide, the
  // difficulty a packed board of this style typically reaches when built as deep as it will go,
  // and how many ropes it holds. They only steer the choice, so they need not be exact.
  const STYLES = [
    { name: 'short', share: 0.4, minLen: 2, straight: 0.5, lenLo: 3, lenHi: () => 5, bends: 0.7,
      full: [16, 41, 56, 94, 159, 200, 353, 433, 574, 737, 1062, 1330, 1658], ropes: [6, 10, 13, 17, 20, 25, 32, 38, 44, 54, 61, 70, 80] },
    { name: 'medium', share: 0.33, minLen: 2, straight: 0.35, lenLo: 4, lenHi: () => 8, bends: 1.3,
      full: [12, 28, 47, 76, 111, 142, 216, 309, 379, 544, 619, 782, 1083], ropes: [4, 8, 10, 13, 15, 18, 23, 29, 33, 41, 46, 52, 61] },
    { name: 'twisty', share: 0.27, minLen: 3, straight: 0.2, lenLo: 6, lenHi: W => Math.max(8, W), bends: 2.4,
      full: [0, 0, 0, 52, 90, 120, 183, 231, 285, 368, 418, 520, 638], ropes: [1, 1, 1, 10, 13, 16, 20, 23, 26, 30, 33, 37, 42] },
  ];
  const TWISTY_W = 7; // long twisty ropes need a board at least this wide

  // Board sizes. `big` sets may use the larger ones.
  const WIDTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  const BIG_WIDTHS = WIDTHS.concat([13, 14, 15, 16]);
  const heightFor = W => Math.min(22, Math.round(W * 1.35)); // 4x5 ... 12x16 ... 16x22

  // A board has to earn its size. Reject boards with too much empty space, and boards beyond
  // the smallest sizes where most ropes can simply leave without waiting for anything.
  const MIN_ROPES = 3;
  const MIN_COVERAGE = 0.78;        // share of cells that must hold rope
  const MIN_COVERAGE_SLIDE = 0.72;  // ... in the sliding game, where the gaps ropes slide into are part of the puzzle
  const MIN_COVERAGE_SMALL = 0.6;   // ... on the smallest boards, where a few ropes leave little room
  const MIN_BLOCKED_SHARE = 0.5;    // share of ropes that must be blocked, on boards 6 wide and up
  const SMALL_W = 5;                // boards this narrow may be simple and loose (they are the gentle start)
  function quality(ropes, W, H, knownCosts) {
    const costs = knownCosts || blockCosts(ropes, W, H) || [];
    const cells = ropes.reduce((a, p) => a + p.length, 0);
    return { coverage: cells / (W * H), blockedShare: ropes.length ? costs.filter(c => c > 0).length / ropes.length : 0 };
  }
  function goodEnough(ropes, W, H, knownCosts, slide) {
    if (ropes.length < MIN_ROPES) return false;
    const q = quality(ropes, W, H, knownCosts);
    return W <= SMALL_W ? q.coverage >= MIN_COVERAGE_SMALL : q.coverage >= (slide ? MIN_COVERAGE_SLIDE : MIN_COVERAGE) && q.blockedShare >= MIN_BLOCKED_SHARE;
  }

  // The slots a mode's range is cut into for `n` levels: slot j covers [edges[j], edges[j+1]).
  // Equal slices, except that the built-in set bunches its slots toward the easy end.
  function slotEdges(mode, n, big) {
    const r = rangeFor(mode, big), lo = r[0], width = r[1] - lo + 1, edges = [];
    for (let j = 0; j <= n; j++) { const t = j / n; edges.push(lo + width * (MODES[mode].ease ? (t + t * t) / 2 : t)); }
    return edges;
  }

  // Decide what kind of level to build for one slot: a rope style, and the smallest board that
  // style can pack full and still reach the slot's difficulty. `attempt` nudges the size on retries.
  const SIZE_NUDGE = [0, 0, 1, -1, 0, 1, 2, -1];
  function plan(rng, lo, hi, big, attempt, slide) {
    const target = (lo + hi) / 2, floor = floorFor(Math.ceil(hi) - 1);
    const widths = big ? BIG_WIDTHS : WIDTHS, top = widths[widths.length - 1];
    const u = rng();
    let s = u < STYLES[0].share ? 0 : u < STYLES[0].share + STYLES[1].share ? 1 : 2;
    if (s === 2 && target < 40) s = 1;                               // too small a puzzle for long twisty ropes
    while (s > 0 && STYLES[s].full[top - 4] < target * 1.05) s--;    // this style cannot get that tangled even on the largest board
    const st = STYLES[s], reach = target * (1 + rng() * 0.25);       // a little headroom, so it need not be built flat out
    let i = widths.findIndex(w => st.full[w - 4] >= reach); if (i < 0) i = widths.length - 1;
    const W = widths[Math.max(s === 2 ? widths.indexOf(TWISTY_W) : 0, Math.min(widths.length - 1, i + SIZE_NUDGE[attempt % SIZE_NUDGE.length]))];
    // How deep to build: about what it takes to reach the target with this board packed full.
    const wantAvg = Math.max(floor, target / st.ropes[W - 4] - st.bends);
    return { W, H: heightFor(W), lenLo: st.lenLo, lenHi: Math.max(st.lenLo, st.lenHi(W)), straight: st.straight, minLen: Math.max(st.minLen, W >= 8 ? 3 : 2), // no two-cell stubs on the larger boards
      lo, hi, wantAvg, floor, cover: 0.88 + rng() * 0.08, bends: st.bends, style: st.name, seed: Math.floor(rng() * 4294967296) >>> 0,
      slide: !!slide, tie: slide ? knotsWanted(target) : 0, bait: slide ? knotsWanted(target) : 0, pull: 3 };
  }

  // The algorithm, for a seed, a difficulty setting, a number of levels and a game (original or sliding):
  //   1. Cut the setting's difficulty range into one slot per level. One level per slot means
  //      the set is spread evenly over the range and no two levels can share a difficulty.
  //   2. Aim at the empty slots in turn: plan a level for that slot (rope style and board size)
  //      and build it, packed full, to land there (see construct).
  //   3. The level takes whichever empty slot its score falls in, provided it meets that
  //      difficulty's depth floor (and, in the sliding game, its knot floor). Usually that is the
  //      slot aimed at; a build that comes up short can still fill an easier one. Otherwise it is discarded.
  //   4. Stop when every slot is filled. Slots run from easiest to hardest, so the set comes out
  //      already sorted.
  // The work is bounded: at most count*60 builds, and it gives up if 600 builds in a row fill
  // nothing (the set then has fewer levels than asked for).
  // opts: { seed: string, mode: 'E'|'N'|'H'|'X', count: number, big: boolean, slide: boolean }
  function generateSet(opts) {
    const mode = MODES[opts.mode] ? opts.mode : 'N', seed = cleanSeed(opts.seed), big = !!opts.big, slide = !!opts.slide, range = rangeFor(mode, big);
    const count = Math.max(1, opts.count | 0), n = Math.min(count, range[1] - range[0] + 1);
    const rng = mulberry32(hashString('monkey-fist/9|' + mode + (big ? 'B' : '') + (slide ? 'S|' : '|') + seed));
    const edges = slotEdges(mode, n, big), slots = new Array(n).fill(null);
    const slotOf = score => { let j = 0; while (j < n - 1 && score >= edges[j + 1]) j++; return j; };
    const maxBuilds = count * 60, maxStall = 600;
    let filled = 0, builds = 0, stall = 0, next = 0;
    while (filled < n && builds < maxBuilds && stall < maxStall) {
      builds++; stall++;
      while (slots[next % n]) next++;
      const aim = next++ % n, cfg = plan(rng, edges[aim], edges[aim + 1], big, builds, slide), L = construct(mulberry32(cfg.seed), cfg);
      if (!L) continue;
      const costSum = total(L.costs), score = L.score, avgCost = costSum / L.ropes.length;
      if (score < range[0] || score > range[1] || avgCost < floorFor(score) || (slide && L.knots < knotFloorFor(score))) continue;
      const slot = slotOf(score); // a build that falls short of the slot it aimed at can still fill an easier one
      if (slots[slot]) continue;
      // W and H are the finished board; boardW and boardH are the one it was built on, which rebuilding needs.
      slots[slot] = Object.assign(cfg, { boardW: cfg.W, boardH: cfg.H, W: L.W, H: L.H, difficulty: score, ropes: L.ropes.length, avgCost, knots: L.knots, traps: L.traps });
      filled++; stall = 0;
    }
    const levels = slots.filter(Boolean);
    return { seed, mode, count, big, slide, levels, builds, code: encodeCode({ seed, mode, count, big, slide }) };
  }
  // Rebuild a level's ropes from its descriptor.
  function levelFrom(d) { return construct(mulberry32(d.seed), Object.assign({}, d, { W: d.boardW, H: d.boardH })); }

  // ---------- share codes: mode + count (+ B for bigger boards) (+ S for the sliding game) + seed, e.g. "N20-K7F3Q" or "X30BS-K7F3Q" ----------
  const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to mix up
  function randomSeed(rand) {
    let s = '';
    for (let i = 0; i < 5; i++) s += SEED_CHARS[Math.floor((rand || Math.random)() * SEED_CHARS.length)];
    return s;
  }
  const cleanSeed = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  function encodeCode(o) { return o.mode + o.count + (o.big ? 'B' : '') + (o.slide ? 'S' : '') + '-' + cleanSeed(o.seed); }
  function parseCode(text) {
    const m = /^\s*([ENHX])\s*(\d{1,2})\s*(B?)\s*(S?)\s*-\s*([A-Z0-9]{1,10})\s*$/i.exec(String(text));
    if (!m) return null;
    const count = +m[2];
    if (!COUNTS.includes(count)) return null;
    return { mode: m[1].toUpperCase(), count, big: !!m[3], slide: !!m[4], seed: m[5].toUpperCase() };
  }

  // The built-in levels are simply one fixed set for each game, kept to boards that fit a phone.
  const CAMPAIGN = { seed: 'MONKEYFIST', mode: 'C', count: 60, big: false, slide: false };
  const CAMPAIGN_SLIDE = { seed: 'MONKEYFIST', mode: 'C', count: 60, big: false, slide: true };

  return { mulberry32, hashString, headDir, ray, selfBlocked, occupancy, advance, blockersOf, loopsOf, analyse, deadRopes, blockCosts, solve, play, bendsOf, ropeScores, nothingBlocked, difficulty,
    construct, plan, generateSet, levelFrom, slotEdges, rangeFor, randomSeed, cleanSeed, encodeCode, parseCode, quality, goodEnough, heightFor, FLOORS, floorFor, KNOT_FLOORS, knotFloorFor, knotsWanted,
    MODES, PLAYER_MODES, COUNTS, STYLES, WIDTHS, BIG_WIDTHS, CAMPAIGN, CAMPAIGN_SLIDE, MIN_ROPES, MIN_COVERAGE, MIN_COVERAGE_SLIDE, MIN_COVERAGE_SMALL, MIN_BLOCKED_SHARE, SMALL_W, TWISTY_W };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MFLevels;
